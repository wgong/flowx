/**
 * Unified Task Command - Simplified Version
 * Consolidated task management combining TaskEngine, AgentProcessManager, and Persistence
 * 
 * This is the SINGLE SOURCE OF TRUTH for task management in Claude Flow
 * Eliminates technical debt by consolidating 3 separate implementations
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';
import { TaskEngine } from '../../../task/engine.ts';
import { AgentProcessManager } from '../../../agents/agent-process-manager.ts';
import { getMemoryManager, getPersistenceManager, getLogger } from '../../core/global-initialization.ts';
import { generateId } from '../../../utils/helpers.ts';
import type { PersistedTask } from '../../../core/persistence.ts';

// Global instances - shared across all task operations
let globalTaskEngine: TaskEngine | null = null;
let globalAgentProcessManager: AgentProcessManager | null = null;

async function getTaskEngine(): Promise<TaskEngine> {
  if (!globalTaskEngine) {
    globalTaskEngine = new TaskEngine(10); // Max 10 concurrent tasks
  }
  return globalTaskEngine;
}

async function getAgentProcessManager(): Promise<AgentProcessManager> {
  if (!globalAgentProcessManager) {
    const logger = await getLogger();
    globalAgentProcessManager = new AgentProcessManager(logger);
  }
  return globalAgentProcessManager;
}

export const taskCommand: CLICommand = {
  name: 'task',
  description: 'Unified task management system with TaskEngine, agent execution, and persistence',
  category: 'Tasks',
  usage: 'claude-flow task <subcommand> [OPTIONS]',
  examples: [
    'claude-flow task create "Implement user authentication" --priority 5',
    'claude-flow task list --status pending',
    'claude-flow task execute task-123',
    'claude-flow task stats'
  ],
  subcommands: [
    {
      name: 'create',
      description: 'Create a new task',
      handler: createTask,
      options: [
        {
          name: 'description',
          short: 'd',
          description: 'Task description',
          type: 'string'
        },
        {
          name: 'type',
          short: 't',
          description: 'Task type',
          type: 'string',
          default: 'general'
        },
        {
          name: 'priority',
          short: 'p',
          description: 'Task priority (1-10)',
          type: 'number',
          default: 5
        },
        {
          name: 'tags',
          description: 'Comma-separated task tags',
          type: 'string'
        },
        {
          name: 'timeout',
          description: 'Task timeout in seconds',
          type: 'number',
          default: 300
        }
      ]
    },
    {
      name: 'list',
      description: 'List tasks',
      handler: listTasks,
      options: [
        {
          name: 'status',
          short: 's',
          description: 'Filter by status',
          type: 'string',
          choices: ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled']
        },
        {
          name: 'limit',
          short: 'l',
          description: 'Maximum tasks to show',
          type: 'number',
          default: 20
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
      name: 'show',
      description: 'Show detailed task information',
      handler: showTask,
      arguments: [
        {
          name: 'task-id',
          description: 'Task ID to show',
          required: true
        }
      ]
    },
    {
      name: 'stats',
      description: 'Show task statistics',
      handler: showTaskStats,
      options: [
        {
          name: 'detailed',
          short: 'd',
          description: 'Show detailed statistics',
          type: 'boolean'
        }
      ]
    }
  ],
  handler: async (context: CLIContext) => {
    // Default to list if no subcommand
    return await listTasks(context);
  }
};

// =============================================================================
// TASK MANAGEMENT FUNCTIONS
// =============================================================================

async function createTask(context: CLIContext): Promise<void> {
  const { args, options } = context;
  
  const description = options.description || args[0];
  if (!description) {
    printError('Task description is required');
    printInfo('Usage: claude-flow task create --description "Task description" [options]');
    return;
  }

  try {
    const taskEngine = await getTaskEngine();
    const persistenceManager = await getPersistenceManager();
    
    // Parse tags
    const tags = options.tags ? 
      options.tags.split(',').map((tag: string) => tag.trim()) : [];

    // Create task in TaskEngine
    const task = await taskEngine.createTask({
      type: options.type || 'general',
      description,
      priority: options.priority || 5,
      tags,
      timeout: (options.timeout || 300) * 1000, // Convert to milliseconds
      resourceRequirements: []
    });

    // Create corresponding persisted task
    const persistedTask: PersistedTask = {
      id: task.id,
      type: task.type,
      description: task.description,
      status: 'pending',
      priority: task.priority,
      dependencies: '',
      metadata: JSON.stringify({
        source: 'cli',
        createdBy: 'user',
        tags,
        taskEngineId: task.id
      }),
      progress: 0,
      createdAt: Date.now()
    };

    // Store in persistence layer
    await persistenceManager.saveTask(persistedTask);

    printSuccess(`✅ Task created: ${task.id}`);
    printInfo(`Description: ${task.description}`);
    printInfo(`Type: ${task.type}`);
    printInfo(`Priority: ${task.priority}`);
    printInfo(`Status: ${task.status}`);
    
    if (task.tags.length > 0) {
      printInfo(`Tags: ${task.tags.join(', ')}`);
    }
    
  } catch (error) {
    printError(`Failed to create task: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function listTasks(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const taskEngine = await getTaskEngine();
    const persistenceManager = await getPersistenceManager();
    
    // Get tasks from TaskEngine
    const taskEngineResult = await taskEngine.listTasks(
      {},
      undefined,
      options.limit || 20
    );

    // Get tasks from persistence layer
    let persistedTasks = await persistenceManager.getActiveTasks();
    
    // Apply filters
    if (options.status) {
      persistedTasks = persistedTasks.filter((task: PersistedTask) => task.status === options.status);
    }

    // Combine results
    const allTasks = [...taskEngineResult.tasks, ...persistedTasks];

    if (allTasks.length === 0) {
      printInfo('No tasks found matching criteria');
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(allTasks, null, 2));
    } else {
      displayTasksTable(allTasks);
    }
    
    printSuccess(`Found ${allTasks.length} tasks`);
    
  } catch (error) {
    printError(`Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showTask(context: CLIContext): Promise<void> {
  const { args } = context;
  
  const taskId = args[0];
  if (!taskId) {
    printError('Task ID is required');
    printInfo('Usage: claude-flow task show <task-id>');
    return;
  }

  try {
    const taskEngine = await getTaskEngine();
    const persistenceManager = await getPersistenceManager();

    // Get task status from TaskEngine
    const taskStatus = await taskEngine.getTaskStatus(taskId);
    
    // Get from persistence
    const persistedTasks = await persistenceManager.getActiveTasks();
    const persistedTask = persistedTasks.find((t: PersistedTask) => t.id === taskId);

    if (!taskStatus && !persistedTask) {
      printError(`Task not found: ${taskId}`);
      return;
    }

    console.log(successBold(`\n📋 Task Details: ${taskId}\n`));
    console.log('─'.repeat(60));

    if (taskStatus?.task) {
      const task = taskStatus.task;
      console.log(`${infoBold('Description:')} ${task.description}`);
      console.log(`${infoBold('Type:')} ${task.type}`);
      console.log(`${infoBold('Priority:')} ${task.priority}`);
      console.log(`${infoBold('Status:')} ${task.status}`);
      console.log(`${infoBold('Created:')} ${task.createdAt.toISOString()}`);
      
      if (task.tags.length > 0) {
        console.log(`${infoBold('Tags:')} ${task.tags.join(', ')}`);
      }
    }

    if (persistedTask) {
      console.log(`\n${infoBold('Persistence Status:')} ${persistedTask.status}`);
      console.log(`${infoBold('Progress:')} ${persistedTask.progress}%`);
      
      if (persistedTask.assignedAgent) {
        console.log(`${infoBold('Assigned Agent:')} ${persistedTask.assignedAgent}`);
      }
    }
    
  } catch (error) {
    printError(`Failed to show task: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showTaskStats(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const persistenceManager = await getPersistenceManager();
    const stats = await persistenceManager.getStats();

    console.log(successBold('\n📊 Task Statistics\n'));
    
    console.log(`Total Tasks: ${stats.totalTasks}`);
    console.log(`Pending Tasks: ${stats.pendingTasks}`);
    console.log(`Completed Tasks: ${stats.completedTasks}`);

    if (options.detailed) {
      const activeTasks = await persistenceManager.getActiveTasks();
      
      const statusStats = activeTasks.reduce((acc: any, task: PersistedTask) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});

      console.log('\nStatus Distribution:');
      Object.entries(statusStats).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
  } catch (error) {
    printError(`Failed to show task stats: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function displayTasksTable(tasks: any[]): void {
  const columns = [
    { header: 'ID', key: 'id', formatter: (val: string) => val.substring(0, 12) + '...' },
    { header: 'Type', key: 'type' },
    { header: 'Description', key: 'description', formatter: (val: string) => val.substring(0, 50) + (val.length > 50 ? '...' : '') },
    { header: 'Status', key: 'status' },
    { header: 'Priority', key: 'priority', formatter: (val: any) => val?.toString() || '-' }
  ];

  console.log(formatTable(tasks, columns));
} 