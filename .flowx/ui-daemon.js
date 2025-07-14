
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class UIServer {
  constructor(config) {
    this.config = {
      port: 3001,
      host: 'localhost',
      enableAuth: false,
      enableHTTPS: false,
      staticPath: path.join(__dirname, '../src/ui/console'),
      maxConnections: 100,
      enableCORS: true,
      logLevel: 'info',
      ...config
    };
    this.connections = new Map();
    this.isRunning = false;
    this.logs = [];
    this.maxLogs = 1000;
  }

  async start() {
    if (this.isRunning) return;
    
    this.app = express();
    this.setupExpress();
    this.setupAPIRoutes();
    
    this.server = http.createServer(this.app);
    this.setupWebSocket();
    
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        this.isRunning = true;
        this.startTime = new Date();
        this.log(`UI Server started on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
      
      this.server.on('error', reject);
    });
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Close WebSocket connections
    if (this.wss) {
      this.wss.close();
    }
    
    // Close HTTP server
    if (this.server) {
      this.server.close();
    }
    
    this.log('UI Server stopped');
  }

  setupExpress() {
    if (this.config.enableCORS) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }
    
    this.app.use(express.json());
    this.app.use(express.static(this.config.staticPath));
  }

  setupAPIRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', uptime: this.getUptime() });
    });
    
    this.app.get('/console', (req, res) => {
      res.sendFile(path.join(this.config.staticPath, 'index.html'));
    });
  }

  setupWebSocket() {
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });
    
    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateConnectionId();
      const connection = {
        id: connectionId,
        ws: ws,
        authenticated: !this.config.enableAuth,
        connectedAt: new Date(),
        lastActivity: new Date(),
        clientInfo: {
          ip: req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      };
      
      this.connections.set(connectionId, connection);
      this.log(`New WebSocket connection: ${connectionId}`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        connectionId: connectionId,
        serverTime: new Date().toISOString(),
        authenticated: connection.authenticated
      }));
      
      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(connectionId, message);
        } catch (error) {
          this.log(`Invalid WebSocket message from ${connectionId}: ${error.message}`, 'error');
        }
      });
      
      ws.on('close', () => {
        this.connections.delete(connectionId);
        this.log(`WebSocket connection closed: ${connectionId}`);
      });
      
      ws.on('error', (error) => {
        this.log(`WebSocket error for ${connectionId}: ${error.message}`, 'error');
      });
    });
  }
  
  handleWebSocketMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    connection.lastActivity = new Date();
    
    // Echo message back for now (can be extended for actual command handling)
    connection.ws.send(JSON.stringify({
      type: 'response',
      id: message.id || Date.now(),
      result: { received: message, timestamp: new Date().toISOString() }
    }));
  }

  generateConnectionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getUptime() {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    console.log(logEntry);
    
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
}

// Create and start the server
const server = new UIServer({
  port: 3001,
  host: 'localhost',
  enableCORS: true
});

server.start().then(() => {
  console.log('UI server started successfully in daemon mode');
  
  // Write PID file
  fs.writeFile('.flowx/ui-daemon.pid', process.pid.toString());
  
  // Keep process alive
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
  
}).catch(error => {
  console.error('Failed to start UI server daemon:', error);
  process.exit(1);
});
