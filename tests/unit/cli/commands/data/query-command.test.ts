/**
 * Unit tests for Query Command
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

// Mock dependencies
jest.mock('../../../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn()
}));

jest.mock('../../../../../src/core/persistence', () => ({
  PersistenceManager: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    getSchema: jest.fn(),
    getIndices: jest.fn(),
    executeQuery: jest.fn()
  }))
}));

jest.mock('../../../../../src/memory/manager', () => ({
  MemoryManager: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    search: jest.fn(),
    getMemoryBanks: jest.fn()
  }))
}));

jest.mock('../../../../../src/swarm/coordinator', () => ({
  SwarmCoordinator: jest.fn().mockImplementation(() => ({
    queryAgents: jest.fn(),
    queryTasks: jest.fn(),
    queryMetrics: jest.fn()
  }))
}));

describe('Query Command', () => {
  let mockOutputFormatter: any;
  let mockPersistenceManager: any;
  let mockMemoryManager: any;
  let mockSwarmCoordinator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked modules
    mockOutputFormatter = require('../../../../../src/cli/core/output-formatter');
    const { PersistenceManager } = require('../../../../../src/core/persistence');
    const { MemoryManager } = require('../../../../../src/memory/manager');
          const { SwarmCoordinator } = require('../../../../../src/swarm/coordinator');
    
    mockPersistenceManager = new PersistenceManager();
    mockMemoryManager = new MemoryManager();
    mockSwarmCoordinator = new SwarmCoordinator();
    
    // Setup default mock responses
    mockPersistenceManager.query.mockResolvedValue([
      { id: 'result-1', type: 'task', data: { name: 'Test Task' } },
      { id: 'result-2', type: 'agent', data: { name: 'Test Agent' } }
    ]);
    
    mockPersistenceManager.getSchema.mockResolvedValue({
      tables: ['tasks', 'agents', 'memories'],
      fields: {
        tasks: ['id', 'name', 'status', 'created_at'],
        agents: ['id', 'name', 'type', 'status'],
        memories: ['id', 'content', 'timestamp']
      }
    });
    
    mockPersistenceManager.getIndices.mockResolvedValue([
      { table: 'tasks', field: 'status', type: 'btree' },
      { table: 'agents', field: 'type', type: 'hash' }
    ]);
    
    mockPersistenceManager.executeQuery.mockResolvedValue({
      results: [{ id: 1, name: 'test' }],
      count: 1,
      executionTime: 15
    });
    
    mockMemoryManager.query.mockResolvedValue([
      { id: 'mem-1', content: 'Test memory', relevance: 0.95 }
    ]);
    
    mockMemoryManager.search.mockResolvedValue([
      { id: 'mem-1', content: 'Test memory', score: 0.95 }
    ]);
    
    mockMemoryManager.getMemoryBanks.mockResolvedValue([
      { id: 'bank-1', name: 'default', size: 100 }
    ]);
    
    mockSwarmCoordinator.queryAgents.mockResolvedValue([
      { id: 'agent-1', type: 'researcher', status: 'active' }
    ]);
    
    mockSwarmCoordinator.queryTasks.mockResolvedValue([
      { id: 'task-1', type: 'analysis', status: 'completed' }
    ]);
    
    mockSwarmCoordinator.queryMetrics.mockResolvedValue({
      totalAgents: 5,
      activeTasks: 3,
      completedTasks: 10
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('executeQuery function', () => {
    it('should execute a basic SQL query', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['SELECT * FROM tasks'],
        options: {}
      };

      await executeQuery(context);

      expect(mockPersistenceManager.executeQuery).toHaveBeenCalledWith('SELECT * FROM tasks');
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Query executed successfully')
      );
    });

    it('should execute query with specific target', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      const context = {
        args: ['status:active'],
        options: { target: 'agents' }
      };

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

      await executeQuery(context);

      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        'Query is required'
      );
    });

    it('should handle query execution errors', async () => {
      const { executeQuery } = require('../../../../../src/cli/commands/data/query-command');
      
      mockPersistenceManager.executeQuery.mockRejectedValue(new Error('SQL syntax error'));
      
      const context = {
        args: ['INVALID SQL'],
        options: {}
      };

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
      
      expect(optionNames).toContain('target');
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
      expect(queryCommand.arguments[0].name).toBe('query');
      expect(queryCommand.arguments[0].required).toBe(true);
    });
  });
}); 