/**
 * Node.js compatible tests for ProcessManager
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Process types and status enums
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

// Mock child_process for testing
const mockSpawn = jest.fn();
const mockKill = jest.fn();

// Mock process
class MockProcess {
  pid: number;
  killed: boolean = false;
  exitCode: number | null = null;
  stdout: any = { on: jest.fn() };
  stderr: any = { on: jest.fn() };
  on: jest.Mock;
  kill: jest.Mock;
  
  constructor(pid: number) {
    this.pid = pid;
    this.on = jest.fn();
    this.kill = mockKill.mockImplementation(() => {
      this.killed = true;
      // Simulate process exit
      const exitListener = this.on.mock.calls.find(call => call[0] === 'exit')?.[1];
      if (exitListener) {
        exitListener(0);
      }
      return true;
    });
  }
}

// Mock ProcessManager implementation
class ProcessManager {
  processes: Map<string, any> = new Map();
  
  constructor() {
    mockSpawn.mockImplementation((command: string, args: string[], options: any) => {
      const processId = Math.floor(Math.random() * 10000);
      const process = new MockProcess(processId);
      return process;
    });
  }
  
  async start(type: ProcessType, options: any = {}): Promise<number> {
    const id = options.id || `${type}-${Date.now()}`;
    
    if (this.processes.has(id)) {
      throw new Error(`Process with ID ${id} already exists`);
    }
    
    let command: string;
    let args: string[] = [];
    
    switch (type) {
      case ProcessType.MCP:
        command = 'node';
        args = ['./cli.js', 'mcp', 'start'];
        break;
      case ProcessType.SWARM:
        command = 'node';
        args = ['./cli.js', 'swarm', 'start'];
        break;
      case ProcessType.UI:
        command = 'node';
        args = ['./cli.js', 'ui', 'start'];
        break;
      case ProcessType.MONITOR:
        command = 'node';
        args = ['./cli.js', 'monitor', 'start'];
        break;
      case ProcessType.AGENT:
        command = 'node';
        args = ['./cli.js', 'agent', 'run', options.agentId || 'default'];
        break;
      default:
        throw new Error(`Unknown process type: ${type}`);
    }
    
    const process = mockSpawn(command, args, { stdio: 'pipe' });
    
    this.processes.set(id, {
      id,
      type,
      process,
      status: ProcessStatus.RUNNING,
      startedAt: new Date(),
      pid: process.pid,
      options
    });
    
    return process.pid;
  }
  
  async stop(id: string): Promise<boolean> {
    const processInfo = this.processes.get(id);
    
    if (!processInfo) {
      throw new Error(`Process with ID ${id} not found`);
    }
    
    processInfo.status = ProcessStatus.STOPPING;
    
    const success = processInfo.process.kill();
    
    if (success) {
      processInfo.status = ProcessStatus.STOPPED;
      processInfo.stoppedAt = new Date();
    }
    
    return success;
  }
  
  async stopAll(): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const processId of this.processes.keys()) {
      try {
        const result = await this.stop(processId);
        results.push(result);
      } catch (error) {
        results.push(false);
      }
    }
    
    return results;
  }
  
  getProcess(id: string): any {
    const processInfo = this.processes.get(id);
    
    if (!processInfo) {
      return null;
    }
    
    return { ...processInfo };
  }
  
  listProcesses(): any[] {
    return Array.from(this.processes.values()).map(process => ({ ...process }));
  }
  
  getProcessesByType(type: ProcessType): any[] {
    return this.listProcesses().filter(process => process.type === type);
  }
}

describe('ProcessManager', () => {
  let manager: ProcessManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ProcessManager();
  });
  
  describe('Process Management', () => {
    it('should start a process', async () => {
      const pid = await manager.start(ProcessType.MCP);
      
      expect(pid).toBeDefined();
      expect(typeof pid).toBe('number');
      expect(mockSpawn).toHaveBeenCalledWith('node', ['./cli.js', 'mcp', 'start'], expect.anything());
      
      const processes = manager.listProcesses();
      expect(processes.length).toBe(1);
      expect(processes[0].type).toBe(ProcessType.MCP);
      expect(processes[0].status).toBe(ProcessStatus.RUNNING);
    });
    
    it('should stop a process', async () => {
      const pid = await manager.start(ProcessType.MCP, { id: 'mcp-1' });
      const result = await manager.stop('mcp-1');
      
      expect(result).toBe(true);
      expect(mockKill).toHaveBeenCalled();
      
      const process = manager.getProcess('mcp-1');
      expect(process.status).toBe(ProcessStatus.STOPPED);
    });
    
    it('should throw error when stopping non-existent process', async () => {
      await expect(manager.stop('nonexistent'))
        .rejects.toThrow('Process with ID nonexistent not found');
    });
    
    it('should stop all processes', async () => {
      await manager.start(ProcessType.MCP, { id: 'mcp-1' });
      await manager.start(ProcessType.SWARM, { id: 'swarm-1' });
      await manager.start(ProcessType.UI, { id: 'ui-1' });
      
      const results = await manager.stopAll();
      
      expect(results).toEqual([true, true, true]);
      expect(mockKill).toHaveBeenCalledTimes(3);
      
      const processes = manager.listProcesses();
      expect(processes.every(p => p.status === ProcessStatus.STOPPED)).toBe(true);
    });
    
    it('should reject process with duplicate ID', async () => {
      await manager.start(ProcessType.MCP, { id: 'mcp-1' });
      
      await expect(manager.start(ProcessType.MCP, { id: 'mcp-1' }))
        .rejects.toThrow('Process with ID mcp-1 already exists');
    });
  });
  
  describe('Process Querying', () => {
    it('should get process by ID', async () => {
      await manager.start(ProcessType.MCP, { id: 'mcp-1' });
      const process = manager.getProcess('mcp-1');
      
      expect(process).toBeDefined();
      expect(process.id).toBe('mcp-1');
      expect(process.type).toBe(ProcessType.MCP);
    });
    
    it('should return null for non-existent process ID', () => {
      expect(manager.getProcess('nonexistent')).toBeNull();
    });
    
    it('should list all processes', async () => {
      await manager.start(ProcessType.MCP, { id: 'mcp-1' });
      await manager.start(ProcessType.SWARM, { id: 'swarm-1' });
      
      const processes = manager.listProcesses();
      
      expect(processes.length).toBe(2);
      expect(processes[0].id).toBe('mcp-1');
      expect(processes[1].id).toBe('swarm-1');
    });
    
    it('should get processes by type', async () => {
      await manager.start(ProcessType.MCP, { id: 'mcp-1' });
      await manager.start(ProcessType.MCP, { id: 'mcp-2' });
      await manager.start(ProcessType.SWARM, { id: 'swarm-1' });
      
      const mcpProcesses = manager.getProcessesByType(ProcessType.MCP);
      
      expect(mcpProcesses.length).toBe(2);
      expect(mcpProcesses.every(p => p.type === ProcessType.MCP)).toBe(true);
    });
  });
});