/**
 * Jest setup file for Claude-Flow tests
 * Handles timer cleanup, mocking, and test environment setup
 */

import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Mock process.cwd to prevent ENOENT: no such file or directory, uv_cwd errors
process.cwd = jest.fn(() => '/Users/sethford/Downloads/Projects/claude-code-flow');

// Enable fake timers globally to prevent hanging
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  // Clear all timers and intervals
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Global cleanup after all tests
afterAll(() => {
  jest.useRealTimers();
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock process.exit to prevent tests from actually exiting
process.exit = jest.fn();

// Mock setTimeout and setInterval to prevent hanging
global.setTimeout = jest.fn((fn, delay) => {
  return originalSetTimeout(fn, delay);
});

global.setInterval = jest.fn((fn, delay) => {
  return originalSetInterval(fn, delay);
});

global.clearTimeout = jest.fn((id) => {
  return originalClearTimeout(id);
});

global.clearInterval = jest.fn((id) => {
  return originalClearInterval(id);
});

// Store original timer functions
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

// Mock file system operations for tests
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
  rmdir: jest.fn(),
  access: jest.fn()
}));

// Mock child_process to prevent actual process spawning
jest.mock('node:child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    if (callback) {
      callback(null, { stdout: '[]', stderr: '' });
    }
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
  }))
}));

// Mock readline to prevent stdin issues
jest.mock('node:readline', () => ({
  createInterface: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
    question: jest.fn()
  }))
}));

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.CLAUDE_FLOW_ENV = 'test';
process.env.CLAUDE_FLOW_LOG_LEVEL = 'silent';
process.env.CLAUDE_FLOW_DISABLE_METRICS = 'true';
process.env.CLAUDE_FLOW_DISABLE_TELEMETRY = 'true';

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 