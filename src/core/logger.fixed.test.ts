/**
 * Properly fixed tests for Logger component
 * This version uses manual method mocking and properly handles async operations
 */

import { Logger, LogLevel, ILogger } from './logger.js';

// Create a custom mock implementation
let mockFileHandle: any;
let mockStat: any;
let mockFileSize: number;
let shouldThrowOnWrite: boolean = false;
let shouldThrowOnStat: boolean = false;
let shouldThrowOnClose: boolean = false;

// Manually mock the methods used by Logger
jest.mock('fs/promises', () => ({
  open: jest.fn().mockImplementation(async () => mockFileHandle),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn().mockImplementation(() => [
    { name: 'test.log.1', isFile: () => true },
    { name: 'test.log.2', isFile: () => true }
  ]),
  stat: jest.fn().mockImplementation(async () => {
    if (shouldThrowOnStat) {
      throw new Error('Stat failed');
    }
    return { size: mockFileSize };
  }),
  rename: jest.fn(),
  unlink: jest.fn(),
  rm: jest.fn(),
  access: jest.fn()
}));

describe('Logger Fixed Tests', () => {
  // Original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error
  };
  
  // Set up before each test
  beforeEach(() => {
    // Mock console methods
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Reset file operation flags
    shouldThrowOnWrite = false;
    shouldThrowOnStat = false;
    shouldThrowOnClose = false;
    mockFileSize = 1000;
    
    // Create mock file handle
    mockFileHandle = {
      write: jest.fn().mockImplementation(async () => {
        if (shouldThrowOnWrite) {
          throw new Error('Write failed');
        }
        return { bytesWritten: 10 };
      }),
      close: jest.fn().mockImplementation(async () => {
        if (shouldThrowOnClose) {
          throw new Error('Close failed');
        }
      })
    };
    
    // Clear all mock calls
    jest.clearAllMocks();
  });
  
  // Restore console after each test
  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
  
  test('basic console logging works', () => {
    const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Debug should be filtered with info level
    expect(console.debug).not.toHaveBeenCalled();
    
    // Others should be logged
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
  
  test('file logging writes to file', async () => {
    // Get fs mock to verify calls
    const fs = require('fs/promises');
    
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: '/test/logfile.log'
    });
    
    await logger.info('Test message');
    
    // Verify fs.open was called
    expect(fs.open).toHaveBeenCalledWith('/test/logfile.log', 'a');
    
    // Verify write was called on the file handle
    expect(mockFileHandle.write).toHaveBeenCalled();
    
    // Check content written contains our message
    const writeArg = mockFileHandle.write.mock.calls[0][0];
    const content = writeArg.toString();
    expect(content).toContain('Test message');
  });
  
  test('logs to both console and file when destination is both', async () => {
    const fs = require('fs/promises');
    
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'both',
      filePath: '/test/logfile.log'
    });
    
    await logger.info('Test both destinations');
    
    // Check console logging
    expect(console.info).toHaveBeenCalledTimes(1);
    
    // Check file logging
    expect(fs.open).toHaveBeenCalledWith('/test/logfile.log', 'a');
    expect(mockFileHandle.write).toHaveBeenCalled();
  });
  
  test('rotates log file when size exceeded', async () => {
    const fs = require('fs/promises');
    
    // Set file size larger than max
    mockFileSize = 2000000;
    
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: '/test/logfile.log',
      maxFileSize: 1000000,
      maxFiles: 3
    });
    
    await logger.info('Test rotation');
    
    // Should check file size
    expect(fs.stat).toHaveBeenCalledWith('/test/logfile.log');
    
    // Should rotate (close, rename, etc)
    expect(mockFileHandle.close).toHaveBeenCalled();
    expect(fs.rename).toHaveBeenCalled();
    
    // Should clean up old files
    expect(fs.readdir).toHaveBeenCalled();
  });
  
  test('handles write errors gracefully', async () => {
    // Set write to throw
    shouldThrowOnWrite = true;
    
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: '/test/logfile.log'
    });
    
    await logger.info('Test error handling');
    
    // Should log error to console
    expect(console.error).toHaveBeenCalled();
    const errorArg = (console.error as jest.Mock).mock.calls[0][0];
    expect(errorArg).toContain('Failed to write to log file');
  });
  
  test('handles stat errors during rotation check', async () => {
    const fs = require('fs/promises');
    
    // Make stat throw
    shouldThrowOnStat = true;
    
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: '/test/logfile.log',
      maxFileSize: 1000000
    });
    
    await logger.info('Test stat error handling');
    
    // Should still attempt to write
    expect(mockFileHandle.write).toHaveBeenCalled();
    
    // Should not try to rotate
    expect(fs.rename).not.toHaveBeenCalled();
  });
  
  test('closes resources when logger is closed', async () => {
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: '/test/logfile.log'
    });
    
    // Create file handle
    await logger.info('Before close');
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Close logger
    await logger.close();
    
    // Should close file handle
    expect(mockFileHandle.close).toHaveBeenCalled();
    
    // Should not log after closing
    await logger.info('After close');
    expect(mockFileHandle.write).not.toHaveBeenCalled();
  });
  
  test('handles close errors gracefully', async () => {
    shouldThrowOnClose = true;
    
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: '/test/logfile.log'
    });
    
    await logger.info('Before error close');
    
    // Should not throw when closing
    await expect(logger.close()).resolves.not.toThrow();
    
    // Should log error
    expect(console.error).toHaveBeenCalled();
    const errorArg = (console.error as jest.Mock).mock.calls[0][0];
    expect(errorArg).toContain('Error closing log file handle');
  });
  
  test('reconfigures logger when configure is called', async () => {
    const fs = require('fs/promises');
    
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'console'
    });
    
    // Initially logs to console
    logger.info('Console message');
    expect(console.info).toHaveBeenCalledTimes(1);
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Reconfigure to file
    await logger.configure({
      level: 'debug',
      format: 'json',
      destination: 'file',
      filePath: '/test/reconfigured.log'
    });
    
    // Debug should now be logged to file
    await logger.debug('Debug to file');
    
    expect(console.debug).not.toHaveBeenCalled();
    expect(fs.open).toHaveBeenCalledWith('/test/reconfigured.log', 'a');
    expect(mockFileHandle.write).toHaveBeenCalled();
  });
  
  test('closes file handle when destination changes', async () => {
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: '/test/logfile.log'
    });
    
    // Create file handle
    await logger.info('First message');
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Change destination
    await logger.configure({
      level: 'info',
      format: 'text',
      destination: 'console'
    });
    
    // Should close file handle
    expect(mockFileHandle.close).toHaveBeenCalled();
    
    // Now should log to console
    logger.info('After reconfigure');
    expect(console.info).toHaveBeenCalledTimes(1);
  });
});