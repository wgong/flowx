/**
 * Unit tests for Spawn Command
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn()
}));

jest.mock('../../../../../src/swarm/swarm-coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    spawnAgent: jest.fn(),
    getAgentStatus: jest.fn(),
    listAgents: jest.fn()
  }))
}));

describe('Spawn Command', () => {
  let mockOutputFormatter: any;
  let mockSwarmCoordinator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { SwarmCoordinator } = require('../../../../../src/swarm/swarm-coordinator');
    mockSwarmCoordinator = new SwarmCoordinator();
    
    // Setup default mock responses
    mockSwarmCoordinator.spawnAgent.mockResolvedValue({
      id: 'agent-123',
      type: 'researcher',
      status: 'active',
      pid: 12345
    });
    
    mockSwarmCoordinator.getAgentStatus.mockResolvedValue({
      id: 'agent-123',
      status: 'active',
      uptime: 1000,
      tasksCompleted: 5
    });
    
    mockSwarmCoordinator.listAgents.mockResolvedValue([
      { id: 'agent-1', type: 'researcher', status: 'active' },
      { id: 'agent-2', type: 'coder', status: 'idle' }
    ]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('spawnAgent function', () => {
    it('should spawn a researcher agent successfully', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: {
          name: 'test-researcher',
          priority: 'high',
          timeout: 30000,
          capabilities: 'research,analysis',
          'max-tasks': 10,
          autonomy: 'medium',
          verbose: false
        }
      };

      await spawnAgent(context);

      expect(mockSwarmCoordinator.spawnAgent).toHaveBeenCalledWith({
        type: 'researcher',
        name: 'test-researcher',
        priority: 'high',
        timeout: 30000,
        capabilities: ['research', 'analysis'],
        maxTasks: 10,
        autonomy: 'medium'
      });

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Agent spawned successfully')
      );
    });

    it('should spawn a coder agent with default options', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['coder'],
        options: {}
      };

      await spawnAgent(context);

      expect(mockSwarmCoordinator.spawnAgent).toHaveBeenCalledWith({
        type: 'coder',
        name: expect.any(String),
        priority: 'normal',
        timeout: 60000,
        capabilities: [],
        maxTasks: 5,
        autonomy: 'medium'
      });

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Agent spawned successfully')
      );
    });

    it('should handle all supported agent types', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const agentTypes = [
        'researcher', 'coder', 'analyst', 'coordinator', 'tester', 
        'reviewer', 'architect', 'optimizer', 'documenter', 'monitor',
        'specialist', 'security', 'devops'
      ];

      for (const type of agentTypes) {
        const context = {
          args: [type],
          options: {}
        };

        await spawnAgent(context);

        expect(mockSwarmCoordinator.spawnAgent).toHaveBeenCalledWith(
          expect.objectContaining({ type })
        );
      }
    });

    it('should handle invalid agent type', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['invalid-type'],
        options: {}
      };

      await spawnAgent(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid agent type')
      );
    });

    it('should handle missing agent type', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: [],
        options: {}
      };

      await spawnAgent(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Agent type is required'
      );
    });

    it('should parse capabilities correctly', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: {
          capabilities: 'research,analysis,documentation'
        }
      };

      await spawnAgent(context);

      expect(mockSwarmCoordinator.spawnAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          capabilities: ['research', 'analysis', 'documentation']
        })
      );
    });

    it('should handle spawn errors gracefully', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      mockSwarmCoordinator.spawnAgent.mockRejectedValue(new Error('Spawn failed'));
      
      const context = {
        args: ['researcher'],
        options: {}
      };

      await spawnAgent(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to spawn agent')
      );
    });

    it('should show verbose output when requested', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: {
          verbose: true
        }
      };

      await spawnAgent(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Spawning agent with configuration')
      );
    });

    it('should validate priority values', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      
      for (const priority of validPriorities) {
        const context = {
          args: ['researcher'],
          options: { priority }
        };

        await spawnAgent(context);

        expect(mockSwarmCoordinator.spawnAgent).toHaveBeenCalledWith(
          expect.objectContaining({ priority })
        );
      }
    });

    it('should validate autonomy levels', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const validAutonomy = ['low', 'medium', 'high', 'full'];
      
      for (const autonomy of validAutonomy) {
        const context = {
          args: ['researcher'],
          options: { autonomy }
        };

        await spawnAgent(context);

        expect(mockSwarmCoordinator.spawnAgent).toHaveBeenCalledWith(
          expect.objectContaining({ autonomy })
        );
      }
    });

    it('should handle numeric options correctly', async () => {
      const { spawnAgent } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: {
          timeout: '45000',
          'max-tasks': '15'
        }
      };

      await spawnAgent(context);

      expect(mockSwarmCoordinator.spawnAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 45000,
          maxTasks: 15
        })
      );
    });
  });

  describe('command definition', () => {
    it('should have correct command structure', () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      expect(spawnCommand).toBeDefined();
      expect(spawnCommand.name).toBe('spawn');
      expect(spawnCommand.description).toContain('Spawn a new agent');
      expect(spawnCommand.category).toBe('Agent');
      expect(spawnCommand.handler).toBeDefined();
    });

    it('should have all required options defined', () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const optionNames = spawnCommand.options.map((opt: any) => opt.name);
      
      expect(optionNames).toContain('name');
      expect(optionNames).toContain('priority');
      expect(optionNames).toContain('timeout');
      expect(optionNames).toContain('capabilities');
      expect(optionNames).toContain('max-tasks');
      expect(optionNames).toContain('autonomy');
      expect(optionNames).toContain('verbose');
    });

    it('should have proper examples', () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      expect(spawnCommand.examples).toBeDefined();
      expect(spawnCommand.examples.length).toBeGreaterThan(0);
      expect(spawnCommand.examples[0]).toContain('flowx spawn');
    });
  });
}); 