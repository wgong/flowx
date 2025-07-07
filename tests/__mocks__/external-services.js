/**
 * Mock implementations of external services and APIs
 * Used for testing to avoid actual external dependencies
 */

import { jest } from '@jest/globals';

/**
 * Mock API client for external services
 */
export const mockApiClient = {
  request: jest.fn().mockResolvedValue({ data: { success: true } }),
  get: jest.fn().mockResolvedValue({ data: { success: true } }),
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  put: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } })
};

/**
 * Mock Claude API client
 */
export const mockClaudeClient = {
  complete: jest.fn().mockImplementation(async (params) => {
    return {
      content: [
        {
          type: 'text',
          text: 'Mock response from Claude API'
        }
      ]
    };
  }),
  messages: jest.fn().mockImplementation(async (params) => {
    return {
      content: [
        {
          type: 'text',
          text: 'Mock response from Claude API'
        }
      ]
    };
  })
};

/**
 * Mock file system for testing
 */
export const mockFileSystem = {
  readFile: jest.fn().mockImplementation(async (path) => {
    return Buffer.from('Mock file content');
  }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(true),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    mtime: new Date()
  })
};

/**
 * Mock database client for testing
 */
export const mockDatabaseClient = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  execute: jest.fn().mockResolvedValue({ rowCount: 1 }),
  transaction: jest.fn().mockImplementation(async (callback) => {
    return callback({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      execute: jest.fn().mockResolvedValue({ rowCount: 1 })
    });
  }),
  end: jest.fn().mockResolvedValue(undefined)
};

/**
 * Mock WebSocket server
 */
export const mockWebSocketServer = {
  on: jest.fn(),
  emit: jest.fn(),
  clients: new Set(),
  close: jest.fn()
};

/**
 * Mock process manager for testing
 */
export const mockProcessManager = {
  spawn: jest.fn().mockReturnValue({
    pid: 12345,
    stdout: {
      on: jest.fn()
    },
    stderr: {
      on: jest.fn()
    },
    on: jest.fn()
  }),
  kill: jest.fn().mockResolvedValue(true),
  list: jest.fn().mockResolvedValue([
    { pid: 12345, name: 'test-process', cpu: '0.1', memory: '10MB' }
  ])
};

/**
 * Helper to create custom mock responses
 */
export function createMockResponse(statusCode = 200, data = {}, headers = {}) {
  return {
    status: statusCode,
    data,
    headers,
    ok: statusCode >= 200 && statusCode < 300
  };
}

/**
 * Reset all mocks to their initial state
 */
export function resetAllMocks() {
  jest.clearAllMocks();
}