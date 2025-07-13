/**
 * Comprehensive unit tests for Memory Backends (SQLite and Markdown)
 */

import { SQLiteBackend } from '../../../src/memory/backends/sqlite';
import { MarkdownBackend } from '../../../src/memory/backends/markdown';
import { MemoryEntry } from '../../../src/utils/types';
import { assertEquals, assertExists, assertRejects } from '../../utils/node-test-utils';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  configure: jest.fn().mockResolvedValue(undefined)
};

// Helper to create MemoryEntry objects
function createMemoryEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  const now = new Date();
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentId: 'test-agent',
    sessionId: 'test-session',
    type: 'observation',
    content: 'Test content',
    context: {},
    timestamp: now,
    tags: ['test'],
    version: 1,
    parentId: undefined,
    ...overrides
  };
}

describe('Memory Backends - Basic Tests', () => {
  let tempDir: string;
  let sqliteBackend: SQLiteBackend;
  let markdownBackend: MarkdownBackend;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'memory-test-'));
    
    // Initialize backends
    sqliteBackend = new SQLiteBackend(join(tempDir, 'test.db'), mockLogger);
    markdownBackend = new MarkdownBackend(join(tempDir, 'markdown'), mockLogger);
    
    await sqliteBackend.initialize();
    await markdownBackend.initialize();
  });

  afterEach(async () => {
    await sqliteBackend.shutdown();
    await markdownBackend.shutdown();
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('SQLite Backend', () => {
    it('should store and retrieve memory entries', async () => {
      const entry = createMemoryEntry({
        content: 'Hello World test content',
        tags: ['test', 'example'],
        context: { source: 'unit-test' }
      });

      await sqliteBackend.store(entry);
      const retrieved = await sqliteBackend.retrieve(entry.id);

      assertExists(retrieved);
      assertEquals(retrieved!.content, entry.content);
      assertEquals(retrieved!.tags, entry.tags);
      assertEquals(retrieved!.context, entry.context);
      assertEquals(retrieved!.id, entry.id);
    });

    it('should handle different data types in content', async () => {
      const testEntries = [
        createMemoryEntry({ content: 'test string' }),
        createMemoryEntry({ content: 'number: 42' }),
        createMemoryEntry({ content: 'boolean: true' }),
        createMemoryEntry({ content: 'array: [1, 2, 3, "four"]' }),
        createMemoryEntry({ content: 'object: {"nested": {"deep": "value"}}' }),
      ];

      // Store all test data
      for (const entry of testEntries) {
        await sqliteBackend.store(entry);
      }

      // Retrieve and verify all test data
      for (const entry of testEntries) {
        const retrieved = await sqliteBackend.retrieve(entry.id);
        assertExists(retrieved);
        assertEquals(retrieved!.content, entry.content);
      }
    });

    it('should update existing entries', async () => {
      const entry = createMemoryEntry({ content: 'initial content' });
      
      // Store initial entry
      await sqliteBackend.store(entry);
      const initial = await sqliteBackend.retrieve(entry.id);
      assertExists(initial);
      
      // Update entry
      const updatedEntry = { ...entry, content: 'updated content', version: 2 };
      await sqliteBackend.update(entry.id, updatedEntry);
      const updated = await sqliteBackend.retrieve(entry.id);
      
      assertExists(updated);
      assertEquals(updated!.content, 'updated content');
      assertEquals(updated!.version, 2);
    });

    it('should delete entries', async () => {
      const entry = createMemoryEntry({ content: 'to be deleted' });
      
      await sqliteBackend.store(entry);
      const stored = await sqliteBackend.retrieve(entry.id);
      assertExists(stored);
      
      await sqliteBackend.delete(entry.id);
      const deleted = await sqliteBackend.retrieve(entry.id);
      assertEquals(deleted, undefined);
    });

    it('should handle non-existent entries', async () => {
      const nonExistentId = 'non-existent-id';
      const result = await sqliteBackend.retrieve(nonExistentId);
      assertEquals(result, undefined);
    });

    it('should query entries by agent', async () => {
      const agent1Entry = createMemoryEntry({ agentId: 'agent-1', content: 'Agent 1 content' });
      const agent2Entry = createMemoryEntry({ agentId: 'agent-2', content: 'Agent 2 content' });
      
      await sqliteBackend.store(agent1Entry);
      await sqliteBackend.store(agent2Entry);
      
      const agent1Results = await sqliteBackend.query({ agentId: 'agent-1' });
      assertEquals(agent1Results.length, 1);
      assertEquals(agent1Results[0].content, 'Agent 1 content');
    });

    it('should get health status', async () => {
      const health = await sqliteBackend.getHealthStatus();
      assertEquals(health.healthy, true);
      assertExists(health.metrics);
      assertExists(health.metrics!.totalEntries);
    });
  });

  describe('Markdown Backend', () => {
    it('should store and retrieve memory entries as markdown', async () => {
      const entry = createMemoryEntry({
        content: 'Hello **World** test content',
        tags: ['test', 'markdown'],
        context: { source: 'unit-test' }
      });

      await markdownBackend.store(entry);
      const retrieved = await markdownBackend.retrieve(entry.id);

      assertExists(retrieved);
      assertEquals(retrieved!.content, entry.content);
      assertEquals(retrieved!.tags, entry.tags);
      assertEquals(retrieved!.context, entry.context);
      assertEquals(retrieved!.id, entry.id);
    });

    it('should handle different content types', async () => {
      const testEntries = [
        createMemoryEntry({ content: '# Header\nMarkdown content' }),
        createMemoryEntry({ content: 'Plain text content' }),
        createMemoryEntry({ content: '- List item 1\n- List item 2' }),
      ];

      // Store all test data
      for (const entry of testEntries) {
        await markdownBackend.store(entry);
      }

      // Retrieve and verify all test data
      for (const entry of testEntries) {
        const retrieved = await markdownBackend.retrieve(entry.id);
        assertExists(retrieved);
        assertEquals(retrieved!.content, entry.content);
      }
    });

    it('should delete entries', async () => {
      const entry = createMemoryEntry({ content: 'to be deleted' });
      
      await markdownBackend.store(entry);
      const stored = await markdownBackend.retrieve(entry.id);
      assertExists(stored);
      
      await markdownBackend.delete(entry.id);
      const deleted = await markdownBackend.retrieve(entry.id);
      assertEquals(deleted, undefined);
    });

    it('should handle non-existent entries', async () => {
      const nonExistentId = 'non-existent-id';
      const result = await markdownBackend.retrieve(nonExistentId);
      assertEquals(result, undefined);
    });

    it('should get health status', async () => {
      const health = await markdownBackend.getHealthStatus();
      assertEquals(health.healthy, true);
      assertExists(health.metrics);
    });
  });
});