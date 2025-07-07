/**
 * Unit tests for Logger
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger, LogLevel } from '../../../src/core/logger.js';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Logger', () => {
  // Setup console spies
  let consoleDebugSpy;
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  
  // Path for test log files
  let testLogPath;
  
  beforeEach(() => {
    // Mock console methods
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create temporary directory for log files
    testLogPath = path.join(os.tmpdir(), `logger-test-${Date.now()}.log`);
  });
  
  afterEach(async () => {
    // Restore console methods
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    
    // Clean up test log file
    try {
      await fs.unlink(testLogPath);
    } catch (error) {
      // Ignore file not found errors
      if (error.code !== 'ENOENT') {
        console.error(`Failed to clean up test log: ${error.message}`);
      }
    }
  });
  
  test('should log to console with default configuration', () => {
    const logger = new Logger();
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Debug should be filtered out with default info level
    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
  
  test('should respect log levels', () => {
    const logger = new Logger({ level: 'warn', format: 'json', destination: 'console' });
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    // Only warn and error should be logged
    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
  
  test('should format logs as JSON', () => {
    const logger = new Logger({ level: 'info', format: 'json', destination: 'console' });
    
    logger.info('Test message', { user: 'test' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedJson = consoleInfoSpy.mock.calls[0][0];
    
    // Parse the JSON string
    const parsed = JSON.parse(loggedJson);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('level', 'INFO');
    expect(parsed).toHaveProperty('message', 'Test message');
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toEqual({ user: 'test' });
  });
  
  test('should format logs as text', () => {
    const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
    
    logger.info('Test message', { user: 'test' });
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedText = consoleInfoSpy.mock.calls[0][0];
    
    // Check text format
    expect(loggedText).toContain('INFO');
    expect(loggedText).toContain('Test message');
    expect(loggedText).toContain('{"user":"test"}');
  });
  
  test('should handle error objects', () => {
    const logger = new Logger({ level: 'error', format: 'json', destination: 'console' });
    const testError = new Error('Test error');
    
    logger.error('Error occurred', testError);
    
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedJson = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedJson);
    
    expect(parsed.error).toHaveProperty('name', 'Error');
    expect(parsed.error).toHaveProperty('message', 'Test error');
    expect(parsed.error).toHaveProperty('stack');
  });
  
  test('should include context in logs', () => {
    const logger = new Logger(
      { level: 'info', format: 'json', destination: 'console' },
      { component: 'test-component', requestId: '123' }
    );
    
    logger.info('Context test');
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedJson = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedJson);
    
    expect(parsed.context).toHaveProperty('component', 'test-component');
    expect(parsed.context).toHaveProperty('requestId', '123');
  });
  
  test('should create child loggers with combined context', () => {
    const parentLogger = new Logger(
      { level: 'info', format: 'json', destination: 'console' },
      { component: 'parent' }
    );
    
    const childLogger = parentLogger.child({ subcomponent: 'child' });
    childLogger.info('Child logger test');
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const loggedJson = consoleInfoSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedJson);
    
    expect(parsed.context).toHaveProperty('component', 'parent');
    expect(parsed.context).toHaveProperty('subcomponent', 'child');
  });
  
  test('should write logs to file', async () => {
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'file',
      filePath: testLogPath
    });
    
    logger.info('File test message');
    await logger.close(); // Ensure file is written and closed
    
    const logContent = await fs.readFile(testLogPath, 'utf8');
    expect(logContent).toContain('INFO');
    expect(logContent).toContain('File test message');
  });
  
  test('should write to both console and file', async () => {
    const logger = new Logger({
      level: 'info',
      format: 'text',
      destination: 'both',
      filePath: testLogPath
    });
    
    logger.info('Both destinations test');
    await logger.close();
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    const logContent = await fs.readFile(testLogPath, 'utf8');
    expect(logContent).toContain('Both destinations test');
  });
  
  test('should reconfigure logger settings', async () => {
    const logger = new Logger({
      level: 'error',
      format: 'json',
      destination: 'console'
    });
    
    logger.info('Should not be logged');
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    
    await logger.configure({
      level: 'info',
      format: 'text',
      destination: 'console'
    });
    
    logger.info('Should be logged now');
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
  });
  
  test('should get singleton instance', () => {
    const instance1 = Logger.getInstance({
      level: 'info',
      format: 'json',
      destination: 'console'
    });
    
    const instance2 = Logger.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('should throw error if no config for singleton in test environment', () => {
    // Save original environment
    const originalEnv = process.env.CLAUDE_FLOW_ENV;
    process.env.CLAUDE_FLOW_ENV = 'test';
    
    // Clear singleton instance if exists
    if ('instance' in Logger) {
      delete Logger.instance;
    }
    
    expect(() => {
      Logger.getInstance();
    }).toThrow('Logger configuration required for initialization');
    
    // Restore original environment
    process.env.CLAUDE_FLOW_ENV = originalEnv;
  });
  
  test('should validate file path for file destination', () => {
    expect(() => {
      new Logger({
        level: 'info',
        format: 'json',
        destination: 'file'
        // Missing filePath
      });
    }).toThrow('File path required for file logging');
  });
});