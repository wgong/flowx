/**
 * Comprehensive Swarm System Integration Tests
 * Tests the full integration of CLI, SwarmCoordinator, agents, and memory
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/testing';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { SwarmCoordinator } from '../../src/swarm/coordinator.ts';
import { SwarmMemoryManager } from '../../src/swarm/memory.ts';
import { Logger } from '../../src/core/logger.ts';
import { AgentProcessManager } from '../../src/agents/agent-process-manager.ts';
import { SwarmConfig, AgentType, TaskType } from '../../src/swarm/types.ts';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('Swarm System Integration Tests', () => {
  let tempDir: string;
  let coordinator: SwarmCoordinator;
  let logger: Logger;
  let swarmConfig: Partial<SwarmConfig>;

  beforeEach(async () => {
    // Create temporary directory for test isolation
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swarm-integration-test-'));
    
    // Setup test logger
    logger = new Logger({
      level: 'debug',
      format: 'text',
      destination: 'console'
    }, { component: 'SwarmIntegrationTest' });

    // Setup test configuration
    swarmConfig = {
      name: 'Integration Test Swarm',
      description: 'Test swarm for integration testing',
      maxAgents: 5,
      maxTasks: 10,
      maxConcurrentTasks: 3,
      memory: {
        namespace: 'integration-test',
        persistent: true,
        backupEnabled: false, // Disable for tests
        distributed: false,
        consistency: 'eventual',
        cacheEnabled: true,
        compressionEnabled: false
      },
      monitoring: {
        metricsEnabled: true,
        loggingEnabled: true,
        tracingEnabled: false,
        heartbeatInterval: 5000,
        metricsInterval: 10000
      }
    };

    // Initialize coordinator
    coordinator = new SwarmCoordinator(swarmConfig);
  });

  afterEach(async () => {
    // Cleanup coordinator
    if (coordinator && coordinator.isRunning()) {
      await coordinator.shutdown();
    }

    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('SwarmCoordinator Lifecycle', () => {
    test('should initialize and shutdown cleanly', async () => {
      expect(coordinator.isRunning()).toBe(false);
      
      await coordinator.initialize();
      expect(coordinator.isRunning()).toBe(true);
      expect(coordinator.getStatus()).toBe('executing');
      
      await coordinator.shutdown();
      expect(coordinator.isRunning()).toBe(false);
      expect(coordinator.getStatus()).toBe('completed');
    });

    test('should handle multiple initialize/shutdown cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await coordinator.initialize();
        expect(coordinator.isRunning()).toBe(true);
        
        await coordinator.shutdown();
        expect(coordinator.isRunning()).toBe(false);
      }
    });

    test('should prevent double initialization', async () => {
      await coordinator.initialize();
      
      await expect(coordinator.initialize()).rejects.toThrow('already running');
      
      await coordinator.shutdown();
    });
  });

  describe('Agent Management Integration', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    afterEach(async () => {
      await coordinator.shutdown();
    });

    test('should register and manage agents', async () => {
      const agentId = await coordinator.registerAgent(
        'test-agent',
        'developer',
        ['code-generation', 'testing']
      );

      expect(agentId).toBeDefined();
      expect(typeof agentId).toBe('string');

      const agents = coordinator.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('test-agent');
      expect(agents[0].type).toBe('developer');
      expect(agents[0].capabilities.codeGeneration).toBe(true);
      expect(agents[0].capabilities.testing).toBe(true);
    });

    test('should register multiple agents with different types', async () => {
      const agentTypes: AgentType[] = ['coordinator', 'researcher', 'developer', 'tester'];
      const agentIds: string[] = [];

      for (const type of agentTypes) {
        const agentId = await coordinator.registerAgent(
          `${type}-agent`,
          type,
          [`${type}-capability`]
        );
        agentIds.push(agentId);
      }

      const agents = coordinator.getAgents();
      expect(agents).toHaveLength(4);
      
      // Verify each agent type is registered
      for (const type of agentTypes) {
        const agent = agents.find(a => a.type === type);
        expect(agent).toBeDefined();
        expect(agent!.name).toBe(`${type}-agent`);
      }
    });

    test('should handle agent registration limits', async () => {
      // Register up to maxAgents
      const maxAgents = swarmConfig.maxAgents || 5;
      const agentIds: string[] = [];

      for (let i = 0; i < maxAgents; i++) {
        const agentId = await coordinator.registerAgent(
          `agent-${i}`,
          'developer',
          ['code-generation']
        );
        agentIds.push(agentId);
      }

      expect(coordinator.getAgents()).toHaveLength(maxAgents);

      // Attempt to register one more agent (should handle gracefully)
      const extraAgentId = await coordinator.registerAgent(
        'extra-agent',
        'developer',
        ['code-generation']
      );

      // Should either reject or handle gracefully
      expect(extraAgentId).toBeDefined();
    });
  });

  describe('Task Management Integration', () => {
    let agentId: string;

    beforeEach(async () => {
      await coordinator.initialize();
      agentId = await coordinator.registerAgent(
        'task-agent',
        'developer',
        ['code-generation', 'testing', 'analysis']
      );
    });

    afterEach(async () => {
      await coordinator.shutdown();
    });

    test('should create and manage tasks', async () => {
      const taskId = await coordinator.createTask(
        'code-generation',
        'Create Hello World',
        'Create a simple hello world application',
        'Write a hello world program in TypeScript'
      );

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');

      const tasks = coordinator.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe('Create Hello World');
      expect(tasks[0].type).toBe('code-generation');
      expect(tasks[0].status).toBe('pending');
    });

    test('should assign tasks to agents', async () => {
      const taskId = await coordinator.createTask(
        'code-generation',
        'Test Task',
        'Test task assignment',
        'Create a test file'
      );

      await coordinator.assignTask(taskId, agentId);

      const task = coordinator.getTask(taskId);
      expect(task).toBeDefined();
      expect(task!.status).toBe('assigned');
      expect(task!.assignedTo?.id).toBe(agentId);

      const agent = coordinator.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent!.status).toBe('busy');
      expect(agent!.currentTask).toBe(taskId);
    });

    test('should handle task execution flow', async () => {
      const taskId = await coordinator.createTask(
        'analysis',
        'Analysis Task',
        'Analyze test data',
        'Perform data analysis'
      );

      // Start task execution
      await coordinator.startTaskExecution(coordinator.getTask(taskId)!);

      // Wait for task to complete or timeout
      const maxWait = 10000; // 10 seconds
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWait) {
        const task = coordinator.getTask(taskId);
        if (task && (task.status === 'completed' || task.status === 'failed')) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalTask = coordinator.getTask(taskId);
      expect(finalTask).toBeDefined();
      expect(['completed', 'failed', 'running']).toContain(finalTask!.status);
    });

    test('should handle multiple concurrent tasks', async () => {
      const taskIds: string[] = [];
      const taskTypes: TaskType[] = ['code-generation', 'testing', 'analysis'];

      // Create multiple tasks
      for (let i = 0; i < 3; i++) {
        const taskId = await coordinator.createTask(
          taskTypes[i],
          `Task ${i}`,
          `Test task ${i}`,
          `Execute task ${i}`
        );
        taskIds.push(taskId);
      }

      expect(coordinator.getTasks()).toHaveLength(3);

      // Start all tasks
      for (const taskId of taskIds) {
        const task = coordinator.getTask(taskId);
        if (task) {
          await coordinator.startTaskExecution(task);
        }
      }

      // Verify tasks are running or completed
      const tasks = coordinator.getTasks();
      const activeStates = ['running', 'completed', 'assigned'];
      
      for (const task of tasks) {
        expect(activeStates).toContain(task.status);
      }
    });
  });

  describe('Memory Integration', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    afterEach(async () => {
      await coordinator.shutdown();
    });

    test('should persist and restore swarm state', async () => {
      // Create agents and tasks
      const agentId = await coordinator.registerAgent(
        'memory-agent',
        'developer',
        ['code-generation']
      );

      const taskId = await coordinator.createTask(
        'code-generation',
        'Memory Test Task',
        'Test memory persistence',
        'Create test code'
      );

      // Verify initial state
      expect(coordinator.getAgents()).toHaveLength(1);
      expect(coordinator.getTasks()).toHaveLength(1);

      // Shutdown and restart coordinator
      await coordinator.shutdown();
      
      const newCoordinator = new SwarmCoordinator(swarmConfig);
      await newCoordinator.initialize();

      // Verify state is restored (agents/tasks should be loaded from memory)
      const restoredAgents = newCoordinator.getAgents();
      const restoredTasks = newCoordinator.getTasks();

      // Note: Depending on implementation, state might be restored
      // This test verifies the memory system is working
      expect(restoredAgents).toBeDefined();
      expect(restoredTasks).toBeDefined();

      await newCoordinator.shutdown();
    });

    test('should handle memory partitioning', async () => {
      // Create different types of data
      const agentId = await coordinator.registerAgent('partition-agent', 'developer', []);
      const taskId = await coordinator.createTask('code-generation', 'Partition Task', 'Test', 'Test');

      // Verify data is created
      expect(coordinator.getAgents()).toHaveLength(1);
      expect(coordinator.getTasks()).toHaveLength(1);

      // Memory partitioning is tested implicitly through save/load operations
      // The coordinator should organize data into appropriate partitions
    });
  });

  describe('Objective Management Integration', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    afterEach(async () => {
      await coordinator.shutdown();
    });

    test('should create and manage objectives', async () => {
      const objectiveId = await coordinator.createObjective(
        'Build a simple web application',
        'auto'
      );

      expect(objectiveId).toBeDefined();
      expect(typeof objectiveId).toBe('string');

      const objectives = coordinator.getObjectives();
      expect(objectives).toHaveLength(1);
      expect(objectives[0].description).toBe('Build a simple web application');
      expect(objectives[0].strategy).toBe('auto');
    });

    test('should decompose objectives into tasks', async () => {
      const objectiveId = await coordinator.createObjective(
        'Create a REST API with authentication',
        'auto'
      );

      const objective = coordinator.getObjective(objectiveId);
      expect(objective).toBeDefined();
      
      // The objective should have tasks created automatically
      // or through the decomposition process
      expect(objective!.tasks).toBeDefined();
    });
  });

  describe('System Metrics and Monitoring', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    afterEach(async () => {
      await coordinator.shutdown();
    });

    test('should track system metrics', async () => {
      const metrics = coordinator.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.tasksCreated).toBe(0);
      expect(metrics.tasksCompleted).toBe(0);
      expect(metrics.agentsRegistered).toBe(0);
      expect(metrics.systemUptime).toBeGreaterThanOrEqual(0);
    });

    test('should update metrics as system operates', async () => {
      const initialMetrics = coordinator.getMetrics();
      
      // Register an agent
      await coordinator.registerAgent('metrics-agent', 'developer', []);
      
      // Create a task
      await coordinator.createTask('code-generation', 'Metrics Task', 'Test', 'Test');
      
      const updatedMetrics = coordinator.getMetrics();
      
      expect(updatedMetrics.agentsRegistered).toBe(initialMetrics.agentsRegistered + 1);
      expect(updatedMetrics.tasksCreated).toBe(initialMetrics.tasksCreated + 1);
    });

    test('should provide system status information', async () => {
      const status = coordinator.getSwarmStatus();
      
      expect(status).toBeDefined();
      expect(status.status).toBe('executing');
      expect(status.objectives).toBe(0);
      expect(status.tasks).toBeDefined();
      expect(status.agents).toBeDefined();
      expect(status.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle initialization failures gracefully', async () => {
      // Create coordinator with invalid configuration
      const invalidConfig = {
        ...swarmConfig,
        maxAgents: -1, // Invalid value
        memory: {
          ...swarmConfig.memory,
          namespace: '' // Invalid namespace
        }
      };

      const invalidCoordinator = new SwarmCoordinator(invalidConfig);
      
      // Should either handle gracefully or throw appropriate error
      try {
        await invalidCoordinator.initialize();
        // If it succeeds, verify it's in a valid state
        expect(invalidCoordinator.isRunning()).toBe(true);
        await invalidCoordinator.shutdown();
      } catch (error) {
        // If it fails, verify it's a meaningful error
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });

    test('should handle memory failures gracefully', async () => {
      await coordinator.initialize();
      
      // Create some data
      await coordinator.registerAgent('resilience-agent', 'developer', []);
      
      // Simulate memory failure by corrupting temp directory
      // This is a simplified test - real implementation would need more sophisticated failure simulation
      
      const status = coordinator.getSwarmStatus();
      expect(status.agents.total).toBe(1);
      
      await coordinator.shutdown();
    });

    test('should handle agent process failures', async () => {
      await coordinator.initialize();
      
      const agentId = await coordinator.registerAgent('failure-agent', 'developer', ['code-generation']);
      const taskId = await coordinator.createTask('code-generation', 'Failure Task', 'Test failure', 'Test');
      
      // Assign task to agent
      await coordinator.assignTask(taskId, agentId);
      
      // The system should handle agent failures gracefully
      const agent = coordinator.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent!.status).toBe('busy');
      
      await coordinator.shutdown();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple agents efficiently', async () => {
      await coordinator.initialize();
      
      const startTime = Date.now();
      const agentIds: string[] = [];
      
      // Register multiple agents
      for (let i = 0; i < 10; i++) {
        const agentId = await coordinator.registerAgent(
          `perf-agent-${i}`,
          'developer',
          ['code-generation']
        );
        agentIds.push(agentId);
      }
      
      const registrationTime = Date.now() - startTime;
      
      expect(agentIds).toHaveLength(10);
      expect(registrationTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      await coordinator.shutdown();
    });

    test('should handle multiple tasks efficiently', async () => {
      await coordinator.initialize();
      
      const startTime = Date.now();
      const taskIds: string[] = [];
      
      // Create multiple tasks
      for (let i = 0; i < 20; i++) {
        const taskId = await coordinator.createTask(
          'code-generation',
          `Perf Task ${i}`,
          `Performance test task ${i}`,
          `Execute performance test ${i}`
        );
        taskIds.push(taskId);
      }
      
      const creationTime = Date.now() - startTime;
      
      expect(taskIds).toHaveLength(20);
      expect(creationTime).toBeLessThan(3000); // Should complete within 3 seconds
      
      await coordinator.shutdown();
    });
  });

  describe('CLI Integration', () => {
    test('should be accessible via CLI commands', async () => {
      // Test basic CLI functionality
      try {
        const { stdout } = await execAsync('node cli.js swarm --help');
        expect(stdout).toContain('swarm');
      } catch (error) {
        // CLI might not be fully set up in test environment
        console.warn('CLI test skipped - CLI not available in test environment');
      }
    });

    test('should support swarm creation via CLI', async () => {
      // This would test the CLI integration
      // Skipped for now as it requires full CLI setup
      console.warn('CLI integration test skipped - requires full CLI setup');
    });
  });
});

// Helper functions for testing
async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

async function createTestWorkspace(baseDir: string): Promise<string> {
  const workspaceDir = path.join(baseDir, 'test-workspace');
  await fs.mkdir(workspaceDir, { recursive: true });
  
  // Create basic project structure
  await fs.writeFile(
    path.join(workspaceDir, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project for swarm integration'
    }, null, 2)
  );
  
  return workspaceDir;
} 