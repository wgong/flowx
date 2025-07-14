/**
 * Unit tests for CLI Application class
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Define mocks for testing
const mockCommandRegistry = {
  register: jest.fn(),
  execute: jest.fn() as jest.Mock,
  get: jest.fn(),
  getAll: jest.fn()
};

const mockOutputFormatter = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  table: jest.fn(),
  json: jest.fn()
};

const mockArgumentParser = {
  parse: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

// CLI Application class for testing
class CLIApplication {
  public commandRegistry: any;
  public outputFormatter: any;
  public argumentParser: any;
  public logger: any;
  
  constructor(options: {
    commandRegistry: any;
    outputFormatter: any;
    argumentParser: any;
    logger: any;
  }) {
    this.commandRegistry = options.commandRegistry;
    this.outputFormatter = options.outputFormatter;
    this.argumentParser = options.argumentParser;
    this.logger = options.logger;
  }
  
  async run(args: string[]): Promise<number> {
    try {
      const parsedArgs = this.argumentParser.parse(args);
      
      // Handle special cases
      if (parsedArgs.options.help || parsedArgs.options.h) {
        return this.showHelp(parsedArgs.command);
      }
      
      if (parsedArgs.options.version || parsedArgs.options.v) {
        return this.showVersion();
      }
      
      // Handle no command
      if (!parsedArgs.command) {
        this.outputFormatter.error('No command specified');
        return 1;
      }
      
      // Execute command
      try {
        await this.commandRegistry.execute(parsedArgs.command, parsedArgs);
        return 0;
      } catch (error) {
        this.outputFormatter.error(`Error executing command: ${(error as any).message}`);
        this.logger.error('Command execution failed', { error });
        return 1;
      }
    } catch (error) {
      this.outputFormatter.error(`Application error: ${(error as any).message}`);
      this.logger.error('Application error', { error });
      return 1;
    }
  }
  
  showHelp(command?: string): number {
    if (command) {
      const cmd = this.commandRegistry.get(command);
      if (cmd) {
        this.outputFormatter.info(cmd.getHelp());
      } else {
        this.outputFormatter.error(`Unknown command: ${command}`);
        return 1;
      }
    } else {
      const allCommands = this.commandRegistry.getAll();
      this.outputFormatter.info('Available commands:');
      this.outputFormatter.table(
        allCommands.map((cmd: any) => ({ 
          name: cmd.name, 
          description: cmd.description 
        }))
      );
    }
    
    return 0;
  }
  
  showVersion(): number {
    this.outputFormatter.info('v1.0.0'); // Mock version
    return 0;
  }
}

// Tests
describe('CLIApplication', () => {
  let app: CLIApplication;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    app = new CLIApplication({
      commandRegistry: mockCommandRegistry,
      outputFormatter: mockOutputFormatter,
      argumentParser: mockArgumentParser,
      logger: mockLogger
    });
  });
  
  describe('Command Execution', () => {
    it('should successfully execute a valid command', async () => {
      mockArgumentParser.parse.mockReturnValue({
        command: 'status',
        options: {},
        args: []
      });
      
      mockCommandRegistry.execute.mockResolvedValue(null);
      
      const exitCode = await app.run(['status']);
      
      expect(mockArgumentParser.parse).toHaveBeenCalledWith(['status']);
      expect(mockCommandRegistry.execute).toHaveBeenCalledWith('status', {
        command: 'status',
        options: {},
        args: []
      });
      expect(exitCode).toBe(0);
    });
    
    it('should handle command execution errors', async () => {
      mockArgumentParser.parse.mockReturnValue({
        command: 'invalid',
        options: {},
        args: []
      });
      
      const error = new Error('Command not found');
      mockCommandRegistry.execute.mockRejectedValue(error);
      
      const exitCode = await app.run(['invalid']);
      
      expect(mockOutputFormatter.error).toHaveBeenCalledWith(
        'Error executing command: Command not found'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Command execution failed',
        { error }
      );
      expect(exitCode).toBe(1);
    });
    
    it('should handle missing command', async () => {
      mockArgumentParser.parse.mockReturnValue({
        command: '',
        options: {},
        args: []
      });
      
      const exitCode = await app.run([]);
      
      expect(mockOutputFormatter.error).toHaveBeenCalledWith('No command specified');
      expect(exitCode).toBe(1);
    });
  });
  
  describe('Help Output', () => {
    it('should show general help when --help is specified', async () => {
      mockArgumentParser.parse.mockReturnValue({
        command: '',
        options: { help: true },
        args: []
      });
      
      const mockCommands = [
        { name: 'status', description: 'Show status' },
        { name: 'config', description: 'Manage configuration' }
      ];
      
      mockCommandRegistry.getAll.mockReturnValue(mockCommands);
      
      const exitCode = await app.run(['--help']);
      
      expect(mockOutputFormatter.info).toHaveBeenCalledWith('Available commands:');
      expect(mockOutputFormatter.table).toHaveBeenCalledWith(mockCommands);
      expect(exitCode).toBe(0);
    });
    
    it('should show command-specific help', async () => {
      mockArgumentParser.parse.mockReturnValue({
        command: 'status',
        options: { help: true },
        args: []
      });
      
      const mockCommand = {
        name: 'status',
        description: 'Show status',
        getHelp: () => 'status: Show system status'
      };
      
      mockCommandRegistry.get.mockReturnValue(mockCommand);
      
      const exitCode = await app.run(['status', '--help']);
      
      expect(mockCommandRegistry.get).toHaveBeenCalledWith('status');
      expect(mockOutputFormatter.info).toHaveBeenCalledWith('status: Show system status');
      expect(exitCode).toBe(0);
    });
    
    it('should handle help for unknown command', async () => {
      mockArgumentParser.parse.mockReturnValue({
        command: 'unknown',
        options: { help: true },
        args: []
      });
      
      mockCommandRegistry.get.mockReturnValue(undefined);
      
      const exitCode = await app.run(['unknown', '--help']);
      
      expect(mockOutputFormatter.error).toHaveBeenCalledWith('Unknown command: unknown');
      expect(exitCode).toBe(1);
    });
  });
  
  describe('Version Output', () => {
    it('should show version when --version is specified', async () => {
      mockArgumentParser.parse.mockReturnValue({
        command: '',
        options: { version: true },
        args: []
      });
      
      const exitCode = await app.run(['--version']);
      
      expect(mockOutputFormatter.info).toHaveBeenCalledWith('v1.0.0');
      expect(exitCode).toBe(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle application errors', async () => {
      const error = new Error('Application error');
      mockArgumentParser.parse.mockImplementation(() => {
        throw error;
      });
      
      const exitCode = await app.run(['status']);
      
      expect(mockOutputFormatter.error).toHaveBeenCalledWith(
        'Application error: Application error'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Application error',
        { error }
      );
      expect(exitCode).toBe(1);
    });
  });
});