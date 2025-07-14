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

jest.mock('../../../../../src/swarm/swarm-coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    executeCommand: jest.fn(),
    listAgents: jest.fn(),
    getAgentStatus: jest.fn()
  }))
}));

describe('Exec Command', () => {
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
      { id: 'agent-1', type: 'researcher', status: 'active' },
      { id: 'agent-2', type: 'coder', status: 'idle' }
    ]);
    
    mockSwarmCoordinator.executeCommand.mockResolvedValue({
      success: true,
      output: 'Command executed successfully',
      exitCode: 0,
      duration: 1500
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

  describe('execCommand function', () => {
    it('should execute command on specific agent', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'ls', '-la'],
        options: {}
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'ls -la',
        expect.any(Object)
      );
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Command executed successfully')
      );
    });

    it('should handle missing agent ID', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: [],
        options: {}
      };

      await execCommand(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Agent ID and command are required'
      );
    });

    it('should handle missing command', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1'],
        options: {}
      };

      await execCommand(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Agent ID and command are required'
      );
    });

    it('should execute command with timeout option', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'sleep', '5'],
        options: { timeout: 10000 }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'sleep 5',
        expect.objectContaining({ timeout: 10000 })
      );
    });

    it('should execute command with working directory', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'pwd'],
        options: { cwd: '/tmp' }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'pwd',
        expect.objectContaining({ cwd: '/tmp' })
      );
    });

    it('should execute command with environment variables', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'env'],
        options: { env: 'NODE_ENV=test,DEBUG=true' }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'env',
        expect.objectContaining({
          env: { NODE_ENV: 'test', DEBUG: 'true' }
        })
      );
    });

    it('should handle interactive mode', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'bash'],
        options: { interactive: true }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'bash',
        expect.objectContaining({ interactive: true })
      );
    });

    it('should execute command in background', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'long-running-task'],
        options: { background: true }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'long-running-task',
        expect.objectContaining({ background: true })
      );
    });

    it('should handle dry run mode', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'rm', '-rf', '/'],
        options: { 'dry-run': true }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).not.toHaveBeenCalled();
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Would execute: rm -rf /')
      );
    });

    it('should show verbose output', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'echo', 'test'],
        options: { verbose: true }
      };

      await execCommand(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Executing command on agent agent-1')
      );
    });

    it('should handle command execution failure', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      mockSwarmCoordinator.executeCommand.mockResolvedValue({
        success: false,
        output: 'Command failed',
        exitCode: 1,
        error: 'Permission denied'
      });
      
      const context = {
        args: ['agent-1', 'restricted-command'],
        options: {}
      };

      await execCommand(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Command failed')
      );
    });

    it('should handle execution errors', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      mockSwarmCoordinator.executeCommand.mockRejectedValue(new Error('Agent not found'));
      
      const context = {
        args: ['non-existent', 'echo', 'test'],
        options: {}
      };

      await execCommand(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute command')
      );
    });

    it('should handle output format options', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'ps', 'aux'],
        options: { format: 'json' }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'ps aux',
        expect.objectContaining({ format: 'json' })
      );
    });

    it('should handle shell option', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'echo $HOME'],
        options: { shell: '/bin/zsh' }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'echo $HOME',
        expect.objectContaining({ shell: '/bin/zsh' })
      );
    });

    it('should handle input option', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'cat'],
        options: { input: 'test input data' }
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'cat',
        expect.objectContaining({ input: 'test input data' })
      );
    });

    it('should handle multiple arguments correctly', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'find', '/tmp', '-name', '*.txt', '-type', 'f'],
        options: {}
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'find /tmp -name *.txt -type f',
        expect.any(Object)
      );
    });

    it('should handle quoted arguments', async () => {
      const { execCommand } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const context = {
        args: ['agent-1', 'echo', 'hello world'],
        options: {}
      };

      await execCommand(context);

      expect(mockSwarmCoordinator.executeCommand).toHaveBeenCalledWith(
        'agent-1',
        'echo hello world',
        expect.any(Object)
      );
    });
  });

  describe('command definition', () => {
    it('should have correct command structure', () => {
      const { execCommand: command } = require('../../../../../src/cli/commands/agents/exec-command');
      
      expect(command).toBeDefined();
      expect(command.name).toBe('exec');
      expect(command.description).toContain('Execute commands');
      expect(command.category).toBe('Agent');
      expect(command.handler).toBeDefined();
    });

    it('should have all required options defined', () => {
      const { execCommand: command } = require('../../../../../src/cli/commands/agents/exec-command');
      
      const optionNames = command.options.map((opt: any) => opt.name);
      
      expect(optionNames).toContain('timeout');
      expect(optionNames).toContain('cwd');
      expect(optionNames).toContain('env');
      expect(optionNames).toContain('interactive');
      expect(optionNames).toContain('background');
      expect(optionNames).toContain('dry-run');
      expect(optionNames).toContain('verbose');
      expect(optionNames).toContain('format');
      expect(optionNames).toContain('shell');
      expect(optionNames).toContain('input');
    });

    it('should have proper examples', () => {
      const { execCommand: command } = require('../../../../../src/cli/commands/agents/exec-command');
      
      expect(command.examples).toBeDefined();
      expect(command.examples.length).toBeGreaterThan(0);
      expect(command.examples[0]).toContain('flowx exec');
    });

    it('should have proper arguments defined', () => {
      const { execCommand: command } = require('../../../../../src/cli/commands/agents/exec-command');
      
      expect(command.arguments).toBeDefined();
      expect(command.arguments[0].name).toBe('agent-id');
      expect(command.arguments[0].required).toBe(true);
      expect(command.arguments[1].name).toBe('command');
      expect(command.arguments[1].required).toBe(true);
    });
  });
}); 