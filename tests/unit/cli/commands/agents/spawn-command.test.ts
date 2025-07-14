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

jest.mock('../../../../../src/cli/core/global-initialization', () => ({
  getMemoryManager: jest.fn(),
  getPersistenceManager: jest.fn()
}));

jest.mock('../../../../../src/core/logger', () => ({
  Logger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }))
  }
}));

jest.mock('../../../../../src/swarm/coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    stop: jest.fn(),
    registerAgent: jest.fn(),
    getSwarmStatus: jest.fn()
  }))
}));

describe('Spawn Command', () => {
  let mockOutputFormatter: any;
  let mockSwarmCoordinator: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { SwarmCoordinator } = require('../../../../../src/swarm/coordinator');
    const { Logger } = require('../../../../../src/core/logger');
    
    mockSwarmCoordinator = new SwarmCoordinator();
    mockLogger = Logger.getInstance();
    
    // Setup default mock responses
    mockSwarmCoordinator.registerAgent.mockResolvedValue('agent-123');
    mockSwarmCoordinator.initialize.mockResolvedValue();
    mockSwarmCoordinator.stop.mockResolvedValue();
    mockSwarmCoordinator.getSwarmStatus.mockReturnValue({
      status: 'active',
      agents: { total: 1, idle: 1, busy: 0, offline: 0, error: 0 }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('spawnAgent function', () => {
    it('should spawn a researcher agent successfully', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher', 'Research Bot'],
        options: {}
      };

      await spawnCommand.handler(context);

      expect(mockSwarmCoordinator.registerAgent).toHaveBeenCalledWith('Research Bot', 'researcher', []);
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
    });

    it('should spawn a coder agent with default options', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['coder'],
        options: {}
      };

      await spawnCommand.handler(context);

      expect(mockSwarmCoordinator.registerAgent).toHaveBeenCalledWith(
        expect.stringContaining('coder-'),
        'coder',
        []
      );
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
    });

    it('should handle all supported agent types', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const validTypes = ['researcher', 'coder', 'analyst', 'coordinator', 'tester', 'reviewer', 'architect', 'optimizer', 'documenter', 'monitor', 'specialist', 'security', 'devops'];
      
      for (const type of validTypes) {
        const context = {
          args: [type],
          options: {}
        };

        await spawnCommand.handler(context);
        expect(mockSwarmCoordinator.registerAgent).toHaveBeenCalledWith(
          expect.stringContaining(type),
          type,
          []
        );
      }
    });

    it('should handle invalid agent type', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['invalid-type'],
        options: {}
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith('Invalid agent type: invalid-type');
      expect(mockSwarmCoordinator.registerAgent).not.toHaveBeenCalled();
    });

    it('should handle missing agent type', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: [],
        options: {}
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith('Agent type is required');
      expect(mockSwarmCoordinator.registerAgent).not.toHaveBeenCalled();
    });

    it('should parse capabilities correctly', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: { capabilities: 'analysis,research,writing' }
      };

      await spawnCommand.handler(context);

      expect(mockSwarmCoordinator.registerAgent).toHaveBeenCalledWith(
        expect.any(String),
        'researcher',
        ['analysis', 'research', 'writing']
      );
    });

    it('should handle spawn errors gracefully', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      mockSwarmCoordinator.registerAgent.mockRejectedValue(new Error('Spawn failed'));
      
      const context = {
        args: ['researcher'],
        options: {}
      };

      await expect(spawnCommand.handler(context)).rejects.toThrow('Spawn failed');
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith('Failed to spawn agent: Spawn failed');
    });

    it('should show verbose output when requested', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: { verbose: true }
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith('Agent Configuration:');
    });

    it('should validate priority values', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: { priority: 8 }
      };

      await spawnCommand.handler(context);

      expect(mockSwarmCoordinator.registerAgent).toHaveBeenCalled();
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith('⚡ Priority: 8');
    });

    it('should validate autonomy levels', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: { autonomy: 0.9 }
      };

      await spawnCommand.handler(context);

      expect(mockSwarmCoordinator.registerAgent).toHaveBeenCalled();
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith('🤖 Autonomy: 90%');
    });

    it('should handle numeric options correctly', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher'],
        options: { 
          priority: 7,
          timeout: 600,
          maxTasks: 5
        }
      };

      await spawnCommand.handler(context);

      expect(mockSwarmCoordinator.registerAgent).toHaveBeenCalled();
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith('⚡ Priority: 7');
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith('🎯 Max Tasks: 5');
    });
  });

  describe('command definition', () => {
    it('should have correct command structure', () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      expect(spawnCommand.name).toBe('spawn');
      expect(spawnCommand.description).toBe('Direct agent spawning interface');
      expect(spawnCommand.category).toBe('Agents');
      expect(spawnCommand.usage).toBe('flowx spawn <agent-type> [name] [OPTIONS]');
    });

    it('should have all required options defined', () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const optionNames = spawnCommand.options.map((opt: any) => opt.name);
      expect(optionNames).toContain('name');
      expect(optionNames).toContain('priority');
      expect(optionNames).toContain('timeout');
      expect(optionNames).toContain('capabilities');
    });

    it('should have proper examples', () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      expect(spawnCommand.examples).toBeInstanceOf(Array);
      expect(spawnCommand.examples.length).toBeGreaterThan(0);
    });
  });
}); 