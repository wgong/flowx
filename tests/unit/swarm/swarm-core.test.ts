/**
 * Tests for core swarm functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SwarmMock } from '../../__mocks__/swarm-mock';

describe('Swarm Core Functionality', () => {
  let swarmMock: SwarmMock;

  beforeEach(() => {
    swarmMock = new SwarmMock();
  });

  describe('Swarm Management', () => {
    it('should create a new swarm', () => {
      const swarm = swarmMock.createSwarm('test-swarm-1', {
        name: 'Test Swarm',
        strategy: 'auto',
        mode: 'centralized'
      });

      expect(swarm).toBeDefined();
      expect(swarm.id).toBe('test-swarm-1');
      expect(swarm.name).toBe('Test Swarm');
      expect(swarm.strategy).toBe('auto');
      expect(swarm.mode).toBe('centralized');
      expect(swarm.status).toBe('planning');
    });

    it('should list swarms', () => {
      swarmMock.createSwarm('test-swarm-1');
      swarmMock.createSwarm('test-swarm-2');

      const swarms = swarmMock.listSwarms();
      
      expect(swarms.length).toBe(2);
      expect(swarms[0].id).toBe('test-swarm-1');
      expect(swarms[1].id).toBe('test-swarm-2');
    });

    it('should start a swarm', () => {
      swarmMock.createSwarm('test-swarm-1');
      const result = swarmMock.startSwarm('test-swarm-1');
      
      expect(result).toBe(true);
      
      const swarm = swarmMock.getSwarm('test-swarm-1');
      expect(swarm.status).toBe('running');
    });

    it('should stop a swarm', () => {
      swarmMock.createSwarm('test-swarm-1');
      swarmMock.startSwarm('test-swarm-1');
      const result = swarmMock.stopSwarm('test-swarm-1');
      
      expect(result).toBe(true);
      
      const swarm = swarmMock.getSwarm('test-swarm-1');
      expect(swarm.status).toBe('stopped');
    });
  });

  describe('Agent Management', () => {
    it('should create agents', () => {
      const agent = swarmMock.createAgent('test-agent-1', {
        name: 'Test Agent',
        type: 'researcher',
        capabilities: ['research', 'analysis']
      });

      expect(agent).toBeDefined();
      expect(agent.id).toBe('test-agent-1');
      expect(agent.name).toBe('Test Agent');
      expect(agent.type).toBe('researcher');
      expect(agent.capabilities).toContain('research');
      expect(agent.capabilities).toContain('analysis');
    });

    it('should list agents', () => {
      swarmMock.createAgent('test-agent-1');
      swarmMock.createAgent('test-agent-2');

      const agents = swarmMock.listAgents();
      
      expect(agents.length).toBe(2);
      expect(agents[0].id).toBe('test-agent-1');
      expect(agents[1].id).toBe('test-agent-2');
    });

    it('should add agents to swarms', () => {
      swarmMock.createSwarm('test-swarm-1');
      swarmMock.createAgent('test-agent-1');
      
      const result = swarmMock.addAgentToSwarm('test-swarm-1', 'test-agent-1');
      
      expect(result).toBe(true);
      
      const swarm = swarmMock.getSwarm('test-swarm-1');
      expect(swarm.agents).toContain('test-agent-1');
    });
  });

  describe('Task Management', () => {
    it('should create tasks', () => {
      const task = swarmMock.createTask('test-task-1', {
        description: 'Test Task',
        priority: 'high'
      });

      expect(task).toBeDefined();
      expect(task.id).toBe('test-task-1');
      expect(task.description).toBe('Test Task');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('pending');
    });

    it('should assign tasks to agents', () => {
      swarmMock.createTask('test-task-1');
      swarmMock.createAgent('test-agent-1');
      
      const result = swarmMock.assignTask('test-task-1', 'test-agent-1');
      
      expect(result).toBe(true);
      
      const task = swarmMock.getTask('test-task-1');
      expect(task.assignedTo).toBe('test-agent-1');
      expect(task.status).toBe('assigned');
    });

    it('should complete tasks', () => {
      swarmMock.createTask('test-task-1');
      const result = swarmMock.completeTask('test-task-1', { output: 'Task result' });
      
      expect(result).toBe(true);
      
      const task = swarmMock.getTask('test-task-1');
      expect(task.status).toBe('completed');
      expect(task.result.output).toBe('Task result');
      expect(task.completedAt).toBeDefined();
    });
  });

  describe('Swarm Metrics', () => {
    it('should provide swarm metrics', () => {
      swarmMock.createSwarm('test-swarm-1');
      swarmMock.createAgent('test-agent-1');
      swarmMock.createAgent('test-agent-2');
      swarmMock.addAgentToSwarm('test-swarm-1', 'test-agent-1');
      swarmMock.addAgentToSwarm('test-swarm-1', 'test-agent-2');
      
      const metrics = swarmMock.getSwarmMetrics('test-swarm-1');
      
      expect(metrics).toBeDefined();
      expect(metrics.id).toBe('test-swarm-1');
      expect(metrics.totalAgents).toBe(2);
      expect(metrics.status).toBe('planning');
      expect(metrics.cpuUsage).toBeDefined();
      expect(metrics.memoryUsage).toBeDefined();
    });
  });
});