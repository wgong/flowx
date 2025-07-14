/**
 * Background executor for long-running tasks with detached processes and persistence
 * Handles task queuing, process management, and state persistence
 */

import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import { writeFile, readFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { TaskDefinition, TaskResult, TaskStatus, AgentState } from "../swarm/types.ts";
import { ILogger } from "../core/logger.ts";
import { IEventBus } from "../core/event-bus.ts";
import { generateId } from "../utils/helpers.ts";

export interface BackgroundTaskConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  retryAttempts: number;
  retryBackoffBase: number;
  persistenceDir: string;
  healthCheckInterval: number;
  processCleanupInterval: number;
  maxQueueSize: number;
  enablePersistence: boolean;
}

export interface BackgroundTaskDefinition {
  id: string;
  type: 'claude-spawn' | 'script' | 'command' | 'workflow' | 'agent-task';
  command: string;
  args: string[];
  options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    retries?: number;
    detached?: boolean;
    priority?: number;
    metadata?: Record<string, any>;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  pid?: number;
  output?: string;
  error?: string;
  result?: any;
  startTime?: Date;
  endTime?: Date;
  retryCount: number;
  queueTime?: number;
  executionTime?: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackgroundExecutorMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  queuedTasks: number;
  averageExecutionTime: number;
  successRate: number;
  throughput: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    activeProcesses: number;
  };
}

export class BackgroundExecutor extends EventEmitter {
  private tasks = new Map<string, BackgroundTaskDefinition>();
  private processes = new Map<string, ChildProcess>();
  private taskQueue: string[] = [];
  private runningTasks = new Set<string>();
  private completedTasks = new Set<string>();
  private failedTasks = new Set<string>();
  private healthCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private queueProcessTimer?: NodeJS.Timeout;
  private isShuttingDown = false;

  get shuttingDown(): boolean {
    return this.isShuttingDown;
  }
  private metrics: BackgroundExecutorMetrics;

  constructor(
    private config: BackgroundTaskConfig,
    private logger: ILogger,
    private eventBus: IEventBus
  ) {
    super();
    this.metrics = this.initializeMetrics();
    this.setupEventHandlers();
  }

  private initializeMetrics(): BackgroundExecutorMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      runningTasks: 0,
      queuedTasks: 0,
      averageExecutionTime: 0,
      successRate: 0,
      throughput: 0,
      resourceUsage: {
        cpu: 0,
        memory: 0,
        activeProcesses: 0
      }
    };
  }

  private setupEventHandlers(): void {
    this.eventBus.on('system:shutdown', () => this.shutdown());
    this.eventBus.on('task:cancel', (taskId: string) => this.cancelTask(taskId));
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing BackgroundExecutor');

    // Create persistence directory if enabled
    if (this.config.enablePersistence) {
      try {
        await mkdir(this.config.persistenceDir, { recursive: true });
        await this.loadPersistedTasks();
      } catch (error) {
        this.logger.error('Failed to create persistence directory', { error });
      }
    }

    // Start health check timer
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckInterval
    );

    // Start cleanup timer
    this.cleanupTimer = setInterval(
      () => this.performCleanup(),
      this.config.processCleanupInterval
    );

    // Start queue processing timer
    this.queueProcessTimer = setInterval(
      () => this.processQueue(),
      1000 // Process queue every second
    );

    this.logger.info('BackgroundExecutor initialized successfully');
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.logger.info('Shutting down BackgroundExecutor');
    this.isShuttingDown = true;

    // Clear timers first to prevent new tasks from being processed
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    if (this.queueProcessTimer) {
      clearInterval(this.queueProcessTimer);
      this.queueProcessTimer = undefined;
    }

    // Force clear any remaining timers (aggressive cleanup for tests)
    const timers = [this.healthCheckTimer, this.cleanupTimer, this.queueProcessTimer];
    timers.forEach(timer => {
      if (timer) {
        clearInterval(timer);
      }
    });

    // Cancel all running tasks
    const runningTaskIds = Array.from(this.runningTasks);
    if (runningTaskIds.length > 0) {
      this.logger.info(`Cancelling ${runningTaskIds.length} running tasks`);
      await Promise.allSettled(runningTaskIds.map(taskId => this.cancelTask(taskId)));
    }

    // Kill any remaining processes
    for (const [taskId, process] of this.processes.entries()) {
      try {
        if (!process.killed && process.exitCode === null) {
          process.kill('SIGTERM');
          // Force kill after 1 second
          setTimeout(() => {
            if (!process.killed && process.exitCode === null) {
              process.kill('SIGKILL');
            }
          }, 1000);
        }
      } catch (error) {
        this.logger.error(`Error killing process for task ${taskId}`, error);
      }
    }

    // Persist state if enabled
    if (this.config.enablePersistence) {
      try {
        await this.persistTasks();
      } catch (error) {
        this.logger.error('Failed to persist tasks during shutdown', error);
      }
    }

    // Clear all data
    this.tasks.clear();
    this.processes.clear();
    this.taskQueue.length = 0;
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();

    this.logger.info('BackgroundExecutor shutdown complete');
  }

  /**
   * Submit a background task for execution
   */
  async submitTask(taskDef: Omit<BackgroundTaskDefinition, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('BackgroundExecutor is shutting down');
    }

    if (this.taskQueue.length >= this.config.maxQueueSize) {
      throw new Error('Task queue is full');
    }

    const task: BackgroundTaskDefinition = {
      ...taskDef,
      id: generateId(),
      status: 'pending',
      retryCount: 0,
      priority: taskDef.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.addToQueue(task.id);
    this.metrics.totalTasks++;
    this.metrics.queuedTasks++;

    this.logger.info('Task submitted to background executor', { taskId: task.id, type: task.type });
    this.emit('task:submitted', task);

    if (this.config.enablePersistence) {
      await this.persistTask(task);
    }

    return task.id;
  }

  /**
   * Submit a Claude-specific background task
   */
  async submitClaudeTask(
    prompt: string,
    tools: string[] = [],
    options: Partial<{
      cwd: string;
      env: Record<string, string>;
      timeout: number;
      model: string;
      maxTokens: number;
      priority: number;
      metadata: Record<string, any>;
    }> = {}
  ): Promise<string> {
    const args = ['-p', prompt];
    
    if (tools.length > 0) {
      args.push('--allowedTools', tools.join(','));
    }

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.maxTokens) {
      args.push('--max-tokens', options.maxTokens.toString());
    }

    args.push('--dangerously-skip-permissions');

    return this.submitTask({
      type: 'claude-spawn',
      command: 'claude',
      args,
      options: {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout || this.config.taskTimeout,
        detached: true,
        priority: options.priority || 0,
        metadata: options.metadata
      },
      priority: options.priority || 0
    });
  }

  /**
   * Get task status and result
   */
  getTask(taskId: string): BackgroundTaskDefinition | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.status === 'running') {
      const process = this.processes.get(taskId);
      if (process && !process.killed) {
        process.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      }
      
      this.runningTasks.delete(taskId);
      this.metrics.runningTasks--;
    }

    // Remove from queue if pending
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
      this.metrics.queuedTasks--;
    }

    task.status = 'cancelled';
    task.endTime = new Date();
    task.updatedAt = new Date();

    this.logger.info('Task cancelled', { taskId });
    this.emit('task:cancelled', task);

    if (this.config.enablePersistence) {
      await this.persistTask(task);
    }

    return true;
  }

  /**
   * Get current metrics
   */
  getMetrics(): BackgroundExecutorMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * List all tasks with optional filtering
   */
  listTasks(filter?: {
    status?: BackgroundTaskDefinition['status'];
    type?: BackgroundTaskDefinition['type'];
    limit?: number;
    offset?: number;
  }): BackgroundTaskDefinition[] {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      tasks = tasks.filter(task => task.status === filter.status);
    }

    if (filter?.type) {
      tasks = tasks.filter(task => task.type === filter.type);
    }

    // Sort by priority (higher first) then by creation time
    tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    if (filter?.offset) {
      tasks = tasks.slice(filter.offset);
    }

    if (filter?.limit) {
      tasks = tasks.slice(0, filter.limit);
    }

    return tasks;
  }

  private addToQueue(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Insert based on priority
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTask = this.tasks.get(this.taskQueue[i]);
      if (queuedTask && task.priority > queuedTask.priority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, taskId);
  }

  private async processQueue(): Promise<void> {
    if (this.isShuttingDown || this.runningTasks.size >= this.config.maxConcurrentTasks) {
      return;
    }

    const taskId = this.taskQueue.shift();
    if (!taskId) {
      return;
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    this.metrics.queuedTasks--;
    await this.executeTask(task);
  }

  private async executeTask(task: BackgroundTaskDefinition): Promise<void> {
    task.status = 'running';
    task.startTime = new Date();
    task.updatedAt = new Date();
    task.queueTime = task.startTime.getTime() - task.createdAt.getTime();

    this.runningTasks.add(task.id);
    this.metrics.runningTasks++;

    this.logger.info('Executing background task', { taskId: task.id, type: task.type, command: task.command });
    this.emit('task:started', task);

         try {
       const childProcess = spawn(task.command, task.args, {
         cwd: task.options?.cwd,
         env: { ...process.env, ...task.options?.env },
         detached: task.options?.detached || false,
         stdio: ['ignore', 'pipe', 'pipe']
       });

       this.processes.set(task.id, childProcess);
       task.pid = childProcess.pid;

       let output = '';
       let error = '';

       childProcess.stdout?.on('data', (data: Buffer) => {
         output += data.toString();
       });

       childProcess.stderr?.on('data', (data: Buffer) => {
         error += data.toString();
       });

       // Set up timeout
       const timeout = task.options?.timeout || this.config.taskTimeout;
       const timeoutHandle = setTimeout(() => {
         if (!childProcess.killed) {
           childProcess.kill('SIGTERM');
           setTimeout(() => {
             if (!childProcess.killed) {
               childProcess.kill('SIGKILL');
             }
           }, 5000);
         }
       }, timeout);

       childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
        clearTimeout(timeoutHandle);
        this.processes.delete(task.id);
        this.runningTasks.delete(task.id);
        this.metrics.runningTasks--;

        task.endTime = new Date();
        task.updatedAt = new Date();
        task.executionTime = task.endTime.getTime() - (task.startTime?.getTime() || 0);
        task.output = output;
        task.error = error;

        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          task.status = 'timeout';
          this.logger.warn('Task timed out', { taskId: task.id, signal });
        } else if (code === 0) {
          task.status = 'completed';
          this.completedTasks.add(task.id);
          this.metrics.completedTasks++;
          this.logger.info('Task completed successfully', { taskId: task.id });
        } else {
          task.status = 'failed';
          this.failedTasks.add(task.id);
          this.metrics.failedTasks++;
          this.logger.error('Task failed', { taskId: task.id, code, error });
        }

        this.emit('task:completed', task);

        // Handle retries for failed tasks
        if (task.status === 'failed' && task.retryCount < (task.options?.retries || this.config.retryAttempts)) {
          this.scheduleRetry(task);
        }

        if (this.config.enablePersistence) {
          this.persistTask(task);
        }
      });

             childProcess.on('error', (err: Error) => {
        clearTimeout(timeoutHandle);
        this.processes.delete(task.id);
        this.runningTasks.delete(task.id);
        this.metrics.runningTasks--;

        task.status = 'failed';
        task.error = err.message;
        task.endTime = new Date();
        task.updatedAt = new Date();
        task.executionTime = task.endTime.getTime() - (task.startTime?.getTime() || 0);

        this.failedTasks.add(task.id);
        this.metrics.failedTasks++;

        this.logger.error('Task process error', { taskId: task.id, error: err.message });
        this.emit('task:error', task, err);

        // Handle retries for failed tasks
        if (task.retryCount < (task.options?.retries || this.config.retryAttempts)) {
          this.scheduleRetry(task);
        }

        if (this.config.enablePersistence) {
          this.persistTask(task);
        }
      });

    } catch (error) {
      this.runningTasks.delete(task.id);
      this.metrics.runningTasks--;

      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.endTime = new Date();
      task.updatedAt = new Date();
      task.executionTime = task.endTime.getTime() - (task.startTime?.getTime() || 0);

      this.failedTasks.add(task.id);
      this.metrics.failedTasks++;

      this.logger.error('Failed to execute task', { taskId: task.id, error });
      this.emit('task:error', task, error);

      // Handle retries for failed tasks
      if (task.retryCount < (task.options?.retries || this.config.retryAttempts)) {
        this.scheduleRetry(task);
      }

      if (this.config.enablePersistence) {
        await this.persistTask(task);
      }
    }
  }

  private scheduleRetry(task: BackgroundTaskDefinition): void {
    task.retryCount++;
    task.status = 'pending';
    task.updatedAt = new Date();

    const backoffDelay = Math.pow(this.config.retryBackoffBase, task.retryCount) * 1000;
    
    this.logger.info('Scheduling task retry', { 
      taskId: task.id, 
      retryCount: task.retryCount, 
      backoffDelay 
    });

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.addToQueue(task.id);
        this.metrics.queuedTasks++;
      }
    }, backoffDelay);
  }

  private async performHealthCheck(): Promise<void> {
    // Check for stuck processes
    const now = Date.now();
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'running' && task.startTime) {
        const runtime = now - task.startTime.getTime();
        const timeout = task.options?.timeout || this.config.taskTimeout;
        
        if (runtime > timeout * 1.5) { // 50% buffer
          this.logger.warn('Detected stuck task', { taskId, runtime, timeout });
          await this.cancelTask(taskId);
        }
      }
    }

    // Update metrics
    this.updateMetrics();
  }

  private performCleanup(): void {
    // Clean up completed tasks older than 1 hour
    const cutoffTime = Date.now() - (60 * 60 * 1000);
    
    for (const [taskId, task] of this.tasks) {
      if ((task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') &&
          task.endTime && task.endTime.getTime() < cutoffTime) {
        this.tasks.delete(taskId);
        this.completedTasks.delete(taskId);
        this.failedTasks.delete(taskId);
        this.processes.delete(taskId);
      }
    }
  }

  private updateMetrics(): void {
    this.metrics.runningTasks = this.runningTasks.size;
    this.metrics.queuedTasks = this.taskQueue.length;
    
    // Calculate success rate
    const totalCompleted = this.metrics.completedTasks + this.metrics.failedTasks;
    this.metrics.successRate = totalCompleted > 0 ? (this.metrics.completedTasks / totalCompleted) * 100 : 0;
    
    // Calculate average execution time
    const completedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'completed' && t.executionTime);
    this.metrics.averageExecutionTime = completedTasks.length > 0 
      ? completedTasks.reduce((sum, task) => sum + (task.executionTime || 0), 0) / completedTasks.length 
      : 0;
    
    // Update resource usage
    this.metrics.resourceUsage.activeProcesses = this.processes.size;
  }

  private async persistTask(task: BackgroundTaskDefinition): Promise<void> {
    if (!this.config.enablePersistence) return;

    try {
      const taskFile = join(this.config.persistenceDir, `${task.id}.json`);
      await writeFile(taskFile, JSON.stringify(task, null, 2));
    } catch (error) {
      this.logger.error('Failed to persist task', { taskId: task.id, error });
    }
  }

  private async persistTasks(): Promise<void> {
    if (!this.config.enablePersistence) return;

    try {
      const stateFile = join(this.config.persistenceDir, 'executor-state.json');
      const state = {
        tasks: Array.from(this.tasks.values()),
        taskQueue: this.taskQueue,
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      };
      await writeFile(stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      this.logger.error('Failed to persist executor state', { error });
    }
  }

  private async loadPersistedTasks(): Promise<void> {
    try {
      const stateFile = join(this.config.persistenceDir, 'executor-state.json');
      await access(stateFile);
      
      const stateData = await readFile(stateFile, 'utf8');
      const state = JSON.parse(stateData);
      
      // Restore tasks
      for (const task of state.tasks) {
        // Reset running tasks to pending on restart
        if (task.status === 'running') {
          task.status = 'pending';
          task.startTime = undefined;
          task.pid = undefined;
        }
        
        // Convert date strings back to Date objects
        task.createdAt = new Date(task.createdAt);
        task.updatedAt = new Date(task.updatedAt);
        if (task.startTime) task.startTime = new Date(task.startTime);
        if (task.endTime) task.endTime = new Date(task.endTime);
        
        this.tasks.set(task.id, task);
        
        if (task.status === 'pending') {
          this.addToQueue(task.id);
        } else if (task.status === 'completed') {
          this.completedTasks.add(task.id);
        } else if (task.status === 'failed') {
          this.failedTasks.add(task.id);
        }
      }
      
      this.logger.info('Restored persisted tasks', { taskCount: state.tasks.length });
    } catch (error) {
      this.logger.info('No persisted state found or failed to load', { error });
    }
  }
}