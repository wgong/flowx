/**
 * Unit tests for Config Command
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn(),
  formatTable: jest.fn()
}));

jest.mock('../../../../src/cli/core/global-initialization', () => ({
  getLogger: jest.fn(),
  getConfig: jest.fn(),
  setConfig: jest.fn(),
  saveConfig: jest.fn(),
  reloadConfig: jest.fn()
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn()
}));

describe('Config Command', () => {
  let mockOutputFormatter: any;
  let mockGlobalInit: any;
  let mockFs: any;
  let mockLogger: any;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../src/cli/core/output-formatter');
    mockGlobalInit = require('../../../../src/cli/core/global-initialization');
    mockFs = require('fs/promises');
    
    // Setup mock instances
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    
    mockConfig = {
      orchestrator: {
        maxConcurrentTasks: 10,
        taskTimeout: 30000,
        retryAttempts: 3
      },
      memory: {
        maxBanks: 5,
        bankSize: 1000,
        persistenceEnabled: true
      },
      swarm: {
        maxAgents: 20,
        coordinationStrategy: 'centralized',
        loadBalancing: 'round-robin'
      },
      mcp: {
        enabled: true,
        port: 3000,
        host: 'localhost'
      },
      logging: {
        level: 'info',
        format: 'json',
        file: 'flowx.log'
      }
    };
    
    // Configure global initialization mocks
    mockGlobalInit.getLogger.mockResolvedValue(mockLogger);
    mockGlobalInit.getConfig.mockResolvedValue(mockConfig);
    mockGlobalInit.setConfig.mockResolvedValue(undefined);
    mockGlobalInit.saveConfig.mockResolvedValue(undefined);
    mockGlobalInit.reloadConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('config get operations', () => {
    it('should get entire configuration', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['get'],
        options: {}
      });
      
      expect(mockGlobalInit.getConfig).toHaveBeenCalled();
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Configuration:')
      );
    });

    it('should get specific configuration section', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['get', 'orchestrator'],
        options: {}
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('orchestrator')
      );
    });

    it('should get specific configuration key', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['get', 'orchestrator.maxConcurrentTasks'],
        options: {}
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('10')
      );
    });

    it('should handle non-existent configuration key', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['get', 'nonexistent.key'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Configuration key not found')
      );
    });

    it('should get configuration with different formats', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      // Test JSON format
      await configCommand.handler({
        args: ['get'],
        options: { format: 'json' }
      });
      
      // Test YAML format
      await configCommand.handler({
        args: ['get'],
        options: { format: 'yaml' }
      });
      
      // Test table format
      await configCommand.handler({
        args: ['get'],
        options: { format: 'table' }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalled();
    });
  });

  describe('config set operations', () => {
    it('should set configuration value', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['set', 'orchestrator.maxConcurrentTasks', '15'],
        options: {}
      });
      
      expect(mockGlobalInit.setConfig).toHaveBeenCalledWith(
        'orchestrator.maxConcurrentTasks',
        15
      );
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration updated')
      );
    });

    it('should set boolean configuration value', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['set', 'memory.persistenceEnabled', 'false'],
        options: {}
      });
      
      expect(mockGlobalInit.setConfig).toHaveBeenCalledWith(
        'memory.persistenceEnabled',
        false
      );
    });

    it('should set string configuration value', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['set', 'logging.level', 'debug'],
        options: {}
      });
      
      expect(mockGlobalInit.setConfig).toHaveBeenCalledWith(
        'logging.level',
        'debug'
      );
    });

    it('should validate configuration values', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['set', 'orchestrator.maxConcurrentTasks', '-5'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid configuration value')
      );
    });

    it('should handle missing arguments for set', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['set'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Key and value required')
      );
    });

    it('should save configuration after set', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['set', 'orchestrator.maxConcurrentTasks', '15'],
        options: { save: true }
      });
      
      expect(mockGlobalInit.saveConfig).toHaveBeenCalled();
    });
  });

  describe('config list operations', () => {
    it('should list all configuration keys', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['list'],
        options: {}
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Configuration keys:')
      );
    });

    it('should list configuration keys with filter', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['list'],
        options: { filter: 'orchestrator' }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('orchestrator')
      );
    });

    it('should list configuration keys with values', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['list'],
        options: { values: true }
      });
      
      expect(mockOutputFormatter.formatTable).toHaveBeenCalled();
    });
  });

  describe('config reset operations', () => {
    it('should reset specific configuration key', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['reset', 'orchestrator.maxConcurrentTasks'],
        options: {}
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration reset')
      );
    });

    it('should reset entire configuration section', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['reset', 'orchestrator'],
        options: {}
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration section reset')
      );
    });

    it('should reset all configuration with confirmation', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['reset'],
        options: { all: true, force: true }
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('All configuration reset')
      );
    });

    it('should require confirmation for reset all', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['reset'],
        options: { all: true }
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Use --force to confirm')
      );
    });
  });

  describe('config import/export operations', () => {
    it('should export configuration to file', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['export'],
        options: { file: 'config-export.json' }
      });
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'config-export.json',
        expect.any(String)
      );
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration exported')
      );
    });

    it('should import configuration from file', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        orchestrator: { maxConcurrentTasks: 20 }
      }));
      
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['import'],
        options: { file: 'config-import.json' }
      });
      
      expect(mockFs.readFile).toHaveBeenCalledWith('config-import.json', 'utf-8');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration imported')
      );
    });

    it('should handle import file errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['import'],
        options: { file: 'missing-config.json' }
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to import configuration')
      );
    });

    it('should validate imported configuration', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['import'],
        options: { file: 'invalid-config.json' }
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid configuration format')
      );
    });
  });

  describe('config backup/restore operations', () => {
    it('should backup current configuration', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['backup'],
        options: {}
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration backed up')
      );
    });

    it('should restore configuration from backup', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['restore'],
        options: { backup: 'config-backup-20240101.json' }
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration restored')
      );
    });

    it('should list available backups', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['backup'],
        options: { list: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Available backups:')
      );
    });
  });

  describe('config validation operations', () => {
    it('should validate current configuration', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['validate'],
        options: {}
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validation')
      );
    });

    it('should validate configuration file', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        orchestrator: { maxConcurrentTasks: 10 }
      }));
      
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['validate'],
        options: { file: 'config-to-validate.json' }
      });
      
      expect(mockFs.readFile).toHaveBeenCalledWith('config-to-validate.json', 'utf-8');
    });

    it('should show validation errors', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      // Mock invalid configuration
      mockGlobalInit.getConfig.mockResolvedValue({
        orchestrator: { maxConcurrentTasks: -1 } // Invalid value
      });
      
      await configCommand.handler({
        args: ['validate'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validation failed')
      );
    });
  });

  describe('config reload operations', () => {
    it('should reload configuration', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['reload'],
        options: {}
      });
      
      expect(mockGlobalInit.reloadConfig).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration reloaded')
      );
    });

    it('should handle reload errors', async () => {
      mockGlobalInit.reloadConfig.mockRejectedValue(new Error('Reload failed'));
      
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['reload'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to reload configuration')
      );
    });
  });

  describe('config schema operations', () => {
    it('should show configuration schema', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['schema'],
        options: {}
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Configuration schema:')
      );
    });

    it('should show schema for specific section', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['schema', 'orchestrator'],
        options: {}
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('orchestrator')
      );
    });

    it('should generate schema documentation', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['schema'],
        options: { docs: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Schema documentation')
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid subcommands', async () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['invalid-subcommand'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Unknown subcommand')
      );
    });

    it('should handle configuration access errors', async () => {
      mockGlobalInit.getConfig.mockRejectedValue(new Error('Config access failed'));
      
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['get'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get configuration')
      );
    });

    it('should handle configuration save errors', async () => {
      mockGlobalInit.saveConfig.mockRejectedValue(new Error('Save failed'));
      
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      await configCommand.handler({
        args: ['set', 'orchestrator.maxConcurrentTasks', '15'],
        options: { save: true }
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save configuration')
      );
    });
  });

  describe('command validation', () => {
    it('should have correct command structure', () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      expect(configCommand.name).toBe('config');
      expect(configCommand.description).toBeDefined();
      expect(configCommand.handler).toBeDefined();
      expect(typeof configCommand.handler).toBe('function');
    });

    it('should have proper arguments defined', () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      expect(configCommand.arguments).toBeDefined();
      expect(Array.isArray(configCommand.arguments)).toBe(true);
      expect(configCommand.arguments.length).toBeGreaterThan(0);
    });

    it('should have proper options defined', () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      expect(configCommand.options).toBeDefined();
      expect(Array.isArray(configCommand.options)).toBe(true);
      
      const optionNames = configCommand.options.map((opt: any) => opt.name);
      expect(optionNames).toContain('format');
      expect(optionNames).toContain('file');
      expect(optionNames).toContain('save');
    });

    it('should have proper examples', () => {
      const { configCommand } = require('../../../../src/cli/commands/system/config-command');
      
      expect(configCommand.examples).toBeDefined();
      expect(Array.isArray(configCommand.examples)).toBe(true);
      expect(configCommand.examples.length).toBeGreaterThan(0);
    });
  });
}); 