import { EventEmitter } from 'events';
import type { IEventBus } from '../core/event-bus.js';
import type { ILogger } from '../core/logger.js';
import type { Task, TaskStatus, AgentProfile } from '../core/types.js';
import { TaskError, TaskTimeoutError, TaskDependencyError } from '../utils/errors.js';
import { SystemEvents } from '../utils/types.js';

export interface SchedulingStrategy {
  name: string;
  selectAgent(task: Task, agents: AgentProfile[], context: SchedulingContext): string | null;
}

export interface SchedulingContext {
  taskLoads: Map<string, number>;
  agentCapabilities: Map<string, string[]>;
  agentPriorities: Map<string, number>;
  taskHistory: Map<string, TaskStats>;
  currentTime: Date;
}

export interface TaskStats {
  totalExecutions: number;
  avgDuration: number;
  successRate: number;
  lastAgent?: string;
}

export interface CoordinationConfig {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  enableWorkStealing: boolean;
  enableCircuitBreaker: boolean;
  retryAttempts: number;
  schedulingStrategy: string;
  maxRetries: number;
  retryDelay: number;
  resourceTimeout: number;
}

interface ScheduledTask {
  task: Task;
  agentId: string;
  attempts: number;
  lastAttempt?: Date;
  timeout?: NodeJS.Timeout;
}

/**
 * Capability-based scheduling strategy
 */
export class CapabilitySchedulingStrategy implements SchedulingStrategy {
  name = 'capability';

  selectAgent(task: Task, agents: AgentProfile[], context: SchedulingContext): string | null {
    // Filter agents by capability match
    const capableAgents = agents.filter(agent => {
      const capabilities = context.agentCapabilities.get(agent.id) || agent.capabilities || [];
      return task.type === 'any' || 
             capabilities.includes(task.type) ||
             capabilities.includes('*') ||
             capabilities.some((cap: string) => task.requiredCapabilities?.includes(cap));
    });

    if (capableAgents.length === 0) {
      return null;
    }

    // Score agents by capability match and current load
    const scoredAgents = capableAgents.map(agent => {
      const capabilities = context.agentCapabilities.get(agent.id) || agent.capabilities || [];
      const load = context.taskLoads.get(agent.id) || 0;
      const priority = context.agentPriorities.get(agent.id) || 1;
      
      // Calculate capability score
      let capabilityScore = 0;
      if (task.requiredCapabilities) {
        const matchCount = task.requiredCapabilities.filter((req: string) => capabilities.includes(req)).length;
        capabilityScore = matchCount / task.requiredCapabilities.length;
      } else {
        capabilityScore = capabilities.includes(task.type) ? 1 : 0.5;
      }
      
      // Combined score: capability match, low load, high priority
      const score = (capabilityScore * 0.5) + ((1 - load / 10) * 0.3) + (priority * 0.2);
      
      return { agent, score };
    });

    // Select agent with highest score
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agent.id;
  }
}

/**
 * Round-robin scheduling strategy
 */
export class RoundRobinSchedulingStrategy implements SchedulingStrategy {
  name = 'round-robin';
  private lastIndex = 0;

  selectAgent(task: Task, agents: AgentProfile[], context: SchedulingContext): string | null {
    if (agents.length === 0) return null;
    
    this.lastIndex = (this.lastIndex + 1) % agents.length;
    return agents[this.lastIndex].id;
  }
}

/**
 * Least-loaded scheduling strategy
 */
export class LeastLoadedSchedulingStrategy implements SchedulingStrategy {
  name = 'least-loaded';

  selectAgent(task: Task, agents: AgentProfile[], context: SchedulingContext): string | null {
    if (agents.length === 0) return null;

    // Find agent with lowest current load
    let selectedAgent = agents[0];
    let lowestLoad = context.taskLoads.get(selectedAgent.id) || 0;

    for (const agent of agents.slice(1)) {
      const load = context.taskLoads.get(agent.id) || 0;
      if (load < lowestLoad) {
        lowestLoad = load;
        selectedAgent = agent;
      }
    }

    return selectedAgent.id;
  }
}

/**
 * Affinity-based scheduling strategy (prefers agents with task history)
 */
export class AffinitySchedulingStrategy implements SchedulingStrategy {
  name = 'affinity';

  selectAgent(task: Task, agents: AgentProfile[], context: SchedulingContext): string | null {
    if (agents.length === 0) return null;

    const taskStats = context.taskHistory.get(task.type);
    if (taskStats?.lastAgent) {
      const lastAgent = agents.find(a => a.id === taskStats.lastAgent);
      if (lastAgent) {
        const load = context.taskLoads.get(lastAgent.id) || 0;
        // Use affinity if agent isn't overloaded
        if (load < 8) {
          return lastAgent.id;
        }
      }
    }

    // Fallback to capability-based selection
    const capabilityStrategy = new CapabilitySchedulingStrategy();
    return capabilityStrategy.selectAgent(task, agents, context);
  }
}

/**
 * Task Coordinator - Comprehensive task coordination with intelligent scheduling, 
 * dependency management, and error handling
 */
export class TaskCoordinator extends EventEmitter {
  private strategies = new Map<string, SchedulingStrategy>();
  private activeAgents = new Map<string, AgentProfile>();
  private tasks = new Map<string, ScheduledTask>();
  private agentTasks = new Map<string, Set<string>>();
  private taskDependencies = new Map<string, Set<string>>();
  private completedTasks = new Set<string>();
  private taskStats = new Map<string, TaskStats>();
  private taskLoads = new Map<string, number>();
  private agentCapabilities = new Map<string, string[]>();
  private agentPriorities = new Map<string, number>();
  private defaultStrategy = 'capability';
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private config: CoordinationConfig,
    private eventBus: IEventBus,
    private logger: ILogger,
  ) {
    super();
    this.initializeStrategies();
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    this.logger.info('Task Scheduler initialized', {
      strategies: Array.from(this.strategies.keys()),
      defaultStrategy: this.defaultStrategy
    });

    // Start cleanup interval (only in production)
    if (process.env.NODE_ENV !== 'test') {
      this.cleanupInterval = setInterval(() => {
        this.cleanupCompletedTasks();
      }, 60000); // Every minute
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down task scheduler');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    // Cancel all active tasks
    const taskIds = Array.from(this.tasks.keys());
    await Promise.all(taskIds.map(id => this.cancelTask(id, 'Scheduler shutdown')));
    
    this.removeAllListeners();
    this.activeAgents.clear();
    this.tasks.clear();
    this.agentTasks.clear();
    this.taskDependencies.clear();
    this.completedTasks.clear();
    this.taskStats.clear();
    this.taskLoads.clear();
    this.agentCapabilities.clear();
    this.agentPriorities.clear();
  }

  registerStrategy(strategy: SchedulingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.info('Registered scheduling strategy', { strategy: strategy.name });
  }

  setDefaultStrategy(name: string): void {
    if (!this.strategies.has(name)) {
      throw new Error(`Unknown scheduling strategy: ${name}`);
    }
    this.defaultStrategy = name;
    this.logger.info('Set default scheduling strategy', { strategy: name });
  }

  registerAgent(profile: AgentProfile): void {
    this.activeAgents.set(profile.id, profile);
    this.agentCapabilities.set(profile.id, profile.capabilities || []);
    this.agentPriorities.set(profile.id, profile.priority || 1);
    this.taskLoads.set(profile.id, 0);
    
    if (!this.agentTasks.has(profile.id)) {
      this.agentTasks.set(profile.id, new Set());
    }
    
    this.logger.info('Registered agent with scheduler', {
      agentId: profile.id,
      capabilities: profile.capabilities,
      priority: profile.priority
    });
  }

  unregisterAgent(agentId: string): void {
    this.activeAgents.delete(agentId);
    this.agentCapabilities.delete(agentId);
    this.agentPriorities.delete(agentId);
    this.taskLoads.delete(agentId);
    this.agentTasks.delete(agentId);
    
    this.logger.info('Unregistered agent from scheduler', { agentId });
  }

  async assignTask(task: Task, agentId?: string, strategyName?: string): Promise<string> {
    this.logger.info('Assigning task', { taskId: task.id, agentId, strategy: strategyName });

    // Check dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const unmetDependencies = task.dependencies.filter(
        depId => !this.completedTasks.has(depId),
      );
      
      if (unmetDependencies.length > 0) {
        throw new TaskDependencyError(task.id, unmetDependencies);
      }
    }

    let selectedAgentId = agentId;
    
    if (!selectedAgentId) {
      const strategy = this.strategies.get(strategyName || this.defaultStrategy);
      if (!strategy) {
        throw new Error(`Unknown scheduling strategy: ${strategyName || this.defaultStrategy}`);
      }

      const context: SchedulingContext = {
        taskLoads: this.taskLoads,
        agentCapabilities: this.agentCapabilities,
        agentPriorities: this.agentPriorities,
        taskHistory: this.taskStats,
        currentTime: new Date()
      };

      const availableAgents = Array.from(this.activeAgents.values())
        .filter(agent => agent.status === 'idle' || agent.status === 'active');

      const selectedAgent = strategy.selectAgent(task, availableAgents, context);
      selectedAgentId = selectedAgent || undefined; // Convert null to undefined
    }

    if (!selectedAgentId) {
      throw new Error('No suitable agent available for task assignment');
    }

    // Create scheduled task
    const scheduledTask: ScheduledTask = {
      task: { ...task, status: 'assigned', assignedAgent: selectedAgentId },
      agentId: selectedAgentId,
      attempts: 0,
    };

    // Store task
    this.tasks.set(task.id, scheduledTask);

    // Update agent tasks
    if (!this.agentTasks.has(selectedAgentId)) {
      this.agentTasks.set(selectedAgentId, new Set());
    }
    this.agentTasks.get(selectedAgentId)!.add(task.id);

    // Update dependencies
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        if (!this.taskDependencies.has(depId)) {
          this.taskDependencies.set(depId, new Set());
        }
        this.taskDependencies.get(depId)!.add(task.id);
      }
    }

    // Update task load
    const currentLoad = this.taskLoads.get(selectedAgentId) || 0;
    this.taskLoads.set(selectedAgentId, currentLoad + 1);

    // Start task execution
    this.startTask(task.id);

    // Emit task assignment event
    this.eventBus.emit(SystemEvents.TASK_ASSIGNED || 'task:assigned', {
      taskId: task.id,
      agentId: selectedAgentId,
      strategy: strategyName || this.defaultStrategy,
      timestamp: new Date()
    });

    this.logger.info('Task assigned using scheduler', {
      taskId: task.id,
      agentId: selectedAgentId,
      strategy: strategyName || this.defaultStrategy,
      taskType: task.type
    });

    return selectedAgentId;
  }

  async completeTask(taskId: string, result: unknown, duration?: number): Promise<void> {
    const scheduled = this.tasks.get(taskId);
    if (!scheduled) {
      throw new TaskError(`Task not found: ${taskId}`);
    }

    this.logger.info('Task completed', { taskId, agentId: scheduled.agentId, duration });

    // Update task status
    scheduled.task.status = 'completed';
    scheduled.task.output = result as Record<string, unknown>;
    scheduled.task.completedAt = new Date();

    // Clear timeout
    if (scheduled.timeout) {
      clearTimeout(scheduled.timeout);
    }

    // Update task load
    const currentLoad = this.taskLoads.get(scheduled.agentId) || 0;
    this.taskLoads.set(scheduled.agentId, Math.max(0, currentLoad - 1));

    // Update task statistics
    if (duration !== undefined) {
      this.updateTaskStats(scheduled.task.type, true, duration);
    }

    // Remove from active tasks
    this.tasks.delete(taskId);
    this.agentTasks.get(scheduled.agentId)?.delete(taskId);
    
    // Add to completed tasks
    this.completedTasks.add(taskId);

    // Check and start dependent tasks
    const dependents = this.taskDependencies.get(taskId);
    if (dependents) {
      for (const dependentId of dependents) {
        const dependent = this.tasks.get(dependentId);
        if (dependent && this.canStartTask(dependent.task)) {
          this.startTask(dependentId);
        }
      }
    }

    // Emit completion event
    this.eventBus.emit(SystemEvents.TASK_COMPLETED || 'task:completed', {
      taskId,
      agentId: scheduled.agentId,
      duration,
      timestamp: new Date()
    });
  }

  async failTask(taskId: string, error: Error): Promise<void> {
    const scheduled = this.tasks.get(taskId);
    if (!scheduled) {
      throw new TaskError(`Task not found: ${taskId}`);
    }

    this.logger.error('Task failed', { 
      taskId, 
      agentId: scheduled.agentId,
      attempt: scheduled.attempts,
      error: error.message,
    });

    // Clear timeout
    if (scheduled.timeout) {
      clearTimeout(scheduled.timeout);
    }

    scheduled.attempts++;
    scheduled.lastAttempt = new Date();

    // Check if we should retry
    if (scheduled.attempts < this.config.maxRetries) {
      this.logger.info('Retrying task', { 
        taskId,
        attempt: scheduled.attempts,
        maxRetries: this.config.maxRetries,
      });

      // Schedule retry with exponential backoff
      const retryDelay = this.config.retryDelay * Math.pow(2, scheduled.attempts - 1);
      
      setTimeout(() => {
        this.startTask(taskId);
      }, retryDelay);
    } else {
      // Max retries exceeded, mark as failed
      scheduled.task.status = 'failed';
      scheduled.task.error = error;
      scheduled.task.completedAt = new Date();

      // Update task load
      const currentLoad = this.taskLoads.get(scheduled.agentId) || 0;
      this.taskLoads.set(scheduled.agentId, Math.max(0, currentLoad - 1));

      // Update task statistics
      this.updateTaskStats(scheduled.task.type, false, 0);

      // Remove from active tasks
      this.tasks.delete(taskId);
      this.agentTasks.get(scheduled.agentId)?.delete(taskId);

      // Cancel dependent tasks
      await this.cancelDependentTasks(taskId, 'Parent task failed');

      // Emit failure event
      this.eventBus.emit(SystemEvents.TASK_FAILED || 'task:failed', {
        taskId,
        agentId: scheduled.agentId,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async cancelTask(taskId: string, reason: string): Promise<void> {
    const scheduled = this.tasks.get(taskId);
    if (!scheduled) {
      return; // Already cancelled or completed
    }

    this.logger.info('Cancelling task', { taskId, reason });

    // Clear timeout
    if (scheduled.timeout) {
      clearTimeout(scheduled.timeout);
    }

    // Update task status
    scheduled.task.status = 'cancelled';
    scheduled.task.completedAt = new Date();

    // Update task load
    const currentLoad = this.taskLoads.get(scheduled.agentId) || 0;
    this.taskLoads.set(scheduled.agentId, Math.max(0, currentLoad - 1));

    // Remove from active tasks
    this.tasks.delete(taskId);
    this.agentTasks.get(scheduled.agentId)?.delete(taskId);

    // Emit cancellation event
    this.eventBus.emit(SystemEvents.TASK_CANCELLED || 'task:cancelled', { taskId, reason });

    // Cancel dependent tasks
    await this.cancelDependentTasks(taskId, 'Parent task cancelled');
  }

  async cancelAgentTasks(agentId: string): Promise<void> {
    const taskIds = this.agentTasks.get(agentId);
    if (!taskIds) {
      return;
    }

    this.logger.info('Cancelling all tasks for agent', { 
      agentId,
      taskCount: taskIds.size,
    });

    const promises = Array.from(taskIds).map(
      taskId => this.cancelTask(taskId, 'Agent cancelled')
    );

    await Promise.all(promises);
    this.agentTasks.delete(agentId);
  }

  async rescheduleAgentTasks(agentId: string): Promise<void> {
    const taskIds = this.agentTasks.get(agentId);
    if (!taskIds || taskIds.size === 0) {
      return;
    }

    this.logger.info('Rescheduling tasks for agent', { 
      agentId,
      taskCount: taskIds.size,
    });

    for (const taskId of taskIds) {
      const scheduled = this.tasks.get(taskId);
      if (scheduled && scheduled.task.status === 'running') {
        // Reset task status
        scheduled.task.status = 'queued';
        scheduled.attempts = 0;
        
        // Re-emit task created event for reassignment
        this.eventBus.emit(SystemEvents.TASK_CREATED || 'task:created', {
          task: scheduled.task,
          timestamp: new Date()
        });
      }
    }
  }

  getAgentTaskCount(agentId: string): number {
    const taskIds = this.agentTasks.get(agentId);
    if (!taskIds) {
      return 0;
    }

    // Count only non-cancelled tasks
    let count = 0;
    for (const taskId of taskIds) {
      const scheduled = this.tasks.get(taskId);
      if (scheduled && scheduled.task.status !== 'cancelled') {
        count++;
      }
    }
    return count;
  }

  async getAgentTasks(agentId: string): Promise<Task[]> {
    const taskIds = this.agentTasks.get(agentId);
    if (!taskIds) {
      return [];
    }

    const tasks: Task[] = [];
    for (const taskId of taskIds) {
      const scheduled = this.tasks.get(taskId);
      if (scheduled) {
        tasks.push(scheduled.task);
      }
    }

    return tasks;
  }

  async getHealthStatus(): Promise<{ 
    healthy: boolean; 
    error?: string; 
    metrics?: Record<string, number>;
  }> {
    const activeTasks = this.tasks.size;
    const completedTasks = this.completedTasks.size;
    const agentsWithTasks = this.agentTasks.size;
    
    const tasksByStatus: Record<TaskStatus, number> = {
      pending: 0,
      queued: 0,
      assigned: 0,
      running: 0,
      completed: completedTasks,
      failed: 0,
      cancelled: 0,
    };

    for (const scheduled of this.tasks.values()) {
      tasksByStatus[scheduled.task.status]++;
    }

    return {
      healthy: true,
      metrics: {
        activeTasks,
        completedTasks,
        agentsWithTasks,
        ...tasksByStatus,
      },
    };
  }

  async performMaintenance(): Promise<void> {
    this.logger.debug('Performing task scheduler maintenance');
    
    // Cleanup old completed tasks
    this.cleanup();
    
    // Check for stuck tasks
    const now = new Date();
    for (const [taskId, scheduled] of this.tasks) {
      if (scheduled.task.status === 'running' && scheduled.task.startedAt) {
        const runtime = now.getTime() - scheduled.task.startedAt.getTime();
        if (runtime > this.config.resourceTimeout * 2) {
          this.logger.warn('Found stuck task', { 
            taskId,
            runtime,
            agentId: scheduled.agentId,
          });
          
          // Force fail the task
          await this.failTask(taskId, new TaskTimeoutError(taskId, runtime));
        }
      }
    }
  }

  async getSchedulingMetrics(): Promise<Record<string, unknown>> {
    return {
      activeAgents: this.activeAgents.size,
      activeTasks: this.tasks.size,
      completedTasks: this.completedTasks.size,
      taskLoads: Object.fromEntries(this.taskLoads),
      taskStats: Object.fromEntries(this.taskStats),
      strategies: Array.from(this.strategies.keys()),
      defaultStrategy: this.defaultStrategy
    };
  }

  private startTask(taskId: string): void {
    const scheduled = this.tasks.get(taskId);
    if (!scheduled) {
      return;
    }

    // Update status
    scheduled.task.status = 'running';
    scheduled.task.startedAt = new Date();

    // Emit task started event
    this.eventBus.emit(SystemEvents.TASK_STARTED || 'task:started', { 
      taskId,
      agentId: scheduled.agentId,
    });

    // Set timeout for task execution
    const timeoutMs = this.config.resourceTimeout;
    scheduled.timeout = setTimeout(() => {
      this.failTask(taskId, new TaskTimeoutError(taskId, timeoutMs));
    }, timeoutMs);
  }

  private canStartTask(task: Task): boolean {
    // Check if all dependencies are completed
    return !task.dependencies || task.dependencies.every(depId => this.completedTasks.has(depId));
  }

  private async cancelDependentTasks(taskId: string, reason: string): Promise<void> {
    const dependents = this.taskDependencies.get(taskId);
    if (!dependents) {
      return;
    }

    for (const dependentId of dependents) {
      await this.cancelTask(dependentId, reason);
    }
  }

  private updateTaskStats(taskType: string, success: boolean, duration: number): void {
    const stats = this.taskStats.get(taskType) || {
      totalExecutions: 0,
      avgDuration: 0,
      successRate: 0
    };

    stats.totalExecutions++;
    
    if (success) {
      const totalDuration = (stats.avgDuration * (stats.totalExecutions - 1)) + duration;
      stats.avgDuration = totalDuration / stats.totalExecutions;
    }

    const successCount = Math.floor(stats.successRate * (stats.totalExecutions - 1)) + (success ? 1 : 0);
    stats.successRate = successCount / stats.totalExecutions;

    this.taskStats.set(taskType, stats);
  }

  private setupEventHandlers(): void {
    this.eventBus.on('agent:status_changed', (data: any) => {
      const agent = this.activeAgents.get(data.agentId);
      if (agent) {
        agent.status = data.status;
        this.logger.debug('Agent status updated in scheduler', data);
      }
    });

    this.eventBus.on('agent:capability_updated', (data: any) => {
      this.agentCapabilities.set(data.agentId, data.capabilities);
      this.logger.debug('Agent capabilities updated in scheduler', data);
    });
  }

  private initializeStrategies(): void {
    this.registerStrategy(new CapabilitySchedulingStrategy());
    this.registerStrategy(new RoundRobinSchedulingStrategy());
    this.registerStrategy(new LeastLoadedSchedulingStrategy());
    this.registerStrategy(new AffinitySchedulingStrategy());
  }

  private cleanup(): void {
    // Clean up old completed tasks (keep last 1000)
    if (this.completedTasks.size > 1000) {
      const toRemove = this.completedTasks.size - 1000;
      const iterator = this.completedTasks.values();
      
      for (let i = 0; i < toRemove; i++) {
        const result = iterator.next();
        if (!result.done && result.value) {
          this.completedTasks.delete(result.value);
          this.taskDependencies.delete(result.value);
        }
      }
    }
  }

  private cleanupCompletedTasks(): void {
    // Clean up completed tasks older than a certain threshold
    const maxCompletedTasks = 1000;
    
    if (this.completedTasks.size > maxCompletedTasks) {
      const tasksToRemove = this.completedTasks.size - maxCompletedTasks;
      const taskIds = Array.from(this.completedTasks);
      
      // Remove oldest tasks (first in the array)
      for (let i = 0; i < tasksToRemove; i++) {
        this.completedTasks.delete(taskIds[i]);
      }
      
      if (tasksToRemove > 0) {
        this.logger.debug(`Cleaned up ${tasksToRemove} completed tasks`);
      }
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    const scheduled = this.tasks.get(taskId);
    return scheduled ? scheduled.task : null;
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).map(scheduled => scheduled.task);
  }

  async getTaskStatistics(): Promise<Record<string, unknown>> {
    const allStats = Array.from(this.taskStats.entries()).map(([type, stats]) => ({
      type,
      ...stats
    }));

    return {
      totalTaskTypes: this.taskStats.size,
      statistics: allStats,
      totalActiveTasks: this.tasks.size,
      totalCompletedTasks: this.completedTasks.size,
      agentLoads: Object.fromEntries(this.taskLoads.entries())
    };
  }

  async reassignTask(taskId: string, newAgentId: string): Promise<void> {
    const scheduled = this.tasks.get(taskId);
    if (!scheduled) {
      throw new Error(`Task ${taskId} not found`);
    }

    const oldAgentId = scheduled.agentId;
    
    // Remove from old agent
    this.agentTasks.get(oldAgentId)?.delete(taskId);
    const oldLoad = this.taskLoads.get(oldAgentId) || 0;
    this.taskLoads.set(oldAgentId, Math.max(0, oldLoad - 1));

    // Add to new agent
    if (!this.agentTasks.has(newAgentId)) {
      this.agentTasks.set(newAgentId, new Set());
    }
    this.agentTasks.get(newAgentId)!.add(taskId);
    const newLoad = this.taskLoads.get(newAgentId) || 0;
    this.taskLoads.set(newAgentId, newLoad + 1);

    // Update task
    scheduled.agentId = newAgentId;
    scheduled.task.assignedAgent = newAgentId;

    this.logger.info('Task reassigned', {
      taskId,
      oldAgentId,
      newAgentId
    });

    // Emit reassignment event
    this.eventBus.emit('task:reassigned', {
      taskId,
      oldAgentId,
      newAgentId,
      timestamp: new Date()
    });
  }
}