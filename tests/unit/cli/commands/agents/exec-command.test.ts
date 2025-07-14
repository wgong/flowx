/**
 * Unit tests for Exec Command
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
  getMemoryManager: jest.fn(),
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock('../../../../../src/swarm/coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    executeCommand: jest.fn(() => Promise.resolve({
      success: true,
      output: 'Command executed successfully',
      exitCode: 0
    })),
    listAgents: jest.fn(() => Promise.resolve([])),
    getAgentStatus: jest.fn(() => Promise.resolve({ status: 'active' }))
  }))
}));

jest.mock('../../../../../src/agents/agent-process-manager', () => ({
  AgentProcessManager: jest.fn().mockImplementation(() => ({
    getAgent: jest.fn(),
    createAgent: jest.fn(),
    terminateAgent: jest.fn()
  }))
}));

jest.mock('../../../../../src/task/engine', () => ({
  TaskEngine: jest.fn().mockImplementation(() => ({
    createTask: jest.fn(),
    executeTask: jest.fn()
  }))
}));

describe('Exec Command', () => {
  let mockOutputFormatter: any;
  let mockPersistenceManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { getPersistenceManager } = require('../../../../../src/cli/core/global-initialization');
    
    // Setup persistence manager mock
    mockPersistenceManager = {
      getAllAgents: jest.fn(),
      getAgent: jest.fn(),
      updateAgent: jest.fn(),
      updateAgentStatus: jest.fn()
    };
    
    getPersistenceManager.mockResolvedValue(mockPersistenceManager);
    
    // Setup default mock responses
    mockPersistenceManager.getAgent.mockResolvedValue({
      id: 'agent-1',
      type: 'researcher',
      status: 'active'
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('command structure', () => {
    it('should have correct command structure', () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      expect(execCommand.name).toBe('exec');
      expect(execCommand.description).toBe('Execute commands within agent context');
      expect(execCommand.category).toBe('Agents');
      expect(execCommand.usage).toBe('flowx exec <agent-id> <command> [ARGS...] [OPTIONS]');
      expect(execCommand.handler).toBeDefined();
    });

    it('should have proper arguments defined', () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      expect(execCommand.arguments).toBeInstanceOf(Array);
      expect(execCommand.arguments.length).toBeGreaterThan(0);
      expect(execCommand.arguments[0].name).toBe('agent-id');
    });

    it('should have proper examples', () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      expect(execCommand.examples).toBeInstanceOf(Array);
      expect(execCommand.examples.length).toBeGreaterThan(0);
    });
  });

  describe('basic functionality', () => {
    it('should handle missing arguments gracefully', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: [],
        options: {}
      };

      await execCommand.handler(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalled();
    });

    it('should handle missing agent ID', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['command'],
        options: {}
      };

      await execCommand.handler(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalled();
    });

    it('should handle valid agent and command', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'ls'],
        options: {}
      };

      await execCommand.handler(context);

      // The command should handle errors gracefully
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Exec command failed')
      );
    });
  });
}); 