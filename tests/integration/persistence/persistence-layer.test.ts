/**
 * Comprehensive Persistence Layer Tests
 * Tests to validate agent and task persistence behavior
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PersistenceManager, PersistedAgent, PersistedTask } from '../../../src/core/persistence.ts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, mkdir } from 'node:fs/promises';

describe('Persistence Layer Tests', () => {
  let persistenceManager: PersistenceManager;
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDir = join(tmpdir(), `claude-flow-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await mkdir(testDir, { recursive: true });
    
    // Initialize persistence manager with test directory
    persistenceManager = new PersistenceManager(testDir);
    await persistenceManager.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    persistenceManager.close();
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Agent Persistence', () => {
    it('should save and retrieve a single agent', async () => {
      const agent: PersistedAgent = {
        id: 'test-agent-001',
        type: 'researcher',
        name: 'Test Agent',
        status: 'active',
        capabilities: JSON.stringify(['research', 'analysis']),
        systemPrompt: 'You are a test agent',
        maxConcurrentTasks: 3,
        priority: 1,
        createdAt: Date.now()
      };

      // Save agent
      await persistenceManager.saveAgent(agent);

      // Retrieve agent
      const retrievedAgent = await persistenceManager.getAgent(agent.id);
      
      expect(retrievedAgent).not.toBeNull();
      expect(retrievedAgent!.id).toBe(agent.id);
      expect(retrievedAgent!.name).toBe(agent.name);
      expect(retrievedAgent!.type).toBe(agent.type);
      expect(retrievedAgent!.status).toBe(agent.status);
      expect(retrievedAgent!.capabilities).toBe(agent.capabilities);
    });

    it('should list all agents after saving multiple', async () => {
      const agents: PersistedAgent[] = [
        {
          id: 'agent-001',
          type: 'researcher',
          name: 'Agent 1',
          status: 'active',
          capabilities: JSON.stringify(['research']),
          systemPrompt: 'Agent 1 prompt',
          maxConcurrentTasks: 3,
          priority: 1,
          createdAt: Date.now()
        },
        {
          id: 'agent-002',
          type: 'developer',
          name: 'Agent 2',
          status: 'idle',
          capabilities: JSON.stringify(['coding']),
          systemPrompt: 'Agent 2 prompt',
          maxConcurrentTasks: 2,
          priority: 2,
          createdAt: Date.now() + 1000
        },
        {
          id: 'agent-003',
          type: 'tester',
          name: 'Agent 3',
          status: 'offline',
          capabilities: JSON.stringify(['testing']),
          systemPrompt: 'Agent 3 prompt',
          maxConcurrentTasks: 1,
          priority: 3,
          createdAt: Date.now() + 2000
        }
      ];

      // Save all agents
      for (const agent of agents) {
        await persistenceManager.saveAgent(agent);
      }

      // Retrieve all agents
      const retrievedAgents = await persistenceManager.getAllAgents();
      
      expect(retrievedAgents).toHaveLength(3);
      expect(retrievedAgents.map(a => a.id).sort()).toEqual(['agent-001', 'agent-002', 'agent-003']);
    });

    it('should only return active agents when calling getActiveAgents', async () => {
      const agents: PersistedAgent[] = [
        {
          id: 'active-agent-001',
          type: 'researcher',
          name: 'Active Agent 1',
          status: 'active',
          capabilities: JSON.stringify(['research']),
          systemPrompt: 'Active agent prompt',
          maxConcurrentTasks: 3,
          priority: 1,
          createdAt: Date.now()
        },
        {
          id: 'idle-agent-002',
          type: 'developer',
          name: 'Idle Agent 2',
          status: 'idle',
          capabilities: JSON.stringify(['coding']),
          systemPrompt: 'Idle agent prompt',
          maxConcurrentTasks: 2,
          priority: 2,
          createdAt: Date.now() + 1000
        },
        {
          id: 'offline-agent-003',
          type: 'tester',
          name: 'Offline Agent 3',
          status: 'offline',
          capabilities: JSON.stringify(['testing']),
          systemPrompt: 'Offline agent prompt',
          maxConcurrentTasks: 1,
          priority: 3,
          createdAt: Date.now() + 2000
        }
      ];

      // Save all agents
      for (const agent of agents) {
        await persistenceManager.saveAgent(agent);
      }

      // Get active agents (should include 'active' and 'idle' status)
      const activeAgents = await persistenceManager.getActiveAgents();
      
      expect(activeAgents).toHaveLength(2);
      expect(activeAgents.map(a => a.id).sort()).toEqual(['active-agent-001', 'idle-agent-002']);
    });

    it('should update agent status correctly', async () => {
      const agent: PersistedAgent = {
        id: 'status-test-agent',
        type: 'researcher',
        name: 'Status Test Agent',
        status: 'active',
        capabilities: JSON.stringify(['research']),
        systemPrompt: 'Status test prompt',
        maxConcurrentTasks: 3,
        priority: 1,
        createdAt: Date.now()
      };

      // Save agent
      await persistenceManager.saveAgent(agent);

      // Update status
      await persistenceManager.updateAgentStatus(agent.id, 'offline');

      // Retrieve and check
      const retrievedAgent = await persistenceManager.getAgent(agent.id);
      expect(retrievedAgent!.status).toBe('offline');
    });

    it('should handle non-existent agent gracefully', async () => {
      const retrievedAgent = await persistenceManager.getAgent('non-existent-agent');
      expect(retrievedAgent).toBeNull();
    });
  });

  describe('Task Persistence', () => {
    it('should save and retrieve a single task', async () => {
      const task: PersistedTask = {
        id: 'test-task-001',
        type: 'research',
        description: 'Test task description',
        status: 'pending',
        priority: 5,
        dependencies: '',
        metadata: JSON.stringify({ source: 'test', tags: ['test'] }),
        progress: 0,
        createdAt: Date.now()
      };

      // Save task
      await persistenceManager.saveTask(task);

      // Retrieve task
      const retrievedTask = await persistenceManager.getTask(task.id);
      
      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask!.id).toBe(task.id);
      expect(retrievedTask!.type).toBe(task.type);
      expect(retrievedTask!.description).toBe(task.description);
      expect(retrievedTask!.status).toBe(task.status);
      expect(retrievedTask!.priority).toBe(task.priority);
      expect(retrievedTask!.metadata).toBe(task.metadata);
    });

    it('should list active tasks after saving multiple', async () => {
      const tasks: PersistedTask[] = [
        {
          id: 'task-001',
          type: 'research',
          description: 'Research task',
          status: 'pending',
          priority: 5,
          dependencies: '',
          metadata: JSON.stringify({ source: 'test' }),
          progress: 0,
          createdAt: Date.now()
        },
        {
          id: 'task-002',
          type: 'development',
          description: 'Development task',
          status: 'in_progress',
          priority: 7,
          dependencies: '',
          metadata: JSON.stringify({ source: 'test' }),
          progress: 50,
          createdAt: Date.now() + 1000
        },
        {
          id: 'task-003',
          type: 'testing',
          description: 'Testing task',
          status: 'completed',
          priority: 3,
          dependencies: '',
          metadata: JSON.stringify({ source: 'test' }),
          progress: 100,
          createdAt: Date.now() + 2000,
          completedAt: Date.now() + 3000
        }
      ];

      // Save all tasks
      for (const task of tasks) {
        await persistenceManager.saveTask(task);
      }

      // Get active tasks (should exclude completed tasks)
      const activeTasks = await persistenceManager.getActiveTasks();
      
      expect(activeTasks).toHaveLength(2);
      expect(activeTasks.map(t => t.id).sort()).toEqual(['task-001', 'task-002']);
    });

    it('should update task status correctly', async () => {
      const task: PersistedTask = {
        id: 'status-test-task',
        type: 'research',
        description: 'Status test task',
        status: 'pending',
        priority: 5,
        dependencies: '',
        metadata: JSON.stringify({ source: 'test' }),
        progress: 0,
        createdAt: Date.now()
      };

      // Save task
      await persistenceManager.saveTask(task);

      // Update status
      await persistenceManager.updateTaskStatus(task.id, 'in_progress', 'agent-001');

      // Retrieve and check
      const retrievedTask = await persistenceManager.getTask(task.id);
      expect(retrievedTask!.status).toBe('in_progress');
      expect(retrievedTask!.assignedAgent).toBe('agent-001');
    });

    it('should handle non-existent task gracefully', async () => {
      const retrievedTask = await persistenceManager.getTask('non-existent-task');
      expect(retrievedTask).toBeNull();
    });
  });

  describe('Database Operations', () => {
    it('should persist data across database restarts', async () => {
      const agent: PersistedAgent = {
        id: 'persistent-agent',
        type: 'researcher',
        name: 'Persistent Agent',
        status: 'active',
        capabilities: JSON.stringify(['research']),
        systemPrompt: 'Persistent agent prompt',
        maxConcurrentTasks: 3,
        priority: 1,
        createdAt: Date.now()
      };

      const task: PersistedTask = {
        id: 'persistent-task',
        type: 'research',
        description: 'Persistent task',
        status: 'pending',
        priority: 5,
        dependencies: '',
        metadata: JSON.stringify({ source: 'test' }),
        progress: 0,
        createdAt: Date.now()
      };

      // Save data
      await persistenceManager.saveAgent(agent);
      await persistenceManager.saveTask(task);

      // Close and reopen database
      persistenceManager.close();
      
      const newPersistenceManager = new PersistenceManager(testDir);
      await newPersistenceManager.initialize();

      // Verify data persisted
      const retrievedAgent = await newPersistenceManager.getAgent(agent.id);
      const retrievedTask = await newPersistenceManager.getTask(task.id);

      expect(retrievedAgent).not.toBeNull();
      expect(retrievedAgent!.id).toBe(agent.id);
      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask!.id).toBe(task.id);

      newPersistenceManager.close();
    });

    it('should return correct statistics', async () => {
      const agents: PersistedAgent[] = [
        {
          id: 'stats-agent-001',
          type: 'researcher',
          name: 'Stats Agent 1',
          status: 'active',
          capabilities: JSON.stringify(['research']),
          systemPrompt: 'Stats agent prompt',
          maxConcurrentTasks: 3,
          priority: 1,
          createdAt: Date.now()
        },
        {
          id: 'stats-agent-002',
          type: 'developer',
          name: 'Stats Agent 2',
          status: 'offline',
          capabilities: JSON.stringify(['coding']),
          systemPrompt: 'Stats agent prompt',
          maxConcurrentTasks: 2,
          priority: 2,
          createdAt: Date.now() + 1000
        }
      ];

      const tasks: PersistedTask[] = [
        {
          id: 'stats-task-001',
          type: 'research',
          description: 'Stats task 1',
          status: 'pending',
          priority: 5,
          dependencies: '',
          metadata: JSON.stringify({ source: 'test' }),
          progress: 0,
          createdAt: Date.now()
        },
        {
          id: 'stats-task-002',
          type: 'development',
          description: 'Stats task 2',
          status: 'completed',
          priority: 7,
          dependencies: '',
          metadata: JSON.stringify({ source: 'test' }),
          progress: 100,
          createdAt: Date.now() + 1000,
          completedAt: Date.now() + 2000
        }
      ];

      // Save data
      for (const agent of agents) {
        await persistenceManager.saveAgent(agent);
      }
      for (const task of tasks) {
        await persistenceManager.saveTask(task);
      }

      // Get stats
      const stats = await persistenceManager.getStats();

      expect(stats.totalAgents).toBe(2);
      expect(stats.activeAgents).toBe(1); // Only 'active' and 'idle' count as active
      expect(stats.totalTasks).toBe(2);
      expect(stats.pendingTasks).toBe(1); // Only 'pending', 'in_progress', 'assigned' count as pending
      expect(stats.completedTasks).toBe(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty database gracefully', async () => {
      const agents = await persistenceManager.getAllAgents();
      const tasks = await persistenceManager.getActiveTasks();
      const stats = await persistenceManager.getStats();

      expect(agents).toHaveLength(0);
      expect(tasks).toHaveLength(0);
      expect(stats.totalAgents).toBe(0);
      expect(stats.totalTasks).toBe(0);
    });

    it('should handle invalid JSON in metadata gracefully', async () => {
      const task: PersistedTask = {
        id: 'invalid-json-task',
        type: 'research',
        description: 'Task with invalid JSON',
        status: 'pending',
        priority: 5,
        dependencies: '',
        metadata: 'invalid-json-string',
        progress: 0,
        createdAt: Date.now()
      };

      await persistenceManager.saveTask(task);
      const retrievedTask = await persistenceManager.getTask(task.id);
      
      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask!.metadata).toBe('invalid-json-string');
    });

    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 agents and 100 tasks
      const agents: PersistedAgent[] = [];
      const tasks: PersistedTask[] = [];
      
      for (let i = 0; i < 100; i++) {
        agents.push({
          id: `bulk-agent-${i}`,
          type: 'researcher',
          name: `Bulk Agent ${i}`,
          status: i % 2 === 0 ? 'active' : 'idle',
          capabilities: JSON.stringify(['research']),
          systemPrompt: `Bulk agent ${i} prompt`,
          maxConcurrentTasks: 3,
          priority: 1,
          createdAt: Date.now() + i
        });

        tasks.push({
          id: `bulk-task-${i}`,
          type: 'research',
          description: `Bulk task ${i}`,
          status: i % 3 === 0 ? 'completed' : 'pending',
          priority: 5,
          dependencies: '',
          metadata: JSON.stringify({ source: 'bulk', index: i }),
          progress: i % 3 === 0 ? 100 : 0,
          createdAt: Date.now() + i
        });
      }

      // Save all data
      for (const agent of agents) {
        await persistenceManager.saveAgent(agent);
      }
      for (const task of tasks) {
        await persistenceManager.saveTask(task);
      }

      // Verify data
      const allAgents = await persistenceManager.getAllAgents();
      const activeTasks = await persistenceManager.getActiveTasks();
      
      expect(allAgents).toHaveLength(100);
      expect(activeTasks.length).toBeGreaterThan(0);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (10 seconds)
      expect(duration).toBeLessThan(10000);
    });
  });
}); 