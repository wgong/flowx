/**
 * MCP Command
 * Model Context Protocol server management
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo, formatTable } from '../../core/output-formatter.ts';

export const mcpCommand: CLICommand = {
  name: 'mcp',
  description: 'Manage MCP (Model Context Protocol) server',
  category: 'System',
  usage: 'claude-flow mcp <subcommand> [OPTIONS]',
  examples: [
    'claude-flow mcp start',
    'claude-flow mcp stop',
    'claude-flow mcp status',
    'claude-flow mcp tools',
    'claude-flow mcp logs --follow'
  ],
  subcommands: [
    {
      name: 'start',
      description: 'Start the MCP server',
      handler: startMCPServer,
      options: [
        {
          name: 'port',
          short: 'p',
          description: 'Server port',
          type: 'number',
          default: 3000
        },
        {
          name: 'transport',
          short: 't',
          description: 'Transport type',
          type: 'string',
          choices: ['stdio', 'http', 'websocket'],
          default: 'stdio'
        },
        {
          name: 'config',
          short: 'c',
          description: 'Configuration file',
          type: 'string'
        },
        {
          name: 'daemon',
          short: 'd',
          description: 'Run as daemon',
          type: 'boolean'
        }
      ]
    },
    {
      name: 'stop',
      description: 'Stop the MCP server',
      handler: stopMCPServer,
      options: [
        {
          name: 'force',
          short: 'f',
          description: 'Force stop without graceful shutdown',
          type: 'boolean'
        }
      ]
    },
    {
      name: 'restart',
      description: 'Restart the MCP server',
      handler: restartMCPServer
    },
    {
      name: 'status',
      description: 'Show MCP server status',
      handler: getMCPStatus,
      options: [
        {
          name: 'detailed',
          short: 'd',
          description: 'Show detailed status',
          type: 'boolean'
        }
      ]
    },
    {
      name: 'tools',
      description: 'List available MCP tools',
      handler: listMCPTools,
      options: [
        {
          name: 'category',
          short: 'c',
          description: 'Filter by category',
          type: 'string'
        },
        {
          name: 'format',
          short: 'f',
          description: 'Output format',
          type: 'string',
          choices: ['table', 'json'],
          default: 'table'
        }
      ]
    },
    {
      name: 'logs',
      description: 'Show MCP server logs',
      handler: showMCPLogs,
      options: [
        {
          name: 'follow',
          short: 'f',
          description: 'Follow log output',
          type: 'boolean'
        },
        {
          name: 'lines',
          short: 'n',
          description: 'Number of lines to show',
          type: 'number',
          default: 50
        },
        {
          name: 'level',
          short: 'l',
          description: 'Log level filter',
          type: 'string',
          choices: ['debug', 'info', 'warn', 'error']
        }
      ]
    },
    {
      name: 'health',
      description: 'Check MCP server health',
      handler: checkMCPHealth
    },
    {
      name: 'config',
      description: 'Show or update MCP configuration',
      handler: manageMCPConfig,
      options: [
        {
          name: 'show',
          description: 'Show current configuration',
          type: 'boolean'
        },
        {
          name: 'set',
          description: 'Set configuration value (key=value)',
          type: 'string'
        }
      ]
    }
  ],
  handler: async (context: CLIContext) => {
    // Default to status if no subcommand provided
    return await getMCPStatus(context);
  }
};

async function startMCPServer(context: CLIContext): Promise<void> {
  const { options } = context;
  
  printInfo('🚀 Starting MCP server...');
  
  try {
    const config = {
      port: options.port,
      transport: options.transport,
      daemon: options.daemon,
      configFile: options.config
    };
    
    console.log(`🌐 Transport: ${config.transport}`);
    if (config.transport === 'http') {
      console.log(`🔌 Port: ${config.port}`);
    }
    console.log(`⚙️  Mode: ${config.daemon ? 'daemon' : 'foreground'}`);
    
    // Mock server start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const serverInfo = {
      pid: Math.floor(Math.random() * 65535) + 1000,
      port: config.port,
      transport: config.transport,
      uptime: 0,
      status: 'running'
    };
    
    printSuccess('✅ MCP server started successfully');
    console.log(`📊 Server PID: ${serverInfo.pid}`);
    console.log(`🔗 Protocol: MCP v2024.11.5`);
    
    if (!config.daemon) {
      printInfo('Press Ctrl+C to stop the server');
      // In real implementation, this would keep the process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping MCP server...');
        process.exit(0);
      });
    }
    
  } catch (error) {
    printError(`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function stopMCPServer(context: CLIContext): Promise<void> {
  const { options } = context;
  
  printInfo('🛑 Stopping MCP server...');
  
  try {
    if (options.force) {
      printWarning('⚠️  Force stopping server');
    } else {
      printInfo('🤝 Graceful shutdown initiated');
    }
    
    // Mock server stop
    await new Promise(resolve => setTimeout(resolve, 500));
    
    printSuccess('✅ MCP server stopped successfully');
    
  } catch (error) {
    printError(`Failed to stop MCP server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function restartMCPServer(context: CLIContext): Promise<void> {
  printInfo('🔄 Restarting MCP server...');
  
  try {
    await stopMCPServer({ ...context, options: { force: false } });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startMCPServer(context);
    
  } catch (error) {
    printError(`Failed to restart MCP server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function getMCPStatus(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const status = await getMCPServerStatus();
    
    console.log(successBold('\n🔌 MCP Server Status\n'));
    
    console.log(`Status: ${getStatusColor(status.status)}`);
    console.log(`PID: ${status.pid || 'N/A'}`);
    console.log(`Uptime: ${formatUptime(status.uptime)}`);
    console.log(`Transport: ${status.transport}`);
    console.log(`Protocol: MCP v${status.protocolVersion}`);
    console.log(`Active Sessions: ${status.activeSessions}`);
    console.log(`Total Requests: ${status.totalRequests}`);
    console.log(`Tools Registered: ${status.toolsCount}`);
    console.log();
    
    if (options.detailed) {
      console.log(infoBold('Detailed Status:'));
      console.log(`  Memory Usage: ${status.memoryUsage} MB`);
      console.log(`  CPU Usage: ${status.cpuUsage}%`);
      console.log(`  Request Rate: ${status.requestRate}/min`);
      console.log(`  Error Rate: ${status.errorRate}%`);
      console.log(`  Last Request: ${status.lastRequest || 'Never'}`);
      console.log();
      
      if (status.activeSessions > 0) {
        console.log(infoBold('Active Sessions:'));
        status.sessions?.forEach((session: any) => {
          console.log(`  ${session.id}: ${session.clientInfo.name} (${session.transport})`);
        });
        console.log();
      }
    }
    
  } catch (error) {
    printError(`Failed to get MCP status: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function listMCPTools(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const tools = await getMCPTools(options.category);
    
    if (options.format === 'json') {
      console.log(JSON.stringify(tools, null, 2));
      return;
    }
    
    console.log(successBold('\n🛠️  Available MCP Tools\n'));
    
    if (tools.length === 0) {
      printWarning('No tools registered');
      return;
    }
    
    const table = formatTable(tools, [
      { header: 'Name', key: 'name' },
      { header: 'Category', key: 'category' },
      { header: 'Description', key: 'description' },
      { header: 'Status', key: 'status', formatter: (v: string) => getStatusColor(v) }
    ]);
    
    console.log(table);
    console.log();
    console.log(`Total: ${tools.length} tools`);
    
  } catch (error) {
    printError(`Failed to list MCP tools: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showMCPLogs(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const logs = await getMCPLogs({
      lines: options.lines,
      level: options.level,
      follow: options.follow
    });
    
    if (options.follow) {
      printInfo(`Following MCP server logs (Press Ctrl+C to stop)...`);
      console.log();
      
      // Mock streaming logs
      for (const logEntry of logs) {
        console.log(formatLogEntry(logEntry));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      logs.forEach((logEntry: any) => {
        console.log(formatLogEntry(logEntry));
      });
    }
    
  } catch (error) {
    printError(`Failed to show MCP logs: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function checkMCPHealth(context: CLIContext): Promise<void> {
  try {
    const health = await getMCPHealth();
    
    console.log(successBold('\n🏥 MCP Server Health Check\n'));
    
    console.log(`Overall Health: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    console.log(`Last Check: ${health.lastCheck.toLocaleString()}`);
    console.log();
    
    console.log(infoBold('Components:'));
    health.checks.forEach((check: any) => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${icon} ${check.name}: ${check.message}`);
    });
    console.log();
    
    if (health.metrics) {
      console.log(infoBold('Metrics:'));
      Object.entries(health.metrics).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
    
  } catch (error) {
    printError(`Failed to check MCP health: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function manageMCPConfig(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    if (options.show) {
      const config = await getMCPConfig();
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    
    if (options.set) {
      const [key, value] = options.set.split('=', 2);
      if (!key || value === undefined) {
        printError('Invalid format. Use: key=value');
        return;
      }
      
      await setMCPConfig(key, value);
      printSuccess(`✅ Configuration updated: ${key} = ${value}`);
      return;
    }
    
    // Show current config by default
    const config = await getMCPConfig();
    console.log(successBold('\n⚙️  MCP Configuration\n'));
    console.log(JSON.stringify(config, null, 2));
    
  } catch (error) {
    printError(`Failed to manage MCP config: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Helper functions

async function getMCPServerStatus(): Promise<any> {
  // Mock implementation
  return {
    status: 'running',
    pid: 12345,
    uptime: 3600000,
    transport: 'stdio',
    protocolVersion: '2024.11.5',
    activeSessions: 2,
    totalRequests: 156,
    toolsCount: 8,
    memoryUsage: 45.2,
    cpuUsage: 12.5,
    requestRate: 5.2,
    errorRate: 0.8,
    lastRequest: '2 minutes ago',
    sessions: [
      { id: 'session-1', clientInfo: { name: 'claude-desktop' }, transport: 'stdio' },
      { id: 'session-2', clientInfo: { name: 'vscode' }, transport: 'http' }
    ]
  };
}

async function getMCPTools(category?: string): Promise<any[]> {
  const allTools = [
    { name: 'claude-flow/memory', category: 'Memory', description: 'Memory bank operations', status: 'active' },
    { name: 'claude-flow/swarm', category: 'Swarm', description: 'Swarm coordination', status: 'active' },
    { name: 'claude-flow/agent', category: 'Agent', description: 'Agent management', status: 'active' },
    { name: 'claude-flow/task', category: 'Task', description: 'Task execution', status: 'active' },
    { name: 'system/fs', category: 'System', description: 'File system operations', status: 'active' },
    { name: 'system/process', category: 'System', description: 'Process management', status: 'active' },
    { name: 'web/fetch', category: 'Web', description: 'HTTP requests', status: 'active' },
    { name: 'web/search', category: 'Web', description: 'Web search', status: 'inactive' }
  ];
  
  return category ? allTools.filter(tool => tool.category.toLowerCase() === category.toLowerCase()) : allTools;
}

async function getMCPLogs(options: any): Promise<any[]> {
  // Mock log entries
  const logs = [
    { timestamp: new Date(), level: 'info', message: 'MCP server started', component: 'server' },
    { timestamp: new Date(), level: 'info', message: 'Client connected: claude-desktop', component: 'session' },
    { timestamp: new Date(), level: 'debug', message: 'Tool registered: claude-flow/memory', component: 'tools' },
    { timestamp: new Date(), level: 'info', message: 'Request processed: tools/list', component: 'handler' },
    { timestamp: new Date(), level: 'warn', message: 'High memory usage detected', component: 'monitor' }
  ];
  
  return logs.slice(-options.lines);
}

async function getMCPHealth(): Promise<any> {
  return {
    healthy: true,
    lastCheck: new Date(),
    checks: [
      { name: 'Server Process', status: 'pass', message: 'Server is running' },
      { name: 'Memory Usage', status: 'pass', message: 'Within normal limits' },
      { name: 'Tool Registry', status: 'pass', message: 'All tools registered' },
      { name: 'Session Manager', status: 'warn', message: 'High session count' }
    ],
    metrics: {
      uptime: '1h 15m',
      memoryUsage: '45.2 MB',
      activeSessions: 2,
      requestRate: '5.2/min'
    }
  };
}

async function getMCPConfig(): Promise<any> {
  return {
    transport: 'stdio',
    port: 3000,
    logging: {
      level: 'info',
      file: '.claude-flow/logs/mcp.log'
    },
    tools: {
      autoRegister: true,
      timeout: 30000
    },
    auth: {
      enabled: false,
      method: 'token'
    }
  };
}

async function setMCPConfig(key: string, value: string): Promise<void> {
  // Mock configuration update
  console.log(`Setting ${key} to ${value}`);
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
    case 'active':
      return `\x1b[32m${status}\x1b[0m`; // Green
    case 'stopped':
    case 'inactive':
      return `\x1b[31m${status}\x1b[0m`; // Red
    case 'starting':
    case 'stopping':
      return `\x1b[33m${status}\x1b[0m`; // Yellow
    default:
      return status;
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatLogEntry(entry: any): string {
  const timestamp = entry.timestamp.toISOString();
  const level = entry.level.toUpperCase().padEnd(5);
  const component = entry.component ? `[${entry.component}]` : '';
  return `${timestamp} ${level} ${component} ${entry.message}`;
} 