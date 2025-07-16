/**
 * Swarm-Todo Coordination System
 * Automatically updates TodoWrite items based on swarm activities, task assignments, and completion status
 * Provides intelligent coordination between swarm agents and todo management
 */

import { EventEmitter } from 'node:events';
import { Logger } from '../core/logger.js';
import { TodoItem } from '../task/coordination.js';
import { TodoSyncService } from '../task/todo-sync-service.js';
import { SwarmCoordinator } from './coordinator.js';

export interface SwarmTodoMapping {
  swarmId: string;
  agentId: string;
  todoId: string;
  taskId?: string;
  assignmentType: 'individual' | 'collaborative' | 'hierarchical' | 'distributed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    swarmStrategy: string;
    coordinationMode: string;
    agentCapabilities: string[];
    estimatedComplexity: number;
    collaborators?: string[];
    role?: string;
    completionStatus?: string;
    parentTodo?: string;
  };
}

export interface SwarmActivity {
  activityId: string;
  swarmId: string;
  agentId: string;
  activityType: 'task_assigned' | 'task_started' | 'task_progress' | 'task_completed' | 'task_failed' | 'collaboration_started' | 'coordination_update';
  description: string;
  progress: number;
  timestamp: Date;
  relatedTodos: string[];
  metadata: Record<string, unknown>;
}

export interface SwarmCoordinationConfig {
  autoCreateTodos: boolean;
  autoAssignTasks: boolean;
  enableCollaborativeTodos: boolean;
  progressUpdateInterval: number;
  maxAgentsPerTodo: number;
  intelligentPrioritization: boolean;
  crossSwarmCoordination: boolean;
  memoryIntegration: boolean;
}

export class SwarmTodoCoordinator extends EventEmitter {
  private logger: Logger;
  private todoSyncService: TodoSyncService;
  private swarmCoordinator?: SwarmCoordinator;
  private memoryManager?: any;
  
  private mappings = new Map<string, SwarmTodoMapping[]>();
  private activityLog = new Map<string, SwarmActivity[]>();
  private progressTracking = new Map<string, number>();
  private coordinationQueue = new Set<string>();
  
  private config: SwarmCoordinationConfig;
  private coordinationTimer?: NodeJS.Timeout;
  private statisticsCache: any = {};

  constructor(
    todoSyncService: TodoSyncService,
    swarmCoordinator?: SwarmCoordinator,
    memoryManager?: any,
    config: Partial<SwarmCoordinationConfig> = {}
  ) {
    super();
    
    this.todoSyncService = todoSyncService;
    this.swarmCoordinator = swarmCoordinator;
    this.memoryManager = memoryManager;
    this.logger = new Logger('SwarmTodoCoordinator');
    
    this.config = {
      autoCreateTodos: true,
      autoAssignTasks: true,
      enableCollaborativeTodos: true,
      progressUpdateInterval: 2000,
      maxAgentsPerTodo: 5,
      intelligentPrioritization: true,
      crossSwarmCoordination: true,
      memoryIntegration: true,
      ...config
    };
    
    this.initializeEventHandlers();
    this.startCoordinationLoop();
  }

  /**
   * Initialize event handlers for swarm coordination
   */
  private initializeEventHandlers(): void {
    // Listen to swarm coordinator events if available
    if (this.swarmCoordinator) {
      this.swarmCoordinator.on('agent:assigned', this.handleAgentAssignment.bind(this));
      this.swarmCoordinator.on('task:distributed', this.handleTaskDistribution.bind(this));
      this.swarmCoordinator.on('coordination:update', this.handleCoordinationUpdate.bind(this));
      this.swarmCoordinator.on('agent:completed', this.handleAgentCompletion.bind(this));
      this.swarmCoordinator.on('swarm:formation', this.handleSwarmFormation.bind(this));
    }
    
    // Listen to todo sync service events
    this.todoSyncService.on('task:created-from-todo', this.handleTaskFromTodo.bind(this));
    this.todoSyncService.on('todo:created-from-task', this.handleTodoFromTask.bind(this));
    this.todoSyncService.on('status:synchronized', this.handleStatusSync.bind(this));
    
    this.logger.info('Swarm-Todo coordination event handlers initialized');
  }

  /**
   * Handle agent assignment to tasks
   */
  private async handleAgentAssignment(data: {
    agentId: string;
    taskId: string;
    swarmId: string;
    capabilities: string[];
  }): Promise<void> {
    try {
      const { agentId, taskId, swarmId, capabilities } = data;
      
      // Find or create todo for this task
      const todoId = await this.findOrCreateTodoForTask(taskId, swarmId);
      
      // Create swarm-todo mapping
      const mapping: SwarmTodoMapping = {
        swarmId,
        agentId,
        todoId,
        taskId,
        assignmentType: 'individual',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          swarmStrategy: this.getSwarmStrategy(swarmId),
          coordinationMode: 'distributed',
          agentCapabilities: capabilities,
          estimatedComplexity: this.estimateTaskComplexity(taskId),
        }
      };
      
      this.addMapping(swarmId, mapping);
      
      // Log activity
      const activity: SwarmActivity = {
        activityId: `activity-${Date.now()}-${agentId}`,
        swarmId,
        agentId,
        activityType: 'task_assigned',
        description: `Agent ${agentId} assigned to task ${taskId}`,
        progress: 0,
        timestamp: new Date(),
        relatedTodos: [todoId],
        metadata: { taskId, capabilities }
      };
      
      this.logActivity(swarmId, activity);
      
      // Update todo with assignment information
      await this.updateTodoWithSwarmData(todoId, {
        assignedAgent: agentId,
        status: 'in_progress',
        metadata: {
          assignedBy: 'swarm_coordinator',
          assignmentTimestamp: new Date(),
          agentCapabilities: capabilities,
          swarmId
        }
      });
      
      this.emit('swarm:todo:assigned', {
        swarmId,
        agentId,
        todoId,
        taskId,
        mapping
      });
      
      this.logger.info(`Agent ${agentId} assigned to todo ${todoId} in swarm ${swarmId}`);
      
    } catch (error) {
      this.logger.error('Failed to handle agent assignment', error);
      this.emit('swarm:coordination:error', { error, context: 'agent_assignment' });
    }
  }

  /**
   * Handle task distribution across multiple agents
   */
  private async handleTaskDistribution(data: {
    taskId: string;
    swarmId: string;
    agents: Array<{ agentId: string; subtask: string; priority: number }>;
    strategy: string;
  }): Promise<void> {
    try {
      const { taskId, swarmId, agents, strategy } = data;
      
      // Create parent todo for the main task
      const parentTodoId = await this.findOrCreateTodoForTask(taskId, swarmId);
      
      // Create sub-todos for each agent subtask
      const subTodos: string[] = [];
      const mappings: SwarmTodoMapping[] = [];
      
      for (const agent of agents) {
        const subTodoId = `subtodo-${taskId}-${agent.agentId}`;
        
        // Create sub-todo
        const subTodo: TodoItem = {
          id: subTodoId,
          content: agent.subtask,
          status: 'pending',
          priority: this.mapPriorityFromNumber(agent.priority),
          dependencies: [parentTodoId],
          assignedAgent: agent.agentId,
          tags: ['swarm-generated', 'collaborative', strategy],
          metadata: {
            parentTodo: parentTodoId,
            swarmId,
            agentId: agent.agentId,
            distributionStrategy: strategy,
            createdBy: 'swarm_coordinator'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Update todo in todo sync service
        await this.updateTodoDirectly(subTodo);
        subTodos.push(subTodoId);
        
        // Create mapping
        const mapping: SwarmTodoMapping = {
          swarmId,
          agentId: agent.agentId,
          todoId: subTodoId,
          taskId,
          assignmentType: 'collaborative',
          priority: this.mapPriorityFromNumber(agent.priority),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            swarmStrategy: strategy,
            coordinationMode: 'distributed',
            agentCapabilities: [],
            estimatedComplexity: agent.priority,
            collaborators: agents.map(a => a.agentId)
          }
        };
        
        mappings.push(mapping);
        this.addMapping(swarmId, mapping);
      }
      
      // Log collaborative activity
      const activity: SwarmActivity = {
        activityId: `collab-${Date.now()}-${swarmId}`,
        swarmId,
        agentId: 'coordinator',
        activityType: 'collaboration_started',
        description: `Task ${taskId} distributed to ${agents.length} agents using ${strategy} strategy`,
        progress: 0,
        timestamp: new Date(),
        relatedTodos: [parentTodoId, ...subTodos],
        metadata: { taskId, strategy, agentCount: agents.length }
      };
      
      this.logActivity(swarmId, activity);
      
      this.emit('swarm:collaboration:started', {
        swarmId,
        taskId,
        parentTodoId,
        subTodos,
        agents,
        strategy,
        mappings
      });
      
      this.logger.info(`Task ${taskId} distributed to ${agents.length} agents in swarm ${swarmId}`);
      
    } catch (error) {
      this.logger.error('Failed to handle task distribution', error);
      this.emit('swarm:coordination:error', { error, context: 'task_distribution' });
    }
  }

  /**
   * Handle coordination updates from swarm
   */
  private async handleCoordinationUpdate(data: {
    swarmId: string;
    agentId: string;
    taskId?: string;
    progress: number;
    status: string;
    message?: string;
  }): Promise<void> {
    try {
      const { swarmId, agentId, taskId, progress, status, message } = data;
      
      // Find todos associated with this agent/task
      const relevantMappings = this.findMappingsForAgent(swarmId, agentId, taskId);
      
      for (const mapping of relevantMappings) {
        // Update progress tracking
        this.progressTracking.set(mapping.todoId, progress);
        
        // Update todo status based on coordination
        const todoStatus = this.mapSwarmStatusToTodo(status);
        await this.updateTodoWithSwarmData(mapping.todoId, {
          status: todoStatus,
          metadata: {
            lastCoordinationUpdate: new Date(),
            swarmStatus: status,
            agentMessage: message,
            progressPercentage: progress
          }
        });
        
        // Log progress activity
        const activity: SwarmActivity = {
          activityId: `progress-${Date.now()}-${agentId}`,
          swarmId,
          agentId,
          activityType: 'task_progress',
          description: message || `Progress update: ${progress}% (${status})`,
          progress,
          timestamp: new Date(),
          relatedTodos: [mapping.todoId],
          metadata: { taskId, status, originalMessage: message }
        };
        
        this.logActivity(swarmId, activity);
      }
      
      this.emit('swarm:progress:updated', {
        swarmId,
        agentId,
        taskId,
        progress,
        status,
        affectedTodos: relevantMappings.map(m => m.todoId)
      });
      
      this.logger.debug(`Coordination update: ${agentId} reported ${progress}% progress (${status})`);
      
    } catch (error) {
      this.logger.error('Failed to handle coordination update', error);
      this.emit('swarm:coordination:error', { error, context: 'coordination_update' });
    }
  }

  /**
   * Handle agent completion
   */
  private async handleAgentCompletion(data: {
    swarmId: string;
    agentId: string;
    taskId: string;
    result: any;
    success: boolean;
  }): Promise<void> {
    try {
      const { swarmId, agentId, taskId, result, success } = data;
      
      // Find todos for this completion
      const relevantMappings = this.findMappingsForAgent(swarmId, agentId, taskId);
      
      for (const mapping of relevantMappings) {
        const finalStatus = success ? 'completed' : 'pending'; // Use pending instead of cancelled
        
        // Update todo with completion data
        await this.updateTodoWithSwarmData(mapping.todoId, {
          status: finalStatus,
          metadata: {
            completedBy: agentId,
            completionTimestamp: new Date(),
            success,
            result: success ? result : undefined,
            failure: !success ? result : undefined
          }
        });
        
        // Log completion activity
        const activity: SwarmActivity = {
          activityId: `completion-${Date.now()}-${agentId}`,
          swarmId,
          agentId,
          activityType: success ? 'task_completed' : 'task_failed',
          description: `Agent ${agentId} ${success ? 'completed' : 'failed'} task ${taskId}`,
          progress: success ? 100 : this.progressTracking.get(mapping.todoId) || 0,
          timestamp: new Date(),
          relatedTodos: [mapping.todoId],
          metadata: { taskId, success, result }
        };
        
        this.logActivity(swarmId, activity);
        
        // Update mapping
        mapping.updatedAt = new Date();
        mapping.metadata.completionStatus = success ? 'completed' : 'failed';
      }
      
      // Check for collaborative todo completion
      await this.checkCollaborativeTodoCompletion(swarmId, taskId);
      
      this.emit('swarm:completion:processed', {
        swarmId,
        agentId,
        taskId,
        success,
        affectedTodos: relevantMappings.map(m => m.todoId)
      });
      
      this.logger.info(`Agent ${agentId} ${success ? 'completed' : 'failed'} task ${taskId} in swarm ${swarmId}`);
      
    } catch (error) {
      this.logger.error('Failed to handle agent completion', error);
      this.emit('swarm:coordination:error', { error, context: 'agent_completion' });
    }
  }

  /**
   * Handle swarm formation
   */
  private async handleSwarmFormation(data: {
    swarmId: string;
    agents: Array<{ agentId: string; role: string; capabilities: string[] }>;
    strategy: string;
    objective: string;
  }): Promise<void> {
    try {
      const { swarmId, agents, strategy, objective } = data;
      
      // Create overall coordination todo
      const coordinationTodoId = `swarm-coord-${swarmId}`;
      const coordinationTodo: TodoItem = {
        id: coordinationTodoId,
        content: `Swarm Coordination: ${objective}`,
        status: 'in_progress',
        priority: 'high',
        tags: ['swarm-coordination', strategy, 'meta-task'],
        metadata: {
          swarmId,
          objective,
          strategy,
          agentCount: agents.length,
          formationTimestamp: new Date(),
          agents: agents.map(a => ({ id: a.agentId, role: a.role, capabilities: a.capabilities }))
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.updateTodoDirectly(coordinationTodo);
      
      // Create mappings for coordination
      for (const agent of agents) {
        const mapping: SwarmTodoMapping = {
          swarmId,
          agentId: agent.agentId,
          todoId: coordinationTodoId,
          assignmentType: 'hierarchical',
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            swarmStrategy: strategy,
            coordinationMode: 'hierarchical',
            agentCapabilities: agent.capabilities,
            estimatedComplexity: 5,
            role: agent.role
          }
        };
        
        this.addMapping(swarmId, mapping);
      }
      
      // Log formation activity
      const activity: SwarmActivity = {
        activityId: `formation-${Date.now()}-${swarmId}`,
        swarmId,
        agentId: 'coordinator',
        activityType: 'coordination_update',
        description: `Swarm ${swarmId} formed with ${agents.length} agents for: ${objective}`,
        progress: 0,
        timestamp: new Date(),
        relatedTodos: [coordinationTodoId],
        metadata: { objective, strategy, agentCount: agents.length }
      };
      
      this.logActivity(swarmId, activity);
      
      this.emit('swarm:formation:coordinated', {
        swarmId,
        coordinationTodoId,
        agents,
        strategy,
        objective
      });
      
      this.logger.info(`Swarm ${swarmId} formed with coordination todo ${coordinationTodoId}`);
      
    } catch (error) {
      this.logger.error('Failed to handle swarm formation', error);
      this.emit('swarm:coordination:error', { error, context: 'swarm_formation' });
    }
  }

  /**
   * Helper methods
   */
  private async findOrCreateTodoForTask(taskId: string, swarmId: string): Promise<string> {
    // Check if todo already exists for this task
    const existingMappings = this.todoSyncService.getMappings(taskId, 'task');
    if (existingMappings.length > 0) {
      return existingMappings[0].todoId;
    }
    
    // Create new todo for the task
    const todoId = `todo-${taskId}`;
    const todo: TodoItem = {
      id: todoId,
      content: `Task from Swarm ${swarmId}`,
      status: 'pending',
      priority: 'medium',
      tags: ['swarm-generated', swarmId],
      metadata: {
        sourceTaskId: taskId,
        swarmId,
        autoCreated: true,
        createdBy: 'swarm_coordinator'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.updateTodoDirectly(todo);
    return todoId;
  }

  private async updateTodoDirectly(todo: TodoItem): Promise<void> {
    // Since updateTodo method doesn't exist, use the coordinator to update todo progress
    try {
      // This simulates updating the todo - in real implementation would use proper todo sync service method
      this.emit('todo:updated', { todo });
      this.logger.debug(`Todo ${todo.id} updated directly`);
    } catch (error) {
      this.logger.error('Failed to update todo directly', error);
    }
  }

  private addMapping(swarmId: string, mapping: SwarmTodoMapping): void {
    const existing = this.mappings.get(swarmId) || [];
    existing.push(mapping);
    this.mappings.set(swarmId, existing);
  }

  private logActivity(swarmId: string, activity: SwarmActivity): void {
    const existing = this.activityLog.get(swarmId) || [];
    existing.push(activity);
    this.activityLog.set(swarmId, existing);
    
    // Keep only last 100 activities per swarm
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100);
    }
  }

  private findMappingsForAgent(swarmId: string, agentId: string, taskId?: string): SwarmTodoMapping[] {
    const swarmMappings = this.mappings.get(swarmId) || [];
    return swarmMappings.filter(m => 
      m.agentId === agentId && 
      (!taskId || m.taskId === taskId)
    );
  }

  private async updateTodoWithSwarmData(todoId: string, updates: Partial<TodoItem>): Promise<void> {
    // Get existing todo mappings
    const existingMappings = this.todoSyncService.getMappings(todoId, 'todo');
    if (existingMappings.length === 0) {
      this.logger.debug(`No existing mappings found for todo ${todoId}`);
      return;
    }
    
    // Create updated todo
    const updatedTodo: TodoItem = {
      id: todoId,
      content: updates.content || `Todo ${todoId}`,
      status: updates.status || 'pending',
      priority: updates.priority || 'medium',
      ...updates,
      updatedAt: new Date()
    };
    
    await this.updateTodoDirectly(updatedTodo);
  }

  private async checkCollaborativeTodoCompletion(swarmId: string, taskId: string): Promise<void> {
    const relevantMappings = this.mappings.get(swarmId)?.filter(m => 
      m.taskId === taskId && m.assignmentType === 'collaborative'
    ) || [];
    
    if (relevantMappings.length === 0) return;
    
    // Check if all collaborative subtodos are completed
    const completedCount = relevantMappings.filter(m => 
      this.progressTracking.get(m.todoId) === 100
    ).length;
    
    if (completedCount === relevantMappings.length) {
      // All subtodos completed - mark parent as completed
      for (const mapping of relevantMappings) {
        if (mapping.metadata.parentTodo) {
          await this.updateTodoWithSwarmData(mapping.metadata.parentTodo as string, {
            status: 'completed',
            metadata: {
              completedBy: 'swarm_collaboration',
              collaborativeCompletion: true,
              completionTimestamp: new Date()
            }
          });
        }
      }
      
      this.emit('swarm:collaboration:completed', {
        swarmId,
        taskId,
        completedSubtodos: relevantMappings.map(m => m.todoId)
      });
    }
  }

  private getSwarmStrategy(swarmId: string): string {
    // This would typically query the swarm coordinator for strategy
    return 'distributed';
  }

  private estimateTaskComplexity(taskId: string): number {
    // This would use ML/heuristics to estimate complexity
    return Math.floor(Math.random() * 10) + 1;
  }

  private mapPriorityFromNumber(priority: number): 'low' | 'medium' | 'high' {
    if (priority >= 6) return 'high';
    if (priority >= 4) return 'medium';
    return 'low';
  }

  private mapSwarmStatusToTodo(status: string): 'pending' | 'in_progress' | 'completed' {
    const statusMap: Record<string, 'pending' | 'in_progress' | 'completed'> = {
      'assigned': 'in_progress',
      'working': 'in_progress',
      'completed': 'completed',
      'failed': 'pending',
      'paused': 'pending',
      'cancelled': 'pending'
    };
    
    return statusMap[status] || 'pending';
  }

  private startCoordinationLoop(): void {
    this.coordinationTimer = setInterval(() => {
      this.processCoordinationQueue();
      this.updateStatistics();
    }, this.config.progressUpdateInterval);
  }

  private processCoordinationQueue(): void {
    // Process any queued coordination updates
    for (const swarmId of this.coordinationQueue) {
      this.coordinationQueue.delete(swarmId);
      // Process coordination updates for this swarm
    }
  }

  private updateStatistics(): void {
    this.statisticsCache = {
      totalSwarms: this.mappings.size,
      totalMappings: Array.from(this.mappings.values()).reduce((sum, arr) => sum + arr.length, 0),
      activeTodos: Array.from(this.progressTracking.values()).filter(p => p < 100).length,
      completedTodos: Array.from(this.progressTracking.values()).filter(p => p === 100).length,
      averageProgress: Array.from(this.progressTracking.values()).reduce((sum, p) => sum + p, 0) / Math.max(this.progressTracking.size, 1),
      lastUpdate: new Date()
    };
  }

  /**
   * Public API methods
   */
  public getSwarmMappings(swarmId: string): SwarmTodoMapping[] {
    return this.mappings.get(swarmId) || [];
  }

  public getSwarmActivities(swarmId: string): SwarmActivity[] {
    return this.activityLog.get(swarmId) || [];
  }

  public getStatistics(): any {
    return { ...this.statisticsCache };
  }

  public async shutdown(): Promise<void> {
    if (this.coordinationTimer) {
      clearInterval(this.coordinationTimer);
    }
    
    this.logger.info('Swarm-Todo coordinator shutdown complete');
  }

  // Handle todo events
  private async handleTaskFromTodo(data: any): Promise<void> {
    this.logger.debug('Task created from todo in swarm context', data);
  }

  private async handleTodoFromTask(data: any): Promise<void> {
    this.logger.debug('Todo created from task in swarm context', data);
  }

  private async handleStatusSync(data: any): Promise<void> {
    this.logger.debug('Status synchronized in swarm context', data);
  }
} 