/**
 * Agent Management Command
 * Comprehensive agent lifecycle management
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';

export const agentCommand: CLICommand = {
  name: 'agent',
  description: 'Manage AI agents',
  category: 'Agents',
  usage: 'claude-flow agent <subcommand> [OPTIONS]',
  examples: [
    'claude-flow agent list',
    'claude-flow agent spawn researcher --name "Research Bot"',
    'claude-flow agent status agent-001',
    'claude-flow agent stop agent-001',
    'claude-flow agent logs agent-001'
  ],
  subcommands: [
    {
      name: 'list',
      description: 'List all agents',
      handler: listAgents,
      options: [
        {
          name: 'status',
          short: 's',
          description: 'Filter by status',
          type: 'string',
          choices: ['active', 'idle', 'busy', 'error', 'offline']
        },
        {
          name: 'type',
          short: 't',
          description: 'Filter by agent type',
          type: 'string'
        },
        {
          name: 'format',
          short: 'f',
          description: 'Output format',
          type: 'string',
          choices: ['table', 'json', 'yaml'],
          default: 'table'
        }
      ]
    },
    {
      name: 'spawn',
      description: 'Create and start a new agent',
      handler: spawnAgent,
      arguments: [
        {
          name: 'type',
          description: 'Agent type to spawn',
          required: true
        }
      ],
      options: [
        {
          name: 'name',
          short: 'n',
          description: 'Agent name',
          type: 'string'
        },
        {
          name: 'config',
          short: 'c',
          description: 'Configuration file',
          type: 'string'
        },
        {
          name: 'capabilities',
          description: 'Comma-separated list of capabilities',
          type: 'string'
        },
        {
          name: 'auto-start',
          description: 'Start agent immediately',
          type: 'boolean',
          default: true
        }
      ]
    },
    {
      name: 'status',
      description: 'Get agent status',
      handler: getAgentStatus,
      arguments: [
        {
          name: 'agent-id',
          description: 'Agent ID to check',
          required: true
        }
      ]
    },
    {
      name: 'start',
      description: 'Start an agent',
      handler: startAgent,
      arguments: [
        {
          name: 'agent-id',
          description: 'Agent ID to start',
          required: true
        }
      ]
    },
    {
      name: 'stop',
      description: 'Stop an agent',
      handler: stopAgent,
      arguments: [
        {
          name: 'agent-id',
          description: 'Agent ID to stop',
          required: true
        }
      ],
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
      description: 'Restart an agent',
      handler: restartAgent,
      arguments: [
        {
          name: 'agent-id',
          description: 'Agent ID to restart',
          required: true
        }
      ]
    },
    {
      name: 'logs',
      description: 'Show agent logs',
      handler: showAgentLogs,
      arguments: [
        {
          name: 'agent-id',
          description: 'Agent ID to show logs for',
          required: true
        }
      ],
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
      name: 'remove',
      description: 'Remove an agent',
      handler: removeAgent,
      arguments: [
        {
          name: 'agent-id',
          description: 'Agent ID to remove',
          required: true
        }
      ],
      options: [
        {
          name: 'force',
          short: 'f',
          description: 'Force removal without confirmation',
          type: 'boolean'
        }
      ]
    },
    {
      name: 'assign',
      description: 'Assign a task to an agent',
      handler: assignTask,
      arguments: [
        {
          name: 'agent-id',
          description: 'Agent ID to assign task to',
          required: true
        },
        {
          name: 'task',
          description: 'Task description or ID',
          required: true
        }
      ],
      options: [
        {
          name: 'priority',
          short: 'p',
          description: 'Task priority',
          type: 'string',
          choices: ['low', 'normal', 'high', 'urgent'],
          default: 'normal'
        }
      ]
    }
  ],
  handler: async (context: CLIContext) => {
    // Default to list if no subcommand
    return await listAgents(context);
  }
};

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  capabilities: string[];
  uptime: number;
  tasksCompleted: number;
  currentTask?: string;
  lastActivity: Date;
  config: AgentConfig;
  metrics: AgentMetrics;
}

interface AgentConfig {
  maxConcurrentTasks: number;
  timeout: number;
  retryAttempts: number;
  memory: {
    enabled: boolean;
    size: number;
  };
  logging: {
    level: string;
    file?: string;
  };
}

interface AgentMetrics {
  cpu: number;
  memory: number;
  tasksPerMinute: number;
  errorRate: number;
  averageTaskTime: number;
}

async function listAgents(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const agents = await getAgents(options.status, options.type);
    
    if (agents.length === 0) {
      printInfo('No agents found');
      return;
    }

    switch (options.format) {
      case 'json':
        console.log(JSON.stringify(agents, null, 2));
        break;
      case 'yaml':
        console.log(formatAsYaml(agents));
        break;
      default:
        displayAgentsTable(agents);
        break;
    }
    
  } catch (error) {
    printError(`Failed to list agents: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function spawnAgent(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const agentType = args[0];
  
  try {
    printInfo(`Spawning ${agentType} agent...`);
    
    const agentConfig = {
      type: agentType,
      name: options.name || `${agentType}-${Date.now()}`,
      capabilities: options.capabilities ? options.capabilities.split(',') : [],
      autoStart: options['auto-start'] !== false
    };

    if (options.config) {
      // Load configuration from file
      const { readFile } = await import('node:fs/promises');
      const configContent = await readFile(options.config, 'utf8');
      Object.assign(agentConfig, JSON.parse(configContent));
    }

    const agent = await createAgent(agentConfig);
    
    if (agentConfig.autoStart) {
      await startAgentById(agent.id);
    }
    
    printSuccess(`Agent spawned successfully: ${agent.name} (${agent.id})`);
    
  } catch (error) {
    printError(`Failed to spawn agent: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function getAgentStatus(context: CLIContext): Promise<void> {
  const { args } = context;
  const agentId = args[0];
  
  try {
    const agent = await getAgentById(agentId);
    
    console.log(infoBold(`Agent Status: ${agent.name} (${agent.id})`));
    console.log();
    
    console.log(`Status: ${getStatusColor(agent.status)}`);
    console.log(`Type: ${agent.type}`);
    console.log(`Uptime: ${formatDuration(agent.uptime)}`);
    console.log(`Tasks Completed: ${agent.tasksCompleted}`);
    console.log(`Current Task: ${agent.currentTask || 'None'}`);
    console.log(`Last Activity: ${agent.lastActivity.toLocaleString()}`);
    console.log();
    
    console.log(infoBold('Capabilities:'));
    agent.capabilities.forEach(cap => console.log(`  - ${cap}`));
    console.log();
    
    console.log(infoBold('Metrics:'));
    console.log(`  CPU: ${agent.metrics.cpu.toFixed(1)}%`);
    console.log(`  Memory: ${agent.metrics.memory.toFixed(1)} MB`);
    console.log(`  Tasks/min: ${agent.metrics.tasksPerMinute.toFixed(1)}`);
    console.log(`  Error Rate: ${agent.metrics.errorRate.toFixed(2)}%`);
    console.log(`  Avg Task Time: ${formatDuration(agent.metrics.averageTaskTime)}`);
    
  } catch (error) {
    printError(`Failed to get agent status: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function startAgent(context: CLIContext): Promise<void> {
  const { args } = context;
  const agentId = args[0];
  
  try {
    await startAgentById(agentId);
    printSuccess(`Agent ${agentId} started successfully`);
  } catch (error) {
    printError(`Failed to start agent: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function stopAgent(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const agentId = args[0];
  
  try {
    await stopAgentById(agentId, options.force);
    printSuccess(`Agent ${agentId} stopped successfully`);
  } catch (error) {
    printError(`Failed to stop agent: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function restartAgent(context: CLIContext): Promise<void> {
  const { args } = context;
  const agentId = args[0];
  
  try {
    printInfo(`Restarting agent ${agentId}...`);
    await stopAgentById(agentId, false);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await startAgentById(agentId);
    printSuccess(`Agent ${agentId} restarted successfully`);
  } catch (error) {
    printError(`Failed to restart agent: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showAgentLogs(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const agentId = args[0];
  
  try {
    const logs = await getAgentLogs(agentId, {
      lines: options.lines,
      level: options.level,
      follow: options.follow
    });
    
    if (options.follow) {
      printInfo(`Following logs for agent ${agentId} (Press Ctrl+C to stop)...`);
      console.log();
      
      // Stream logs
      for await (const logEntry of logs) {
        console.log(formatLogEntry(logEntry));
      }
    } else {
      logs.forEach((logEntry: any) => {
        console.log(formatLogEntry(logEntry));
      });
    }
    
  } catch (error) {
    printError(`Failed to show agent logs: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function removeAgent(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const agentId = args[0];
  
  try {
    if (!options.force) {
      // In a real implementation, this would prompt for confirmation
      printWarning(`This will permanently remove agent ${agentId}`);
    }
    
    await removeAgentById(agentId);
    printSuccess(`Agent ${agentId} removed successfully`);
    
  } catch (error) {
    printError(`Failed to remove agent: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function assignTask(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const agentId = args[0];
  const taskDescription = args[1];
  
  try {
    const taskId = await assignTaskToAgent(agentId, taskDescription, options.priority);
    printSuccess(`Task assigned to agent ${agentId}: ${taskId}`);
    
  } catch (error) {
    printError(`Failed to assign task: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Helper functions

async function getAgents(statusFilter?: string, typeFilter?: string): Promise<Agent[]> {
  // Mock data - in real implementation, this would fetch from agent registry
  const mockAgents: Agent[] = [
    {
      id: 'agent-001',
      name: 'Research Agent',
      type: 'researcher',
      status: 'active',
      capabilities: ['web-search', 'analysis', 'summarization'],
      uptime: 3600000,
      tasksCompleted: 15,
      currentTask: 'Market research analysis',
      lastActivity: new Date(),
      config: {
        maxConcurrentTasks: 3,
        timeout: 30000,
        retryAttempts: 3,
        memory: { enabled: true, size: 512 },
        logging: { level: 'info' }
      },
      metrics: {
        cpu: 25.5,
        memory: 128.3,
        tasksPerMinute: 2.1,
        errorRate: 0.5,
        averageTaskTime: 45000
      }
    },
    {
      id: 'agent-002',
      name: 'Code Agent',
      type: 'developer',
      status: 'idle',
      capabilities: ['coding', 'testing', 'debugging'],
      uptime: 7200000,
      tasksCompleted: 8,
      lastActivity: new Date(Date.now() - 300000),
      config: {
        maxConcurrentTasks: 2,
        timeout: 60000,
        retryAttempts: 2,
        memory: { enabled: true, size: 1024 },
        logging: { level: 'debug' }
      },
      metrics: {
        cpu: 5.2,
        memory: 256.7,
        tasksPerMinute: 0.8,
        errorRate: 1.2,
        averageTaskTime: 120000
      }
    }
  ];

  let filteredAgents = mockAgents;

  if (statusFilter) {
    filteredAgents = filteredAgents.filter(agent => agent.status === statusFilter);
  }

  if (typeFilter) {
    filteredAgents = filteredAgents.filter(agent => agent.type === typeFilter);
  }

  return filteredAgents;
}

async function getAgentById(agentId: string): Promise<Agent> {
  const agents = await getAgents();
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  
  return agent;
}

async function createAgent(config: any): Promise<Agent> {
  // Mock agent creation
  const agent: Agent = {
    id: `agent-${Date.now()}`,
    name: config.name,
    type: config.type,
    status: 'offline',
    capabilities: config.capabilities || [],
    uptime: 0,
    tasksCompleted: 0,
    lastActivity: new Date(),
    config: {
      maxConcurrentTasks: 3,
      timeout: 30000,
      retryAttempts: 3,
      memory: { enabled: true, size: 512 },
      logging: { level: 'info' }
    },
    metrics: {
      cpu: 0,
      memory: 0,
      tasksPerMinute: 0,
      errorRate: 0,
      averageTaskTime: 0
    }
  };

  return agent;
}

async function startAgentById(agentId: string): Promise<void> {
  // Mock agent start
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function stopAgentById(agentId: string, force: boolean): Promise<void> {
  // Mock agent stop
  await new Promise(resolve => setTimeout(resolve, force ? 500 : 2000));
}

async function removeAgentById(agentId: string): Promise<void> {
  // Mock agent removal
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function assignTaskToAgent(agentId: string, taskDescription: string, priority: string): Promise<string> {
  // Mock task assignment
  await new Promise(resolve => setTimeout(resolve, 500));
  return `task-${Date.now()}`;
}

async function getAgentLogs(agentId: string, options: any): Promise<any[]> {
  // Mock logs
  const mockLogs = [
    { timestamp: new Date(), level: 'info', message: 'Agent started', agentId },
    { timestamp: new Date(), level: 'info', message: 'Task assigned', agentId },
    { timestamp: new Date(), level: 'debug', message: 'Processing task', agentId },
    { timestamp: new Date(), level: 'info', message: 'Task completed', agentId }
  ];

  return mockLogs.slice(-options.lines);
}

function displayAgentsTable(agents: Agent[]): void {
  console.log(successBold('\n🤖 Claude Flow Agents\n'));
  
  const agentTable = formatTable(agents, [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Type', key: 'type' },
    { header: 'Status', key: 'status', formatter: (v) => getStatusColor(v) },
    { header: 'Tasks', key: 'tasksCompleted' },
    { header: 'Uptime', key: 'uptime', formatter: (v) => formatDuration(v) },
    { header: 'Current Task', key: 'currentTask', formatter: (v) => v || '-' }
  ]);
  
  console.log(agentTable);
  console.log();
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'busy':
      return successBold(status);
    case 'idle':
      return warningBold(status);
    case 'error':
    case 'offline':
      return errorBold(status);
    default:
      return status;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function formatLogEntry(logEntry: any): string {
  const timestamp = logEntry.timestamp.toISOString();
  const level = logEntry.level.toUpperCase().padEnd(5);
  return `${timestamp} [${level}] ${logEntry.message}`;
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

export default agentCommand; 