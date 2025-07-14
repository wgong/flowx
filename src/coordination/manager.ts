/**
 * Coordination manager for task scheduling and resource management
 */

import { EventEmitter } from 'events';
import type { IEventBus } from '../core/event-bus.js';
import type { ILogger } from '../core/logger.js';
import type { Task, AgentProfile } from '../core/types.js';
import { TaskCoordinator, CoordinationConfig } from './task-coordinator.js';
import { WorkStealingCoordinator, WorkStealingConfig } from './work-stealing.js';
import { CircuitBreakerManager, CircuitBreakerConfig } from './circuit-breaker.js';

export interface ICoordinationManager {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  registerAgent(profile: AgentProfile): Promise<void>;
  unregisterAgent(agentId: string): Promise<void>;
  assignTask(task: Task, agentId?: string, strategy?: string): Promise<string>;
  completeTask(taskId: string, agentId: string, result: unknown, duration: number): Promise<void>;
  failTask(taskId: string, agentId: string, error: Error): Promise<void>;
  getHealthStatus(): Promise<{ 
    healthy: boolean; 
    error?: string; 
    metrics?: Record<string, number>;
  }>;
  getCoordinationMetrics(): Promise<Record<string, unknown>>;
  performMaintenance(): Promise<void>;
  getAgentTaskCount(agentId: string): Promise<number>;
  getAgentTasks(agentId: string): Promise<Task[]>;
  cancelTask(taskId: string): Promise<void>;
}

export interface EnhancedCoordinationConfig {
  coordination: CoordinationConfig;
  workStealing: WorkStealingConfig;
  circuitBreaker: CircuitBreakerConfig;
  enableAdvancedFeatures: boolean;
}

export class CoordinationManager extends EventEmitter implements ICoordinationManager {
  private scheduler: TaskCoordinator;
  private workStealer: WorkStealingCoordinator;
  private circuitBreakers: CircuitBreakerManager;
  private initialized = false;

  constructor(
    private config: EnhancedCoordinationConfig,
    private eventBus: IEventBus,
    private logger: ILogger,
  ) {
    super();
    
    // Initialize components
    this.scheduler = new TaskCoordinator(
      this.config.coordination,
      this.eventBus,
      this.logger
    );
    
    this.workStealer = new WorkStealingCoordinator(
      {
        enabled: true,
        stealThreshold: 2,
        maxStealBatch: 3,
        stealInterval: 30000,
        minTasksToSteal: 1
      },
      this.eventBus,
      this.logger
    );
    
    this.circuitBreakers = new CircuitBreakerManager(
      this.config.circuitBreaker,
      this.logger,
      this.eventBus
    );
    
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing coordination manager');

    try {
      // Initialize all components
      await this.scheduler.initialize();
      await this.workStealer.initialize();
      await this.circuitBreakers.initialize();

      this.initialized = true;
      this.logger.info('Coordination manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize coordination manager', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.info('Shutting down coordination manager');

    try {
      // Shutdown all components
      await this.scheduler.shutdown();
      await this.workStealer.shutdown();
      await this.circuitBreakers.shutdown();

      this.initialized = false;
      this.removeAllListeners();
      this.logger.info('Coordination manager shut down successfully');
    } catch (error) {
      this.logger.error('Error during coordination manager shutdown', error);
      throw error;
    }
  }

  async registerAgent(profile: AgentProfile): Promise<void> {
    this.logger.info('Registering agent with coordination manager', { agentId: profile.id });
    
    // Register with scheduler
    this.scheduler.registerAgent(profile);
    
    // Register with work stealer
    this.workStealer.registerAgent(profile);
    
    this.logger.info('Agent registered successfully', { agentId: profile.id });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    this.logger.info('Unregistering agent from coordination manager', { agentId });
    
    // Unregister from scheduler
    this.scheduler.unregisterAgent(agentId);
    
    // Unregister from work stealer
    this.workStealer.unregisterAgent(agentId);
    
    this.logger.info('Agent unregistered successfully', { agentId });
  }

  async assignTask(task: Task, agentId?: string, strategy?: string): Promise<string> {
    this.logger.info('Assigning task via coordination manager', { 
      taskId: task.id, 
      agentId, 
      strategy 
    });

    try {
      // Use scheduler to assign task
      const assignedAgentId = await this.scheduler.assignTask(task, agentId, strategy);
      
      // Update work stealer with new task assignment
      this.workStealer.updateAgentWorkload(assignedAgentId, {
        agentId: assignedAgentId,
        taskCount: this.scheduler.getAgentTaskCount(assignedAgentId),
        avgTaskDuration: 0, // Will be updated on completion
        cpuUsage: 0, // Would be updated by monitoring
        memoryUsage: 0, // Would be updated by monitoring
        priority: 1,
        capabilities: []
      });

      return assignedAgentId;
    } catch (error) {
      this.logger.error('Failed to assign task', { taskId: task.id, error });
      throw error;
    }
  }

  async completeTask(taskId: string, agentId: string, result: unknown, duration: number): Promise<void> {
    this.logger.info('Completing task via coordination manager', { 
      taskId, 
      agentId, 
      duration 
    });

    try {
      // Complete task in scheduler
      await this.scheduler.completeTask(taskId, result, duration);
      
      // Record task duration for work stealing
      this.workStealer.recordTaskDuration(agentId, duration);
      
      // Update workload
      this.workStealer.updateAgentWorkload(agentId, {
        agentId,
        taskCount: this.scheduler.getAgentTaskCount(agentId),
        avgTaskDuration: duration,
        cpuUsage: 0,
        memoryUsage: 0,
        priority: 1,
        capabilities: []
      });

    } catch (error) {
      this.logger.error('Failed to complete task', { taskId, error });
      throw error;
    }
  }

  async failTask(taskId: string, agentId: string, error: Error): Promise<void> {
    this.logger.info('Failing task via coordination manager', { 
      taskId, 
      agentId, 
      error: error.message 
    });

    try {
      // Fail task in scheduler
      await this.scheduler.failTask(taskId, error);
      
      // Update workload
      this.workStealer.updateAgentWorkload(agentId, {
        agentId,
        taskCount: this.scheduler.getAgentTaskCount(agentId),
        avgTaskDuration: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        priority: 1,
        capabilities: []
      });

    } catch (taskError) {
      this.logger.error('Failed to fail task', { taskId, error: taskError });
      throw taskError;
    }
  }

  async getHealthStatus(): Promise<{ 
    healthy: boolean; 
    error?: string; 
    metrics?: Record<string, number>;
  }> {
    try {
      const schedulerHealth = await this.scheduler.getHealthStatus();
      const workStealerStats = this.workStealer.getWorkloadStats();
      const circuitBreakerStats = this.circuitBreakers.getOverallStats();

      const healthy = schedulerHealth.healthy;
      const metrics = {
        ...schedulerHealth.metrics,
        totalAgents: Number(workStealerStats.totalAgents) || 0,
        activeAgents: Number(workStealerStats.activeAgents) || 0,
        stealOperations: Number(workStealerStats.stealOperations) || 0,
        successfulSteals: Number(workStealerStats.successfulSteals) || 0,
        failedSteals: Number(workStealerStats.failedSteals) || 0,
        circuitBreakers: circuitBreakerStats.totalBreakers,
        openCircuitBreakers: circuitBreakerStats.openBreakers,
        halfOpenCircuitBreakers: circuitBreakerStats.halfOpenBreakers,
      };

      return {
        healthy,
        metrics,
        error: schedulerHealth.error,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getCoordinationMetrics(): Promise<Record<string, unknown>> {
    try {
      const schedulerMetrics = await this.scheduler.getSchedulingMetrics();
      const workStealerStats = this.workStealer.getWorkloadStats();
      const circuitBreakerStats = this.circuitBreakers.getOverallStats();

      return {
        scheduler: schedulerMetrics,
        workStealing: workStealerStats,
        circuitBreakers: circuitBreakerStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get coordination metrics', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async performMaintenance(): Promise<void> {
    this.logger.info('Performing coordination manager maintenance');

    try {
      // Perform maintenance on all components
      await this.scheduler.performMaintenance();
      await this.workStealer.performMaintenance();
      await this.circuitBreakers.performMaintenance();

      this.logger.info('Coordination manager maintenance completed');
    } catch (error) {
      this.logger.error('Error during coordination manager maintenance', error);
      throw error;
    }
  }

  async getAgentTaskCount(agentId: string): Promise<number> {
    // Get task count for specific agent from scheduler
    return this.scheduler.getAgentTaskCount(agentId);
  }

  async getAgentTasks(agentId: string): Promise<Task[]> {
    // Get tasks assigned to specific agent from scheduler
    return await this.scheduler.getAgentTasks(agentId);
  }

  async cancelTask(taskId: string): Promise<void> {
    // Cancel a specific task through scheduler
    await this.scheduler.cancelTask(taskId, 'Cancelled by coordination manager');
  }

  setSchedulingStrategy(strategy: string): void {
    // Set the scheduling strategy for the scheduler
    this.scheduler.setDefaultStrategy(strategy);
  }

  getWorkStealingCoordinator(): WorkStealingCoordinator {
    // Return the work stealing coordinator
    return this.workStealer;
  }

  getCircuitBreakerManager(): CircuitBreakerManager {
    // Return the circuit breaker manager
    return this.circuitBreakers;
  }

  private setupEventHandlers(): void {
    // Handle task assignment events
    this.eventBus.on('task:assigned', (data: any) => {
      this.logger.debug('Task assigned event received', data);
    });

    // Handle task completion events
    this.eventBus.on('task:completed', (data: any) => {
      this.logger.debug('Task completed event received', data);
    });

    // Handle task failure events
    this.eventBus.on('task:failed', (data: any) => {
      this.logger.debug('Task failed event received', data);
    });

    // Handle work stealing events
    this.eventBus.on('work-stealing:steal-attempt', (data: any) => {
      this.logger.debug('Work stealing attempt', data);
    });

    // Handle circuit breaker events
    this.eventBus.on('circuit-breaker:state-change', (data: any) => {
      this.logger.debug('Circuit breaker state change', data);
    });
  }

  /**
   * Factory method to create a coordination manager with default configuration
   */
  static createDefault(eventBus: IEventBus, logger: ILogger): CoordinationManager {
    const defaultConfig: EnhancedCoordinationConfig = {
      coordination: {
        maxConcurrentTasks: 10,
        defaultTimeout: 30000,
        enableWorkStealing: true,
        enableCircuitBreaker: true,
        retryAttempts: 3,
        schedulingStrategy: 'capability',
        maxRetries: 3,
        retryDelay: 1000,
        resourceTimeout: 30000,
      },
      workStealing: {
        enabled: true,
        stealThreshold: 3,
        maxStealBatch: 2,
        stealInterval: 10000,
        minTasksToSteal: 1,
      },
      circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        halfOpenLimit: 2,
      },
      enableAdvancedFeatures: true,
    };

    return new CoordinationManager(defaultConfig, eventBus, logger);
  }
}