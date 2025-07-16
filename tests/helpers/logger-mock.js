/**
 * Mock Logger implementation for tests
 */

import { jest } from '@jest/globals';

// Create mock logger instance
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  configure: jest.fn().mockResolvedValue(undefined),
  child: jest.fn().mockImplementation((context) => ({
    ...mockLogger,
    context
  }))
};

// Create mock Logger class
export const Logger = jest.fn().mockImplementation(() => {
  return mockLogger;
});

// Add static getInstance method that handles config parameter
Logger.getInstance = jest.fn().mockImplementation((config) => mockLogger);

// Mock LogLevel enum
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Export the singleton instance
export const logger = mockLogger;
