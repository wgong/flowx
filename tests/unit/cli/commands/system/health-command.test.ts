/**
 * Unit tests for Health Command
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn(),
  formatTable: jest.fn()
}));

jest.mock('../../../../../src/cli/core/global-initialization', () => ({
  getLogger: jest.fn(),
  getOrchestrator: jest.fn(),
  getMemoryManager: jest.fn(),
  getSwarmCoordinator: jest.fn(),
  getTaskEngine: jest.fn(),
  getMCPServer: jest.fn()
}));

// Mock process.exit to prevent tests from exiting
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('Health Command', () => {
  let mockOutputFormatter: any;
  let mockGlobalInit: any;
  let mockOrchestrator: any;
  let mockMemoryManager: any;
  let mockSwarmCoordinator: any;
  let mockTaskEngine: any;
  let mockMCPServer: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    mockGlobalInit = require('../../../../../src/cli/core/global-initialization');
    
    // Setup mock instances
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    
    mockOrchestrator = {
      getHealthStatus: jest.fn(),
      getMetrics: jest.fn(),
      isInitialized: jest.fn()
    };
    
    mockMemoryManager = {
      getHealthStatus: jest.fn(),
      getMetrics: jest.fn(),
      isInitialized: jest.fn()
    };
    
    mockSwarmCoordinator = {
      getHealthStatus: jest.fn(),
      getMetrics: jest.fn(),
      isInitialized: jest.fn()
    };
    
    mockTaskEngine = {
      getHealthStatus: jest.fn(),
      getMetrics: jest.fn(),
      isInitialized: jest.fn()
    };
    
    mockMCPServer = {
      getHealthStatus: jest.fn(),
      getMetrics: jest.fn(),
      isRunning: jest.fn()
    };
    
    // Configure global initialization mocks
    mockGlobalInit.getLogger.mockResolvedValue(mockLogger);
    mockGlobalInit.getOrchestrator.mockResolvedValue(mockOrchestrator);
    mockGlobalInit.getMemoryManager.mockResolvedValue(mockMemoryManager);
    mockGlobalInit.getSwarmCoordinator.mockResolvedValue(mockSwarmCoordinator);
    mockGlobalInit.getTaskEngine.mockResolvedValue(mockTaskEngine);
    mockGlobalInit.getMCPServer.mockResolvedValue(mockMCPServer);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('health status command', () => {
    it('should display healthy system status', async () => {
      // Setup healthy system
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        uptime: 3600,
        components: {
          orchestrator: { status: 'healthy' },
          memory: { status: 'healthy' },
          coordination: { status: 'healthy' }
        }
      });
      
      mockMemoryManager.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        totalBanks: 5,
        activeBanks: 3
      });
      
      mockSwarmCoordinator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        totalAgents: 10,
        activeAgents: 8
      });
      
      mockTaskEngine.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        totalTasks: 25,
        runningTasks: 5
      });
      
      mockMCPServer.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        activeSessions: 3,
        totalRequests: 150
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('System Health Status: HEALTHY')
      );
    });

    it('should display unhealthy system status', async () => {
      // Setup unhealthy system
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: false,
        status: 'unhealthy',
        error: 'Database connection failed'
      });
      
      mockMemoryManager.getHealthStatus.mockResolvedValue({
        healthy: false,
        status: 'unhealthy',
        error: 'Memory bank corruption detected'
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('System Health Status: UNHEALTHY')
      );
    });

    it('should display detailed health information with --detailed flag', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        components: {
          orchestrator: { status: 'healthy', uptime: 3600 },
          memory: { status: 'healthy', usage: 65 },
          coordination: { status: 'healthy', activeConnections: 5 }
        }
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { detailed: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Detailed Health Information')
      );
    });

    it('should display system metrics with --metrics flag', async () => {
      mockOrchestrator.getMetrics.mockResolvedValue({
        uptime: 3600,
        totalAgents: 10,
        activeAgents: 8,
        totalTasks: 25,
        completedTasks: 20,
        memoryUsage: 65.5,
        cpuUsage: 45.2
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { metrics: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('System Metrics')
      );
    });

    it('should handle component-specific health checks', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      // Test orchestrator health
      await healthCommand.handler({
        args: ['orchestrator'],
        options: {}
      });
      
      expect(mockOrchestrator.getHealthStatus).toHaveBeenCalled();
      
      // Test memory health
      await healthCommand.handler({
        args: ['memory'],
        options: {}
      });
      
      expect(mockMemoryManager.getHealthStatus).toHaveBeenCalled();
      
      // Test swarm health
      await healthCommand.handler({
        args: ['swarm'],
        options: {}
      });
      
      expect(mockSwarmCoordinator.getHealthStatus).toHaveBeenCalled();
    });

    it('should handle watch mode with --watch flag', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      try {
        await healthCommand.handler({
          args: [],
          options: { watch: true, interval: 1000 }
        });
      } catch (error) {
        // Expected due to mocked process.exit
      }
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Watching system health')
      );
      
      mockExit.mockRestore();
    });

    it('should export health report with --export flag', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        components: {}
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { export: 'health-report.json' }
      });
      
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Health report exported')
      );
    });

    it('should handle different output formats', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy'
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      // Test JSON format
      await healthCommand.handler({
        args: [],
        options: { format: 'json' }
      });
      
      // Test table format
      await healthCommand.handler({
        args: [],
        options: { format: 'table' }
      });
      
      // Test summary format
      await healthCommand.handler({
        args: [],
        options: { format: 'summary' }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalled();
    });

    it('should handle threshold alerts', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        components: {
          memory: { status: 'healthy', usage: 95 }, // Above threshold
          cpu: { status: 'healthy', usage: 85 } // Above threshold
        }
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { 
          thresholds: 'memory:90,cpu:80',
          alerts: true 
        }
      });
      
      expect(mockOutputFormatter.printWarning).toHaveBeenCalledWith(
        expect.stringContaining('threshold exceeded')
      );
    });

    it('should handle initialization errors gracefully', async () => {
      mockGlobalInit.getOrchestrator.mockRejectedValue(new Error('Initialization failed'));
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get system health')
      );
    });

    it('should handle component health check errors', async () => {
      mockOrchestrator.getHealthStatus.mockRejectedValue(new Error('Health check failed'));
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Error checking system health')
      );
    });

    it('should validate component names', async () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: ['invalid-component'],
        options: {}
      });
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Unknown component')
      );
    });

    it('should handle verbose output', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        components: {},
        diagnostics: {
          checks: ['database', 'memory', 'disk'],
          warnings: ['High memory usage'],
          errors: []
        }
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { verbose: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Diagnostics')
      );
    });

    it('should handle quiet mode', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy'
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { quiet: true }
      });
      
      // In quiet mode, should only show essential information
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledTimes(1);
    });

    it('should handle system resource checks', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        resources: {
          memory: { total: 8192, used: 5324, free: 2868 },
          cpu: { cores: 8, usage: 45.2 },
          disk: { total: 512000, used: 256000, free: 256000 }
        }
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { resources: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('System Resources')
      );
    });

    it('should handle service status checks', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        services: {
          orchestrator: { status: 'running', pid: 1234 },
          memory: { status: 'running', pid: 1235 },
          swarm: { status: 'running', pid: 1236 },
          mcp: { status: 'running', pid: 1237 }
        }
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { services: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Service Status')
      );
    });

    it('should handle network connectivity checks', async () => {
      mockOrchestrator.getHealthStatus.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        network: {
          connectivity: 'online',
          latency: 25,
          endpoints: {
            'api.example.com': { status: 'reachable', latency: 120 },
            'db.example.com': { status: 'reachable', latency: 15 }
          }
        }
      });
      
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      await healthCommand.handler({
        args: [],
        options: { network: true }
      });
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Network Connectivity')
      );
    });
  });

  describe('command validation', () => {
    it('should have correct command structure', () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      expect(healthCommand.name).toBe('health');
      expect(healthCommand.description).toBeDefined();
      expect(healthCommand.handler).toBeDefined();
      expect(typeof healthCommand.handler).toBe('function');
    });

    it('should have proper options defined', () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      expect(healthCommand.options).toBeDefined();
      expect(Array.isArray(healthCommand.options)).toBe(true);
      
      const optionNames = healthCommand.options.map((opt: any) => opt.name);
      expect(optionNames).toContain('detailed');
      expect(optionNames).toContain('metrics');
      expect(optionNames).toContain('watch');
      expect(optionNames).toContain('format');
    });

    it('should have proper examples', () => {
      const { healthCommand } = require('../../../../../src/cli/commands/system/health-command');
      
      expect(healthCommand.examples).toBeDefined();
      expect(Array.isArray(healthCommand.examples)).toBe(true);
      expect(healthCommand.examples.length).toBeGreaterThan(0);
    });
  });
}); 