/**
 * Tests for the Logger
 */

import { Logger, LogLevel } from './logger.js';

describe('Logger', () => {
  // Save original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  // Mock console methods
  beforeEach(() => {
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  // Restore console methods
  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  test('should create logger with default config', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
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
  });

  test('should format log messages based on config', () => {
    // Test JSON format
    const jsonLogger = new Logger({ 
      level: 'info', 
      format: 'json', 
      destination: 'console' 
    });
    
    jsonLogger.info('JSON message');
    const jsonMessage = (console.info as jest.Mock).mock.calls[0][0];
    expect(() => JSON.parse(jsonMessage)).not.toThrow();
    
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
});