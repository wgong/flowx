/**
 * Unified Agent Manager
 * Consolidates all agent spawning implementations into a single, production-ready system
 * Eliminates technical debt from multiple overlapping implementations
 */

import { EventEmitter } from 'node:events';
import { ILogger } from '../core/logger.ts';
import { IEventBus } from '../core/event-bus.ts';
import { AgentProcessManager, AgentProcessConfig, AgentProcessInfo, TaskRequest, TaskResult } from './agent-process-manager.ts';
import { getPersistenceManager } from '../cli/core/global-initialization.ts';
import { generateId } from '../utils/helpers.ts';

export interface UnifiedAgentConfig {
  // Basic agent properties
  id?: string;
  name: string;
  type: 'backend' | 'frontend' | 'devops' | 'test' | 'security' | 'documentation' | 'general' | 'coordinator' | 'researcher' | 'implementer' | 'analyst';
  specialization?: string;
  
  // Capabilities and behavior
  capabilities?: string[];
  systemPrompt?: string;
  priority?: number;
  
  // Resource constraints
  maxMemory?: number; // MB
  maxConcurrentTasks?: number;
  timeout?: number; // ms
  
  // Environment and runtime
  workingDirectory?: string;
  environment?: Record<string, string>;
  
  // Claude API configuration
  claudeConfig?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  
  // Persistence options
  persistToDatabase?: boolean;
  swarmId?: string;
}

export interface UnifiedAgentInfo extends AgentProcessInfo {
  capabilities: string[];
  systemPrompt: string;
  priority: number;
  swarmId?: string;
  persistedToDatabase: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface SwarmAgent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'working' | 'error' | 'offline';
  capabilities: string[];
  currentTask?: string;
  assignedTo?: string;
  priority: number;
  workload: number;
  performance: {
    tasksCompleted: number;
    tasksFailed: number;
    averageResponseTime: number;
    successRate: number;
  };
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Unified Agent Manager - Single source of truth for all agent operations
 * Consolidates AgentProcessManager, SwarmCoordinator, CLI commands, and UI components
 */
export class UnifiedAgentManager extends EventEmitter {
  private logger: ILogger;
  private eventBus: IEventBus;
  private processManager: AgentProcessManager;
  private agentMetadata = new Map<string, {
    capabilities: string[];
    systemPrompt: string;
    priority: number;
    swarmId?: string;
    persistedToDatabase: boolean;
    createdAt: Date;
  }>();

  constructor(logger: ILogger, eventBus: IEventBus) {
    super();
    this.logger = logger;
    this.eventBus = eventBus;
    this.processManager = new AgentProcessManager(logger);
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Forward process manager events with unified context
    this.processManager.on('agent:started', (data) => {
      this.emit('agent:started', this.enrichAgentData(data));
    });
    
    this.processManager.on('agent:stopped', (data) => {
      this.emit('agent:stopped', this.enrichAgentData(data));
    });
    
    this.processManager.on('agent:error', (data) => {
      this.emit('agent:error', this.enrichAgentData(data));
    });
    
    this.processManager.on('agent:exited', (data) => {
      this.emit('agent:exited', this.enrichAgentData(data));
    });
  }

  /**
   * Create and start a new agent - UNIFIED ENTRY POINT
   * Replaces all other agent spawning methods
   */
  async createAgent(config: UnifiedAgentConfig): Promise<string> {
    const agentId = config.id || generateId('agent');
    
    this.logger.info('Creating unified agent', { 
      agentId, 
      name: config.name, 
      type: config.type,
      persistToDatabase: config.persistToDatabase ?? true
    });

    // Create process manager configuration
    const processConfig: AgentProcessConfig = {
      id: agentId,
      type: this.mapToProcessType(config.type),
      specialization: config.specialization,
      maxMemory: config.maxMemory,
      maxConcurrentTasks: config.maxConcurrentTasks || 3,
      timeout: config.timeout,
      workingDirectory: config.workingDirectory,
      environment: config.environment,
      claudeConfig: config.claudeConfig
    };

    // Store metadata for unified operations
    this.agentMetadata.set(agentId, {
      capabilities: config.capabilities || [],
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(config.type),
      priority: config.priority || 5,
      swarmId: config.swarmId,
      persistedToDatabase: config.persistToDatabase ?? true,
      createdAt: new Date()
    });

    try {
      // Create the actual process
      await this.processManager.createAgent(processConfig);

      // Persist to database if requested
      if (config.persistToDatabase !== false) {
        await this.persistAgentToDatabase(agentId, config);
      }

      this.logger.info('Unified agent created successfully', { agentId, name: config.name });
      
      // Emit unified event
      this.emit('agent:created', {
        agentId,
        config,
        processInfo: this.processManager.getAgent(agentId)
      });

      return agentId;

    } catch (error) {
      // Cleanup on failure
      this.agentMetadata.delete(agentId);
      this.logger.error('Failed to create unified agent', { agentId, error });
      throw error;
    }
  }

  /**
   * Stop an agent - UNIFIED ENTRY POINT
   */
  async stopAgent(agentId: string, force = false): Promise<void> {
    this.logger.info('Stopping unified agent', { agentId, force });

    try {
      // Stop the process
      await this.processManager.stopAgent(agentId, force);

      // Update database status if persisted
      const metadata = this.agentMetadata.get(agentId);
      if (metadata?.persistedToDatabase) {
        const persistenceManager = await getPersistenceManager();
        await persistenceManager.updateAgentStatus(agentId, 'removed');
      }

      // Cleanup metadata
      this.agentMetadata.delete(agentId);

      this.emit('agent:removed', { agentId });

    } catch (error) {
      this.logger.error('Failed to stop unified agent', { agentId, error });
      throw error;
    }
  }

  /**
   * Execute a task on an agent - UNIFIED ENTRY POINT
   */
  async executeTask(agentId: string, task: TaskRequest): Promise<TaskResult> {
    const metadata = this.agentMetadata.get(agentId);
    if (!metadata) {
      throw new Error(`Agent ${agentId} not found in unified manager`);
    }

    this.logger.debug('Executing task on unified agent', { agentId, taskId: task.id });

    try {
      const result = await this.processManager.executeTask(agentId, task);
      
      // Update last activity
      metadata.createdAt = new Date(); // Using createdAt as lastActivity for now
      
      this.emit('task:completed', { agentId, task, result });
      return result;

    } catch (error) {
      this.emit('task:failed', { agentId, task, error });
      throw error;
    }
  }

  /**
   * Get all agents - UNIFIED ENTRY POINT
   * Returns enriched agent information combining process and metadata
   */
  getAgents(): UnifiedAgentInfo[] {
    const processAgents = this.processManager.getAgents();
    
    return processAgents.map(processInfo => {
      const metadata = this.agentMetadata.get(processInfo.id);
      
      return {
        ...processInfo,
        capabilities: metadata?.capabilities || [],
        systemPrompt: metadata?.systemPrompt || '',
        priority: metadata?.priority || 5,
        swarmId: metadata?.swarmId,
        persistedToDatabase: metadata?.persistedToDatabase || false,
        createdAt: metadata?.createdAt || new Date(),
        lastActivity: processInfo.lastActivity || new Date()
      };
    });
  }

  /**
   * Get agents in swarm format for SwarmCoordinator compatibility
   */
  getSwarmAgents(): SwarmAgent[] {
    const unifiedAgents = this.getAgents();
    
    return unifiedAgents.map(agent => ({
      id: agent.id,
      name: agent.config.specialization || agent.type,
      type: agent.type,
      status: this.mapStatusToSwarmStatus(agent.status),
      capabilities: agent.capabilities,
      currentTask: undefined, // Could be enhanced to track current task
      assignedTo: undefined,
      priority: agent.priority,
      workload: 0, // Could be calculated from active tasks
      performance: {
        tasksCompleted: agent.tasksCompleted,
        tasksFailed: agent.tasksFailed,
        averageResponseTime: 0, // Could be calculated from metrics
        successRate: agent.tasksCompleted > 0 ? 
          agent.tasksCompleted / (agent.tasksCompleted + agent.tasksFailed) : 1
      },
      createdAt: agent.createdAt,
      lastActivity: agent.lastActivity
    }));
  }

  /**
   * Get a specific agent - UNIFIED ENTRY POINT
   */
  getAgent(agentId: string): UnifiedAgentInfo | undefined {
    const processInfo = this.processManager.getAgent(agentId);
    if (!processInfo) return undefined;

    const metadata = this.agentMetadata.get(agentId);
    
    return {
      ...processInfo,
      capabilities: metadata?.capabilities || [],
      systemPrompt: metadata?.systemPrompt || '',
      priority: metadata?.priority || 5,
      swarmId: metadata?.swarmId,
      persistedToDatabase: metadata?.persistedToDatabase || false,
      createdAt: metadata?.createdAt || new Date(),
      lastActivity: processInfo.lastActivity || new Date()
    };
  }

  /**
   * Get agent statistics - UNIFIED ENTRY POINT
   */
  getAgentStats() {
    return this.processManager.getAgentStats();
  }

  /**
   * Restart an agent - UNIFIED ENTRY POINT
   */
  async restartAgent(agentId: string): Promise<void> {
    this.logger.info('Restarting unified agent', { agentId });
    
    const metadata = this.agentMetadata.get(agentId);
    if (!metadata) {
      throw new Error(`Agent ${agentId} metadata not found`);
    }

    // Restart the process (metadata is preserved)
    await this.processManager.restartAgent(agentId);
    
    this.emit('agent:restarted', { agentId });
  }

  /**
   * Shutdown all agents - UNIFIED ENTRY POINT
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down unified agent manager');
    
    await this.processManager.shutdown();
    this.agentMetadata.clear();
    
    this.emit('shutdown');
  }

  // === PRIVATE HELPER METHODS ===

  private mapToProcessType(type: string): AgentProcessConfig['type'] {
    const typeMap: Record<string, AgentProcessConfig['type']> = {
      'coordinator': 'general',
      'researcher': 'general', 
      'implementer': 'backend',
      'analyst': 'general',
      'backend': 'backend',
      'frontend': 'frontend',
      'devops': 'devops',
      'test': 'test',
      'security': 'security',
      'documentation': 'documentation',
      'general': 'general'
    };
    
    return typeMap[type] || 'general';
  }

  private mapStatusToSwarmStatus(status: string): SwarmAgent['status'] {
    const statusMap: Record<string, SwarmAgent['status']> = {
      'running': 'idle',
      'starting': 'working',
      'stopping': 'offline',
      'stopped': 'offline',
      'error': 'error',
      'crashed': 'error'
    };
    
    return statusMap[status] || 'offline';
  }

  private getDefaultSystemPrompt(type: string): string {
    const prompts: Record<string, string> = {
      'coordinator': 'You are a project coordinator agent specialized in planning, task delegation, and progress monitoring.',
      'researcher': 'You are a research agent specialized in information gathering, analysis, and knowledge synthesis.',
      'implementer': 'You are an implementation agent specialized in code development, testing, and technical execution.',
      'analyst': 'You are an analysis agent specialized in data analysis, reporting, and insights generation.',
      'backend': 'You are a backend developer agent specialized in server-side development and APIs.',
      'frontend': 'You are a frontend developer agent specialized in user interfaces and client-side development.',
      'devops': 'You are a DevOps agent specialized in deployment, infrastructure, and operations.',
      'test': 'You are a testing agent specialized in quality assurance and test automation.',
      'security': 'You are a security agent specialized in security analysis and vulnerability assessment.',
      'documentation': 'You are a documentation agent specialized in creating clear and comprehensive documentation.',
      'general': 'You are a general-purpose agent capable of handling various tasks and adapting to different requirements.'
    };
    
    return prompts[type] || prompts['general'];
  }

  private async persistAgentToDatabase(agentId: string, config: UnifiedAgentConfig): Promise<void> {
    try {
      const persistenceManager = await getPersistenceManager();
      
      await persistenceManager.saveAgent({
        id: agentId,
        name: config.name,
        type: config.type,
        status: 'active',
        capabilities: JSON.stringify(config.capabilities || []),
        systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(config.type),
        maxConcurrentTasks: config.maxConcurrentTasks || 3,
        priority: config.priority || 5,
        createdAt: Date.now()
      });
      
    } catch (error) {
      this.logger.error('Failed to persist agent to database', { agentId, error });
      // Don't throw - agent process creation should not fail due to database issues
    }
  }

  private enrichAgentData(data: any): any {
    const metadata = this.agentMetadata.get(data.agentId);
    return {
      ...data,
      capabilities: metadata?.capabilities || [],
      priority: metadata?.priority || 5,
      swarmId: metadata?.swarmId
    };
  }
}

// Factory function for creating UnifiedAgentManager instances
export function createUnifiedAgentManager(logger: ILogger, eventBus: IEventBus): UnifiedAgentManager {
  return new UnifiedAgentManager(logger, eventBus);
}

export default UnifiedAgentManager; 