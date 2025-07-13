/**
 * Neural System Index
 * 
 * Export all neural components for the Hive-Mind system
 */

export { PatternRecognizer } from './pattern-recognizer.js';
export type { PatternRecognitionConfig } from './pattern-recognizer.js';
export { NeuralManager } from './neural-manager.js';
export type { NeuralManagerConfig } from './neural-manager.js';
export { TensorFlowModel } from './tensorflow-model.js';
export type { TensorFlowModelConfig } from './tensorflow-model.js';
export { NeuralWorkflow } from './neural-workflow.js';
export type { NeuralWorkflowConfig, WorkflowResult } from './neural-workflow.js';
export type { 
  PatternType, 
  NeuralPattern, 
  PatternMatch, 
  CognitiveModel, 
  LearningSession 
} from '../types.js';