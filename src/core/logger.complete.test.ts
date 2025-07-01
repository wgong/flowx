/**
 * Comprehensive tests for the Logger component
 * Using Jest's mocking capabilities to properly test all functionality
 */

import { Logger, LogLevel } from './logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock the fs/promises module
jest.mock('fs/promises');

describe('Logger', () => {
  // Mock file handle for testing file operations
  const mockFileHandle = {
    write: jest.fn().mockResolvedValue({ bytesWritten: 10 }),
    close: jest.fn().mockResolvedValue(undefined)
  };
  
  // Save console methods to restore later
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  
  // Test file paths
  const tempDir = '/test-temp-dir';
  const logFilePath = path.join(tempDir, 'test.log');
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    
    // Set up fs mocks
    (fs.open as jest.Mock).mockResolvedValue(mockFileHandle);
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1000 });
    (fs.readdir as jest.Mock).mockResolvedValue([
      { name: 'test.log.1', isFile: () => true },
      { name: 'test.log.2', isFile: () => true },
      { name: 'test.log.3', isFile: () => true }
    ]);
  });
  
  afterEach(() => {
    // Restore original console methods
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
  
  describe('Initialization', () => {
    test('should create logger with default config', () => {
      const logger = new Logger();
      
      expect(logger).toBeDefined();
      expect((logger as any).config.level).toBe('info');
      expect((logger as any).config.format).toBe('json');
      expect((logger as any).config.destination).toBe('console');
    });
    
    test('should throw error when file destination specified without path', () => {
      expect(() => {
        new Logger({ destination: 'file', level: 'info', format: 'text' });
      }).toThrow('File path required for file logging');
    });
    
    test('should initialize with custom context', () => {
      const logger = new Logger(
        { level: 'debug', format: 'text', destination: 'console' },
        { service: 'test-service', version: '1.0.0' }
      );
      
      expect((logger as any).context.service).toBe('test-service');
      expect((logger as any).context.version).toBe('1.0.0');
    });
    
    test('should create child logger with merged context', () => {
      const parentLogger = new Logger(
        { level: 'info', format: 'text', destination: 'console' },
        { parent: 'value' }
      );
      
      const childLogger = parentLogger.child({ child: 'value' });
      
      expect(childLogger).toBeInstanceOf(Logger);
      expect((childLogger as any).context.parent).toBe('value');
      expect((childLogger as any).context.child).toBe('value');
    });
    
    test('should create singleton instance', () => {
      // First call should create instance
      const instance1 = Logger.getInstance({ level: 'debug' });
      expect(instance1).toBeInstanceOf(Logger);
      
      // Second call should return same instance
      const instance2 = Logger.getInstance();
      expect(instance2).toBe(instance1);
    });
  });
  
  describe('Log Level Filtering', () => {
    test('should filter messages based on log level', () => {
      // Create logger with info level
      const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
      
      // Log at different levels
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      
      // Debug should be filtered out
      expect(console.debug).not.toHaveBeenCalled();
      
      // Others should go through
      expect(console.info).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });
    
    test('should support all log levels', () => {
      // Test debug level
      const debugLogger = new Logger({ level: 'debug', format: 'text', destination: 'console' });
      debugLogger.debug('Debug message');
      expect(console.debug).toHaveBeenCalledTimes(1);
      
      // Reset mock
      jest.clearAllMocks();
      
      // Test warn level
      const warnLogger = new Logger({ level: 'warn', format: 'text', destination: 'console' });
      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warning message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledTimes(1);
      
      // Reset mock
      jest.clearAllMocks();
      
      // Test error level
      const errorLogger = new Logger({ level: 'error', format: 'text', destination: 'console' });
      errorLogger.debug('Debug message');
      errorLogger.info('Info message');
      errorLogger.warn('Warning message');
      errorLogger.error('Error message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1);
    });
    
    test('should handle invalid log level gracefully', () => {
      // @ts-ignore: Testing invalid input
      const logger = new Logger({ level: 'invalid', format: 'text', destination: 'console' });
      
      // Should default to info level
      logger.debug('Debug message');
      logger.info('Info message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Message Formatting', () => {
    test('should format messages as JSON when format is json', () => {
      const logger = new Logger({ level: 'info', format: 'json', destination: 'console' });
      
      logger.info('JSON message', { data: 'test-data' });
      
      const loggedJson = (console.info as jest.Mock).mock.calls[0][0];
      expect(() => JSON.parse(loggedJson)).not.toThrow();
      
      const parsedJson = JSON.parse(loggedJson);
      expect(parsedJson.level).toBe('INFO');
      expect(parsedJson.message).toBe('JSON message');
      expect(parsedJson.data).toEqual({ data: 'test-data' });
      expect(parsedJson.timestamp).toBeDefined();
    });
    
    test('should format messages as text when format is text', () => {
      const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
      
      logger.info('Text message', { data: 'test-data' });
      
      const loggedText = (console.info as jest.Mock).mock.calls[0][0];
      expect(loggedText).toContain('INFO');
      expect(loggedText).toContain('Text message');
      expect(loggedText).toContain('test-data');
      expect(loggedText).toContain('[');  // timestamp bracket
    });
    
    test('should include context in log messages', () => {
      const logger = new Logger(
        { level: 'info', format: 'json', destination: 'console' },
        { service: 'test-service', requestId: '123' }
      );
      
      logger.info('Message with context');
      
      const loggedJson = (console.info as jest.Mock).mock.calls[0][0];
      const parsedJson = JSON.parse(loggedJson);
      
      expect(parsedJson.context.service).toBe('test-service');
      expect(parsedJson.context.requestId).toBe('123');
    });
    
    test('should format error objects properly in JSON', () => {
      const logger = new Logger({ level: 'error', format: 'json', destination: 'console' });
      const testError = new Error('Test error message');
      
      logger.error('Error occurred', testError);
      
      const loggedJson = (console.error as jest.Mock).mock.calls[0][0];
      const parsedJson = JSON.parse(loggedJson);
      
      expect(parsedJson.error).toBeDefined();
      expect(parsedJson.error.name).toBe('Error');
      expect(parsedJson.error.message).toBe('Test error message');
      expect(parsedJson.error.stack).toBeDefined();
    });
    
    test('should format error objects properly in text', () => {
      const logger = new Logger({ level: 'error', format: 'text', destination: 'console' });
      const testError = new Error('Test error message');
      
      logger.error('Error occurred', testError);
      
      const loggedText = (console.error as jest.Mock).mock.calls[0][0];
      expect(loggedText).toContain('ERROR');
      expect(loggedText).toContain('Error occurred');
      expect(loggedText).toContain('Test error message');
      expect(loggedText).toContain('Error:');
      expect(loggedText).toContain('Stack:');
    });
  });
  
  describe('File Operations', () => {
    test('should write to file when destination is file', async () => {
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath
      });
      
      await logger.info('File log message');
      
      expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
      expect(mockFileHandle.write).toHaveBeenCalled();
      
      // Verify content that was written
      const writeCall = mockFileHandle.write.mock.calls[0][0];
      const content = writeCall.toString();
      expect(content).toContain('INFO');
      expect(content).toContain('File log message');
      expect(content).toContain('\n'); // Should append newline
    });
    
    test('should write to both console and file when destination is both', async () => {
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'both',
        filePath: logFilePath
      });
      
      await logger.info('Both destinations');
      
      // Check console output
      expect(console.info).toHaveBeenCalledTimes(1);
      
      // Check file output
      expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
      expect(mockFileHandle.write).toHaveBeenCalledTimes(1);
    });
    
    test('should check for log rotation when maxFileSize exceeded', async () => {
      // Set mock file size to be larger than maxFileSize
      (fs.stat as jest.Mock).mockResolvedValueOnce({ size: 2000000 });
      
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath,
        maxFileSize: 1000000, // 1MB
        maxFiles: 5
      });
      
      await logger.info('Should trigger rotation');
      
      // Should check file size
      expect(fs.stat).toHaveBeenCalledWith(logFilePath);
      
      // Should close the existing file handle
      expect(mockFileHandle.close).toHaveBeenCalled();
      
      // Should rename current log file
      expect(fs.rename).toHaveBeenCalled();
      const renameCall = (fs.rename as jest.Mock).mock.calls[0];
      expect(renameCall[0]).toBe(logFilePath);
      expect(renameCall[1]).toContain(logFilePath);
      
      // Should clean up old files
      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });
    
    test('should skip rotation when maxFileSize not exceeded', async () => {
      // Set mock file size to be smaller than maxFileSize
      (fs.stat as jest.Mock).mockResolvedValueOnce({ size: 500000 });
      
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath,
        maxFileSize: 1000000, // 1MB
        maxFiles: 5
      });
      
      await logger.info('Should not trigger rotation');
      
      // Should check file size
      expect(fs.stat).toHaveBeenCalledWith(logFilePath);
      
      // Should NOT close existing file handle
      expect(mockFileHandle.close).not.toHaveBeenCalled();
      
      // Should NOT rename log file
      expect(fs.rename).not.toHaveBeenCalled();
      
      // Should NOT clean up old files
      expect(fs.unlink).not.toHaveBeenCalled();
    });
    
    test('should handle file errors gracefully', async () => {
      // Setup write error
      mockFileHandle.write.mockRejectedValueOnce(new Error('Write failed'));
      
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath
      });
      
      await logger.info('Should handle error');
      
      // Should report error to console
      expect(console.error).toHaveBeenCalled();
      const errorCall = (console.error as jest.Mock).mock.calls[0][0];
      expect(errorCall).toContain('Failed to write to log file');
    });
    
    test('should handle stat errors during rotation check', async () => {
      // Setup stat error
      (fs.stat as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath,
        maxFileSize: 1000000
      });
      
      await logger.info('Should handle stat error');
      
      // Should still attempt to write
      expect(mockFileHandle.write).toHaveBeenCalled();
      
      // Should not attempt to rotate
      expect(fs.rename).not.toHaveBeenCalled();
    });
    
    test('should handle cleanup errors gracefully', async () => {
      // Setup readdir error
      (fs.readdir as jest.Mock).mockRejectedValueOnce(new Error('Directory error'));
      
      // Setup rotation
      (fs.stat as jest.Mock).mockResolvedValueOnce({ size: 2000000 });
      
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath,
        maxFileSize: 1000000, 
        maxFiles: 5
      });
      
      await logger.info('Should handle cleanup error');
      
      // Should still rotate
      expect(fs.rename).toHaveBeenCalled();
      
      // Should log error
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('Configuration Updates', () => {
    test('should update configuration when configure is called', async () => {
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'console'
      });
      
      // Update config to file destination
      await logger.configure({
        level: 'debug',
        format: 'json',
        destination: 'file',
        filePath: logFilePath
      });
      
      // Now a debug message should be logged to file
      logger.debug('Debug after config change');
      
      // Should NOT log to console
      expect(console.debug).not.toHaveBeenCalled();
      
      // Should log to file
      expect(fs.open).toHaveBeenCalledWith(logFilePath, 'a');
      expect(mockFileHandle.write).toHaveBeenCalled();
    });
    
    test('should close file handle when destination changes', async () => {
      // Create logger with file destination
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath
      });
      
      // Force file handle creation
      await logger.info('Initial message');
      expect(fs.open).toHaveBeenCalled();
      
      // Update config to console destination
      await logger.configure({
        level: 'info',
        format: 'text',
        destination: 'console'
      });
      
      // Should close file handle
      expect(mockFileHandle.close).toHaveBeenCalled();
      
      // Reset mocks for next test
      jest.clearAllMocks();
      
      // Next message should go to console only
      logger.info('After config change');
      expect(console.info).toHaveBeenCalledTimes(1);
      expect(fs.open).not.toHaveBeenCalled();
    });
  });
  
  describe('Resource Management', () => {
    test('should close file handle when logger is closed', async () => {
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath
      });
      
      // Force file handle creation
      await logger.info('Message before close');
      
      // Close logger
      await logger.close();
      
      // Should close file handle
      expect(mockFileHandle.close).toHaveBeenCalled();
      
      // Verify isClosing flag was set
      expect((logger as any).isClosing).toBe(true);
      
      // Should not attempt to log after closing
      jest.clearAllMocks();
      await logger.info('Should not log after close');
      
      expect(fs.open).not.toHaveBeenCalled();
      expect(mockFileHandle.write).not.toHaveBeenCalled();
    });
    
    test('should handle close errors gracefully', async () => {
      // Setup close error
      mockFileHandle.close.mockRejectedValueOnce(new Error('Close failed'));
      
      const logger = new Logger({ 
        level: 'info', 
        format: 'text', 
        destination: 'file',
        filePath: logFilePath
      });
      
      // Force file handle creation
      await logger.info('Message before close');
      
      // Close logger (should not throw)
      await logger.close();
      
      // Should log error
      expect(console.error).toHaveBeenCalled();
      const errorCall = (console.error as jest.Mock).mock.calls[0][0];
      expect(errorCall).toContain('Error closing log file handle');
    });
  });
});