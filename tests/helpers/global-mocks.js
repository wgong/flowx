/**
 * Global mocks for common problematic modules
 */

import { jest } from '@jest/globals';

// Mock child_process
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
    stdout: 'Mock output from ' + cmd + ' ' + args.join(' '),
    stderr: ''
  }))
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockImplementation((path) => {
    if (path.includes('CLAUDE.md')) {
      return Promise.resolve("# Claude Code Configuration");
    }
    if (path.endsWith('.json')) {
      return Promise.resolve('{}');
    }
    return Promise.resolve("Mock content");
  }),
  stat: jest.fn().mockResolvedValue({ isFile: () => true }),
  unlink: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  mkdtemp: jest.fn().mockImplementation(() => Promise.resolve('/tmp/mock-test-dir'))
}));

// Mock express to prevent prototype issues
jest.mock('express', () => {
  const mockExpress = jest.fn(() => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn((port, callback) => {
      if (callback) callback();
      return { close: jest.fn() };
    }),
    set: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn()
  }));
  
  // Add static methods
  mockExpress.static = jest.fn();
  mockExpress.json = jest.fn();
  mockExpress.urlencoded = jest.fn();
  mockExpress.Router = jest.fn(() => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }));
  
  return mockExpress;
});

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn().mockReturnValue(undefined),
  writeFileSync: jest.fn().mockReturnValue(undefined),
  readFileSync: jest.fn().mockImplementation((path) => {
    if (path.includes('CLAUDE.md')) {
      return "# Claude Code Configuration";
    }
    if (path.endsWith('.json')) {
      return '{}';
    }
    return "Mock content";
  }),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockImplementation((path) => {
      if (path.includes('CLAUDE.md')) {
        return Promise.resolve("# Claude Code Configuration");
      }
      if (path.endsWith('.json')) {
        return Promise.resolve('{}');
      }
      return Promise.resolve("Mock content");
    }),
  }
}));

// Mock Logger
jest.mock('../src/core/logger.ts', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis()
  })),
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  }
}));

// Mock common functions/modules used in tests
global.__mocks = {
  // Add any global mocks here that tests might need
};

export default {
  setup() {
    console.log('Global mocks initialized');
  }
};