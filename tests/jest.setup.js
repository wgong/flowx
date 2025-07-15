/**
 * Comprehensive Jest setup for Claude-Flow tests
 */

import { jest } from '@jest/globals';

// Set test environment variable for proper logger initialization
process.env.CLAUDE_FLOW_ENV = 'test';
process.env.NODE_ENV = 'test';

// Set test timeout
jest.setTimeout(30000);

// Mock Deno runtime for tests that import Deno modules
global.Deno = {
  cwd: jest.fn(() => process.cwd()),
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  mkdir: jest.fn(),
  remove: jest.fn(),
  env: {
    get: jest.fn((key) => process.env[key]),
    set: jest.fn((key, value) => { process.env[key] = value; }),
    has: jest.fn((key) => key in process.env)
  },
  errors: {
    NotFound: class extends Error { name = 'NotFound' }
  }
};

// Mock fs promises for modules that use them
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
  access: jest.fn()
}));

// Mock child_process spawn/exec for CLI tests
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn(),
  fork: jest.fn()
}));

// Store original functions
const originalCwd = process.cwd;
const originalExit = process.exit;

// Mock process.exit to prevent tests from exiting
process.exit = jest.fn((code) => {
  throw new Error(`process.exit called with code: ${code}`);
});

// Suppress console.log/warn in tests unless explicitly needed
const originalConsole = { ...console };
beforeEach(() => {
  // Only suppress if not in verbose mode
  if (!process.env.JEST_VERBOSE) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Note: console.info is an alias for console.log in Node.js, so we don't need to mock it separately
  }
});

afterEach(() => {
  // Restore console
  if (!process.env.JEST_VERBOSE) {
    console.log.mockRestore?.();
    console.warn.mockRestore?.();
    // Note: console.info restoration is handled by console.log restoration
  }
});

// Restore on cleanup
afterAll(() => {
  // Don't restore process.cwd as it may cause issues
  // process.cwd = originalCwd;
  process.exit = originalExit;
  Object.assign(console, originalConsole);
});

// Add global test utilities
global.testUtils = {
  createMockLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    success: jest.fn()
  }),
  
  createMockConfig: () => ({
    agents: { defaultConcurrency: 1 },
    swarm: { topology: 'centralized' },
    memory: { backend: 'sqlite', path: ':memory:' },
    logging: { level: 'error' }
  }),
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};