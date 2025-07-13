/**
 * Unit tests for TensorFlow model integration
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TensorFlowModel } from '../../../../src/hive-mind/neural/tensorflow-model.js';
import { EventBus } from '../../../../src/core/event-bus.js';
import { PatternType } from '../../../../src/hive-mind/neural/index.js';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs-node', () => ({
  sequential: jest.fn(),
  layers: {
    dense: jest.fn(),
    dropout: jest.fn(),
    activation: jest.fn(),
  },
  compile: jest.fn(),
  fit: jest.fn(),
  predict: jest.fn(),
  loadLayersModel: jest.fn(),
  save: jest.fn(),
  tensor: jest.fn(),
  dispose: jest.fn(),
}));

describe('TensorFlowModel', () => {
  let model: TensorFlowModel;
  let mockEventBus: any;
  let mockTensorFlow: any;

  beforeEach(() => {
    mockEventBus = EventBus.getInstance();
    mockTensorFlow = require('@tensorflow/tfjs-node');
    
    // Reset mocks
    jest.clearAllMocks();

    // Create model - the Logger mock from jest.setup.js should handle this
    model = new TensorFlowModel({
      modelType: 'dense',
      layers: [64, 32, 16],
      learningRate: 0.01,
      patternType: 'coordination' as PatternType,
      modelName: 'test-model',
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
      featureCount: 10,
      outputClasses: 3,
    }, mockEventBus);
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(model).toBeDefined();
      
      const status = model.getStatus();
      expect(status.modelName).toBe('test-model');
      expect(status.patternType).toBe('coordination');
      expect(status.modelType).toBe('dense');
      expect(status.layers).toEqual([64, 32, 16]);
      expect(status.trained).toBe(false);
    });

    it('should build model architecture correctly', async () => {
      // Test that the model can be initialized without errors
      expect(() => model.initialize()).not.toThrow();
    });
  });

  describe('training', () => {
    it('should train model with provided data', async () => {
      const trainingData = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
      const labels = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

      const result = await model.train(trainingData, labels);
      
      expect(result).toBeDefined();
      expect(result?.history).toBeDefined();
      
      const status = model.getStatus();
      expect(status.trained).toBe(true);
    });

    it('should handle training errors', async () => {
      const invalidData: any = null;
      const invalidLabels: any = null;

      await expect(model.train(invalidData, invalidLabels)).rejects.toThrow();
    });
  });

  describe('prediction', () => {
    it('should make predictions with trained model', async () => {
      // First train the model
      const trainingData = [[1, 2, 3], [4, 5, 6]];
      const labels = [[1, 0, 0], [0, 1, 0]];
      await model.train(trainingData, labels);

      const inputData = [1, 2, 3];
      const prediction = await model.predict(inputData);
      
      expect(prediction).toBeDefined();
      expect(Array.isArray(prediction)).toBe(true);
    });

    it('should handle prediction errors', async () => {
      const invalidInput: any = null;
      
      await expect(model.predict(invalidInput)).rejects.toThrow();
    });
  });

  describe('model metadata', () => {
    it('should return model information', () => {
      const status = model.getStatus();
      
      expect(status).toHaveProperty('modelName');
      expect(status).toHaveProperty('patternType');
      expect(status).toHaveProperty('modelType');
      expect(status).toHaveProperty('layers');
      expect(status).toHaveProperty('trained');
      expect(status).toHaveProperty('trainingHistory');
      expect(status).toHaveProperty('normalized');
    });

    it('should return training statistics after training', async () => {
      const trainingData = [[1, 2, 3], [4, 5, 6]];
      const labels = [[1, 0, 0], [0, 1, 0]];
      
      await model.train(trainingData, labels);
      
      const status = model.getStatus();
      expect(status.trained).toBe(true);
      expect(status.trainingHistory).toBeDefined();
    });
  });
});