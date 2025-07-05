/**
 * Task Orchestrator
 * Orchestrates task assignment and execution across agents with multiple strategies
 */

import { EventEmitter } from 'node:events';
import { TaskScheduler } from './scheduler.ts';
import { WorkStealingCoordinator } from './work-stealing.ts';
import { DependencyGraph } from './dependency-graph.ts';
import { CircuitBreakerManager } from './circuit-breaker.ts';
import { Task, AgentProfile, CoordinationConfig } from '../utils/types.ts';
import { IEventBus } from '../core/event-bus.ts';
import { ILogger } from '../core/logger.ts';

export interface SchedulingStrategy {
  name: string;
  selectAgent(task: Task, agents: ExtendedAgentProfile[], context: SchedulingContext): string | null;
}

// Extended agent profile with runtime properties
export interface ExtendedAgentProfile extends AgentProfile {
  status?: 'idle' | 'available' | 'busy' | 'offline';
  currentLoad?: number;
}

// Extended task interface with orchestration properties
export interface ExtendedTask extends Task {
  requirements?: string[];
  assignedTo?: string;
  retryCount?: number;
  maxRetries?: number;
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

// Work stealing configuration
export interface WorkStealingConfig {
  enabled: boolean;
  stealThreshold: number;
  maxStealBatch: number;
  stealInterval: number;
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenLimit: number;
}

/**
 * Capability-based scheduling strategy
 * Selects agents based on their capabilities and specializations
 */
export class CapabilitySchedulingStrategy implements SchedulingStrategy {
  name = 'capability';

  selectAgent(task: Task, agents: ExtendedAgentProfile[], context: SchedulingContext): string | null {
    const availableAgents = agents.filter(agent => agent.status === 'idle' || agent.status === 'available');
    
    if (availableAgents.length === 0) return null;

    // Find agents with matching capabilities
    const extendedTask = task as ExtendedTask;
    const capableAgents = availableAgents.filter(agent => {
      const agentCaps = context.agentCapabilities.get(agent.id) || [];
      return extendedTask.requirements?.some((req: string) => agentCaps.includes(req));
    });

    if (capableAgents.length === 0) {
      // Fallback to any available agent
      return availableAgents[0].id;
    }

    // Select best match based on capability overlap and load
    let bestAgent = capableAgents[0];
    let bestScore = 0;

    for (const agent of capableAgents) {
      const agentCaps = context.agentCapabilities.get(agent.id) || [];
      const taskReqs = extendedTask.requirements || [];
      
      const capabilityMatch = taskReqs.filter((req: string) => agentCaps.includes(req)).length / taskReqs.length;
      const loadFactor = 1 - ((context.taskLoads.get(agent.id) || 0) / 10); // Normalize load
      const priorityFactor = (context.agentPriorities.get(agent.id) || 1) / 10;
      
      const score = capabilityMatch * 0.6 + loadFactor * 0.3 + priorityFactor * 0.1;
      
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent.id;
  }
}

/**
 * Round-robin scheduling strategy
 * Distributes tasks evenly across available agents
 */
export class RoundRobinSchedulingStrategy implements SchedulingStrategy {
  name = 'round-robin';
  private lastIndex = 0;

  selectAgent(task: Task, agents: ExtendedAgentProfile[], context: SchedulingContext): string | null {
    const availableAgents = agents.filter(agent => agent.status === 'idle' || agent.status === 'available');
    
    if (availableAgents.length === 0) return null;

    this.lastIndex = (this.lastIndex + 1) % availableAgents.length;
    return availableAgents[this.lastIndex].id;
  }
}

/**
 * Least-loaded scheduling strategy
 * Assigns tasks to agents with the lowest current load
 */
export class LeastLoadedSchedulingStrategy implements SchedulingStrategy {
  name = 'least-loaded';

  selectAgent(task: Task, agents: ExtendedAgentProfile[], context: SchedulingContext): string | null {
    const availableAgents = agents.filter(agent => agent.status === 'idle' || agent.status === 'available');
    
    if (availableAgents.length === 0) return null;

    // Find agent with minimum load
    let leastLoadedAgent = availableAgents[0];
    let minLoad = context.taskLoads.get(leastLoadedAgent.id) || 0;

    for (const agent of availableAgents) {
      const load = context.taskLoads.get(agent.id) || 0;
      if (load < minLoad) {
        minLoad = load;
        leastLoadedAgent = agent;
      }
    }

    return leastLoadedAgent.id;
  }
}

/**
 * Affinity-based scheduling strategy
 * Prefers agents that have successfully executed similar tasks
 */
export class AffinitySchedulingStrategy implements SchedulingStrategy {
  name = 'affinity';

  selectAgent(task: Task, agents: ExtendedAgentProfile[], context: SchedulingContext): string | null {
    const availableAgents = agents.filter(agent => agent.status === 'idle' || agent.status === 'available');
    
    if (availableAgents.length === 0) return null;

    // Check task history for affinity
    const taskStats = context.taskHistory.get(task.type);
    if (taskStats?.lastAgent) {
      const lastAgent = availableAgents.find(agent => agent.id === taskStats.lastAgent);
      if (lastAgent && taskStats.successRate > 0.8) {
        return lastAgent.id;
      }
    }

    // Fallback to capability-based selection
    const capabilityStrategy = new CapabilitySchedulingStrategy();
    return capabilityStrategy.selectAgent(task, agents, context);
  }
}

/**
 * Task orchestrator that manages task assignment and execution
 * Uses multiple scheduling strategies and coordination patterns
 */
export class TaskOrchestrator extends TaskScheduler {
  private strategies = new Map<string, SchedulingStrategy>();
  private activeAgents = new Map<string, ExtendedAgentProfile>();
  private taskStats = new Map<string, TaskStats>();
  private workStealing: WorkStealingCoordinator;
  private dependencyGraph: DependencyGraph;
  private circuitBreakers: CircuitBreakerManager;
  private defaultStrategy = 'capability';

  constructor(
    config: CoordinationConfig,
    eventBus: IEventBus,
    logger: ILogger,
  ) {
    super(config, eventBus, logger);

    // Create work stealing config
    const workStealingConfig: WorkStealingConfig = {
      enabled: true,
      stealThreshold: 2,
      maxStealBatch: 3,
      stealInterval: 30000
    };

    // Create circuit breaker config
    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      halfOpenLimit: 2
    };

    // Initialize coordination components
    this.workStealing = new WorkStealingCoordinator(workStealingConfig, eventBus, logger);
    this.dependencyGraph = new DependencyGraph(logger);
    this.circuitBreakers = new CircuitBreakerManager(circuitBreakerConfig, logger, eventBus);

    // Register default strategies
    this.registerStrategy(new CapabilitySchedulingStrategy());
    this.registerStrategy(new RoundRobinSchedulingStrategy());
    this.registerStrategy(new LeastLoadedSchedulingStrategy());
    this.registerStrategy(new AffinitySchedulingStrategy());

    this.setupOrchestrationEventHandlers();
  }

  override async initialize(): Promise<void> {
    await super.initialize();
    await this.workStealing.initialize();
    // DependencyGraph and CircuitBreakerManager don't have initialize methods
  }

  override async shutdown(): Promise<void> {
    await this.workStealing.shutdown();
    // DependencyGraph and CircuitBreakerManager don't have shutdown methods
    await super.shutdown();
  }

  /**
   * Register a new scheduling strategy
   */
  registerStrategy(strategy: SchedulingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.info('Scheduling strategy registered', { 
      strategy: strategy.name,
      totalStrategies: this.strategies.size 
    });
  }

  /**
   * Set the default scheduling strategy
   */
  setDefaultStrategy(name: string): void {
    if (!this.strategies.has(name)) {
      throw new Error(`Strategy '${name}' not found`);
    }
    this.defaultStrategy = name;
    this.logger.info('Default strategy updated', { strategy: name });
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(profile: AgentProfile): void {
    const extendedProfile: ExtendedAgentProfile = {
      ...profile,
      status: 'available',
      currentLoad: 0
    };
    
    this.activeAgents.set(profile.id, extendedProfile);
    
    // Initialize agent metrics
    if (!this.taskStats.has(profile.type)) {
      this.taskStats.set(profile.type, {
        totalExecutions: 0,
        avgDuration: 0,
        successRate: 1.0
      });
    }

    this.logger.info('Agent registered with orchestrator', { 
      agentId: profile.id, 
      type: profile.type,
      capabilities: profile.capabilities 
    });
  }

  /**
   * Unregister an agent from the orchestrator
   */
  unregisterAgent(agentId: string): void {
    this.activeAgents.delete(agentId);
    this.logger.info('Agent unregistered from orchestrator', { agentId });
  }

  override async assignTask(task: Task, agentId?: string): Promise<void> {
    // Check circuit breaker (simplified check)
    const circuitBreaker = this.circuitBreakers.getBreaker(task.type);
    if (circuitBreaker.getState() === 'open') {
      throw new Error(`Circuit breaker open for task type: ${task.type}`);
    }

    // Add to dependency graph
    const extendedTask = task as ExtendedTask;
    this.dependencyGraph.addTask({
      ...task,
      dependencies: task.dependencies || []
    });

    // Select agent using orchestration logic
    const selectedAgentId = agentId || await this.selectAgentForTask(task);
    if (!selectedAgentId) {
      throw new Error('No available agent for task assignment');
    }

    // Assign task using parent implementation
    await super.assignTask(task, selectedAgentId);

    // Update agent load tracking
    this.updateAgentLoad(selectedAgentId, 1);

    this.logger.info('Task assigned by orchestrator', {
      taskId: task.id,
      agentId: selectedAgentId,
      strategy: this.defaultStrategy,
      taskType: task.type
    });
  }

  /**
   * Select the best agent for a task using the current strategy
   */
  private async selectAgentForTask(task: Task): Promise<string | null> {
    const strategy = this.strategies.get(this.defaultStrategy);
    if (!strategy) {
      throw new Error(`Strategy '${this.defaultStrategy}' not found`);
    }

    const agents = Array.from(this.activeAgents.values());
    const context: SchedulingContext = {
      taskLoads: this.getAgentLoads(),
      agentCapabilities: this.getAgentCapabilities(),
      agentPriorities: this.getAgentPriorities(),
      taskHistory: this.taskStats,
      currentTime: new Date()
    };

    const selectedAgentId = strategy.selectAgent(task, agents, context);

    // If primary strategy fails, try work stealing (simplified)
    if (!selectedAgentId) {
      // Simple fallback - return first available agent
      const availableAgent = agents.find(agent => agent.status === 'available');
      return availableAgent?.id || null;
    }

    return selectedAgentId;
  }

  override async completeTask(taskId: string, result: unknown): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const startTime = task.metadata?.startTime as number | undefined;
    const duration = startTime ? Date.now() - startTime : 0;

    // Update task statistics
    this.updateTaskStats(task.type, true, duration);

    // Update dependency graph
    this.dependencyGraph.markCompleted(taskId);

    // Update circuit breaker (record success through execution)
    const circuitBreaker = this.circuitBreakers.getBreaker(task.type);
    await circuitBreaker.execute(async () => Promise.resolve());

    // Update agent load
    const extendedTask = task as ExtendedTask;
    const agentId = extendedTask.assignedTo;
    if (agentId) {
      this.updateAgentLoad(agentId, -1);
    }

    // Complete task using parent implementation
    await super.completeTask(taskId, result);

    this.logger.info('Task completed by orchestrator', {
      taskId,
      duration,
      agentId,
      taskType: task.type
    });
  }

  override async failTask(taskId: string, error: Error): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const startTime = task.metadata?.startTime as number | undefined;
    const duration = startTime ? Date.now() - startTime : 0;

    // Update task statistics
    this.updateTaskStats(task.type, false, duration);

    // Update circuit breaker (record failure through execution)
    const circuitBreaker = this.circuitBreakers.getBreaker(task.type);
    try {
      await circuitBreaker.execute(async () => Promise.reject(error));
    } catch {
      // Expected to fail
    }

    // Update dependency graph
    this.dependencyGraph.markFailed(taskId);

    // Update agent load
    const extendedTask = task as ExtendedTask;
    const agentId = extendedTask.assignedTo;
    if (agentId) {
      this.updateAgentLoad(agentId, -1);
    }

    // Check if we should try work stealing for retry
    const retryCount = extendedTask.retryCount || 0;
    const maxRetries = extendedTask.maxRetries || 3;
    
    if (retryCount < maxRetries) {
      // Simple retry logic - try to reassign to another agent
      const alternativeAgentId = await this.selectAgentForTask(task);
      if (alternativeAgentId) {
        await this.reassignTask(taskId, alternativeAgentId);
        return;
      }
    }

    // Fail task using parent implementation
    await super.failTask(taskId, error);

    this.logger.error('Task failed in orchestrator', {
      taskId,
      error: error.message,
      duration,
      agentId,
      taskType: task.type
    });
  }

  // === PRIVATE HELPER METHODS ===

  private async getTask(taskId: string): Promise<ExtendedTask | null> {
    // This would typically query the task storage
    // For now, return a placeholder
    return null;
  }

  private updateTaskStats(taskType: string, success: boolean, duration: number): void {
    let stats = this.taskStats.get(taskType);
    if (!stats) {
      stats = {
        totalExecutions: 0,
        avgDuration: 0,
        successRate: 1.0
      };
      this.taskStats.set(taskType, stats);
    }

    stats.totalExecutions++;
    stats.avgDuration = (stats.avgDuration * (stats.totalExecutions - 1) + duration) / stats.totalExecutions;
    
    const successCount = Math.floor(stats.successRate * (stats.totalExecutions - 1)) + (success ? 1 : 0);
    stats.successRate = successCount / stats.totalExecutions;
  }

  private setupOrchestrationEventHandlers(): void {
    // Handle work stealing events (simplified since WorkStealingCoordinator doesn't extend EventEmitter)
    this.eventBus.on('work-stolen', (data: any) => {
      this.logger.info('Work stealing occurred', {
        taskId: data.taskId,
        fromAgent: data.fromAgent,
        toAgent: data.toAgent
      });
    });

    // Handle circuit breaker events (simplified)
    this.eventBus.on('circuit-opened', (data: any) => {
      this.logger.warn('Circuit breaker opened', {
        taskType: data.taskType,
        failureRate: data.failureRate
      });
    });

    this.eventBus.on('circuit-closed', (data: any) => {
      this.logger.info('Circuit breaker closed', {
        taskType: data.taskType
      });
    });

    // Handle dependency graph events (simplified)
    this.eventBus.on('dependency-resolved', (data: any) => {
      this.logger.debug('Task dependency resolved', {
        taskId: data.taskId,
        dependencyId: data.dependencyId
      });
    });
  }

  private async reassignTask(taskId: string, newAgentId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) return;

    // Update task assignment
    task.assignedTo = newAgentId;
    task.retryCount = (task.retryCount || 0) + 1;

    // Assign to new agent
    await this.assignTask(task, newAgentId);

    this.logger.info('Task reassigned', {
      taskId,
      newAgentId,
      retryCount: task.retryCount
    });
  }

  /**
   * Get orchestration metrics and statistics
   */
  async getOrchestrationMetrics(): Promise<Record<string, unknown>> {
    return {
      strategies: Array.from(this.strategies.keys()),
      defaultStrategy: this.defaultStrategy,
      activeAgents: this.activeAgents.size,
      taskStats: Object.fromEntries(this.taskStats),
      workStealingMetrics: {},
      circuitBreakerMetrics: this.circuitBreakers.getAllMetrics(),
      dependencyGraphMetrics: this.dependencyGraph.getStats()
    };
  }

  // === AGENT MANAGEMENT HELPERS ===

  private getAgentLoads(): Map<string, number> {
    const loads = new Map<string, number>();
    for (const [agentId, agent] of this.activeAgents) {
      loads.set(agentId, agent.currentLoad || 0);
    }
    return loads;
  }

  private getAgentCapabilities(): Map<string, string[]> {
    const capabilities = new Map<string, string[]>();
    for (const [agentId, agent] of this.activeAgents) {
      capabilities.set(agentId, agent.capabilities || []);
    }
    return capabilities;
  }

  private getAgentPriorities(): Map<string, number> {
    const priorities = new Map<string, number>();
    for (const [agentId, agent] of this.activeAgents) {
      priorities.set(agentId, agent.priority || 1);
    }
    return priorities;
  }

  private updateAgentLoad(agentId: string, delta: number): void {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.currentLoad = (agent.currentLoad || 0) + delta;
      agent.currentLoad = Math.max(0, agent.currentLoad); // Ensure non-negative
    }
  }
}

export default TaskOrchestrator;
