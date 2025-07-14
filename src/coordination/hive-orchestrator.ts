/**
 * Hive orchestrator for task decomposition with consensus-based decision making
 * Handles complex task breakdown, agent coordination, and topology-aware scheduling
 */

import { EventEmitter } from 'node:events';
import { TaskDefinition, TaskResult, TaskStatus, AgentState, TaskError, TaskId, AgentId } from "../swarm/types.ts";
import { ILogger } from "../core/logger.ts";
import { IEventBus } from "../core/event-bus.ts";
import { BackgroundExecutor, BackgroundTaskDefinition } from "./background-executor.ts";
import { generateId } from "../utils/helpers.ts";

export interface HiveOrchestratorConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  consensusThreshold: number;
  topologyUpdateInterval: number;
  decompositionStrategies: DecompositionStrategy[];
  coordinationStrategies: CoordinationStrategy[];
  enableConsensus: boolean;
  enableTopologyAwareness: boolean;
  maxDecompositionDepth: number;
  agentSpecializationWeight: number;
}

export type DecompositionStrategy = 
  | 'sequential' 
  | 'parallel' 
  | 'hierarchical' 
  | 'pipeline' 
  | 'adaptive' 
  | 'consensus-based';

export type CoordinationStrategy = 
  | 'centralized' 
  | 'distributed' 
  | 'hybrid' 
  | 'consensus' 
  | 'topology-aware';

export interface TaskDecomposition {
  id: string;
  parentTaskId?: string;
  strategy: DecompositionStrategy;
  subtasks: SubTask[];
  dependencies: TaskDependency[];
  estimatedDuration: number;
  requiredCapabilities: string[];
  priority: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubTask {
  id: string;
  parentId: string;
  type: 'atomic' | 'composite';
  description: string;
  requirements: TaskRequirement[];
  estimatedDuration: number;
  priority: number;
  assignedAgent?: string;
  status: TaskStatus;
  result?: TaskResult;
  error?: TaskError;
  dependencies: string[];
  capabilities: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRequirement {
  type: 'capability' | 'resource' | 'data' | 'environment';
  name: string;
  value: any;
  required: boolean;
  weight: number;
}

export interface TaskDependency {
  fromTaskId: string;
  toTaskId: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  delay?: number;
  condition?: string;
}

export interface AgentTopology {
  id: string;
  agents: Map<string, AgentNode>;
  connections: Map<string, AgentConnection[]>;
  clusters: AgentCluster[];
  updatedAt: Date;
}

export interface AgentNode {
  id: string;
  state: AgentState;
  capabilities: string[];
  specialization: string[];
  workload: number;
  performance: AgentPerformance;
  location: AgentLocation;
  metadata: Record<string, any>;
}

export interface AgentConnection {
  targetAgentId: string;
  latency: number;
  bandwidth: number;
  reliability: number;
  lastUpdated: Date;
}

export interface AgentCluster {
  id: string;
  agentIds: string[];
  capabilities: string[];
  totalCapacity: number;
  averagePerformance: number;
  location: AgentLocation;
}

export interface AgentPerformance {
  tasksCompleted: number;
  averageExecutionTime: number;
  successRate: number;
  reliability: number;
  efficiency: number;
  lastUpdated: Date;
}

export interface AgentLocation {
  region?: string;
  zone?: string;
  coordinates?: { lat: number; lng: number };
  metadata?: Record<string, any>;
}

export interface ConsensusVote {
  agentId: string;
  taskId: string;
  decision: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export interface ConsensusResult {
  taskId: string;
  decision: 'approved' | 'rejected' | 'pending';
  votes: ConsensusVote[];
  confidence: number;
  quorum: boolean;
  timestamp: Date;
}

export interface HiveOrchestratorMetrics {
  totalTasks: number;
  decomposedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDecompositionTime: number;
  averageExecutionTime: number;
  consensusSuccessRate: number;
  topologyEfficiency: number;
  agentUtilization: number;
  throughput: number;
}

export class HiveOrchestrator extends EventEmitter {
  private decompositions = new Map<string, TaskDecomposition>();
  private subtasks = new Map<string, SubTask>();
  private topology: AgentTopology;
  private consensusVotes = new Map<string, ConsensusVote[]>();
  private topologyTimer?: NodeJS.Timeout;
  private metrics: HiveOrchestratorMetrics;
  private isShuttingDown = false;

  constructor(
    private config: HiveOrchestratorConfig,
    private logger: ILogger,
    private eventBus: IEventBus,
    private backgroundExecutor: BackgroundExecutor
  ) {
    super();
    this.topology = this.initializeTopology();
    this.metrics = this.initializeMetrics();
    this.setupEventHandlers();
  }

  private initializeTopology(): AgentTopology {
    return {
      id: generateId(),
      agents: new Map(),
      connections: new Map(),
      clusters: [],
      updatedAt: new Date()
    };
  }

  private initializeMetrics(): HiveOrchestratorMetrics {
    return {
      totalTasks: 0,
      decomposedTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageDecompositionTime: 0,
      averageExecutionTime: 0,
      consensusSuccessRate: 0,
      topologyEfficiency: 0,
      agentUtilization: 0,
      throughput: 0
    };
  }

  private setupEventHandlers(): void {
    this.eventBus.on('system:shutdown', () => this.shutdown());
    this.eventBus.on('agent:registered', (agent: AgentState) => this.addAgent(agent));
    this.eventBus.on('agent:unregistered', (agentId: string) => this.removeAgent(agentId));
    this.eventBus.on('agent:updated', (agent: AgentState) => this.updateAgent(agent));
    this.eventBus.on('task:completed', (result: TaskResult) => this.handleTaskCompletion(result));
    this.eventBus.on('consensus:vote', (vote: ConsensusVote) => this.handleConsensusVote(vote));
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing HiveOrchestrator');

    // Start topology update timer
    if (this.config.enableTopologyAwareness) {
      this.topologyTimer = setInterval(
        () => this.updateTopology(),
        this.config.topologyUpdateInterval
      );
    }

    this.logger.info('HiveOrchestrator initialized successfully');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down HiveOrchestrator');
    this.isShuttingDown = true;

    // Clear timers
    if (this.topologyTimer) clearInterval(this.topologyTimer);

    // Cancel all pending tasks
    for (const [taskId, decomposition] of this.decompositions) {
      if (decomposition.subtasks.some(st => st.status === 'running' || st.status === 'queued')) {
        await this.cancelTask(taskId);
      }
    }

    this.logger.info('HiveOrchestrator shutdown complete');
  }

  /**
   * Decompose a complex task into subtasks
   */
  async decomposeTask(
    task: TaskDefinition,
    strategy: DecompositionStrategy = 'adaptive'
  ): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('HiveOrchestrator is shutting down');
    }

    const startTime = Date.now();
    this.logger.info('Starting task decomposition', { taskId: task.id.id, strategy });

    const decomposition: TaskDecomposition = {
      id: generateId(),
      parentTaskId: task.id.id,
      strategy,
      subtasks: [],
      dependencies: [],
      estimatedDuration: 0,
      requiredCapabilities: task.requirements.capabilities || [],
      priority: task.priority === 'critical' ? 4 : task.priority === 'high' ? 3 : task.priority === 'normal' ? 2 : task.priority === 'low' ? 1 : 0,
      metadata: task.context || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Perform decomposition based on strategy
      switch (strategy) {
        case 'sequential':
          await this.decomposeSequential(task, decomposition);
          break;
        case 'parallel':
          await this.decomposeParallel(task, decomposition);
          break;
        case 'hierarchical':
          await this.decomposeHierarchical(task, decomposition);
          break;
        case 'pipeline':
          await this.decomposePipeline(task, decomposition);
          break;
        case 'adaptive':
          await this.decomposeAdaptive(task, decomposition);
          break;
        case 'consensus-based':
          await this.decomposeConsensus(task, decomposition);
          break;
        default:
          throw new Error(`Unknown decomposition strategy: ${strategy}`);
      }

      // Store decomposition
      this.decompositions.set(decomposition.id, decomposition);
      for (const subtask of decomposition.subtasks) {
        this.subtasks.set(subtask.id, subtask);
      }

      // Update metrics
      this.metrics.totalTasks++;
      this.metrics.decomposedTasks++;
      this.metrics.averageDecompositionTime = this.updateAverageTime(
        this.metrics.averageDecompositionTime,
        Date.now() - startTime,
        this.metrics.decomposedTasks
      );

      this.logger.info('Task decomposition completed', {
        taskId: task.id.id,
        decompositionId: decomposition.id,
        subtaskCount: decomposition.subtasks.length,
        duration: Date.now() - startTime
      });

      this.emit('task:decomposed', decomposition);

      // Start execution if not consensus-based
      if (strategy !== 'consensus-based' || !this.config.enableConsensus) {
        await this.executeDecomposition(decomposition);
      }

      return decomposition.id;

    } catch (error) {
      this.logger.error('Task decomposition failed', { taskId: task.id.id, error });
      throw error;
    }
  }

  /**
   * Execute a decomposed task
   */
  async executeDecomposition(decomposition: TaskDecomposition): Promise<void> {
    this.logger.info('Starting decomposition execution', { decompositionId: decomposition.id });

    try {
      // Assign agents to subtasks
      await this.assignAgentsToSubtasks(decomposition);

      // Execute subtasks based on strategy
      switch (decomposition.strategy) {
        case 'sequential':
          await this.executeSequential(decomposition);
          break;
        case 'parallel':
          await this.executeParallel(decomposition);
          break;
        case 'hierarchical':
          await this.executeHierarchical(decomposition);
          break;
        case 'pipeline':
          await this.executePipeline(decomposition);
          break;
        case 'adaptive':
          await this.executeAdaptive(decomposition);
          break;
        case 'consensus-based':
          await this.executeConsensus(decomposition);
          break;
      }

      this.logger.info('Decomposition execution completed', { decompositionId: decomposition.id });
      this.emit('decomposition:completed', decomposition);

    } catch (error) {
      this.logger.error('Decomposition execution failed', { decompositionId: decomposition.id, error });
      this.emit('decomposition:failed', decomposition, error);
      throw error;
    }
  }

  /**
   * Cancel a task decomposition
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const decomposition = this.decompositions.get(taskId);
    if (!decomposition) {
      return false;
    }

    this.logger.info('Cancelling task decomposition', { taskId, decompositionId: decomposition.id });

    // Cancel all subtasks
    for (const subtask of decomposition.subtasks) {
      if (subtask.status === 'running' || subtask.status === 'queued') {
        subtask.status = 'cancelled';
        subtask.updatedAt = new Date();
        
        // Cancel background task if exists
        if (subtask.assignedAgent) {
          this.eventBus.emit('task:cancel', subtask.id);
        }
      }
    }

    this.emit('task:cancelled', decomposition);
    return true;
  }

  /**
   * Get decomposition status
   */
  getDecomposition(decompositionId: string): TaskDecomposition | undefined {
    return this.decompositions.get(decompositionId);
  }

  /**
   * Get current metrics
   */
  getMetrics(): HiveOrchestratorMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get current topology
   */
  getTopology(): AgentTopology {
    return { ...this.topology };
  }

  // Private decomposition methods
  private async decomposeSequential(task: TaskDefinition, decomposition: TaskDecomposition): Promise<void> {
    // Break task into sequential steps
    const steps = this.analyzeTaskSteps(task);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const subtask: SubTask = {
        id: generateId(),
        parentId: decomposition.id,
        type: 'atomic',
        description: step.description,
        requirements: step.requirements,
        estimatedDuration: step.estimatedDuration,
        priority: decomposition.priority,
        status: 'queued',
        dependencies: i > 0 ? [steps[i - 1].id] : [],
        capabilities: step.capabilities,
        metadata: step.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      decomposition.subtasks.push(subtask);
      
      if (i > 0) {
        decomposition.dependencies.push({
          fromTaskId: steps[i - 1].id,
          toTaskId: subtask.id,
          type: 'finish-to-start'
        });
      }
    }
  }

  private async decomposeParallel(task: TaskDefinition, decomposition: TaskDecomposition): Promise<void> {
    // Break task into parallel components
    const components = this.analyzeTaskComponents(task);
    
    for (const component of components) {
      const subtask: SubTask = {
        id: generateId(),
        parentId: decomposition.id,
        type: 'atomic',
        description: component.description,
        requirements: component.requirements,
        estimatedDuration: component.estimatedDuration,
        priority: decomposition.priority,
        status: 'queued',
        dependencies: [],
        capabilities: component.capabilities,
        metadata: component.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      decomposition.subtasks.push(subtask);
    }
  }

  private async decomposeHierarchical(task: TaskDefinition, decomposition: TaskDecomposition): Promise<void> {
    // Create hierarchical breakdown
    const hierarchy = this.analyzeTaskHierarchy(task);
    
    for (const level of hierarchy) {
      for (const item of level.items) {
        const subtask: SubTask = {
          id: generateId(),
          parentId: decomposition.id,
          type: item.type,
          description: item.description,
          requirements: item.requirements,
          estimatedDuration: item.estimatedDuration,
          priority: decomposition.priority + level.level,
          status: 'queued',
          dependencies: item.dependencies,
          capabilities: item.capabilities,
          metadata: { ...item.metadata, level: level.level },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        decomposition.subtasks.push(subtask);
      }
    }
  }

  private async decomposePipeline(task: TaskDefinition, decomposition: TaskDecomposition): Promise<void> {
    // Create pipeline stages
    const stages = this.analyzeTaskPipeline(task);
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const subtask: SubTask = {
        id: generateId(),
        parentId: decomposition.id,
        type: 'atomic',
        description: stage.description,
        requirements: stage.requirements,
        estimatedDuration: stage.estimatedDuration,
        priority: decomposition.priority,
        status: 'queued',
        dependencies: i > 0 ? [stages[i - 1].id] : [],
        capabilities: stage.capabilities,
        metadata: { ...stage.metadata, stage: i },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      decomposition.subtasks.push(subtask);
    }
  }

  private async decomposeAdaptive(task: TaskDefinition, decomposition: TaskDecomposition): Promise<void> {
    // Analyze task complexity and choose best strategy
    const complexity = this.analyzeTaskComplexity(task);
    const availableAgents = Array.from(this.topology.agents.values());
    
    if (complexity.parallelizable && availableAgents.length > 1) {
      await this.decomposeParallel(task, decomposition);
    } else if (complexity.hierarchical) {
      await this.decomposeHierarchical(task, decomposition);
    } else {
      await this.decomposeSequential(task, decomposition);
    }
  }

  private async decomposeConsensus(task: TaskDefinition, decomposition: TaskDecomposition): Promise<void> {
    // Create consensus-based decomposition
    const proposals = this.generateDecompositionProposals(task);
    
    // Submit for consensus voting
    for (const proposal of proposals) {
      this.eventBus.emit('consensus:proposal', {
        taskId: task.id.id,
        decompositionId: decomposition.id,
        proposal
      });
    }
    
    // Wait for consensus (handled by consensus event handlers)
  }

  // Private execution methods
  private async executeSequential(decomposition: TaskDecomposition): Promise<void> {
    for (const subtask of decomposition.subtasks) {
      if (subtask.dependencies.length > 0) {
        await this.waitForDependencies(subtask.dependencies);
      }
      await this.executeSubtask(subtask);
    }
  }

  private async executeParallel(decomposition: TaskDecomposition): Promise<void> {
    const promises = decomposition.subtasks.map(subtask => this.executeSubtask(subtask));
    await Promise.all(promises);
  }

  private async executeHierarchical(decomposition: TaskDecomposition): Promise<void> {
    // Group by level and execute level by level
    const levels = new Map<number, SubTask[]>();
    
    for (const subtask of decomposition.subtasks) {
      const level = subtask.metadata.level || 0;
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(subtask);
    }

    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);
    
    for (const level of sortedLevels) {
      const levelTasks = levels.get(level)!;
      await Promise.all(levelTasks.map(subtask => this.executeSubtask(subtask)));
    }
  }

  private async executePipeline(decomposition: TaskDecomposition): Promise<void> {
    // Execute in pipeline order with data passing
    const sortedTasks = decomposition.subtasks.sort((a, b) => 
      (a.metadata.stage || 0) - (b.metadata.stage || 0)
    );

    for (const subtask of sortedTasks) {
      await this.executeSubtask(subtask);
    }
  }

  private async executeAdaptive(decomposition: TaskDecomposition): Promise<void> {
    // Monitor execution and adapt strategy
    const strategy = this.determineExecutionStrategy(decomposition);
    
    switch (strategy) {
      case 'parallel':
        await this.executeParallel(decomposition);
        break;
      case 'sequential':
        await this.executeSequential(decomposition);
        break;
      case 'hierarchical':
        await this.executeHierarchical(decomposition);
        break;
      default:
        await this.executeSequential(decomposition);
    }
  }

  private async executeConsensus(decomposition: TaskDecomposition): Promise<void> {
    // Wait for consensus approval before execution
    const consensus = await this.waitForConsensus(decomposition.id);
    
    if (consensus.decision === 'approved') {
      await this.executeParallel(decomposition);
    } else {
      throw new Error(`Consensus rejected task execution: ${consensus.decision}`);
    }
  }

  // Helper methods
  private async executeSubtask(subtask: SubTask): Promise<void> {
    if (!subtask.assignedAgent) {
      throw new Error(`No agent assigned to subtask: ${subtask.id}`);
    }

    subtask.status = 'running';
    subtask.updatedAt = new Date();

    try {
      // Submit to background executor
      const taskId = await this.backgroundExecutor.submitTask({
        type: 'agent-task',
        command: 'claude',
        args: ['-p', subtask.description],
        options: {
          timeout: subtask.estimatedDuration * 1000,
          metadata: {
            subtaskId: subtask.id,
            agentId: subtask.assignedAgent,
            capabilities: subtask.capabilities
          }
        },
        priority: subtask.priority
      });

      // Wait for completion
      const result = await this.waitForTaskCompletion(taskId);
      
      subtask.status = 'completed';
      subtask.result = result;
      subtask.updatedAt = new Date();

      this.metrics.completedTasks++;
      this.emit('subtask:completed', subtask);

    } catch (error) {
      subtask.status = 'failed';
      subtask.error = {
        type: 'execution_failed',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          subtaskId: subtask.id,
          agentId: subtask.assignedAgent
        },
        recoverable: true,
        retryable: true
      };
      subtask.updatedAt = new Date();

      this.metrics.failedTasks++;
      this.emit('subtask:failed', subtask, error);
      throw error;
    }
  }

  private async assignAgentsToSubtasks(decomposition: TaskDecomposition): Promise<void> {
    for (const subtask of decomposition.subtasks) {
      const agent = this.findBestAgent(subtask);
      if (agent) {
        subtask.assignedAgent = agent.id;
        subtask.updatedAt = new Date();
      } else {
        throw new Error(`No suitable agent found for subtask: ${subtask.id}`);
      }
    }
  }

  private findBestAgent(subtask: SubTask): AgentNode | undefined {
    const agents = Array.from(this.topology.agents.values());
    
    // Filter agents by capabilities
    const capableAgents = agents.filter(agent => 
      subtask.capabilities.every(cap => agent.capabilities.includes(cap))
    );

    if (capableAgents.length === 0) {
      return undefined;
    }

    // Score agents based on multiple factors
    const scoredAgents = capableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, subtask)
    }));

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    return scoredAgents[0].agent;
  }

  private calculateAgentScore(agent: AgentNode, subtask: SubTask): number {
    let score = 0;

    // Performance factor (40%)
    score += agent.performance.successRate * 0.4;

    // Workload factor (30% - lower workload is better)
    score += (1 - Math.min(agent.workload, 1)) * 0.3;

    // Specialization factor (20%)
    const specializationMatch = subtask.capabilities.filter(cap => 
      agent.specialization.includes(cap)
    ).length / subtask.capabilities.length;
    score += specializationMatch * 0.2;

    // Reliability factor (10%)
    score += agent.performance.reliability * 0.1;

    return score;
  }

  private async waitForDependencies(dependencies: string[]): Promise<void> {
    const dependentTasks = dependencies.map(id => this.subtasks.get(id)).filter(Boolean);
    
    while (dependentTasks.some(task => task!.status !== 'completed')) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async waitForTaskCompletion(taskId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkTask = () => {
        const task = this.backgroundExecutor.getTask(taskId);
        if (!task) {
          reject(new Error('Task not found'));
          return;
        }

        if (task.status === 'completed') {
          resolve(task.result);
        } else if (task.status === 'failed') {
          reject(new Error(task.error || 'Task failed'));
        } else {
          setTimeout(checkTask, 100);
        }
      };

      checkTask();
    });
  }

  private async waitForConsensus(decompositionId: string): Promise<ConsensusResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Consensus timeout'));
      }, 30000); // 30 second timeout

      const checkConsensus = () => {
        const votes = this.consensusVotes.get(decompositionId) || [];
        const totalAgents = this.topology.agents.size;
        const requiredVotes = Math.ceil(totalAgents * this.config.consensusThreshold);

        if (votes.length >= requiredVotes) {
          clearTimeout(timeout);
          const result = this.calculateConsensusResult(decompositionId, votes);
          resolve(result);
        } else {
          setTimeout(checkConsensus, 100);
        }
      };

      checkConsensus();
    });
  }

  private calculateConsensusResult(decompositionId: string, votes: ConsensusVote[]): ConsensusResult {
    const approveVotes = votes.filter(v => v.decision === 'approve');
    const rejectVotes = votes.filter(v => v.decision === 'reject');
    
    const decision = approveVotes.length > rejectVotes.length ? 'approved' : 'rejected';
    const confidence = approveVotes.length / votes.length;
    const quorum = votes.length >= Math.ceil(this.topology.agents.size * this.config.consensusThreshold);

    return {
      taskId: decompositionId,
      decision,
      votes,
      confidence,
      quorum,
      timestamp: new Date()
    };
  }

  // Agent management methods
  private addAgent(agent: AgentState): void {
    const agentNode: AgentNode = {
      id: agent.id.id,
      state: agent,
      capabilities: Array.isArray(agent.capabilities) ? 
        agent.capabilities : 
        Object.keys(agent.capabilities).filter(key => agent.capabilities[key as keyof typeof agent.capabilities]),
      specialization: [], // Default to empty array since AgentState doesn't have specialization
      workload: 0,
      performance: {
        tasksCompleted: 0,
        averageExecutionTime: 0,
        successRate: 1.0,
        reliability: 1.0,
        efficiency: 1.0,
        lastUpdated: new Date()
      },
      location: {
        region: undefined,
        zone: undefined
      },
      metadata: {}
    };

    this.topology.agents.set(agent.id.id, agentNode);
    this.topology.updatedAt = new Date();
    
    this.logger.info('Agent added to topology', { agentId: agent.id.id });
  }

  private removeAgent(agentId: string): void {
    this.topology.agents.delete(agentId);
    this.topology.connections.delete(agentId);
    this.topology.updatedAt = new Date();
    
    this.logger.info('Agent removed from topology', { agentId });
  }

  private updateAgent(agent: AgentState): void {
    const existingNode = this.topology.agents.get(agent.id.id);
    if (existingNode) {
      existingNode.state = agent;
      existingNode.capabilities = Array.isArray(agent.capabilities) ? 
        agent.capabilities : 
        Object.keys(agent.capabilities).filter(key => agent.capabilities[key as keyof typeof agent.capabilities]);
      existingNode.metadata = {};
      this.topology.updatedAt = new Date();
    }
  }

  private updateTopology(): void {
    // Update agent connections and clusters
    this.updateAgentConnections();
    this.updateAgentClusters();
    this.topology.updatedAt = new Date();
  }

  private updateAgentConnections(): void {
    // Implementation for updating agent connections
    // This would involve measuring latency, bandwidth, etc.
  }

  private updateAgentClusters(): void {
    // Implementation for clustering agents based on capabilities and location
  }

  private handleTaskCompletion(result: TaskResult): void {
    // Update agent performance metrics - result doesn't have agentId in the interface
    // This would need to be passed in the result metadata or handled differently
  }

  private handleConsensusVote(vote: ConsensusVote): void {
    if (!this.consensusVotes.has(vote.taskId)) {
      this.consensusVotes.set(vote.taskId, []);
    }
    this.consensusVotes.get(vote.taskId)!.push(vote);
  }

  private updateMetrics(): void {
    // Update various metrics
    const totalTasks = this.decompositions.size;
    const completedDecompositions = Array.from(this.decompositions.values())
      .filter(d => d.subtasks.every(st => st.status === 'completed')).length;
    
    this.metrics.totalTasks = totalTasks;
    this.metrics.completedTasks = completedDecompositions;
    
    // Calculate agent utilization
    const agents = Array.from(this.topology.agents.values());
    this.metrics.agentUtilization = agents.length > 0 
      ? agents.reduce((sum, agent) => sum + agent.workload, 0) / agents.length
      : 0;
  }

  private updateAverageTime(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  // Task analysis methods (simplified implementations)
  private analyzeTaskSteps(task: TaskDefinition): any[] {
    // Simplified implementation - would use AI/ML for real analysis
    return [
      { id: generateId(), description: 'Step 1', requirements: [], estimatedDuration: 1000, capabilities: [], metadata: {} },
      { id: generateId(), description: 'Step 2', requirements: [], estimatedDuration: 1000, capabilities: [], metadata: {} }
    ];
  }

  private analyzeTaskComponents(task: TaskDefinition): any[] {
    // Simplified implementation
    return [
      { description: 'Component 1', requirements: [], estimatedDuration: 1000, capabilities: [], metadata: {} },
      { description: 'Component 2', requirements: [], estimatedDuration: 1000, capabilities: [], metadata: {} }
    ];
  }

  private analyzeTaskHierarchy(task: TaskDefinition): any[] {
    // Simplified implementation
    return [
      { level: 0, items: [{ type: 'composite', description: 'Level 0', requirements: [], estimatedDuration: 1000, dependencies: [], capabilities: [], metadata: {} }] },
      { level: 1, items: [{ type: 'atomic', description: 'Level 1', requirements: [], estimatedDuration: 1000, dependencies: [], capabilities: [], metadata: {} }] }
    ];
  }

  private analyzeTaskPipeline(task: TaskDefinition): any[] {
    // Simplified implementation
    return [
      { id: generateId(), description: 'Stage 1', requirements: [], estimatedDuration: 1000, capabilities: [], metadata: {} },
      { id: generateId(), description: 'Stage 2', requirements: [], estimatedDuration: 1000, capabilities: [], metadata: {} }
    ];
  }

  private analyzeTaskComplexity(task: TaskDefinition): any {
    // Simplified implementation
    return {
      parallelizable: true,
      hierarchical: false,
      complexity: 'medium'
    };
  }

  private generateDecompositionProposals(task: TaskDefinition): any[] {
    // Simplified implementation
    return [
      { strategy: 'parallel', confidence: 0.8 },
      { strategy: 'sequential', confidence: 0.6 }
    ];
  }

  private determineExecutionStrategy(decomposition: TaskDecomposition): string {
    // Simplified implementation
    return 'parallel';
  }
} 