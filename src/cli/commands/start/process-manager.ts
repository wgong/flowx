/**
 * Process Manager for Claude Flow CLI
 * Manages system processes and their lifecycle
 */

import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import { dirname, join } from 'node:path';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export const ProcessStatus = {
  STOPPED: 'stopped',
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPING: 'stopping',
  ERROR: 'error'
} as const;

export type ProcessStatus = typeof ProcessStatus[keyof typeof ProcessStatus];

export interface ProcessConfig {
  id: string;
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  port?: string | number;
  transport?: string;
  autoRestart?: boolean;
  maxRestarts?: number;
}

/**
 * Custom error types for better error handling and debugging
 */
export class ProcessError extends Error {
  constructor(message: string, public processId?: string, public code?: string) {
    super(message);
    this.name = 'ProcessError';
  }
}

export class ProcessNotFoundError extends ProcessError {
  constructor(processId: string) {
    super(`Process not found: ${processId}`, processId, 'PROCESS_NOT_FOUND');
    this.name = 'ProcessNotFoundError';
  }
}

export class ProcessConfigError extends ProcessError {
  constructor(processId: string, message: string) {
    super(`Configuration error for process ${processId}: ${message}`, processId, 'PROCESS_CONFIG_ERROR');
    this.name = 'ProcessConfigError';
  }
}

export class ProcessStartError extends ProcessError {
  constructor(processId: string, message: string, public originalError?: Error) {
    super(`Failed to start process ${processId}: ${message}`, processId, 'PROCESS_START_ERROR');
    this.name = 'ProcessStartError';
    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

export class ProcessStopError extends ProcessError {
  constructor(processId: string, message: string, public originalError?: Error) {
    super(`Failed to stop process ${processId}: ${message}`, processId, 'PROCESS_STOP_ERROR');
    this.name = 'ProcessStopError';
    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

export interface ProcessInfo extends ProcessConfig {
  status: ProcessStatus;
  pid?: number | undefined;
  startTime?: number;
  restartCount?: number;
  lastError?: string;
}

export interface SystemStats {
  totalProcesses: number;
  runningProcesses: number;
  stoppedProcesses: number;
  errorProcesses: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ProcessInfo>();
  private processHandles = new Map<string, ChildProcess>();
  private initialized = false;
  private startTime = Date.now();
  private processLogs = new Map<string, string[]>();
  private maxLogLines = 1000;
  private healthCheckInterval?: NodeJS.Timeout;
  private monitorInterval?: NodeJS.Timeout;
  private configPath?: string;

  constructor() {
    super();
  }

  async initialize(configPath?: string): Promise<void> {
    if (this.initialized) return;
    
    this.configPath = configPath;
    
    // Initialize default processes
    const defaultProcesses: ProcessConfig[] = [
      {
        id: 'orchestrator',
        name: 'Claude Flow Orchestrator',
        command: process.execPath,
        args: [join(process.cwd(), 'dist/core/orchestrator.js')],
        env: { NODE_ENV: process.env.NODE_ENV || 'production' },
        autoRestart: true,
        maxRestarts: 3
      },
      {
        id: 'mcp-server',
        name: 'MCP Server',
        command: process.execPath,
        args: [join(process.cwd(), 'dist/mcp/server.js')],
        port: 3000,
        transport: 'stdio',
        env: { NODE_ENV: process.env.NODE_ENV || 'production', PORT: '3000' },
        autoRestart: true,
        maxRestarts: 5
      },
      {
        id: 'event-bus',
        name: 'Event Bus',
        command: process.execPath,
        args: [join(process.cwd(), 'dist/core/event-bus.js')],
        env: { NODE_ENV: process.env.NODE_ENV || 'production' },
        autoRestart: true,
        maxRestarts: 3
      },
      {
        id: 'memory-manager',
        name: 'Memory Manager',
        command: process.execPath,
        args: [join(process.cwd(), 'dist/memory/manager.js')],
        env: { NODE_ENV: process.env.NODE_ENV || 'production' },
        autoRestart: true,
        maxRestarts: 3
      }
    ];

    // Load config if provided
    if (configPath) {
      try {
        const configData = await readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        if (config.processes) {
          // Merge with default processes - override defaults with configured values
          for (const configuredProcess of config.processes) {
            const existingIndex = defaultProcesses.findIndex(p => p.id === configuredProcess.id);
            if (existingIndex >= 0) {
              defaultProcesses[existingIndex] = { ...defaultProcesses[existingIndex], ...configuredProcess };
            } else {
              defaultProcesses.push(configuredProcess);
            }
          }
        }
      } catch (error) {
        console.warn(`Could not load config from ${configPath}:`, error);
      }
    }

    // Initialize processes
    for (const processConfig of defaultProcesses) {
      this.processes.set(processConfig.id, {
        ...processConfig,
        status: ProcessStatus.STOPPED,
        restartCount: 0
      });
      // Initialize empty log storage
      this.processLogs.set(processConfig.id, []);
    }
    
    // Create logs directory if it doesn't exist
    try {
      const logsDir = join(process.cwd(), 'logs');
      await mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create logs directory:', error);
    }

    // Start health check and monitoring
    if (process.env.NODE_ENV !== 'test') {
      this.startHealthCheck();
      this.startMonitoring();
    }

    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Validates a process configuration before starting
   * @throws ProcessConfigError if configuration is invalid
   */
  private validateProcessConfig(processId: string, config: ProcessConfig): void {
    if (!config.id || config.id.trim() === '') {
      throw new ProcessConfigError(processId, 'Process ID is required');
    }
    
    if (!config.name || config.name.trim() === '') {
      throw new ProcessConfigError(processId, 'Process name is required');
    }
    
    if (!config.command) {
      throw new ProcessConfigError(processId, 'Command is required to start the process');
    }
    
    // Validate args if present
    if (config.args && !Array.isArray(config.args)) {
      throw new ProcessConfigError(processId, 'Args must be an array');
    }
    
    // Validate env if present
    if (config.env && typeof config.env !== 'object') {
      throw new ProcessConfigError(processId, 'Environment must be an object');
    }
    
    // Validate port if present
    if (config.port !== undefined) {
      const port = Number(config.port);
      if (isNaN(port) || port < 0 || port > 65535) {
        throw new ProcessConfigError(processId, 'Port must be a valid number between 0 and 65535');
      }
    }
    
    // Validate autoRestart and maxRestarts if present
    if (config.autoRestart && config.maxRestarts !== undefined) {
      if (typeof config.maxRestarts !== 'number' || config.maxRestarts < 0) {
        throw new ProcessConfigError(processId, 'maxRestarts must be a non-negative number');
      }
    }
  }
  
  async startProcess(processId: string): Promise<void> {
    // Get process info
    const process = this.processes.get(processId);
    if (!process) {
      throw new ProcessNotFoundError(processId);
    }

    // Check if already running
    if (process.status === ProcessStatus.RUNNING) {
      return; // Already running
    }
    
    try {
      // Validate process configuration
      this.validateProcessConfig(processId, process);
      
      // Mark as starting
      process.status = ProcessStatus.STARTING;
      process.startTime = Date.now();
      this.emit('processStarting', { processId, process });
      
      // Create process environment
      const env: Record<string, string> = {
        ...process.env,
        CLAUDE_FLOW_PROCESS_ID: process.id,
        CLAUDE_FLOW_PROCESS_NAME: process.name,
      };
      
      if (process.port) {
        env.PORT = String(process.port);
      }
      
      // Log the start attempt
      this.logToProcess(processId, `Starting process ${process.name} (${process.command} ${process.args?.join(' ') || ''})...`);
      
      // Spawn the actual process
      const childProcess = spawn(process.command!, process.args || [], {
        env: { ...process.env, ...env },
        cwd: process.cwd || global.process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });
      
      // Store the process handle
      this.processHandles.set(processId, childProcess);
      
      // Set up stdout and stderr handlers
      this.setupProcessLogging(processId, childProcess);
      
      // Set up exit handler
      childProcess.on('exit', (code, signal) => {
        this.handleProcessExit(processId, code, signal);
      });
      
      // Set up error handler
      childProcess.on('error', (err) => {
        this.handleProcessError(processId, err);
      });
      
      // Wait a short time to make sure the process starts correctly
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if process is still alive
      if (childProcess.killed || childProcess.exitCode !== null) {
        throw new ProcessStartError(processId, `Process failed to start or exited immediately`);
      }
      
      // Update process info
      process.status = ProcessStatus.RUNNING;
      process.pid = childProcess.pid;
      
      this.emit('processStarted', { processId, process });
      this.emit('statusChanged', { processId, status: process.status });
      
      // Log the startup in the process logs
      this.logToProcess(processId, `Process started with PID ${childProcess.pid} at ${new Date().toISOString()}`);
      
    } catch (error) {
      // Update process status on failure
      process.status = ProcessStatus.ERROR;
      process.lastError = error instanceof Error ? error.message : String(error);
      
      // Clean up any partial process handle
      if (this.processHandles.has(processId)) {
        try {
          const handle = this.processHandles.get(processId);
          if (handle && !handle.killed) {
            handle.kill('SIGKILL');
          }
        } catch (cleanupError) {
          this.logToProcess(processId, `Warning: Error during cleanup: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
        this.processHandles.delete(processId);
      }
      
      // Emit events
      this.emit('processError', { processId, error: process.lastError });
      this.emit('statusChanged', { processId, status: process.status });
      
      // Wrap in ProcessStartError if it's not already a ProcessError
      if (!(error instanceof ProcessError)) {
        throw new ProcessStartError(processId, `Failed to start process: ${process.lastError}`, 
          error instanceof Error ? error : undefined);
      }
      throw error;
    }
  }

  async stopProcess(processId: string): Promise<void> {
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new ProcessNotFoundError(processId);
    }

    if (processInfo.status === ProcessStatus.STOPPED) {
      return; // Already stopped
    }

    // Get the child process handle
    const childProcess = this.processHandles.get(processId);
    if (!childProcess) {
      // No process handle found, just update the status
      this.logToProcess(processId, `No active process handle found for ${processId}, marking as stopped`);
      processInfo.status = ProcessStatus.STOPPED;
      processInfo.pid = undefined;
      this.emit('processStopped', { processId, process: processInfo });
      this.emit('statusChanged', { processId, status: processInfo.status });
      return;
    }

    processInfo.status = ProcessStatus.STOPPING;
    this.emit('processStopping', { processId, process: processInfo });
    
    try {
      // Log the shutdown attempt
      this.logToProcess(processId, `Stopping process with PID ${childProcess.pid} at ${new Date().toISOString()}`);
      
      // First try SIGTERM for graceful shutdown
      childProcess.kill('SIGTERM');
      
      // Wait for the process to exit gracefully
      const exited = await this.waitForProcessExit(childProcess, 3000);
      
      // If it didn't exit, force kill with SIGKILL
      if (!exited) {
        this.logToProcess(processId, `Process didn't exit gracefully, sending SIGKILL`);
        childProcess.kill('SIGKILL');
        await this.waitForProcessExit(childProcess, 2000);
      }
      
      // Remove the process handle
      this.processHandles.delete(processId);
      
      // Update process info
      processInfo.status = ProcessStatus.STOPPED;
      processInfo.pid = undefined;
      
      this.emit('processStopped', { processId, process: processInfo });
      this.emit('statusChanged', { processId, status: processInfo.status });
      
    } catch (error) {
      // If there was an error stopping the process
      processInfo.status = ProcessStatus.ERROR;
      processInfo.lastError = error instanceof Error ? error.message : String(error);
      this.emit('processError', { processId, error: processInfo.lastError });
      this.emit('statusChanged', { processId, status: processInfo.status });
      
      throw new ProcessStopError(processId, `Failed to stop process: ${processInfo.lastError}`, error instanceof Error ? error : undefined);
    }
  }

  async restartProcess(processId: string): Promise<void> {
    // Get process info
    const processInfo = this.processes.get(processId);
    if (!processInfo) {
      throw new ProcessNotFoundError(processId);
    }

    try {
      // Stop the process if it's running or in error state
      if (processInfo.status === ProcessStatus.RUNNING || processInfo.status === ProcessStatus.ERROR) {
        this.logToProcess(processId, `Restarting: stopping process first...`);
        await this.stopProcess(processId);
      }

      // Wait a moment before restarting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Increment restart count
      processInfo.restartCount = (processInfo.restartCount || 0) + 1;

      // Log the restart attempt
      this.logToProcess(processId, `Restarting process (attempt ${processInfo.restartCount})...`);

      // Start the process again
      await this.startProcess(processId);
      
      this.emit('processRestarted', { processId, process: processInfo });
    } catch (error) {
      // Update process status on failure
      processInfo.status = ProcessStatus.ERROR;
      processInfo.lastError = error instanceof Error ? error.message : String(error);
      
      // Emit error event
      this.emit('processError', { processId, error: processInfo.lastError });
      this.emit('statusChanged', { processId, status: processInfo.status });
      
      throw new ProcessError(`Failed to restart process ${processId}: ${processInfo.lastError}`, 
        processId, 'PROCESS_RESTART_ERROR');
    }
  }

  async stopAll(): Promise<void> {
    const runningProcesses = Array.from(this.processes.values())
      .filter(p => p.status === ProcessStatus.RUNNING);

    // Create a list to track errors
    const errors: ProcessError[] = [];

    // Try to stop each process
    await Promise.allSettled(
      runningProcesses.map(async p => {
        try {
          await this.stopProcess(p.id);
        } catch (error) {
          // Add to errors list but don't fail immediately
          if (error instanceof ProcessError) {
            errors.push(error);
          } else {
            errors.push(new ProcessStopError(
              p.id, 
              `Failed to stop process: ${error instanceof Error ? error.message : String(error)}`,
              error instanceof Error ? error : undefined
            ));
          }
        }
      })
    );

    // If any errors occurred, throw a combined error
    if (errors.length > 0) {
      const errorMessage = errors.map(e => e.message).join('; ');
      throw new ProcessError(
        `Failed to stop all processes: ${errorMessage}`, 
        undefined, 
        'STOP_ALL_ERROR'
      );
    }
  }

  getProcess(processId: string): ProcessInfo | undefined {
    return this.processes.get(processId);
  }

  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  getSystemStats(): SystemStats {
    const processes = Array.from(this.processes.values());
    const runningCount = processes.filter(p => p.status === ProcessStatus.RUNNING).length;
    const stoppedCount = processes.filter(p => p.status === ProcessStatus.STOPPED).length;
    const errorCount = processes.filter(p => p.status === ProcessStatus.ERROR).length;
    
    // Calculate total memory and CPU usage by summing up actual process stats
    let totalMemoryUsage = process.memoryUsage().heapUsed;
    let totalCpuUsage = process.cpuUsage().user;
    
    // Add actual process resource usage when available (future expansion)

    return {
      totalProcesses: processes.length,
      runningProcesses: runningCount,
      stoppedProcesses: stoppedCount,
      errorProcesses: errorCount,
      uptime: Date.now() - this.startTime,
      memoryUsage: totalMemoryUsage,
      cpuUsage: totalCpuUsage
    };
  }

  isHealthy(): boolean {
    const stats = this.getSystemStats();
    return stats.errorProcesses === 0 && stats.runningProcesses > 0;
  }
  
  /**
   * Get the logs for a specific process
   */
  getProcessLogs(processId: string, limit: number = 100): string[] {
    const logs = this.processLogs.get(processId) || [];
    return logs.slice(-limit);
  }
  
  /**
   * Add a log entry to a process's logs
   */
  private logToProcess(processId: string, message: string): void {
    const logs = this.processLogs.get(processId);
    if (logs) {
      logs.push(`[${new Date().toISOString()}] ${message}`);
      
      // Trim logs if they exceed the maximum size
      if (logs.length > this.maxLogLines) {
        this.processLogs.set(processId, logs.slice(-this.maxLogLines));
      }
    }
    
    // Emit log event
    this.emit('processLog', { processId, message });
  }
  
  /**
   * Set up process output logging
   */
  private setupProcessLogging(processId: string, childProcess: ChildProcess): void {
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            this.logToProcess(processId, `[stdout] ${line}`);
          }
        });
      });
    }
    
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            this.logToProcess(processId, `[stderr] ${line}`);
          }
        });
      });
    }
  }
  
  /**
   * Handle process exit events
   */
  private handleProcessExit(processId: string, code: number | null, signal: NodeJS.Signals | null): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;
    
    // Log the exit
    this.logToProcess(processId, `Process exited with code ${code !== null ? code : 'null'} and signal ${signal || 'none'}`);
    
    // Clean up the process handle
    this.processHandles.delete(processId);
    
    // Update process status
    if (processInfo.status !== ProcessStatus.STOPPING) {
      if (code === 0) {
        processInfo.status = ProcessStatus.STOPPED;
        this.emit('processStopped', { processId, process: processInfo });
      } else {
        // Create error object for unexpected exit
        const exitError = new ProcessError(
          `Process exited unexpectedly with code ${code} and signal ${signal}`,
          processId,
          'PROCESS_EXIT_ERROR'
        );
        
        // Update process status
        processInfo.status = ProcessStatus.ERROR;
        processInfo.lastError = exitError.message;  
        this.emit('processError', { processId, error: processInfo.lastError });
      }
      
      this.emit('statusChanged', { processId, status: processInfo.status });
      
      // Handle auto-restart if configured
      if (processInfo.autoRestart && (processInfo.restartCount || 0) < (processInfo.maxRestarts || 3)) {
        this.logToProcess(processId, `Auto-restarting process (attempt ${(processInfo.restartCount || 0) + 1} of ${processInfo.maxRestarts || 3})`);
        
        // Increment restart count
        processInfo.restartCount = (processInfo.restartCount || 0) + 1;
        
        // Schedule restart with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, processInfo.restartCount - 1), 30000);
        setTimeout(() => {
          this.startProcess(processId).catch(err => {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.logToProcess(processId, `Failed to restart process: ${errorMsg}`);
          });
        }, delay);
      }
    }
  }
  
  /**
   * Handle process error events
   */
  private handleProcessError(processId: string, error: Error): void {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;
    
    // Create process error
    const processError = new ProcessError(
      `Process error: ${error.message}`,
      processId,
      'PROCESS_ERROR'
    );
    
    // Log the error
    this.logToProcess(processId, processError.message);
    
    // Update process status
    processInfo.status = ProcessStatus.ERROR;
    processInfo.lastError = processError.message;
    
    this.emit('processError', { processId, error: processInfo.lastError });
    this.emit('statusChanged', { processId, status: processInfo.status });
  }
  
  /**
   * Wait for a process to exit with a timeout
   */
  private waitForProcessExit(childProcess: ChildProcess, timeout: number): Promise<boolean> {
    return new Promise(resolve => {
      // If process is already exited
      if (childProcess.exitCode !== null || childProcess.killed) {
        return resolve(true);
      }
      
      // Set up exit listener
      const exitHandler = () => {
        clearTimeout(timeoutHandler);
        resolve(true);
      };
      
      // Set up timeout handler
      const timeoutHandler = setTimeout(() => {
        childProcess.removeListener('exit', exitHandler);
        resolve(false);
      }, timeout);
      
      // Listen for exit event
      childProcess.once('exit', exitHandler);
    });
  }
  
  /**
   * Start regular health checks
   */
  private startHealthCheck(): void {
    // Clear any existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Start a new health check interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Start system monitoring
   */
  private startMonitoring(): void {
    // Clear any existing interval
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    // Start a new monitoring interval
    this.monitorInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Collect metrics every 60 seconds
  }
  
  /**
   * Perform health check of all processes
   */
  private async performHealthCheck(): Promise<void> {
    // Check if processes that should be running are actually running
    for (const [processId, processInfo] of this.processes.entries()) {
      // Skip processes that are already known to be stopped or in error state
      if (processInfo.status === ProcessStatus.STOPPED || 
          processInfo.status === ProcessStatus.STOPPING || 
          processInfo.status === ProcessStatus.ERROR) {
        continue;
      }
      
      // Check if process handle exists and is running
      const processHandle = this.processHandles.get(processId);
      
      if (!processHandle || processHandle.killed || processHandle.exitCode !== null) {
        // Create a health check error
        const healthError = new ProcessError(
          `Process appears to be dead, but status is ${processInfo.status}`,
          processId,
          'PROCESS_HEALTH_ERROR'
        );
        
        // Log the health check failure
        this.logToProcess(processId, `Health check: ${healthError.message}`);
        
        // Clean up the dead process handle
        if (processHandle) {
          this.processHandles.delete(processId);
        }
        
        // Update status
        processInfo.status = ProcessStatus.ERROR;
        processInfo.lastError = healthError.message;
        
        this.emit('processError', { processId, error: processInfo.lastError });
        this.emit('statusChanged', { processId, status: processInfo.status });
        
        // Handle auto-restart if configured
        if (processInfo.autoRestart && (processInfo.restartCount || 0) < (processInfo.maxRestarts || 3)) {
          this.logToProcess(processId, `Health check: Auto-restarting dead process`);
          
          // Increment restart count
          processInfo.restartCount = (processInfo.restartCount || 0) + 1;
          
          // Restart the process with error handling
          try {
            await this.startProcess(processId);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logToProcess(processId, `Health check: Failed to restart process: ${errorMsg}`);
            
            // If this wasn't already a ProcessError, wrap it
            if (!(error instanceof ProcessError)) {
              const restartError = new ProcessStartError(
                processId,
                `Health check restart failed: ${errorMsg}`,
                error instanceof Error ? error : undefined
              );
              
              // Log the specific error
              this.logToProcess(processId, `Health check: ${restartError.message}`);
            }
          }
        }
      }
    }
    
    // Emit overall system health event
    const isHealthy = this.isHealthy();
    this.emit('healthStatus', { healthy: isHealthy, stats: this.getSystemStats() });
  }
  
  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const stats = this.getSystemStats();
    this.emit('metricsCollected', { timestamp: Date.now(), metrics: stats });
  }
  
  /**
   * Shut down the process manager
   */
  async shutdown(): Promise<void> {
    // Stop all processes
    await this.stopAll();
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    
    // Emit shutdown event
    this.emit('shutdown');
  }
} 