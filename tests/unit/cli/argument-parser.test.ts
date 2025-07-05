/**
 * Unit tests for CLI Argument Parser
 */

import { describe, it, expect, jest } from '@jest/globals';

// Interface for argument parsing
interface ICommandArgs {
  command: string;
  subcommand?: string;
  options: Record<string, any>;
  args: string[];
}

// Mock argument parser implementation
class ArgumentParser {
  parse(args: string[]): ICommandArgs {
    // Default values
    const result: ICommandArgs = {
      command: '',
      options: {},
      args: []
    };
    
    // Extract non-option arguments (those not starting with --)
    const nonOptionArgs = args.filter(arg => !arg.startsWith('--'));
    
    // Extract options (--key=value or --flag)
    const options: Record<string, any> = {};
    args.filter(arg => arg.startsWith('--')).forEach(arg => {
      const opt = arg.substring(2); // Remove the -- prefix
      
      if (opt.includes('=')) {
        // Option with value (--key=value)
        const [key, value] = opt.split('=');
        options[key] = value;
      } else {
        // Flag option (--flag)
        options[opt] = true;
      }
    });
    
    // Assign command and subcommand if they exist
    if (nonOptionArgs.length > 0) {
      result.command = nonOptionArgs[0];
      
      if (nonOptionArgs.length > 1) {
        result.subcommand = nonOptionArgs[1];
        result.args = nonOptionArgs.slice(2);
      } else {
        result.args = [];
      }
    }
    
    result.options = options;
    
    return result;
  }
}

// Tests
describe('ArgumentParser', () => {
  let parser: ArgumentParser;
  
  beforeEach(() => {
    parser = new ArgumentParser();
  });
  
  describe('Command Parsing', () => {
    it('should parse a simple command', () => {
      const result = parser.parse(['status']);
      
      expect(result.command).toBe('status');
      expect(result.subcommand).toBeUndefined();
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({});
    });
    
    it('should parse command with subcommand', () => {
      const result = parser.parse(['agent', 'create']);
      
      expect(result.command).toBe('agent');
      expect(result.subcommand).toBe('create');
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({});
    });
    
    it('should parse command with subcommand and positional args', () => {
      const result = parser.parse(['agent', 'create', 'agent1', 'researcher']);
      
      expect(result.command).toBe('agent');
      expect(result.subcommand).toBe('create');
      expect(result.args).toEqual(['agent1', 'researcher']);
      expect(result.options).toEqual({});
    });
  });
  
  describe('Option Parsing', () => {
    it('should parse flag options', () => {
      const result = parser.parse(['status', '--verbose', '--json']);
      
      expect(result.command).toBe('status');
      expect(result.options).toEqual({
        verbose: true,
        json: true
      });
    });
    
    it('should parse key-value options', () => {
      const result = parser.parse(['config', 'set', '--key=value', '--count=42']);
      
      expect(result.command).toBe('config');
      expect(result.subcommand).toBe('set');
      expect(result.options).toEqual({
        key: 'value',
        count: '42'
      });
    });
    
    it('should handle mixed options and positional args', () => {
      const result = parser.parse([
        'swarm', 'create', 'myswarm',
        '--strategy=auto',
        '--parallel',
        '--agents=5',
        'extra', 'args'
      ]);
      
      expect(result.command).toBe('swarm');
      expect(result.subcommand).toBe('create');
      expect(result.args).toEqual(['myswarm', 'extra', 'args']);
      expect(result.options).toEqual({
        strategy: 'auto',
        parallel: true,
        agents: '5'
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = parser.parse([]);
      
      expect(result.command).toBe('');
      expect(result.subcommand).toBeUndefined();
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({});
    });
    
    it('should handle only options without command', () => {
      const result = parser.parse(['--verbose', '--config=test.json']);
      
      expect(result.command).toBe('');
      expect(result.subcommand).toBeUndefined();
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({
        verbose: true,
        config: 'test.json'
      });
    });
  });
});