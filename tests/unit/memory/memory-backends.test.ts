/**
 * Comprehensive unit tests for Memory Backends (SQLite and Markdown)
 * Updated to include neural memory capabilities and compression features
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MemoryEntry } from '../../../src/utils/types';
import { tmpdir } from 'os';
import { join } from 'path';

// Mock fs.promises
const mockFs = {
  mkdtemp: jest.fn(() => Promise.resolve('/tmp/mock-test-dir')),
  rm: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('mock content')),
  access: jest.fn(() => Promise.resolve()),
  readdir: jest.fn(() => Promise.resolve([])),
  stat: jest.fn(() => Promise.resolve({ isDirectory: () => false })),
  unlink: jest.fn(() => Promise.resolve())
};

jest.mock('fs', () => ({
  promises: mockFs,
  default: { promises: mockFs }
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path: string) => path.split('/').pop() || ''),
  extname: jest.fn((path: string) => path.includes('.') ? '.' + path.split('.').pop() : '')
}));

// Import after mocking fs
import { SQLiteBackend } from '../../../src/memory/backends/sqlite';
import { MarkdownBackend } from '../../../src/memory/backends/markdown';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  configure: jest.fn(() => Promise.resolve())
} as any;

function createMemoryEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 'test-entry-id',
    agentId: 'test-agent',
    sessionId: 'test-session',
    type: 'artifact',
    content: 'Test content',
    context: { test: true },
    timestamp: new Date(),
    tags: ['test'],
    version: 1,
    ...overrides
  };
}

describe('Memory Backends', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = '/tmp/mock-test-dir';
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup is mocked
  });

  describe('SQLiteBackend', () => {
    let backend: SQLiteBackend;

    beforeEach(async () => {
      backend = new SQLiteBackend(join(tempDir, 'test.db'), mockLogger);
    });

    it('should store and retrieve entries', async () => {
      const entry = createMemoryEntry();
      
      await backend.store(entry);
      const retrieved = await backend.retrieve(entry.id);
      
      expect(retrieved).toEqual(entry);
    });

    it('should handle compressed entries', async () => {
      const compressedEntry = createMemoryEntry({
        content: 'compressed-data-base64',
        metadata: {
          compressed: true,
          compressionAlgorithm: 'gzip',
          originalSize: 5000,
          compressedSize: 1500,
          compressionRatio: 3.33
        }
      });
      
      await backend.store(compressedEntry);
      const retrieved = await backend.retrieve(compressedEntry.id);
      
      expect(retrieved).toEqual(compressedEntry);
      expect(retrieved?.metadata?.compressed).toBe(true);
      expect(retrieved?.metadata?.compressionAlgorithm).toBe('gzip');
    });

    it('should handle neural pattern entries', async () => {
      const neuralPatternEntry = createMemoryEntry({
        id: 'pattern-neural-123',
        type: 'artifact',
        content: JSON.stringify({
          id: 'neural-pattern-1',
          type: 'coordination',
          pattern: { operation: 'store', context: { namespace: 'test' } },
          confidence: 0.8,
          frequency: 10,
          success_rate: 0.9
        }),
        tags: ['neural', 'pattern', 'coordination'],
        metadata: {
          isNeuralPattern: true,
          patternType: 'coordination'
        }
      });
      
      await backend.store(neuralPatternEntry);
      const retrieved = await backend.retrieve(neuralPatternEntry.id);
      
      expect(retrieved).toEqual(neuralPatternEntry);
      expect(retrieved?.metadata?.isNeuralPattern).toBe(true);
      expect(retrieved?.tags).toContain('neural');
    });

    it('should query entries by neural pattern tags', async () => {
      const entries = [
        createMemoryEntry({ id: 'entry-1', tags: ['neural', 'pattern'] }),
        createMemoryEntry({ id: 'entry-2', tags: ['neural', 'learning'] }),
        createMemoryEntry({ id: 'entry-3', tags: ['normal'] })
      ];
      
      for (const entry of entries) {
        await backend.store(entry);
      }
      
      const neuralEntries = await backend.query({ tags: ['neural'] });
      expect(neuralEntries).toHaveLength(2);
      expect(neuralEntries.map(e => e.id)).toContain('entry-1');
      expect(neuralEntries.map(e => e.id)).toContain('entry-2');
    });

    it('should handle analytics metadata', async () => {
      const analyticsEntry = createMemoryEntry({
        metadata: {
          analytics: {
            accessCount: 5,
            lastAccessed: new Date(),
            queryTime: 50,
            compressionRatio: 2.5
          }
        }
      });
      
      await backend.store(analyticsEntry);
      const retrieved = await backend.retrieve(analyticsEntry.id);
      
      expect(retrieved?.metadata?.analytics).toBeDefined();
      expect(retrieved?.metadata?.analytics?.accessCount).toBe(5);
    });

    it('should support batch operations for neural patterns', async () => {
      const neuralEntries = Array.from({ length: 10 }, (_, i) => 
        createMemoryEntry({
          id: `neural-${i}`,
          tags: ['neural', 'batch'],
          metadata: { isNeuralPattern: true, batchId: 'batch-1' }
        })
      );
      
      // Store all entries
      for (const entry of neuralEntries) {
        await backend.store(entry);
      }
      
      // Query batch
      const batchEntries = await backend.query({ tags: ['batch'] });
      expect(batchEntries).toHaveLength(10);
      
      // All should have neural metadata
      batchEntries.forEach(entry => {
        expect(entry.metadata?.isNeuralPattern).toBe(true);
        expect(entry.metadata?.batchId).toBe('batch-1');
      });
    });

    it('should handle large compressed entries efficiently', async () => {
      const largeCompressedEntry = createMemoryEntry({
        id: 'large-compressed',
        content: 'x'.repeat(1000), // Simulate compressed data
        metadata: {
          compressed: true,
          compressionAlgorithm: 'gzip',
          originalSize: 50000,
          compressedSize: 1000,
          compressionRatio: 50
        }
      });
      
      const startTime = Date.now();
      await backend.store(largeCompressedEntry);
      const retrieved = await backend.retrieve(largeCompressedEntry.id);
      const endTime = Date.now();
      
      expect(retrieved).toEqual(largeCompressedEntry);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('MarkdownBackend', () => {
    let backend: MarkdownBackend;

    beforeEach(async () => {
      backend = new MarkdownBackend({
        directory: tempDir,
        fileExtension: '.md',
        enableFrontmatter: true,
        enableSearch: true
      }, mockLogger);
    });

    it('should store and retrieve entries with neural metadata', async () => {
      const neuralEntry = createMemoryEntry({
        metadata: {
          isNeuralPattern: true,
          patternType: 'learning',
          confidence: 0.85,
          frequency: 15
        }
      });
      
      await backend.store(neuralEntry);
      const retrieved = await backend.retrieve(neuralEntry.id);
      
      expect(retrieved).toEqual(neuralEntry);
      expect(retrieved?.metadata?.isNeuralPattern).toBe(true);
      expect(retrieved?.metadata?.confidence).toBe(0.85);
    });

    it('should handle compressed content in markdown format', async () => {
      const compressedEntry = createMemoryEntry({
        content: 'base64-compressed-content',
        metadata: {
          compressed: true,
          compressionAlgorithm: 'gzip',
          originalSize: 10000,
          compressedSize: 2000
        }
      });
      
      await backend.store(compressedEntry);
      const retrieved = await backend.retrieve(compressedEntry.id);
      
      expect(retrieved).toEqual(compressedEntry);
      expect(retrieved?.metadata?.compressed).toBe(true);
    });

    it('should support frontmatter for neural patterns', async () => {
      const patternEntry = createMemoryEntry({
        id: 'pattern-frontmatter-test',
        tags: ['neural', 'pattern', 'frontmatter'],
        metadata: {
          isNeuralPattern: true,
          patternType: 'optimization',
          confidence: 0.92,
          lastUsed: new Date(),
          frequency: 25
        }
      });
      
      await backend.store(patternEntry);
      const retrieved = await backend.retrieve(patternEntry.id);
      
      expect(retrieved).toEqual(patternEntry);
      expect(retrieved?.tags).toContain('neural');
      expect(retrieved?.metadata?.patternType).toBe('optimization');
    });

    it('should query neural patterns by metadata', async () => {
      const patterns = [
        createMemoryEntry({ 
          id: 'pattern-1', 
          tags: ['neural', 'coordination'],
          metadata: { patternType: 'coordination', confidence: 0.8 }
        }),
        createMemoryEntry({ 
          id: 'pattern-2', 
          tags: ['neural', 'optimization'],
          metadata: { patternType: 'optimization', confidence: 0.9 }
        }),
        createMemoryEntry({ 
          id: 'normal-entry', 
          tags: ['normal'] 
        })
      ];
      
      for (const pattern of patterns) {
        await backend.store(pattern);
      }
      
      const neuralPatterns = await backend.query({ tags: ['neural'] });
      expect(neuralPatterns).toHaveLength(2);
      
      const coordinationPatterns = await backend.query({ tags: ['coordination'] });
      expect(coordinationPatterns).toHaveLength(1);
      expect(coordinationPatterns[0].id).toBe('pattern-1');
    });

    it('should handle analytics data in markdown format', async () => {
      const analyticsEntry = createMemoryEntry({
        id: 'analytics-test',
        content: 'Analytics report content',
        metadata: {
          analytics: {
            generatedAt: new Date(),
            totalEntries: 1000,
            compressionRatio: 3.2,
            queryPerformance: {
              averageTime: 45,
              slowQueries: 5
            }
          }
        }
      });
      
      await backend.store(analyticsEntry);
      const retrieved = await backend.retrieve(analyticsEntry.id);
      
      expect(retrieved?.metadata?.analytics).toBeDefined();
      expect(retrieved?.metadata?.analytics?.totalEntries).toBe(1000);
      expect(retrieved?.metadata?.analytics?.compressionRatio).toBe(3.2);
    });

    it('should support search across neural patterns', async () => {
      const searchablePatterns = [
        createMemoryEntry({
          id: 'search-pattern-1',
          content: 'Neural pattern for coordination tasks',
          tags: ['neural', 'coordination', 'search'],
          metadata: { isNeuralPattern: true }
        }),
        createMemoryEntry({
          id: 'search-pattern-2',
          content: 'Neural pattern for optimization tasks',
          tags: ['neural', 'optimization', 'search'],
          metadata: { isNeuralPattern: true }
        })
      ];
      
      for (const pattern of searchablePatterns) {
        await backend.store(pattern);
      }
      
      const searchResults = await backend.query({ search: 'coordination' });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('search-pattern-1');
    });
  });

  describe('Backend Integration with Neural Features', () => {
    let sqliteBackend: SQLiteBackend;
    let markdownBackend: MarkdownBackend;

    beforeEach(async () => {
      sqliteBackend = new SQLiteBackend({
        path: join(tempDir, 'integration.db'),
        enableWAL: false
      }, mockLogger);
      
      markdownBackend = new MarkdownBackend({
        directory: join(tempDir, 'markdown'),
        enableFrontmatter: true
      }, mockLogger);
    });

    it('should handle neural patterns consistently across backends', async () => {
      const neuralPattern = createMemoryEntry({
        id: 'cross-backend-pattern',
        content: JSON.stringify({
          type: 'coordination',
          pattern: { operation: 'store', success_rate: 0.95 },
          confidence: 0.88
        }),
        tags: ['neural', 'pattern', 'coordination'],
        metadata: {
          isNeuralPattern: true,
          patternType: 'coordination'
        }
      });
      
      // Store in both backends
      await sqliteBackend.store(neuralPattern);
      await markdownBackend.store(neuralPattern);
      
      // Retrieve from both
      const sqliteResult = await sqliteBackend.retrieve(neuralPattern.id);
      const markdownResult = await markdownBackend.retrieve(neuralPattern.id);
      
      // Should be consistent
      expect(sqliteResult).toEqual(neuralPattern);
      expect(markdownResult).toEqual(neuralPattern);
      expect(sqliteResult?.metadata?.isNeuralPattern).toBe(true);
      expect(markdownResult?.metadata?.isNeuralPattern).toBe(true);
    });

    it('should handle compressed entries consistently', async () => {
      const compressedEntry = createMemoryEntry({
        id: 'cross-backend-compressed',
        content: 'compressed-base64-data',
        metadata: {
          compressed: true,
          compressionAlgorithm: 'gzip',
          originalSize: 8000,
          compressedSize: 2000,
          compressionRatio: 4.0
        }
      });
      
      // Store in both backends
      await sqliteBackend.store(compressedEntry);
      await markdownBackend.store(compressedEntry);
      
      // Retrieve from both
      const sqliteResult = await sqliteBackend.retrieve(compressedEntry.id);
      const markdownResult = await markdownBackend.retrieve(compressedEntry.id);
      
      // Should be consistent
      expect(sqliteResult).toEqual(compressedEntry);
      expect(markdownResult).toEqual(compressedEntry);
      expect(sqliteResult?.metadata?.compressed).toBe(true);
      expect(markdownResult?.metadata?.compressed).toBe(true);
    });

    it('should support analytics queries across backends', async () => {
      const analyticsEntries = [
        createMemoryEntry({
          id: 'analytics-1',
          tags: ['analytics', 'performance'],
          metadata: { analytics: { queryTime: 30 } }
        }),
        createMemoryEntry({
          id: 'analytics-2',
          tags: ['analytics', 'compression'],
          metadata: { analytics: { compressionRatio: 2.5 } }
        })
      ];
      
      // Store in both backends
      for (const entry of analyticsEntries) {
        await sqliteBackend.store(entry);
        await markdownBackend.store(entry);
      }
      
      // Query from both
      const sqliteAnalytics = await sqliteBackend.query({ tags: ['analytics'] });
      const markdownAnalytics = await markdownBackend.query({ tags: ['analytics'] });
      
      // Should return same results
      expect(sqliteAnalytics).toHaveLength(2);
      expect(markdownAnalytics).toHaveLength(2);
      
      const sqliteIds = sqliteAnalytics.map(e => e.id).sort();
      const markdownIds = markdownAnalytics.map(e => e.id).sort();
      expect(sqliteIds).toEqual(markdownIds);
    });
  });
});