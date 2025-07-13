/**
 * Test utilities for Claude-Flow
 */

import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

// Export Jest equivalents for common assertions
export const assertEquals = (actual: any, expected: any) => expect(actual).toEqual(expected);
export const assertExists = (value: any) => expect(value).toBeDefined();
export const assertRejects = async (fn: () => Promise<any>, errorType?: any, message?: string) => {
  if (errorType && message) {
    await expect(fn()).rejects.toThrow(message);
  } else if (errorType) {
    await expect(fn()).rejects.toThrow(errorType);
  } else {
    await expect(fn()).rejects.toThrow();
  }
};
export const assertThrows = (fn: () => any) => expect(fn).toThrow();

// Jest already provides these globally, but export for compatibility
export const describe = global.describe;
export const it = global.it;
export const beforeEach = global.beforeEach;
export const afterEach = global.afterEach;
export const beforeAll = global.beforeAll;
export const afterAll = global.afterAll;

// Jest spy/mock utilities
export const spy = jest.fn;
export const stub = jest.fn;
export const assertSpyCall = (spy: any, callIndex: number, args: any[]) => {
  expect(spy).toHaveBeenNthCalledWith(callIndex + 1, ...args);
};
export const assertSpyCalls = (spy: any, callCount: number) => {
  expect(spy).toHaveBeenCalledTimes(callCount);
};

// Mock FakeTime for Node.js/Jest
export class FakeTime {
  private originalDateNow: () => number;
  private originalSetTimeout: typeof setTimeout;
  private originalSetInterval: typeof setInterval;
  private originalClearTimeout: typeof clearTimeout;
  private originalClearInterval: typeof clearInterval;
  private currentTime: number;
  private timers: Map<number, { callback: () => void; time: number; interval?: number }> = new Map();
  private nextId = 1;

  constructor(time: number | Date = Date.now()) {
    this.currentTime = typeof time === 'number' ? time : time.getTime();
    this.originalDateNow = Date.now;
    this.originalSetTimeout = global.setTimeout;
    this.originalSetInterval = global.setInterval;
    this.originalClearTimeout = global.clearTimeout;
    this.originalClearInterval = global.clearInterval;
    
    Date.now = () => this.currentTime;
    
    // Mock timers
    global.setTimeout = ((callback: () => void, delay: number) => {
      const id = this.nextId++;
      this.timers.set(id, { callback, time: this.currentTime + delay });
      return id as any;
    }) as any;
    
    global.setInterval = ((callback: () => void, interval: number) => {
      const id = this.nextId++;
      this.timers.set(id, { callback, time: this.currentTime + interval, interval });
      return id as any;
    }) as any;
    
    global.clearTimeout = ((id: number) => {
      this.timers.delete(id);
    }) as any;
    
    global.clearInterval = ((id: number) => {
      this.timers.delete(id);
    }) as any;
  }
  
  now(): number {
    return this.currentTime;
  }
  
  tick(ms: number): void {
    this.currentTime += ms;
    this.runTimers();
  }
  
  async tickAsync(ms: number): Promise<void> {
    this.currentTime += ms;
    this.runTimers();
    // Allow any pending promises to resolve
    await new Promise(resolve => process.nextTick(resolve));
  }
  
  private runTimers(): void {
    const timersToRun = Array.from(this.timers.entries())
      .filter(([_, timer]) => timer.time <= this.currentTime)
      .sort(([_, a], [__, b]) => a.time - b.time);
    
    for (const [id, timer] of timersToRun) {
      timer.callback();
      
      if (timer.interval) {
        // Reschedule interval
        this.timers.set(id, { 
          callback: timer.callback, 
          time: this.currentTime + timer.interval, 
          interval: timer.interval 
        });
      } else {
        // Remove timeout
        this.timers.delete(id);
      }
    }
  }
  
  restore(): void {
    Date.now = this.originalDateNow;
    global.setTimeout = this.originalSetTimeout;
    global.setInterval = this.originalSetInterval;
    global.clearTimeout = this.originalClearTimeout;
    global.clearInterval = this.originalClearInterval;
    this.timers.clear();
  }
}

/**
 * Creates a test fixture
 */
export function createFixture<T>(factory: () => T): {
  get(): T;
  reset(): void;
} {
  let instance: T;

  return {
    get(): T {
      if (!instance) {
        instance = factory();
      }
      return instance;
    },
    reset(): void {
      instance = factory();
    },
  };
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Creates a deferred promise for testing
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
} {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

/**
 * Captures console output during test
 */
export function captureConsole(): {
  getOutput(): string[];
  getErrors(): string[];
  restore(): void;
} {
  const output: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalDebug = console.debug;
  const originalInfo = console.info;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => output.push(args.join(' '));
  console.error = (...args: any[]) => errors.push(args.join(' '));
  console.debug = (...args: any[]) => output.push(args.join(' '));
  console.info = (...args: any[]) => output.push(args.join(' '));
  console.warn = (...args: any[]) => output.push(args.join(' '));

  return {
    getOutput: () => [...output],
    getErrors: () => [...errors],
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.debug = originalDebug;
      console.info = originalInfo;
      console.warn = originalWarn;
    },
  };
}

/**
 * Creates a test file in a temporary directory
 */
export async function createTestFile(
  path: string,
  content: string,
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'claude-flow-test-'));
  const filePath = join(tempDir, path);
  const dir = dirname(filePath);
  
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content);
  
  return filePath;
}

/**
 * Runs a CLI command and captures output
 */
export async function runCommand(
  args: string[],
  options: { stdin?: string; env?: Record<string, string> } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/cli/main.js', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });

    child.on('error', (error) => {
      reject(error);
    });

    if (options.stdin) {
      child.stdin?.write(options.stdin);
      child.stdin?.end();
    }
  });
}

/**
 * Test data builder for common types
 */
export class TestDataBuilder {
  static agentProfile(overrides = {}) {
    return {
      id: 'agent-1',
      name: 'Test Agent',
      type: 'coordinator' as const,
      capabilities: ['task-management', 'coordination'],
      systemPrompt: 'You are a test agent',
      maxConcurrentTasks: 5,
      priority: 10,
      environment: {},
      workingDirectory: '/tmp',
      shell: '/bin/bash',
      metadata: {},
      ...overrides,
    };
  }

  static task(overrides = {}) {
    return {
      id: 'task-1',
      type: 'test',
      description: 'Test task',
      priority: 50,
      dependencies: [],
      status: 'pending' as const,
      input: { test: true },
      createdAt: new Date(),
      metadata: {},
      ...overrides,
    };
  }

  static config(overrides = {}) {
    return {
      orchestrator: {
        maxConcurrentAgents: 10,
        taskQueueSize: 100,
        healthCheckInterval: 30000,
        shutdownTimeout: 30000,
        maintenanceInterval: 300000,
        metricsInterval: 60000,
        persistSessions: false,
        dataDir: './tests/data',
        sessionRetentionMs: 3600000,
        taskHistoryRetentionMs: 86400000,
        taskMaxRetries: 3,
      },
      terminal: {
        type: 'native' as const,
        poolSize: 5,
        recycleAfter: 10,
        healthCheckInterval: 60000,
        commandTimeout: 300000,
      },
      memory: {
        backend: 'sqlite' as const,
        cacheSizeMB: 10,
        syncInterval: 5000,
        conflictResolution: 'last-write' as const,
        retentionDays: 1,
        sqlitePath: ':memory:',
        markdownDir: './tests/data/memory',
      },
      coordination: {
        maxRetries: 3,
        retryDelay: 100,
        deadlockDetection: true,
        resourceTimeout: 60000,
        messageTimeout: 30000,
      },
      mcp: {
        transport: 'stdio' as const,
        host: 'localhost',
        port: 3000,
        maxConnections: 10,
        timeout: 30000,
        auth: {
          enabled: false,
          secret: 'test-secret',
        },
        loadBalancer: {
          enabled: false,
          strategy: 'round-robin' as const,
          healthCheckInterval: 30000,
        },
      },
      logging: {
        level: 'info' as const,
        format: 'json' as const,
        destination: 'console' as const,
        maxFileSize: 1024 * 1024,
        maxFiles: 5,
      },
      ...overrides,
    };
  }
}

/**
 * Asserts that an event was emitted
 */
export function assertEventEmitted(
  events: Array<{ event: string; data: any }>,
  eventName: string,
  matcher?: (data: any) => boolean,
): void {
  const emitted = events.find(e => e.event === eventName);
  expect(emitted).toBeDefined();
  
  if (matcher && emitted) {
    expect(matcher(emitted.data)).toBe(true);
  }
}

/**
 * Asserts that an event was NOT emitted
 */
export function assertNoEventEmitted(
  events: Array<{ event: string; data: any }>,
  eventName: string,
): void {
  const emitted = events.find(e => e.event === eventName);
  expect(emitted).toBeUndefined();
}