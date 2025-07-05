/**
 * Node.js compatible test utilities for Claude-Flow
 */

// Import test utilities
import { AsyncTestUtils } from './node-async-utils';
import { MemoryTestUtils } from './node-memory-utils';
import { FileSystemTestUtils } from './node-filesystem-utils';
import { PerformanceTestUtils } from './node-performance-utils';
import { TestAssertions } from './node-test-assertions';
import { TestDataGenerator } from './node-data-generator';

// Re-export Jest test functions
export const describe = global.describe;
export const it = global.test;
export const beforeEach = global.beforeEach;
export const afterEach = global.afterEach;
export const beforeAll = global.beforeAll;
export const afterAll = global.afterAll;

// Jest assertion functions compatible with Deno assertions
export const assertEquals = (actual: any, expected: any, msg?: string) => {
  expect(actual).toEqual(expected);
};

export const assertExists = (actual: any, msg?: string) => {
  expect(actual).toBeTruthy();
};

export const assertThrows = (fn: Function, errorClass?: any, msgIncludes?: string) => {
  if (typeof fn === 'function') {
    expect(fn).toThrow();
  } else {
    expect(async () => await fn).toThrow();
  }
};

export const assertRejects = async (fn: Function, errorClass?: any, msgIncludes?: string) => {
  await expect(fn).rejects.toThrow();
};

export const assertStringIncludes = (actual: string, expected: string, msg?: string) => {
  expect(actual).toContain(expected);
};

// Spy and stub utilities
export const spy = jest.fn;

export const stub = (obj: any, method: string) => {
  const original = obj[method];
  const mockFn = jest.spyOn(obj, method).mockImplementation(() => {});
  return {
    calls: mockFn.mock.calls,
    restore: () => {
      obj[method] = original;
    },
  };
};

export const assertSpyCall = (spy: jest.Mock, callIndex: number, args: any[]) => {
  expect(spy.mock.calls[callIndex]).toEqual(args);
};

export const assertSpyCalls = (spy: jest.Mock, expectedCalls: number) => {
  expect(spy.mock.calls.length).toBe(expectedCalls);
};

// Time mocking
export class FakeTime {
  private originalNow: typeof Date.now;
  private originalSetTimeout: typeof setTimeout;
  private originalClearTimeout: typeof clearTimeout;
  private originalSetInterval: typeof setInterval;
  private originalClearInterval: typeof clearInterval;
  private now: number;
  private timers: Array<{ id: number; expiry: number; callback: Function; active: boolean }>;

  constructor() {
    this.originalNow = Date.now;
    this.originalSetTimeout = global.setTimeout;
    this.originalClearTimeout = global.clearTimeout;
    this.originalSetInterval = global.setInterval;
    this.originalClearInterval = global.clearInterval;
    this.now = Date.now();
    this.timers = [];
  }

  tick(ms: number) {
    this.now += ms;
    Date.now = () => this.now;
    
    const expired = this.timers.filter(timer => timer.expiry <= this.now);
    this.timers = this.timers.filter(timer => timer.expiry > this.now);
    
    expired.forEach(timer => {
      if (timer.active) {
        timer.callback();
      }
    });
  }

  restore() {
    Date.now = this.originalNow;
    global.setTimeout = this.originalSetTimeout;
    global.clearTimeout = this.originalClearTimeout;
    global.setInterval = this.originalSetInterval;
    global.clearInterval = this.originalClearInterval;
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
  options: { timeout?: number; interval?: number; message?: string } = {},
): Promise<void> {
  return AsyncTestUtils.waitFor(condition, options);
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
 * Node.js compatible version
 */
export async function createTestFile(
  path: string,
  content: string,
): Promise<string> {
  const fs = require('fs/promises');
  const os = require('os');
  const nodePath = require('path');
  
  // Use node's temp directory
  const tempDir = await fs.mkdtemp(`${os.tmpdir()}${nodePath.sep}`);
  const filePath = nodePath.join(tempDir, path);
  const dir = filePath.substring(0, filePath.lastIndexOf(nodePath.sep));
  
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content);
  
  return filePath;
}

/**
 * Runs a CLI command and captures output
 * Node.js compatible version
 */
export async function runCommand(
  args: string[],
  options: { stdin?: string; env?: Record<string, string> } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  const { spawn } = require('child_process');
  const path = require('path');

  return new Promise((resolve, reject) => {
    const cmdOptions: any = {
      stdio: ['pipe', 'pipe', 'pipe'],
    };
    
    if (options.env) {
      cmdOptions.env = { ...process.env, ...options.env };
    }
    
    const nodePath = process.execPath;
    const scriptPath = path.resolve('./cli.js');
    
    const child = spawn(nodePath, [scriptPath, ...args], cmdOptions);
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    
    if (options.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }
    
    child.on('close', (code: number) => {
      resolve({
        stdout,
        stderr,
        code,
      });
    });
    
    child.on('error', (err: Error) => {
      reject(err);
    });
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
        port: 8081,
        tlsEnabled: false,
      },
      logging: {
        level: 'error' as const,
        format: 'json' as const,
        destination: 'console' as const,
      },
      ...overrides,
    };
  }
}

/**
 * Assertion helpers
 */
export function assertEventEmitted(
  events: Array<{ event: string; data: any }>,
  eventName: string,
  matcher?: (data: any) => boolean,
): void {
  const emitted = events.find((e) => e.event === eventName);
  assertExists(emitted, `Expected event '${eventName}' to be emitted`);
  
  if (matcher && !matcher(emitted.data)) {
    throw new Error(`Event '${eventName}' data did not match expected criteria`);
  }
}

export function assertNoEventEmitted(
  events: Array<{ event: string; data: any }>,
  eventName: string,
): void {
  const emitted = events.find((e) => e.event === eventName);
  assertEquals(emitted, undefined, `Expected event '${eventName}' not to be emitted`);
}

// Export our test utilities
export {
  AsyncTestUtils,
  MemoryTestUtils,
  FileSystemTestUtils,
  PerformanceTestUtils,
  TestAssertions,
  TestDataGenerator
};