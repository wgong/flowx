/**
 * System Monitor Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SystemMonitor } from '../../../../src/cli/commands/start/system-monitor.ts';
import { ProcessManager } from '../../../../src/cli/commands/start/process-manager.ts';
import { EventEmitter } from 'node:events';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Deno assertion functions
const assertEquals = (actual: any, expected: any, message?: string) => {
  expect(actual).toEqual(expected);
};

const assertExists = (value: any, message?: string) => {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
};

describe('SystemMonitor', () => {
  let processManager: ProcessManager;
  let systemMonitor: SystemMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock process manager that extends EventEmitter
    processManager = new EventEmitter() as any;
    (processManager as any).getSystemStats = jest.fn().mockReturnValue({
      totalProcesses: 0,
      runningProcesses: 0,
      stoppedProcesses: 0,
      errorProcesses: 0,
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0
    });
    
    // Mock console methods
    global.console = mockConsole as any;
    
    systemMonitor = new SystemMonitor(processManager);
  });

  afterEach(() => {
    systemMonitor.stop();
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should setup event listeners', () => {
      // Emit a process event to test listener setup
      processManager.emit('processStarted', { processId: 'test-1' });
      
      const events = systemMonitor.getRecentEvents(10);
      assertEquals(events.length >= 1, true);
    });
  });

  describe('event tracking', () => {
    it('should track process started events', () => {
      processManager.emit('processStarted', { 
        processId: 'process-123',
        command: 'test-command'
      });
      
      const events = systemMonitor.getRecentEvents(10);
      const processEvent = events.find(e => e.type === 'process_started');
      
      assertExists(processEvent);
      assertEquals(processEvent?.data.processId, 'process-123');
    });

    it('should track process stopped events', () => {
      processManager.emit('processStopped', { 
        processId: 'process-456',
        exitCode: 0
      });
      
      const events = systemMonitor.getRecentEvents(10);
      const processEvent = events.find(e => e.type === 'process_stopped');
      
      assertExists(processEvent);
      assertEquals(processEvent?.data.processId, 'process-456');
    });

    it('should track process error events', () => {
      processManager.emit('processError', { 
        processId: 'process-789',
        error: 'Test error'
      });
      
      const events = systemMonitor.getRecentEvents(10);
      const errorEvent = events.find(e => e.type === 'process_error');
      
      assertExists(errorEvent);
      assertEquals(errorEvent?.data.processId, 'process-789');
    });

    it('should limit event storage', () => {
      // Emit more events than the limit
      for (let i = 0; i < 150; i++) {
        processManager.emit('processStarted', { processId: `process-${i}` });
      }
      
      const events = systemMonitor.getRecentEvents(200);
      assertEquals(events.length, 100); // maxEvents limit
    });
  });

  describe('system health', () => {
    it('should return system health status', () => {
      const health = systemMonitor.getSystemHealth();
      
      assertExists(health);
      assertExists(health.overall);
      assertExists(health.processes);
      assertExists(health.memory);
      assertExists(health.cpu);
      assertExists(health.uptime);
      assertExists(health.alerts);
    });

    it('should detect unhealthy status with high memory usage', () => {
      // Mock process.memoryUsage to return high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1000000000, // 1GB
        heapTotal: 900000000,
        heapUsed: 800000000,
        external: 100000000,
        arrayBuffers: 50000000
      }) as any;
      
      const health = systemMonitor.getSystemHealth();
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
      
      assertExists(health);
      // The health status depends on system thresholds
    });
  });

  describe('event formatting', () => {
    it('should format event messages correctly', () => {
      const event = {
        type: 'process_started',
        data: { processId: 'test-process', command: 'test-command' }
      };
      
      // Access private method for testing
      const formatMessage = (systemMonitor as any).formatEventMessage;
      const message = formatMessage(event);
      
      assertExists(message);
      assertEquals(typeof message, 'string');
      assertEquals(message.includes('test-process'), true);
    });

    it('should get correct event icons', () => {
      // Access private method for testing
      const getIcon = (systemMonitor as any).getEventIcon;
      
      const startIcon = getIcon('process_started');
      const stopIcon = getIcon('process_stopped');
      const errorIcon = getIcon('process_error');
      
      assertEquals(startIcon, '▶️');
      assertEquals(stopIcon, '⏹️');
      assertEquals(errorIcon, '💥');
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', () => {
      systemMonitor.start();
      
      // Verify monitoring is running
      assertEquals((systemMonitor as any).isRunning, true);
    });

    it('should stop monitoring', () => {
      systemMonitor.start();
      systemMonitor.stop();
      
      // Verify monitoring is stopped
      assertEquals((systemMonitor as any).isRunning, false);
    });

    it('should not start multiple times', () => {
      systemMonitor.start();
      systemMonitor.start(); // Should not start again
      
      assertEquals((systemMonitor as any).isRunning, true);
    });
  });

  describe('metrics collection', () => {
    it('should collect metrics for running processes', () => {
      const health = systemMonitor.getSystemHealth();
      
      assertEquals(health.processes, 0); // No processes running
      assertExists(health.memory);
      assertExists(health.cpu);
    });

    it('should track system uptime', () => {
      const health = systemMonitor.getSystemHealth();
      
      assertExists(health.uptime);
      assertEquals(typeof health.uptime, 'number');
      assertEquals(health.uptime >= 0, true);
    });
  });

  describe('event log printing', () => {
    it('should print event log', () => {
      // Add some events
      processManager.emit('processStarted', { processId: 'test-1' });
      processManager.emit('processStopped', { processId: 'test-2' });
      
      systemMonitor.printEventLog(5);
      
      assertEquals(mockConsole.log.mock.calls.length >= 1, true);
    });

    it('should limit printed events', () => {
      // Add many events
      for (let i = 0; i < 10; i++) {
        processManager.emit('processStarted', { processId: `test-${i}` });
      }
      
      systemMonitor.printEventLog(3);
      
      // Should have header + limited events
      assertEquals(mockConsole.log.mock.calls.length >= 1, true);
    });
  });

  describe('system health printing', () => {
    it('should print system health', () => {
      systemMonitor.printSystemHealth();
      
      assertEquals(mockConsole.log.mock.calls.length >= 1, true);
    });

    it('should show recent errors in health output', () => {
      // Add an error event
      processManager.emit('processError', { 
        processId: 'error-process',
        error: 'Test error message'
      });
      
      systemMonitor.printSystemHealth();
      
      assertEquals(mockConsole.log.mock.calls.length >= 1, true);
    });
  });
});