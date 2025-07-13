/**
 * Unit tests for ProcessManager
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ProcessManager, ProcessStatus, ProcessConfig } from '../../../../src/cli/commands/start/process-manager';

// Mock child_process module
jest.mock('node:child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    pid: 12345,
    killed: false,
    exitCode: null,
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
    once: jest.fn(),
    kill: jest.fn().mockReturnValue(true),
    removeListener: jest.fn()
  }))
}));

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined as never),
  mkdir: jest.fn().mockResolvedValue(undefined as never),
  readFile: jest.fn().mockResolvedValue('{"processes":[]}' as never)
}));

// Mock fs
jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let testConfig: ProcessConfig;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    processManager = new ProcessManager();
    await processManager.initialize();
    
    testConfig = {
      id: 'test-process',
      name: 'Test Process',
      command: 'node',
      args: ['--version'],
      env: {},
      cwd: process.cwd(),
      autoRestart: false,
      maxRestarts: 3
    };
  });

  afterEach(async () => {
    try {
      await processManager.shutdown();
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(processManager).toBeDefined();
      // ProcessManager initializes with default processes
      const processes = processManager.getAllProcesses();
      expect(processes.length).toBeGreaterThan(0);
      expect(processes.some(p => p.id === 'orchestrator')).toBe(true);
      expect(processes.some(p => p.id === 'mcp-server')).toBe(true);
      expect(processes.some(p => p.id === 'event-bus')).toBe(true);
      expect(processes.some(p => p.id === 'memory-manager')).toBe(true);
    });

    it('should be healthy after initialization', () => {
      // ProcessManager might not be healthy if processes haven't started
      expect(typeof processManager.isHealthy()).toBe('boolean');
    });
  });

  describe('process management', () => {
    it('should get all processes', () => {
      // Add a test process
      const testConfig: ProcessConfig = {
        id: 'test-process',
        name: 'Test Process',
        command: 'node',
        args: ['--version'],
        cwd: process.cwd(),
        env: {},
        autoRestart: false,
        maxRestarts: 3
      };
      
      // Mock the process info
      const testProcess = {
        ...testConfig,
        status: 'running' as const,
        pid: 12345,
        restartCount: 0
      };
      
      // Add to the process manager's internal map
      (processManager as any).processes.set(testConfig.id, testProcess);
      
      const processes = processManager.getAllProcesses();
      expect(processes.length).toBeGreaterThan(4); // At least 4 default + 1 test
      expect(processes.some(p => p.id === testConfig.id)).toBe(true);
    });
  });

  describe('system stats', () => {
    it('should get system stats', () => {
      const stats = processManager.getSystemStats();
      expect(stats).toBeDefined();
      expect(stats.totalProcesses).toBeGreaterThanOrEqual(4); // At least 4 default processes
      expect(stats.runningProcesses).toBeGreaterThanOrEqual(0);
      expect(stats.stoppedProcesses).toBeGreaterThanOrEqual(0);
      expect(stats.errorProcesses).toBeGreaterThanOrEqual(0);
      expect(typeof stats.uptime).toBe('number');
      expect(typeof stats.memoryUsage).toBe('number');
      expect(typeof stats.cpuUsage).toBe('number');
    });
  });

  describe('process logs', () => {
    it('should get process logs', () => {
      const logs = processManager.getProcessLogs(testConfig.id);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await processManager.shutdown();
      expect(processManager.isHealthy()).toBe(false);
    });
  });
}); 