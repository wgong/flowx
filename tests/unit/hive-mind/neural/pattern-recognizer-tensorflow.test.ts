/**
 * Unit tests for TensorFlow Pattern Recognizer
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PatternRecognizer } from '../../../../src/hive-mind/neural/pattern-recognizer';
import { EventBus } from '../../../../src/core/event-bus';
import { DatabaseManager } from '../../../../src/hive-mind/database/database-manager';

// Mock dependencies  
jest.mock('../../../../src/core/event-bus');
jest.mock('../../../../src/hive-mind/database/database-manager');
jest.mock('../../../../src/core/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    configure: jest.fn(() => Promise.resolve()),
    child: jest.fn(() => mockLogger)
  };
  
  const MockLogger: any = jest.fn(() => mockLogger);
  MockLogger.getInstance = jest.fn(() => mockLogger);
  
  return {
    Logger: MockLogger,
    LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }
  };
});

describe('PatternRecognizer with TensorFlow', () => {
  let patternRecognizer: PatternRecognizer;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;

  beforeEach(async () => {
    // Create mock instances
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    mockDatabaseManager = {
      query: jest.fn(),
      execute: jest.fn(),
      getNeuralPatterns: jest.fn(),
      updateNeuralPatternUsage: jest.fn(),
      cleanupNeuralPatterns: jest.fn(),
    } as any;

    // Create pattern recognizer instance
    patternRecognizer = new PatternRecognizer(
      mockDatabaseManager,
      mockEventBus,
      {
        confidenceThreshold: 0.7,
        learningRate: 0.01,
        maxPatterns: 1000,
        adaptiveThreshold: true,
        enableWASM: false,
        cognitiveModels: [],
        useTensorFlow: true,
        tensorFlowModels: {
          coordination: {
            modelType: 'dense',
            layers: [64, 32, 16],
            learningRate: 0.01,
            patternType: 'coordination',
            modelName: 'coordination-patterns',
            epochs: 20,
            batchSize: 32,
            validationSplit: 0.2,
            featureCount: 64,
            outputClasses: 1
          },
          optimization: {
            modelType: 'dense',
            layers: [128, 64, 32],
            learningRate: 0.01,
            patternType: 'optimization',
            modelName: 'optimization-patterns',
            epochs: 30,
            batchSize: 32,
            validationSplit: 0.2,
            featureCount: 64,
            outputClasses: 1
          },
          prediction: {
            modelType: 'recurrent',
            layers: [64, 32],
            learningRate: 0.01,
            patternType: 'prediction',
            modelName: 'prediction-patterns',
            epochs: 25,
            batchSize: 32,
            validationSplit: 0.2,
            featureCount: 64,
            outputClasses: 1
          },
          behavior: {
            modelType: 'dense',
            layers: [128, 64, 32],
            learningRate: 0.01,
            patternType: 'behavior',
            modelName: 'behavior-patterns',
            epochs: 20,
            batchSize: 32,
            validationSplit: 0.2,
            featureCount: 64,
            outputClasses: 1
          }
        }
      }
    );

    // Mock TensorFlow models by directly setting them on the instance
    const mockTensorFlowModel = {
      predict: jest.fn(() => Promise.resolve([0.8])),
      initialize: jest.fn(() => Promise.resolve()),
      train: jest.fn(() => Promise.resolve({ history: { loss: [0.1], accuracy: [0.9] } })),
      getStatus: jest.fn(() => ({ trained: true, modelName: 'test-model' }))
    } as any;

    // Set mock TensorFlow models for each pattern type
    (patternRecognizer as any).tfModels = new Map([
      ['coordination', mockTensorFlowModel],
      ['optimization', mockTensorFlowModel],
      ['prediction', mockTensorFlowModel],
      ['behavior', mockTensorFlowModel]
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pattern recognition', () => {
    it('should recognize patterns using TensorFlow models', async () => {
      const inputData = {
        type: 'coordination',
        data: [1, 2, 3, 4, 5],
        metadata: { source: 'test' }
      };

      // Mock existing patterns for TensorFlow processing
      mockDatabaseManager.getNeuralPatterns.mockResolvedValue([
        {
          id: 'pattern-123',
          swarm_id: 'test-swarm',
          pattern_type: 'coordination',
          pattern_data: JSON.stringify(['sequential', 'increasing']),
          confidence: 0.85,
          usage_count: 10,
          success_rate: 0.9,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.85
        }
      ]);

      const result = await patternRecognizer.recognizePattern('test-swarm', inputData, 'coordination');

      expect(result).toHaveLength(1);
      expect(result[0].patternId).toBe('pattern-123');
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
      expect(result[0].modelName).toBe('tensorflow-coordination');
    });

    it('should handle multiple pattern matches', async () => {
      const inputData = {
        type: 'coordination',
        data: [0.8, 0.2, 0.9, 0.1],
        metadata: { category: 'behavior' }
      };

      // Mock multiple existing patterns
      mockDatabaseManager.getNeuralPatterns.mockResolvedValue([
        {
          id: 'pattern-456',
          swarm_id: 'test-swarm',
          pattern_type: 'coordination',
          pattern_data: JSON.stringify(['high_confidence', 'behavior']),
          confidence: 0.92,
          usage_count: 15,
          success_rate: 0.95,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.92
        },
        {
          id: 'pattern-789',
          swarm_id: 'test-swarm',
          pattern_type: 'coordination',
          pattern_data: JSON.stringify(['medium_confidence']),
          confidence: 0.78,
          usage_count: 8,
          success_rate: 0.8,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.78
        }
      ]);

      const result = await patternRecognizer.recognizePattern('test-swarm', inputData, 'coordination');

      expect(result).toHaveLength(2);
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
      expect(result[1].confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should filter patterns by confidence threshold', async () => {
      const inputData = {
        type: 'optimization',
        data: [0.5, 0.3, 0.8],
        metadata: { threshold: 0.7 }
      };

      // Mock patterns with varying confidence levels
      mockDatabaseManager.getNeuralPatterns.mockResolvedValue([
        {
          id: 'pattern-high',
          swarm_id: 'test-swarm',
          pattern_type: 'optimization',
          pattern_data: JSON.stringify(['high_confidence']),
          confidence: 0.85,
          usage_count: 20,
          success_rate: 0.9,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.85
        },
        {
          id: 'pattern-low',
          swarm_id: 'test-swarm',
          pattern_type: 'optimization',
          pattern_data: JSON.stringify(['low_confidence']),
          confidence: 0.65,
          usage_count: 5,
          success_rate: 0.6,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.65
        }
      ]);

      const result = await patternRecognizer.recognizePattern('test-swarm', inputData, 'optimization');

      // Should only return patterns above threshold (0.7)
      expect(result.length).toBeGreaterThan(0);
      result.forEach(match => {
        expect(match.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });
  });

  describe('pattern learning', () => {
    it('should update pattern usage statistics', async () => {
      mockDatabaseManager.updateNeuralPatternUsage.mockResolvedValue(undefined);

      await patternRecognizer.updatePatternUsage('pattern-123', true);

      expect(mockDatabaseManager.updateNeuralPatternUsage).toHaveBeenCalledWith(
        'pattern-123',
        true
      );
    });
  });

  describe('TensorFlow model integration', () => {
    it('should use TensorFlow models for pattern matching', async () => {
      const inputData = {
        type: 'coordination',
        data: [1, 2, 3, 4, 5, 6],
        metadata: { tensorFlow: true }
      };

      mockDatabaseManager.getNeuralPatterns.mockResolvedValue([
        {
          id: 'tf-pattern-001',
          swarm_id: 'test-swarm',
          pattern_type: 'coordination',
          pattern_data: JSON.stringify(['tensorflow', 'coordination', 'high_accuracy']),
          confidence: 0.88,
          usage_count: 25,
          success_rate: 0.92,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.88
        }
      ]);

      const result = await patternRecognizer.recognizePattern('test-swarm', inputData, 'coordination');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].modelName).toBe('tensorflow-coordination');
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle TensorFlow model errors gracefully', async () => {
      const inputData = {
        type: 'coordination',
        data: 'not-array',
        metadata: { test: true }
      };

      mockDatabaseManager.getNeuralPatterns.mockRejectedValue(new Error('TensorFlow model error'));

      const result = await patternRecognizer.recognizePattern('test-swarm', inputData, 'coordination');
      
      // Should return empty array on error, not throw
      expect(result).toEqual([]);
    });
  });

  describe('pattern optimization', () => {
    it('should optimize patterns based on usage statistics', async () => {
      mockDatabaseManager.getNeuralPatterns.mockResolvedValue([
        {
          id: 'pattern-optimize',
          swarm_id: 'test-swarm',
          pattern_type: 'coordination',
          pattern_data: JSON.stringify(['optimization']),
          confidence: 0.85,
          usage_count: 100,
          success_rate: 0.95,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.85
        }
      ]);

      await patternRecognizer.optimizePatterns('test-swarm');

      expect(mockDatabaseManager.getNeuralPatterns).toHaveBeenCalled();
    });

    it('should remove low-performing patterns', async () => {
      mockDatabaseManager.getNeuralPatterns.mockResolvedValue([
        {
          id: 'pattern-poor',
          swarm_id: 'test-swarm',
          pattern_type: 'coordination',
          pattern_data: JSON.stringify(['poor_performance']),
          confidence: 0.3,
          usage_count: 5,
          success_rate: 0.2,
          created_at: new Date().toISOString(),
          model_version: '1.0',
          validation_score: 0.3
        }
      ]);

      await patternRecognizer.optimizePatterns('test-swarm');

      expect(mockDatabaseManager.cleanupNeuralPatterns).toHaveBeenCalledWith('test-swarm', 0.7);
    });
  });

  describe('pattern status and metrics', () => {
    it('should return pattern recognizer status', () => {
      const status = patternRecognizer.getStatus();

      expect(status).toEqual({
        activeModels: expect.any(Number),
        bufferSizes: expect.any(Object),
        config: expect.any(Object),
        tensorFlowEnabled: expect.any(Boolean),
        tensorFlowModels: expect.any(Number),
        wasmEnabled: expect.any(Boolean)
      });
    });
  });
});