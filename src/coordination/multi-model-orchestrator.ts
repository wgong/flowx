/**
 * Multi-Model Orchestration System
 * Intelligent routing between Claude, Gemini, GPT-4 and other AI models
 */

import { EventEmitter } from 'node:events';
import { ILogger } from '../core/logger.ts';
import { IEventBus } from '../core/event-bus.ts';
import { TaskDefinition, TaskResult, AgentState, TaskPriority } from '../swarm/types.ts';
import { generateId } from '../utils/helpers.ts';

export interface ModelCapability {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  optimalUseCases: string[];
  performanceMetrics: {
    speed: number; // 0-1
    accuracy: number; // 0-1
    creativity: number; // 0-1
    reasoning: number; // 0-1
    codeGeneration: number; // 0-1
    analysis: number; // 0-1
    writing: number; // 0-1
    multimodal: number; // 0-1
  };
  contextWindow: number;
  costPerToken: {
    input: number;
    output: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  supportedLanguages: string[];
  specialFeatures: string[];
}

export interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: ModelCapability[];
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: Date;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  errorRate: number;
  quotaUsed: number;
  quotaLimit: number;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface ModelRequest {
  id: string;
  taskId: string;
  agentId: string;
  content: string;
  requirements: {
    taskType: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    expectedResponseTime: number;
    maxCost: number;
    qualityThreshold: number;
    specialRequirements: string[];
  };
  context: {
    previousMessages: any[];
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  routing: {
    preferredModel?: string;
    fallbackModels: string[];
    routingReason: string;
    confidence: number;
  };
  metadata: Record<string, any>;
}

export interface ModelResponse {
  id: string;
  requestId: string;
  modelId: string;
  providerId: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  performance: {
    responseTime: number;
    quality: number;
    accuracy: number;
    relevance: number;
  };
  metadata: {
    finishReason: string;
    model: string;
    created: Date;
    headers: Record<string, string>;
  };
  success: boolean;
  error?: string;
}

export interface RoutingDecision {
  selectedModel: string;
  selectedProvider: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{
    model: string;
    provider: string;
    score: number;
    reason: string;
  }>;
  factors: {
    taskType: number;
    performance: number;
    cost: number;
    availability: number;
    quality: number;
  };
  fallbackChain: string[];
}

export interface OrchestratorConfig {
  defaultModel: string;
  defaultProvider: string;
  routingStrategy: 'performance' | 'cost' | 'balanced' | 'quality' | 'speed' | 'intelligent';
  enableFallback: boolean;
  enableLoadBalancing: boolean;
  enableCaching: boolean;
  enableRetries: boolean;
  healthCheckInterval: number;
  metricsCollection: boolean;
  costOptimization: boolean;
  qualityThreshold: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
  enableModelEnsemble: boolean;
  enableAdaptiveRouting: boolean;
}

/**
 * Multi-Model Orchestrator with Intelligent Routing
 */
export class MultiModelOrchestrator extends EventEmitter {
  private logger: ILogger;
  private eventBus: IEventBus;
  private config: OrchestratorConfig;
  
  // Model providers and capabilities
  private providers = new Map<string, ModelProvider>();
  private models = new Map<string, ModelCapability>();
  private modelProviderMap = new Map<string, string>();
  
  // Routing and performance
  private routingEngine!: RoutingEngine;
  private performanceTracker!: PerformanceTracker;
  private loadBalancer!: ModelLoadBalancer;
  private cacheManager!: ResponseCacheManager;
  
  // Request management
  private activeRequests = new Map<string, ModelRequest>();
  private requestQueue: ModelRequest[] = [];
  private responseHistory: ModelResponse[] = [];
  
  // Health monitoring
  private healthMonitor!: HealthMonitor;
  private healthCheckInterval?: NodeJS.Timeout;
  
  // Analytics and optimization
  private analytics!: ModelAnalytics;
  private costTracker!: CostTracker;
  private qualityAssessor!: QualityAssessor;
  
  constructor(
    config: Partial<OrchestratorConfig>,
    logger: ILogger,
    eventBus: IEventBus
  ) {
    super();
    this.logger = logger;
    this.eventBus = eventBus;
    
    this.config = {
      defaultModel: 'claude-3-5-sonnet-20241022',
      defaultProvider: 'anthropic',
      routingStrategy: 'intelligent',
      enableFallback: true,
      enableLoadBalancing: true,
      enableCaching: true,
      enableRetries: true,
      healthCheckInterval: 60000,
      metricsCollection: true,
      costOptimization: true,
      qualityThreshold: 0.8,
      maxConcurrentRequests: 50,
      requestTimeout: 30000,
      enableModelEnsemble: false,
      enableAdaptiveRouting: true,
      ...config
    };
    
    this.initializeOrchestrator();
  }
  
  private async initializeOrchestrator(): Promise<void> {
    // Initialize model providers
    await this.initializeProviders();
    
    // Initialize routing engine
    this.routingEngine = new RoutingEngine(this.models, this.providers, this.logger);
    
    // Initialize performance tracker
    this.performanceTracker = new PerformanceTracker(this.logger);
    
    // Initialize load balancer
    this.loadBalancer = new ModelLoadBalancer(this.providers, this.logger);
    
    // Initialize cache manager
    if (this.config.enableCaching) {
      this.cacheManager = new ResponseCacheManager(this.logger);
    }
    
    // Initialize health monitor
    this.healthMonitor = new HealthMonitor(this.providers, this.logger);
    
    // Initialize analytics
    this.analytics = new ModelAnalytics(this.logger);
    this.costTracker = new CostTracker(this.logger);
    this.qualityAssessor = new QualityAssessor(this.logger);
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    this.logger.info('Multi-Model Orchestrator initialized', {
      providers: this.providers.size,
      models: this.models.size,
      routingStrategy: this.config.routingStrategy
    });
  }
  
  private async initializeProviders(): Promise<void> {
    // Anthropic Claude
    const anthropicProvider: ModelProvider = {
      id: 'anthropic',
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      models: [],
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      quotaUsed: 0,
      quotaLimit: 1000000,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    };
    
    // Claude models
    const claudeModels: ModelCapability[] = [
      {
        name: 'claude-3-5-sonnet-20241022',
        description: 'Most capable Claude model with excellent reasoning and code generation',
        strengths: ['reasoning', 'code_generation', 'analysis', 'writing'],
        weaknesses: ['image_generation', 'real_time_data'],
        optimalUseCases: ['complex_reasoning', 'code_review', 'technical_writing', 'analysis'],
        performanceMetrics: {
          speed: 0.8,
          accuracy: 0.95,
          creativity: 0.9,
          reasoning: 0.95,
          codeGeneration: 0.95,
          analysis: 0.9,
          writing: 0.9,
          multimodal: 0.8
        },
        contextWindow: 200000,
        costPerToken: { input: 0.003, output: 0.015 },
        rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 },
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
        specialFeatures: ['function_calling', 'structured_output', 'long_context']
      },
      {
        name: 'claude-3-haiku-20240307',
        description: 'Fast and efficient Claude model for simple tasks',
        strengths: ['speed', 'efficiency', 'cost_effectiveness'],
        weaknesses: ['complex_reasoning', 'creative_writing'],
        optimalUseCases: ['simple_tasks', 'classification', 'summarization'],
        performanceMetrics: {
          speed: 0.95,
          accuracy: 0.85,
          creativity: 0.7,
          reasoning: 0.8,
          codeGeneration: 0.8,
          analysis: 0.75,
          writing: 0.8,
          multimodal: 0.7
        },
        contextWindow: 200000,
        costPerToken: { input: 0.00025, output: 0.00125 },
        rateLimit: { requestsPerMinute: 100, tokensPerMinute: 100000 },
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
        specialFeatures: ['function_calling', 'structured_output', 'long_context']
      }
    ];
    
    anthropicProvider.models = claudeModels;
    this.providers.set('anthropic', anthropicProvider);
    
    // OpenAI GPT
    const openaiProvider: ModelProvider = {
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      apiKey: process.env.OPENAI_API_KEY || '',
      models: [],
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      quotaUsed: 0,
      quotaLimit: 1000000,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    };
    
    // GPT models
    const gptModels: ModelCapability[] = [
      {
        name: 'gpt-4-turbo-preview',
        description: 'Most capable GPT-4 model with enhanced reasoning',
        strengths: ['reasoning', 'creativity', 'general_knowledge', 'multimodal'],
        weaknesses: ['cost', 'speed', 'context_window'],
        optimalUseCases: ['creative_writing', 'brainstorming', 'general_qa', 'image_analysis'],
        performanceMetrics: {
          speed: 0.6,
          accuracy: 0.9,
          creativity: 0.95,
          reasoning: 0.9,
          codeGeneration: 0.85,
          analysis: 0.85,
          writing: 0.95,
          multimodal: 0.9
        },
        contextWindow: 128000,
        costPerToken: { input: 0.01, output: 0.03 },
        rateLimit: { requestsPerMinute: 30, tokensPerMinute: 30000 },
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
        specialFeatures: ['function_calling', 'vision', 'json_mode', 'reproducible_outputs']
      },
      {
        name: 'gpt-3.5-turbo',
        description: 'Fast and cost-effective GPT model',
        strengths: ['speed', 'cost_effectiveness', 'general_purpose'],
        weaknesses: ['reasoning', 'complex_tasks', 'accuracy'],
        optimalUseCases: ['simple_tasks', 'chatbots', 'content_generation'],
        performanceMetrics: {
          speed: 0.9,
          accuracy: 0.8,
          creativity: 0.8,
          reasoning: 0.75,
          codeGeneration: 0.8,
          analysis: 0.75,
          writing: 0.85,
          multimodal: 0.0
        },
        contextWindow: 16385,
        costPerToken: { input: 0.0005, output: 0.0015 },
        rateLimit: { requestsPerMinute: 60, tokensPerMinute: 60000 },
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
        specialFeatures: ['function_calling', 'json_mode']
      }
    ];
    
    openaiProvider.models = gptModels;
    this.providers.set('openai', openaiProvider);
    
    // Google Gemini
    const googleProvider: ModelProvider = {
      id: 'google',
      name: 'Google',
      baseUrl: 'https://generativelanguage.googleapis.com',
      apiKey: process.env.GOOGLE_API_KEY || '',
      models: [],
      healthStatus: 'healthy',
      lastHealthCheck: new Date(),
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      quotaUsed: 0,
      quotaLimit: 1000000,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    };
    
    // Gemini models
    const geminiModels: ModelCapability[] = [
      {
        name: 'gemini-pro',
        description: 'Google\'s most capable multimodal model',
        strengths: ['multimodal', 'reasoning', 'analysis', 'real_time_data'],
        weaknesses: ['availability', 'consistency'],
        optimalUseCases: ['multimodal_analysis', 'research', 'data_analysis', 'reasoning'],
        performanceMetrics: {
          speed: 0.75,
          accuracy: 0.85,
          creativity: 0.8,
          reasoning: 0.85,
          codeGeneration: 0.8,
          analysis: 0.9,
          writing: 0.8,
          multimodal: 0.95
        },
        contextWindow: 32768,
        costPerToken: { input: 0.00025, output: 0.0005 },
        rateLimit: { requestsPerMinute: 60, tokensPerMinute: 32000 },
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
        specialFeatures: ['multimodal', 'function_calling', 'grounding']
      },
      {
        name: 'gemini-pro-vision',
        description: 'Specialized Gemini model for vision tasks',
        strengths: ['vision', 'image_analysis', 'multimodal_reasoning'],
        weaknesses: ['text_only_tasks', 'speed'],
        optimalUseCases: ['image_analysis', 'visual_qa', 'document_analysis'],
        performanceMetrics: {
          speed: 0.7,
          accuracy: 0.9,
          creativity: 0.75,
          reasoning: 0.8,
          codeGeneration: 0.7,
          analysis: 0.85,
          writing: 0.75,
          multimodal: 0.98
        },
        contextWindow: 16384,
        costPerToken: { input: 0.00025, output: 0.0005 },
        rateLimit: { requestsPerMinute: 60, tokensPerMinute: 16000 },
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
        specialFeatures: ['vision', 'multimodal', 'document_understanding']
      }
    ];
    
    googleProvider.models = geminiModels;
    this.providers.set('google', googleProvider);
    
    // Build model lookup maps
    for (const [providerId, provider] of this.providers) {
      for (const model of provider.models) {
        this.models.set(model.name, model);
        this.modelProviderMap.set(model.name, providerId);
      }
    }
  }
  
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }
  
  private async performHealthChecks(): Promise<void> {
    for (const [providerId, provider] of this.providers) {
      try {
        const isHealthy = await this.healthMonitor.checkProviderHealth(provider);
        provider.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
        provider.lastHealthCheck = new Date();
      } catch (error) {
        provider.healthStatus = 'unhealthy';
        this.logger.warn('Health check failed', { providerId, error });
      }
    }
  }
  
  private setupEventHandlers(): void {
    this.eventBus.on('task:created', (task: TaskDefinition) => {
      this.analytics.recordTaskCreated(task);
    });
    
    this.eventBus.on('model:request', (request: ModelRequest) => {
      this.analytics.recordModelRequest(request);
    });
    
    this.eventBus.on('model:response', (response: ModelResponse) => {
      this.analytics.recordModelResponse(response);
      this.performanceTracker.recordResponse(response);
      this.costTracker.recordUsage(response);
    });
  }
  
  /**
   * Process a task using intelligent model routing
   */
  async processTask(task: TaskDefinition, agent: AgentState): Promise<TaskResult> {
    const requestId = generateId('request');
    
    // Create model request
    const request: ModelRequest = {
      id: requestId,
      taskId: task.id.id,
      agentId: agent.id.id,
      content: task.description,
      requirements: {
        taskType: task.type,
        priority: this.mapPriority(task.priority),
        expectedResponseTime: 30000,
        maxCost: 1.0,
        qualityThreshold: this.config.qualityThreshold,
        specialRequirements: (task.requirements as any)?.specialRequirements || []
      },
      context: {
        previousMessages: [],
        systemPrompt: this.generateSystemPrompt(task, agent),
        temperature: 0.7,
        maxTokens: 4000,
        topP: 0.9
      },
      routing: {
        preferredModel: undefined,
        fallbackModels: [],
        routingReason: '',
        confidence: 0
      },
      metadata: {
        agent: agent.name,
        agentType: agent.type,
        taskComplexity: (task as any).complexity || 0.5
      }
    };
    
    // Intelligent routing decision
    const routingDecision = await this.routingEngine.selectModel(request);
    request.routing = {
      preferredModel: routingDecision.selectedModel,
      fallbackModels: routingDecision.fallbackChain,
      routingReason: routingDecision.reasoning,
      confidence: routingDecision.confidence
    };
    
    this.logger.info('Model routing decision', {
      taskId: task.id.id,
      selectedModel: routingDecision.selectedModel,
      confidence: routingDecision.confidence,
      reasoning: routingDecision.reasoning
    });
    
    // Execute request with fallback
    const response = await this.executeRequest(request);
    
    // Convert to task result
    const taskResult: TaskResult = {
      output: response.content,
      artifacts: {},
      metadata: {
        model: response.modelId,
        provider: response.providerId,
        usage: response.usage,
        performance: response.performance,
        executionTime: response.performance.responseTime,
        quality: response.performance.quality
      },
      quality: response.performance.quality,
      completeness: response.performance.relevance,
      accuracy: response.performance.accuracy,
      executionTime: response.performance.responseTime,
      resourcesUsed: {
        cpuTime: response.performance.responseTime,
        maxMemory: 0,
        diskIO: 0,
        networkIO: response.usage.totalTokens,
        fileHandles: 0
      },
      validated: response.success
    };
    
    return taskResult;
  }
  
  private async executeRequest(request: ModelRequest): Promise<ModelResponse> {
    this.activeRequests.set(request.id, request);
    
    try {
      // Check cache first
      if (this.config.enableCaching && this.cacheManager) {
        const cached = await this.cacheManager.get(request);
        if (cached) {
          this.logger.debug('Cache hit for request', { requestId: request.id });
          return cached;
        }
      }
      
      // Execute with primary model
      let response = await this.executeWithModel(request, request.routing.preferredModel!);
      
      // If failed and fallback enabled, try fallback models
      if (!response.success && this.config.enableFallback) {
        for (const fallbackModel of request.routing.fallbackModels) {
          this.logger.info('Trying fallback model', { 
            requestId: request.id, 
            fallbackModel 
          });
          
          response = await this.executeWithModel(request, fallbackModel);
          if (response.success) break;
        }
      }
      
      // Cache successful response
      if (response.success && this.config.enableCaching && this.cacheManager) {
        await this.cacheManager.set(request, response);
      }
      
      // Record metrics
      this.recordRequestMetrics(request, response);
      
      return response;
      
    } finally {
      this.activeRequests.delete(request.id);
    }
  }
  
  private async executeWithModel(request: ModelRequest, modelName: string): Promise<ModelResponse> {
    const model = this.models.get(modelName);
    const providerId = this.modelProviderMap.get(modelName);
    const provider = this.providers.get(providerId!);
    
    if (!model || !provider) {
      throw new Error(`Model or provider not found: ${modelName}`);
    }
    
    const startTime = Date.now();
    
    try {
      // Load balancing
      if (this.config.enableLoadBalancing) {
        const canExecute = await this.loadBalancer.canExecute(provider);
        if (!canExecute) {
          throw new Error(`Provider ${providerId} overloaded`);
        }
      }
      
      // Execute based on provider
      let result: any;
      switch (providerId) {
        case 'anthropic':
          result = await this.executeAnthropicRequest(request, model, provider);
          break;
        case 'openai':
          result = await this.executeOpenAIRequest(request, model, provider);
          break;
        case 'google':
          result = await this.executeGoogleRequest(request, model, provider);
          break;
        default:
          throw new Error(`Unknown provider: ${providerId}`);
      }
      
      const responseTime = Date.now() - startTime;
      
      // Assess quality
      const quality = await this.qualityAssessor.assessResponse(request, result.content);
      
      const response: ModelResponse = {
        id: generateId('response'),
        requestId: request.id,
        modelId: modelName,
        providerId: providerId!,
        content: result.content,
        usage: result.usage,
        performance: {
          responseTime,
          quality: quality.overall,
          accuracy: quality.accuracy,
          relevance: quality.relevance
        },
        metadata: {
          finishReason: result.finishReason || 'stop',
          model: modelName,
          created: new Date(),
          headers: result.headers || {}
        },
        success: true
      };
      
      // Update provider metrics
      provider.totalRequests++;
      provider.successfulRequests++;
      provider.averageResponseTime = 
        (provider.averageResponseTime * (provider.totalRequests - 1) + responseTime) / provider.totalRequests;
      
      this.emit('model:response', response);
      
      return response;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update provider error metrics
      provider.totalRequests++;
      provider.errorRate = (provider.totalRequests - provider.successfulRequests) / provider.totalRequests;
      
      const response: ModelResponse = {
        id: generateId('response'),
        requestId: request.id,
        modelId: modelName,
        providerId: providerId!,
        content: '',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
        performance: { responseTime, quality: 0, accuracy: 0, relevance: 0 },
        metadata: {
          finishReason: 'error',
          model: modelName,
          created: new Date(),
          headers: {}
        },
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.emit('model:error', { request, response, error });
      
      return response;
    }
  }
  
  private async executeAnthropicRequest(request: ModelRequest, model: ModelCapability, provider: ModelProvider): Promise<any> {
    // Simulate Anthropic API call
    const response = {
      content: `Claude response for: ${request.content}`,
      usage: {
        promptTokens: Math.floor(request.content.length / 4),
        completionTokens: 500,
        totalTokens: Math.floor(request.content.length / 4) + 500,
        cost: (Math.floor(request.content.length / 4) * model.costPerToken.input) + (500 * model.costPerToken.output)
      },
      finishReason: 'stop'
    };
    
    return response;
  }
  
  private async executeOpenAIRequest(request: ModelRequest, model: ModelCapability, provider: ModelProvider): Promise<any> {
    // Simulate OpenAI API call
    const response = {
      content: `GPT response for: ${request.content}`,
      usage: {
        promptTokens: Math.floor(request.content.length / 4),
        completionTokens: 400,
        totalTokens: Math.floor(request.content.length / 4) + 400,
        cost: (Math.floor(request.content.length / 4) * model.costPerToken.input) + (400 * model.costPerToken.output)
      },
      finishReason: 'stop'
    };
    
    return response;
  }
  
  private async executeGoogleRequest(request: ModelRequest, model: ModelCapability, provider: ModelProvider): Promise<any> {
    // Simulate Google API call
    const response = {
      content: `Gemini response for: ${request.content}`,
      usage: {
        promptTokens: Math.floor(request.content.length / 4),
        completionTokens: 450,
        totalTokens: Math.floor(request.content.length / 4) + 450,
        cost: (Math.floor(request.content.length / 4) * model.costPerToken.input) + (450 * model.costPerToken.output)
      },
      finishReason: 'stop'
    };
    
    return response;
  }
  
  private generateSystemPrompt(task: TaskDefinition, agent: AgentState): string {
    return `You are a ${agent.type} agent specializing in ${task.type} tasks. 
Your role is to provide high-quality, accurate responses that meet the specific requirements of the task.
Focus on delivering practical, actionable solutions with clear explanations.`;
  }
  
  private mapPriority(priority: TaskPriority): 'low' | 'medium' | 'high' | 'urgent' {
    switch (priority) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'normal': return 'medium';
      case 'low': return 'low';
      case 'background': return 'low';
      default: return 'medium';
    }
  }
  
  private recordRequestMetrics(request: ModelRequest, response: ModelResponse): void {
    this.responseHistory.push(response);
    
    // Keep only last 1000 responses
    if (this.responseHistory.length > 1000) {
      this.responseHistory.shift();
    }
    
    // Update analytics
    this.analytics.recordRequestComplete(request, response);
  }
  
  /**
   * Get orchestrator statistics
   */
  getStatistics(): any {
    return {
      providers: Array.from(this.providers.values()).map(p => ({
        id: p.id,
        name: p.name,
        healthStatus: p.healthStatus,
        totalRequests: p.totalRequests,
        successfulRequests: p.successfulRequests,
        errorRate: p.errorRate,
        averageResponseTime: p.averageResponseTime
      })),
      models: Array.from(this.models.values()).map(m => ({
        name: m.name,
        description: m.description,
        performanceMetrics: m.performanceMetrics,
        costPerToken: m.costPerToken
      })),
      activeRequests: this.activeRequests.size,
      totalResponses: this.responseHistory.length,
      config: this.config
    };
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): any {
    return this.performanceTracker.getMetrics();
  }
  
  /**
   * Get cost analytics
   */
  getCostAnalytics(): any {
    return this.costTracker.getAnalytics();
  }
  
  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Wait for active requests to complete
    const activeRequestIds = Array.from(this.activeRequests.keys());
    if (activeRequestIds.length > 0) {
      this.logger.info('Waiting for active requests to complete', { count: activeRequestIds.length });
      
      // Wait up to 30 seconds for requests to complete
      const timeout = setTimeout(() => {
        this.logger.warn('Timeout waiting for requests to complete');
      }, 30000);
      
      while (this.activeRequests.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      clearTimeout(timeout);
    }
    
    this.logger.info('Multi-Model Orchestrator shutdown complete');
  }
}

// Supporting classes (simplified implementations)

class RoutingEngine {
  constructor(
    private models: Map<string, ModelCapability>,
    private providers: Map<string, ModelProvider>,
    private logger: ILogger
  ) {}
  
  async selectModel(request: ModelRequest): Promise<RoutingDecision> {
    // Intelligent routing logic
    const scores = new Map<string, number>();
    
    for (const [modelName, model] of this.models) {
      const providerId = this.getProviderId(modelName);
      const provider = this.providers.get(providerId);
      
      if (!provider || provider.healthStatus !== 'healthy') {
        continue;
      }
      
      let score = 0;
      
      // Task type matching
      if (request.requirements.taskType === 'coding') {
        score += model.performanceMetrics.codeGeneration * 0.4;
      } else if (request.requirements.taskType === 'analysis') {
        score += model.performanceMetrics.analysis * 0.4;
      } else if (request.requirements.taskType === 'research') {
        score += model.performanceMetrics.reasoning * 0.4;
      }
      
      // Performance factors
      score += model.performanceMetrics.speed * 0.2;
      score += model.performanceMetrics.accuracy * 0.3;
      score += (1 - provider.errorRate) * 0.1;
      
      scores.set(modelName, score);
    }
    
    // Select best model
    const sortedModels = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const selectedModel = sortedModels[0]?.[0] || 'claude-3-5-sonnet-20241022';
    const selectedProvider = this.getProviderId(selectedModel);
    
    return {
      selectedModel,
      selectedProvider,
      confidence: sortedModels[0]?.[1] || 0.5,
      reasoning: `Selected ${selectedModel} based on task type ${request.requirements.taskType}`,
      alternatives: sortedModels.slice(1, 3).map(([model, score]) => ({
        model,
        provider: this.getProviderId(model),
        score,
        reason: 'Alternative option'
      })),
      factors: {
        taskType: 0.4,
        performance: 0.3,
        cost: 0.1,
        availability: 0.1,
        quality: 0.1
      },
      fallbackChain: sortedModels.slice(1, 4).map(([model]) => model)
    };
  }
  
  private getProviderId(modelName: string): string {
    if (modelName.includes('claude')) return 'anthropic';
    if (modelName.includes('gpt')) return 'openai';
    if (modelName.includes('gemini')) return 'google';
    return 'anthropic';
  }
}

class PerformanceTracker {
  private metrics = new Map<string, any>();
  
  constructor(private logger: ILogger) {}
  
  recordResponse(response: ModelResponse): void {
    const key = `${response.providerId}:${response.modelId}`;
    const existing = this.metrics.get(key) || {
      totalRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      totalCost: 0,
      averageCost: 0
    };
    
    existing.totalRequests++;
    existing.totalResponseTime += response.performance.responseTime;
    existing.averageResponseTime = existing.totalResponseTime / existing.totalRequests;
    existing.totalCost += response.usage.cost;
    existing.averageCost = existing.totalCost / existing.totalRequests;
    
    this.metrics.set(key, existing);
  }
  
  getMetrics(): any {
    return Object.fromEntries(this.metrics);
  }
}

class ModelLoadBalancer {
  constructor(
    private providers: Map<string, ModelProvider>,
    private logger: ILogger
  ) {}
  
  async canExecute(provider: ModelProvider): Promise<boolean> {
    // Simple load balancing logic
    const utilizationRate = provider.totalRequests / provider.quotaLimit;
    return utilizationRate < 0.9; // 90% utilization threshold
  }
}

class ResponseCacheManager {
  private cache = new Map<string, ModelResponse>();
  
  constructor(private logger: ILogger) {}
  
  async get(request: ModelRequest): Promise<ModelResponse | null> {
    const key = this.getCacheKey(request);
    return this.cache.get(key) || null;
  }
  
  async set(request: ModelRequest, response: ModelResponse): Promise<void> {
    const key = this.getCacheKey(request);
    this.cache.set(key, response);
    
    // Simple TTL cleanup
    setTimeout(() => {
      this.cache.delete(key);
    }, 300000); // 5 minutes
  }
  
  private getCacheKey(request: ModelRequest): string {
    return `${request.content}:${request.context.temperature}:${request.context.maxTokens}`;
  }
}

class HealthMonitor {
  constructor(
    private providers: Map<string, ModelProvider>,
    private logger: ILogger
  ) {}
  
  async checkProviderHealth(provider: ModelProvider): Promise<boolean> {
    // Simple health check - in reality would ping the API
    return provider.errorRate < 0.1; // Less than 10% error rate
  }
}

class ModelAnalytics {
  private requestCount = 0;
  private responseCount = 0;
  
  constructor(private logger: ILogger) {}
  
  recordTaskCreated(task: TaskDefinition): void {
    // Analytics logic
  }
  
  recordModelRequest(request: ModelRequest): void {
    this.requestCount++;
  }
  
  recordModelResponse(response: ModelResponse): void {
    this.responseCount++;
  }
  
  recordRequestComplete(request: ModelRequest, response: ModelResponse): void {
    // Analytics logic
  }
}

class CostTracker {
  private totalCost = 0;
  
  constructor(private logger: ILogger) {}
  
  recordUsage(response: ModelResponse): void {
    this.totalCost += response.usage.cost;
  }
  
  getAnalytics(): any {
    return {
      totalCost: this.totalCost,
      averageCostPerRequest: this.totalCost / Math.max(1, this.totalCost)
    };
  }
}

class QualityAssessor {
  constructor(private logger: ILogger) {}
  
  async assessResponse(request: ModelRequest, content: string): Promise<any> {
    // Simple quality assessment
    const wordCount = content.split(' ').length;
    const hasStructure = content.includes('\n') || content.includes('.');
    
    return {
      overall: wordCount > 10 && hasStructure ? 0.8 : 0.6,
      accuracy: 0.8,
      relevance: 0.8,
      completeness: wordCount > 50 ? 0.8 : 0.6
    };
  }
} 