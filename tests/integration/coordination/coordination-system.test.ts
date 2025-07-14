import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BackgroundExecutor, BackgroundTaskConfig } from '../../../src/coordination/background-executor.ts';
import { HiveOrchestrator, HiveOrchestratorConfig } from '../../../src/coordination/hive-orchestrator.ts';
import { LoadBalancer, LoadBalancerConfig } from '../../../src/coordination/load-balancer.ts';
import { TaskOrchestrator, TaskOrchestratorConfig } from '../../../src/coordination/task-orchestrator.ts';
import { TaskCoordinator, CoordinationConfig } from '../../../src/coordination/task-coordinator.ts';
import { ILogger } from '../../../src/core/logger.ts';
import { IEventBus } from '../../../src/core/event-bus.ts';
import { EventEmitter } from 'node:events';
import { TaskDefinition, AgentState, TaskId, AgentId } from '../../../src/swarm/types.ts';

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

// Helper function to create mock task
function createMockTask(id: string, type: string = 'coding'): TaskDefinition {
  const taskId: TaskId = {
    id,
    swarmId: 'test-swarm',
    sequence: 1,
    priority: 1
  };

  return {
    id: taskId,
    type: type as any,
    name: 'Test Task',
    description: 'Test task description',
    requirements: {
      capabilities: ['coding'],
      tools: [],
      permissions: []
    },
    constraints: {
      dependencies: [],
      dependents: [],
      conflicts: []
    },
    priority: 'normal',
    input: { test: 'data' },
    instructions: 'Test instructions',
    context: {},
    status: 'created',
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: [],
    statusHistory: []
  };
}

// Helper function to create mock agent
function createMockAgent(id: string): AgentState {
  const agentId: AgentId = {
    id,
    swarmId: 'test-swarm',
    type: 'developer',
    instance: 1
  };

  return {
    id: agentId,
    name: 'Test Agent',
    type: 'developer',
    status: 'idle',
    capabilities: {
      codeGeneration: true,
      codeReview: true,
      testing: true,
      documentation: true,
      research: true,
      analysis: true,
      webSearch: false,
      apiIntegration: false,
      fileSystem: true,
      terminalAccess: true,
      languages: ['typescript', 'javascript'],
      frameworks: ['react', 'node'],
      domains: ['web'],
      tools: ['git', 'npm'],
      maxConcurrentTasks: 5,
      maxMemoryUsage: 1024,
      maxExecutionTime: 300000,
      reliability: 0.95,
      speed: 0.8,
      quality: 0.9
    },
    metrics: {
      tasksCompleted: 10,
      tasksFailed: 1,
      averageExecutionTime: 5000,
      successRate: 0.9,
      cpuUsage: 50,
      memoryUsage: 512,
      diskUsage: 100,
      networkUsage: 10,
      codeQuality: 0.85,
      testCoverage: 0.8,
      bugRate: 0.05,
      userSatisfaction: 0.9,
      totalUptime: 86400,
      lastActivity: new Date(),
      responseTime: 1000
    },
    workload: 0.3,
    health: 0.95,
    config: {
      autonomyLevel: 0.8,
      learningEnabled: true,
      adaptationEnabled: true,
      maxTasksPerHour: 10,
      maxConcurrentTasks: 3,
      timeoutThreshold: 30000,
      reportingInterval: 5000,
      heartbeatInterval: 1000,
      permissions: ['read', 'write', 'execute'],
      trustedAgents: [],
      expertise: { coding: 0.9, testing: 0.8 },
      preferences: {}
    },
    environment: {
      runtime: 'deno',
      version: '1.40.0',
      workingDirectory: '/tmp/test',
      tempDirectory: '/tmp',
      logDirectory: '/tmp/logs',
      apiEndpoints: {},
      credentials: {},
      availableTools: ['git', 'npm'],
      toolConfigs: {}
    },
    endpoints: ['http://localhost:3000'],
    lastHeartbeat: new Date(),
    taskHistory: [],
    errorHistory: [],
    childAgents: [],
    collaborators: []
  };
}

describe('Coordination System Integration', () => {
  let mockLogger: MockLogger;
  let mockEventBus: MockEventBus;
  let backgroundExecutor: BackgroundExecutor;
  let hiveOrchestrator: HiveOrchestrator;
  let loadBalancer: LoadBalancer;
  let taskOrchestrator: TaskOrchestrator;
  let taskCoordinator: TaskCoordinator;

  beforeEach(async () => {
    mockLogger = new MockLogger();
    mockEventBus = new MockEventBus();

    // Create configuration objects
    const backgroundConfig: BackgroundTaskConfig = {
      maxConcurrentTasks: 3,
      taskTimeout: 10000,
      retryAttempts: 2,
      retryBackoffBase: 1000,
      persistenceDir: './test-persistence',
      healthCheckInterval: 5000,
      processCleanupInterval: 10000,
      maxQueueSize: 50,
      enablePersistence: false
    };

    const hiveConfig: HiveOrchestratorConfig = {
      maxConcurrentTasks: 5,
      taskTimeout: 15000,
      consensusThreshold: 0.6,
      topologyUpdateInterval: 10000,
      decompositionStrategies: ['parallel', 'sequential'],
      coordinationStrategies: ['centralized'],
      enableConsensus: false,
      enableTopologyAwareness: true,
      maxDecompositionDepth: 3,
      agentSpecializationWeight: 0.7
    };

    const loadBalancerConfig: LoadBalancerConfig = {
      strategy: 'hybrid',
      adaptiveThresholds: true,
      predictiveModeling: false,
      healthCheckInterval: 5000,
      rebalanceInterval: 10000,
      maxLoadThreshold: 0.8,
      minLoadThreshold: 0.2,
      responseTimeThreshold: 5000,
      errorRateThreshold: 0.1,
      capacityBuffer: 0.2,
      learningRate: 0.1,
      predictionWindow: 30000,
      enableMetrics: true
    };

    const taskOrchestratorConfig: TaskOrchestratorConfig = {
      maxConcurrentWorkflows: 3,
      maxWorkflowDepth: 5,
      defaultTimeout: 30000,
      retryAttempts: 2,
      enableCheckpointing: false,
      checkpointInterval: 10000,
      enableRecovery: false,
      enableMetrics: true,
      workflowStrategies: ['sequential', 'parallel'],
      dependencyResolution: 'strict'
    };

    const coordinationConfig: CoordinationConfig = {
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

    // Initialize components
    backgroundExecutor = new BackgroundExecutor(backgroundConfig, mockLogger, mockEventBus);
    loadBalancer = new LoadBalancer(loadBalancerConfig, mockLogger, mockEventBus);
    hiveOrchestrator = new HiveOrchestrator(hiveConfig, mockLogger, mockEventBus, backgroundExecutor);
    taskOrchestrator = new TaskOrchestrator(
      taskOrchestratorConfig,
      mockLogger,
      mockEventBus,
      backgroundExecutor,
      hiveOrchestrator,
      loadBalancer
    );
    taskCoordinator = new TaskCoordinator(coordinationConfig, mockEventBus, mockLogger);

    // Initialize all components
    await backgroundExecutor.initialize();
    await loadBalancer.initialize();
    await hiveOrchestrator.initialize();
    await taskOrchestrator.initialize();
    await taskCoordinator.initialize();
  });

  afterEach(async () => {
    // Shutdown all components in reverse order
    await taskCoordinator.shutdown();
    await taskOrchestrator.shutdown();
    await hiveOrchestrator.shutdown();
    await loadBalancer.shutdown();
    await backgroundExecutor.shutdown();
  });

  describe('Component Integration', () => {
    it('should initialize all components successfully', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('BackgroundExecutor initialized successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('LoadBalancer initialized successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('HiveOrchestrator initialized successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('TaskOrchestrator initialized successfully');
    });

    it('should handle component shutdown gracefully', async () => {
      await taskCoordinator.shutdown();
      await taskOrchestrator.shutdown();
      await hiveOrchestrator.shutdown();
      await loadBalancer.shutdown();
      await backgroundExecutor.shutdown();

      expect(mockLogger.info).toHaveBeenCalledWith('BackgroundExecutor shutdown complete');
      expect(mockLogger.info).toHaveBeenCalledWith('LoadBalancer shutdown complete');
      expect(mockLogger.info).toHaveBeenCalledWith('HiveOrchestrator shutdown complete');
      expect(mockLogger.info).toHaveBeenCalledWith('TaskOrchestrator shutdown complete');
    });
  });

  describe('Agent Management', () => {
    it('should register agents across all components', () => {
      const agent = createMockAgent('test-agent-1');

      // Register agent with load balancer
      loadBalancer.registerAgent(agent);

      // Verify agent is registered
      const agentLoad = loadBalancer.getAgentLoad('test-agent-1');
      expect(agentLoad).toBeDefined();
      expect(agentLoad?.agentId).toBe('test-agent-1');
    });

    it('should handle agent updates across components', () => {
      const agent = createMockAgent('test-agent-2');
      
      // Register and update agent
      loadBalancer.registerAgent(agent);
      
      // Update agent capabilities
      agent.capabilities.maxConcurrentTasks = 10;
      loadBalancer.updateAgent(agent);

      const agentLoad = loadBalancer.getAgentLoad('test-agent-2');
      expect(agentLoad?.maxCapacity).toBe(10);
    });

    it('should unregister agents properly', () => {
      const agent = createMockAgent('test-agent-3');
      
      loadBalancer.registerAgent(agent);
      expect(loadBalancer.getAgentLoad('test-agent-3')).toBeDefined();

      loadBalancer.unregisterAgent('test-agent-3');
      expect(loadBalancer.getAgentLoad('test-agent-3')).toBeUndefined();
    });
  });

  describe('Task Processing Flow', () => {
    it('should process a simple task through the coordination system', async () => {
      const agent = createMockAgent('test-agent-4');
      const task = createMockTask('test-task-1');

      // Register agent
      loadBalancer.registerAgent(agent);
      taskCoordinator.registerAgent({
        id: 'test-agent-4',
        name: 'Test Agent',
        type: 'developer',
        capabilities: ['coding'],
        status: 'idle',
        priority: 1
      });

      // Select agent for task
      const decision = await loadBalancer.selectAgent(task);
      expect(decision.selectedAgent).toBe('test-agent-4');

      // Create a simple task for coordinator
      const simpleTask = {
        id: 'test-task-1',
        type: 'coding',
        description: 'Test task description',
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date()
      };

      // Assign task
      const assignedAgentId = await taskCoordinator.assignTask(simpleTask);
      expect(assignedAgentId).toBe('test-agent-4');
    });

    it('should handle task decomposition through hive orchestrator', async () => {
      const task = createMockTask('test-task-2', 'complex-coding');

      // Decompose task
      const decompositionId = await hiveOrchestrator.decomposeTask(task, 'parallel');
      expect(decompositionId).toBeDefined();

      const decomposition = hiveOrchestrator.getDecomposition(decompositionId);
      expect(decomposition).toBeDefined();
      expect(decomposition?.subtasks.length).toBeGreaterThan(0);
    });

    it('should create and execute workflows', async () => {
      const workflowDef = {
        name: 'Test Workflow',
        description: 'A test workflow',
        strategy: 'sequential' as const,
        tasks: [],
        dependencies: [],
        conditions: [],
        loops: [],
        variables: new Map(),
        timeout: 30000,
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential' as const,
          baseDelay: 1000,
          maxDelay: 10000,
          jitter: false,
          conditions: []
        },
        checkpoints: [],
        metadata: {}
      };

      const workflowId = await taskOrchestrator.createWorkflow(workflowDef);
      expect(workflowId).toBeDefined();

      const executionId = await taskOrchestrator.executeWorkflow(workflowId);
      expect(executionId).toBeDefined();

      const execution = taskOrchestrator.getExecution(executionId);
      expect(execution).toBeDefined();
    });
  });

  describe('Load Balancing', () => {
    it('should balance load across multiple agents', async () => {
      const agent1 = createMockAgent('agent-1');
      const agent2 = createMockAgent('agent-2');
      const task1 = createMockTask('task-1');
      const task2 = createMockTask('task-2');

      // Register agents
      loadBalancer.registerAgent(agent1);
      loadBalancer.registerAgent(agent2);

      // Assign tasks and verify load balancing
      const decision1 = await loadBalancer.selectAgent(task1);
      const decision2 = await loadBalancer.selectAgent(task2);

      expect(decision1.selectedAgent).toBeDefined();
      expect(decision2.selectedAgent).toBeDefined();

      // Verify agents are being used
      const allLoads = loadBalancer.getAllAgentLoads();
      expect(allLoads.length).toBe(2);
    });

    it('should switch load balancing strategies', () => {
      loadBalancer.switchStrategy('least-loaded');
      
      const metrics = loadBalancer.getMetrics();
      expect(metrics.adaptationCount).toBe(1);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should collect metrics from all components', () => {
      const backgroundMetrics = backgroundExecutor.getMetrics();
      const hiveMetrics = hiveOrchestrator.getMetrics();
      const loadBalancerMetrics = loadBalancer.getMetrics();
      const taskOrchestratorMetrics = taskOrchestrator.getMetrics();

      expect(backgroundMetrics).toHaveProperty('totalTasks');
      expect(hiveMetrics).toHaveProperty('totalTasks');
      expect(loadBalancerMetrics).toHaveProperty('totalRequests');
      expect(taskOrchestratorMetrics).toHaveProperty('totalWorkflows');
    });

    it('should track performance across components', async () => {
      const agent = createMockAgent('perf-agent');
      const task = createMockTask('perf-task');

      loadBalancer.registerAgent(agent);

      const startTime = Date.now();
      await loadBalancer.selectAgent(task);
      const endTime = Date.now();

      const metrics = loadBalancer.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Error Handling', () => {
    it('should handle agent failures gracefully', async () => {
      const agent = createMockAgent('failing-agent');
      const task = createMockTask('failing-task');

      loadBalancer.registerAgent(agent);
      
      // Simulate agent failure by unregistering
      loadBalancer.unregisterAgent('failing-agent');

      const decision = await loadBalancer.selectAgent(task);
      expect(decision.selectedAgent).toBe('');
      expect(decision.confidence).toBe(0);
    });

    it('should handle task failures and retries', async () => {
      const task = createMockTask('retry-task');

      // Submit task to background executor
      const taskId = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['test'],
        priority: 1
      });

      // Cancel task to simulate failure
      await backgroundExecutor.cancelTask(taskId);

      const retrievedTask = backgroundExecutor.getTask(taskId);
      expect(retrievedTask?.status).toBe('cancelled');
    });
  });

  describe('Event System', () => {
    it('should propagate events between components', async () => {
      const eventSpy = jest.fn();
      mockEventBus.on('agent:selected', eventSpy);

      const agent = createMockAgent('event-agent');
      const task = createMockTask('event-task');

      loadBalancer.registerAgent(agent);
      await loadBalancer.selectAgent(task);

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should handle system shutdown events', () => {
      const shutdownSpy = jest.spyOn(backgroundExecutor, 'shutdown');
      
      mockEventBus.emit('system:shutdown');
      
      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should manage resource allocation across components', () => {
      const agent1 = createMockAgent('resource-agent-1');
      const agent2 = createMockAgent('resource-agent-2');

      loadBalancer.registerAgent(agent1);
      loadBalancer.registerAgent(agent2);

      const allLoads = loadBalancer.getAllAgentLoads();
      const totalCapacity = allLoads.reduce((sum, load) => sum + load.maxCapacity, 0);
      
      expect(totalCapacity).toBeGreaterThan(0);
    });

    it('should handle resource constraints', async () => {
      const task = createMockTask('resource-intensive-task');
      
      // Submit multiple tasks to test resource limits
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(backgroundExecutor.submitTask({
          type: 'script',
          command: 'echo',
          args: [`task-${i}`],
          priority: 1
        }));
      }

      const taskIds = await Promise.all(promises);
      expect(taskIds.length).toBe(5);

      const metrics = backgroundExecutor.getMetrics();
      expect(metrics.totalTasks).toBe(5);
    });
  });

  describe('Configuration Management', () => {
    it('should handle configuration updates', () => {
      const originalStrategy = loadBalancer.getMetrics().strategyEffectiveness;
      
      loadBalancer.switchStrategy('performance-based');
      
      const newMetrics = loadBalancer.getMetrics();
      expect(newMetrics.adaptationCount).toBeGreaterThan(0);
    });

    it('should validate configuration consistency', () => {
      // All components should be properly configured
      expect(backgroundExecutor.getMetrics()).toBeDefined();
      expect(hiveOrchestrator.getMetrics()).toBeDefined();
      expect(loadBalancer.getMetrics()).toBeDefined();
      expect(taskOrchestrator.getMetrics()).toBeDefined();
    });
  });
}); 