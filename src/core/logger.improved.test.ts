/**
 * Improved tests for the Logger component
 */

import { Logger, LogLevel } from './logger.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

// Create a mock version of fs/promises
jest.mock('fs/promises', () => ({
  open: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn(),
  stat: jest.fn(),
  rename: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined)
}));

describe('Logger - Improved Tests', () => {
  // Save original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  
  let tempDir: string;
  let logFilePath: string;
  let mockFileHandle: any;
  
  // Setup mocks
  beforeEach(() => {
    // Mock console methods
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Setup temp directory and file path
    tempDir = path.join(os.tmpdir(), 'logger-test-');
    logFilePath = path.join(tempDir, 'test.log');
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock file handle for fs operations
    mockFileHandle = {
      write: jest.fn().mockResolvedValue({ bytesWritten: 10 }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    
    // Mock fs.open to return file handle
    (fs.open as jest.Mock).mockResolvedValue(mockFileHandle);
    
    // Mock fs.readdir to return test files
    (fs.readdir as jest.Mock).mockResolvedValue([
      { name: 'test.log.old', isFile: () => true },
      { name: 'test.log.older', isFile: () => true }
    ]);
    
    // Mock fs.stat to return file size
    (fs.stat as jest.Mock).mockResolvedValue({
      size: 0,
      isDirectory: () => false,
      isFile: () => true
    });
  });
  
  // Restore original methods
  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
  
  // BASIC FUNCTIONALITY TESTS
  
  test('should create logger with default config', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });
  
  test('should throw error if file destination specified without path', () => {
    expect(() => {
      new Logger({ destination: 'file', level: 'info', format: 'text' });
    }).toThrow('File path required');
  });
  
  test('should log messages based on level', () => {
    const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Debug level should be filtered out with info level
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
  
  test('should respect DEBUG log level', () => {
    const logger = new Logger({ level: 'debug', format: 'text', destination: 'console' });
    
    logger.debug('Debug message');
    expect(console.debug).toHaveBeenCalledTimes(1);
  });
  
  // CONTEXT TESTS
  
  test('should include context in log messages', () => {
    const logger = new Logger(
      { level: 'debug', format: 'text', destination: 'console' },
      { component: 'test', requestId: '123' }
    );
    
    logger.info('Test message');
    
    const loggedMessage = (console.info as jest.Mock).mock.calls[0][0];
    expect(loggedMessage).toContain('component');
    expect(loggedMessage).toContain('test');
    expect(loggedMessage).toContain('requestId');
    expect(loggedMessage).toContain('123');
  });
  
  test('should create child logger with merged context', () => {
    const parentLogger = new Logger(
      { level: 'debug', format: 'text', destination: 'console' },
      { parent: 'value' }
    );
    
    const childLogger = parentLogger.child({ child: 'value' });
    childLogger.info('Child message');
    
    const loggedMessage = (console.info as jest.Mock).mock.calls[0][0];
    expect(loggedMessage).toContain('parent');
    expect(loggedMessage).toContain('child');
    expect(loggedMessage).toContain('Child message');
  });
  
  // FORMAT TESTS
  
  test('should format log messages as JSON when format is json', () => {
    const logger = new Logger({ level: 'info', format: 'json', destination: 'console' });
    
    logger.info('JSON message');
    
    const jsonMessage = (console.info as jest.Mock).mock.calls[0][0];
    expect(() => JSON.parse(jsonMessage)).not.toThrow();
    
    const parsed = JSON.parse(jsonMessage);
    expect(parsed.level).toBe('INFO');
    expect(parsed.message).toBe('JSON message');
  });
  
  test('should format error objects properly in JSON format', () => {
    const logger = new Logger({ level: 'error', format: 'json', destination: 'console' });
    const testError = new Error('Test error');
    
    logger.error('Error occurred', testError);
    
    const jsonMessage = (console.error as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(jsonMessage);
    expect(parsed.error).toBeDefined();
    expect(parsed.error.message).toBe('Test error');
    expect(parsed.error.name).toBe('Error');
  });
  
  test('should format log messages as text when format is text', () => {
    const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
    
    logger.info('Text message');
    
    const message = (console.info as jest.Mock).mock.calls[0][0];
    expect(message).toContain('[');
    expect(message).toContain(']');
    expect(message).toContain('INFO');
    expect(message).toContain('Text message');
  });
  
  // FILE OPERATION TESTS
  
  test('should write to file when destination is file', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath
    });
    
    await logger.info('File message');
    
    // Should have opened the file
    expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
    
    // Should have written to the file
    expect(mockFileHandle.write).toHaveBeenCalled();
  });
  
  test('should write to both console and file when destination is both', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'both',
      filePath: logFilePath
    });
    
    await logger.info('Both message');
    
    // Should have written to console
    expect(console.info).toHaveBeenCalled();
    
    // Should have opened the file and written to it
    expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
    expect(mockFileHandle.write).toHaveBeenCalled();
  });
  
  test('should rotate log files when maxFileSize is exceeded', async () => {
    // Set mock file size to trigger rotation
    (fs.stat as jest.Mock).mockResolvedValueOnce({
      size: 5000000, // 5MB
      isDirectory: () => false,
      isFile: () => true
    });
    
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath,
      maxFileSize: 1000000, // 1MB
      maxFiles: 3
    });
    
    await logger.info('Rotation message');
    
    // Should check file size
    expect(fs.stat).toHaveBeenCalledWith(logFilePath);
    
    // Should rename the file
    expect(fs.rename).toHaveBeenCalled();
    
    // Should try to clean up old files
    expect(fs.readdir).toHaveBeenCalled();
  });
  
  test('should close file handle when logger is closed', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath
    });
    
    // Write to create the file handle
    await logger.info('Before close');
    
    // Close the logger
    await logger.close();
    
    // Should have closed the file handle
    expect(mockFileHandle.close).toHaveBeenCalled();
    
    // Should set isClosing flag
    expect((logger as any).isClosing).toBe(true);
  });
  
  test('should reconfigure logger when configure is called', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'console'
    });
    
    // Reconfigure to use file
    await logger.configure({
      level: 'debug',
      format: 'json',
      destination: 'file',
      filePath: logFilePath
    });
    
    // Write a debug message (which would be ignored with previous config)
    logger.debug('After reconfigure');
    
    // Should now write to file instead of console
    expect(console.debug).not.toHaveBeenCalled();
    expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
  });
  
  test('should handle errors when writing to file', async () => {
    // Set up error for file write
    mockFileHandle.write.mockRejectedValueOnce(new Error('Write failed'));
    
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath
    });
    
    await logger.info('Error message');
    
    // Should log error to console.error
    expect(console.error).toHaveBeenCalled();
    const errorMessage = (console.error as jest.Mock).mock.calls[0][0];
    expect(errorMessage).toContain('Failed to write');
  });
});