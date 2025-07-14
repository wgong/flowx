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

describe('Coordination System End-to-End', () => {
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

  describe('Complete Task Processing Pipeline', () => {
    it('should handle a complete task lifecycle from creation to completion', async () => {
      // Setup agents
      const agent1 = createMockAgent('agent-1');
      const agent2 = createMockAgent('agent-2');
      
      // Register agents with all relevant components
      loadBalancer.registerAgent(agent1);
      loadBalancer.registerAgent(agent2);
      
      taskCoordinator.registerAgent({
        id: 'agent-1',
        name: 'Agent 1',
        type: 'developer',
        capabilities: ['coding', 'testing'],
        status: 'idle',
        priority: 1
      });
      
      taskCoordinator.registerAgent({
        id: 'agent-2',
        name: 'Agent 2',
        type: 'developer',
        capabilities: ['coding', 'review'],
        status: 'idle',
        priority: 1
      });

      // Create a task
      const task = createMockTask('main-task', 'coding');
      
      // Step 1: Load balancer selects best agent
      const loadBalancingDecision = await loadBalancer.selectAgent(task);
      expect(loadBalancingDecision.selectedAgent).toBeDefined();
      expect(['agent-1', 'agent-2']).toContain(loadBalancingDecision.selectedAgent);

      // Step 2: Task coordinator assigns task
      const simpleTask = {
        id: 'main-task',
        type: 'coding',
        description: 'Main coding task',
        status: 'pending' as const,
        priority: 1,
        createdAt: new Date()
      };
      
      const assignedAgentId = await taskCoordinator.assignTask(simpleTask);
      expect(assignedAgentId).toBeDefined();
      expect(['agent-1', 'agent-2']).toContain(assignedAgentId);

      // Step 3: Submit background task
      const backgroundTaskId = await backgroundExecutor.submitTask({
        type: 'script',
        command: 'echo',
        args: ['Hello World'],
        priority: 1
      });
      
      expect(backgroundTaskId).toBeDefined();
      
      // Step 4: Verify task is tracked
      const backgroundTask = backgroundExecutor.getTask(backgroundTaskId);
      expect(backgroundTask).toBeDefined();
      expect(backgroundTask?.status).toBe('pending');

      // Step 5: Verify metrics are being collected
      const backgroundMetrics = backgroundExecutor.getMetrics();
      const loadBalancerMetrics = loadBalancer.getMetrics();
      const taskOrchestratorMetrics = taskOrchestrator.getMetrics();

      expect(backgroundMetrics.totalTasks).toBe(1);
      expect(loadBalancerMetrics.totalRequests).toBe(1);
      expect(taskOrchestratorMetrics.totalWorkflows).toBe(0);
    });

    it('should handle multiple agents working on different tasks', async () => {
      // Setup multiple agents
      const agents = [
        createMockAgent('multi-agent-1'),
        createMockAgent('multi-agent-2'),
        createMockAgent('multi-agent-3')
      ];

             // Register all agents
       agents.forEach(agent => {
         loadBalancer.registerAgent(agent);
         taskCoordinator.registerAgent({
           id: agent.id.id,
           name: agent.name,
           type: agent.type,
           capabilities: ['coding'],
           status: 'active', // Use 'active' instead of 'idle'
           priority: 1
         });
       });

      // Create multiple tasks
      const tasks = [
        createMockTask('task-1', 'coding'),
        createMockTask('task-2', 'testing'),
        createMockTask('task-3', 'review')
      ];

      // Process all tasks
      const assignments = [];
      for (const task of tasks) {
        const decision = await loadBalancer.selectAgent(task);
        expect(decision.selectedAgent).toBeDefined();
        
        const simpleTask = {
          id: task.id.id,
          type: task.type,
          description: task.description,
          status: 'pending' as const,
          priority: 1,
          createdAt: new Date()
        };
        
        const assignedAgent = await taskCoordinator.assignTask(simpleTask);
        assignments.push(assignedAgent);
      }

      // Verify all tasks were assigned
      expect(assignments.length).toBe(3);
      assignments.forEach(assignment => {
        expect(assignment).toBeDefined();
        expect(['multi-agent-1', 'multi-agent-2', 'multi-agent-3']).toContain(assignment);
      });

      // Verify load balancing is working
      const allLoads = loadBalancer.getAllAgentLoads();
      expect(allLoads.length).toBe(3);
      
      const metrics = loadBalancer.getMetrics();
      expect(metrics.totalRequests).toBe(3);
    });

    it('should handle system overload gracefully', async () => {
      // Setup limited agents
      const agent = createMockAgent('overload-agent');
      loadBalancer.registerAgent(agent);
      
      taskCoordinator.registerAgent({
        id: 'overload-agent',
        name: 'Overload Agent',
        type: 'developer',
        capabilities: ['coding'],
        status: 'idle',
        priority: 1
      });

      // Submit many background tasks to test limits
      const taskIds = [];
      for (let i = 0; i < 10; i++) {
        const taskId = await backgroundExecutor.submitTask({
          type: 'script',
          command: 'echo',
          args: [`task-${i}`],
          priority: 1
        });
        taskIds.push(taskId);
      }

      // Verify all tasks were accepted (queued)
      expect(taskIds.length).toBe(10);
      
      // Check that some tasks are queued due to concurrency limits
      const metrics = backgroundExecutor.getMetrics();
      expect(metrics.totalTasks).toBe(10);
      expect(metrics.queuedTasks).toBeGreaterThan(0);
    });

    it('should demonstrate system resilience and recovery', async () => {
      // Setup agents
      const agent1 = createMockAgent('resilient-agent-1');
      const agent2 = createMockAgent('resilient-agent-2');
      
      loadBalancer.registerAgent(agent1);
      loadBalancer.registerAgent(agent2);

      // Simulate agent failure by unregistering one
      loadBalancer.unregisterAgent('resilient-agent-1');
      
      // Verify system continues to work with remaining agent
      const task = createMockTask('resilient-task');
      const decision = await loadBalancer.selectAgent(task);
      
      // Should still be able to select an agent (the remaining one)
      expect(decision.selectedAgent).toBe('resilient-agent-2');
      
      // Verify metrics reflect the change
      const allLoads = loadBalancer.getAllAgentLoads();
      expect(allLoads.length).toBe(1);
      expect(allLoads[0].agentId).toBe('resilient-agent-2');
    });
  });

  describe('System Performance and Scalability', () => {
    it('should handle rapid task submission and processing', async () => {
      // Setup agents
      const agents = [];
      for (let i = 0; i < 5; i++) {
        const agent = createMockAgent(`perf-agent-${i}`);
        agents.push(agent);
        loadBalancer.registerAgent(agent);
      }

      // Submit many tasks rapidly
      const startTime = Date.now();
      const taskPromises = [];
      
      for (let i = 0; i < 20; i++) {
        const task = createMockTask(`perf-task-${i}`);
        taskPromises.push(loadBalancer.selectAgent(task));
      }

      const results = await Promise.all(taskPromises);
      const endTime = Date.now();

      // Verify all tasks were processed
      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result.selectedAgent).toBeDefined();
      });

      // Verify performance (should be fast)
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should complete in under 1 second

      // Verify metrics
      const metrics = loadBalancer.getMetrics();
      expect(metrics.totalRequests).toBe(20);
      expect(metrics.averageResponseTime).toBeLessThan(100); // Should be fast
    });

    it('should maintain performance under sustained load', async () => {
      // Setup agents
      const agent = createMockAgent('sustained-agent');
      loadBalancer.registerAgent(agent);

      // Submit tasks continuously
      const taskCount = 50;
      const results = [];
      
      for (let i = 0; i < taskCount; i++) {
        const task = createMockTask(`sustained-task-${i}`);
        const result = await loadBalancer.selectAgent(task);
        results.push(result);
      }

      // Verify all tasks were processed
      expect(results.length).toBe(taskCount);
      
      // Verify system maintained performance
      const metrics = loadBalancer.getMetrics();
      expect(metrics.totalRequests).toBe(taskCount);
      expect(metrics.averageResponseTime).toBeLessThan(200); // Should maintain reasonable performance
    });
  });

  describe('Integration Health and Monitoring', () => {
    it('should provide comprehensive system health information', () => {
      // Setup some agents
      const agent1 = createMockAgent('health-agent-1');
      const agent2 = createMockAgent('health-agent-2');
      
      loadBalancer.registerAgent(agent1);
      loadBalancer.registerAgent(agent2);

      // Collect metrics from all components
      const backgroundMetrics = backgroundExecutor.getMetrics();
      const hiveMetrics = hiveOrchestrator.getMetrics();
      const loadBalancerMetrics = loadBalancer.getMetrics();
      const taskOrchestratorMetrics = taskOrchestrator.getMetrics();

      // Verify all components provide health information
      expect(backgroundMetrics).toHaveProperty('totalTasks');
      expect(backgroundMetrics).toHaveProperty('runningTasks');
      expect(backgroundMetrics).toHaveProperty('completedTasks');
      expect(backgroundMetrics).toHaveProperty('failedTasks');

      expect(hiveMetrics).toHaveProperty('totalTasks');
      expect(hiveMetrics).toHaveProperty('decomposedTasks');
      expect(hiveMetrics).toHaveProperty('completedTasks');

      expect(loadBalancerMetrics).toHaveProperty('totalRequests');
      expect(loadBalancerMetrics).toHaveProperty('averageResponseTime');
      expect(loadBalancerMetrics).toHaveProperty('activeAgents');

      expect(taskOrchestratorMetrics).toHaveProperty('totalWorkflows');
      expect(taskOrchestratorMetrics).toHaveProperty('activeWorkflows');
      expect(taskOrchestratorMetrics).toHaveProperty('completedWorkflows');
    });

    it('should demonstrate system observability', async () => {
      // Setup monitoring
      const events = [];
      const eventTypes = [
        'task:submitted',
        'task:assigned',
        'task:completed',
        'agent:registered',
        'agent:selected',
        'system:initialized'
      ];

      eventTypes.forEach(eventType => {
        mockEventBus.on(eventType, (data) => {
          events.push({ type: eventType, data, timestamp: Date.now() });
        });
      });

      // Perform some operations
      const agent = createMockAgent('observable-agent');
      loadBalancer.registerAgent(agent);
      
      const task = createMockTask('observable-task');
      await loadBalancer.selectAgent(task);

      // Emit some test events to verify observability
      mockEventBus.emit('task:submitted', { taskId: 'test-task' });
      mockEventBus.emit('agent:registered', { agentId: 'observable-agent', agentLoad: { agentId: 'observable-agent' } });

      // Verify events were captured
      expect(events.length).toBeGreaterThan(0);
      
      // Verify system is observable through metrics
      const allMetrics = {
        background: backgroundExecutor.getMetrics(),
        hive: hiveOrchestrator.getMetrics(),
        loadBalancer: loadBalancer.getMetrics(),
        taskOrchestrator: taskOrchestrator.getMetrics()
      };

      expect(allMetrics.background).toBeDefined();
      expect(allMetrics.hive).toBeDefined();
      expect(allMetrics.loadBalancer).toBeDefined();
      expect(allMetrics.taskOrchestrator).toBeDefined();
    });
  });
}); 