/**
 * System Monitor for Claude Flow CLI
 * Monitors system health and process status
 */

import { EventEmitter } from 'node:events';
import { ProcessManager, ProcessStatus } from './process-manager.ts';

export interface MonitoringConfig {
  interval: number;
  alertThresholds: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  processes: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
  alerts: string[];
}

export class SystemMonitor extends EventEmitter {
  private processManager: ProcessManager;
  private config: MonitoringConfig;
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(processManager: ProcessManager, config?: Partial<MonitoringConfig>) {
    super();
    this.processManager = processManager;
    this.config = {
      interval: 5000, // 5 seconds
      alertThresholds: {
        memoryUsage: 80, // 80%
        cpuUsage: 80,    // 80%
        diskUsage: 90    // 90%
      },
      ...config
    };

    this.setupProcessManagerListeners();
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval) as unknown as NodeJS.Timeout;

    this.emit('started');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval as unknown as number);
      this.interval = null;
    }

    this.emit('stopped');
  }

  getSystemHealth(): SystemHealth {
    const stats = this.processManager.getSystemStats();
    const memoryUsage = process.memoryUsage();
    const alerts: string[] = [];

    // Calculate memory percentage (simplified)
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Check thresholds
    if (memoryPercentage > this.config.alertThresholds.memoryUsage) {
      alerts.push(`High memory usage: ${memoryPercentage.toFixed(1)}%`);
    }

    if (stats.errorProcesses > 0) {
      alerts.push(`${stats.errorProcesses} processes in error state`);
    }

    // Determine overall health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (alerts.length > 0) {
      overall = stats.errorProcesses > 0 ? 'critical' : 'warning';
    }

    return {
      overall,
      processes: stats.runningProcesses,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: memoryPercentage
      },
      cpu: {
        usage: 0 // Simplified for now
      },
      uptime: stats.uptime,
      alerts
    };
  }

  private performHealthCheck(): void {
    const health = this.getSystemHealth();
    this.emit('healthCheck', health);

    if (health.overall === 'critical') {
      this.emit('criticalAlert', health);
    } else if (health.overall === 'warning') {
      this.emit('warning', health);
    }
  }

  private setupProcessManagerListeners(): void {
    this.processManager.on('processStarted', (data) => {
      this.emit('processEvent', { type: 'started', ...data });
    });

    this.processManager.on('processStopped', (data) => {
      this.emit('processEvent', { type: 'stopped', ...data });
    });

    this.processManager.on('processError', (data) => {
      this.emit('processEvent', { type: 'error', ...data });
    });

    this.processManager.on('statusChanged', (data) => {
      this.emit('statusChanged', data);
    });
  }
} 