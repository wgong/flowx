/**
 * UI Command
 * Launch and manage the web console interface
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';
import express, { Express, Request, Response } from 'express';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface UIServerConfig {
  port: number;
  host: string;
  enableAuth: boolean;
  authToken?: string;
  enableHTTPS: boolean;
  sslCert?: string;
  sslKey?: string;
  staticPath: string;
  maxConnections: number;
  enableCORS: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  authenticated: boolean;
  connectedAt: Date;
  lastActivity: Date;
  clientInfo: {
    userAgent?: string;
    ip: string;
    sessionId?: string;
    subscriptions?: string[];
  };
}

let uiServer: UIServer | null = null;

export const uiCommand: CLICommand = {
  name: 'ui',
  description: 'Launch and manage the web console interface',
  category: 'System',
  usage: 'claude-flow ui <subcommand> [OPTIONS]',
  examples: [
    'claude-flow ui start',
    'claude-flow ui start --port 8080',
    'claude-flow ui stop',
    'claude-flow ui status',
    'claude-flow ui open --browser'
  ],
  options: [
    {
      name: 'port',
      short: 'p',
      description: 'Server port',
      type: 'number',
      default: 3001
    },
    {
      name: 'host',
      short: 'h',
      description: 'Server host',
      type: 'string',
      default: 'localhost'
    },
    {
      name: 'auth',
      short: 'a',
      description: 'Enable authentication',
      type: 'boolean'
    },
    {
      name: 'token',
      short: 't',
      description: 'Authentication token',
      type: 'string'
    },
    {
      name: 'browser',
      short: 'b',
      description: 'Open in browser',
      type: 'boolean'
    },
    {
      name: 'daemon',
      short: 'd',
      description: 'Run as daemon',
      type: 'boolean'
    },
    {
      name: 'verbose',
      short: 'v',
      description: 'Verbose logging',
      type: 'boolean'
    }
  ],
  subcommands: [
    {
      name: 'start',
      description: 'Start the web console server',
      handler: async (context: CLIContext) => await startUIServer(context)
    },
    {
      name: 'stop',
      description: 'Stop the web console server',
      handler: async (context: CLIContext) => await stopUIServer(context)
    },
    {
      name: 'restart',
      description: 'Restart the web console server',
      handler: async (context: CLIContext) => await restartUIServer(context)
    },
    {
      name: 'status',
      description: 'Show server status',
      handler: async (context: CLIContext) => await showUIStatus(context)
    },
    {
      name: 'open',
      description: 'Open console in browser',
      handler: async (context: CLIContext) => await openInBrowser(context)
    },
    {
      name: 'connections',
      description: 'List active connections',
      handler: async (context: CLIContext) => await listConnections(context)
    },
    {
      name: 'logs',
      description: 'Show server logs',
      handler: async (context: CLIContext) => await showServerLogs(context)
    }
  ],
  handler: async (context: CLIContext) => {
    const { args } = context;
    
    if (args.length === 0) {
      await showUIStatus(context);
      return;
    }
    
    printError('Invalid subcommand. Use "claude-flow ui --help" for usage information.');
  }
};

class UIServer {
  private app!: express.Application;
  private server!: http.Server;
  private wss!: WebSocketServer;
  private config: UIServerConfig;
  private connections = new Map<string, WebSocketConnection>();
  private isRunning = false;
  private startTime?: Date;
  private logs: string[] = [];
  private maxLogs = 1000;

  constructor(config: Partial<UIServerConfig>) {
    this.config = {
      port: 3001,
      host: 'localhost',
      enableAuth: false,
      enableHTTPS: false,
      staticPath: this.getStaticPath(),
      maxConnections: 100,
      enableCORS: true,
      logLevel: 'info',
      ...config
    };

    this.setupExpress();
    this.setupWebSocket();
  }

  private getStaticPath(): string {
    // Get the path to the UI console files
    const currentDir = process.cwd();
    return path.join(currentDir, 'src', 'ui', 'console');
  }

  private setupExpress(): void {
    this.app = express();

    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    if (this.config.enableCORS) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        next();
      });
    }

    // Static files with proper MIME types
    this.app.use(express.static(this.config.staticPath, {
      setHeaders: (res, filePath) => {
        // Set correct MIME type for JavaScript modules
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.ts')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));

    // API routes
    this.setupAPIRoutes();

    // Fallback to index.html for SPA
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(this.config.staticPath, 'index.html'));
    });
  }

  private setupAPIRoutes(): void {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: this.getUptime(),
        connections: this.connections.size,
        version: '1.0.0'
      });
    });

    // Server status
    this.app.get('/api/status', (req, res) => {
      res.json({
        running: this.isRunning,
        startTime: this.startTime,
        uptime: this.getUptime(),
        connections: this.connections.size,
        config: {
          port: this.config.port,
          host: this.config.host,
          enableAuth: this.config.enableAuth
        }
      });
    });

    // Execute CLI command
    this.app.post('/api/execute', async (req, res) => {
      try {
        const { command } = req.body;
        
        if (!command) {
          return res.status(400).json({ error: 'Command is required' });
        }

        // Execute CLI command
        const result = await this.executeCLICommand(command);
        
        // Broadcast to WebSocket clients
        this.broadcastToClients({
          type: 'command_result',
          command,
          result
        });

        res.json({ success: true, result });
        return;
      } catch (error) {
        return res.status(500).json({ 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Get connections
    this.app.get('/api/connections', (req, res) => {
      const connectionList = Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        authenticated: conn.authenticated,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity,
        clientInfo: conn.clientInfo
      }));

      res.json({ connections: connectionList });
    });
  }

  private setupWebSocket(): void {
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleNewConnection(ws, req);
    });
  }

  private handleNewConnection(ws: WebSocket, req: http.IncomingMessage): void {
    const connectionId = this.generateConnectionId();
    const clientIP = req.socket.remoteAddress || 'unknown';
    
    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      authenticated: !this.config.enableAuth, // Auto-auth if auth disabled
      connectedAt: new Date(),
      lastActivity: new Date(),
      clientInfo: {
        userAgent: req.headers['user-agent'],
        ip: clientIP
      }
    };

    this.connections.set(connectionId, connection);
    this.log(`New WebSocket connection: ${connectionId} from ${clientIP}`);

    // Send welcome message
    this.sendToConnection(connectionId, {
      type: 'welcome',
      connectionId,
      serverTime: new Date(),
      authenticated: connection.authenticated
    });

    // Handle messages
    ws.on('message', (data) => {
      this.handleWebSocketMessage(connectionId, data);
    });

    // Handle disconnect
    ws.on('close', (code, reason) => {
      this.log(`WebSocket connection closed: ${connectionId} (${code}: ${reason})`);
      this.connections.delete(connectionId);
    });

    // Handle errors
    ws.on('error', (error) => {
      this.log(`WebSocket error for ${connectionId}: ${error.message}`, 'error');
    });

    // Limit connections
    if (this.connections.size > this.config.maxConnections) {
      ws.close(1008, 'Too many connections');
      this.connections.delete(connectionId);
    }
  }

  private handleWebSocketMessage(connectionId: string, data: any): void {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      connection.lastActivity = new Date();

      const message = JSON.parse(data.toString());
      this.log(`Received message from ${connectionId}: ${message.type}`);

      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(connectionId, message);
          break;

        case 'execute_command':
          this.handleCommandExecution(connectionId, message);
          break;

        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong', timestamp: new Date() });
          break;

        case 'subscribe':
          this.handleSubscription(connectionId, message);
          break;

        default:
          this.log(`Unknown message type: ${message.type}`, 'warn');
      }
    } catch (error) {
      this.log(`Error handling WebSocket message: ${error}`, 'error');
    }
  }

  private async handleCommandExecution(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.authenticated) {
      this.sendToConnection(connectionId, {
        type: 'error',
        message: 'Not authenticated'
      });
      return;
    }

    try {
      const { command, id } = message;
      this.log(`Executing command: ${command}`);

      // Execute CLI command
      const result = await this.executeCLICommand(command);

      // Send result back
      this.sendToConnection(connectionId, {
        type: 'command_result',
        id,
        command,
        result,
        timestamp: new Date()
      });

    } catch (error) {
      this.sendToConnection(connectionId, {
        type: 'command_error',
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  private handleAuthentication(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (!this.config.enableAuth) {
      connection.authenticated = true;
      this.sendToConnection(connectionId, {
        type: 'auth_success',
        message: 'Authentication not required'
      });
      return;
    }

    const { token } = message;
    if (token === this.config.authToken) {
      connection.authenticated = true;
      this.sendToConnection(connectionId, {
        type: 'auth_success',
        message: 'Authentication successful'
      });
    } else {
      this.sendToConnection(connectionId, {
        type: 'auth_failed',
        message: 'Invalid token'
      });
    }
  }

  private handleSubscription(connectionId: string, message: any): void {
    // Handle event subscriptions (status updates, logs, etc.)
    const { events } = message;
    this.log(`Client ${connectionId} subscribed to: ${events.join(', ')}`);
    
    // Store subscription preferences in connection metadata
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.clientInfo.subscriptions = events;
    }
  }

  private async executeCLICommand(command: string): Promise<any> {
    try {
      // Execute the CLI command using the actual CLI
      const cliPath = path.join(process.cwd(), 'cli.js');
      const fullCommand = `node ${cliPath} ${command}`;
      
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        timestamp: new Date()
      };
    }
  }

  private sendToConnection(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  private broadcastToClients(message: any): void {
    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === WebSocket.OPEN && connection.authenticated) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  }

  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private getUptime(): number {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }

  private log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console based on level
    if (this.shouldLog(level)) {
      console.log(logEntry);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    // Verify static files exist
    try {
      await fs.access(this.config.staticPath);
      await fs.access(path.join(this.config.staticPath, 'index.html'));
    } catch (error) {
      throw new Error(`UI static files not found at ${this.config.staticPath}`);
    }

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        this.startTime = new Date();
        this.log(`UI Server started on http://${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        this.log(`Server error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Close all WebSocket connections
    for (const connection of this.connections.values()) {
      connection.ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();

    // Close server
    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        this.log('UI Server stopped');
        resolve();
      });
    });
  }

  getStatus(): any {
    return {
      running: this.isRunning,
      startTime: this.startTime,
      uptime: this.getUptime(),
      connections: this.connections.size,
      config: this.config,
      logs: this.logs.slice(-10) // Last 10 log entries
    };
  }

  getConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  getLogs(): string[] {
    return [...this.logs];
  }
}

// Subcommand handlers

async function startUIServer(context: CLIContext): Promise<void> {
  const { options } = context;

  if (uiServer && uiServer.getStatus().running) {
    printWarning('UI server is already running');
    await showUIStatus(context);
    return;
  }

  try {
    const config: Partial<UIServerConfig> = {
      port: options.port || 3001,
      host: options.host || 'localhost',
      enableAuth: options.auth || false,
      authToken: options.token,
      logLevel: options.verbose ? 'debug' : 'info'
    };

    uiServer = new UIServer(config);
    
    printInfo('Starting UI server...');
    await uiServer.start();
    
    const url = `http://${config.host}:${config.port}`;
    printSuccess(`✅ UI server started successfully!`);
    printInfo(`🌐 Web console available at: ${url}`);
    printInfo(`🔗 WebSocket endpoint: ws://${config.host}:${config.port}/ws`);
    
    if (config.enableAuth) {
      printInfo(`🔐 Authentication enabled with token: ${config.authToken}`);
    }

    // Open in browser if requested
    if (options.browser) {
      await openBrowser(url);
    }

    // Run as daemon if requested
    if (options.daemon) {
      printInfo('Running in daemon mode. Use "claude-flow ui stop" to stop the server.');
      // Keep process running
      process.stdin.resume();
    }

  } catch (error) {
    printError(`Failed to start UI server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function stopUIServer(context: CLIContext): Promise<void> {
  if (!uiServer || !uiServer.getStatus().running) {
    printWarning('UI server is not running');
    return;
  }

  try {
    printInfo('Stopping UI server...');
    await uiServer.stop();
    printSuccess('✅ UI server stopped successfully');
    uiServer = null;
  } catch (error) {
    printError(`Failed to stop UI server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function restartUIServer(context: CLIContext): Promise<void> {
  printInfo('Restarting UI server...');
  
  if (uiServer && uiServer.getStatus().running) {
    await stopUIServer(context);
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await startUIServer(context);
}

async function showUIStatus(context: CLIContext): Promise<void> {
  printInfo('🖥️  UI Server Status');
  console.log('─'.repeat(50));

  if (!uiServer) {
    printWarning('UI server is not initialized');
    printInfo('Use "claude-flow ui start" to start the server');
    return;
  }

  const status = uiServer.getStatus();
  
  const statusData = [
    { label: 'Status', value: status.running ? '🟢 Running' : '🔴 Stopped' },
    { label: 'Host', value: status.config.host },
    { label: 'Port', value: status.config.port },
    { label: 'Started', value: status.startTime ? status.startTime.toLocaleString() : 'N/A' },
    { label: 'Uptime', value: status.running ? formatUptime(status.uptime) : 'N/A' },
    { label: 'Connections', value: status.connections },
    { label: 'Authentication', value: status.config.enableAuth ? '🔐 Enabled' : '🔓 Disabled' },
    { label: 'Static Path', value: status.config.staticPath }
  ];

  statusData.forEach(({ label, value }) => {
    console.log(`${label.padEnd(15)}: ${value}`);
  });

  if (status.running) {
    const url = `http://${status.config.host}:${status.config.port}`;
    console.log();
    printInfo(`🌐 Web console: ${url}`);
    printInfo(`🔗 WebSocket: ws://${status.config.host}:${status.config.port}/ws`);
  }

  console.log();
}

async function openInBrowser(context: CLIContext): Promise<void> {
  const { options } = context;

  if (!uiServer || !uiServer.getStatus().running) {
    printError('UI server is not running. Start it first with "claude-flow ui start"');
    return;
  }

  const status = uiServer.getStatus();
  const url = `http://${status.config.host}:${status.config.port}`;
  
  await openBrowser(url);
}

async function listConnections(context: CLIContext): Promise<void> {
  if (!uiServer) {
    printWarning('UI server is not initialized');
    return;
  }

  const connections = uiServer.getConnections();
  
  if (connections.length === 0) {
    printInfo('No active connections');
    return;
  }

  console.log(successBold('\n🔗 Active WebSocket Connections\n'));

  const tableData = connections.map(conn => ({
    id: conn.id,
    ip: conn.clientInfo.ip,
    authenticated: conn.authenticated ? '✅' : '❌',
    connected: conn.connectedAt.toLocaleTimeString(),
    lastActivity: conn.lastActivity.toLocaleTimeString(),
    userAgent: (conn.clientInfo.userAgent || '').substring(0, 40) + '...'
  }));

  console.log(formatTable(tableData, [
    { header: 'ID', key: 'id' },
    { header: 'IP', key: 'ip' },
    { header: 'Auth', key: 'authenticated' },
    { header: 'Connected', key: 'connected' },
    { header: 'Last Activity', key: 'lastActivity' },
    { header: 'User Agent', key: 'userAgent' }
  ]));

  console.log();
  printSuccess(`Total connections: ${connections.length}`);
}

async function showServerLogs(context: CLIContext): Promise<void> {
  const { options } = context;

  if (!uiServer) {
    printWarning('UI server is not initialized');
    return;
  }

  const logs = uiServer.getLogs();
  const limit = options.limit || 50;
  const recentLogs = logs.slice(-limit);

  console.log(successBold(`\n📋 Server Logs (last ${recentLogs.length})\n`));

  recentLogs.forEach(log => {
    console.log(log);
  });

  if (logs.length > limit) {
    console.log();
    printInfo(`Showing ${limit} of ${logs.length} total log entries`);
  }
}

// Helper functions

async function openBrowser(url: string): Promise<void> {
  try {
    const platform = process.platform;
    let command: string;

    switch (platform) {
      case 'darwin':
        command = `open "${url}"`;
        break;
      case 'win32':
        command = `start "${url}"`;
        break;
      default:
        command = `xdg-open "${url}"`;
    }

    await execAsync(command);
    printSuccess(`🌐 Opened ${url} in browser`);
  } catch (error) {
    printWarning(`Could not open browser automatically. Please visit: ${url}`);
  }
}

function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default uiCommand; 