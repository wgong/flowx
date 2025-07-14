/**
 * Work stealing algorithm for load balancing between agents
 */

import { EventEmitter } from 'events';
import type { IEventBus } from '../core/event-bus.js';
import type { ILogger } from '../core/logger.js';
import type { Task, AgentProfile } from '../core/types.js';

export interface WorkStealingConfig {
  enabled: boolean;
  stealThreshold: number; // Min difference in task count to trigger stealing
  maxStealBatch: number; // Max tasks to steal at once
  stealInterval: number; // How often to check for steal opportunities (ms)
  minTasksToSteal: number; // Minimum tasks an agent must have before others can steal
}

export interface AgentWorkload {
  agentId: string;
  taskCount: number;
  avgTaskDuration: number;
  cpuUsage: number;
  memoryUsage: number;
  priority: number;
  capabilities: string[];
  isOverloaded: boolean;
  isUnderloaded: boolean;
}

export interface StealOperation {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  taskIds: string[];
  reason: string;
  status: 'planned' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  metrics: {
    tasksStolen: number;
    loadReduction: number;
    latencyImprovement: number;
  };
}

export class WorkStealingCoordinator extends EventEmitter {
  private workloads = new Map<string, AgentWorkload>();
  private stealInterval?: NodeJS.Timeout;
  private taskDurations = new Map<string, number[]>(); // agentId -> task durations
  private stealOperations = new Map<string, StealOperation>();
  private isActive = false;
  private registeredAgents = new Map<string, AgentProfile>();

  constructor(
    private config: WorkStealingConfig,
    private eventBus: IEventBus,
    private logger: ILogger,
  ) {
    super();
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Work stealing is disabled');
      return;
    }

    this.isActive = true;
    this.startStealingMonitor();
    this.logger.info('Work Stealing Coordinator initialized', {
      stealThreshold: this.config.stealThreshold,
      maxStealBatch: this.config.maxStealBatch,
      stealInterval: this.config.stealInterval
    });
  }

  async shutdown(): Promise<void> {
    this.isActive = false;
    if (this.stealInterval) {
      clearInterval(this.stealInterval);
    }
    this.removeAllListeners();
    this.logger.info('Work Stealing Coordinator shut down');
  }

  updateAgentWorkload(agentId: string, workload: Partial<AgentWorkload>): void {
    const existing = this.workloads.get(agentId) || {
      agentId,
      taskCount: 0,
      avgTaskDuration: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      priority: 1,
      capabilities: [],
      isOverloaded: false,
      isUnderloaded: false
    };

    const updated = { ...existing, ...workload };
    
    // Calculate load status
    updated.isOverloaded = updated.taskCount > 8 || updated.cpuUsage > 80;
    updated.isUnderloaded = updated.taskCount < 2 && updated.cpuUsage < 30;

    this.workloads.set(agentId, updated);
    this.logger.debug('Updated agent workload', { agentId, workload: updated });
  }

  recordTaskDuration(agentId: string, duration: number): void {
    if (!this.taskDurations.has(agentId)) {
      this.taskDurations.set(agentId, []);
    }

    const durations = this.taskDurations.get(agentId)!;
    durations.push(duration);

    // Keep only last 50 durations
    if (durations.length > 50) {
      durations.shift();
    }

    // Update average duration in workload
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    this.updateAgentWorkload(agentId, { avgTaskDuration: avgDuration });
  }

  async checkAndSteal(): Promise<void> {
    if (!this.isActive || !this.config.enabled) return;

    const workloads = Array.from(this.workloads.values());
    const overloadedAgents = workloads.filter(w => w.isOverloaded && w.taskCount >= this.config.minTasksToSteal);
    const underloadedAgents = workloads.filter(w => w.isUnderloaded);

    if (overloadedAgents.length === 0 || underloadedAgents.length === 0) {
      return;
    }

    for (const overloaded of overloadedAgents) {
      // Find best target for stealing
      const target = this.findBestStealTarget(overloaded, underloadedAgents);
      if (target) {
        await this.executeStealOperation(overloaded, target);
      }
    }
  }

  private findBestStealTarget(source: AgentWorkload, candidates: AgentWorkload[]): AgentWorkload | null {
    if (candidates.length === 0) return null;

    // Score candidates by capability match and current load
    const scored = candidates.map(candidate => {
      const capabilityMatch = this.calculateCapabilityMatch(source.capabilities, candidate.capabilities);
      const loadDifference = source.taskCount - candidate.taskCount;
      const priorityBonus = candidate.priority * 0.1;
      
      const score = (capabilityMatch * 0.4) + (loadDifference * 0.4) + priorityBonus;
      return { agent: candidate, score };
    });

    // Sort by score and return best candidate
    scored.sort((a, b) => b.score - a.score);
    return scored[0].score > 0.5 ? scored[0].agent : null;
  }

  private calculateCapabilityMatch(sourceCapabilities: string[], targetCapabilities: string[]): number {
    if (sourceCapabilities.length === 0 || targetCapabilities.length === 0) {
      return 0.5; // Neutral score if no capabilities
    }

    const intersection = sourceCapabilities.filter(cap => targetCapabilities.includes(cap));
    return intersection.length / Math.max(sourceCapabilities.length, targetCapabilities.length);
  }

  private async executeStealOperation(source: AgentWorkload, target: AgentWorkload): Promise<void> {
    const loadDifference = source.taskCount - target.taskCount;
    if (loadDifference < this.config.stealThreshold) {
      return;
    }

    const tasksToSteal = Math.min(
      Math.floor(loadDifference / 2),
      this.config.maxStealBatch
    );

    const operation: StealOperation = {
      id: `steal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceAgentId: source.agentId,
      targetAgentId: target.agentId,
      taskIds: [], // Would be populated with actual task IDs
      reason: `Load balancing: ${source.taskCount} -> ${target.taskCount}`,
      status: 'planned',
      startTime: new Date(),
      metrics: {
        tasksStolen: tasksToSteal,
        loadReduction: tasksToSteal,
        latencyImprovement: 0
      }
    };

    this.stealOperations.set(operation.id, operation);

    try {
      operation.status = 'executing';
      
      // Emit steal event for actual task reassignment
      this.eventBus.emit('work:steal', {
        operationId: operation.id,
        sourceAgentId: source.agentId,
        targetAgentId: target.agentId,
        tasksToSteal,
        reason: operation.reason
      });

      // Update workloads optimistically
      this.updateAgentWorkload(source.agentId, { 
        taskCount: source.taskCount - tasksToSteal 
      });
      this.updateAgentWorkload(target.agentId, { 
        taskCount: target.taskCount + tasksToSteal 
      });

      operation.status = 'completed';
      operation.endTime = new Date();

      this.logger.info('Work stealing operation completed', {
        operationId: operation.id,
        sourceAgent: source.agentId,
        targetAgent: target.agentId,
        tasksStolen: tasksToSteal
      });

    } catch (error) {
      operation.status = 'failed';
      operation.endTime = new Date();
      
      this.logger.error('Work stealing operation failed', {
        operationId: operation.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private startStealingMonitor(): void {
    this.stealInterval = setInterval(() => {
      this.checkAndSteal().catch(error => {
        this.logger.error('Error in work stealing check', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    }, this.config.stealInterval);
  }

  private setupEventHandlers(): void {
    this.eventBus.on('task:assigned', (data: any) => {
      const workload = this.workloads.get(data.agentId);
      if (workload) {
        this.updateAgentWorkload(data.agentId, {
          taskCount: workload.taskCount + 1
        });
      }
    });

    this.eventBus.on('task:completed', (data: any) => {
      const workload = this.workloads.get(data.agentId);
      if (workload) {
        this.updateAgentWorkload(data.agentId, {
          taskCount: Math.max(0, workload.taskCount - 1)
        });
        this.recordTaskDuration(data.agentId, data.duration || 0);
      }
    });

    this.eventBus.on('task:failed', (data: any) => {
      const workload = this.workloads.get(data.agentId);
      if (workload) {
        this.updateAgentWorkload(data.agentId, {
          taskCount: Math.max(0, workload.taskCount - 1)
        });
      }
    });

    this.eventBus.on('agent:metrics_updated', (data: any) => {
      this.updateAgentWorkload(data.agentId, {
        cpuUsage: data.cpuUsage || 0,
        memoryUsage: data.memoryUsage || 0
      });
    });
  }

  getWorkloadStats(): Record<string, unknown> {
    const workloads = Array.from(this.workloads.values());
    const operations = Array.from(this.stealOperations.values());

    return {
      totalAgents: workloads.length,
      overloadedAgents: workloads.filter(w => w.isOverloaded).length,
      underloadedAgents: workloads.filter(w => w.isUnderloaded).length,
      totalStealOperations: operations.length,
      successfulSteals: operations.filter(op => op.status === 'completed').length,
      failedSteals: operations.filter(op => op.status === 'failed').length,
      avgTasksPerAgent: workloads.length > 0 
        ? workloads.reduce((sum, w) => sum + w.taskCount, 0) / workloads.length 
        : 0,
      workloads: Object.fromEntries(
        workloads.map(w => [w.agentId, {
          taskCount: w.taskCount,
          isOverloaded: w.isOverloaded,
          isUnderloaded: w.isUnderloaded,
          avgDuration: w.avgTaskDuration
        }])
      )
    };
  }

  getStealOperations(): StealOperation[] {
    return Array.from(this.stealOperations.values());
  }

  registerAgent(profile: AgentProfile): void {
    this.registeredAgents.set(profile.id, profile);
    
    // Initialize workload for the agent
    this.updateAgentWorkload(profile.id, {
      agentId: profile.id,
      taskCount: 0,
      avgTaskDuration: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      priority: profile.priority || 1,
      capabilities: profile.capabilities || []
    });

    this.logger.debug('Agent registered with work stealing coordinator', {
      agentId: profile.id,
      capabilities: profile.capabilities || []
    });
  }

  unregisterAgent(agentId: string): void {
    this.registeredAgents.delete(agentId);
    this.workloads.delete(agentId);
    this.taskDurations.delete(agentId);

    this.logger.debug('Agent unregistered from work stealing coordinator', {
      agentId
    });
  }

  performMaintenance(): void {
    this.logger.debug('Performing work stealing coordinator maintenance');
    
    // Clean up old task durations
    for (const [agentId, durations] of this.taskDurations) {
      if (durations.length > 100) {
        // Keep only the last 100 task durations
        this.taskDurations.set(agentId, durations.slice(-100));
      }
    }

    // Clean up old steal operations
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    for (const [operationId, operation] of this.stealOperations) {
      if (operation.endTime && operation.endTime < cutoffTime) {
        this.stealOperations.delete(operationId);
      }
    }
  }

  findBestAgent(task: Task, agents: AgentProfile[]): string | null {
    if (agents.length === 0) return null;

    // Find the agent with the lowest workload that can handle the task
    const availableAgents = agents.filter(agent => 
      agent.status === 'idle' || agent.status === 'active'
    );

    if (availableAgents.length === 0) return null;

    // Score agents based on workload and capability match
    const scored = availableAgents.map(agent => {
      const workload = this.workloads.get(agent.id);
      const taskCount = workload ? workload.taskCount : 0;
      const capabilities = workload ? workload.capabilities : agent.capabilities || [];
      
      // Check capability match
      const taskRequirements = task.requiredCapabilities || [];
      const capabilityMatch = taskRequirements.length > 0 
        ? taskRequirements.filter(req => capabilities.includes(req)).length / taskRequirements.length
        : 1.0;

      // Lower task count is better, higher capability match is better
      const loadScore = 1 / (taskCount + 1); // Avoid division by zero
      const score = (loadScore * 0.6) + (capabilityMatch * 0.4);

      return { agent, score };
    });

    // Sort by score and return the best agent
    scored.sort((a, b) => b.score - a.score);
    return scored[0].agent.id;
  }
}