/**
 * Integration tests for memory manager and swarm coordinator
 * Tests the interaction between memory management and swarm coordination
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { MemoryManager } from '../../src/memory/manager.js';
import { SwarmCoordinator } from '../../src/swarm/coordinator.js';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Memory-Swarm Integration', () => {
  let eventBus;
  let logger;
  let memoryManager;
  let swarmCoordinator;
  let tempDir;
  
  beforeEach(async () => {
    // Create temporary test directory
    tempDir = path.join(os.tmpdir(), `claude-flow-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Set up components
    eventBus = new EventBus();
    logger = new Logger(
      {
        level: 'info',
        format: 'json',
        destination: 'console',
      },
      { component: 'integration-test' }
    );
    
    // Create memory manager with SQLite backend
    const dbPath = path.join(tempDir, 'test-memory.db');
    memoryManager = new MemoryManager(
      {
        backend: 'sqlite',
        sqlitePath: dbPath,
        cacheSizeMB: 16,
        syncInterval: 1000,
        retentionDays: 30,
      },
      eventBus,
      logger
    );
    
    // Initialize memory manager
    await memoryManager.initialize();
    
    // Create swarm coordinator
    swarmCoordinator = new SwarmCoordinator({
      name: 'Test Swarm',
      description: 'Integration test swarm',
      maxAgents: 5,
      maxTasks: 20,
      maxConcurrentTasks: 3,
    });
    
    // Initialize swarm coordinator
    await swarmCoordinator.initialize();
  });
  
  afterEach(async () => {
    // Shutdown components
    if (swarmCoordinator) {
      await swarmCoordinator.stop();
    }
    
    if (memoryManager) {
      await memoryManager.shutdown();
    }
    
    // Clean up test directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to clean up test directory: ${error.message}`);
    }
  });
  
  test('should store and retrieve swarm objective in memory', async () => {
    // Create a swarm objective
    const objectiveDescription = 'Test objective for memory integration';
    const objectiveId = await swarmCoordinator.createObjective(objectiveDescription, 'development');
    
    // Store objective details in memory
    const memoryEntry = {
      id: `objective:${objectiveId}`,
      agentId: 'integration-test',
      sessionId: 'test-session',
      type: 'artifact',
      content: JSON.stringify({
        id: objectiveId,
        description: objectiveDescription,
        status: 'active',
        createdAt: new Date().toISOString(),
      }),
      context: {
        objectiveId,
        type: 'swarm-objective',
      },
      timestamp: new Date(),
      tags: ['swarm', 'objective', 'integration-test'],
      version: 1,
      metadata: {
        source: 'integration-test',
      },
    };
    
    await memoryManager.store(memoryEntry);
    
    // Retrieve the objective from memory
    const retrievedEntry = await memoryManager.retrieve(`objective:${objectiveId}`);
    
    // Verify the retrieved entry
    expect(retrievedEntry).toBeDefined();
    expect(retrievedEntry.id).toBe(`objective:${objectiveId}`);
    
    // Parse the content
    const parsedContent = JSON.parse(retrievedEntry.content);
    expect(parsedContent.id).toBe(objectiveId);
    expect(parsedContent.description).toBe(objectiveDescription);
  });
  
  test('should store swarm agent registrations in memory', async () => {
    // Register agents with swarm coordinator
    const agent1Id = await swarmCoordinator.registerAgent('test-agent-1', 'developer', ['code-generation']);
    const agent2Id = await swarmCoordinator.registerAgent('test-agent-2', 'researcher', ['research']);
    
    // Store agent registrations in memory
    for (const agentId of [agent1Id, agent2Id]) {
      const agent = swarmCoordinator.getAgent(agentId);
      
      const memoryEntry = {
        id: `agent:${agentId}`,
        agentId: 'system',
        sessionId: 'test-session',
        type: 'artifact',
        content: JSON.stringify(agent),
        context: {
          agentId,
          type: 'agent-registration',
        },
        timestamp: new Date(),
        tags: ['swarm', 'agent', agent.type],
        version: 1,
        metadata: {
          source: 'integration-test',
        },
      };
      
      await memoryManager.store(memoryEntry);
    }
    
    // Query for all agent registrations
    const agentEntries = await memoryManager.query({
      search: 'agent:',
    });
    
    // Verify we can find both agents
    expect(agentEntries.length).toBe(2);
    
    // Check agent types are correct
    const agentTypes = agentEntries.map(entry => JSON.parse(entry.content).type);
    expect(agentTypes).toContain('developer');
    expect(agentTypes).toContain('researcher');
  });
  
  test('should track task execution through memory and swarm', async () => {
    // Create an objective
    const objectiveId = await swarmCoordinator.createObjective('Integration test objective', 'development');
    
    // Create a task in the swarm
    const taskDefinition = {
      type: 'development',
      description: 'Test task for memory-swarm integration',
      priority: 80,
      dependencies: [],
      resourceRequirements: [],
      tags: ['test', 'integration'],
    };
    
    // Mock task execution listener
    const taskCompletedListener = jest.fn();
    swarmCoordinator.on('task:completed', taskCompletedListener);
    
    // Register a test agent
    const agentId = await swarmCoordinator.registerAgent('memory-test-agent', 'developer', ['code-generation']);
    
    // Create a task
    const task = await swarmCoordinator.createTask(taskDefinition);
    const taskId = task.id;
    
    // Store task in memory
    const taskMemoryEntry = {
      id: `task:${taskId}`,
      agentId: 'system',
      sessionId: 'test-session',
      type: 'artifact',
      content: JSON.stringify(task),
      context: {
        taskId,
        objectiveId,
        type: 'task-definition',
      },
      timestamp: new Date(),
      tags: ['swarm', 'task', taskDefinition.type],
      version: 1,
      metadata: {
        source: 'integration-test',
      },
    };
    
    await memoryManager.store(taskMemoryEntry);
    
    // Simulate task execution and completion
    const taskResult = {
      output: 'Test task completed successfully',
      files: [
        {
          path: 'test-output.txt',
          content: 'Test output content',
        },
      ],
      metrics: {
        executionTime: 1234,
        memoryUsage: 1024,
      },
    };
    
    // Simulate task completion
    swarmCoordinator.emit('task:completed', { taskId, agentId, result: taskResult });
    
    // Store task result in memory
    const resultMemoryEntry = {
      id: `task-result:${taskId}`,
      agentId,
      sessionId: 'test-session',
      type: 'artifact',
      content: JSON.stringify(taskResult),
      context: {
        taskId,
        objectiveId,
        type: 'task-result',
      },
      timestamp: new Date(),
      tags: ['swarm', 'result', taskDefinition.type],
      version: 1,
      metadata: {
        source: 'integration-test',
        executionTime: taskResult.metrics.executionTime,
      },
    };
    
    await memoryManager.store(resultMemoryEntry);
    
    // Verify task listener was called
    expect(taskCompletedListener).toHaveBeenCalled();
    
    // Query for task results
    const taskResults = await memoryManager.query({
      search: 'task-result:',
    });
    
    // Verify we can find the task result
    expect(taskResults.length).toBe(1);
    const parsedResult = JSON.parse(taskResults[0].content);
    expect(parsedResult.output).toBe('Test task completed successfully');
    expect(parsedResult.files).toHaveLength(1);
  });
  
  test('should handle memory queries for swarm status', async () => {
    // Create a swarm objective
    const objectiveId = await swarmCoordinator.createObjective('Status monitoring objective', 'monitoring');
    
    // Get swarm status
    const swarmStatus = swarmCoordinator.getSwarmStatus();
    
    // Store swarm status in memory
    const statusEntry = {
      id: `swarm-status:${Date.now()}`,
      agentId: 'system',
      sessionId: 'test-session',
      type: 'observation',
      content: JSON.stringify(swarmStatus),
      context: {
        type: 'swarm-status',
      },
      timestamp: new Date(),
      tags: ['swarm', 'status', swarmStatus.status],
      version: 1,
      metadata: {
        source: 'integration-test',
      },
    };
    
    await memoryManager.store(statusEntry);
    
    // Create multiple status entries to test history
    for (let i = 0; i < 3; i++) {
      const mockStatus = {
        ...swarmStatus,
        tasks: {
          ...swarmStatus.tasks,
          completed: i,
        },
      };
      
      await memoryManager.store({
        ...statusEntry,
        id: `swarm-status:${Date.now() + i + 1}`,
        content: JSON.stringify(mockStatus),
        timestamp: new Date(Date.now() + i * 1000),
      });
      
      // Add small delay
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Query for status history
    const statusHistory = await memoryManager.query({
      search: 'swarm-status:',
      limit: 10,
    });
    
    // Verify we have the expected number of status entries
    expect(statusHistory.length).toBe(4);
    
    // Verify status entries are ordered by timestamp
    const timestamps = statusHistory.map(entry => entry.timestamp.getTime());
    const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sortedTimestamps);
  });
});