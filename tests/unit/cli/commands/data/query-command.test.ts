/**
 * Unit tests for Query Command
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

// Create mock objects with proper typing
const mockPersistenceManager = {
  query: jest.fn() as jest.MockedFunction<any>,
  getSchema: jest.fn() as jest.MockedFunction<any>,
  getIndices: jest.fn() as jest.MockedFunction<any>,
  executeQuery: jest.fn() as jest.MockedFunction<any>,
  getActiveTasks: jest.fn() as jest.MockedFunction<any>,
  getActiveAgents: jest.fn() as jest.MockedFunction<any>,
  getTaskHistory: jest.fn() as jest.MockedFunction<any>,
  getAgentHistory: jest.fn() as jest.MockedFunction<any>,
  getSystemLogs: jest.fn() as jest.MockedFunction<any>,
  getPerformanceMetrics: jest.fn() as jest.MockedFunction<any>
};

const mockMemoryManager = {
  query: jest.fn() as jest.MockedFunction<any>,
  search: jest.fn() as jest.MockedFunction<any>,
  getMemoryBanks: jest.fn() as jest.MockedFunction<any>
};

const mockSwarmCoordinator = {
  queryAgents: jest.fn() as jest.MockedFunction<any>,
  queryTasks: jest.fn() as jest.MockedFunction<any>,
  queryMetrics: jest.fn() as jest.MockedFunction<any>
};

// Mock dependencies
jest.mock('../../../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn(),
  formatTable: jest.fn().mockReturnValue('formatted table')
}));

jest.mock('../../../../../src/cli/core/global-initialization', () => ({
  getLogger: jest.fn(() => Promise.resolve({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  getMemoryManager: jest.fn(() => Promise.resolve(mockMemoryManager)),
  getPersistenceManager: jest.fn(() => Promise.resolve(mockPersistenceManager))
}));

jest.mock('../../../../../src/core/persistence', () => ({
  PersistenceManager: jest.fn().mockImplementation(() => mockPersistenceManager)
}));

jest.mock('../../../../../src/memory/manager', () => ({
  MemoryManager: jest.fn().mockImplementation(() => mockMemoryManager)
}));

jest.mock('../../../../../src/swarm/coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => mockSwarmCoordinator)
}));

describe('Query Command', () => {
  let mockOutputFormatter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock return values
    mockPersistenceManager.query.mockResolvedValue([]);
    mockPersistenceManager.getSchema.mockResolvedValue({});
    mockPersistenceManager.getIndices.mockResolvedValue([]);
    mockPersistenceManager.executeQuery.mockResolvedValue([]);
    mockPersistenceManager.getActiveTasks.mockResolvedValue([]);
    mockPersistenceManager.getActiveAgents.mockResolvedValue([]);
    mockPersistenceManager.getTaskHistory.mockResolvedValue([]);
    mockPersistenceManager.getAgentHistory.mockResolvedValue([]);
    mockPersistenceManager.getSystemLogs.mockResolvedValue([]);
    mockPersistenceManager.getPerformanceMetrics.mockResolvedValue({});

    mockMemoryManager.query.mockResolvedValue([]);
    mockMemoryManager.search.mockResolvedValue([]);
    mockMemoryManager.getMemoryBanks.mockResolvedValue([]);

    mockSwarmCoordinator.queryAgents.mockResolvedValue([]);
    mockSwarmCoordinator.queryTasks.mockResolvedValue([]);
    mockSwarmCoordinator.queryMetrics.mockResolvedValue({});
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery function', () => {
    it('should execute a basic SQL query', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: [],
        options: {
          sql: 'SELECT * FROM tasks',
          verbose: true
        }
      };

      try {
        // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);
      } catch (error) {
        console.log('Error during executeQuery:', error);
        throw error;
      }

      // Debug: Check what was actually called
      console.log('printSuccess calls:', mockOutputFormatter.printSuccess.mock.calls);
      console.log('printError calls:', mockOutputFormatter.printError.mock.calls);
      console.log('printInfo calls:', mockOutputFormatter.printInfo.mock.calls);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('SQL query executed successfully')
      );
    });

    it('should execute query with specific target', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['status:active'],
        options: { target: 'agents' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockSwarmCoordinator.queryAgents).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });

    it('should execute memory query', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['test content'],
        options: { target: 'memory' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockMemoryManager.query).toHaveBeenCalledWith('test content');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 memory result')
      );
    });

    it('should handle complex query with filters', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['type:analysis AND status:completed'],
        options: { target: 'tasks' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockSwarmCoordinator.queryTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'analysis',
          status: 'completed'
        })
      );
    });

    it('should handle missing query', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: [],
        options: {}
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Query is required'
      );
    });

    it('should handle query execution errors', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      mockPersistenceManager.executeQuery.mockRejectedValueOnce(new Error('SQL syntax error'));
      
      const context = {
        args: ['INVALID SQL'],
        options: {}
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Query execution failed')
      );
    });

    it('should format output as JSON', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks'],
        options: { format: 'json' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/)
      );
    });

    it('should format output as CSV', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks'],
        options: { format: 'csv' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('id,name')
      );
    });

    it('should handle pagination', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks'],
        options: { limit: 10, offset: 20 }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockPersistenceManager.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM tasks LIMIT 10 OFFSET 20'
      );
    });

    it('should handle sorting', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks'],
        options: { sort: 'created_at DESC' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockPersistenceManager.executeQuery).toHaveBeenCalledWith(
        'SELECT * FROM tasks ORDER BY created_at DESC'
      );
    });

    it('should handle verbose output', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks'],
        options: { verbose: true }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Execution time: 15ms')
      );
    });

    it('should save results to file', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks'],
        options: { output: 'results.json' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Results saved to results.json')
      );
    });

    it('should handle aggregation queries', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['COUNT(*) FROM tasks GROUP BY status'],
        options: { target: 'aggregation' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockPersistenceManager.executeQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM tasks GROUP BY status'
      );
    });

    it('should handle schema queries', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['DESCRIBE tasks'],
        options: {}
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockPersistenceManager.getSchema).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Schema information')
      );
    });

    it('should handle index queries', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SHOW INDEXES'],
        options: {}
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockPersistenceManager.getIndices).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Available indices')
      );
    });

    it('should handle memory bank queries', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SHOW MEMORY BANKS'],
        options: {}
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockMemoryManager.getMemoryBanks).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Memory banks')
      );
    });

    it('should handle semantic search', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['machine learning algorithms'],
        options: { target: 'memory', semantic: true }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockMemoryManager.search).toHaveBeenCalledWith(
        'machine learning algorithms',
        expect.objectContaining({ semantic: true })
      );
    });

    it('should handle query with context', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['recent tasks'],
        options: { context: 'last 24 hours' }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Context: last 24 hours')
      );
    });

    it('should handle query with explain plan', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks WHERE status = "active"'],
        options: { explain: true }
      };

      // Mock success callbacks before executing
      mockOutputFormatter.printSuccess.mockImplementation(() => {});
      mockSwarmCoordinator.queryAgents.mockResolvedValue([{ id: 'agent1', status: 'active' }]);
      mockSwarmCoordinator.queryTasks.mockResolvedValue([{ id: 'task1', type: 'analysis', status: 'completed' }]);
      mockMemoryManager.query.mockResolvedValue([{ id: 'memory1', content: 'test result' }]);
      
      await executeQuery(context);

      expect(mockPersistenceManager.executeQuery).toHaveBeenCalledWith(
        'EXPLAIN SELECT * FROM tasks WHERE status = "active"'
      );
    });
  });

  describe('command definition', () => {
    it('should have correct command structure', () => {
      const { queryCommand } = require('../../../../../src/cli/commands/data/query-command');
      
      expect(queryCommand).toBeDefined();
      expect(queryCommand.name).toBe('query');
      expect(queryCommand.description).toContain('Advanced data querying');
      expect(queryCommand.category).toBe('Data');
      expect(queryCommand.handler).toBeDefined();
    });

    it('should have all required options defined', () => {
      const { queryCommand } = require('../../../../../src/cli/commands/data/query-command');
      
      const optionNames = queryCommand.options.map((opt: any) => opt.name);
      
      expect(optionNames).toContain('query-type');
      expect(optionNames).toContain('format');
      expect(optionNames).toContain('output');
      expect(optionNames).toContain('limit');
      expect(optionNames).toContain('offset');
      expect(optionNames).toContain('sort');
      expect(optionNames).toContain('verbose');
      expect(optionNames).toContain('semantic');
      expect(optionNames).toContain('context');
      expect(optionNames).toContain('explain');
    });

    it('should have proper examples', () => {
      const { queryCommand } = require('../../../../../src/cli/commands/data/query-command');
      
      expect(queryCommand.examples).toBeDefined();
      expect(queryCommand.examples.length).toBeGreaterThan(0);
      expect(queryCommand.examples[0]).toContain('flowx query');
    });

    it('should have proper arguments defined', () => {
      const { queryCommand } = require('../../../../../src/cli/commands/data/query-command');
      
      expect(queryCommand.arguments).toBeDefined();
      expect(queryCommand.arguments[0].name).toBe('query-type');
      expect(queryCommand.arguments[0].required).toBe(true);
    });
  });
}); 