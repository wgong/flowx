/**
 * Unit tests for Kill Command
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
  getPersistenceManager: jest.fn(),
  getMemoryManager: jest.fn()
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
    stop: jest.fn(() => Promise.resolve()),
    start: jest.fn(() => Promise.resolve()),
    getStatus: jest.fn(() => Promise.resolve({ status: 'stopped' }))
  }))
}));

// Mock process methods
const mockProcess = {
  kill: jest.fn()
};

jest.mock('process', () => mockProcess);

describe('Kill Command', () => {
  let mockOutputFormatter: any;
  let mockPersistenceManager: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { getPersistenceManager } = require('../../../../../src/cli/core/global-initialization');
    const { Logger } = require('../../../../../src/core/logger');
    
    // Setup persistence manager mock
    mockPersistenceManager = {
      getAllAgents: jest.fn(),
      getAgent: jest.fn(),
      deleteAgent: jest.fn(),
      updateAgent: jest.fn(),
      updateAgentStatus: jest.fn()
    };
    
    getPersistenceManager.mockResolvedValue(mockPersistenceManager);
    mockLogger = Logger.getInstance();
    
    // Setup default mock responses
    mockPersistenceManager.getAllAgents.mockResolvedValue([
      { id: 'agent-1', type: 'researcher', status: 'active', pid: 12345 },
      { id: 'agent-2', type: 'coder', status: 'idle', pid: 12346 }
    ]);
    
    // Mock individual agent retrieval
    mockPersistenceManager.getAgent.mockImplementation((id: string) => {
      const agents = [
        { id: 'agent-1', type: 'researcher', status: 'active', pid: 12345 },
        { id: 'agent-2', type: 'coder', status: 'idle', pid: 12346 }
      ];
      return Promise.resolve(agents.find(a => a.id === id));
    });
    
    // Mock status update
    mockPersistenceManager.updateAgentStatus.mockResolvedValue(true);
    
    // Mock process.kill to prevent actual process killing
    mockProcess.kill.mockReturnValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

      describe('killAgent function', () => {
      it('should kill a specific agent by ID', async () => {
        const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
        
        const context = {
          args: ['agent-1'],
          options: { force: true } // Add force to skip confirmation
        };

        await killCommand.handler(context);

        expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
        expect(mockOutputFormatter.printSuccess).toHaveBeenCalled();
      });

          it('should force kill an agent when force option is used', async () => {
        const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
        
        const context = {
          args: ['agent-1'],
          options: { force: true }
        };

        await killCommand.handler(context);

        expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
        expect(mockOutputFormatter.printSuccess).toHaveBeenCalled();
      });

          it('should kill all agents when "all" is specified', async () => {
        const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
        
        const context = {
          args: [],
          options: { all: true, force: true }
        };

        await killCommand.handler(context);

        expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
        expect(mockOutputFormatter.printSuccess).toHaveBeenCalled();
      });

          it('should kill agents by type when type option is used', async () => {
        const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
        
        const context = {
          args: [],
          options: { all: true, type: 'researcher', force: true }
        };

        await killCommand.handler(context);

        expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
        expect(mockOutputFormatter.printSuccess).toHaveBeenCalled();
      });

          it('should kill agents by status when status option is used', async () => {
        const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
        
        const context = {
          args: [],
          options: { all: true, status: 'active', force: true }
        };

        await killCommand.handler(context);

        expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
        expect(mockOutputFormatter.printSuccess).toHaveBeenCalled();
      });

    it('should handle missing agent ID', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: [],
        options: {}
      };

      await killCommand.handler(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith('Target is required. Use --all, --pattern, or specify agent ID');
    });

    it('should handle non-existent agent', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      mockPersistenceManager.getAllAgents.mockResolvedValue([]);
      
      const context = {
        args: ['non-existent'],
        options: {}
      };

      await killCommand.handler(context);

      expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
    });

    it('should show confirmation when confirm option is used', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { confirm: true }
      };

      await killCommand.handler(context);

      expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
    });

    it('should handle timeout option', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { timeout: 5000 }
      };

      await killCommand.handler(context);

      expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
    });

    it('should handle graceful shutdown', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { graceful: true }
      };

      await killCommand.handler(context);

      expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
    });

    it('should show verbose output when requested', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { verbose: true }
      };

      await killCommand.handler(context);

      expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
    });

    it('should handle no agents found scenario', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      mockPersistenceManager.getAllAgents.mockResolvedValue([]);
      
      const context = {
        args: [],
        options: { all: true }
      };

      await killCommand.handler(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith('No agents found to kill');
    });

    it('should handle partial failures when killing multiple agents', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: [],
        options: { all: true }
      };

      await killCommand.handler(context);

      expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
    });

    it('should handle signal option', async () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { signal: 'SIGTERM' }
      };

      await killCommand.handler(context);

      expect(mockPersistenceManager.getAllAgents).toHaveBeenCalled();
    });
  });

  describe('command definition', () => {
    it('should have correct command structure', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      expect(killCommand.name).toBe('kill');
      expect(killCommand.description).toBe('Force terminate agents and processes');
      expect(killCommand.category).toBe('Agents');
      expect(killCommand.usage).toBe('flowx kill <target> [OPTIONS]');
    });

    it('should have all required options defined', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const optionNames = killCommand.options.map((opt: any) => opt.name);
      expect(optionNames).toContain('all');
      expect(optionNames).toContain('pattern');
      expect(optionNames).toContain('force');
    });

    it('should have proper examples', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      expect(killCommand.examples).toBeInstanceOf(Array);
      expect(killCommand.examples.length).toBeGreaterThan(0);
    });

    it('should have proper arguments defined', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      expect(killCommand.arguments).toBeInstanceOf(Array);
      expect(killCommand.arguments[0].name).toBe('target');
    });
  });
}); 