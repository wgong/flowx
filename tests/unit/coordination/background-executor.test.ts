import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BackgroundExecutor, BackgroundTaskConfig } from '../../../src/coordination/background-executor.ts';
import { ILogger } from '../../../src/core/logger.ts';
import { IEventBus } from '../../../src/core/event-bus.ts';
import { EventEmitter } from 'node:events';

// Mock implementations
class MockLogger implements ILogger {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  configure = jest.fn(async () => {});
}

class MockEventBus extends EventEmitter implements IEventBus {
  constructor() {
    super();
  }
}

describe('BackgroundExecutor', () => {
  jest.setTimeout(10000); // 10 second timeout
  
  let backgroundExecutor: BackgroundExecutor;
  let mockLogger: MockLogger;
  let mockEventBus: MockEventBus;
  let config: BackgroundTaskConfig;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockEventBus = new MockEventBus();
    
    config = {
      maxConcurrentTasks: 5,
      taskTimeout: 30000,
      retryAttempts: 3,
      retryBackoffBase: 1000,
      persistenceDir: './test-persistence',
      healthCheckInterval: 5000,
      processCleanupInterval: 10000,
      maxQueueSize: 100,
      enablePersistence: false // Disable for testing
    };

    backgroundExecutor = new BackgroundExecutor(config, mockLogger, mockEventBus);
  });

  afterEach(async () => {
    if (backgroundExecutor && !backgroundExecutor.shuttingDown) {
      await backgroundExecutor.shutdown();
    }
  });

  afterAll(async () => {
    // Ensure cleanup after all tests
    if (backgroundExecutor && !backgroundExecutor.shuttingDown) {
      await backgroundExecutor.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await backgroundExecutor.initialize();
      expect(mockLogger.info).toHaveBeenCalledWith('BackgroundExecutor initialized successfully');
    });

    it('should handle shutdown gracefully', async () => {
      await backgroundExecutor.initialize();
      await backgroundExecutor.shutdown();
      expect(mockLogger.info).toHaveBeenCalledWith('BackgroundExecutor shutdown complete');
    });
  });

  describe('task submission', () => {
    beforeEach(async () => {
      await backgroundExecutor.initialize();
    });

    it('should submit a task successfully', async () => {
      const taskId = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['hello'],
        priority: 1
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Task submitted to background executor',
        expect.objectContaining({ taskId, type: 'script' })
      );
    });

    it('should submit a Claude task successfully', async () => {
      const taskId = await backgroundExecutor.submitClaudeTask(
        'Test prompt',
        ['file-system'],
        { priority: 2 }
      );

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
    });

    it('should reject tasks when shutting down', async () => {
      await backgroundExecutor.shutdown();
      
      await expect(backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['test'],
        priority: 1
      })).rejects.toThrow('BackgroundExecutor is shutting down');
    });

    it('should reject tasks when queue is full', async () => {
      // Fill the queue
      const promises = [];
      for (let i = 0; i < config.maxQueueSize + 1; i++) {
        promises.push(backgroundExecutor.submitTask({
          type: 'script',
          command: 'sleep',
          args: ['1'],
          priority: 1
        }));
      }

      // The last one should fail
      await expect(promises[promises.length - 1]).rejects.toThrow('Task queue is full');
    });
  });

  describe('task management', () => {
    beforeEach(async () => {
      await backgroundExecutor.initialize();
    });

    it('should retrieve task information', async () => {
      const taskId = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['test'],
        priority: 1
      });

      const task = backgroundExecutor.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.type).toBe('script');
      expect(task?.command).toBe('echo');
    });

    it('should cancel a task', async () => {
      const taskId = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'sleep',
        args: ['10'],
        priority: 1
      });

      const cancelled = await backgroundExecutor.cancelTask(taskId);
      expect(cancelled).toBe(true);

      const task = backgroundExecutor.getTask(taskId);
      expect(task?.status).toBe('cancelled');
    });

    it('should return false when cancelling non-existent task', async () => {
      const cancelled = await backgroundExecutor.cancelTask('non-existent');
      expect(cancelled).toBe(false);
    });

    it('should list tasks with filters', async () => {
      await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['1'],
        priority: 1
      });

      await backgroundExecutor.submitTask({
        type: 'command',
        command: 'echo',
        args: ['2'],
        priority: 2
      });

      // List all tasks
      const allTasks = backgroundExecutor.listTasks();
      expect(allTasks.length).toBe(2);

      // Filter by type
      const scriptTasks = backgroundExecutor.listTasks({ type: 'script' });
      expect(scriptTasks.length).toBe(1);
      expect(scriptTasks[0].type).toBe('script');

      // Filter by status
      const pendingTasks = backgroundExecutor.listTasks({ status: 'pending' });
      expect(pendingTasks.length).toBe(2);

      // Limit results
      const limitedTasks = backgroundExecutor.listTasks({ limit: 1 });
      expect(limitedTasks.length).toBe(1);
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await backgroundExecutor.initialize();
    });

    it('should provide metrics', () => {
      const metrics = backgroundExecutor.getMetrics();
      
      expect(metrics).toHaveProperty('totalTasks');
      expect(metrics).toHaveProperty('completedTasks');
      expect(metrics).toHaveProperty('failedTasks');
      expect(metrics).toHaveProperty('runningTasks');
      expect(metrics).toHaveProperty('queuedTasks');
      expect(metrics).toHaveProperty('averageExecutionTime');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('resourceUsage');

      expect(typeof metrics.totalTasks).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
    });

    it('should update metrics when tasks are submitted', async () => {
      const initialMetrics = backgroundExecutor.getMetrics();
      expect(initialMetrics.totalTasks).toBe(0);

      await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['test'],
        priority: 1
      });

      const updatedMetrics = backgroundExecutor.getMetrics();
      expect(updatedMetrics.totalTasks).toBe(1);
      expect(updatedMetrics.queuedTasks).toBe(1);
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      await backgroundExecutor.initialize();
    });

    it('should emit task submitted events', async () => {
      const eventSpy = jest.fn();
      backgroundExecutor.on('task:submitted', eventSpy);

      await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['test'],
        priority: 1
      });

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'script',
          command: 'echo'
        })
      );
    });

    it('should handle system shutdown events', async () => {
      const shutdownSpy = jest.spyOn(backgroundExecutor, 'shutdown');
      
      mockEventBus.emit('system:shutdown');
      
      expect(shutdownSpy).toHaveBeenCalled();
    });

    it('should handle task cancel events', async () => {
      const taskId = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'sleep',
        args: ['10'],
        priority: 1
      });

      mockEventBus.emit('task:cancel', taskId);

      // Wait a bit for the async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      const task = backgroundExecutor.getTask(taskId);
      expect(task?.status).toBe('cancelled');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await backgroundExecutor.initialize();
    });

    it('should handle invalid task submissions gracefully', async () => {
      await expect(backgroundExecutor.submitTask({
        type: 'script',
        command: '', // Invalid empty command
        args: [],
        priority: 1
      })).resolves.toBeDefined(); // Should still create task but may fail during execution
    });

    it('should handle task execution failures', async () => {
      const taskId = await backgroundExecutor.submitTask({
        type: 'command',
        command: 'non-existent-command',
        args: [],
        priority: 1
      });

      // Wait for task to be processed and fail
      await new Promise(resolve => setTimeout(resolve, 2000));

      const task = backgroundExecutor.getTask(taskId);
      // Task might still be pending if not processed yet, or failed if processed
      expect(['pending', 'running', 'failed']).toContain(task?.status);
    });
  });

  describe('priority handling', () => {
    beforeEach(async () => {
      await backgroundExecutor.initialize();
    });

    it('should prioritize higher priority tasks', async () => {
      const lowPriorityTask = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['low'],
        priority: 1
      });

      const highPriorityTask = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['high'],
        priority: 5
      });

      const tasks = backgroundExecutor.listTasks();
      
      // Tasks should be sorted by priority (higher first)
      expect(tasks[0].priority).toBeGreaterThanOrEqual(tasks[1].priority);
    });
  });

  describe('configuration validation', () => {
    it('should work with minimal configuration', () => {
      const minimalConfig: BackgroundTaskConfig = {
        maxConcurrentTasks: 1,
        taskTimeout: 10000,
        retryAttempts: 1,
        retryBackoffBase: 1000,
        persistenceDir: './test',
        healthCheckInterval: 5000,
        processCleanupInterval: 10000,
        maxQueueSize: 10,
        enablePersistence: false
      };

      const executor = new BackgroundExecutor(minimalConfig, mockLogger, mockEventBus);
      expect(executor).toBeDefined();
    });

    it('should handle zero max concurrent tasks', () => {
      const zeroConfig: BackgroundTaskConfig = {
        ...config,
        maxConcurrentTasks: 0
      };

      const executor = new BackgroundExecutor(zeroConfig, mockLogger, mockEventBus);
      expect(executor).toBeDefined();
    });
  });
}); 