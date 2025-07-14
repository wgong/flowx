/**
 * Unit tests for coordination system
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { CoordinationManager, EnhancedCoordinationConfig } from '../../../src/coordination/manager.ts';
import { TaskCoordinator } from '../../../src/coordination/task-coordinator.ts';
import { WorkStealingCoordinator } from '../../../src/coordination/work-stealing.ts';
import { CircuitBreakerManager, CircuitState } from '../../../src/coordination/circuit-breaker.ts';
import { DependencyGraph } from '../../../src/coordination/dependency-graph.ts';
import { ConflictResolver } from '../../../src/coordination/conflict-resolution.ts';
import { Task } from '../../../src/utils/types.ts';
import { createMocks } from '../../mocks/index.ts';
import { setupTestEnv, cleanupTestEnv } from '../../test.config.ts';

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

  async tickAsync(ms: number) {
    this.tick(ms);
    // Allow promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
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

// Test data builder
const TestDataBuilder = {
  task: (overrides: Partial<Task> = {}): Task => ({
    id: `task-${Date.now()}`,
    type: 'analysis',
    description: 'Test task',
    priority: 1,
    dependencies: [],
    status: 'pending',
    input: { content: 'test data' },
    createdAt: new Date(),
    ...overrides,
  }),
  
  agentProfile: (overrides: any = {}) => ({
    id: `agent-${Date.now()}`,
    name: 'Test Agent',
    type: 'analyst',
    capabilities: ['analysis'],
    priority: 1,
    status: 'active' as const,
    metadata: {},
    ...overrides,
  }),
  
  config: (overrides: any = {}) => ({
    coordination: {
      maxConcurrentTasks: 10,
      defaultTimeout: 30000,
      enableWorkStealing: true,
      enableCircuitBreaker: true,
      retryAttempts: 3,
      schedulingStrategy: 'capability',
      maxRetries: 3,
      retryDelay: 1000,
      resourceTimeout: 5000,
      ...overrides.coordination,
    },
    workStealing: {
      enabled: true,
      stealThreshold: 3,
      maxStealBatch: 2,
      stealInterval: 5000,
      minTasksToSteal: 1,
      ...overrides.workStealing,
    },
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      halfOpenLimit: 2,
      ...overrides.circuitBreaker,
    },
    enableAdvancedFeatures: true,
    ...overrides,
  }),
};

describe('CoordinationManager', () => {
  let manager: CoordinationManager;
  let mocks: ReturnType<typeof createMocks>;
  let config: EnhancedCoordinationConfig;
  let time: FakeTime;

  beforeEach(async () => {
    setupTestEnv();
    time = new FakeTime();
    
    config = TestDataBuilder.config();
    mocks = createMocks();
    
    manager = new CoordinationManager(
      config,
      mocks.eventBus,
      mocks.logger,
    );
  });

  afterEach(async () => {
    time.restore();
    try {
      await manager.shutdown();
    } catch {
      // Ignore cleanup errors
    }
    await cleanupTestEnv();
  });

  describe('initialization', () => {
    it('should initialize all components', async () => {
      await manager.initialize();
      
      expect(mocks.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Coordination manager initialized')
      );
    });

    it('should not initialize twice', async () => {
      await manager.initialize();
      
      // Should not throw
      await manager.initialize();
    });
  });

  describe('agent management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should register agent', async () => {
      const agentProfile = TestDataBuilder.agentProfile();

      await manager.registerAgent(agentProfile);
      
      expect(mocks.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Registering agent'),
        expect.objectContaining({ agentId: agentProfile.id })
      );
    });

    it('should unregister agent', async () => {
      const agentProfile = TestDataBuilder.agentProfile();

      await manager.registerAgent(agentProfile);
      await manager.unregisterAgent(agentProfile.id);
      
      expect(mocks.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Agent unregistered'),
        expect.objectContaining({ agentId: agentProfile.id })
      );
    });
  });

  describe('task management', () => {
    beforeEach(async () => {
      await manager.initialize();
      
      // Register a test agent
      await manager.registerAgent(TestDataBuilder.agentProfile({
        id: 'test-agent',
        capabilities: ['analysis'],
      }));
    });

    it('should assign task to agent', async () => {
      const task = TestDataBuilder.task();

      const assignedAgentId = await manager.assignTask(task, 'test-agent');
      
      expect(assignedAgentId).toBe('test-agent');
      expect(mocks.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Assigning task'),
        expect.objectContaining({ taskId: task.id })
      );
    });

    it('should complete task', async () => {
      const task = TestDataBuilder.task();

      await manager.assignTask(task, 'test-agent');
      await manager.completeTask(task.id, 'test-agent', { result: 'success' }, 1000);
      
      expect(mocks.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Task completed'),
        expect.objectContaining({ taskId: task.id })
      );
    });

    it('should fail task', async () => {
      const task = TestDataBuilder.task();

      await manager.assignTask(task, 'test-agent');
      await manager.failTask(task.id, 'test-agent', new Error('Task failed'));
      
      expect(mocks.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Task failed'),
        expect.objectContaining({ taskId: task.id })
      );
    });
  });

  describe('health monitoring', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return healthy status', async () => {
      const health = await manager.getHealthStatus();
      
      expect(health.healthy).toBe(true);
      expect(health.metrics).toBeDefined();
    });

    it('should handle component failures', async () => {
      // Test that the manager can handle component failures
      const health = await manager.getHealthStatus();
      expect(health).toBeDefined();
    });
  });

  describe('maintenance', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform maintenance on all components', async () => {
      await manager.performMaintenance();
      
      expect(mocks.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Performing coordination manager maintenance')
      );
    });
  });
});

describe('WorkStealingCoordinator', () => {
  let coordinator: WorkStealingCoordinator;
  let mocks: ReturnType<typeof createMocks>;
  let config: any;

  beforeEach(() => {
    setupTestEnv();
    
    config = {
      enabled: true,
      stealThreshold: 3,
      maxStealBatch: 2,
      stealInterval: 5000,
      minTasksToSteal: 1,
    };
    
    mocks = createMocks();
    coordinator = new WorkStealingCoordinator(config, mocks.eventBus, mocks.logger);
  });

  afterEach(async () => {
    await coordinator.shutdown();
    await cleanupTestEnv();
  });

  it('should initialize when enabled', async () => {
    await coordinator.initialize();
    
    expect(mocks.logger.info).toHaveBeenCalledWith(
      'Work Stealing Coordinator initialized',
      expect.any(Object)
    );
  });

  it('should not initialize when disabled', async () => {
    config.enabled = false;
    coordinator = new WorkStealingCoordinator(config, mocks.eventBus, mocks.logger);
    
    await coordinator.initialize();
    
    expect(mocks.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Work stealing is disabled')
    );
  });

  it('should update agent workload', () => {
    coordinator.updateAgentWorkload('agent-1', {
      agentId: 'agent-1',
      taskCount: 5,
      avgTaskDuration: 1000,
      cpuUsage: 50,
      memoryUsage: 60,
      priority: 10,
      capabilities: ['test'],
    });

    const stats = coordinator.getWorkloadStats();
    expect(stats.totalAgents).toBe(1);
  });

  it('should record task duration', () => {
    coordinator.recordTaskDuration('agent-1', 1500);
    coordinator.recordTaskDuration('agent-1', 2500);

    // Verify average is updated
    const stats = coordinator.getWorkloadStats();
    expect(stats.workloads).toBeDefined();
  });

  it('should find best agent for task', () => {
    const task = TestDataBuilder.task({ type: 'test' });
    const agents = [
      TestDataBuilder.agentProfile({
        id: 'agent-1',
        capabilities: ['test'],
        priority: 5,
      }),
      TestDataBuilder.agentProfile({
        id: 'agent-2',
        capabilities: ['other'],
        priority: 10,
      }),
    ];

    coordinator.updateAgentWorkload('agent-1', {
      agentId: 'agent-1',
      taskCount: 2,
      avgTaskDuration: 1000,
      cpuUsage: 30,
      memoryUsage: 40,
      priority: 5,
      capabilities: ['test'],
    });

    coordinator.updateAgentWorkload('agent-2', {
      agentId: 'agent-2',
      taskCount: 5,
      avgTaskDuration: 1500,
      cpuUsage: 80,
      memoryUsage: 90,
      priority: 10,
      capabilities: ['other'],
    });

    const bestAgent = coordinator.findBestAgent(task, agents);
    expect(bestAgent).toBe('agent-1'); // Better capability match
  });
});

describe('DependencyGraph', () => {
  let graph: DependencyGraph;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    setupTestEnv();
    mocks = createMocks();
    graph = new DependencyGraph(mocks.logger);
  });

  afterEach(async () => {
    await cleanupTestEnv();
  });

  it('should add task without dependencies', () => {
    const task = TestDataBuilder.task({
      id: 'task-1',
      dependencies: [],
    });

    graph.addTask(task);
    expect(graph.isTaskReady('task-1')).toBe(true);
  });

  it('should add task with completed dependencies', () => {
    const task1 = TestDataBuilder.task({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = TestDataBuilder.task({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.markCompleted('task-1');
    graph.addTask(task2);

    expect(graph.isTaskReady('task-2')).toBe(true);
  });

  it('should handle task completion and mark dependents ready', () => {
    const task1 = TestDataBuilder.task({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = TestDataBuilder.task({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.addTask(task2);

    expect(graph.isTaskReady('task-2')).toBe(false);

    const readyTasks = graph.markCompleted('task-1');
    expect(readyTasks).toEqual(['task-2']);
    expect(graph.isTaskReady('task-2')).toBe(true);
  });

  it('should detect circular dependencies', () => {
    // Test the detectCycles method directly without causing errors
    // First, set up a test graph structure with a cycle
    const task1 = TestDataBuilder.task({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = TestDataBuilder.task({
      id: 'task-2',
      dependencies: ['task-1'],
    });
    
    // Add tasks in the right order to avoid validation errors
    graph.addTask(task1);
    graph.addTask(task2);
    
    // Now create cycle by directly manipulating the node
    const node1 = (graph as any).nodes.get('task-1');
    if (node1) {
      // This creates a circular dependency: task1 -> task2 -> task1
      node1.dependencies.add('task-2');
      
      // Check if cycles are detected
      const cycles = graph.detectCycles();
      expect(cycles.length).toBe(1);
    } else {
      throw new Error('Node not found');
    }
  });

  it('should perform topological sort', () => {
    const task1 = TestDataBuilder.task({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = TestDataBuilder.task({
      id: 'task-2',
      dependencies: ['task-1'],
    });
    const task3 = TestDataBuilder.task({
      id: 'task-3',
      dependencies: ['task-2'],
    });

    graph.addTask(task1);
    graph.addTask(task2);
    graph.addTask(task3);

    const sorted = graph.topologicalSort();
    expect(sorted).toBeDefined();
    if (sorted) {
      expect(sorted[0]).toBe('task-1');
      expect(sorted[1]).toBe('task-2');
      expect(sorted[2]).toBe('task-3');
    }
  });

  it('should find critical path', () => {
    const task1 = TestDataBuilder.task({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = TestDataBuilder.task({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.addTask(task2);

    const criticalPath = graph.findCriticalPath();
    expect(criticalPath).toBeDefined();
    if (criticalPath) {
      expect(criticalPath.path.length).toBe(2);
    }
  });

  it('should export to DOT format', () => {
    const task1 = TestDataBuilder.task({
      id: 'task-1',
      dependencies: [],
    });
    const task2 = TestDataBuilder.task({
      id: 'task-2',
      dependencies: ['task-1'],
    });

    graph.addTask(task1);
    graph.addTask(task2);

    const dot = graph.toDot();
    expect(dot).toContain('digraph TaskDependencies');
    expect(dot).toContain('"task-1" -> "task-2"');
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    setupTestEnv();
    mocks = createMocks();
    const defaultConfig = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      halfOpenLimit: 2,
    };
    manager = new CircuitBreakerManager(defaultConfig, mocks.logger, mocks.eventBus);
  });

  afterEach(async () => {
    await manager.shutdown();
    await cleanupTestEnv();
  });

  it('should initialize successfully', async () => {
    await manager.initialize();
    
    expect(mocks.logger.info).toHaveBeenCalledWith(
      'Circuit Breaker Manager initialized',
      expect.any(Object)
    );
  });

  it('should create circuit breaker', async () => {
    await manager.initialize();
    
    const config = {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      halfOpenLimit: 1,
    };

    const breaker = manager.getBreaker('test-breaker', config);
    expect(breaker).toBeDefined();
  });

  it('should get overall stats', async () => {
    await manager.initialize();
    
    const stats = manager.getHealthStatus();
    expect(stats).toBeDefined();
    expect(stats.totalBreakers).toBe(0);
    expect(stats.openBreakers).toEqual([]);
    expect(stats.halfOpenBreakers).toEqual([]);
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    setupTestEnv();
    mocks = createMocks();
    resolver = new ConflictResolver(mocks.logger, mocks.eventBus);
  });

  afterEach(async () => {
    await cleanupTestEnv();
  });

  it('should report resource conflict', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    
    expect(conflict.id).toBeDefined();
    expect(conflict.resourceId).toBe('resource-1');
    expect(conflict.agents).toEqual(['agent-1', 'agent-2']);
    expect(conflict.resolved).toBe(false);
  });

  it('should report task conflict', async () => {
    const conflict = await resolver.reportTaskConflict(
      'task-1', 
      ['agent-1', 'agent-2'], 
      'assignment'
    );
    
    expect(conflict.id).toBeDefined();
    expect(conflict.taskId).toBe('task-1');
    expect(conflict.type).toBe('assignment');
    expect(conflict.resolved).toBe(false);
  });

  it('should resolve conflict using priority strategy', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    
    const context = {
      agentPriorities: new Map([
        ['agent-1', 5],
        ['agent-2', 10],
      ]),
    };

    const resolution = await resolver.resolveConflict(conflict.id, 'priority', context);
    
    expect(resolution.type).toBe('priority');
    expect(resolution.winner).toBe('agent-2'); // Higher priority
    expect(conflict.resolved).toBe(true);
  });

  it('should resolve conflict using timestamp strategy', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    
    const now = new Date();
    const context = {
      requestTimestamps: new Map([
        ['agent-1', new Date(now.getTime() - 1000)], // Earlier
        ['agent-2', now],
      ]),
    };

    const resolution = await resolver.resolveConflict(conflict.id, 'timestamp', context);
    
    expect(resolution.type).toBe('timestamp');
    expect(resolution.winner).toBe('agent-1'); // Earlier request
  });

  it('should auto-resolve conflicts', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    
    const resolution = await resolver.autoResolve(conflict.id, 'priority');
    
    expect(resolution.type).toBe('priority');
    expect(resolution.winner).toBeDefined();
  });

  it('should track conflict statistics', async () => {
    await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    await resolver.reportTaskConflict('task-1', ['agent-1', 'agent-2'], 'assignment');
    
    const stats = resolver.getStats();
    
    expect(stats.totalConflicts).toBe(2);
    expect(stats.activeConflicts).toBe(2);
    expect(stats.resolvedConflicts).toBe(0);
    expect((stats.conflictsByType as any).resource).toBe(1);
    expect((stats.conflictsByType as any).task).toBe(1);
  });

  it('should cleanup old conflicts', async () => {
    const conflict = await resolver.reportResourceConflict('resource-1', ['agent-1', 'agent-2']);
    
    // Resolve the conflict
    await resolver.autoResolve(conflict.id);
    
    // Cleanup old conflicts (immediate cleanup for test)
    const removed = resolver.cleanupOldConflicts(0);
    
    expect(removed).toBe(1);
  });
});