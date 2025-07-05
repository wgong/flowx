/**
 * Process Manager for Claude Flow CLI
 * Manages system processes and their lifecycle
 */

import { EventEmitter } from 'node:events';

export enum ProcessStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error'
}

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
  private initialized = false;
  private startTime = Date.now();

  constructor() {
    super();
  }

  async initialize(configPath?: string): Promise<void> {
    if (this.initialized) return;

    // Initialize default processes
    const defaultProcesses: ProcessConfig[] = [
      {
        id: 'orchestrator',
        name: 'Claude Flow Orchestrator',
        autoRestart: true,
        maxRestarts: 3
      },
      {
        id: 'mcp-server',
        name: 'MCP Server',
        port: 3000,
        transport: 'stdio',
        autoRestart: true,
        maxRestarts: 5
      },
      {
        id: 'event-bus',
        name: 'Event Bus',
        autoRestart: true,
        maxRestarts: 3
      },
      {
        id: 'memory-manager',
        name: 'Memory Manager',
        autoRestart: true,
        maxRestarts: 3
      }
    ];

    // Load config if provided
    if (configPath) {
      try {
        const { readFile } = await import('node:fs/promises');
        const configData = await readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        if (config.processes) {
          defaultProcesses.push(...config.processes);
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
    }

    this.initialized = true;
    this.emit('initialized');
  }

  async startProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process not found: ${processId}`);
    }

    if (process.status === ProcessStatus.RUNNING) {
      return; // Already running
    }

    process.status = ProcessStatus.STARTING;
    process.startTime = Date.now();
    this.emit('processStarting', { processId, process });

    // Simulate process startup
    await new Promise(resolve => setTimeout(resolve, 100));

    process.status = ProcessStatus.RUNNING;
    process.pid = Math.floor(Math.random() * 65535) + 1000;
    
    this.emit('processStarted', { processId, process });
    this.emit('statusChanged', { processId, status: process.status });
  }

  async stopProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process not found: ${processId}`);
    }

    if (process.status === ProcessStatus.STOPPED) {
      return; // Already stopped
    }

    process.status = ProcessStatus.STOPPING;
    this.emit('processStopping', { processId, process });

    // Simulate process shutdown
    await new Promise(resolve => setTimeout(resolve, 50));

    process.status = ProcessStatus.STOPPED;
    process.pid = undefined;
    
    this.emit('processStopped', { processId, process });
    this.emit('statusChanged', { processId, status: process.status });
  }

  async restartProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process not found: ${processId}`);
    }

    // Stop the process if it's running
    if (process.status === ProcessStatus.RUNNING) {
      await this.stopProcess(processId);
    }

    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Increment restart count
    process.restartCount = (process.restartCount || 0) + 1;

    // Start the process again
    await this.startProcess(processId);
    
    this.emit('processRestarted', { processId, process });
  }

  async stopAll(): Promise<void> {
    const runningProcesses = Array.from(this.processes.values())
      .filter(p => p.status === ProcessStatus.RUNNING);

    await Promise.all(
      runningProcesses.map(p => this.stopProcess(p.id))
    );
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

    return {
      totalProcesses: processes.length,
      runningProcesses: runningCount,
      stoppedProcesses: stoppedCount,
      errorProcesses: errorCount,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user
    };
  }

  isHealthy(): boolean {
    const stats = this.getSystemStats();
    return stats.errorProcesses === 0 && stats.runningProcesses > 0;
  }
} 