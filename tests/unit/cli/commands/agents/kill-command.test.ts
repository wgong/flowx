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

jest.mock('../../../../../src/swarm/swarm-coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    terminateAgent: jest.fn(),
    listAgents: jest.fn(),
    getAgentStatus: jest.fn(),
    forceTerminateAgent: jest.fn()
  }))
}));

describe('Kill Command', () => {
  let mockOutputFormatter: any;
  let mockSwarmCoordinator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { SwarmCoordinator } = require('../../../../../src/swarm/swarm-coordinator');
    mockSwarmCoordinator = new SwarmCoordinator();
    
    // Setup default mock responses
    mockSwarmCoordinator.listAgents.mockResolvedValue([
      { id: 'agent-1', type: 'researcher', status: 'active', pid: 12345 },
      { id: 'agent-2', type: 'coder', status: 'idle', pid: 12346 }
    ]);
    
    mockSwarmCoordinator.terminateAgent.mockResolvedValue({
      id: 'agent-1',
      status: 'terminated',
      exitCode: 0
    });
    
    mockSwarmCoordinator.forceTerminateAgent.mockResolvedValue({
      id: 'agent-1',
      status: 'force-terminated',
      exitCode: 9
    });
    
    mockSwarmCoordinator.getAgentStatus.mockResolvedValue({
      id: 'agent-1',
      status: 'active',
      uptime: 5000,
      tasksCompleted: 10
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('killAgent function', () => {
    it('should kill a specific agent by ID', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: {}
      };

      await killAgent(context);

      expect(mockSwarmCoordinator.terminateAgent).toHaveBeenCalledWith('agent-1');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Agent agent-1 terminated successfully')
      );
    });

    it('should force kill an agent when force option is used', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { force: true }
      };

      await killAgent(context);

      expect(mockSwarmCoordinator.forceTerminateAgent).toHaveBeenCalledWith('agent-1');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Agent agent-1 force terminated')
      );
    });

    it('should kill all agents when "all" is specified', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['all'],
        options: {}
      };

      await killAgent(context);

      expect(mockSwarmCoordinator.listAgents).toHaveBeenCalled();
      expect(mockSwarmCoordinator.terminateAgent).toHaveBeenCalledWith('agent-1');
      expect(mockSwarmCoordinator.terminateAgent).toHaveBeenCalledWith('agent-2');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('All agents terminated')
      );
    });

    it('should kill agents by type when type option is used', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: [],
        options: { type: 'researcher' }
      };

      await killAgent(context);

      expect(mockSwarmCoordinator.listAgents).toHaveBeenCalled();
      expect(mockSwarmCoordinator.terminateAgent).toHaveBeenCalledWith('agent-1');
      expect(mockSwarmCoordinator.terminateAgent).not.toHaveBeenCalledWith('agent-2');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Terminated 1 researcher agents')
      );
    });

    it('should kill agents by status when status option is used', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: [],
        options: { status: 'idle' }
      };

      await killAgent(context);

      expect(mockSwarmCoordinator.listAgents).toHaveBeenCalled();
      expect(mockSwarmCoordinator.terminateAgent).toHaveBeenCalledWith('agent-2');
      expect(mockSwarmCoordinator.terminateAgent).not.toHaveBeenCalledWith('agent-1');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Terminated 1 idle agents')
      );
    });

    it('should handle missing agent ID', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: [],
        options: {}
      };

      await killAgent(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Agent ID is required. Use "all" to terminate all agents or specify filters.'
      );
    });

    it('should handle non-existent agent', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      mockSwarmCoordinator.terminateAgent.mockRejectedValue(new Error('Agent not found'));
      
      const context = {
        args: ['non-existent'],
        options: {}
      };

      await killAgent(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to terminate agent')
      );
    });

    it('should show confirmation when confirm option is used', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { confirm: true }
      };

      await killAgent(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Terminating agent agent-1')
      );
    });

    it('should handle timeout option', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { timeout: 5000 }
      };

      await killAgent(context);

      expect(mockSwarmCoordinator.terminateAgent).toHaveBeenCalledWith('agent-1');
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Using timeout of 5000ms')
      );
    });

    it('should handle graceful shutdown', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { graceful: true }
      };

      await killAgent(context);

      expect(mockSwarmCoordinator.terminateAgent).toHaveBeenCalledWith('agent-1');
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Attempting graceful shutdown')
      );
    });

    it('should show verbose output when requested', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { verbose: true }
      };

      await killAgent(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Terminating agent: agent-1')
      );
    });

    it('should handle no agents found scenario', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      mockSwarmCoordinator.listAgents.mockResolvedValue([]);
      
      const context = {
        args: ['all'],
        options: {}
      };

      await killAgent(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        'No agents found to terminate'
      );
    });

    it('should handle partial failures when killing multiple agents', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      mockSwarmCoordinator.terminateAgent
        .mockResolvedValueOnce({ id: 'agent-1', status: 'terminated' })
        .mockRejectedValueOnce(new Error('Failed to terminate agent-2'));
      
      const context = {
        args: ['all'],
        options: {}
      };

      await killAgent(context);

      expect(mockOutputFormatter.printWarning).toHaveBeenCalledWith(
        expect.stringContaining('Some agents failed to terminate')
      );
    });

    it('should handle signal option', async () => {
      const { killAgent } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const context = {
        args: ['agent-1'],
        options: { signal: 'SIGTERM' }
      };

      await killAgent(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Using signal: SIGTERM')
      );
    });
  });

  describe('command definition', () => {
    it('should have correct command structure', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      expect(killCommand).toBeDefined();
      expect(killCommand.name).toBe('kill');
      expect(killCommand.description).toContain('Force terminate agents');
      expect(killCommand.category).toBe('Agent');
      expect(killCommand.handler).toBeDefined();
    });

    it('should have all required options defined', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      const optionNames = killCommand.options.map((opt: any) => opt.name);
      
      expect(optionNames).toContain('force');
      expect(optionNames).toContain('type');
      expect(optionNames).toContain('status');
      expect(optionNames).toContain('confirm');
      expect(optionNames).toContain('timeout');
      expect(optionNames).toContain('graceful');
      expect(optionNames).toContain('signal');
      expect(optionNames).toContain('verbose');
    });

    it('should have proper examples', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      expect(killCommand.examples).toBeDefined();
      expect(killCommand.examples.length).toBeGreaterThan(0);
      expect(killCommand.examples[0]).toContain('flowx kill');
    });

    it('should have proper arguments defined', () => {
      const { killCommand } = require('../../../../../src/cli/commands/agents/kill-command');
      
      expect(killCommand.arguments).toBeDefined();
      expect(killCommand.arguments[0].name).toBe('agent-id');
      expect(killCommand.arguments[0].required).toBe(false);
    });
  });
}); 