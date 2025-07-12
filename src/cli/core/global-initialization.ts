/**
 * Global Initialization System - Fast & Reliable
 * Streamlined service initialization with lazy loading and error recovery
 */

import { IEventBus } from '../../core/event-bus.ts';
import { ILogger } from '../../core/logger.ts';
import { EventBus } from '../../core/event-bus.ts';
import { Logger } from '../../core/logger.ts';
import { MemoryConfig } from '../../utils/types.ts';
import { printInfo, printError, printSuccess } from './output-formatter.ts';

// Simplified service interfaces
export interface FastPersistenceManager {
  initialized: boolean;
  initialize?: () => Promise<void>;
  store: (key: string, value: any) => Promise<void>;
  retrieve: (key: string) => Promise<any>;
  delete: (key: string) => Promise<void>;
  close: () => Promise<void>;
  
  // Agent methods
  saveAgent: (agent: any) => Promise<void>;
  getAgent: (id: string) => Promise<any>;
  getAllAgents: () => Promise<any[]>;
  getActiveAgents: () => Promise<any[]>;
  updateAgentStatus: (id: string, status: string) => Promise<void>;
  
  // Task methods
  saveTask: (task: any) => Promise<void>;
  getTask: (id: string) => Promise<any>;
  getActiveTasks: () => Promise<any[]>;
  updateTaskStatus: (id: string, status: string, assignedAgent?: string) => Promise<void>;
  updateTaskProgress: (id: string, progress: number) => Promise<void>;
  
  // Stats methods
  getStats: () => Promise<{
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
  }>;
}

export interface FastMemoryManager {
  initialized: boolean;
  initialize?: () => Promise<void>;
  store(key: string, value: any, options?: any): Promise<void>;
  store(entry: any): Promise<void>;
  retrieve: (key: string, namespace?: string) => Promise<any>;
  query: (query: any) => Promise<any[]>;
  shutdown: () => Promise<void>;
  delete: (key: string) => Promise<void>;
  
  // Health and status methods
  getHealthStatus: () => Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    healthy: boolean;
    details: Record<string, any>;
    metrics?: any;
    error?: string;
    timestamp: Date;
  }>;
}

export interface GlobalServices {
  persistence: FastPersistenceManager;
  memory: FastMemoryManager;
  eventBus: IEventBus;
  logger: ILogger;
  initialized: boolean;
}

// Global singleton instances
let globalServices: GlobalServices | null = null;
let initializationPromise: Promise<GlobalServices> | null = null;

/**
 * Fast initialization with minimal dependencies
 */
export async function initializeGlobalServices(
  providedEventBus?: IEventBus,
  providedLogger?: ILogger,
  memoryConfig?: MemoryConfig,
  timeoutMs: number = 5000
): Promise<GlobalServices> {
  // Return existing services if already initialized
  if (globalServices?.initialized) {
    return globalServices;
  }

  // Return existing initialization promise if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise with timeout
  initializationPromise = Promise.race([
    initializeServicesInternal(providedEventBus, providedLogger, memoryConfig),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Service initialization timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);

  try {
    const result = await initializationPromise;
    globalServices = result;
    return result;
  } catch (error) {
    // Reset initialization promise on failure
    initializationPromise = null;
    throw error;
  }
}

/**
 * Internal service initialization - fast and simple
 */
async function initializeServicesInternal(
  providedEventBus?: IEventBus,
  providedLogger?: ILogger,
  memoryConfig?: MemoryConfig
): Promise<GlobalServices> {
  try {
    // Use provided services or create lightweight defaults
    const eventBus = providedEventBus || EventBus.getInstance();
    const logger = providedLogger || Logger.getInstance();

    logger.info('Starting global services initialization');

    // Create fast in-memory persistence (no SQLite dependency)
    const persistence = createFastPersistence();
    
    // Create fast in-memory storage (no complex memory vault)
    const memory = createFastMemory();

    // Initialize services (fast, no external dependencies)
    await persistence.initialize?.();
    await memory.initialize?.();

    const services: GlobalServices = {
      persistence,
      memory,
      eventBus,
      logger,
      initialized: true
    };

    logger.info('Global services initialized successfully');
    return services;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to initialize backend services: ${errorMessage}`);
    throw error;
  }
}

/**
 * Create fast in-memory persistence manager
 */
function createFastPersistence(): FastPersistenceManager {
  const storage = new Map<string, any>();
  
  return {
    initialized: false,
    
    async initialize() {
      this.initialized = true;
    },

    async store(key: string, value: any): Promise<void> {
      storage.set(key, {
        value,
        timestamp: Date.now()
      });
    },

    async retrieve(key: string): Promise<any> {
      const entry = storage.get(key);
      return entry?.value || null;
    },

    async delete(key: string): Promise<void> {
      storage.delete(key);
    },

    async close(): Promise<void> {
      storage.clear();
      this.initialized = false;
    },

    // Agent methods
    async saveAgent(agent: any): Promise<void> {
      storage.set(`agent:${agent.id}`, { value: agent, timestamp: Date.now(), type: 'agent' });
    },
    async getAgent(id: string): Promise<any> {
      const entry = storage.get(`agent:${id}`);
      return entry?.value || null;
    },
    async getAllAgents(): Promise<any[]> {
      const agents: any[] = [];
      for (const [key, entry] of storage.entries()) {
        if (key.startsWith('agent:')) {
          agents.push(entry.value);
        }
      }
      return agents;
    },
    async getActiveAgents(): Promise<any[]> {
      const agents: any[] = [];
      for (const [key, entry] of storage.entries()) {
        if (key.startsWith('agent:') && (entry.value.status === 'active' || entry.value.status === 'idle')) {
          agents.push(entry.value);
        }
      }
      return agents;
    },
    async updateAgentStatus(id: string, status: string): Promise<void> {
      const entry = storage.get(`agent:${id}`);
      if (entry) {
        entry.value.status = status;
        storage.set(`agent:${id}`, entry);
      }
    },

    // Task methods
    async saveTask(task: any): Promise<void> {
      storage.set(`task:${task.id}`, { value: task, timestamp: Date.now(), type: 'task' });
    },
    async getTask(id: string): Promise<any> {
      const entry = storage.get(`task:${id}`);
      return entry?.value || null;
    },
    async getActiveTasks(): Promise<any[]> {
      const tasks: any[] = [];
      for (const [key, entry] of storage.entries()) {
        if (key.startsWith('task:') && (entry.value.status === 'active' || entry.value.status === 'pending')) {
          tasks.push(entry.value);
        }
      }
      return tasks;
    },
    async updateTaskStatus(id: string, status: string, assignedAgent?: string): Promise<void> {
      const entry = storage.get(`task:${id}`);
      if (entry) {
        entry.value.status = status;
        if (assignedAgent) {
          entry.value.assignedAgent = assignedAgent;
        }
        storage.set(`task:${id}`, entry);
      }
    },
    async updateTaskProgress(id: string, progress: number): Promise<void> {
      const entry = storage.get(`task:${id}`);
      if (entry) {
        entry.value.progress = progress;
        storage.set(`task:${id}`, entry);
      }
    },

    // Stats methods
    async getStats(): Promise<{
      totalAgents: number;
      activeAgents: number;
      totalTasks: number;
      pendingTasks: number;
      completedTasks: number;
    }> {
      let totalAgents = 0;
      let activeAgents = 0;
      let totalTasks = 0;
      let pendingTasks = 0;
      let completedTasks = 0;

      for (const [key, entry] of storage.entries()) {
        if (key.startsWith('agent:')) {
          totalAgents++;
          if (entry.value.status === 'active' || entry.value.status === 'idle') {
            activeAgents++;
          }
        } else if (key.startsWith('task:')) {
          totalTasks++;
          if (entry.value.status === 'pending') {
            pendingTasks++;
          } else if (entry.value.status === 'completed') {
            completedTasks++;
          }
        }
      }

      return {
        totalAgents,
        activeAgents,
        totalTasks,
        pendingTasks,
        completedTasks
      };
    }
  };
}

/**
 * Create fast in-memory manager
 */
function createFastMemory(): FastMemoryManager {
  const storage = new Map<string, any>();
  const namespaces = new Map<string, Map<string, any>>();
  
  return {
    initialized: false,
    
    async initialize() {
      this.initialized = true;
    },

    async store(keyOrEntry: string | any, value?: any, options: any = {}): Promise<void> {
      // Handle both patterns: store(key, value, options) and store(entry)
      if (typeof keyOrEntry === 'string') {
        // Pattern 1: store(key, value, options)
        const key = keyOrEntry;
        const namespace = options.namespace || 'default';
        
        if (!namespaces.has(namespace)) {
          namespaces.set(namespace, new Map());
        }
        
        const nsStorage = namespaces.get(namespace)!;
        nsStorage.set(key, {
          value,
          timestamp: Date.now(),
          tags: options.tags || [],
          ttl: options.ttl
        });
      } else {
        // Pattern 2: store(entry) - where entry is a MemoryEntry object
        const entry = keyOrEntry;
        const key = entry.id || entry.key || `entry-${Date.now()}`;
        const namespace = entry.context?.namespace || 'default';
        
        if (!namespaces.has(namespace)) {
          namespaces.set(namespace, new Map());
        }
        
        const nsStorage = namespaces.get(namespace)!;
        nsStorage.set(key, {
          value: entry.content || entry.value || entry,
          timestamp: Date.now(),
          tags: entry.tags || [],
          ttl: entry.ttl,
          metadata: entry.metadata || {}
        });
      }
    },

    async retrieve(key: string, namespace: string = 'default'): Promise<any> {
      const nsStorage = namespaces.get(namespace);
      if (!nsStorage) return null;
      
      const entry = nsStorage.get(key);
      if (!entry) return null;
      
      // Check TTL
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        nsStorage.delete(key);
        return null;
      }
      
      return entry.value;
    },

    async query(query: any): Promise<any[]> {
      const results: any[] = [];
      const searchTerm = query.search?.toLowerCase() || '';
      const limit = query.limit || 100;
      
      for (const [namespace, nsStorage] of namespaces) {
        for (const [key, entry] of nsStorage) {
          if (searchTerm && !key.toLowerCase().includes(searchTerm)) {
            continue;
          }
          
          results.push({
            id: key,
            namespace,
            content: entry.value,
            timestamp: new Date(entry.timestamp),
            tags: entry.tags || []
          });
          
          if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
      }
      
      return results;
    },

    async shutdown(): Promise<void> {
      storage.clear();
      namespaces.clear();
      this.initialized = false;
    },

    async delete(key: string): Promise<void> {
      for (const [namespace, nsStorage] of namespaces) {
        nsStorage.delete(key);
      }
    },

    // Health and status methods
    async getHealthStatus(): Promise<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      healthy: boolean;
      details: Record<string, any>;
      metrics?: any;
      error?: string;
      timestamp: Date;
    }> {
      return {
        status: 'healthy',
        healthy: true,
        details: {},
        timestamp: new Date()
      };
    }
  };
}

/**
 * Get global services (throws if not initialized)
 */
export async function getGlobalServices(): Promise<GlobalServices> {
  if (globalServices?.initialized) {
    return globalServices;
  }
  throw new Error('Global services not initialized. Call initializeGlobalServices() first.');
}

/**
 * Get individual service instances
 */
export async function getPersistenceManager(): Promise<FastPersistenceManager> {
  const services = await getGlobalServices();
  return services.persistence;
}

export async function getMemoryManager(): Promise<FastMemoryManager> {
  const services = await getGlobalServices();
  return services.memory;
}

export async function getLogger(): Promise<ILogger> {
  const services = await getGlobalServices();
  return services.logger;
}

export async function getEventBus(): Promise<IEventBus> {
  const services = await getGlobalServices();
  return services.eventBus;
}

/**
 * Check if services are initialized
 */
export function isServicesInitialized(): boolean {
  return globalServices?.initialized || false;
}

/**
 * Shutdown all global services gracefully
 */
export async function shutdownGlobalServices(): Promise<void> {
  try {
    if (globalServices?.logger) {
      globalServices.logger.info('Starting global services shutdown');
    }

    if (globalServices?.memory) {
      await globalServices.memory.shutdown();
    }

    if (globalServices?.persistence) {
      await globalServices.persistence.close();
    }

    if (globalServices?.logger) {
      globalServices.logger.info('Global services shutdown completed');
    }

    // Reset globals
    globalServices = null;
    initializationPromise = null;

  } catch (error) {
    console.error(`Failed to shutdown services: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Health check for all services
 */
export async function checkServicesHealth(): Promise<{
  persistence: boolean;
  memory: boolean;
  logger: boolean;
  eventBus: boolean;
  overall: boolean;
}> {
  try {
    const health = {
      persistence: globalServices?.persistence?.initialized || false,
      memory: globalServices?.memory?.initialized || false,
      logger: !!globalServices?.logger,
      eventBus: !!globalServices?.eventBus,
      overall: false
    };

    health.overall = health.persistence && health.memory && health.logger && health.eventBus;
    
    return health;

  } catch (error) {
    return {
      persistence: false,
      memory: false,
      logger: false,
      eventBus: false,
      overall: false
    };
  }
}

/**
 * Get initialization status
 */
export function getInitializationStatus(): {
  initialized: boolean;
  services: {
    persistence: boolean;
    memory: boolean;
    logger: boolean;
    eventBus: boolean;
  }
} {
  return {
    initialized: globalServices?.initialized || false,
    services: {
      persistence: globalServices?.persistence?.initialized || false,
      memory: globalServices?.memory?.initialized || false,
      logger: !!globalServices?.logger,
      eventBus: !!globalServices?.eventBus
    }
  };
}

 