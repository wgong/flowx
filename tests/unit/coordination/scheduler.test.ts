import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TaskCoordinator, CapabilitySchedulingStrategy, CoordinationConfig } from '../../../src/coordination/task-coordinator.js';
import type { IEventBus } from '../../../src/core/event-bus.js';
import type { ILogger } from '../../../src/core/logger.js';
import type { Task, AgentProfile } from '../../../src/core/types.js';

// Mock dependencies
const mockEventBus: IEventBus = {
  emit: jest.fn(() => true),
  on: jest.fn(() => mockEventBus),
  off: jest.fn(() => mockEventBus),
  once: jest.fn(() => mockEventBus),
  removeAllListeners: jest.fn(() => mockEventBus),
  getMaxListeners: jest.fn(() => 10),
  setMaxListeners: jest.fn(() => mockEventBus),
  listeners: jest.fn(() => []),
  listenerCount: jest.fn(() => 0)
};

const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  configure: jest.fn(async () => {})
};

describe('Task Coordinator', () => {
  let scheduler: TaskCoordinator;
  let config: CoordinationConfig;

  beforeEach(() => {
    config = {
      maxConcurrentTasks: 10,
      defaultTimeout: 30000,
      enableWorkStealing: true,
      enableCircuitBreaker: true,
      retryAttempts: 3,
      schedulingStrategy: 'capability',
      maxRetries: 3,
      retryDelay: 1000,
      resourceTimeout: 30000
    };

    scheduler = new TaskScheduler(config, mockEventBus, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await scheduler.initialize();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Task Scheduler initialized',
        expect.objectContaining({
          strategies: expect.arrayContaining(['capability', 'round-robin', 'least-loaded', 'affinity']),
          defaultStrategy: 'capability'
        })
      );
    });

    it('should register default strategies', async () => {
      await scheduler.initialize();
      
      const metrics = await scheduler.getSchedulingMetrics();
      expect(metrics.strategies).toEqual(['capability', 'round-robin', 'least-loaded', 'affinity']);
    });
  });

  describe('agent management', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('should register an agent successfully', () => {
      const agent: AgentProfile = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'researcher',
        status: 'idle',
        capabilities: ['research', 'analysis'],
        priority: 1
      };

      scheduler.registerAgent(agent);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Registered agent with scheduler',
        expect.objectContaining({
          agentId: 'agent-1',
          capabilities: ['research', 'analysis'],
          priority: 1
        })
      );
    });

    it('should unregister an agent successfully', () => {
      const agent: AgentProfile = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'researcher',
        status: 'idle',
        capabilities: ['research'],
        priority: 1
      };

      scheduler.registerAgent(agent);
      scheduler.unregisterAgent('agent-1');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Unregistered agent from scheduler',
        { agentId: 'agent-1' }
      );
    });
  });

  describe('task assignment', () => {
    let agent1: AgentProfile;
    let agent2: AgentProfile;
    let task: Task;

    beforeEach(async () => {
      await scheduler.initialize();

      agent1 = {
        id: 'agent-1',
        name: 'Research Agent',
        type: 'researcher',
        status: 'idle',
        capabilities: ['research', 'analysis'],
        priority: 1
      };

      agent2 = {
        id: 'agent-2',
        name: 'Code Agent',
        type: 'coder',
        status: 'idle',
        capabilities: ['coding', 'testing'],
        priority: 2
      };

      task = {
        id: 'task-1',
        type: 'research',
        description: 'Research task',
        status: 'pending',
        priority: 1,
        requiredCapabilities: ['research'],
        createdAt: new Date()
      };

      scheduler.registerAgent(agent1);
      scheduler.registerAgent(agent2);
    });

    it('should assign task using capability strategy', async () => {
      const assignedAgentId = await scheduler.assignTask(task);
      
      expect(assignedAgentId).toBe('agent-1'); // Should pick agent with research capability
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:assigned', expect.objectContaining({
        taskId: 'task-1',
        agentId: 'agent-1',
        strategy: 'capability'
      }));
    });

    it('should assign task to specific agent when provided', async () => {
      const assignedAgentId = await scheduler.assignTask(task, 'agent-2');
      
      expect(assignedAgentId).toBe('agent-2');
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:assigned', expect.objectContaining({
        taskId: 'task-1',
        agentId: 'agent-2'
      }));
    });

    it('should use specified strategy', async () => {
      const assignedAgentId = await scheduler.assignTask(task, undefined, 'round-robin');
      
      expect(assignedAgentId).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith('task:assigned', expect.objectContaining({
        strategy: 'round-robin'
      }));
    });

    it('should throw error when no suitable agent available', async () => {
      // Create a task that requires capabilities no agent has
      const impossibleTask: Task = {
        id: 'task-impossible',
        type: 'impossible',
        description: 'Impossible task',
        status: 'pending',
        priority: 1,
        requiredCapabilities: ['impossible-capability'],
        createdAt: new Date()
      };

      await expect(scheduler.assignTask(impossibleTask)).rejects.toThrow('No suitable agent available');
    });
  });

  describe('task completion and failure', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('should handle task completion', async () => {
      // First assign a task
      const task: Task = {
        id: 'task-1',
        type: 'test',
        description: 'Test task',
        status: 'pending',
        priority: 1,
        createdAt: new Date()
      };
      
      const agent: AgentProfile = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'tester',
        status: 'idle',
        capabilities: ['test'],
        priority: 1
      };
      
      scheduler.registerAgent(agent);
      await scheduler.assignTask(task);
      
      // Then complete it
      await scheduler.completeTask('task-1', { result: 'success' }, 5000);

      expect(mockEventBus.emit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Task completed',
        expect.objectContaining({
          taskId: 'task-1',
          duration: 5000
        })
      );
    });

    it('should handle task failure', async () => {
      // First assign a task
      const task: Task = {
        id: 'task-1',
        type: 'test',
        description: 'Test task',
        status: 'pending',
        priority: 1,
        createdAt: new Date()
      };
      
      const agent: AgentProfile = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'tester',
        status: 'idle',
        capabilities: ['test'],
        priority: 1
      };
      
      scheduler.registerAgent(agent);
      await scheduler.assignTask(task);
      
      // Then fail it
      const error = new Error('Task failed');
      await scheduler.failTask('task-1', error);

      expect(mockEventBus.emit).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Task failed',
        expect.objectContaining({
          taskId: 'task-1',
          error: 'Task failed'
        })
      );
    });
  });

  describe('strategy management', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('should set default strategy', () => {
      scheduler.setDefaultStrategy('least-loaded');
      // No direct way to verify this, but it should not throw
    });

    it('should throw error for unknown strategy', () => {
      expect(() => scheduler.setDefaultStrategy('unknown')).toThrow('Unknown scheduling strategy: unknown');
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await scheduler.initialize();
    });

    it('should return scheduling metrics', async () => {
      const agent: AgentProfile = {
        id: 'agent-1',
        name: 'Test Agent',
        type: 'researcher',
        status: 'idle',
        capabilities: ['research'],
        priority: 1
      };

      scheduler.registerAgent(agent);

      const metrics = await scheduler.getSchedulingMetrics();

      expect(metrics).toEqual(expect.objectContaining({
        activeAgents: 1,
        strategies: expect.arrayContaining(['capability', 'round-robin', 'least-loaded', 'affinity']),
        defaultStrategy: 'capability',
        taskLoads: expect.any(Object),
        taskStats: expect.any(Object)
      }));
    });
  });
});

describe('Capability Scheduling Strategy', () => {
  let strategy: CapabilitySchedulingStrategy;
  let agents: AgentProfile[];
  let context: any;

  beforeEach(() => {
    strategy = new CapabilitySchedulingStrategy();
    
    agents = [
      {
        id: 'agent-1',
        name: 'Research Agent',
        type: 'researcher',
        status: 'idle',
        capabilities: ['research', 'analysis'],
        priority: 1
      },
      {
        id: 'agent-2',
        name: 'Code Agent',
        type: 'coder',
        status: 'idle',
        capabilities: ['coding', 'testing'],
        priority: 2
      }
    ];

    context = {
      taskLoads: new Map([
        ['agent-1', 2],
        ['agent-2', 1]
      ]),
      agentCapabilities: new Map([
        ['agent-1', ['research', 'analysis']],
        ['agent-2', ['coding', 'testing']]
      ]),
      agentPriorities: new Map([
        ['agent-1', 1],
        ['agent-2', 2]
      ]),
      taskHistory: new Map(),
      currentTime: new Date()
    };
  });

  it('should select agent with matching capabilities', () => {
    const task: Task = {
      id: 'task-1',
      type: 'research',
      description: 'Research task',
      status: 'pending',
      priority: 1,
      requiredCapabilities: ['research'],
      createdAt: new Date()
    };

    const selectedAgent = strategy.selectAgent(task, agents, context);
    expect(selectedAgent).toBe('agent-1');
  });

  it('should return null when no agents match capabilities', () => {
    const task: Task = {
      id: 'task-1',
      type: 'impossible',
      description: 'Impossible task',
      status: 'pending',
      priority: 1,
      requiredCapabilities: ['impossible-capability'],
      createdAt: new Date()
    };

    const selectedAgent = strategy.selectAgent(task, agents, context);
    expect(selectedAgent).toBeNull();
  });

  it('should consider load and priority in selection', () => {
    // Both agents have the required capability
    const task: Task = {
      id: 'task-1',
      type: 'any',
      description: 'General task',
      status: 'pending',
      priority: 1,
      createdAt: new Date()
    };

    // Agent-2 should be selected due to lower load (1 vs 2) and higher priority (2 vs 1)
    const selectedAgent = strategy.selectAgent(task, agents, context);
    expect(selectedAgent).toBe('agent-2');
  });
}); 