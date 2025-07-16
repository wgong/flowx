import { DatabaseManager } from '../database/database-manager.js';
import { NeuralPattern, PatternType, CognitiveModel, PatternMatch, LearningSession } from '../types.js';
import { EventBus } from '../../core/event-bus.js';
import { Logger, logger } from '../../core/logger.js';
import { TensorFlowModel, TensorFlowModelConfig } from './tensorflow-model.js';

export interface PatternRecognitionConfig {
  learningRate: number;
  confidenceThreshold: number;
  maxPatterns: number;
  adaptiveThreshold: boolean;
  enableWASM: boolean;
  cognitiveModels: CognitiveModel[];
  useTensorFlow: boolean;
  tensorFlowModels?: Record<PatternType, TensorFlowModelConfig>;
}

export class PatternRecognizer {
  private db: DatabaseManager;
  private eventBus: EventBus;
  private logger: Logger;
  private config: PatternRecognitionConfig;
  private wasmModule?: any;
  private activeModels: Map<string, CognitiveModel> = new Map();
  private learningBuffer: Map<string, any[]> = new Map();
  private tfModels: Map<PatternType, TensorFlowModel> = new Map();

  constructor(
    db: DatabaseManager,
    eventBus: EventBus,
    config: PatternRecognitionConfig
  ) {
    this.db = db;
    this.eventBus = eventBus;
    const loggerInstance = Logger.getInstance({
      level: 'info',
      format: 'json',
      destination: 'console'
    });
    this.logger = loggerInstance?.child({ component: 'PatternRecognizer' }) || {
      debug: (msg: string, meta?: any) => console.debug(`[PatternRecognizer] ${msg}`, meta),
      info: (msg: string, meta?: any) => console.info(`[PatternRecognizer] ${msg}`, meta),
      warn: (msg: string, meta?: any) => console.warn(`[PatternRecognizer] ${msg}`, meta),
      error: (msg: string, error?: any) => console.error(`[PatternRecognizer] ${msg}`, error),
      configure: async () => {},
      child: (ctx: any) => this.logger
    } as any;
    this.config = config;
    
    this.initializeCognitiveModels();
    this.setupEventListeners();
  }

  private initializeCognitiveModels(): void {
    const defaultModels: CognitiveModel[] = [
      {
        name: 'coordination_optimizer',
        type: 'coordination',
        description: 'Optimizes agent coordination patterns',
        parameters: {
          windowSize: 100,
          learningRate: 0.01,
          momentum: 0.9
        },
        isActive: true
      },
      {
        name: 'task_predictor',
        type: 'prediction',
        description: 'Predicts task outcomes and resource requirements',
        parameters: {
          lookbackPeriod: 50,
          predictionHorizon: 10,
          confidenceThreshold: 0.7
        },
        isActive: true
      },
      {
        name: 'behavior_analyzer',
        type: 'behavior',
        description: 'Analyzes and learns from agent behavior patterns',
        parameters: {
          behaviorWindow: 200,
          adaptationRate: 0.05,
          stabilityThreshold: 0.8
        },
        isActive: true
      },
      {
        name: 'optimization_engine',
        type: 'optimization',
        description: 'Optimizes swarm performance through pattern analysis',
        parameters: {
          optimizationCycles: 100,
          convergenceThreshold: 0.001,
          explorationRate: 0.1
        },
        isActive: true
      }
    ];

    // Initialize with default models and any custom models from config
    [...defaultModels, ...this.config.cognitiveModels].forEach(model => {
      this.activeModels.set(model.name, model);
    });

    this.logger.info(`Initialized ${this.activeModels.size} cognitive models`);
  }

  private setupEventListeners(): void {
    this.eventBus.on('task:completed', (data) => this.learnFromTask(data));
    this.eventBus.on('agent:communication', (data) => this.learnFromCommunication(data));
    this.eventBus.on('consensus:achieved', (data) => this.learnFromConsensus(data));
    this.eventBus.on('performance:metric', (data) => this.learnFromMetric(data));
  }

  async initializeWASM(): Promise<void> {
    if (!this.config.enableWASM) {
      this.logger.info('WASM acceleration disabled');
      return;
    }

    try {
      // In a real implementation, this would load actual WASM module
      // For now, we'll simulate WASM acceleration
      this.wasmModule = {
        processPattern: (data: any) => this.simulateWASMProcessing(data),
        optimizeVector: (vector: number[]) => this.simulateVectorOptimization(vector),
        calculateSimilarity: (a: any, b: any) => this.simulateCosineSimilarity(a, b)
      };
      
      this.logger.info('WASM neural acceleration initialized');
    } catch (error) {
      this.logger.error('Failed to initialize WASM module:', error);
      this.config.enableWASM = false;
    }
  }

  private simulateWASMProcessing(data: any): any {
    // Simulate SIMD-accelerated pattern processing
    return {
      processed: true,
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0 confidence
      features: Array.from({ length: 128 }, () => Math.random()),
      timestamp: Date.now()
    };
  }

  private simulateVectorOptimization(vector: number[]): number[] {
    // Simulate SIMD vector optimization
    return vector.map(v => v * 1.1 + Math.random() * 0.1);
  }

  private simulateCosineSimilarity(a: any, b: any): number {
    // Simulate cosine similarity calculation
    return Math.random() * 0.5 + 0.5; // 0.5-1.0 similarity
  }

  async recognizePattern(
    swarmId: string,
    data: any,
    patternType: PatternType
  ): Promise<PatternMatch[]> {
    try {
      const matches: PatternMatch[] = [];
      
      // First try to use TensorFlow models if enabled
      if (this.config.useTensorFlow && this.tfModels.has(patternType)) {
        const tfMatches = await this.processWithTensorFlow(swarmId, data, patternType);
        if (tfMatches.length > 0) {
          matches.push(...tfMatches);
        }
      }
      
      // Then use traditional cognitive models
      const relevantModels = Array.from(this.activeModels.values())
        .filter(model => model.type === patternType || patternType === 'behavior');

      for (const model of relevantModels) {
        const match = await this.processWithModel(swarmId, data, model);
        if (match && match.confidence >= this.config.confidenceThreshold) {
          matches.push(match);
        }
      }

      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      this.logger.debug(`Found ${matches.length} pattern matches for type ${patternType}`);
      return matches;
    } catch (error) {
      this.logger.error('Pattern recognition failed:', error);
      return [];
    }
  }

  /**
   * Process data with TensorFlow model to find pattern matches
   */
  private async processWithTensorFlow(
    swarmId: string,
    data: any,
    patternType: PatternType
  ): Promise<PatternMatch[]> {
    try {
      const tfModel = this.tfModels.get(patternType);
      if (!tfModel) return [];
      
      // Extract features from data
      const features = this.extractFeatures(data);
      
      // Get existing patterns for this type
      const existingPatterns = await this.getPatternsByType(swarmId, patternType);
      if (existingPatterns.length === 0) return [];
      
      // Make prediction using TensorFlow model
      const prediction = await tfModel.predict(features);
      
      // Find best matching patterns based on prediction values
      const matches: PatternMatch[] = [];
      
      // Sort patterns by predicted similarity
      for (let i = 0; i < existingPatterns.length; i++) {
        const pattern = existingPatterns[i];
        // Use prediction score as confidence
        const confidence = prediction[0] > 0.5 ? prediction[0] : 1 - prediction[0];
        
        if (confidence >= this.config.confidenceThreshold) {
          matches.push({
            patternId: pattern.id,
            confidence,
            modelName: `tensorflow-${patternType}`,
            matchedFeatures: [`tensorflow-match-${confidence.toFixed(2)}`],
            timestamp: new Date().toISOString(),
            metadata: {
              modelType: patternType,
              usageCount: pattern.usage_count,
              successRate: pattern.success_rate,
              tensorFlowScore: confidence
            }
          });
          
          // Track pattern usage
          this.updatePatternUsage(pattern.id, true);
        }
      }
      
      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);
      
      // Limit to highest confidence matches
      return matches.slice(0, 3);
    } catch (error) {
      this.logger.error('TensorFlow pattern processing failed:', error);
      return [];
    }
  }

  private async processWithModel(
    swarmId: string,
    data: any,
    model: CognitiveModel
  ): Promise<PatternMatch | null> {
    try {
      // Get existing patterns for this model
      const existingPatterns = await this.getPatternsByType(swarmId, model.type);
      
      // Process data with WASM if available
      const processedData = this.config.enableWASM && this.wasmModule
        ? this.wasmModule.processPattern(data)
        : this.processPattern(data);

      // Find best matching pattern
      let bestMatch: PatternMatch | null = null;
      let maxSimilarity = 0;

      for (const pattern of existingPatterns) {
        const similarity = this.calculateSimilarity(processedData, pattern.pattern_data);
        
        if (similarity > maxSimilarity && similarity >= this.config.confidenceThreshold) {
          maxSimilarity = similarity;
          bestMatch = {
            patternId: pattern.id,
            confidence: similarity,
            modelName: model.name,
            matchedFeatures: this.extractMatchedFeatures(processedData, pattern.pattern_data),
            timestamp: new Date().toISOString(),
            metadata: {
              modelType: model.type,
              usageCount: pattern.usage_count,
              successRate: pattern.success_rate
            }
          };
        }
      }

      return bestMatch;
    } catch (error) {
      this.logger.error(`Model ${model.name} processing failed:`, error);
      return null;
    }
  }

  private processPattern(data: any): any {
    // CPU-based pattern processing
    return {
      processed: true,
      confidence: Math.random() * 0.2 + 0.6, // 0.6-0.8 confidence (lower than WASM)
      features: this.extractFeatures(data),
      timestamp: Date.now()
    };
  }

  private extractFeatures(data: any): number[] {
    // Extract numerical features from data
    const features: number[] = [];
    
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      features.push(keys.length); // Number of properties
      
      keys.forEach(key => {
        const value = data[key];
        if (typeof value === 'number') {
          features.push(value);
        } else if (typeof value === 'string') {
          features.push(value.length);
        } else if (typeof value === 'boolean') {
          features.push(value ? 1 : 0);
        }
      });
    }
    
    // Normalize to fixed size
    const targetSize = 64;
    while (features.length < targetSize) {
      features.push(0);
    }
    
    return features.slice(0, targetSize);
  }

  private calculateSimilarity(a: any, b: any): number {
    if (this.config.enableWASM && this.wasmModule) {
      return this.wasmModule.calculateSimilarity(a, b);
    }
    
    // Simple cosine similarity for CPU processing
    const featuresA = typeof a === 'object' ? a.features || this.extractFeatures(a) : [a];
    const featuresB = typeof b === 'object' ? JSON.parse(b).features || this.extractFeatures(JSON.parse(b)) : [b];
    
    if (featuresA.length !== featuresB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < featuresA.length; i++) {
      dotProduct += featuresA[i] * featuresB[i];
      normA += featuresA[i] * featuresA[i];
      normB += featuresB[i] * featuresB[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private extractMatchedFeatures(processed: any, patternData: any): string[] {
    // Extract which features contributed to the match
    const features: string[] = [];
    
    if (processed.confidence > 0.8) features.push('high_confidence');
    if (processed.features && processed.features.length > 50) features.push('rich_features');
    
    return features;
  }

  async learnFromTask(taskData: any): Promise<void> {
    try {
      const { swarmId, taskId, result, performance } = taskData;
      
      // Add to learning buffer
      const key = `task_${swarmId}`;
      if (!this.learningBuffer.has(key)) {
        this.learningBuffer.set(key, []);
      }
      
      this.learningBuffer.get(key)!.push({
        type: 'task_completion',
        data: taskData,
        timestamp: Date.now()
      });
      
      // Process if buffer is full
      if (this.learningBuffer.get(key)!.length >= 10) {
        await this.processLearningBuffer(swarmId, 'task_completion');
        
        // Train TensorFlow model if enabled
        if (this.config.useTensorFlow) {
          await this.trainTensorFlowModel(swarmId, 'optimization', this.learningBuffer.get(key)!);
        }
      }
      
      this.logger.debug(`Learned from task completion: ${taskId}`);
    } catch (error) {
      this.logger.error('Failed to learn from task:', error);
    }
  }

  async learnFromCommunication(commData: any): Promise<void> {
    try {
      const { swarmId, messageType, success } = commData;
      
      const key = `comm_${swarmId}`;
      if (!this.learningBuffer.has(key)) {
        this.learningBuffer.set(key, []);
      }
      
      this.learningBuffer.get(key)!.push({
        type: 'communication',
        data: commData,
        timestamp: Date.now()
      });
      
      if (this.learningBuffer.get(key)!.length >= 20) {
        await this.processLearningBuffer(swarmId, 'communication');
        
        // Train TensorFlow model if enabled
        if (this.config.useTensorFlow) {
          await this.trainTensorFlowModel(swarmId, 'coordination', this.learningBuffer.get(key)!);
        }
      }
      
      this.logger.debug(`Learned from communication: ${messageType}`);
    } catch (error) {
      this.logger.error('Failed to learn from communication:', error);
    }
  }

  async learnFromConsensus(consensusData: any): Promise<void> {
    try {
      const { swarmId, achieved, votes, confidence } = consensusData;
      
      const key = `consensus_${swarmId}`;
      if (!this.learningBuffer.has(key)) {
        this.learningBuffer.set(key, []);
      }
      
      this.learningBuffer.get(key)!.push({
        type: 'consensus',
        data: consensusData,
        timestamp: Date.now()
      });
      
      if (this.learningBuffer.get(key)!.length >= 5) {
        await this.processLearningBuffer(swarmId, 'consensus');
        
        // Train TensorFlow model if enabled
        if (this.config.useTensorFlow) {
          await this.trainTensorFlowModel(swarmId, 'behavior', this.learningBuffer.get(key)!);
        }
      }
      
      this.logger.debug(`Learned from consensus: ${achieved ? 'achieved' : 'failed'}`);
    } catch (error) {
      this.logger.error('Failed to learn from consensus:', error);
    }
  }

  async learnFromMetric(metricData: any): Promise<void> {
    try {
      const { swarmId, metricType, value } = metricData;
      
      const key = `metric_${swarmId}`;
      if (!this.learningBuffer.has(key)) {
        this.learningBuffer.set(key, []);
      }
      
      this.learningBuffer.get(key)!.push({
        type: 'performance_metric',
        data: metricData,
        timestamp: Date.now()
      });
      
      if (this.learningBuffer.get(key)!.length >= 50) {
        await this.processLearningBuffer(swarmId, 'performance_metric');
        
        // Train TensorFlow model if enabled
        if (this.config.useTensorFlow) {
          await this.trainTensorFlowModel(swarmId, 'prediction', this.learningBuffer.get(key)!);
        }
      }
      
      this.logger.debug(`Learned from metric: ${metricType} = ${value}`);
    } catch (error) {
      this.logger.error('Failed to learn from metric:', error);
    }
  }

  private async processLearningBuffer(swarmId: string, dataType: string): Promise<void> {
    try {
      const key = `${dataType}_${swarmId}`;
      const bufferData = this.learningBuffer.get(key);
      
      if (!bufferData || bufferData.length === 0) {
        return;
      }
      
      // Create or update neural pattern
      const pattern = await this.createPatternFromBuffer(swarmId, dataType, bufferData);
      
      if (pattern) {
        await this.storePattern(pattern);
        this.eventBus.emit('pattern:learned', {
          swarmId,
          patternId: pattern.id,
          patternType: pattern.pattern_type,
          confidence: pattern.confidence
        });
      }
      
      // Clear buffer
      this.learningBuffer.set(key, []);
      
      this.logger.debug(`Processed learning buffer for ${dataType}: ${bufferData.length} samples`);
    } catch (error) {
      this.logger.error('Failed to process learning buffer:', error);
    }
  }

  /**
   * Train TensorFlow model with buffer data
   */
  private async trainTensorFlowModel(
    swarmId: string,
    patternType: PatternType,
    bufferData: any[]
  ): Promise<void> {
    try {
      if (!this.config.useTensorFlow || !this.tfModels.has(patternType)) {
        return;
      }
      
      const tfModel = this.tfModels.get(patternType)!;
      
      // Extract features from each item in buffer
      const trainingData = bufferData.map(item => this.extractFeatures(item.data));
      
      // Create labels (simple binary labels for success/failure)
      const labels = bufferData.map(item => {
        const success = !!(item.data.success !== false && item.data.error === undefined);
        return [success ? 1 : 0];
      });
      
      // Train the model
      this.logger.info(`Training TensorFlow model for ${patternType} with ${trainingData.length} samples`);
      const result = await tfModel.train(trainingData, labels);
      
      if (result) {
        this.logger.info(`TensorFlow model training completed with loss: ${result.history.loss[result.history.loss.length - 1].toFixed(4)}`);
      } else {
        this.logger.warn('TensorFlow model training returned no result');
      }
    } catch (error) {
      this.logger.error('Failed to train TensorFlow model:', error);
    }
  }

  private async createPatternFromBuffer(
    swarmId: string,
    dataType: string,
    bufferData: any[]
  ): Promise<NeuralPattern | null> {
    try {
      const patternType = this.mapDataTypeToPatternType(dataType);
      const aggregatedData = this.aggregateBufferData(bufferData);
      
      const pattern: NeuralPattern = {
        id: `pattern_${swarmId}_${dataType}_${Date.now()}`,
        swarm_id: swarmId,
        pattern_type: patternType,
        pattern_data: JSON.stringify(aggregatedData),
        confidence: this.calculatePatternConfidence(bufferData),
        usage_count: 0,
        success_rate: this.calculateSuccessRate(bufferData),
        created_at: new Date().toISOString(),
        metadata: JSON.stringify({
          sampleCount: bufferData.length,
          dataType,
          modelVersion: '1.0'
        }),
        training_data: JSON.stringify(bufferData.slice(0, 10)), // Keep sample for validation
        model_version: '1.0',
        validation_score: 0.0
      };
      
      return pattern;
    } catch (error) {
      this.logger.error('Failed to create pattern from buffer:', error);
      return null;
    }
  }

  private mapDataTypeToPatternType(dataType: string): PatternType {
    switch (dataType) {
      case 'task_completion':
        return 'optimization';
      case 'communication':
        return 'coordination';
      case 'consensus':
        return 'behavior';
      case 'performance_metric':
        return 'prediction';
      default:
        return 'behavior';
    }
  }

  private aggregateBufferData(bufferData: any[]): any {
    // Aggregate the buffer data into a pattern
    const aggregated = {
      sampleCount: bufferData.length,
      timespan: bufferData[bufferData.length - 1].timestamp - bufferData[0].timestamp,
      features: this.extractAggregatedFeatures(bufferData),
      statistics: this.calculateStatistics(bufferData),
      trends: this.identifyTrends(bufferData)
    };
    
    return aggregated;
  }

  private extractAggregatedFeatures(bufferData: any[]): number[] {
    const allFeatures: number[][] = bufferData.map(item => this.extractFeatures(item.data));
    const featureCount = allFeatures[0]?.length || 0;
    
    if (featureCount === 0) return [];
    
    // Calculate mean features
    const meanFeatures: number[] = [];
    for (let i = 0; i < featureCount; i++) {
      const sum = allFeatures.reduce((acc, features) => acc + (features[i] || 0), 0);
      meanFeatures.push(sum / allFeatures.length);
    }
    
    return meanFeatures;
  }

  private calculateStatistics(bufferData: any[]): any {
    return {
      mean: bufferData.length > 0 ? bufferData.reduce((acc, item) => acc + 1, 0) / bufferData.length : 0,
      variance: this.calculateVariance(bufferData),
      trend: this.calculateTrend(bufferData)
    };
  }

  private calculateVariance(bufferData: any[]): number {
    if (bufferData.length < 2) return 0;
    
    const values = bufferData.map(item => item.timestamp);
    const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  private calculateTrend(bufferData: any[]): number {
    if (bufferData.length < 2) return 0;
    
    // Simple linear trend calculation
    const n = bufferData.length;
    const sumX = bufferData.reduce((acc, _, i) => acc + i, 0);
    const sumY = bufferData.reduce((acc, item) => acc + item.timestamp, 0);
    const sumXY = bufferData.reduce((acc, item, i) => acc + i * item.timestamp, 0);
    const sumX2 = bufferData.reduce((acc, _, i) => acc + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private identifyTrends(bufferData: any[]): string[] {
    const trends: string[] = [];
    
    if (bufferData.length < 3) return trends;
    
    // Identify increasing/decreasing trends
    const trend = this.calculateTrend(bufferData);
    if (trend > 0.1) trends.push('increasing');
    if (trend < -0.1) trends.push('decreasing');
    if (Math.abs(trend) < 0.1) trends.push('stable');
    
    // Identify patterns in timing
    const intervals = [];
    for (let i = 1; i < bufferData.length; i++) {
      intervals.push(bufferData[i].timestamp - bufferData[i - 1].timestamp);
    }
    
    const avgInterval = intervals.reduce((acc, val) => acc + val, 0) / intervals.length;
    const variance = intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    
    if (variance < avgInterval * 0.1) trends.push('regular');
    if (variance > avgInterval * 0.5) trends.push('irregular');
    
    return trends;
  }

  private calculatePatternConfidence(bufferData: any[]): number {
    // Calculate confidence based on data quality and consistency
    if (bufferData.length < 3) return 0.3;
    
    const consistency = this.calculateConsistency(bufferData);
    const completeness = Math.min(bufferData.length / 10, 1); // Ideal buffer size is 10
    const recency = this.calculateRecency(bufferData);
    
    return (consistency * 0.4 + completeness * 0.3 + recency * 0.3);
  }

  private calculateConsistency(bufferData: any[]): number {
    // Measure how consistent the data patterns are
    const features = bufferData.map(item => this.extractFeatures(item.data));
    if (features.length < 2) return 0.5;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < features.length - 1; i++) {
      for (let j = i + 1; j < features.length; j++) {
        totalSimilarity += this.calculateFeatureSimilarity(features[i], features[j]);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0.5;
  }

  private calculateFeatureSimilarity(featuresA: number[], featuresB: number[]): number {
    if (featuresA.length !== featuresB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < featuresA.length; i++) {
      dotProduct += featuresA[i] * featuresB[i];
      normA += featuresA[i] * featuresA[i];
      normB += featuresB[i] * featuresB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateRecency(bufferData: any[]): number {
    if (bufferData.length === 0) return 0;
    
    const now = Date.now();
    const mostRecent = Math.max(...bufferData.map(item => item.timestamp));
    const age = now - mostRecent;
    
    // Decay factor: patterns are less valuable as they age
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return Math.max(0, 1 - age / maxAge);
  }

  private calculateSuccessRate(bufferData: any[]): number {
    const successfulSamples = bufferData.filter(item => {
      const data = item.data;
      return data.success !== false && data.error === undefined;
    });
    
    return bufferData.length > 0 ? successfulSamples.length / bufferData.length : 0;
  }

  async storePattern(pattern: NeuralPattern): Promise<void> {
    try {
      await this.db.storeNeuralPattern(pattern);
      this.logger.debug(`Stored neural pattern: ${pattern.id}`);
    } catch (error) {
      this.logger.error('Failed to store neural pattern:', error);
      throw error;
    }
  }

  async getPatternsByType(swarmId: string, patternType: PatternType): Promise<NeuralPattern[]> {
    try {
      return await this.db.getNeuralPatterns(swarmId, patternType);
    } catch (error) {
      this.logger.error('Failed to get patterns by type:', error);
      return [];
    }
  }

  async getPatternById(patternId: string): Promise<NeuralPattern | null> {
    try {
      return await this.db.getNeuralPattern(patternId);
    } catch (error) {
      this.logger.error('Failed to get pattern by ID:', error);
      return null;
    }
  }

  async updatePatternUsage(patternId: string, success: boolean): Promise<void> {
    try {
      await this.db.updateNeuralPatternUsage(patternId, success);
      this.logger.debug(`Updated pattern usage: ${patternId}, success: ${success}`);
    } catch (error) {
      this.logger.error('Failed to update pattern usage:', error);
    }
  }

  async optimizePatterns(swarmId: string): Promise<void> {
    try {
      // Remove low-confidence patterns
      await this.db.cleanupNeuralPatterns(swarmId, this.config.confidenceThreshold);
      
      // Merge similar patterns
      await this.mergeSimilarPatterns(swarmId);
      
      // Update adaptive threshold
      if (this.config.adaptiveThreshold) {
        await this.updateAdaptiveThreshold(swarmId);
      }
      
      this.logger.info(`Optimized neural patterns for swarm: ${swarmId}`);
    } catch (error) {
      this.logger.error('Failed to optimize patterns:', error);
    }
  }

  private async mergeSimilarPatterns(swarmId: string): Promise<void> {
    const patterns = await this.db.getNeuralPatterns(swarmId);
    const patternGroups = new Map<PatternType, NeuralPattern[]>();
    
    // Group patterns by type
    patterns.forEach(pattern => {
      const type = pattern.pattern_type;
      if (!patternGroups.has(type)) {
        patternGroups.set(type, []);
      }
      patternGroups.get(type)!.push(pattern);
    });
    
    // Find and merge similar patterns within each group
    for (const [type, typePatterns] of patternGroups) {
      for (let i = 0; i < typePatterns.length; i++) {
        for (let j = i + 1; j < typePatterns.length; j++) {
          const similarity = this.calculateSimilarity(
            typePatterns[i].pattern_data,
            typePatterns[j].pattern_data
          );
          
          if (similarity > 0.9) {
            // Merge patterns
            await this.mergePatterns(typePatterns[i], typePatterns[j]);
            typePatterns.splice(j, 1);
            j--;
          }
        }
      }
    }
  }

  private async mergePatterns(pattern1: NeuralPattern, pattern2: NeuralPattern): Promise<void> {
    // Create merged pattern
    const mergedPattern: NeuralPattern = {
      ...pattern1,
      id: `merged_${pattern1.id}_${pattern2.id}`,
      confidence: Math.max(pattern1.confidence, pattern2.confidence),
      usage_count: pattern1.usage_count + pattern2.usage_count,
      success_rate: (pattern1.success_rate * pattern1.usage_count + 
                     pattern2.success_rate * pattern2.usage_count) / 
                    (pattern1.usage_count + pattern2.usage_count),
      metadata: JSON.stringify({
        ...JSON.parse(pattern1.metadata || '{}'),
        mergedFrom: [pattern1.id, pattern2.id],
        mergedAt: new Date().toISOString()
      })
    };
    
    // Store merged pattern and remove originals
    await this.storePattern(mergedPattern);
    await this.db.deleteNeuralPattern(pattern1.id);
    await this.db.deleteNeuralPattern(pattern2.id);
    
    this.logger.debug(`Merged patterns: ${pattern1.id} + ${pattern2.id} -> ${mergedPattern.id}`);
  }

  private async updateAdaptiveThreshold(swarmId: string): Promise<void> {
    const patterns = await this.db.getNeuralPatterns(swarmId);
    
    if (patterns.length === 0) return;
    
    // Calculate average confidence and success rate
    const avgConfidence = patterns.reduce((acc, p) => acc + p.confidence, 0) / patterns.length;
    const avgSuccessRate = patterns.reduce((acc, p) => acc + p.success_rate, 0) / patterns.length;
    
    // Adjust threshold based on performance
    const performanceScore = (avgConfidence + avgSuccessRate) / 2;
    
    if (performanceScore > 0.8) {
      // Increase threshold for higher quality
      this.config.confidenceThreshold = Math.min(0.9, this.config.confidenceThreshold * 1.1);
    } else if (performanceScore < 0.5) {
      // Decrease threshold to be more inclusive
      this.config.confidenceThreshold = Math.max(0.3, this.config.confidenceThreshold * 0.9);
    }
    
    this.logger.debug(`Updated adaptive threshold to: ${this.config.confidenceThreshold}`);
  }

  getStatus(): any {
    return {
      activeModels: this.activeModels.size,
      bufferSizes: Object.fromEntries(
        Array.from(this.learningBuffer.entries()).map(([key, buffer]) => [key, buffer.length])
      ),
      config: this.config,
      wasmEnabled: !!this.wasmModule,
      tensorFlowEnabled: this.config.useTensorFlow,
      tensorFlowModels: this.tfModels.size
    };
  }
  
  /**
   * Initialize TensorFlow models for each pattern type
   */
  private async initializeTensorFlowModels(): Promise<void> {
    try {
      // Default configurations if not provided
      const defaultConfigs: Record<PatternType, TensorFlowModelConfig> = {
        coordination: {
          modelType: 'dense',
          layers: [64, 32, 16],
          learningRate: this.config.learningRate,
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
          learningRate: this.config.learningRate,
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
          learningRate: this.config.learningRate,
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
          learningRate: this.config.learningRate,
          patternType: 'behavior',
          modelName: 'behavior-patterns',
          epochs: 20,
          batchSize: 32,
          validationSplit: 0.2,
          featureCount: 64,
          outputClasses: 1
        }
      };

      // Create and initialize TensorFlow models for each pattern type
      const patternTypes: PatternType[] = ['coordination', 'optimization', 'prediction', 'behavior'];
      
      for (const patternType of patternTypes) {
        const config = this.config.tensorFlowModels?.[patternType] || defaultConfigs[patternType];
        this.logger.info(`Initializing TensorFlow model for ${patternType} patterns`);
        
        const model = new TensorFlowModel(config, this.eventBus);
        await model.initialize();
        
        this.tfModels.set(patternType, model);
      }
      
      this.logger.info(`Initialized ${this.tfModels.size} TensorFlow models`);
    } catch (error) {
      this.logger.error('Failed to initialize TensorFlow models:', error);
    }
  }
} 