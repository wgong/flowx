/**
 * Mock for test-utils module
 */

export const AsyncTestUtils = {
  delay: async (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  concurrent: async <T>(tasks: Array<() => Promise<T>>, concurrency: number = 3): Promise<T[]> => {
    const results: T[] = [];
    const running: Promise<void>[] = [];
    const queue = [...tasks];
    
    const runTask = async (): Promise<void> => {
      if (queue.length === 0) return;
      const task = queue.shift()!;
      const result = await task();
      results.push(result);
      running.splice(running.indexOf(runTask()), 1);
      if (queue.length > 0) running.push(runTask());
    };
    
    const initTasks = Math.min(concurrency, tasks.length);
    for (let i = 0; i < initTasks; i++) {
      running.push(runTask());
    }
    
    await Promise.all(running);
    return results;
  },
  
  timeout: <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  }
};

export const MemoryTestUtils = {
  compareEntries: (a: any, b: any): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
  },
  
  generateRandomEntry: (namespace: string = 'test'): any => {
    return {
      id: `test-${Math.random().toString(36).substring(2, 9)}`,
      namespace,
      key: `key-${Math.random().toString(36).substring(2, 9)}`,
      value: {
        text: `Test entry ${Math.random().toString(36).substring(2, 9)}`,
        number: Math.floor(Math.random() * 1000),
        boolean: Math.random() > 0.5,
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  validateEntry: (entry: any): string[] => {
    const errors: string[] = [];
    if (!entry.id) errors.push('Missing id');
    if (!entry.key) errors.push('Missing key');
    if (!entry.value) errors.push('Missing value');
    return errors;
  }
};

export const PerformanceTestUtils = {
  measureTime: async (fn: () => Promise<any>): Promise<number> => {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  },
  
  benchmark: async (fn: () => Promise<any>, iterations: number = 10): Promise<{min: number, max: number, avg: number}> => {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const time = await PerformanceTestUtils.measureTime(fn);
      times.push(time);
    }
    
    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length
    };
  }
};

export const TestAssertions = {
  assertGreaterThan: (actual: number, expected: number, message?: string) => {
    if (!(actual > expected)) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  },
  
  assertLessThan: (actual: number, expected: number, message?: string) => {
    if (!(actual < expected)) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  },
  
  assertBetween: (actual: number, min: number, max: number, message?: string) => {
    if (!(actual >= min && actual <= max)) {
      throw new Error(message || `Expected ${actual} to be between ${min} and ${max}`);
    }
  }
};

export const FileSystemTestUtils = {
  createTempDirectory: async (): Promise<string> => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
    return tempDir;
  },
  
  cleanupTempDirectory: async (path: string): Promise<void> => {
    const fs = require('fs');
    fs.rmSync(path, { recursive: true, force: true });
  },
  
  writeFile: async (filePath: string, content: string): Promise<void> => {
    const fs = require('fs');
    const path = require('path');
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content);
  },
  
  readFile: async (filePath: string): Promise<string> => {
    const fs = require('fs');
    return fs.readFileSync(filePath, 'utf-8');
  }
};

export const TestDataGenerator = {
  createMemoryEntries: (count: number, namespace: string = 'test'): any[] => {
    return Array.from({ length: count }).map((_, i) => MemoryTestUtils.generateRandomEntry(namespace));
  },
  
  createEdgeCaseData: (): any[] => {
    return [
      { id: 'empty', key: 'empty', value: {}, namespace: 'test' },
      { id: 'null-values', key: 'null', value: { a: null, b: null }, namespace: 'test' },
      { id: 'long-text', key: 'long', value: { text: 'a'.repeat(10000) }, namespace: 'test' },
      { id: 'special-chars', key: 'special!@#$%^&*()', value: { text: '!@#$%^&*()' }, namespace: 'test' },
      { id: 'nested', key: 'nested', value: { level1: { level2: { level3: { value: 'deep' } } } }, namespace: 'test' }
    ];
  }
};