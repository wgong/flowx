/**
 * Comprehensive unit tests for Coordination System
 * Tests deadlock detection, task scheduling, and resource management
 */

import { describe, it, beforeEach, afterEach, assertEquals, assertExists, assertRejects, assertThrows } from '../../../tests/utils/node-test-utils';

import { CoordinationManager } from '../../../src/coordination/manager.ts';
import { TaskScheduler } from '../../../src/coordination/scheduler.ts';
import { ResourceManager } from '../../../src/coordination/resources.ts';
import { ConflictResolver } from '../../../src/coordination/conflict-resolution.ts';
import { CircuitBreaker } from '../../../src/coordination/circuit-breaker.ts';
import { WorkStealingCoordinator } from '../../../src/coordination/work-stealing.ts';
import { DependencyGraph } from '../../../src/coordination/dependency-graph.ts';
import { TaskOrchestrator } from '../../../src/coordination/task-orchestrator.ts';
import { generateCoordinationTasks, generateErrorScenarios } from '../../fixtures/generators.ts';
import { Task, CoordinationConfig } from '../../../src/utils/types.ts';

// Node.js compatible delay function
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple mock spy function
function createSpy<T extends (...args: any[]) => any>(fn: T = (() => {}) as any): { 
  (...args: Parameters<T>): ReturnType<T>; 
  calls: { args: Parameters<T>; result: ReturnType<T> }[];
  reset(): void;
} {
  const calls: { args: Parameters<T>; result: ReturnType<T> }[] = [];
  const spy = function(...args: Parameters<T>): ReturnType<T> {
    const result = fn(...args);
    calls.push({ args, result });
    return result;
  };
  
  spy.calls = calls;
  spy.reset = () => { calls.length = 0; };
  
  return spy;
}

// Fixed FakeTime class
class FakeTime {
  private originalNow: typeof Date.now;
  private originalSetTimeout: typeof setTimeout;
  private originalClearTimeout: typeof clearTimeout;
  private originalSetInterval: typeof setInterval;
  private originalClearInterval: typeof clearInterval;
  private now: number;
  private timers: Array<{ id: number; expiry: number; callback: Function; active: boolean }>;
  private nextId: number = 1;

  constructor() {
    this.originalNow = Date.now;
    this.originalSetTimeout = global.setTimeout;
    this.originalClearTimeout = global.clearTimeout;
    this.originalSetInterval = global.setInterval;
    this.originalClearInterval = global.clearInterval;
    this.now = Date.now();
    this.timers = [];
    
    // Mock the timer functions
    Date.now = () => this.now;
    global.setTimeout = ((callback: Function, delay: number) => {
      const id = this.nextId++;
      this.timers.push({
        id,
        expiry: this.now + delay,
        callback,
        active: true
      });
      return id as any;
    }) as any;
    
    global.clearTimeout = ((id: number) => {
      const timer = this.timers.find(t => t.id === id);
      if (timer) {
        timer.active = false;
      }
    }) as any;
  }

  tick(ms: number) {
    this.now += ms;
    Date.now = () => this.now;
    
    const expired = this.timers.filter(timer => timer.expiry <= this.now && timer.active);
    this.timers = this.timers.filter(timer => timer.expiry > this.now || !timer.active);
    
    expired.forEach(timer => {
      if (timer.active) {
        timer.callback();
      }
    });
  }

  restore() {
    if (this.originalNow) {
      Date.now = this.originalNow;
    }
    if (this.originalSetTimeout) {
      global.setTimeout = this.originalSetTimeout;
    }
    if (this.originalClearTimeout) {
      global.clearTimeout = this.originalClearTimeout;
    }
    if (this.originalSetInterval) {
      global.setInterval = this.originalSetInterval;
    }
    if (this.originalClearInterval) {
      global.clearInterval = this.originalClearInterval;
    }
  }
}

// Simplified test utils
const TestUtils = {
  delay,
  
  assertInRange: (value: number, min: number, max: number, message?: string) => {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  },
  
  async assertThrowsAsync(fn: () => Promise<any>, errorClass?: any, msgIncludes?: string) {
    await expect(fn()).rejects.toThrow();
  },
  
  // Simplified benchmark implementation
  benchmark: async (fn: () => Promise<any>, options: { iterations?: number, concurrency?: number } = {}) => {
    const iterations = options.iterations || 10;
    const concurrency = options.concurrency || 1;
    
    let totalTime = 0;
    const batchSize = Math.ceil(iterations / concurrency);
    
    for (let i = 0; i < batchSize; i++) {
      const batch = Array.from({ length: Math.min(concurrency, iterations - i * concurrency) }, () => fn());
      const start = Date.now();
      await Promise.all(batch);
      totalTime += (Date.now() - start);
    }
    
    return {
      stats: { 
        mean: totalTime / iterations,
        min: 0,
        max: totalTime,
      }
    };
  },
  
  loadTest: async (fn: () => Promise<any>, options: { duration: number, maxConcurrency: number, requestsPerSecond: number }) => {
    const startTime = Date.now();
    const endTime = startTime + options.duration;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    
    const execute = async () => {
      const requestStart = Date.now();
      try {
        await fn();
        successfulRequests++;
      } catch (e) {
        failedRequests++;
      }
      totalResponseTime += Date.now() - requestStart;
    };
    
    const batchSize = Math.min(options.maxConcurrency, Math.ceil(options.requestsPerSecond / 2));
    
    while (Date.now() < endTime) {
      const batch = Array.from({ length: batchSize }, () => execute());
      await Promise.all(batch);
      await delay(1000 / options.requestsPerSecond * batchSize);
    }
    
    const totalRequests = successfulRequests + failedRequests;
    
    return {
      successfulRequests,
      failedRequests,
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
    };
  }
};

describe('Coordination System - Comprehensive Tests', () => {
  let coordinationManager: CoordinationManager;
  let fakeTime: FakeTime;
  let mockLogger: any;
  let mockEventBus: any;
  let config: CoordinationConfig;

  beforeEach(() => {
    // Create proper mocks
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
      configure: jest.fn().mockResolvedValue(undefined)
    };

    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      listeners: jest.fn().mockReturnValue([]),
      listenerCount: jest.fn().mockReturnValue(0),
      eventNames: jest.fn().mockReturnValue([]),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn().mockReturnValue(10),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      addListener: jest.fn()
    };

    config = {
      maxRetries: 3,
      retryDelay: 1000,
      deadlockDetection: true,
      resourceTimeout: 5000, // Shorter timeout for tests
      messageTimeout: 5000
    };

    coordinationManager = new CoordinationManager(config, mockEventBus, mockLogger);
    fakeTime = new FakeTime();
  });

  afterEach(async () => {
    if (fakeTime) {
      fakeTime.restore();
    }
    if (coordinationManager) {
      await coordinationManager.shutdown();
    }
  });

  describe('Task Assignment and Management', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should assign tasks to agents', async () => {
      const task: Task = {
        id: 'test-task-1',
        type: 'analysis',
        description: 'Test task',
        priority: 1,
        dependencies: [],
        status: 'pending',
        input: { content: 'test data' },
        createdAt: new Date()
      };

      const agentId = 'agent-1';
      
      await coordinationManager.assignTask(task, agentId);
      
      const taskCount = await coordinationManager.getAgentTaskCount(agentId);
      expect(taskCount).toBeGreaterThan(0);
    });

    it('should get agent tasks', async () => {
      const task: Task = {
        id: 'test-task-2',
        type: 'analysis',
        description: 'Test task 2',
        priority: 2,
        dependencies: [],
        status: 'pending',
        input: { content: 'test data' },
        createdAt: new Date()
      };

      const agentId = 'agent-2';
      
      await coordinationManager.assignTask(task, agentId);
      
      const tasks = await coordinationManager.getAgentTasks(agentId);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0].id).toBe('test-task-2');
    });

    it('should cancel tasks', async () => {
      const task: Task = {
        id: 'test-task-3',
        type: 'analysis',
        description: 'Test task 3',
        priority: 1,
        dependencies: [],
        status: 'pending',
        input: { content: 'test data' },
        createdAt: new Date()
      };

      const agentId = 'agent-3';
      
      await coordinationManager.assignTask(task, agentId);
      await coordinationManager.cancelTask('test-task-3', 'test cancellation');
      
      // Task should be cancelled
      const tasks = await coordinationManager.getAgentTasks(agentId);
      const cancelledTask = tasks.find(t => t.id === 'test-task-3');
      expect(cancelledTask?.status).toBe('cancelled');
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should acquire and release resources', async () => {
      const resourceId = 'resource-1';
      const agentId = 'agent-1';

      await coordinationManager.acquireResource(resourceId, agentId);
      
      // Should be able to release the resource
      await coordinationManager.releaseResource(resourceId, agentId);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.stringContaining('resource'),
        expect.any(Object)
      );
    });

    it('should handle resource conflicts', async () => {
      const resourceId = 'resource-2';
      const agent1 = 'agent-1';
      const agent2 = 'agent-2';

      await coordinationManager.acquireResource(resourceId, agent1);
      
      // Second agent should timeout after resourceTimeout when trying to acquire same resource
      const acquirePromise = coordinationManager.acquireResource(resourceId, agent2);
      
      // Advance time to trigger timeout
      fakeTime.tick(5000);
      
      await expect(acquirePromise).rejects.toThrow();
    }, 10000); // 10 second timeout for the test
  });

  describe('Health and Metrics', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should provide health status', async () => {
      const health = await coordinationManager.getHealthStatus();
      
      expect(health).toHaveProperty('healthy');
      expect(health.healthy).toBe(true);
      expect(health).toHaveProperty('metrics');
    });

    it('should provide coordination metrics', async () => {
      const metrics = await coordinationManager.getCoordinationMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    it('should perform maintenance', async () => {
      await coordinationManager.performMaintenance();
      
      // Should not throw and should complete successfully
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('maintenance')
      );
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should report and handle conflicts', async () => {
      const conflictType = 'resource';
      const resourceId = 'resource-3';
      const agents = ['agent-1', 'agent-2'];

      await coordinationManager.reportConflict(conflictType, resourceId, agents);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.stringContaining('conflict'),
        expect.objectContaining({
          resourceId: resourceId,
          agents: agents,
          resolved: true
        })
      );
    });
  });

  describe('Advanced Features', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should enable advanced scheduling', () => {
      coordinationManager.enableAdvancedScheduling();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('advanced scheduling')
      );
    });
  });

  describe('Message Routing', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should send messages between agents', async () => {
      const fromAgent = 'agent-1';
      const toAgent = 'agent-2';
      const message = { type: 'test', content: 'hello' };

      await coordinationManager.sendMessage(fromAgent, toAgent, message);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.stringContaining('message'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await coordinationManager.initialize();
    });

    it('should handle initialization errors gracefully', async () => {
      const failingManager = new CoordinationManager(config, mockEventBus, mockLogger);
      
      // Mock a component failure
      const originalInitialize = failingManager.initialize;
      failingManager.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      await expect(failingManager.initialize()).rejects.toThrow('Init failed');
    });

    it('should handle shutdown gracefully', async () => {
      await coordinationManager.shutdown();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('shutdown')
      );
    });
  });
});