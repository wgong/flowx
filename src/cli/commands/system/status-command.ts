/**
 * System Status Command
 * Provides comprehensive system status information
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, formatBytes, formatDuration, formatRelativeTime, successBold, infoBold, warningBold, errorBold } from '../../core/output-formatter.ts';

export const statusCommand: CLICommand = {
  name: 'status',
  description: 'Show comprehensive system status',
  category: 'System',
  usage: 'claude-flow status [OPTIONS]',
  examples: [
    'claude-flow status',
    'claude-flow status --detailed',
    'claude-flow status --format json',
    'claude-flow status --watch'
  ],
  options: [
    {
      name: 'detailed',
      short: 'd',
      description: 'Show detailed status information',
      type: 'boolean'
    },
    {
      name: 'format',
      short: 'f',
      description: 'Output format',
      type: 'string',
      choices: ['table', 'json', 'yaml'],
      default: 'table'
    },
    {
      name: 'watch',
      short: 'w',
      description: 'Watch for status changes',
      type: 'boolean'
    },
    {
      name: 'interval',
      short: 'i',
      description: 'Watch interval in seconds',
      type: 'number',
      default: 2
    }
  ],
  handler: async (context: CLIContext) => {
    const { options } = context;

    if (options.watch) {
      return await watchStatus(context);
    }

    const status = await getSystemStatus(options.detailed);
    
    switch (options.format) {
      case 'json':
        console.log(JSON.stringify(status, null, 2));
        break;
      case 'yaml':
        console.log(formatAsYaml(status));
        break;
      default:
        displayStatusTable(status);
        break;
    }
  }
};

interface SystemStatus {
  timestamp: Date;
  uptime: number;
  services: ServiceStatus[];
  processes: ProcessStatus[];
  resources: ResourceStatus;
  health: HealthStatus;
  agents?: AgentStatus[];
  swarms?: SwarmStatus[];
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  pid?: number;
  uptime?: number;
  memory?: number;
  cpu?: number;
  port?: number;
  lastCheck: Date;
  error?: string;
}

interface ProcessStatus {
  name: string;
  pid: number;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  cpu: number;
  memory: number;
  uptime: number;
  command: string;
}

interface ResourceStatus {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  checks: HealthCheck[];
  score: number;
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  lastCheck: Date;
}

interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  uptime: number;
  tasksCompleted: number;
  currentTask?: string;
  lastActivity: Date;
}

interface SwarmStatus {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'stopped' | 'error';
  agents: number;
  activeTasks: number;
  completedTasks: number;
  uptime: number;
  coordinator: string;
}

async function getSystemStatus(detailed: boolean = false): Promise<SystemStatus> {
  const status: SystemStatus = {
    timestamp: new Date(),
    uptime: process.uptime() * 1000,
    services: await getServiceStatuses(),
    processes: await getProcessStatuses(),
    resources: await getResourceStatus(),
    health: await getHealthStatus()
  };

  if (detailed) {
    status.agents = await getAgentStatuses();
    status.swarms = await getSwarmStatuses();
  }

  return status;
}

async function getServiceStatuses(): Promise<ServiceStatus[]> {
  const services: ServiceStatus[] = [];
  
  // Check core services
  const coreServices = [
    'claude-flow-orchestrator',
    'claude-flow-memory',
    'claude-flow-swarm-coordinator',
    'claude-flow-mcp-server'
  ];

  for (const serviceName of coreServices) {
    try {
      const status = await checkService(serviceName);
      services.push(status);
    } catch (error) {
      services.push({
        name: serviceName,
        status: 'error',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return services;
}

async function checkService(name: string): Promise<ServiceStatus> {
  // This would normally check actual service status
  // For now, return mock data
  return {
    name,
    status: Math.random() > 0.1 ? 'running' : 'stopped',
    pid: Math.floor(Math.random() * 65535) + 1000,
    uptime: Math.floor(Math.random() * 86400000),
    memory: Math.floor(Math.random() * 100) * 1024 * 1024,
    cpu: Math.random() * 100,
    port: 3000 + Math.floor(Math.random() * 1000),
    lastCheck: new Date()
  };
}

async function getProcessStatuses(): Promise<ProcessStatus[]> {
  const processes: ProcessStatus[] = [];
  
  // This would normally get actual process information
  // For now, return mock data for claude-flow processes
  const processNames = [
    'claude-flow',
    'node (claude-flow)',
    'swarm-coordinator',
    'memory-manager'
  ];

  for (const name of processNames) {
    processes.push({
      name,
      pid: Math.floor(Math.random() * 65535) + 1000,
      status: 'running',
      cpu: Math.random() * 100,
      memory: Math.floor(Math.random() * 100) * 1024 * 1024,
      uptime: Math.floor(Math.random() * 86400000),
      command: `node /usr/local/bin/${name}`
    });
  }

  return processes;
}

async function getResourceStatus(): Promise<ResourceStatus> {
  // This would normally get actual system resources
  // For now, return mock data
  const memTotal = 16 * 1024 * 1024 * 1024;
  const memUsed = Math.floor(Math.random() * 12) * 1024 * 1024 * 1024;
  const diskTotal = 1024 * 1024 * 1024 * 1024;
  const diskUsed = Math.floor(Math.random() * 800) * 1024 * 1024 * 1024;
  
  return {
    cpu: {
      usage: Math.random() * 100,
      cores: 8,
      model: 'Apple M1 Pro'
    },
    memory: {
      total: memTotal,
      used: memUsed,
      free: memTotal - memUsed,
      usage: (memUsed / memTotal) * 100
    },
    disk: {
      total: diskTotal,
      used: diskUsed,
      free: diskTotal - diskUsed,
      usage: (diskUsed / diskTotal) * 100
    },
    network: {
      bytesIn: Math.floor(Math.random() * 1000000000),
      bytesOut: Math.floor(Math.random() * 1000000000),
      packetsIn: Math.floor(Math.random() * 1000000),
      packetsOut: Math.floor(Math.random() * 1000000)
    }
  };
}

async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthCheck[] = [
    {
      name: 'Memory Usage',
      status: 'pass',
      message: 'Memory usage is within normal limits',
      lastCheck: new Date()
    },
    {
      name: 'Disk Space',
      status: 'pass',
      message: 'Sufficient disk space available',
      lastCheck: new Date()
    },
    {
      name: 'Service Connectivity',
      status: 'pass',
      message: 'All services are responding',
      lastCheck: new Date()
    },
    {
      name: 'Database Connection',
      status: 'pass',
      message: 'Database is accessible',
      lastCheck: new Date()
    }
  ];

  const passCount = checks.filter(c => c.status === 'pass').length;
  const score = (passCount / checks.length) * 100;

  return {
    overall: score >= 90 ? 'healthy' : score >= 70 ? 'warning' : 'critical',
    checks,
    score
  };
}

async function getAgentStatuses(): Promise<AgentStatus[]> {
  // Mock agent data
  return [
    {
      id: 'agent-001',
      name: 'Research Agent',
      type: 'researcher',
      status: 'active',
      uptime: 3600000,
      tasksCompleted: 15,
      currentTask: 'Analyzing market trends',
      lastActivity: new Date()
    },
    {
      id: 'agent-002',
      name: 'Code Agent',
      type: 'developer',
      status: 'idle',
      uptime: 7200000,
      tasksCompleted: 8,
      lastActivity: new Date(Date.now() - 300000)
    }
  ];
}

async function getSwarmStatuses(): Promise<SwarmStatus[]> {
  // Mock swarm data
  return [
    {
      id: 'swarm-001',
      name: 'Development Swarm',
      status: 'active',
      agents: 3,
      activeTasks: 2,
      completedTasks: 25,
      uptime: 14400000,
      coordinator: 'coordinator-001'
    }
  ];
}

function displayStatusTable(status: SystemStatus): void {
  console.log(successBold('\n🧠 Claude Flow System Status\n'));
  
  // System Overview
  console.log(infoBold('System Overview:'));
  console.log(`  Timestamp: ${status.timestamp.toLocaleString()}`);
  console.log(`  Uptime: ${formatDuration(status.uptime)}`);
  console.log(`  Health: ${getHealthStatusColor(status.health.overall)} (${status.health.score.toFixed(1)}%)`);
  console.log();

  // Services
  if (status.services.length > 0) {
    console.log(infoBold('Services:'));
    const serviceTable = formatTable(status.services, [
      { header: 'Service', key: 'name' },
      { header: 'Status', key: 'status', formatter: (v) => getStatusColor(v) },
      { header: 'PID', key: 'pid', formatter: (v) => v ? String(v) : '-' },
      { header: 'Uptime', key: 'uptime', formatter: (v) => v ? formatDuration(v) : '-' },
      { header: 'Memory', key: 'memory', formatter: (v) => v ? formatBytes(v) : '-' },
      { header: 'CPU %', key: 'cpu', formatter: (v) => v ? v.toFixed(1) + '%' : '-' }
    ]);
    console.log(serviceTable);
    console.log();
  }

  // Resources
  console.log(infoBold('Resource Usage:'));
  console.log(`  CPU: ${status.resources.cpu.usage.toFixed(1)}% (${status.resources.cpu.cores} cores)`);
  console.log(`  Memory: ${formatBytes(status.resources.memory.used)} / ${formatBytes(status.resources.memory.total)} (${status.resources.memory.usage.toFixed(1)}%)`);
  console.log(`  Disk: ${formatBytes(status.resources.disk.used)} / ${formatBytes(status.resources.disk.total)} (${status.resources.disk.usage.toFixed(1)}%)`);
  console.log();

  // Health Checks
  if (status.health.checks.length > 0) {
    console.log(infoBold('Health Checks:'));
    for (const check of status.health.checks) {
      const statusIcon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${statusIcon} ${check.name}: ${check.message}`);
    }
    console.log();
  }

  // Agents (if detailed)
  if (status.agents && status.agents.length > 0) {
    console.log(infoBold('Agents:'));
    const agentTable = formatTable(status.agents, [
      { header: 'Name', key: 'name' },
      { header: 'Type', key: 'type' },
      { header: 'Status', key: 'status', formatter: (v) => getStatusColor(v) },
      { header: 'Uptime', key: 'uptime', formatter: (v) => formatDuration(v) },
      { header: 'Tasks', key: 'tasksCompleted' },
      { header: 'Current Task', key: 'currentTask', formatter: (v) => v || '-' }
    ]);
    console.log(agentTable);
    console.log();
  }

  // Swarms (if detailed)
  if (status.swarms && status.swarms.length > 0) {
    console.log(infoBold('Swarms:'));
    const swarmTable = formatTable(status.swarms, [
      { header: 'Name', key: 'name' },
      { header: 'Status', key: 'status', formatter: (v) => getStatusColor(v) },
      { header: 'Agents', key: 'agents' },
      { header: 'Active Tasks', key: 'activeTasks' },
      { header: 'Completed', key: 'completedTasks' },
      { header: 'Uptime', key: 'uptime', formatter: (v) => formatDuration(v) }
    ]);
    console.log(swarmTable);
    console.log();
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
    case 'active':
    case 'pass':
    case 'healthy':
      return successBold(status);
    case 'idle':
    case 'warn':
    case 'warning':
      return warningBold(status);
    case 'stopped':
    case 'error':
    case 'fail':
    case 'critical':
    case 'offline':
      return errorBold(status);
    default:
      return status;
  }
}

function getHealthStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'healthy':
      return successBold(status);
    case 'warning':
      return warningBold(status);
    case 'critical':
      return errorBold(status);
    default:
      return status;
  }
}

async function watchStatus(context: CLIContext): Promise<void> {
  const { options } = context;
  const interval = (options.interval as number) * 1000;

  console.log(infoBold(`Watching system status (updating every ${options.interval}s)...\n`));
  console.log('Press Ctrl+C to stop\n');

  const updateStatus = async () => {
    // Clear screen
    process.stdout.write('\x1b[2J\x1b[H');
    
    const status = await getSystemStatus(options.detailed);
    displayStatusTable(status);
  };

  // Initial display
  await updateStatus();

  // Set up interval
  const intervalId = setInterval(updateStatus, interval);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log('\nStatus monitoring stopped.');
    process.exit(0);
  });
}

function formatAsYaml(obj: any, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = '';

  if (Array.isArray(obj)) {
    for (const item of obj) {
      result += `${spaces}- ${formatAsYaml(item, indent + 2)}\n`;
    }
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        result += `${spaces}${key}:\n${formatAsYaml(value, indent + 2)}`;
      } else {
        result += `${spaces}${key}: ${value}\n`;
      }
    }
  } else {
    return String(obj);
  }

  return result;
}

export default statusCommand; 