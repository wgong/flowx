/**
 * Memory-Driven Todo Intelligence System
 * Uses memory system to learn from patterns, suggest optimizations, auto-prioritize
 * based on success rates, and maintain context across sessions
 */

import { EventEmitter } from 'node:events';
import { Logger } from '../core/logger.js';
import { TodoItem } from './coordination.js';
import { TodoSyncService } from './todo-sync-service.js';

export interface TodoPattern {
  id: string;
  patternType: 'completion_sequence' | 'priority_optimization' | 'dependency_chain' | 'time_estimation' | 'failure_prediction';
  description: string;
  frequency: number;
  successRate: number;
  avgCompletionTime: number;
  conditions: {
    todoContent?: string[];
    priorities?: string[];
    tags?: string[];
    timeOfDay?: string[];
    complexity?: number[];
  };
  outcomes: {
    averageCompletionTime: number;
    successProbability: number;
    commonFailures: string[];
    optimizations: string[];
  };
  confidence: number;
  lastSeen: Date;
  metadata: Record<string, unknown>;
}

export interface TodoRecommendation {
  todoId: string;
  recommendationType: 'priority_adjustment' | 'dependency_suggestion' | 'time_estimate' | 'breakdown_suggestion' | 'resource_allocation';
  recommendation: string;
  confidence: number;
  reasoning: string;
  potentialImpact: {
    timeReduction?: number;
    successRateIncrease?: number;
    efficiencyGain?: number;
  };
  basedOnPatterns: string[];
  suggestedChanges: {
    priority?: 'low' | 'medium' | 'high';
    estimatedTime?: string;
    dependencies?: string[];
    tags?: string[];
    breakdown?: string[];
  };
}

export interface TodoIntelligenceMetrics {
  totalPatterns: number;
  activeRecommendations: number;
  patternAccuracy: number;
  avgCompletionTimeImprovement: number;
  successRateImprovement: number;
  todosAnalyzed: number;
  patternsMatched: number;
  recommendationsAccepted: number;
  lastAnalysisRun: Date;
}

export interface MemoryIntelligenceConfig {
  enablePatternRecognition: boolean;
  enableAutoOptimization: boolean;
  enablePredictiveAnalysis: boolean;
  enableContextualLearning: boolean;
  patternMatchThreshold: number;
  recommendationConfidenceThreshold: number;
  maxPatternsToTrack: number;
  analysisInterval: number;
  memoryRetentionDays: number;
  crossSessionLearning: boolean;
}

export class MemoryDrivenTodoIntelligence extends EventEmitter {
  private logger: Logger;
  private todoSyncService: TodoSyncService;
  private memoryManager: any;
  
  private patterns = new Map<string, TodoPattern>();
  private recommendations = new Map<string, TodoRecommendation[]>();
  private completionHistory = new Map<string, any>();
  private sessionContext = new Map<string, any>();
  private performanceMetrics = new Map<string, number>();
  
  private config: MemoryIntelligenceConfig;
  private analysisTimer?: NodeJS.Timeout;
  private metricsCache: TodoIntelligenceMetrics;

  constructor(
    todoSyncService: TodoSyncService,
    memoryManager?: any,
    config: Partial<MemoryIntelligenceConfig> = {}
  ) {
    super();
    
    this.todoSyncService = todoSyncService;
    this.memoryManager = memoryManager;
    this.logger = new Logger('MemoryDrivenTodoIntelligence');
    
    this.config = {
      enablePatternRecognition: true,
      enableAutoOptimization: true,
      enablePredictiveAnalysis: true,
      enableContextualLearning: true,
      patternMatchThreshold: 0.75,
      recommendationConfidenceThreshold: 0.8,
      maxPatternsToTrack: 1000,
      analysisInterval: 300000, // 5 minutes
      memoryRetentionDays: 90,
      crossSessionLearning: true,
      ...config
    };
    
    this.metricsCache = {
      totalPatterns: 0,
      activeRecommendations: 0,
      patternAccuracy: 0,
      avgCompletionTimeImprovement: 0,
      successRateImprovement: 0,
      todosAnalyzed: 0,
      patternsMatched: 0,
      recommendationsAccepted: 0,
      lastAnalysisRun: new Date()
    };
    
    this.initializeIntelligenceSystem();
  }

  /**
   * Initialize the intelligence system
   */
  private async initializeIntelligenceSystem(): Promise<void> {
    try {
      // Load existing patterns from memory
      await this.loadPatternsFromMemory();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Start analysis loop
      this.startAnalysisLoop();
      
      // Load cross-session context
      await this.loadSessionContext();
      
      this.logger.info('Memory-driven todo intelligence system initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize intelligence system', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for learning from todo activities
   */
  private setupEventHandlers(): void {
    // Listen to todo sync service events
    this.todoSyncService.on('todo:created-from-task', this.handleTodoCreated.bind(this));
    this.todoSyncService.on('task:created-from-todo', this.handleTaskCreated.bind(this));
    this.todoSyncService.on('status:synchronized', this.handleStatusChange.bind(this));
    
    // Listen to our own recommendation events
    this.on('recommendation:accepted', this.handleRecommendationAccepted.bind(this));
    this.on('recommendation:rejected', this.handleRecommendationRejected.bind(this));
    this.on('pattern:discovered', this.handlePatternDiscovered.bind(this));
    
    this.logger.info('Intelligence system event handlers initialized');
  }

  /**
   * Handle new todo creation - analyze and learn
   */
  private async handleTodoCreated(data: { todo: TodoItem }): Promise<void> {
    try {
      const { todo } = data;
      
      // Analyze patterns in the new todo
      const matchedPatterns = await this.analyzePatterns(todo);
      
      // Generate recommendations based on patterns
      const recommendations = await this.generateRecommendations(todo, matchedPatterns);
      
      // Store recommendations
      if (recommendations.length > 0) {
        this.recommendations.set(todo.id, recommendations);
        
        this.emit('recommendations:generated', {
          todoId: todo.id,
          recommendations,
          matchedPatterns
        });
      }
      
      // Update session context
      this.updateSessionContext(todo);
      
      this.metricsCache.todosAnalyzed++;
      this.metricsCache.patternsMatched += matchedPatterns.length;
      
    } catch (error) {
      this.logger.error('Failed to handle todo creation', error);
    }
  }

  /**
   * Handle task creation from todo - learn from the conversion
   */
  private async handleTaskCreated(data: { task: any, todo: TodoItem }): Promise<void> {
    try {
      const { task, todo } = data;
      
      // Learn from todo->task conversion patterns
      await this.learnConversionPattern(todo, task);
      
      // Update completion history
      this.updateCompletionHistory(todo.id, 'task_created', {
        task,
        conversionTime: new Date(),
        todoComplexity: this.estimateTodoComplexity(todo)
      });
      
    } catch (error) {
      this.logger.error('Failed to handle task creation', error);
    }
  }

  /**
   * Handle status changes - learn from completion patterns
   */
  private async handleStatusChange(data: { sourceType: string, targetType: string, status: string, metadata?: any }): Promise<void> {
    try {
      const { sourceType, targetType, status, metadata } = data;
      
      // Learn from status change patterns
      await this.learnStatusChangePattern(sourceType, targetType, status, metadata);
      
      // If completion, analyze success patterns
      if (status === 'completed') {
        await this.analyzeCompletionPattern(metadata);
      }
      
    } catch (error) {
      this.logger.error('Failed to handle status change', error);
    }
  }

  /**
   * Analyze patterns in a todo item
   */
  private async analyzePatterns(todo: TodoItem): Promise<TodoPattern[]> {
    const matchedPatterns: TodoPattern[] = [];
    
    for (const [patternId, pattern] of this.patterns) {
      if (this.matchesPattern(todo, pattern)) {
        matchedPatterns.push(pattern);
        
        // Update pattern frequency
        pattern.frequency++;
        pattern.lastSeen = new Date();
        
        // Store updated pattern
        await this.storePatternInMemory(pattern);
      }
    }
    
    return matchedPatterns;
  }

  /**
   * Check if a todo matches a pattern
   */
  private matchesPattern(todo: TodoItem, pattern: TodoPattern): boolean {
    let matchScore = 0;
    let totalChecks = 0;
    
    // Check content patterns
    if (pattern.conditions.todoContent) {
      totalChecks++;
      const contentMatch = pattern.conditions.todoContent.some(content => 
        todo.content.toLowerCase().includes(content.toLowerCase())
      );
      if (contentMatch) matchScore++;
    }
    
    // Check priority patterns
    if (pattern.conditions.priorities) {
      totalChecks++;
      if (pattern.conditions.priorities.includes(todo.priority)) {
        matchScore++;
      }
    }
    
    // Check tag patterns
    if (pattern.conditions.tags && todo.tags) {
      totalChecks++;
      const tagMatch = pattern.conditions.tags.some(tag => 
        todo.tags?.includes(tag)
      );
      if (tagMatch) matchScore++;
    }
    
    // Check complexity patterns
    if (pattern.conditions.complexity) {
      totalChecks++;
      const todoComplexity = this.estimateTodoComplexity(todo);
      const complexityMatch = pattern.conditions.complexity.some(complexity => 
        Math.abs(todoComplexity - complexity) <= 1
      );
      if (complexityMatch) matchScore++;
    }
    
    // Calculate match percentage
    const matchPercentage = totalChecks > 0 ? matchScore / totalChecks : 0;
    
    return matchPercentage >= this.config.patternMatchThreshold;
  }

  /**
   * Generate recommendations based on matched patterns
   */
  private async generateRecommendations(todo: TodoItem, matchedPatterns: TodoPattern[]): Promise<TodoRecommendation[]> {
    const recommendations: TodoRecommendation[] = [];
    
    for (const pattern of matchedPatterns) {
      if (pattern.confidence >= this.config.recommendationConfidenceThreshold) {
        
        // Priority optimization recommendation
        if (pattern.patternType === 'priority_optimization') {
          const priorityRec = this.generatePriorityRecommendation(todo, pattern);
          if (priorityRec) recommendations.push(priorityRec);
        }
        
        // Time estimation recommendation
        if (pattern.patternType === 'time_estimation') {
          const timeRec = this.generateTimeEstimationRecommendation(todo, pattern);
          if (timeRec) recommendations.push(timeRec);
        }
        
        // Dependency suggestion
        if (pattern.patternType === 'dependency_chain') {
          const depRec = this.generateDependencyRecommendation(todo, pattern);
          if (depRec) recommendations.push(depRec);
        }
        
        // Breakdown suggestion for complex todos
        if (pattern.patternType === 'completion_sequence' && this.estimateTodoComplexity(todo) > 7) {
          const breakdownRec = this.generateBreakdownRecommendation(todo, pattern);
          if (breakdownRec) recommendations.push(breakdownRec);
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Generate priority optimization recommendation
   */
  private generatePriorityRecommendation(todo: TodoItem, pattern: TodoPattern): TodoRecommendation | null {
    if (pattern.outcomes.successProbability > 0.85) {
      const suggestedPriority = this.calculateOptimalPriority(pattern);
      
      if (suggestedPriority !== todo.priority) {
        return {
          todoId: todo.id,
          recommendationType: 'priority_adjustment',
          recommendation: `Adjust priority to ${suggestedPriority} based on similar successful todos`,
          confidence: pattern.confidence,
          reasoning: `Pattern shows ${(pattern.outcomes.successProbability * 100).toFixed(1)}% success rate with ${suggestedPriority} priority`,
          potentialImpact: {
            successRateIncrease: (pattern.outcomes.successProbability - 0.7) * 100,
            efficiencyGain: 15
          },
          basedOnPatterns: [pattern.id],
          suggestedChanges: {
            priority: suggestedPriority
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Generate time estimation recommendation
   */
  private generateTimeEstimationRecommendation(todo: TodoItem, pattern: TodoPattern): TodoRecommendation | null {
    const estimatedMinutes = Math.round(pattern.outcomes.averageCompletionTime / 60000);
    const estimatedTime = this.formatTimeEstimate(estimatedMinutes);
    
    return {
      todoId: todo.id,
      recommendationType: 'time_estimate',
      recommendation: `Estimated completion time: ${estimatedTime}`,
      confidence: pattern.confidence,
      reasoning: `Based on ${pattern.frequency} similar todos with average completion time of ${estimatedTime}`,
      potentialImpact: {
        timeReduction: pattern.avgCompletionTime > pattern.outcomes.averageCompletionTime ? 
          (pattern.avgCompletionTime - pattern.outcomes.averageCompletionTime) / 60000 : 0
      },
      basedOnPatterns: [pattern.id],
      suggestedChanges: {
        estimatedTime
      }
    };
  }

  /**
   * Generate dependency recommendation
   */
  private generateDependencyRecommendation(todo: TodoItem, pattern: TodoPattern): TodoRecommendation | null {
    // Analyze common dependency patterns
    const suggestedDeps = this.findCommonDependencies(pattern);
    
    if (suggestedDeps.length > 0) {
      return {
        todoId: todo.id,
        recommendationType: 'dependency_suggestion',
        recommendation: `Consider adding dependencies: ${suggestedDeps.join(', ')}`,
        confidence: pattern.confidence * 0.8, // Lower confidence for dependency suggestions
        reasoning: `Similar todos often have these dependencies for better success rates`,
        potentialImpact: {
          successRateIncrease: 10,
          efficiencyGain: 20
        },
        basedOnPatterns: [pattern.id],
        suggestedChanges: {
          dependencies: suggestedDeps
        }
      };
    }
    
    return null;
  }

  /**
   * Generate breakdown recommendation for complex todos
   */
  private generateBreakdownRecommendation(todo: TodoItem, pattern: TodoPattern): TodoRecommendation | null {
    const breakdown = this.generateTodoBreakdown(todo, pattern);
    
    if (breakdown.length > 1) {
      return {
        todoId: todo.id,
        recommendationType: 'breakdown_suggestion',
        recommendation: `Break down into smaller todos for better success rate`,
        confidence: pattern.confidence * 0.9,
        reasoning: `Complex todos similar to this have ${(pattern.outcomes.successProbability * 100).toFixed(1)}% higher success when broken down`,
        potentialImpact: {
          successRateIncrease: 25,
          timeReduction: 15
        },
        basedOnPatterns: [pattern.id],
        suggestedChanges: {
          breakdown
        }
      };
    }
    
    return null;
  }

  /**
   * Learn from todo->task conversion patterns
   */
  private async learnConversionPattern(todo: TodoItem, task: any): Promise<void> {
    const patternId = `conversion-${this.generatePatternHash(todo)}`;
    
    let pattern = this.patterns.get(patternId);
    if (!pattern) {
      pattern = {
        id: patternId,
        patternType: 'completion_sequence',
        description: `Todo to task conversion pattern for ${todo.content.substring(0, 50)}...`,
        frequency: 0,
        successRate: 0,
        avgCompletionTime: 0,
        conditions: {
          todoContent: [todo.content.toLowerCase()],
          priorities: [todo.priority],
          tags: todo.tags || []
        },
        outcomes: {
          averageCompletionTime: 0,
          successProbability: 0,
          commonFailures: [],
          optimizations: []
        },
        confidence: 0.5,
        lastSeen: new Date(),
        metadata: { type: 'conversion' }
      };
      
      this.patterns.set(patternId, pattern);
    }
    
    // Update pattern with new data
    pattern.frequency++;
    pattern.lastSeen = new Date();
    
    // Calculate new confidence based on frequency
    pattern.confidence = Math.min(0.95, 0.5 + (pattern.frequency * 0.05));
    
    await this.storePatternInMemory(pattern);
  }

  /**
   * Learn from status change patterns
   */
  private async learnStatusChangePattern(sourceType: string, targetType: string, status: string, metadata?: any): Promise<void> {
    const patternId = `status-${sourceType}-${targetType}-${status}`;
    
    let pattern = this.patterns.get(patternId);
    if (!pattern) {
      pattern = {
        id: patternId,
        patternType: 'completion_sequence',
        description: `Status change pattern: ${sourceType} -> ${targetType} (${status})`,
        frequency: 0,
        successRate: status === 'completed' ? 1 : 0,
        avgCompletionTime: 0,
        conditions: {},
        outcomes: {
          averageCompletionTime: 0,
          successProbability: status === 'completed' ? 1 : 0,
          commonFailures: [],
          optimizations: []
        },
        confidence: 0.3,
        lastSeen: new Date(),
        metadata: { sourceType, targetType, status }
      };
      
      this.patterns.set(patternId, pattern);
    }
    
    // Update pattern
    pattern.frequency++;
    if (status === 'completed') {
      pattern.successRate = (pattern.successRate * (pattern.frequency - 1) + 1) / pattern.frequency;
    }
    pattern.confidence = Math.min(0.9, 0.3 + (pattern.frequency * 0.02));
    
    await this.storePatternInMemory(pattern);
  }

  /**
   * Analyze completion patterns for learning
   */
  private async analyzeCompletionPattern(metadata: any): Promise<void> {
    if (!metadata || !metadata.todoId) return;
    
    const completionData = {
      todoId: metadata.todoId,
      completionTime: new Date(),
      success: true,
      metadata
    };
    
    this.completionHistory.set(metadata.todoId, completionData);
    
    // Update success rates for related patterns
    await this.updatePatternSuccessRates(metadata.todoId);
  }

  /**
   * Update completion history for a todo
   */
  private updateCompletionHistory(todoId: string, event: string, data: any): void {
    const historyEntry = {
      todoId,
      event,
      timestamp: new Date(),
      data
    };
    
    this.completionHistory.set(todoId, historyEntry);
  }

  /**
   * Helper methods
   */
  private estimateTodoComplexity(todo: TodoItem): number {
    let complexity = 1;
    
    // Content-based complexity
    const wordCount = todo.content.split(' ').length;
    complexity += Math.min(wordCount / 10, 3);
    
    // Dependencies add complexity
    if (todo.dependencies) {
      complexity += todo.dependencies.length * 0.5;
    }
    
    // Tags can indicate complexity
    if (todo.tags) {
      const complexityTags = ['complex', 'large', 'research', 'analysis'];
      complexity += todo.tags.filter(tag => complexityTags.includes(tag.toLowerCase())).length;
    }
    
    // Priority affects perceived complexity
    const priorityComplexity = { 'high': 2, 'medium': 1, 'low': 0 };
    complexity += priorityComplexity[todo.priority] || 0;
    
    return Math.min(Math.round(complexity), 10);
  }

  private calculateOptimalPriority(pattern: TodoPattern): 'low' | 'medium' | 'high' {
    if (pattern.outcomes.successProbability > 0.9) {
      return 'high';
    } else if (pattern.outcomes.successProbability > 0.7) {
      return 'medium';
    }
    return 'low';
  }

  private formatTimeEstimate(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}min`;
    } else if (minutes < 1440) {
      const hours = Math.round(minutes / 60 * 10) / 10;
      return `${hours}h`;
    } else {
      const days = Math.round(minutes / 1440 * 10) / 10;
      return `${days}d`;
    }
  }

  private findCommonDependencies(pattern: TodoPattern): string[] {
    // This would analyze historical data to find common dependencies
    // For now, return some intelligent suggestions based on pattern type
    const suggestions: string[] = [];
    
    if (pattern.description.toLowerCase().includes('api')) {
      suggestions.push('Design API schema', 'Set up database');
    }
    if (pattern.description.toLowerCase().includes('test')) {
      suggestions.push('Write code', 'Set up test environment');
    }
    
    return suggestions;
  }

  private generateTodoBreakdown(todo: TodoItem, pattern: TodoPattern): string[] {
    const breakdown: string[] = [];
    const content = todo.content.toLowerCase();
    
    // Intelligent breakdown based on content analysis
    if (content.includes('build') || content.includes('create')) {
      breakdown.push(
        `Plan ${todo.content}`,
        `Implement ${todo.content}`,
        `Test ${todo.content}`,
        `Document ${todo.content}`
      );
    } else if (content.includes('research') || content.includes('analyze')) {
      breakdown.push(
        `Gather information for ${todo.content}`,
        `Analyze findings for ${todo.content}`,
        `Summarize results for ${todo.content}`
      );
    } else {
      // Generic breakdown
      const words = todo.content.split(' ');
      if (words.length > 3) {
        breakdown.push(
          `Start ${todo.content}`,
          `Complete ${todo.content}`,
          `Review ${todo.content}`
        );
      }
    }
    
    return breakdown;
  }

  private generatePatternHash(todo: TodoItem): string {
    const content = todo.content.toLowerCase().replace(/[^\w\s]/g, '').slice(0, 20);
    return `${content}-${todo.priority}-${this.estimateTodoComplexity(todo)}`;
  }

  private updateSessionContext(todo: TodoItem): void {
    const sessionKey = 'current_session';
    const context = this.sessionContext.get(sessionKey) || {
      startTime: new Date(),
      todosCreated: 0,
      patterns: new Set(),
      themes: new Map()
    };
    
    context.todosCreated++;
    
    // Track themes in current session
    const theme = this.extractTheme(todo.content);
    const themeCount = context.themes.get(theme) || 0;
    context.themes.set(theme, themeCount + 1);
    
    this.sessionContext.set(sessionKey, context);
  }

  private extractTheme(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('api') || lowerContent.includes('backend')) return 'backend';
    if (lowerContent.includes('ui') || lowerContent.includes('frontend')) return 'frontend';
    if (lowerContent.includes('test') || lowerContent.includes('testing')) return 'testing';
    if (lowerContent.includes('research') || lowerContent.includes('analyze')) return 'research';
    if (lowerContent.includes('doc') || lowerContent.includes('document')) return 'documentation';
    
    return 'general';
  }

  private async updatePatternSuccessRates(todoId: string): Promise<void> {
    // Update success rates for patterns associated with this todo
    for (const [patternId, pattern] of this.patterns) {
      if (this.isPatternRelatedToTodo(pattern, todoId)) {
        const oldRate = pattern.outcomes.successProbability;
        pattern.outcomes.successProbability = (oldRate * 0.9) + (1 * 0.1); // Weighted average
        await this.storePatternInMemory(pattern);
      }
    }
  }

  private isPatternRelatedToTodo(pattern: TodoPattern, todoId: string): boolean {
    // Check if pattern is related to the completed todo
    return this.completionHistory.has(todoId);
  }

  /**
   * Memory management methods
   */
  private async loadPatternsFromMemory(): Promise<void> {
    try {
      if (!this.memoryManager) {
        this.logger.warn('No memory manager available, starting with empty patterns');
        return;
      }
      
      const storedPatterns = await this.memoryManager.get('todo_intelligence_patterns') || {};
      
      for (const [patternId, patternData] of Object.entries(storedPatterns)) {
        this.patterns.set(patternId, patternData as TodoPattern);
      }
      
      this.logger.info(`Loaded ${this.patterns.size} patterns from memory`);
      
    } catch (error) {
      this.logger.error('Failed to load patterns from memory', error);
    }
  }

  private async storePatternInMemory(pattern: TodoPattern): Promise<void> {
    try {
      if (!this.memoryManager) return;
      
      const storedPatterns = await this.memoryManager.get('todo_intelligence_patterns') || {};
      storedPatterns[pattern.id] = pattern;
      
      await this.memoryManager.store('todo_intelligence_patterns', storedPatterns);
      
    } catch (error) {
      this.logger.error('Failed to store pattern in memory', error);
    }
  }

  private async loadSessionContext(): Promise<void> {
    try {
      if (!this.memoryManager || !this.config.crossSessionLearning) return;
      
      const storedContext = await this.memoryManager.get('todo_session_context') || {};
      
      for (const [key, value] of Object.entries(storedContext)) {
        this.sessionContext.set(key, value);
      }
      
    } catch (error) {
      this.logger.error('Failed to load session context', error);
    }
  }

  private startAnalysisLoop(): void {
    this.analysisTimer = setInterval(async () => {
      await this.runPeriodicAnalysis();
    }, this.config.analysisInterval);
  }

  private async runPeriodicAnalysis(): Promise<void> {
    try {
      // Update metrics
      this.updateMetrics();
      
      // Clean old patterns
      await this.cleanOldPatterns();
      
      // Optimize pattern confidence
      await this.optimizePatternConfidence();
      
      // Save session context
      await this.saveSessionContext();
      
      this.metricsCache.lastAnalysisRun = new Date();
      
      this.emit('analysis:completed', {
        metrics: this.metricsCache,
        patternsCount: this.patterns.size,
        recommendationsCount: Array.from(this.recommendations.values()).reduce((sum, recs) => sum + recs.length, 0)
      });
      
    } catch (error) {
      this.logger.error('Failed to run periodic analysis', error);
    }
  }

  private updateMetrics(): void {
    this.metricsCache.totalPatterns = this.patterns.size;
    this.metricsCache.activeRecommendations = Array.from(this.recommendations.values())
      .reduce((sum, recs) => sum + recs.length, 0);
    
    // Calculate pattern accuracy
    const validPatterns = Array.from(this.patterns.values()).filter(p => p.frequency > 5);
    this.metricsCache.patternAccuracy = validPatterns.length > 0 ? 
      validPatterns.reduce((sum, p) => sum + p.confidence, 0) / validPatterns.length : 0;
  }

  private async cleanOldPatterns(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.memoryRetentionDays);
    
    const patternsToDelete: string[] = [];
    
    for (const [patternId, pattern] of this.patterns) {
      if (pattern.lastSeen < cutoffDate && pattern.frequency < 5) {
        patternsToDelete.push(patternId);
      }
    }
    
    for (const patternId of patternsToDelete) {
      this.patterns.delete(patternId);
    }
    
    if (patternsToDelete.length > 0) {
      this.logger.info(`Cleaned ${patternsToDelete.length} old patterns`);
    }
  }

  private async optimizePatternConfidence(): Promise<void> {
    for (const [patternId, pattern] of this.patterns) {
      // Decay confidence over time for unused patterns
      const daysSinceLastSeen = (Date.now() - pattern.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastSeen > 7) {
        pattern.confidence *= 0.98; // Slight decay
        await this.storePatternInMemory(pattern);
      }
    }
  }

  private async saveSessionContext(): Promise<void> {
    try {
      if (!this.memoryManager || !this.config.crossSessionLearning) return;
      
      const contextToSave: any = {};
      for (const [key, value] of this.sessionContext) {
        contextToSave[key] = value;
      }
      
      await this.memoryManager.store('todo_session_context', contextToSave);
      
    } catch (error) {
      this.logger.error('Failed to save session context', error);
    }
  }

  /**
   * Event handlers for learning
   */
  private async handleRecommendationAccepted(data: { todoId: string, recommendationId: string }): Promise<void> {
    this.metricsCache.recommendationsAccepted++;
    
    // Increase confidence in patterns that led to accepted recommendations
    const recommendations = this.recommendations.get(data.todoId) || [];
    const acceptedRec = recommendations.find(r => r.todoId === data.todoId);
    
    if (acceptedRec) {
      for (const patternId of acceptedRec.basedOnPatterns) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
          pattern.confidence = Math.min(0.95, pattern.confidence * 1.1);
          await this.storePatternInMemory(pattern);
        }
      }
    }
  }

  private async handleRecommendationRejected(data: { todoId: string, recommendationId: string }): Promise<void> {
    // Decrease confidence in patterns that led to rejected recommendations
    const recommendations = this.recommendations.get(data.todoId) || [];
    const rejectedRec = recommendations.find(r => r.todoId === data.todoId);
    
    if (rejectedRec) {
      for (const patternId of rejectedRec.basedOnPatterns) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
          pattern.confidence = Math.max(0.1, pattern.confidence * 0.9);
          await this.storePatternInMemory(pattern);
        }
      }
    }
  }

  private async handlePatternDiscovered(data: { pattern: TodoPattern }): Promise<void> {
    const { pattern } = data;
    this.patterns.set(pattern.id, pattern);
    await this.storePatternInMemory(pattern);
    
    this.logger.info(`New pattern discovered: ${pattern.description}`);
  }

  /**
   * Public API methods
   */
  public getRecommendations(todoId: string): TodoRecommendation[] {
    return this.recommendations.get(todoId) || [];
  }

  public getAllPatterns(): TodoPattern[] {
    return Array.from(this.patterns.values());
  }

  public getPatternsByType(type: TodoPattern['patternType']): TodoPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.patternType === type);
  }

  public getMetrics(): TodoIntelligenceMetrics {
    return { ...this.metricsCache };
  }

  public async acceptRecommendation(todoId: string, recommendationId: string): Promise<void> {
    this.emit('recommendation:accepted', { todoId, recommendationId });
  }

  public async rejectRecommendation(todoId: string, recommendationId: string): Promise<void> {
    this.emit('recommendation:rejected', { todoId, recommendationId });
  }

  public async shutdown(): Promise<void> {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    
    // Save final state to memory
    await this.saveSessionContext();
    
    this.logger.info('Memory-driven todo intelligence system shutdown complete');
  }
} 