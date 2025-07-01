/**
 * Comprehensive tests for the Logger component
 */

import { Logger, LogLevel } from './logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Logger - Comprehensive Tests', () => {
  // Save original console methods and fs module
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  
  const originalFs = {
    open: fs.open,
    writeFile: fs.writeFile,
    mkdir: fs.mkdir,
    readdir: fs.readdir,
    rename: fs.rename,
    unlink: fs.unlink,
    stat: fs.stat,
  };
  
  let tempDir: string;
  let logFilePath: string;
  let mockFileHandle: any;
  let mockStats: any;
  
  // Setup mocks and temp directory
  beforeEach(async () => {
    // Mock console methods
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Create temp directory for log files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logger-test-'));
    logFilePath = path.join(tempDir, 'test.log');
    
    // Mock file handle for fs operations
    mockFileHandle = {
      write: jest.fn().mockResolvedValue({ bytesWritten: 10 }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    
    // Mock file stats
    mockStats = {
      size: 0,
      isDirectory: () => false,
      isFile: () => true,
    };
    
    // Mock fs methods
    fs.open = jest.fn().mockResolvedValue(mockFileHandle);
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    fs.mkdir = jest.fn().mockResolvedValue(undefined);
    fs.readdir = jest.fn().mockResolvedValue([
      { name: 'test.log.old', isFile: () => true },
      { name: 'test.log.older', isFile: () => true }
    ]);
    fs.rename = jest.fn().mockResolvedValue(undefined);
    fs.unlink = jest.fn().mockResolvedValue(undefined);
    fs.stat = jest.fn().mockResolvedValue(mockStats);
  });
  
  // Restore original methods and cleanup
  afterEach(async () => {
    // Restore console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    
    // Restore fs methods
    fs.open = originalFs.open;
    fs.writeFile = originalFs.writeFile;
    fs.mkdir = originalFs.mkdir;
    fs.readdir = originalFs.readdir;
    fs.rename = originalFs.rename;
    fs.unlink = originalFs.unlink;
    fs.stat = originalFs.stat;
    
    // Clean up temp directory
    try {
      await originalFs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
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
  
  test('should support all log levels', () => {
    const debugLogger = new Logger({ level: 'debug', format: 'text', destination: 'console' });
    const infoLogger = new Logger({ level: 'info', format: 'text', destination: 'console' });
    const warnLogger = new Logger({ level: 'warn', format: 'text', destination: 'console' });
    const errorLogger = new Logger({ level: 'error', format: 'text', destination: 'console' });
    
    // Debug level tests
    debugLogger.debug('Debug message');
    expect(console.debug).toHaveBeenCalledTimes(1);
    console.debug = jest.fn();
    
    // Info level tests
    infoLogger.debug('Debug message');
    expect(console.debug).not.toHaveBeenCalled();
    
    // Warn level tests
    warnLogger.info('Info message');
    expect(console.info).not.toHaveBeenCalled();
    
    // Error level tests
    errorLogger.warn('Warn message');
    expect(console.warn).not.toHaveBeenCalled();
  });
  
  // FORMATTING TESTS
  
  test('should format log messages based on config', () => {
    // Test JSON format
    const jsonLogger = new Logger({ 
      level: 'info', 
      format: 'json', 
      destination: 'console' 
    });
    
    jsonLogger.info('JSON message');
    const jsonMessage = (console.info as jest.Mock).mock.calls[0][0];
    const parsedJson = JSON.parse(jsonMessage);
    
    expect(parsedJson.level).toBe('INFO');
    expect(parsedJson.message).toBe('JSON message');
    expect(parsedJson.timestamp).toBeDefined();
    
    console.info = jest.fn();
    
    // Test text format
    const textLogger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'console' 
    });
    
    textLogger.info('Text message');
    const textMessage = (console.info as jest.Mock).mock.calls[0][0];
    expect(textMessage).toContain('INFO');
    expect(textMessage).toContain('Text message');
  });
  
  test('should properly format error objects', () => {
    const logger = new Logger({ level: 'error', format: 'json', destination: 'console' });
    const testError = new Error('Test error');
    
    logger.error('Error occurred', testError);
    
    const jsonMessage = (console.error as jest.Mock).mock.calls[0][0];
    const parsedJson = JSON.parse(jsonMessage);
    
    expect(parsedJson.message).toBe('Error occurred');
    expect(parsedJson.error.message).toBe('Test error');
    expect(parsedJson.error.name).toBe('Error');
    expect(parsedJson.error.stack).toBeDefined();
  });
  
  test('should handle complex data in logs', () => {
    const logger = new Logger({ level: 'info', format: 'json', destination: 'console' });
    const complexData = {
      user: { id: 123, name: 'Test User' },
      permissions: ['read', 'write'],
      metadata: { lastLogin: new Date().toISOString() }
    };
    
    logger.info('Complex data', complexData);
    
    const jsonMessage = (console.info as jest.Mock).mock.calls[0][0];
    const parsedJson = JSON.parse(jsonMessage);
    
    expect(parsedJson.data).toEqual(complexData);
  });
  
  // CONTEXT TESTS
  
  test('should include context in log messages', () => {
    const logger = new Logger(
      { level: 'debug', format: 'text', destination: 'console' },
      { component: 'test', requestId: '123' }
    );
    
    logger.info('Test message');
    
    // Check that the context was included in the message
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
    
    // Child logger should inherit parent's configuration
    expect(childLogger).toBeInstanceOf(Logger);
  });
  
  test('should handle nested context objects', () => {
    const logger = new Logger(
      { level: 'info', format: 'json', destination: 'console' },
      { 
        user: { id: 123, name: 'Test User' },
        session: { id: 'abc123', startTime: new Date().toISOString() }
      }
    );
    
    logger.info('Message with nested context');
    
    const jsonMessage = (console.info as jest.Mock).mock.calls[0][0];
    const parsedJson = JSON.parse(jsonMessage);
    
    expect(parsedJson.context.user.id).toBe(123);
    expect(parsedJson.context.session.id).toBe('abc123');
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
    const writeCall = mockFileHandle.write.mock.calls[0][0];
    expect(writeCall.toString()).toContain('File message');
  });
  
  test('should write to both console and file when destination is both', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'both',
      filePath: logFilePath
    });
    
    await logger.info('Both destinations');
    
    // Should have written to console
    expect(console.info).toHaveBeenCalled();
    
    // Should have written to file
    expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
    expect(mockFileHandle.write).toHaveBeenCalled();
  });
  
  test('should check file size for rotation', async () => {
    // Set mock file size to trigger rotation
    mockStats.size = 5000000; // 5MB
    
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath,
      maxFileSize: 1000000, // 1MB
      maxFiles: 3
    });
    
    await logger.info('This should trigger rotation');
    
    // Should have checked file stats
    expect(fs.stat).toHaveBeenCalledWith(logFilePath);
    
    // Should have renamed the file
    expect(fs.rename).toHaveBeenCalled();
    
    // Should have deleted old files
    expect(fs.unlink).toHaveBeenCalled();
  });
  
  test('should handle file write errors gracefully', async () => {
    // Mock file error
    mockFileHandle.write.mockRejectedValue(new Error('Write failed'));
    console.error = jest.fn();
    
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath
    });
    
    await logger.info('Should handle error');
    
    // Should log error to console
    expect(console.error).toHaveBeenCalled();
    const errorCall = (console.error as jest.Mock).mock.calls[0][0];
    expect(errorCall).toContain('Failed to write to log file');
  });
  
  // CONFIGURATION UPDATE TESTS
  
  test('should update configuration on configure call', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'console'
    });
    
    await logger.configure({ 
      level: 'debug', 
      format: 'json', 
      destination: 'file',
      filePath: logFilePath
    });
    
    // Test the configuration was updated by checking behavior
    logger.debug('Debug after update');
    
    // Should now log debug messages
    expect(console.debug).not.toHaveBeenCalled(); // Console no longer used
    
    // Should use file now
    expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
  });
  
  test('should close file handle when destination changes', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath
    });
    
    // Force creation of file handle
    await logger.info('First message');
    
    // Change destination to console only
    await logger.configure({ 
      level: 'info', 
      format: 'text', 
      destination: 'console'
    });
    
    // Should have closed file handle
    expect(mockFileHandle.close).toHaveBeenCalled();
  });
  
  // CLEANUP TESTS
  
  test('should clean up resources on close', async () => {
    const logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'file',
      filePath: logFilePath
    });
    
    // Force creation of file handle
    await logger.info('Message before close');
    
    // Close logger
    await logger.close();
    
    // Should have closed file handle
    expect(mockFileHandle.close).toHaveBeenCalled();
    
    // Attempting to log after close should be no-op
    await logger.info('Message after close');
    expect(mockFileHandle.write).toHaveBeenCalledTimes(1); // Only the first call
  });
});