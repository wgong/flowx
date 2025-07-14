/**
 * Minimal Jest setup for Claude-Flow tests
 */

import { jest } from '@jest/globals';

// Set test timeout
jest.setTimeout(30000);

// Mock process.cwd to prevent ENOENT errors
const originalCwd = process.cwd;
process.cwd = jest.fn().mockReturnValue('/mock/cwd');

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = jest.fn((code) => {
  throw new Error(`process.exit called with "${code}"`);
});

// Restore on cleanup
afterAll(() => {
  process.cwd = originalCwd;
  process.exit = originalExit;
});