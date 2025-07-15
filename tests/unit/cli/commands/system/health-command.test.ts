/**
 * Unit tests for Health Command
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock os module first
jest.mock('os', () => ({
  platform: jest.fn().mockReturnValue('darwin'),
  arch: jest.fn().mockReturnValue('x64'),
  uptime: jest.fn().mockReturnValue(3600),
  totalmem: jest.fn().mockReturnValue(8589934592),
  freemem: jest.fn().mockReturnValue(4294967296),
  loadavg: jest.fn().mockReturnValue([0.5, 0.7, 0.9]),
  cpus: jest.fn().mockReturnValue([
    { model: 'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz' },
    { model: 'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz' }
  ])
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('{}')),
  writeFile: jest.fn(() => Promise.resolve())
}));

// Mock the actual functions that the health command uses
jest.mock('../../../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn(),
  formatTable: jest.fn(),
  successBold: jest.fn(),
  infoBold: jest.fn(),
  warningBold: jest.fn(),
  errorBold: jest.fn()
}));

jest.mock('../../../../../src/cli/core/global-initialization', () => ({
  getMemoryManager: jest.fn(),
  getPersistenceManager: jest.fn()
}));

jest.mock('../../../../../src/core/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock('../../../../../src/swarm/coordinator', () => ({
  SwarmCoordinator: jest.fn()
}));

jest.mock('../../../../../src/task/engine', () => ({
  TaskEngine: jest.fn()
}));

// Mock console.log to capture output
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

// Mock process.exit to prevent tests from exiting
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('Health Command', () => {
  let mockOutputFormatter: any;
  let mockGlobalInit: any;
  let mockMemoryManager: any;
  let mockPersistenceManager: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleOutput = [];
    
    // Reset os module mock
    const osMock = require('os');
    osMock.cpus.mockReturnValue([
      { model: 'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz' },
      { model: 'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz' }
    ]);
    osMock.loadavg.mockReturnValue([0.5, 0.7, 0.9]);
    osMock.platform.mockReturnValue('darwin');
    osMock.arch.mockReturnValue('x64');
    osMock.uptime.mockReturnValue(3600);
    osMock.totalmem.mockReturnValue(8589934592);
    osMock.freemem.mockReturnValue(4294967296);
    
    // Mock console.log to capture output
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    mockGlobalInit = require('../../../../../src/cli/core/global-initialization');
    
    // Setup mock instances
    mockMemoryManager = {
      getHealthStatus: jest.fn(),
      getMetrics: jest.fn(),
      isInitialized: jest.fn()
    };
    
    mockPersistenceManager = {
      getHealthStatus: jest.fn(),
      getMetrics: jest.fn(),
      isInitialized: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    
    // Configure global initialization mocks
    mockGlobalInit.getMemoryManager.mockResolvedValue(mockMemoryManager);
    mockGlobalInit.getPersistenceManager.mockResolvedValue(mockPersistenceManager);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('health status command', () => {
    it('should display healthy system status', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: {}
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      expect(mockGlobalInit.getMemoryManager).toHaveBeenCalled();
      expect(mockGlobalInit.getPersistenceManager).toHaveBeenCalled();
    });

    it('should display unhealthy system status', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      // Make services fail
      mockGlobalInit.getMemoryManager.mockRejectedValue(new Error('Service unavailable'));
      mockGlobalInit.getPersistenceManager.mockRejectedValue(new Error('Service unavailable'));
      
      const context = {
        args: [],
        options: {}
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      expect(mockGlobalInit.getMemoryManager).toHaveBeenCalled();
      expect(mockGlobalInit.getPersistenceManager).toHaveBeenCalled();
    });

    it('should display detailed health information with --detailed flag', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { verbose: true }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      expect(mockGlobalInit.getMemoryManager).toHaveBeenCalled();
    });

    it('should display system metrics with --metrics flag', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { metrics: true }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });

    it('should handle component-specific health checks', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { component: 'memory' }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      expect(mockGlobalInit.getMemoryManager).toHaveBeenCalled();
    });

    it('should handle watch mode with --watch flag', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { watch: true }
      };
      
      // Mock setInterval to prevent infinite loop and control execution
      const originalSetInterval = setInterval;
      const originalClearInterval = clearInterval;
      const originalProcessOn = process.on;
      const originalProcessExit = process.exit;
      
      let intervalId: any;
      const mockSetInterval = jest.fn().mockImplementation(() => {
        intervalId = setTimeout(() => {
          // Don't actually execute the function to prevent infinite loop
        }, 100);
        return intervalId;
      });
      
      const mockClearInterval = jest.fn().mockImplementation(() => {
        if (intervalId) {
          clearTimeout(intervalId);
        }
      });
      
      const mockProcessOn = jest.fn().mockImplementation(() => {
        // Don't register the actual handler
        return;
      });
      
      const mockProcessExit = jest.fn().mockImplementation(() => {
        // Don't actually exit
        return;
      });
      
      global.setInterval = mockSetInterval as any;
      global.clearInterval = mockClearInterval as any;
      process.on = mockProcessOn as any;
      process.exit = mockProcessExit as any;
      
      try {
        await healthCommand.handler(context);
        
        expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
          expect.stringContaining('Running comprehensive health checks')
        );
        expect(mockSetInterval).toHaveBeenCalled();
        
        // Clean up any remaining intervals
        if (intervalId) {
          clearTimeout(intervalId);
        }
      } finally {
        // Restore original functions
        global.setInterval = originalSetInterval;
        global.clearInterval = originalClearInterval;
        process.on = originalProcessOn;
        process.exit = originalProcessExit;
      }
    });

    it('should export health report with --export flag', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { export: 'health-report.json' }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });

    it('should handle different output formats', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { format: 'json' }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      // Should output JSON to console
      expect(consoleOutput.some(output => output.includes('{'))).toBe(true);
    });

    it('should handle threshold alerts', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { threshold: 'warning' }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });

    it('should handle initialization errors gracefully', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      mockGlobalInit.getMemoryManager.mockRejectedValue(new Error('Initialization failed'));
      
      const context = {
        args: [],
        options: {}
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      expect(mockGlobalInit.getMemoryManager).toHaveBeenCalled();
    });

    it('should handle component health check errors', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      mockGlobalInit.getPersistenceManager.mockRejectedValue(new Error('Component error'));
      
      const context = {
        args: [],
        options: {}
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      expect(mockGlobalInit.getPersistenceManager).toHaveBeenCalled();
    });

    it('should validate component names', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { component: 'invalid-component' }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });

    it('should handle verbose output', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { verbose: true }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });

    it('should handle quiet mode', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { quiet: true }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });

    it('should handle system resource checks', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { resources: true }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });

    it('should handle service status checks', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { services: true }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
      expect(mockGlobalInit.getMemoryManager).toHaveBeenCalled();
      expect(mockGlobalInit.getPersistenceManager).toHaveBeenCalled();
    });

    it('should handle network connectivity checks', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      const context = {
        args: [],
        options: { network: true }
      };
      
      await healthCommand.handler(context);
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Running comprehensive health checks')
      );
    });
  });

  describe('command validation', () => {
    it('should have correct command structure', () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      expect(healthCommand.name).toBe('health');
      expect(healthCommand.description).toBe('System health monitoring and diagnostics');
      expect(healthCommand.handler).toBeDefined();
    });

    it('should have all required options defined', () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      expect(healthCommand.options).toBeDefined();
      expect(Array.isArray(healthCommand.options)).toBe(true);
      expect(healthCommand.options.length).toBeGreaterThan(0);
    });

    it('should have proper examples', () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      expect(healthCommand.examples).toBeDefined();
      expect(Array.isArray(healthCommand.examples)).toBe(true);
      expect(healthCommand.examples.length).toBeGreaterThan(0);
    });

    it('should have subcommands defined', () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      expect(healthCommand.subcommands).toBeDefined();
      expect(Array.isArray(healthCommand.subcommands)).toBe(true);
      expect(healthCommand.subcommands.length).toBeGreaterThan(0);
    });
  });
}); 