/**
 * Unit tests for Database MCP tools
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createDatabaseTools } from '../../../../src/mcp/tools/database/index.ts';
import { Logger } from '../../../../src/core/logger.ts';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { exec } from 'node:child_process';

// Mock child_process
jest.mock('node:child_process', () => ({
  exec: jest.fn()
}));

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  copyFile: jest.fn(),
  unlink: jest.fn()
}));

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFs = fs as jest.Mocked<typeof fs>;

// Helper function to create temporary directory
async function createTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp', `test-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

describe('Database MCP Tools', () => {
  let logger: Logger;
  let tools: any[];
  let tempDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock fs operations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
    mockFs.copyFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    
    // Mock exec to return empty JSON array for SQLite queries
    (mockExec as any).mockImplementation((cmd: string, callback: any) => {
      if (cmd.includes('sqlite3')) {
        callback(null, { stdout: '[]', stderr: '' });
      }
    });

    logger = new Logger({
      level: 'debug',
      format: 'json',
      destination: 'console'
    });
    tools = createDatabaseTools(logger);
    tempDir = await createTempDir();
    testDbPath = path.join(tempDir, 'test.db');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should create all database tools', () => {
    expect(tools).toHaveLength(10);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('database/query');
    expect(toolNames).toContain('database/execute');
    expect(toolNames).toContain('database/schema');
    expect(toolNames).toContain('database/migrate');
    expect(toolNames).toContain('database/backup');
    expect(toolNames).toContain('database/restore');
    expect(toolNames).toContain('database/index');
    expect(toolNames).toContain('database/transaction');
    expect(toolNames).toContain('database/connection');
    expect(toolNames).toContain('database/monitor');
  });

  describe('query tool', () => {
    let queryTool: any;
    
    beforeAll(() => {
      queryTool = tools.find(tool => tool.name === 'database/query');
    });
    
    test('should execute SQLite queries', async () => {
      const result = await queryTool.handler({ 
        type: 'sqlite',
        filename: testDbPath,
        query: 'SELECT 1;',
      });
      
      expect(result).toHaveProperty('query', 'SELECT 1;');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('timestamp');
    });
    
    test('should handle in-memory databases', async () => {
      const result = await queryTool.handler({ 
        type: 'sqlite',
        query: 'SELECT 1;',
      });
      
      expect(result).toHaveProperty('query', 'SELECT 1;');
      expect(result).toHaveProperty('results');
    });
  });

  describe('schema tool', () => {
    let schemaTool: any;
    
    beforeAll(() => {
      schemaTool = tools.find(tool => tool.name === 'database/schema');
    });
    
    test('should get SQLite schema', async () => {
      const result = await schemaTool.handler({ 
        action: 'get',
        type: 'sqlite',
        filename: testDbPath,
      });
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('transaction tool', () => {
    let transactionTool: any;
    
    beforeAll(() => {
      if (tools && tools.length > 0) {
        transactionTool = tools.find(tool => tool.name === 'database/transaction');
      }
    });
    
    test('should manage SQLite transactions', async () => {
      const result = await transactionTool.handler({ 
        action: 'begin',
        type: 'sqlite',
        filename: testDbPath,
      });
      
      expect(result).toHaveProperty('action', 'begin');
      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('timestamp');
    });
    
    test('should execute queries in transaction', async () => {
      const result = await transactionTool.handler({ 
        action: 'execute',
        type: 'sqlite',
        filename: testDbPath,
        queries: [
          { query: 'CREATE TABLE test (id INTEGER PRIMARY KEY);' },
          { query: 'INSERT INTO test (id) VALUES (1);' },
        ],
      });
      
      expect(result).toHaveProperty('action', 'execute');
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(2);
    });
  });

  // Add additional tests for other tools as needed
});