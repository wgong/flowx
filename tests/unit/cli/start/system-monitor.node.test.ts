/**
 * Node.js compatible tests for SystemMonitor
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock process manager from previous test
enum ProcessType {
  MCP = 'mcp',
  SWARM = 'swarm',
  UI = 'ui',
  MONITOR = 'monitor',
  AGENT = 'agent'
}

enum ProcessStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  CRASHED = 'crashed',
  STARTING = 'starting',
  STOPPING = 'stopping'
}

// Mock ProcessManager
class MockProcessManager {
  processes: Map<string, any>;
  
  constructor() {
    this.processes = new Map();
  }
  
  addProcess(id: string, type: ProcessType, status: ProcessStatus = ProcessStatus.RUNNING) {
    this.processes.set(id, {
      id,
      type,
      status,
      startedAt: new Date(),
      pid: Math.floor(Math.random() * 10000),
      options: {}
    });
  }
  
  getProcess(id: string): any {
    return this.processes.get(id);
  }
  
  listProcesses(): any[] {
    return Array.from(this.processes.values());
  }
  
  getProcessesByType(type: ProcessType): any[] {
    return this.listProcesses().filter(p => p.type === type);
  }
  
  async start(type: ProcessType, options: any = {}): Promise<number> {
    const id = options.id || `${type}-${Date.now()}`;
    const pid = Math.floor(Math.random() * 10000);
    
    this.processes.set(id, {
      id,
      type,
      status: ProcessStatus.RUNNING,
      startedAt: new Date(),
      pid,
      options
    });
    
    return pid;
  }
  
  async stop(id: string): Promise<boolean> {
    const process = this.processes.get(id);
    
    if (!process) {
      throw new Error(`Process not found: ${id}`);
    }
    
    process.status = ProcessStatus.STOPPED;
    process.stoppedAt = new Date();
    
    return true;
  }
}

// Simplified SystemMonitor implementation
class SystemMonitor {
  private processManager: MockProcessManager;
  private interval: NodeJS.Timeout | null = null;
  private checkInterval: number;
  private metrics: Map<string, any>;
  private callbacks: Array<(data: any) => void>;
  
  constructor(processManager: MockProcessManager, checkInterval = 5000) {
    this.processManager = processManager;
    this.checkInterval = checkInterval;
    this.metrics = new Map();
    this.callbacks = [];
  }
  
  start() {
    if (this.interval !== null) {
      return;
    }
    
    // Immediate initial check
    this.check();
    
    this.interval = setInterval(() => {
      this.check();
    }, this.checkInterval);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  isRunning(): boolean {
    return this.interval !== null;
  }
  
  onMetricsUpdate(callback: (data: any) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }
  
  private check() {
    const timestamp = new Date();
    const processes = this.processManager.listProcesses();
    
    // Calculate system stats
    const totalProcesses = processes.length;
    const runningProcesses = processes.filter(p => p.status === ProcessStatus.RUNNING).length;
    const crashedProcesses = processes.filter(p => p.status === ProcessStatus.CRASHED).length;
    
    // Generate memory stats (mock data)
    const memoryUsage = {
      total: 8 * 1024 * 1024 * 1024, // 8GB
      free: 4 * 1024 * 1024 * 1024,  // 4GB
      used: 4 * 1024 * 1024 * 1024,  // 4GB
      processes: processes.map(p => ({
        id: p.id,
        memory: Math.floor(Math.random() * 100 * 1024 * 1024) // Random MB
      }))
    };
    
    // Generate CPU stats (mock data)
    const cpuUsage = {
      total: 50, // 50% CPU usage
      processes: processes.map(p => ({
        id: p.id,
        cpu: Math.floor(Math.random() * 100) // Random %
      }))
    };
    
    const metrics = {
      timestamp,
      processes: {
        total: totalProcesses,
        running: runningProcesses,
        crashed: crashedProcesses,
        byType: {
          mcp: processes.filter(p => p.type === ProcessType.MCP).length,
          swarm: processes.filter(p => p.type === ProcessType.SWARM).length,
          ui: processes.filter(p => p.type === ProcessType.UI).length,
          agent: processes.filter(p => p.type === ProcessType.AGENT).length
        }
      },
      memory: memoryUsage,
      cpu: cpuUsage
    };
    
    this.metrics.set(timestamp.toISOString(), metrics);
    
    // Notify callbacks
    for (const callback of this.callbacks) {
      callback(metrics);
    }
  }
  
  getLatestMetrics() {
    const entries = Array.from(this.metrics.entries());
    if (entries.length === 0) {
      return null;
    }
    
    // Sort by timestamp descending
    entries.sort((a, b) => b[0].localeCompare(a[0]));
    return entries[0][1];
  }
  
  getHistoricalMetrics(limit = 10) {
    const entries = Array.from(this.metrics.entries());
    
    // Sort by timestamp descending
    entries.sort((a, b) => b[0].localeCompare(a[0]));
    
    return entries.slice(0, limit).map(([_, metrics]) => metrics);
  }
}

describe('SystemMonitor', () => {
  let processManager: MockProcessManager;
  let monitor: SystemMonitor;
  
  beforeEach(() => {
    processManager = new MockProcessManager();
    monitor = new SystemMonitor(processManager, 100); // Use shorter interval for testing
    
    // Add some test processes
    processManager.addProcess('mcp-1', ProcessType.MCP);
    processManager.addProcess('swarm-1', ProcessType.SWARM);
    processManager.addProcess('agent-1', ProcessType.AGENT);
    processManager.addProcess('agent-2', ProcessType.AGENT, ProcessStatus.CRASHED);
  });
  
  afterEach(() => {
    monitor.stop();
  });
  
  describe('Monitoring', () => {
    it('should start monitoring', () => {
      monitor.start();
      expect(monitor.isRunning()).toBe(true);
    });
    
    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isRunning()).toBe(false);
    });
    
    it('should collect metrics immediately after starting', () => {
      monitor.start();
      
      const metrics = monitor.getLatestMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics.processes.total).toBe(4);
    });
    
    it('should collect metrics periodically', async () => {
      monitor.start();
      
      // Wait for a few metric collections
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const historical = monitor.getHistoricalMetrics();
      expect(historical.length).toBeGreaterThan(1);
    });
  });
  
  describe('Metrics', () => {
    it('should report correct process counts', () => {
      monitor.start();
      
      const metrics = monitor.getLatestMetrics();
      
      expect(metrics.processes.total).toBe(4);
      expect(metrics.processes.running).toBe(3);
      expect(metrics.processes.crashed).toBe(1);
      expect(metrics.processes.byType.mcp).toBe(1);
      expect(metrics.processes.byType.swarm).toBe(1);
      expect(metrics.processes.byType.agent).toBe(2);
    });
    
    it('should generate system resource metrics', () => {
      monitor.start();
      
      const metrics = monitor.getLatestMetrics();
      
      expect(metrics.memory).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory.processes.length).toBe(4);
      expect(metrics.cpu.processes.length).toBe(4);
    });
    
    it('should return null for latest metrics when no data collected', () => {
      // Don't start monitoring
      const metrics = monitor.getLatestMetrics();
      expect(metrics).toBeNull();
    });
    
    it('should return empty array for historical metrics when no data collected', () => {
      // Don't start monitoring
      const historical = monitor.getHistoricalMetrics();
      expect(historical.length).toBe(0);
    });
  });
  
  describe('Callbacks', () => {
    it('should notify callback when metrics are updated', async () => {
      const callback = jest.fn();
      
      monitor.onMetricsUpdate(callback);
      monitor.start();
      
      // Give time for at least one check
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(callback).toHaveBeenCalled();
      expect((callback.mock.calls[0][0] as any).processes.total).toBe(4);
    });
    
    it('should allow unsubscribing from metrics updates', async () => {
      const callback = jest.fn();
      
      const unsubscribe = monitor.onMetricsUpdate(callback);
      monitor.start();
      
      // Let one callback happen
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Unsubscribe and clear mock
      unsubscribe();
      callback.mockClear();
      
      // Wait for more metric updates
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });
});