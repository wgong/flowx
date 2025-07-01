/**
 * System Monitor - Real-time monitoring of system processes
 */

import { Logger } from '../../utils/logger.js';
import { ProcessUI } from './process-ui.js';
import { ProcessManager } from "./process-manager.js";
import { SystemEvents } from "../../../utils/types.js";
import { eventBus } from "../../../core/event-bus.js";

// Simple color utilities (replacing @cliffy/ansi/colors)
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

// Color combination helpers
const colorCombos = {
  cyanBold: (text: string) => colors.bold(colors.cyan(text)),
  whiteBold: (text: string) => colors.bold(colors.white(text)),
};

export class SystemMonitor {
  private processManager: ProcessManager;
  private events: any[] = [];
  private maxEvents = 100;
  private metricsInterval?: NodeJS.Timeout;

  constructor(processManager: ProcessManager) {
    this.processManager = processManager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // System events
    eventBus.on(SystemEvents.AGENT_SPAWNED, (data: any) => {
      this.addEvent({
        type: 'agent_spawned',
        timestamp: Date.now(),
        data,
        level: 'info'
      });
    });

    eventBus.on(SystemEvents.AGENT_TERMINATED, (data: any) => {
      this.addEvent({
        type: 'agent_terminated',
        timestamp: Date.now(),
        data,
        level: 'warning'
      });
    });

    eventBus.on(SystemEvents.TASK_ASSIGNED, (data: any) => {
      this.addEvent({
        type: 'task_assigned',
        timestamp: Date.now(),
        data,
        level: 'info'
      });
    });

    eventBus.on(SystemEvents.TASK_COMPLETED, (data: any) => {
      this.addEvent({
        type: 'task_completed',
        timestamp: Date.now(),
        data,
        level: 'success'
      });
    });

    eventBus.on(SystemEvents.TASK_FAILED, (data: any) => {
      this.addEvent({
        type: 'task_failed',
        timestamp: Date.now(),
        data,
        level: 'error'
      });
    });

    eventBus.on(SystemEvents.SYSTEM_ERROR, (data: any) => {
      this.addEvent({
        type: 'system_error',
        timestamp: Date.now(),
        data,
        level: 'error'
      });
    });

    // Process manager events
    this.processManager.on('processStarted', ({ processId, process }) => {
      this.addEvent({
        type: 'process_started',
        timestamp: Date.now(),
        data: { processId, processName: process.name },
        level: 'success'
      });
    });

    this.processManager.on('processStopped', ({ processId }) => {
      this.addEvent({
        type: 'process_stopped',
        timestamp: Date.now(),
        data: { processId },
        level: 'warning'
      });
    });

    this.processManager.on('processError', ({ processId, error }) => {
      this.addEvent({
        type: 'process_error',
        timestamp: Date.now(),
        data: { processId, error: error.message },
        level: 'error'
      });
    });
  }

  private addEvent(event: any): void {
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
  }

  start(): void {
    // Start collecting metrics
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);
  }

  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  private collectMetrics(): void {
    // Collect system metrics
    const processes = this.processManager.getAllProcesses();
    
    for (const process of processes) {
      if (process.status === 'running') {
        // Simulate metrics collection (would integrate with actual monitoring)
        process.metrics = {
          ...process.metrics,
          cpu: Math.random() * 50,
          memory: Math.random() * 200,
          uptime: process.startTime ? Date.now() - process.startTime : 0
        };
      }
    }
  }

  getRecentEvents(count: number = 10): any[] {
    return this.events.slice(0, count);
  }

  printEventLog(count: number = 20): void {
    console.log(colorCombos.cyanBold('📊 Recent System Events'));
    console.log(colors.gray('─'.repeat(80)));
    
    const events = this.getRecentEvents(count);
    
    for (const event of events) {
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      const icon = this.getEventIcon(event.type);
      const color = this.getEventColor(event.level);
      
      console.log(
        colors.gray(timestamp),
        icon,
        color(this.formatEventMessage(event))
      );
    }
  }

  private getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      agent_spawned: '🤖',
      agent_terminated: '🔚',
      task_assigned: '📌',
      task_completed: '✅',
      task_failed: '❌',
      system_error: '⚠️',
      process_started: '▶️',
      process_stopped: '⏹️',
      process_error: '🚨'
    };
    
    return icons[type] || '•';
  }

  private getEventColor(level: string): (text: string) => string {
    switch (level) {
      case 'success':
        return colors.green;
      case 'info':
        return colors.blue;
      case 'warning':
        return colors.yellow;
      case 'error':
        return colors.red;
      default:
        return colors.white;
    }
  }

  private formatEventMessage(event: any): string {
    switch (event.type) {
      case 'agent_spawned':
        return `Agent spawned: ${event.data.agentId} (${event.data.type})`;
      case 'agent_terminated':
        return `Agent terminated: ${event.data.agentId}`;
      case 'task_assigned':
        return `Task assigned: ${event.data.taskId} → ${event.data.agentId}`;
      case 'task_completed':
        return `Task completed: ${event.data.taskId} (${event.data.duration}ms)`;
      case 'task_failed':
        return `Task failed: ${event.data.taskId} - ${event.data.error}`;
      case 'system_error':
        return `System error: ${event.data.message}`;
      case 'process_started':
        return `Process started: ${event.data.processName} (${event.data.processId})`;
      case 'process_stopped':
        return `Process stopped: ${event.data.processId}`;
      case 'process_error':
        return `Process error: ${event.data.processId} - ${event.data.error}`;
      default:
        return `${event.type}: ${JSON.stringify(event.data)}`;
    }
  }

  printSystemHealth(): void {
    console.log(colorCombos.cyanBold('🏥 System Health'));
    console.log(colors.gray('─'.repeat(80)));
    
    const processes = this.processManager.getAllProcesses();
    const runningProcesses = processes.filter(p => p.status === 'running');
    const errorProcesses = processes.filter(p => p.status === 'error');
    
    console.log(`${colors.white('Total Processes:')} ${processes.length}`);
    console.log(`${colors.green('Running:')} ${runningProcesses.length}`);
    console.log(`${colors.yellow('Stopped:')} ${processes.length - runningProcesses.length - errorProcesses.length}`);
    console.log(`${colors.red('Errors:')} ${errorProcesses.length}`);
    console.log();
    
    if (runningProcesses.length > 0) {
      console.log(colors.white('Running Processes:'));
      for (const process of runningProcesses) {
        const icon = this.getProcessStatusIcon(process.status);
        const uptime = this.formatUptime(Date.now() - (process.startTime || Date.now()));
        console.log(`  ${icon} ${colors.white(process.name)} (${colors.gray(uptime)})`);
        
        if (process.metrics) {
          console.log(`    CPU: ${colors.cyan(process.metrics.cpu?.toFixed(1) || '0')}% | Memory: ${colors.cyan(process.metrics.memory?.toFixed(0) || '0')}MB`);
        }
      }
      console.log();
    }
    
    if (errorProcesses.length > 0) {
      console.log(colors.red('Processes with Errors:'));
      for (const process of errorProcesses) {
        const icon = this.getProcessStatusIcon(process.status);
        console.log(`  ${icon} ${colors.white(process.name)}`);
        if (process.metrics?.lastError) {
          console.log(`    ${colors.red('Error:')} ${process.metrics.lastError}`);
        }
      }
      console.log();
    }
    
    // Recent events summary
    const recentErrors = this.events.filter(e => e.level === 'error').slice(0, 3);
    if (recentErrors.length > 0) {
      console.log(colorCombos.whiteBold('Recent Errors:'));
      for (const error of recentErrors) {
        const time = new Date(error.timestamp).toLocaleTimeString();
        console.log(`  ${colors.red('❌')} ${colors.gray(time)} ${this.formatEventMessage(error)}`);
      }
    }
  }

  private getProcessStatusIcon(status: string): string {
    switch (status) {
      case 'running':
        return '🟢';
      case 'stopped':
        return '🔴';
      case 'error':
        return '❌';
      case 'starting':
        return '🟡';
      default:
        return '⚪';
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}