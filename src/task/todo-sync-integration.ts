/**
 * Todo-Task Synchronization Integration Layer
 * Provides easy integration of TodoSyncService with existing Claude Flow systems
 */

import { TodoSyncService, SyncConfiguration } from './todo-sync-service.js';
import { TaskEngine } from './engine.js';
import { TaskCoordinator } from './coordination.js';
import { Logger } from '../core/logger.js';

export interface TodoSyncIntegrationConfig {
  enableAutoSync: boolean;
  syncConfiguration: Partial<SyncConfiguration>;
  memoryManagerProvider?: () => any;
  loggerProvider?: () => Logger;
}

export class TodoSyncIntegration {
  private syncService?: TodoSyncService;
  private logger: Logger;
  private config: TodoSyncIntegrationConfig;

  constructor(config: Partial<TodoSyncIntegrationConfig> = {}) {
    this.config = {
      enableAutoSync: true,
      syncConfiguration: {
        autoCreateTasks: true,
        autoCreateTodos: true,
        bidirectionalSync: true,
        preserveHistory: true,
        enableIntelligentUpdates: true,
        syncInterval: 1000,
        retryAttempts: 3,
        memoryNamespace: 'todo_task_sync'
      },
      ...config
    };

    this.logger = this.config.loggerProvider?.() || new Logger('TodoSyncIntegration');
  }

  /**
   * Initialize the sync service with provided engines
   */
  async initialize(taskEngine: TaskEngine, taskCoordinator: TaskCoordinator): Promise<void> {
    if (!this.config.enableAutoSync) {
      this.logger.info('Auto-sync disabled, skipping TodoSyncService initialization');
      return;
    }

    try {
      const memoryManager = this.config.memoryManagerProvider?.();
      
      this.syncService = new TodoSyncService(
        taskEngine,
        taskCoordinator,
        memoryManager,
        this.config.syncConfiguration
      );

      // Set up error handling
      this.syncService.on('sync:error', (error) => {
        this.logger.error('Todo-Task sync error', error);
      });

      // Set up success event logging
      this.syncService.on('todo:auto-created', (data) => {
        this.logger.info('Auto-created todo from task', { 
          todoId: data.todo.id, 
          taskId: data.task.id 
        });
      });

      this.syncService.on('task:auto-created', (data) => {
        this.logger.info('Auto-created task from todo', { 
          taskId: data.task.id, 
          todoId: data.todo.id 
        });
      });

      this.syncService.on('todo:sync-updated', (data) => {
        this.logger.debug('Todo updated via sync', { 
          todoId: data.todoId,
          triggeredBy: data.updateEvent.triggeredBy 
        });
      });

      this.logger.info('TodoSyncService initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize TodoSyncService', { error });
      throw error;
    }
  }

  /**
   * Create a manual mapping between todo and task
   */
  async createMapping(todoId: string, taskId: string, relationship: 'one-to-one' | 'parent-child' | 'todo-breakdown' = 'one-to-one'): Promise<void> {
    if (!this.syncService) {
      throw new Error('TodoSyncService not initialized. Call initialize() first.');
    }

    await this.syncService.createMapping(todoId, taskId, relationship);
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    if (!this.syncService) {
      return {
        enabled: false,
        totalMappings: 0,
        queuedUpdates: 0,
        processingQueue: false,
        configuration: this.config.syncConfiguration
      };
    }

    return {
      enabled: true,
      ...this.syncService.getSyncStats()
    };
  }

  /**
   * Get mappings for a todo or task
   */
  getMappings(id: string, type: 'task' | 'todo' = 'task') {
    if (!this.syncService) {
      return [];
    }

    return this.syncService.getMappings(id, type);
  }

  /**
   * Shutdown the sync service
   */
  async shutdown(): Promise<void> {
    if (this.syncService) {
      await this.syncService.shutdown();
      this.syncService = undefined;
      this.logger.info('TodoSyncService shutdown complete');
    }
  }

  /**
   * Check if sync service is initialized
   */
  isInitialized(): boolean {
    return !!this.syncService;
  }

  /**
   * Update sync configuration
   */
  updateConfiguration(newConfig: Partial<SyncConfiguration>): void {
    this.config.syncConfiguration = {
      ...this.config.syncConfiguration,
      ...newConfig
    };

    if (this.syncService) {
      this.logger.warn('Configuration updated, but sync service is already initialized. Restart required for changes to take effect.');
    }
  }
}

/**
 * Factory function to create and initialize TodoSyncIntegration
 */
export async function createTodoSyncIntegration(
  taskEngine: TaskEngine,
  taskCoordinator: TaskCoordinator,
  config: Partial<TodoSyncIntegrationConfig> = {}
): Promise<TodoSyncIntegration> {
  const integration = new TodoSyncIntegration(config);
  await integration.initialize(taskEngine, taskCoordinator);
  return integration;
}

/**
 * Helper function to add todo-task sync to existing systems
 */
export async function enableTodoTaskSync(
  taskEngine: TaskEngine,
  taskCoordinator: TaskCoordinator,
  memoryManager?: any,
  options: Partial<SyncConfiguration> = {}
): Promise<TodoSyncIntegration> {
  return createTodoSyncIntegration(taskEngine, taskCoordinator, {
    enableAutoSync: true,
    syncConfiguration: options,
    memoryManagerProvider: memoryManager ? () => memoryManager : undefined
  });
} 