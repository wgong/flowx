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
  SwarmCoordinator: jest.fn().mockImplementation(() => {
    const mockInstance = {
      initialize: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
      registerAgent: jest.fn(() => Promise.resolve('agent-123')),
      getSwarmStatus: jest.fn(() => ({
        status: 'active',
        agents: { total: 1, idle: 1, busy: 0, offline: 0, error: 0 }
      }))
    };
    return mockInstance;
  })
}));

describe('Spawn Command', () => {
  let mockOutputFormatter: any;
  let mockLogger: any;
  let mockSwarmCoordinator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the SwarmCoordinator mock
    const { SwarmCoordinator } = require('../../../../../src/swarm/coordinator');
    const mockConstructor = SwarmCoordinator as jest.Mock;
    mockConstructor.mockImplementation(() => {
      const mockInstance = {
        initialize: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve()),
        registerAgent: jest.fn(() => Promise.resolve('agent-123')),
        getSwarmStatus: jest.fn(() => ({
          status: 'active',
          agents: { total: 1, idle: 1, busy: 0, offline: 0, error: 0 }
        }))
      };
      mockSwarmCoordinator = mockInstance;
      return mockInstance;
    });
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { Logger } = require('../../../../../src/core/logger');
    
    mockLogger = Logger.getInstance();
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

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
    });

    it('should spawn a coder agent with default options', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['coder'],
        options: {}
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
    });

    it('should handle all supported agent types', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const validTypes = ['researcher', 'coder', 'analyst', 'coordinator', 'tester', 'reviewer'];
      
      for (const agentType of validTypes) {
        const context = {
          args: [agentType, `${agentType}-test`],
          options: {}
        };

        await spawnCommand.handler(context);
        expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
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
    });

    it('should handle missing agent type', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: [],
        options: {}
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith('Agent type is required');
    });

    it('should parse capabilities correctly', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher', 'Research Bot'],
        options: { capabilities: 'data,analysis,patterns' }
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
    });

    it('should handle spawn errors gracefully', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      // Mock the SwarmCoordinator to throw an error
      const { SwarmCoordinator } = require('../../../../../src/swarm/coordinator');
      const mockConstructor = SwarmCoordinator as jest.Mock;
      mockConstructor.mockImplementationOnce(() => {
        throw new Error('Spawn failed');
      });
      
      const context = {
        args: ['researcher', 'Research Bot'],
        options: {}
      };

      await expect(spawnCommand.handler(context)).rejects.toThrow('Spawn failed');
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Failed to spawn agent: Spawn failed'
      );
    });

    it('should show verbose output when requested', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher', 'Research Bot'],
        options: { verbose: true }
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith('Agent Configuration:');
    });

    it('should validate priority values', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher', 'Research Bot'],
        options: { priority: 'high' }
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
    });

    it('should validate autonomy levels', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher', 'Research Bot'],
        options: { autonomy: 'supervised' }
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
    });

    it('should handle numeric options correctly', async () => {
      const { spawnCommand } = require('../../../../../src/cli/commands/agents/spawn-command');
      
      const context = {
        args: ['researcher', 'Research Bot'],
        options: { timeout: 300, maxTasks: 10 }
      };

      await spawnCommand.handler(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith('✅ Agent spawned successfully!');
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