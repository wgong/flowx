/**
 * Unit tests for FileSystem MCP Tools
 */

import { createFilesystemTools } from '../../../../src/mcp/tools/filesystem';
import { Logger } from '../../../../src/core/logger';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

// Override the mocked mkdtemp to use real implementation for this test
jest.unmock('node:fs/promises');
jest.unmock('fs/promises');

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

// Helper to create temp directory
async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'filesystem-tools-test-'));
  return tempDir;
}

describe('FileSystem MCP Tools', () => {
  let tools: any[];
  let tempDir: string;

  beforeAll(async () => {
    // Create filesystem tools
    tools = createFilesystemTools(mockLogger as any);
    
    // Create temp directory for tests
    tempDir = await createTempDir();
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create all filesystem tools', () => {
    expect(tools).toHaveLength(15);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('filesystem/read');
    expect(toolNames).toContain('filesystem/write');
    expect(toolNames).toContain('filesystem/list');
    expect(toolNames).toContain('filesystem/create');
    expect(toolNames).toContain('filesystem/delete');
    expect(toolNames).toContain('filesystem/move');
    expect(toolNames).toContain('filesystem/copy');
    expect(toolNames).toContain('filesystem/watch');
    expect(toolNames).toContain('filesystem/search');
    expect(toolNames).toContain('filesystem/permissions');
    expect(toolNames).toContain('filesystem/metadata');
    expect(toolNames).toContain('filesystem/compress');
    expect(toolNames).toContain('filesystem/extract');
    expect(toolNames).toContain('filesystem/sync');
    expect(toolNames).toContain('filesystem/backup');
  });

  describe('read tool', () => {
    let readTool: any;
    let testFilePath: string;
    
    beforeAll(() => {
      readTool = tools.find(tool => tool.name === 'filesystem/read');
    });
    
    beforeEach(async () => {
      // Create test file
      testFilePath = join(tempDir, 'read-test.txt');
      await writeFile(testFilePath, 'Hello, World!');
    });
    
    test('should read a file', async () => {
      const result = await readTool.handler({ path: testFilePath });
      
      expect(result).toHaveProperty('content', 'Hello, World!');
      expect(result).toHaveProperty('size', 13);
      expect(result).toHaveProperty('path', testFilePath);
      expect(result).toHaveProperty('encoding', 'utf8');
      expect(result).toHaveProperty('timestamp');
    });
    
    test('should handle non-existent file', async () => {
      const nonExistentPath = join(tempDir, 'non-existent.txt');
      
      await expect(readTool.handler({ path: nonExistentPath }))
        .rejects.toThrow(/Failed to read file/);
    });
    
    test('should enforce maxSize limit', async () => {
      await expect(readTool.handler({ 
        path: testFilePath, 
        maxSize: 10 
      })).rejects.toThrow(/exceeds maximum allowed size/);
    });
  });

  describe('write tool', () => {
    let writeTool: any;
    let testFilePath: string;
    
    beforeAll(() => {
      writeTool = tools.find(tool => tool.name === 'filesystem/write');
    });
    
    beforeEach(async () => {
      testFilePath = join(tempDir, 'write-test.txt');
    });
    
    test('should write a new file', async () => {
      const result = await writeTool.handler({ 
        path: testFilePath, 
        content: 'New content' 
      });
      
      expect(result).toHaveProperty('path', testFilePath);
      expect(result).toHaveProperty('operation', 'write');
      
      // Verify file was written correctly
      const content = await fs.readFile(testFilePath, 'utf8');
      expect(content).toBe('New content');
    });
    
    test('should append to an existing file', async () => {
      // Create initial file
      await fs.writeFile(testFilePath, 'Initial content\n');
      
      const result = await writeTool.handler({ 
        path: testFilePath, 
        content: 'Appended content', 
        append: true 
      });
      
      expect(result).toHaveProperty('operation', 'append');
      
      // Verify content was appended
      const content = await fs.readFile(testFilePath, 'utf8');
      expect(content).toBe('Initial content\nAppended content');
    });
    
    test('should create parent directories if requested', async () => {
      const nestedPath = join(tempDir, 'nested', 'dir', 'file.txt');
      
      const result = await writeTool.handler({ 
        path: nestedPath, 
        content: 'Nested content', 
        createDir: true 
      });
      
      expect(result).toHaveProperty('path', nestedPath);
      
      // Verify file was created
      const content = await fs.readFile(nestedPath, 'utf8');
      expect(content).toBe('Nested content');
    });
  });

  describe('list tool', () => {
    let listTool: any;
    let testDirPath: string;
    
    beforeAll(() => {
      listTool = tools.find(tool => tool.name === 'filesystem/list');
    });
    
    beforeEach(async () => {
      // Create test directory with files
      testDirPath = join(tempDir, 'list-test');
      await fs.mkdir(testDirPath, { recursive: true });
      
      // Create test files
      await fs.writeFile(join(testDirPath, 'file1.txt'), 'File 1');
      await fs.writeFile(join(testDirPath, 'file2.txt'), 'File 2');
      await fs.writeFile(join(testDirPath, '.hidden'), 'Hidden file');
      
      // Create subdirectory with files
      await fs.mkdir(join(testDirPath, 'subdir'), { recursive: true });
      await fs.writeFile(join(testDirPath, 'subdir', 'file3.txt'), 'File 3');
    });
    
    test('should list directory contents', async () => {
      const result = await listTool.handler({ path: testDirPath });
      
      expect(result).toHaveProperty('path', testDirPath);
      expect(result).toHaveProperty('items');
      expect(result.items).toHaveLength(3); // 2 files + 1 directory, excluding hidden
      
      // Check items have correct structure
      const fileItems = result.items.filter((item: any) => item.type === 'file');
      expect(fileItems).toHaveLength(2);
      expect(fileItems[0]).toHaveProperty('name');
      expect(fileItems[0]).toHaveProperty('path');
      expect(fileItems[0]).toHaveProperty('type', 'file');
      
      const dirItems = result.items.filter((item: any) => item.type === 'directory');
      expect(dirItems).toHaveLength(1);
      expect(dirItems[0]).toHaveProperty('name', 'subdir');
    });
    
    test('should include hidden files when requested', async () => {
      const result = await listTool.handler({ 
        path: testDirPath,
        includeHidden: true
      });
      
      expect(result.items).toHaveLength(4); // 3 files + 1 directory, including hidden
      
      // Check hidden file is included
      const hiddenFile = result.items.find((item: any) => item.name === '.hidden');
      expect(hiddenFile).toBeTruthy();
    });
    
    test('should include file stats when requested', async () => {
      const result = await listTool.handler({ 
        path: testDirPath,
        stats: true
      });
      
      const fileItem = result.items.find((item: any) => item.name === 'file1.txt');
      expect(fileItem).toHaveProperty('stats');
      expect(fileItem.stats).toHaveProperty('size');
      expect(fileItem.stats).toHaveProperty('created');
      expect(fileItem.stats).toHaveProperty('modified');
    });
    
    test('should recursively list subdirectories when requested', async () => {
      const result = await listTool.handler({ 
        path: testDirPath,
        recursive: true
      });
      
      // Find subdirectory
      const subdir = result.items.find((item: any) => item.name === 'subdir');
      expect(subdir).toHaveProperty('children');
      expect(subdir.children).toHaveLength(1);
      expect(subdir.children[0]).toHaveProperty('name', 'file3.txt');
    });
  });

  // Additional test cases for other tools can be implemented following the same pattern
});