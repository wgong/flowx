/**
 * Integration tests for the complete memory system
 * Tests NeuralMemorySystem, MemoryAnalyticsEngine, and MemoryCompressionEngine working together
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventBus } from '../../src/core/event-bus.js';
import { Logger } from '../../src/core/logger.js';
import { MemoryManager } from '../../src/memory/manager.js';
import { NeuralMemorySystem } from '../../src/memory/neural-memory.js';
import { MemoryAnalyticsEngine } from '../../src/memory/memory-analytics.js';
import { MemoryCompressionEngine } from '../../src/memory/memory-compression.js';
import type { MemoryEntry, MemoryQuery, MemoryConfig } from '../../src/utils/types.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Mock the base memory manager for integration tests
jest.mock('../../src/memory/manager.js');

describe('Memory System Integration', () => {
  let eventBus: EventBus;
  let logger: Logger;
  let mockMemoryManager: jest.Mocked<MemoryManager>;
  let neuralMemory: NeuralMemorySystem;
  let analyticsEngine: MemoryAnalyticsEngine;
  let compressionEngine: MemoryCompressionEngine;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join('./.tmp', `memory-integration-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create real instances
    eventBus = EventBus.getInstance();
    logger = new Logger({
      level: 'info',
      format: 'json',
      destination: 'console'
    });

    // Create mock memory manager
    mockMemoryManager = {
      initialize: jest.fn(),
      shutdown: jest.fn(),
      createBank: jest.fn(),
      closeBank: jest.fn(),
      store: jest.fn(),
      retrieve: jest.fn(),
      query: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getHealthStatus: jest.fn(),
      performMaintenance: jest.fn()
    } as any;

    // Configure neural memory system
    const neuralConfig = {
      backend: 'sqlite' as const,
      cacheSizeMB: 16,
      syncInterval: 1000,
      conflictResolution: 'last-write' as const,
      retentionDays: 30,
      enableNeuralPatterns: true,
      enableAdaptiveLearning: true,
      patternRecognitionThreshold: 0.7,
      learningRate: 0.1,
      maxPatterns: 1000,
      neuralTrainingInterval: 60000 // 1 minute for tests
    };

    // Create system components
    neuralMemory = new NeuralMemorySystem(neuralConfig, eventBus, logger);
    analyticsEngine = new MemoryAnalyticsEngine(mockMemoryManager, logger, neuralMemory);
    compressionEngine = new MemoryCompressionEngine({
      enabled: true,
      threshold: 1024,
      algorithm: 'gzip',
      level: 6,
      enableAdaptive: true
    }, logger);

    // Initialize components
    mockMemoryManager.query.mockResolvedValue([]);
    await neuralMemory.initialize();
  });

  afterEach(async () => {
    await neuralMemory.shutdown();
    
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Memory Operations', () => {
    it('should perform complete memory lifecycle with neural learning and compression', async () => {
      // Create test data
      const largeContent = 'This is a large content entry that should be compressed. '.repeat(100);
      const testEntry: MemoryEntry = {
        id: 'integration-test-entry',
        agentId: 'test-agent',
        sessionId: 'test-session',
        type: 'artifact',
        content: largeContent,
        context: { integration: true },
        timestamp: new Date(),
        tags: ['integration', 'test', 'large'],
        version: 1
      };

      // Step 1: Compress the entry
      const { entry: compressedEntry, result: compressionResult } = await compressionEngine.compressEntry(testEntry);
      
      expect(compressionResult.compressed).toBe(true);
      expect(compressionResult.compressionRatio).toBeGreaterThan(1);
      expect(compressedEntry.metadata?.compressed).toBe(true);

      // Step 2: Store through neural memory system
      mockMemoryManager.store.mockResolvedValue();
      await neuralMemory.store(compressedEntry);

      expect(mockMemoryManager.store).toHaveBeenCalledWith(compressedEntry);
      
      // Should have learned from the store operation
      const learningEvents = (neuralMemory as any).learningEvents;
      expect(learningEvents.length).toBeGreaterThan(0);
      expect(learningEvents[0].operation).toBe('store');

      // Step 3: Simulate retrieval
      mockMemoryManager.retrieve.mockResolvedValue(compressedEntry);
      const retrievedEntry = await neuralMemory.retrieve('integration-test-entry');

      expect(retrievedEntry).toEqual(compressedEntry);
      expect(learningEvents.length).toBe(2); // Store + retrieve learning

      // Step 4: Decompress the retrieved entry
      const decompressedEntry = await compressionEngine.decompressEntry(retrievedEntry!);
      
      expect(decompressedEntry.content).toBe(largeContent);
      expect(decompressedEntry.metadata?.compressed).toBe(false);

      // Step 5: Generate analytics
      mockMemoryManager.query.mockResolvedValue([decompressedEntry]);
      const analytics = await analyticsEngine.generateAnalytics();

      expect(analytics.overview.totalEntries).toBe(1);
      expect(analytics.patterns.commonTags).toContainEqual(
        expect.objectContaining({ tag: 'integration' })
      );
    });

    it('should handle batch operations with neural learning', async () => {
      const testEntries: MemoryEntry[] = [];
      
      // Create multiple test entries
      for (let i = 0; i < 5; i++) {
        testEntries.push({
          id: `batch-entry-${i}`,
          agentId: 'test-agent',
          sessionId: 'test-session',
          type: 'artifact',
          content: `Batch content ${i} `.repeat(200), // Make it compressible
          context: { batch: true, index: i },
          timestamp: new Date(),
          tags: ['batch', 'test', `entry-${i}`],
          version: 1
        });
      }

      // Step 1: Compress all entries
      const compressionResults = await compressionEngine.compressBatch(testEntries);
      
      expect(compressionResults).toHaveLength(5);
      compressionResults.forEach((result, index) => {
        expect(result.result.compressed).toBe(true);
        expect(result.entry.id).toBe(`batch-entry-${index}`);
      });

      // Step 2: Store all entries through neural memory
      mockMemoryManager.store.mockResolvedValue();
      
      for (const { entry } of compressionResults) {
        await neuralMemory.store(entry);
      }

      // Should have learned from all store operations
      const learningEvents = (neuralMemory as any).learningEvents;
      expect(learningEvents.length).toBe(5);
      
      // Step 3: Simulate queries for analytics
      const allEntries = compressionResults.map(r => r.entry);
      mockMemoryManager.query.mockResolvedValue(allEntries);

      // Track queries for analytics
      const batchQuery: MemoryQuery = { tags: ['batch'] };
      await analyticsEngine.trackQuery(batchQuery, 75);

      // Step 4: Generate analytics
      const analytics = await analyticsEngine.generateAnalytics();

      expect(analytics.overview.totalEntries).toBe(5);
      expect(analytics.patterns.commonTags).toContainEqual(
        expect.objectContaining({ tag: 'batch', frequency: 5 })
      );

      // Step 5: Get optimization suggestions
      const suggestions = await analyticsEngine.generateOptimizationSuggestions();
      
      // Should suggest compression (already implemented)
      const compressionSuggestion = suggestions.find(s => s.type === 'compression');
      expect(compressionSuggestion).toBeDefined();
    });
  });

  describe('Neural Pattern Recognition with Compression', () => {
    it('should recognize patterns in compressed data operations', async () => {
      // Create similar operations that should form a pattern
      const operations = [
        { operation: 'store', context: { type: 'artifact', compressed: true, size: 5000 } },
        { operation: 'store', context: { type: 'artifact', compressed: true, size: 4800 } },
        { operation: 'store', context: { type: 'artifact', compressed: true, size: 5200 } }
      ];

      // Learn from these operations
      for (const op of operations) {
        await neuralMemory.learnPattern(op.operation, op.context, 'success', {
          response_time: 50,
          compression_ratio: 3.2
        });
      }

      // Should recognize the pattern
      const patterns = await neuralMemory.getPatternsForContext(
        { type: 'artifact', compressed: true, size: 5100 },
        'coordination'
      );

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeGreaterThan(0.3);
    });

    it('should adapt compression based on neural patterns', async () => {
      // Create entries that compress well
      const compressibleEntries: MemoryEntry[] = [];
      
      for (let i = 0; i < 3; i++) {
        compressibleEntries.push({
          id: `compressible-${i}`,
          agentId: 'test-agent',
          sessionId: 'test-session',
          type: 'artifact',
          content: 'a'.repeat(2000), // Highly compressible
          context: { compressible: true },
          timestamp: new Date(),
          tags: ['compressible'],
          version: 1
        });
      }

      // Compress and learn from these entries
      for (const entry of compressibleEntries) {
        const { result } = await compressionEngine.compressEntry(entry);
        
        // Learn from successful compression
        await neuralMemory.learnPattern('compress', {
          type: entry.type,
          size: entry.content.length,
          compressible: true
        }, 'success', {
          compression_ratio: result.compressionRatio,
          space_saved: result.originalSize - result.compressedSize
        });
      }

      // Neural memory should have learned about compression patterns
      const compressionPatterns = await neuralMemory.getPatternsForContext(
        { type: 'artifact', compressible: true },
        'learning'
      );

      expect(compressionPatterns.length).toBeGreaterThan(0);
      
      // Get compression metrics
      const compressionMetrics = compressionEngine.getMetrics();
      expect(compressionMetrics.totalCompressions).toBe(3);
      expect(compressionMetrics.averageCompressionRatio).toBeGreaterThan(1);
    });
  });

  describe('Analytics with Neural Insights', () => {
    it('should provide enhanced analytics with neural pattern insights', async () => {
      // Create diverse test data
      const testData: MemoryEntry[] = [
        {
          id: 'frequent-pattern-1',
          agentId: 'agent-1',
          sessionId: 'session-1',
          type: 'artifact',
          content: 'Frequently accessed content',
          context: { access_pattern: 'frequent' },
          timestamp: new Date(),
          tags: ['frequent', 'pattern'],
          version: 1
        },
        {
          id: 'frequent-pattern-2',
          agentId: 'agent-1',
          sessionId: 'session-1',
          type: 'artifact',
          content: 'Another frequently accessed content',
          context: { access_pattern: 'frequent' },
          timestamp: new Date(),
          tags: ['frequent', 'pattern'],
          version: 1
        },
        {
          id: 'rare-pattern-1',
          agentId: 'agent-2',
          sessionId: 'session-2',
          type: 'observation',
          content: 'Rarely accessed content',
          context: { access_pattern: 'rare' },
          timestamp: new Date(),
          tags: ['rare'],
          version: 1
        }
      ];

      // Simulate storage and learning
      mockMemoryManager.store.mockResolvedValue();
      for (const entry of testData) {
        await neuralMemory.store(entry);
      }

      // Simulate frequent access to frequent patterns
      mockMemoryManager.retrieve.mockResolvedValue(testData[0]);
      for (let i = 0; i < 5; i++) {
        await neuralMemory.retrieve('frequent-pattern-1');
      }

      // Track analytics queries
      await analyticsEngine.trackQuery({ tags: ['frequent'] }, 30);
      await analyticsEngine.trackQuery({ tags: ['rare'] }, 100);

      // Generate analytics
      mockMemoryManager.query.mockResolvedValue(testData);
      const analytics = await analyticsEngine.generateAnalytics();

      // Should show patterns in the data
      expect(analytics.patterns.commonTags).toContainEqual(
        expect.objectContaining({ tag: 'frequent', frequency: 2 })
      );
      expect(analytics.patterns.commonTags).toContainEqual(
        expect.objectContaining({ tag: 'rare', frequency: 1 })
      );

      // Should show performance differences
      expect(analytics.performance.averageQueryTime).toBeGreaterThan(0);

      // Get neural analytics
      const neuralAnalytics = await neuralMemory.getMemoryAnalytics();
      expect(neuralAnalytics.learning_events).toBeGreaterThan(0);
      expect(neuralAnalytics.performance_trends.success_rate).toBeGreaterThan(0);
    });

    it('should generate optimization suggestions based on neural patterns', async () => {
      // Create data that should trigger optimization suggestions
      const oldEntries: MemoryEntry[] = [];
      
      // Create old entries that should be cleaned up
      for (let i = 0; i < 120; i++) {
        oldEntries.push({
          id: `old-entry-${i}`,
          agentId: 'agent-1',
          sessionId: 'session-1',
          type: 'artifact',
          content: `Old content ${i}`,
          context: { age: 'old' },
          timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          tags: ['old'],
          version: 1
        });
      }

      // Learn from accessing old data (should be slow)
      for (let i = 0; i < 10; i++) {
        await neuralMemory.learnPattern('retrieve', {
          type: 'artifact',
          age: 'old'
        }, 'success', {
          response_time: 200 + i * 10 // Slow responses
        });
      }

      // Set up analytics
      mockMemoryManager.query
        .mockResolvedValueOnce(oldEntries) // For generateAnalytics
        .mockResolvedValueOnce(oldEntries); // For findOldEntries

      // Generate optimization suggestions
      const suggestions = await analyticsEngine.generateOptimizationSuggestions();

      // Should suggest cleanup
      const cleanupSuggestion = suggestions.find(s => s.type === 'cleanup');
      expect(cleanupSuggestion).toBeDefined();
      expect(cleanupSuggestion?.priority).toBe('high');
      expect(cleanupSuggestion?.description).toContain('120 old entries found');

      // Neural patterns should influence suggestions
      const neuralAnalytics = await neuralMemory.getMemoryAnalytics();
      expect(neuralAnalytics.learning_events).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle component failures gracefully', async () => {
      // Simulate memory manager failure
      mockMemoryManager.store.mockRejectedValue(new Error('Storage failed'));

      const testEntry: MemoryEntry = {
        id: 'error-test-entry',
        agentId: 'test-agent',
        sessionId: 'test-session',
        type: 'artifact',
        content: 'Test content',
        context: {},
        timestamp: new Date(),
        tags: ['error-test'],
        version: 1
      };

      // Neural memory should handle the error
      await expect(neuralMemory.store(testEntry)).rejects.toThrow('Storage failed');

      // But compression should still work
      const { result } = await compressionEngine.compressEntry(testEntry);
      expect(result.compressed).toBe(false); // Below threshold
    });

    it('should maintain consistency across components during partial failures', async () => {
      // Create test data
      const testEntries: MemoryEntry[] = [];
      for (let i = 0; i < 3; i++) {
        testEntries.push({
          id: `consistency-test-${i}`,
          agentId: 'test-agent',
          sessionId: 'test-session',
          type: 'artifact',
          content: 'x'.repeat(1500), // Above compression threshold
          context: { consistency: true },
          timestamp: new Date(),
          tags: ['consistency'],
          version: 1
        });
      }

      // Compress all entries successfully
      const compressionResults = await compressionEngine.compressBatch(testEntries);
      expect(compressionResults).toHaveLength(3);

      // Simulate partial storage failure
      mockMemoryManager.store
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Storage failed')) // Second fails
        .mockResolvedValueOnce(undefined); // Third succeeds

      // Try to store all entries
      const storeResults = await Promise.allSettled(
        compressionResults.map(({ entry }) => neuralMemory.store(entry))
      );

      // Should have mixed results
      expect(storeResults[0].status).toBe('fulfilled');
      expect(storeResults[1].status).toBe('rejected');
      expect(storeResults[2].status).toBe('fulfilled');

      // Neural learning should still work for successful operations
      const learningEvents = (neuralMemory as any).learningEvents;
      expect(learningEvents.length).toBe(2); // Only successful stores learned

      // Compression metrics should be consistent
      const compressionMetrics = compressionEngine.getMetrics();
      expect(compressionMetrics.totalCompressions).toBe(3);
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance across integrated operations', async () => {
      const startTime = Date.now();
      
      // Create test data
      const testEntries: MemoryEntry[] = [];
      for (let i = 0; i < 20; i++) {
        testEntries.push({
          id: `perf-test-${i}`,
          agentId: 'test-agent',
          sessionId: 'test-session',
          type: 'artifact',
          content: `Performance test content ${i} `.repeat(100),
          context: { performance: true },
          timestamp: new Date(),
          tags: ['performance'],
          version: 1
        });
      }

      // Perform integrated operations
      const compressionResults = await compressionEngine.compressBatch(testEntries);
      
      mockMemoryManager.store.mockResolvedValue();
      const storePromises = compressionResults.map(({ entry }) => neuralMemory.store(entry));
      await Promise.all(storePromises);

      // Generate analytics
      mockMemoryManager.query.mockResolvedValue(testEntries);
      const analytics = await analyticsEngine.generateAnalytics();

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds

      // Should have processed all entries
      expect(analytics.overview.totalEntries).toBe(20);
      expect(compressionResults).toHaveLength(20);

      // Neural learning should be active
      const learningEvents = (neuralMemory as any).learningEvents;
      expect(learningEvents.length).toBe(20);

      // Compression should be effective
      const compressionMetrics = compressionEngine.getMetrics();
      expect(compressionMetrics.totalCompressions).toBe(20);
      expect(compressionMetrics.averageCompressionRatio).toBeGreaterThan(1);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect configuration changes across components', async () => {
      // Update compression configuration
      compressionEngine.updateConfig({
        threshold: 2048, // Increase threshold
        level: 9 // Maximum compression
      });

      // Update neural memory configuration (would need method)
      // For now, test that existing config is respected

      const testEntry: MemoryEntry = {
        id: 'config-test',
        agentId: 'test-agent',
        sessionId: 'test-session',
        type: 'artifact',
        content: 'x'.repeat(1500), // Between old and new threshold
        context: { config: true },
        timestamp: new Date(),
        tags: ['config'],
        version: 1
      };

      // Should not compress due to new threshold
      const { result } = await compressionEngine.compressEntry(testEntry);
      expect(result.compressed).toBe(false);
      expect(result.metadata.reason).toBe('below_threshold');

      // Neural memory should still work
      mockMemoryManager.store.mockResolvedValue();
      await neuralMemory.store(testEntry);

      const learningEvents = (neuralMemory as any).learningEvents;
      expect(learningEvents.length).toBe(1);
    });
  });
}); 