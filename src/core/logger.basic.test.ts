/**
 * Basic tests for the Logger component focusing on what we can reliably test
 */

import { Logger, LogLevel } from './logger.js';

describe('Logger Basic Tests', () => {
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
  });
  
  // Restore console after each test
  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
  
  describe('Initialization', () => {
    test('should create logger with default config', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
    });
    
    test('should throw error when file destination specified without path', () => {
      expect(() => {
        new Logger({ destination: 'file', level: 'info', format: 'text' });
      }).toThrow('File path required');
    });
    
    test('should create child logger with merged context', () => {
      const parentLogger = new Logger(
        { level: 'debug', format: 'text', destination: 'console' },
        { parent: 'value' }
      );
      
      const childLogger = parentLogger.child({ child: 'value' });
      
      // Test by logging and examining output
      childLogger.info('Child message');
      
      const loggedMessage = (console.info as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain('parent');
      expect(loggedMessage).toContain('child');
      expect(loggedMessage).toContain('Child message');
    });
  });
  
  describe('Log Level Filtering', () => {
    test('should respect log level filtering', () => {
      // Create logger with info level
      const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
      
      logger.debug('Debug message');  // Should be filtered
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });
    
    test('should pass debug messages when level is debug', () => {
      const logger = new Logger({ level: 'debug', format: 'text', destination: 'console' });
      
      logger.debug('Debug message');
      
      expect(console.debug).toHaveBeenCalledTimes(1);
    });
    
    test('should only show error messages when level is error', () => {
      const logger = new Logger({ level: 'error', format: 'text', destination: 'console' });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');
      
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Message Formatting', () => {
    test('should format messages as JSON when format is json', () => {
      const logger = new Logger({ level: 'info', format: 'json', destination: 'console' });
      
      logger.info('JSON message');
      
      const loggedJson = (console.info as jest.Mock).mock.calls[0][0];
      expect(() => JSON.parse(loggedJson)).not.toThrow();
      
      const parsed = JSON.parse(loggedJson);
      expect(parsed.message).toBe('JSON message');
      expect(parsed.level).toBe('INFO');
      expect(parsed.timestamp).toBeDefined();
    });
    
    test('should format messages as text when format is text', () => {
      const logger = new Logger({ level: 'info', format: 'text', destination: 'console' });
      
      logger.info('Text message');
      
      const loggedText = (console.info as jest.Mock).mock.calls[0][0];
      expect(loggedText).toContain('INFO');
      expect(loggedText).toContain('Text message');
      expect(loggedText).toContain('['); // Timestamp bracket
    });
    
    test('should include context in messages', () => {
      const logger = new Logger(
        { level: 'info', format: 'json', destination: 'console' },
        { service: 'test-service', requestId: '123' }
      );
      
      logger.info('Context message');
      
      const loggedJson = (console.info as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(loggedJson);
      
      expect(parsed.context.service).toBe('test-service');
      expect(parsed.context.requestId).toBe('123');
    });
    
    test('should format errors properly in JSON format', () => {
      const logger = new Logger({ level: 'error', format: 'json', destination: 'console' });
      const testError = new Error('Test error message');
      
      logger.error('Error occurred', testError);
      
      const loggedJson = (console.error as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(loggedJson);
      
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Test error message');
      expect(parsed.error.stack).toBeDefined();
    });
    
    test('should format errors properly in text format', () => {
      const logger = new Logger({ level: 'error', format: 'text', destination: 'console' });
      const testError = new Error('Test error message');
      
      logger.error('Error occurred', testError);
      
      const loggedText = (console.error as jest.Mock).mock.calls[0][0];
      
      expect(loggedText).toContain('ERROR');
      expect(loggedText).toContain('Error occurred');
      expect(loggedText).toContain('Test error message');
    });
    
    test('should handle additional data in logs', () => {
      const logger = new Logger({ level: 'info', format: 'json', destination: 'console' });
      const userData = { id: 123, name: 'Test User' };
      
      logger.info('User data', userData);
      
      const loggedJson = (console.info as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(loggedJson);
      
      expect(parsed.data.id).toBe(123);
      expect(parsed.data.name).toBe('Test User');
    });
  });
});