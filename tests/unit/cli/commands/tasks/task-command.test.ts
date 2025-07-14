/**
 * Unit tests for Task Command
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn()
}));

jest.mock('../../../../../src/swarm/coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    createTask: jest.fn(),
    listTasks: jest.fn(),
    getTask: jest.fn(),
    executeTask: jest.fn(),
    cancelTask: jest.fn(),
    retryTask: jest.fn(),
    assignTask: jest.fn(),
    updateTask: jest.fn(),
    getTaskStatistics: jest.fn(),
    registerAgent: jest.fn(),
    listAgents: jest.fn()
  }))
}));

const mockSwarmCoordinator = {
  createTask: jest.fn() as jest.MockedFunction<any>,
  listTasks: jest.fn() as jest.MockedFunction<any>,
  getTask: jest.fn() as jest.MockedFunction<any>,
  updateTask: jest.fn() as jest.MockedFunction<any>,
  deleteTask: jest.fn() as jest.MockedFunction<any>,
  executeTask: jest.fn() as jest.MockedFunction<any>,
  cancelTask: jest.fn() as jest.MockedFunction<any>,
  retryTask: jest.fn() as jest.MockedFunction<any>,
  assignTask: jest.fn() as jest.MockedFunction<any>,
  getTaskStatistics: jest.fn() as jest.MockedFunction<any>,
  createWorkflow: jest.fn() as jest.MockedFunction<any>,
  executeWorkflow: jest.fn() as jest.MockedFunction<any>,
  listWorkflows: jest.fn() as jest.MockedFunction<any>
};

jest.mock('../../../../../src/coordination/task-execution-engine', () => ({
  TaskExecutionEngine: jest.fn().mockImplementation(() => mockSwarmCoordinator)
}));

jest.mock('../../../../../src/core/persistence', () => ({
  PersistenceManager: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
    load: jest.fn(),
    query: jest.fn()
  }))
}));

describe('Task Command', () => {
  let mockOutputFormatter: any;
  let mockSwarmCoordinator: any;
  let mockTaskEngine: any;
  let mockPersistenceManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
          const { SwarmCoordinator } = require('../../../../../src/swarm/coordinator');
    const { TaskExecutionEngine } = require('../../../../../src/coordination/task-execution-engine');
    const { PersistenceManager } = require('../../../../../src/core/persistence');
    
    mockSwarmCoordinator = new SwarmCoordinator();
    mockTaskEngine = new TaskExecutionEngine();
    mockPersistenceManager = new PersistenceManager();
    
    // Setup default mock responses
    const mockTask = {
      id: 'task-123',
      type: 'analysis',
      description: 'Test task',
      status: 'pending',
      priority: 'normal',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['test'],
      metadata: { source: 'test' }
    };
    
    mockSwarmCoordinator.createTask.mockResolvedValue(mockTask);
    mockSwarmCoordinator.listTasks.mockResolvedValue([mockTask]);
    mockSwarmCoordinator.getTask.mockResolvedValue(mockTask);
    mockSwarmCoordinator.executeTask.mockResolvedValue({
      success: true,
      result: 'Task completed successfully'
    });
    mockSwarmCoordinator.cancelTask.mockResolvedValue({
      success: true,
      message: 'Task cancelled'
    });
    mockSwarmCoordinator.retryTask.mockResolvedValue({
      success: true,
      newTaskId: 'task-456'
    });
    mockSwarmCoordinator.assignTask.mockResolvedValue({
      success: true,
      assignedAgent: 'agent-123'
    });
    mockSwarmCoordinator.updateTask.mockResolvedValue({
      ...mockTask,
      description: 'Updated task'
    });
    mockSwarmCoordinator.getTaskStatistics.mockResolvedValue({
      total: 10,
      pending: 3,
      running: 2,
      completed: 4,
      failed: 1
    });
    mockSwarmCoordinator.listAgents.mockResolvedValue([
      { id: 'agent-1', type: 'researcher', status: 'active' }
    ]);
    
    mockTaskEngine.createTask.mockResolvedValue(mockTask);
    mockTaskEngine.getTasks.mockResolvedValue([mockTask]);
    mockTaskEngine.getTask.mockResolvedValue(mockTask);
    mockTaskEngine.updateTask.mockResolvedValue(mockTask);
    mockTaskEngine.getTaskStatistics.mockResolvedValue({
      total: 10,
      byStatus: { pending: 3, running: 2, completed: 4, failed: 1 },
      byType: { analysis: 5, coding: 3, testing: 2 },
      byPriority: { low: 2, normal: 6, high: 2 }
    });
    
    mockPersistenceManager.save.mockResolvedValue(true);
    mockPersistenceManager.load.mockResolvedValue(mockTask);
    mockPersistenceManager.query.mockResolvedValue([mockTask]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createTask subcommand', () => {
    it('should create a basic task', async () => {
      const { createTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['Test task description'],
        options: {}
      };

      await createTask(context);

      expect(mockSwarmCoordinator.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test task description',
          type: 'general',
          priority: 'normal'
        })
      );
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task created successfully')
      );
    });

    it('should create a task with all options', async () => {
      const { createTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['Complex task'],
        options: {
          type: 'analysis',
          priority: 'high',
          tags: 'urgent,research',
          deadline: '2024-12-31',
          dependencies: 'task-1,task-2',
          agent: 'agent-123',
          metadata: 'source=cli,version=1.0'
        }
      };

      await createTask(context);

      expect(mockSwarmCoordinator.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Complex task',
          type: 'analysis',
          priority: 'high',
          tags: ['urgent', 'research'],
          deadline: new Date('2024-12-31'),
          dependencies: ['task-1', 'task-2'],
          assignedAgent: 'agent-123',
          metadata: { source: 'cli', version: '1.0' }
        })
      );
    });

    it('should handle missing description', async () => {
      const { createTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: {}
      };

      await createTask(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Task description is required'
      );
    });

    it('should handle creation errors', async () => {
      const { createTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      mockSwarmCoordinator.createTask.mockRejectedValue(new Error('Creation failed'));
      
      const context = {
        args: ['Test task'],
        options: {}
      };

      await createTask(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create task')
      );
    });
  });

  describe('listTasks subcommand', () => {
    it('should list all tasks', async () => {
      const { listTasks } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: {}
      };

      await listTasks(context);

      expect(mockSwarmCoordinator.listTasks).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 task')
      );
    });

    it('should filter tasks by status', async () => {
      const { listTasks } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: { status: 'pending' }
      };

      await listTasks(context);

      expect(mockSwarmCoordinator.listTasks).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('should filter tasks by type', async () => {
      const { listTasks } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: { type: 'analysis' }
      };

      await listTasks(context);

      expect(mockSwarmCoordinator.listTasks).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'analysis' })
      );
    });

    it('should filter tasks by agent', async () => {
      const { listTasks } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: { agent: 'agent-123' }
      };

      await listTasks(context);

      expect(mockSwarmCoordinator.listTasks).toHaveBeenCalledWith(
        expect.objectContaining({ assignedAgent: 'agent-123' })
      );
    });

    it('should output in JSON format', async () => {
      const { listTasks } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: { format: 'json' }
      };

      await listTasks(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringMatching(/^\[.*\]$/)
      );
    });
  });

  describe('showTask subcommand', () => {
    it('should show task details', async () => {
      const { showTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: {}
      };

      await showTask(context);

      expect(mockSwarmCoordinator.getTask).toHaveBeenCalledWith('task-123');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task Details: task-123')
      );
    });

    it('should handle missing task ID', async () => {
      const { showTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: {}
      };

      await showTask(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Task ID is required'
      );
    });

    it('should handle non-existent task', async () => {
      const { showTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      mockSwarmCoordinator.getTask.mockResolvedValue(null);
      
      const context = {
        args: ['non-existent'],
        options: {}
      };

      await showTask(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Task not found: non-existent'
      );
    });
  });

  describe('executeTask subcommand', () => {
    it('should execute a task', async () => {
      const { executeTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: {}
      };

      await executeTask(context);

      expect(mockSwarmCoordinator.executeTask).toHaveBeenCalledWith('task-123');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task executed successfully')
      );
    });

    it('should execute task with specific agent', async () => {
      const { executeTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { agent: 'agent-456' }
      };

      await executeTask(context);

      expect(mockSwarmCoordinator.executeTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ assignedAgent: 'agent-456' })
      );
    });

    it('should handle dry run mode', async () => {
      const { executeTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { 'dry-run': true }
      };

      await executeTask(context);

      expect(mockSwarmCoordinator.executeTask).not.toHaveBeenCalled();
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Would execute task: task-123')
      );
    });
  });

  describe('cancelTask subcommand', () => {
    it('should cancel a task', async () => {
      const { cancelTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: {}
      };

      await cancelTask(context);

      expect(mockSwarmCoordinator.cancelTask).toHaveBeenCalledWith('task-123');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task cancelled successfully')
      );
    });

    it('should cancel task with reason', async () => {
      const { cancelTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { reason: 'No longer needed' }
      };

      await cancelTask(context);

      expect(mockSwarmCoordinator.cancelTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ reason: 'No longer needed' })
      );
    });

    it('should force cancel task', async () => {
      const { cancelTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { force: true }
      };

      await cancelTask(context);

      expect(mockSwarmCoordinator.cancelTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ force: true })
      );
    });
  });

  describe('retryTask subcommand', () => {
    it('should retry a failed task', async () => {
      const { retryTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: {}
      };

      await retryTask(context);

      expect(mockSwarmCoordinator.retryTask).toHaveBeenCalledWith('task-123');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task retried successfully')
      );
    });

    it('should retry task with reset', async () => {
      const { retryTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { reset: true }
      };

      await retryTask(context);

      expect(mockSwarmCoordinator.retryTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ reset: true })
      );
    });

    it('should retry task with new agent', async () => {
      const { retryTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { agent: 'agent-456' }
      };

      await retryTask(context);

      expect(mockSwarmCoordinator.retryTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ assignedAgent: 'agent-456' })
      );
    });
  });

  describe('assignTask subcommand', () => {
    it('should assign task to agent', async () => {
      const { assignTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123', 'agent-456'],
        options: {}
      };

      await assignTask(context);

      expect(mockSwarmCoordinator.assignTask).toHaveBeenCalledWith('task-123', 'agent-456');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task assigned successfully')
      );
    });

    it('should handle missing arguments', async () => {
      const { assignTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: {}
      };

      await assignTask(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Task ID and Agent ID are required'
      );
    });
  });

  describe('updateTask subcommand', () => {
    it('should update task description', async () => {
      const { updateTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { description: 'Updated description' }
      };

      await updateTask(context);

      expect(mockSwarmCoordinator.updateTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ description: 'Updated description' })
      );
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task updated successfully')
      );
    });

    it('should update task priority', async () => {
      const { updateTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { priority: 'high' }
      };

      await updateTask(context);

      expect(mockSwarmCoordinator.updateTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ priority: 'high' })
      );
    });

    it('should update task tags', async () => {
      const { updateTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['task-123'],
        options: { tags: 'urgent,critical' }
      };

      await updateTask(context);

      expect(mockSwarmCoordinator.updateTask).toHaveBeenCalledWith(
        'task-123',
        expect.objectContaining({ tags: ['urgent', 'critical'] })
      );
    });
  });

  describe('workflowTask subcommand', () => {
    it('should create a workflow', async () => {
      const { workflowTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['create', 'test-workflow'],
        options: { tasks: 'task-1,task-2,task-3' }
      };

      await workflowTask(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Workflow created successfully')
      );
    });

    it('should execute a workflow', async () => {
      const { workflowTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['execute', 'workflow-123'],
        options: {}
      };

      await workflowTask(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Workflow executed successfully')
      );
    });

    it('should list workflows', async () => {
      const { workflowTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: ['list'],
        options: {}
      };

      await workflowTask(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Available workflows')
      );
    });
  });

  describe('statsTask subcommand', () => {
    it('should show task statistics', async () => {
      const { statsTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: {}
      };

      await statsTask(context);

      expect(mockSwarmCoordinator.getTaskStatistics).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Task Statistics')
      );
    });

    it('should show detailed statistics', async () => {
      const { statsTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: { detailed: true }
      };

      await statsTask(context);

      expect(mockTaskEngine.getTaskStatistics).toHaveBeenCalled();
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Status Distribution')
      );
    });

    it('should show statistics in JSON format', async () => {
      const { statsTask } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const context = {
        args: [],
        options: { format: 'json' }
      };

      await statsTask(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/)
      );
    });
  });

  describe('command definition', () => {
    it('should have correct command structure', () => {
      const { taskCommand } = require('../../../../../src/cli/commands/tasks/task-command');
      
      expect(taskCommand).toBeDefined();
      expect(taskCommand.name).toBe('task');
      expect(taskCommand.description).toContain('Comprehensive task management');
      expect(taskCommand.category).toBe('Task');
      expect(taskCommand.subcommands).toBeDefined();
      expect(taskCommand.subcommands.length).toBeGreaterThan(0);
    });

    it('should have all required subcommands', () => {
      const { taskCommand } = require('../../../../../src/cli/commands/tasks/task-command');
      
      const subcommandNames = taskCommand.subcommands.map((sub: any) => sub.name);
      
      expect(subcommandNames).toContain('create');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('show');
      expect(subcommandNames).toContain('status');
      expect(subcommandNames).toContain('execute');
      expect(subcommandNames).toContain('cancel');
      expect(subcommandNames).toContain('retry');
      expect(subcommandNames).toContain('assign');
      expect(subcommandNames).toContain('update');
      expect(subcommandNames).toContain('workflow');
      expect(subcommandNames).toContain('stats');
    });

    it('should have proper examples', () => {
      const { taskCommand } = require('../../../../../src/cli/commands/tasks/task-command');
      
      expect(taskCommand.examples).toBeDefined();
      expect(taskCommand.examples.length).toBeGreaterThan(0);
      expect(taskCommand.examples[0]).toContain('flowx task');
    });
  });
}); 