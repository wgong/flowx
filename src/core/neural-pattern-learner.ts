/**
 * Simple Neural Pattern Learning for Workflow Optimization
 * Lightweight implementation focused on practical workflow improvements
 */

import { ILogger } from './logger.js';
import { EventBus } from './event-bus.js';

export interface WorkflowPattern {
  id: string;
  name: string;
  steps: string[];
  frequency: number;
  successRate: number;
  avgExecutionTime: number;
  lastUsed: Date;
  context: Record<string, any>;
}

export interface PatternMatch {
  pattern: WorkflowPattern;
  confidence: number;
  suggestions: string[];
}

export interface LearningMetrics {
  totalPatterns: number;
  activePatterns: number;
  totalLearningEvents: number;
  optimizationsSuggested: number;
  optimizationsApplied: number;
  avgConfidence: number;
}

/**
 * Simple neural pattern learning for workflow optimization
 * Uses frequency analysis and success correlation for pattern recognition
 */
export class NeuralPatternLearner {
  private patterns = new Map<string, WorkflowPattern>();
  private learningEvents: Array<{
    timestamp: Date;
    workflow: string[];
    outcome: 'success' | 'failure';
    executionTime: number;
    context: Record<string, any>;
  }> = [];
  
  private metrics: LearningMetrics = {
    totalPatterns: 0,
    activePatterns: 0,
    totalLearningEvents: 0,
    optimizationsSuggested: 0,
    optimizationsApplied: 0,
    avgConfidence: 0
  };

  constructor(
    private logger: ILogger,
    private eventBus: EventBus,
    private options: {
      maxPatterns?: number;
      minFrequency?: number;
      minSuccessRate?: number;
      learningWindowDays?: number;
    } = {}
  ) {
    this.options = {
      maxPatterns: 100,
      minFrequency: 3,
      minSuccessRate: 0.7,
      learningWindowDays: 30,
      ...options
    };

    // Listen for workflow events
    this.eventBus.on('workflow.started', this.onWorkflowStarted.bind(this));
    this.eventBus.on('workflow.completed', this.onWorkflowCompleted.bind(this));
    this.eventBus.on('workflow.failed', this.onWorkflowFailed.bind(this));
  }

  /**
   * Learn from a workflow execution
   */
  async learnFromWorkflow(
    steps: string[],
    outcome: 'success' | 'failure',
    executionTime: number,
    context: Record<string, any> = {}
  ): Promise<void> {
    const event = {
      timestamp: new Date(),
      workflow: steps,
      outcome,
      executionTime,
      context
    };

    this.learningEvents.push(event);
    this.metrics.totalLearningEvents++;

    // Keep only recent events within learning window
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.learningWindowDays!);
    this.learningEvents = this.learningEvents.filter(e => e.timestamp >= cutoffDate);

    // Update or create patterns
    await this.updatePatterns();

    this.logger.debug('Neural pattern learner processed workflow', {
      steps: steps.length,
      outcome,
      executionTime,
      totalPatterns: this.patterns.size
    });
  }

  /**
   * Find matching patterns for a given workflow
   */
  async findPatterns(steps: string[], context: Record<string, any> = {}): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns.values()) {
      const confidence = this.calculateConfidence(steps, pattern, context);
      
      if (confidence > 0.5) { // Minimum confidence threshold
        const suggestions = this.generateSuggestions(steps, pattern);
        matches.push({
          pattern,
          confidence,
          suggestions
        });
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    if (matches.length > 0) {
      this.metrics.optimizationsSuggested++;
    }

    return matches.slice(0, 5); // Return top 5 matches
  }

  /**
   * Get learning metrics
   */
  getMetrics(): LearningMetrics {
    this.metrics.totalPatterns = this.patterns.size;
    this.metrics.activePatterns = Array.from(this.patterns.values())
      .filter(p => p.frequency >= this.options.minFrequency!).length;
    
    const confidences = Array.from(this.patterns.values())
      .map(p => p.successRate);
    this.metrics.avgConfidence = confidences.length > 0 
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
      : 0;

    return { ...this.metrics };
  }

  /**
   * Get all learned patterns
   */
  getPatterns(): WorkflowPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.frequency >= this.options.minFrequency!)
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Clear all patterns and learning data
   */
  async reset(): Promise<void> {
    this.patterns.clear();
    this.learningEvents = [];
    this.metrics = {
      totalPatterns: 0,
      activePatterns: 0,
      totalLearningEvents: 0,
      optimizationsSuggested: 0,
      optimizationsApplied: 0,
      avgConfidence: 0
    };

    this.logger.info('Neural pattern learner reset');
  }

  /**
   * Apply an optimization suggestion
   */
  async applyOptimization(patternId: string): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.lastUsed = new Date();
      this.metrics.optimizationsApplied++;
      
      this.eventBus.emit('pattern.applied', {
        patternId,
        pattern: pattern.name
      });

      this.logger.info('Applied pattern optimization', {
        patternId,
        patternName: pattern.name
      });
    }
  }

  // Private methods

  private async updatePatterns(): Promise<void> {
    // Analyze recent events to identify patterns
    const patternCandidates = new Map<string, {
      steps: string[];
      successes: number;
      failures: number;
      totalTime: number;
      contexts: Record<string, any>[];
    }>();

    // Group similar workflows
    for (const event of this.learningEvents) {
      const key = this.generatePatternKey(event.workflow);
      
      if (!patternCandidates.has(key)) {
        patternCandidates.set(key, {
          steps: event.workflow,
          successes: 0,
          failures: 0,
          totalTime: 0,
          contexts: []
        });
      }

      const candidate = patternCandidates.get(key)!;
      if (event.outcome === 'success') {
        candidate.successes++;
      } else {
        candidate.failures++;
      }
      candidate.totalTime += event.executionTime;
      candidate.contexts.push(event.context);
    }

    // Convert candidates to patterns
    for (const [key, candidate] of patternCandidates) {
      const frequency = candidate.successes + candidate.failures;
      const successRate = frequency > 0 ? candidate.successes / frequency : 0;

      if (frequency >= this.options.minFrequency! && successRate >= this.options.minSuccessRate!) {
        const existingPattern = this.patterns.get(key);
        
        const pattern: WorkflowPattern = {
          id: key,
          name: existingPattern?.name || this.generatePatternName(candidate.steps),
          steps: candidate.steps,
          frequency,
          successRate,
          avgExecutionTime: candidate.totalTime / frequency,
          lastUsed: existingPattern?.lastUsed || new Date(),
          context: this.mergeContexts(candidate.contexts)
        };

        this.patterns.set(key, pattern);
      }
    }

    // Remove old or low-performing patterns
    await this.prunePatterns();
  }

  private generatePatternKey(steps: string[]): string {
    // Create a normalized key for similar workflows
    return steps.map(step => step.toLowerCase().replace(/\s+/g, '_')).join('->');
  }

  private generatePatternName(steps: string[]): string {
    // Generate a human-readable name for the pattern
    if (steps.length <= 2) {
      return steps.join(' → ');
    } else {
      return `${steps[0]} → ... → ${steps[steps.length - 1]} (${steps.length} steps)`;
    }
  }

  private calculateConfidence(
    currentSteps: string[],
    pattern: WorkflowPattern,
    context: Record<string, any>
  ): number {
    // Calculate confidence based on step similarity and context
    const stepSimilarity = this.calculateStepSimilarity(currentSteps, pattern.steps);
    const contextSimilarity = this.calculateContextSimilarity(context, pattern.context);
    const frequencyScore = Math.min(pattern.frequency / 10, 1); // Cap at 10 uses
    const successScore = pattern.successRate;

    // Weighted average
    return (stepSimilarity * 0.4 + contextSimilarity * 0.2 + frequencyScore * 0.2 + successScore * 0.2);
  }

  private calculateStepSimilarity(steps1: string[], steps2: string[]): number {
    if (steps1.length === 0 && steps2.length === 0) return 1;
    if (steps1.length === 0 || steps2.length === 0) return 0;

    // Simple Levenshtein-like similarity for step sequences
    const longer = steps1.length > steps2.length ? steps1 : steps2;
    const shorter = steps1.length > steps2.length ? steps2 : steps1;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer[i] && shorter[i].toLowerCase() === longer[i].toLowerCase()) {
        matches++;
      }
    }

    return matches / longer.length;
  }

  private calculateContextSimilarity(context1: Record<string, any>, context2: Record<string, any>): number {
    const keys1 = Object.keys(context1);
    const keys2 = Object.keys(context2);
    
    if (keys1.length === 0 && keys2.length === 0) return 1;
    if (keys1.length === 0 || keys2.length === 0) return 0.5; // Neutral if one is empty

    const commonKeys = keys1.filter(key => keys2.includes(key));
    const totalKeys = new Set([...keys1, ...keys2]).size;

    return commonKeys.length / totalKeys;
  }

  private generateSuggestions(currentSteps: string[], pattern: WorkflowPattern): string[] {
    const suggestions: string[] = [];

    // Suggest missing steps
    for (const patternStep of pattern.steps) {
      if (!currentSteps.includes(patternStep)) {
        suggestions.push(`Consider adding step: ${patternStep}`);
      }
    }

    // Suggest reordering if pattern has better success rate
    if (pattern.successRate > 0.8) {
      suggestions.push(`Consider following the proven sequence from "${pattern.name}"`);
    }

    // Suggest optimization based on execution time
    if (pattern.avgExecutionTime < 5000) { // Less than 5 seconds
      suggestions.push('This pattern typically executes quickly');
    }

    return suggestions.slice(0, 3); // Max 3 suggestions
  }

  private mergeContexts(contexts: Record<string, any>[]): Record<string, any> {
    const merged: Record<string, any> = {};
    
    for (const context of contexts) {
      for (const [key, value] of Object.entries(context)) {
        if (!merged[key]) {
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  private async prunePatterns(): Promise<void> {
    const patterns = Array.from(this.patterns.values());
    
    // Remove patterns that haven't been used recently or have low performance
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.learningWindowDays!);

    for (const pattern of patterns) {
      if (pattern.lastUsed < cutoffDate || 
          pattern.frequency < this.options.minFrequency! ||
          pattern.successRate < this.options.minSuccessRate!) {
        this.patterns.delete(pattern.id);
      }
    }

    // If we have too many patterns, keep only the best ones
    if (this.patterns.size > this.options.maxPatterns!) {
      const sortedPatterns = Array.from(this.patterns.values())
        .sort((a, b) => (b.frequency * b.successRate) - (a.frequency * a.successRate));
      
      this.patterns.clear();
      for (let i = 0; i < this.options.maxPatterns!; i++) {
        const pattern = sortedPatterns[i];
        if (pattern) {
          this.patterns.set(pattern.id, pattern);
        }
      }
    }
  }

  // Event handlers

  private onWorkflowStarted(data: any): void {
    // Track workflow start for timing
    this.logger.debug('Workflow started', data);
  }

  private onWorkflowCompleted(data: any): void {
    if (data.steps && data.executionTime !== undefined) {
      this.learnFromWorkflow(
        data.steps,
        'success',
        data.executionTime,
        data.context || {}
      ).catch(error => {
        this.logger.error('Error learning from completed workflow', error);
      });
    }
  }

  private onWorkflowFailed(data: any): void {
    if (data.steps && data.executionTime !== undefined) {
      this.learnFromWorkflow(
        data.steps,
        'failure',
        data.executionTime,
        data.context || {}
      ).catch(error => {
        this.logger.error('Error learning from failed workflow', error);
      });
    }
  }
}

/**
 * Singleton instance for global access
 */
let globalPatternLearner: NeuralPatternLearner | null = null;

export function getNeuralPatternLearner(
  logger?: ILogger,
  eventBus?: EventBus,
  options?: any
): NeuralPatternLearner {
  if (!globalPatternLearner && logger && eventBus) {
    globalPatternLearner = new NeuralPatternLearner(logger, eventBus, options);
  }
  
  if (!globalPatternLearner) {
    throw new Error('Neural pattern learner not initialized. Provide logger and eventBus.');
  }
  
  return globalPatternLearner;
}

export function resetNeuralPatternLearner(): void {
  globalPatternLearner = null;
} 