/**
 * Centralized Mock System for Tests
 * 
 * This file provides a consistent set of mocks that can be used across all tests.
 * Import this at the beginning of each test file to ensure consistent mocking behavior.
 */

import { jest } from '@jest/globals';
import path from 'path';

class MockSystem {
  /**
   * Initialize all mocks
   */
  setup() {
    this.mockLogger();
    this.mockFs();
    this.mockChildProcess();
    this.mockDeno();
    this.mockPaths();
    this.mockReadline();
  }

  /**
   * Create mock Logger implementation
   */
  mockLogger() {
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      configure: jest.fn().mockResolvedValue(undefined),
      child: jest.fn().mockReturnThis()
    };

    jest.mock(path.resolve(__dirname, 'src/core/logger'), () => ({
      Logger: jest.fn().mockImplementation(() => mockLogger),
      LogLevel: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
      },
      logger: mockLogger
    }), { virtual: true });
    
    return mockLogger;
  }

  /**
   * Create mock file system implementations
   */
  mockFs() {
    // Mock fs/promises
    jest.mock('fs/promises', () => ({
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockImplementation((path) => {
        if (typeof path === 'string') {
          if (path.includes('CLAUDE.md')) {
            return Promise.resolve("# Claude Code Configuration");
          }
          if (path.endsWith('.json')) {
            return Promise.resolve('{}');
          }
        }
        return Promise.resolve("Mock content");
      }),
      stat: jest.fn().mockResolvedValue({ 
        isFile: () => true,
        isDirectory: () => false 
      }),
      unlink: jest.fn().mockResolvedValue(undefined),
      rmdir: jest.fn().mockResolvedValue(undefined),
      rm: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined),
      mkdtemp: jest.fn().mockImplementation(() => Promise.resolve('/tmp/mock-test-dir')),
      readdir: jest.fn().mockResolvedValue([]),
      rename: jest.fn().mockResolvedValue(undefined),
      open: jest.fn().mockResolvedValue({
        write: jest.fn().mockResolvedValue({ bytesWritten: 10 }),
        close: jest.fn().mockResolvedValue(undefined)
      })
    }));

    // Mock fs
    const actualFs = jest.requireActual('fs');
    jest.mock('fs', () => ({
      ...actualFs,
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn().mockReturnValue(undefined),
      writeFileSync: jest.fn().mockReturnValue(undefined),
      readFileSync: jest.fn().mockImplementation((path) => {
        if (typeof path === 'string') {
          if (path.includes('CLAUDE.md')) {
            return "# Claude Code Configuration";
          }
          if (path.endsWith('.json')) {
            return '{}';
          }
        }
        return "Mock content";
      }),
      promises: {
        mkdir: jest.fn().mockResolvedValue(undefined),
        writeFile: jest.fn().mockResolvedValue(undefined),
        readFile: jest.fn().mockImplementation((path) => {
          if (typeof path === 'string') {
            if (path.includes('CLAUDE.md')) {
              return Promise.resolve("# Claude Code Configuration");
            }
            if (path.endsWith('.json')) {
              return Promise.resolve('{}');
            }
          }
          return Promise.resolve("Mock content");
        }),
        stat: jest.fn().mockResolvedValue({ 
          isFile: () => true,
          isDirectory: () => false 
        }),
      }
    }));
  }

  /**
   * Mock child_process functionality
   */
  mockChildProcess() {
    jest.mock('child_process', () => ({
      exec: jest.fn((cmd, opts, callback) => {
        if (callback) callback(null, { stdout: 'mocked stdout', stderr: '' });
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn()
        };
      }),
      spawn: jest.fn(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      })),
      spawnSync: jest.fn().mockImplementation((cmd, args, options) => ({
        status: 0,
        stdout: 'Mock output from ' + cmd + (args ? ' ' + args.join(' ') : ''),
        stderr: ''
      }))
    }));

    jest.mock('node:child_process', () => ({
      exec: jest.fn((cmd, opts, callback) => {
        if (callback) callback(null, { stdout: 'mocked stdout', stderr: '' });
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn()
        };
      }),
      spawn: jest.fn(() => ({
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      })),
      spawnSync: jest.fn().mockImplementation((cmd, args, options) => ({
        status: 0,
        stdout: 'Mock output from ' + cmd + (args ? ' ' + args.join(' ') : ''),
        stderr: ''
      }))
    }));
  }

  /**
   * Mock Deno functionality
   */
  mockDeno() {
    global.Deno = {
      stat: jest.fn().mockResolvedValue({ isFile: true }),
      env: {
        get: jest.fn().mockReturnValue('mock-value'),
        set: jest.fn()
      },
      readTextFile: jest.fn().mockResolvedValue('Mock content'),
      writeTextFile: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined)
    };
  }

  /**
   * Mock path operations for consistent behavior
   */
  mockPaths() {
    // Keep actual path functionality but override specific methods
    const actualPath = jest.requireActual('path');
    jest.mock('path', () => ({
      ...actualPath,
      join: jest.fn().mockImplementation((...args) => {
        // Handle different types of input
        return args.filter(arg => arg !== undefined && arg !== null).join('/');
      })
    }));

    jest.mock('node:path', () => ({
      ...actualPath,
      join: jest.fn().mockImplementation((...args) => {
        // Handle different types of input
        return args.filter(arg => arg !== undefined && arg !== null).join('/');
      })
    }));
  }

  /**
   * Mock readline to prevent stdin issues
   */
  mockReadline() {
    jest.mock('readline', () => ({
      createInterface: jest.fn(() => ({
        on: jest.fn(),
        close: jest.fn(),
        question: jest.fn(),
        write: jest.fn()
      }))
    }));

    jest.mock('node:readline', () => ({
      createInterface: jest.fn(() => ({
        on: jest.fn(),
        close: jest.fn(),
        question: jest.fn(),
        write: jest.fn()
      }))
    }));
  }

  /**
   * Create EventBus mock
   */
  createEventBusMock() {
    return {
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };
  }

  /**
   * Create PersistenceManager mock with all required methods
   */
  createPersistenceManagerMock() {
    return {
      initialized: true,
      initialize: jest.fn().mockResolvedValue(undefined),
      store: jest.fn().mockResolvedValue(true),
      retrieve: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(undefined),
      storeAgent: jest.fn().mockResolvedValue('agent-id'),
      getAgent: jest.fn().mockResolvedValue({
        id: 'agent-id',
        name: 'Test Agent',
        type: 'test',
        status: 'active'
      }),
      updateAgent: jest.fn().mockResolvedValue(true),
      deleteAgent: jest.fn().mockResolvedValue(true),
      getAgents: jest.fn().mockResolvedValue([]),
      saveTask: jest.fn().mockResolvedValue('task-id'),
      getTask: jest.fn().mockResolvedValue({
        id: 'task-id',
        type: 'test',
        status: 'pending'
      }),
      updateTask: jest.fn().mockResolvedValue(true),
      deleteTask: jest.fn().mockResolvedValue(true),
      getActiveTasks: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({
        totalAgents: 0,
        activeAgents: 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        failedTasks: 0
      }),
      saveToFile: jest.fn().mockResolvedValue(true)
    };
  }

  /**
   * Create basic mock context for MCP tools
   */
  createMcpContextMock() {
    return {
      workingDirectory: '/mock/working/dir',
      credentials: {},
      parameters: {},
      fs: {
        readFile: jest.fn().mockResolvedValue('Mock content'),
        writeFile: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true)
      }
    };
  }
}

// Export singleton instance
const mockSystem = new MockSystem();
export default mockSystem;