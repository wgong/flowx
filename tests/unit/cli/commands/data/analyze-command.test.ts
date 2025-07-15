/**
 * Unit tests for Analyze Command
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

jest.mock('../../../../../src/swarm/coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    getAnalytics: jest.fn(),
    analyzePerformance: jest.fn(),
    getAgentMetrics: jest.fn(),
    getTaskMetrics: jest.fn()
  }))
}));

jest.mock('../../../../../src/memory/manager', () => ({
  MemoryManager: jest.fn().mockImplementation(() => ({
    analyzeMemoryUsage: jest.fn(),
    getMemoryStatistics: jest.fn(),
    analyzePatterns: jest.fn()
  }))
}));

// Mock global initialization
jest.mock('../../../../../src/cli/core/global-initialization', () => ({
  getLogger: jest.fn(() => Promise.resolve({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  getMemoryManager: jest.fn(() => Promise.resolve({
    query: jest.fn(() => Promise.resolve([])),
    search: jest.fn(() => Promise.resolve([])),
    getMemoryBanks: jest.fn(() => Promise.resolve([])),
    analyzeMemoryUsage: jest.fn(() => Promise.resolve({}))
  })),
  getPersistenceManager: jest.fn(() => Promise.resolve({
    getActiveTasks: jest.fn(() => Promise.resolve([])),
    getActiveAgents: jest.fn(() => Promise.resolve([])),
    getTaskHistory: jest.fn(() => Promise.resolve([])),
    getAgentHistory: jest.fn(() => Promise.resolve([])),
    getSystemLogs: jest.fn(() => Promise.resolve([]))
  }))
}));

// Mock task engine with proper constructor mocking
const mockTaskEngine = {
  listTasks: jest.fn(() => Promise.resolve({ 
    tasks: [], 
    total: 0, 
    hasMore: false 
  })),
  analyzeTask: jest.fn(() => Promise.resolve({})),
  getTaskStatistics: jest.fn(() => Promise.resolve({})),
  getTaskMetrics: jest.fn(() => Promise.resolve({})),
  getActiveTasks: jest.fn(() => Promise.resolve([]))
};

jest.mock('../../../../../src/task/engine', () => ({
  TaskEngine: jest.fn().mockImplementation(() => mockTaskEngine)
}));

// Mock filesystem
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn()
}));

describe('Analyze Command', () => {
  let mockOutputFormatter: any;
  let mockSwarmCoordinator: any;
  let mockMemoryManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { SwarmCoordinator } = require('../../../../../src/swarm/coordinator');
    const { MemoryManager } = require('../../../../../src/memory/manager');
    
    mockSwarmCoordinator = new SwarmCoordinator();
    mockMemoryManager = new MemoryManager();
    
    // Ensure mock methods exist and setup default mock responses
    if (mockSwarmCoordinator.getAnalytics) {
      mockSwarmCoordinator.getAnalytics.mockResolvedValue({
        totalAgents: 5,
        activeAgents: 3,
        taskMetrics: { completed: 10, failed: 2, pending: 3 }
      });
    }
    
    if (mockMemoryManager.analyzeMemoryUsage) {
      mockMemoryManager.analyzeMemoryUsage.mockResolvedValue({
        totalMemory: 1000,
        usedMemory: 600,
        freeMemory: 400
      });
    }

    // Reset taskEngine mock - ensure it has the method
    (mockTaskEngine.listTasks as jest.MockedFunction<any>).mockResolvedValue({ tasks: [] });
    (mockTaskEngine.analyzeTask as jest.MockedFunction<any>).mockResolvedValue({});
    (mockTaskEngine.getTaskStatistics as jest.MockedFunction<any>).mockResolvedValue({});
    (mockTaskEngine.getTaskMetrics as jest.MockedFunction<any>).mockResolvedValue({});
    (mockTaskEngine.getActiveTasks as jest.MockedFunction<any>).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('command structure', () => {
    it('should have correct command structure', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      expect(analyzeCommand).toBeDefined();
      expect(analyzeCommand.name).toBe('analyze');
      expect(analyzeCommand.description).toContain('Comprehensive data analysis');
      expect(analyzeCommand.options).toBeDefined();
      expect(analyzeCommand.handler).toBeDefined();
    });

    it('should have system analysis support via target argument', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      // System analysis is done via target argument, not option
      expect(analyzeCommand.arguments[0].name).toBe('target');
      expect(analyzeCommand.arguments[0].description).toContain('system');
    });

    it('should have performance analysis option', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const performanceOption = analyzeCommand.options.find((opt: any) => opt.name === 'performance');
      expect(performanceOption).toBeDefined();
    });

    it('should have output format options', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const formatOption = analyzeCommand.options.find((opt: any) => opt.name === 'format');
      expect(formatOption).toBeDefined();
    });
  });

  describe('analysis types', () => {
    it('should support system analysis', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['system'],
        options: { system: true }
      };
      
      // Test should not throw
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });

    it('should support performance analysis', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['performance'],
        options: { performance: true }
      };
      
      // Test should not throw
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });

    it('should support log analysis', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['logs'],
        options: { logs: true }
      };
      
      // Test should not throw
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });

    it('should support task analysis', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['tasks'],
        options: { tasks: true }
      };
      
      // Test should not throw
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });

    it('should support agent analysis', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['agents'],
        options: { agents: true }
      };
      
      // Test should not throw
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });
  });

  describe('output formats', () => {
    it('should support JSON output format', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['system'],
        options: { system: true, format: 'json' }
      };
      
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });

    it('should support table output format', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['system'],
        options: { system: true, format: 'table' }
      };
      
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });

    it('should support CSV output format', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['system'],
        options: { system: true, format: 'csv' }
      };
      
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid analysis type', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: ['invalid'],
        options: { invalid: true }
      };
      
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });

    it('should handle missing arguments', async () => {
      const { analyzeCommand } = require('../../../../../src/cli/commands/data/analyze-command');
      
      const mockContext = {
        args: [],
        options: {}
      };
      
      await expect(analyzeCommand.handler(mockContext)).resolves.not.toThrow();
    });
  });
}); 