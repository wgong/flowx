/**
 * Centralized Mock System for Tests
 * 
 * This file provides a consistent set of mocks that can be used across all tests.
 * It creates standardized mock implementations for external dependencies like the
 * file system, child processes, and logger to ensure tests run in isolation with
 * predictable behavior.
 * 
 * How to use:
 * 1. Import this file at the beginning of your test: import mockSystem from './mock-system.js'
 * 2. Initialize all mocks: mockSystem.setup()
 * 3. Use helper functions like createMockEventBus() in your tests
 *
 * Benefits:
 * - Consistent mocking behavior across all tests
 * - No actual file system or network operations during tests
 * - Isolated test environment with predictable mock responses
 * - Simplified test setup with helper functions
 */

import { jest } from '@jest/globals';
import path from 'path';

class MockSystem {
  /**
   * Initialize all mocks
   * 
   * This method configures all mock implementations at once.
   * Call this at the beginning of your test setup to ensure
   * all external dependencies are properly mocked.
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
   * 
   * Mocks the Logger class with all required methods and creates a proper
   * getInstance() static method. This prevents initialization errors in tests
   * and provides a consistent interface for log operations.
   * 
   * @returns {Object} Mock logger instance with debug, info, warn, and error methods
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

    jest.mock('../src/core/logger.ts', () => {
      return {
        Logger: {
          getInstance: jest.fn().mockReturnValue(mockLogger),
          ...jest.fn().mockImplementation(() => mockLogger)
        },
        LogLevel: {
          DEBUG: 0,
          INFO: 1,
          WARN: 2,
          ERROR: 3,
        },
        logger: mockLogger
      };
    });
    
    return mockLogger;
  }

  /**
   * Create mock file system implementations
   * 
   * Mocks both fs and fs/promises modules to prevent actual filesystem operations
   * during tests. Provides predictable responses for file operations like read, write,
   * and directory creation. Special handling is included for common files like
   * CLAUDE.md and JSON configuration files.
   * 
   * This mock prevents tests from:  
   * - Creating actual files or directories
   * - Depending on existing file content
   * - Failing due to permission errors
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
   * 
   * Mocks both child_process and node:child_process modules to prevent actual
   * process spawning during tests. Provides consistent mock implementations for
   * exec, spawn, and spawnSync methods with predictable outputs.
   * 
   * This prevents tests from:
   * - Running actual system commands
   * - Having different behavior across operating systems
   * - Failing due to missing executables or permissions
   * - Being affected by command execution time
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
   * 
   * Creates mock implementations for Deno-specific APIs and utility functions.
   * This is especially important for tests that interact with code that uses
   * Deno features, as these may not be available in the Node.js test environment.
   * 
   * Also mocks the deno-fs-utils.ts helper module which provides compatibility
   * functions for file system operations between Deno and Node.js environments.
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
    
    // Mock Deno-specific utility functions
    jest.mock('../tests/helpers/deno-fs-utils.ts', () => ({
      safeChdir: jest.fn().mockResolvedValue(true),
      safeCwd: jest.fn().mockReturnValue('/mock/cwd'),
      createTempTestDir: jest.fn().mockResolvedValue('/mock/temp-dir'),
      safeRemoveDir: jest.fn().mockResolvedValue(true),
      setupTestDirEnvironment: jest.fn().mockResolvedValue({
        originalCwd: '/mock/original-cwd',
        testDir: '/mock/test-dir'
      }),
      cleanupTestDirEnvironment: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true)
    }));
  }

  /**
   * Mock path operations for consistent behavior
   * 
   * Mocks path and node:path modules to ensure consistent path handling across
   * different operating systems during tests. This is particularly important for
   * cross-platform compatibility where path separators might differ.
   * 
   * The mock preserves most actual path functionality but overrides specific methods
   * like join() to ensure predictable behavior regardless of the test environment.
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
   * 
   * Mocks both readline and node:readline modules to prevent tests from blocking
   * on user input or having unexpected interactions with the console. This is
   * crucial for tests involving CLI tools that might prompt for user input.
   * 
   * All readline methods like createInterface, question, etc. are mocked to return
   * predictable values without actual I/O operations.
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
   * 
   * Creates a mock implementation of the EventBus with all required methods.
   * This allows tests to verify event subscriptions and emissions without
   * actual event propagation logic.
   * 
   * @returns {Object} Mock EventBus with on, off, emit, subscribe, and unsubscribe methods
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
   * 
   * Creates a complete mock implementation of the PersistenceManager interface
   * with all required methods for storing and retrieving agents, tasks, and other
   * persistent data. This allows tests to verify persistence operations without
   * actual database access.
   * 
   * The mock implementation provides predictable responses for all methods and
   * maintains consistent behavior across tests.
   * 
   * @returns {Object} Mock PersistenceManager with all interface methods implemented
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
   * 
   * Creates a mock implementation of the MCP context object that's passed to
   * MCP tools during execution. This context provides access to working directory,
   * credentials, parameters, and filesystem operations.
   * 
   * Having a consistent mock context ensures that MCP tool tests don't depend on
   * actual filesystem state or credentials.
   * 
   * @returns {Object} Mock MCP context with workingDirectory, credentials, parameters, and fs
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