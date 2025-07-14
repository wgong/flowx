/**
 * Unit tests for Validate Command
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
  getOrchestrator: jest.fn(),
  getMemoryManager: jest.fn(),
  getSwarmCoordinator: jest.fn(),
  getTaskEngine: jest.fn(),
  getMCPServer: jest.fn(),
  getConfig: jest.fn()
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  access: jest.fn(),
  stat: jest.fn()
}));

describe('Validate Command', () => {
  let mockOutputFormatter: any;
  let mockGlobalInit: any;
  let mockFs: any;
  let mockOrchestrator: any;
  let mockMemoryManager: any;
  let mockSwarmCoordinator: any;
  let mockTaskEngine: any;
  let mockMCPServer: any;
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
        taskTimeout: 30000
      },
      memory: {
        maxBanks: 5,
        bankSize: 1000
      },
      swarm: {
        maxAgents: 20,
        coordinationStrategy: 'centralized'
      },
      mcp: {
        enabled: true,
        port: 3000
      }
    };
    
    mockOrchestrator = {
      validateConfiguration: jest.fn(),
      isInitialized: jest.fn(),
      getHealthStatus: jest.fn()
    };
    
    mockMemoryManager = {
      validateConfiguration: jest.fn(),
      isInitialized: jest.fn(),
      getHealthStatus: jest.fn()
    };
    
    mockSwarmCoordinator = {
      validateConfiguration: jest.fn(),
      isInitialized: jest.fn(),
      getHealthStatus: jest.fn()
    };
    
    mockTaskEngine = {
      validateConfiguration: jest.fn(),
      isInitialized: jest.fn(),
      getHealthStatus: jest.fn()
    };
    
    mockMCPServer = {
      validateConfiguration: jest.fn(),
      isRunning: jest.fn(),
      getHealthStatus: jest.fn()
    };
    
    // Configure global initialization mocks
    mockGlobalInit.getLogger.mockResolvedValue(mockLogger);
    mockGlobalInit.getConfig.mockResolvedValue(mockConfig);
    mockGlobalInit.getOrchestrator.mockResolvedValue(mockOrchestrator);
    mockGlobalInit.getMemoryManager.mockResolvedValue(mockMemoryManager);
    mockGlobalInit.getSwarmCoordinator.mockResolvedValue(mockSwarmCoordinator);
    mockGlobalInit.getTaskEngine.mockResolvedValue(mockTaskEngine);
    mockGlobalInit.getMCPServer.mockResolvedValue(mockMCPServer);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('configuration validation', () => {
    it('should validate valid configuration', async () => {
      // Setup valid configuration
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      mockMemoryManager.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      mockSwarmCoordinator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      mockTaskEngine.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      mockMCPServer.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validation: PASSED')
      );
    });

    it('should detect configuration errors', async () => {
      // Setup invalid configuration
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: false,
        errors: [
          'Invalid maxConcurrentTasks: must be > 0',
          'Invalid taskTimeout: must be > 1000'
        ],
        warnings: []
      });
      
      mockMemoryManager.validateConfiguration.mockResolvedValue({
        valid: false,
        errors: ['Invalid maxBanks: must be <= 10'],
        warnings: ['bankSize is quite large']
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validation: FAILED')
      );
    });

    it('should validate specific configuration file', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        orchestrator: { maxConcurrentTasks: 5 }
      }));
      
      mockFs.access.mockResolvedValue(undefined);
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { config: 'custom-config.json' }
      });
      
      expect(mockFs.readFile).toHaveBeenCalledWith('custom-config.json', 'utf-8');
    });

    it('should handle missing configuration file', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { config: 'missing-config.json' }
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Configuration file not found')
      );
    });

    it('should validate configuration schema', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { schema: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Schema validation')
      );
    });

    it('should validate environment variables', async () => {
      // Mock environment variables
      process.env.FLOWX_MAX_AGENTS = '10';
      process.env.FLOWX_LOG_LEVEL = 'info';
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { env: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Environment validation')
      );
      
      // Cleanup
      delete process.env.FLOWX_MAX_AGENTS;
      delete process.env.FLOWX_LOG_LEVEL;
    });
  });

  describe('system validation', () => {
    it('should validate system dependencies', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { dependencies: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Dependency validation')
      );
    });

    it('should validate system permissions', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { permissions: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Permission validation')
      );
    });

    it('should validate system resources', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { resources: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Resource validation')
      );
    });

    it('should validate network connectivity', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { network: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Network validation')
      );
    });

    it('should validate database connections', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { database: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Database validation')
      );
    });
  });

  describe('component validation', () => {
    it('should validate orchestrator component', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: ['orchestrator'],
        options: {}
      });
      
      expect(mockOrchestrator.validateConfiguration).toHaveBeenCalled();
    });

    it('should validate memory component', async () => {
      mockMemoryManager.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: ['memory'],
        options: {}
      });
      
      expect(mockMemoryManager.validateConfiguration).toHaveBeenCalled();
    });

    it('should validate swarm component', async () => {
      mockSwarmCoordinator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: ['swarm'],
        options: {}
      });
      
      expect(mockSwarmCoordinator.validateConfiguration).toHaveBeenCalled();
    });

    it('should validate task engine component', async () => {
      mockTaskEngine.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: ['tasks'],
        options: {}
      });
      
      expect(mockTaskEngine.validateConfiguration).toHaveBeenCalled();
    });

    it('should validate MCP server component', async () => {
      mockMCPServer.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: ['mcp'],
        options: {}
      });
      
      expect(mockMCPServer.validateConfiguration).toHaveBeenCalled();
    });

    it('should handle invalid component names', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: ['invalid-component'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Unknown component')
      );
    });
  });

  describe('output formats', () => {
    it('should output validation results in JSON format', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { format: 'json' }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalled();
    });

    it('should output validation results in table format', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { format: 'table' }
      });
      
      expect(mockOutputFormatter.formatTable).toHaveBeenCalled();
    });

    it('should output validation results in summary format', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { format: 'summary' }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalled();
    });
  });

  describe('validation modes', () => {
    it('should run strict validation', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: ['Minor configuration issue']
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { strict: true }
      });
      
      // In strict mode, warnings should be treated as errors
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Strict validation failed')
      );
    });

    it('should run quick validation', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { quick: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Quick validation')
      );
    });

    it('should run deep validation', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { deep: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Deep validation')
      );
    });

    it('should run dry-run validation', async () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { 'dry-run': true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Dry-run validation')
      );
    });
  });

  describe('validation reporting', () => {
    it('should generate validation report', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: []
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { report: 'validation-report.json' }
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Validation report generated')
      );
    });

    it('should fix validation issues automatically', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: false,
        errors: ['Configuration error'],
        warnings: [],
        fixes: ['Apply default configuration']
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { fix: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Applying fixes')
      );
    });

    it('should show validation suggestions', async () => {
      mockOrchestrator.validateConfiguration.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: ['Consider increasing maxConcurrentTasks for better performance']
      });
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { suggestions: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Suggestions')
      );
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockOrchestrator.validateConfiguration.mockRejectedValue(
        new Error('Validation failed')
      );
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Validation error')
      );
    });

    it('should handle initialization errors', async () => {
      mockGlobalInit.getOrchestrator.mockRejectedValue(
        new Error('Initialization failed')
      );
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize')
      );
    });

    it('should handle JSON parsing errors', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      mockFs.access.mockResolvedValue(undefined);
      
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      await validateCommand.handler({
        args: [],
        options: { config: 'invalid-config.json' }
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON')
      );
    });
  });

  describe('command validation', () => {
    it('should have correct command structure', () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      expect(validateCommand.name).toBe('validate');
      expect(validateCommand.description).toBeDefined();
      expect(validateCommand.handler).toBeDefined();
      expect(typeof validateCommand.handler).toBe('function');
    });

    it('should have proper options defined', () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      expect(validateCommand.options).toBeDefined();
      expect(Array.isArray(validateCommand.options)).toBe(true);
      
      const optionNames = validateCommand.options.map((opt: any) => opt.name);
      expect(optionNames).toContain('config');
      expect(optionNames).toContain('strict');
      expect(optionNames).toContain('format');
      expect(optionNames).toContain('report');
    });

    it('should have proper examples', () => {
      const { validateCommand } = require('../../../../src/cli/commands/system/validate-command');
      
      expect(validateCommand.examples).toBeDefined();
      expect(Array.isArray(validateCommand.examples)).toBe(true);
      expect(validateCommand.examples.length).toBeGreaterThan(0);
    });
  });
}); 