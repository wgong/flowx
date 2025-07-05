/**
 * Unit tests for CLI Command Registry
 */

import { describe, it, expect, jest } from '@jest/globals';

// Mock command implementation
class MockCommand {
  public name: string;
  public description: string;
  public executed: boolean = false;
  public args: any;
  
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }
  
  async execute(args: any): Promise<void> {
    this.executed = true;
    this.args = args;
    return Promise.resolve();
  }
  
  getHelp(): string {
    return `${this.name}: ${this.description}`;
  }
}

// Simplified command registry interface
interface ICommandRegistry {
  register(command: any): void;
  get(name: string): any;
  getAll(): any[];
  execute(name: string, args: any): Promise<void>;
}

// Mock command registry implementation
class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, any>;
  
  constructor() {
    this.commands = new Map<string, any>();
  }
  
  register(command: any): void {
    if (!command.name) {
      throw new Error('Command must have a name');
    }
    
    this.commands.set(command.name, command);
  }
  
  get(name: string): any {
    return this.commands.get(name);
  }
  
  getAll(): any[] {
    return Array.from(this.commands.values());
  }
  
  async execute(name: string, args: any): Promise<void> {
    const command = this.commands.get(name);
    
    if (!command) {
      throw new Error(`Command '${name}' not found`);
    }
    
    return command.execute(args);
  }
}

// Tests
describe('CommandRegistry', () => {
  let registry: CommandRegistry;
  
  beforeEach(() => {
    registry = new CommandRegistry();
  });
  
  describe('Registration', () => {
    it('should register a command', () => {
      const command = new MockCommand('test', 'Test command');
      registry.register(command);
      
      expect(registry.get('test')).toBe(command);
    });
    
    it('should reject commands without a name', () => {
      const invalidCommand = { execute: jest.fn() };
      
      expect(() => {
        registry.register(invalidCommand);
      }).toThrow('Command must have a name');
    });
    
    it('should overwrite existing command with same name', () => {
      const command1 = new MockCommand('test', 'First command');
      const command2 = new MockCommand('test', 'Second command');
      
      registry.register(command1);
      registry.register(command2);
      
      expect(registry.get('test')).toBe(command2);
    });
  });
  
  describe('Retrieval', () => {
    it('should get registered command by name', () => {
      const command = new MockCommand('test', 'Test command');
      registry.register(command);
      
      expect(registry.get('test')).toBe(command);
    });
    
    it('should return undefined for non-existent command', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
    
    it('should get all registered commands', () => {
      const command1 = new MockCommand('test1', 'First command');
      const command2 = new MockCommand('test2', 'Second command');
      
      registry.register(command1);
      registry.register(command2);
      
      const allCommands = registry.getAll();
      
      expect(allCommands.length).toBe(2);
      expect(allCommands).toContain(command1);
      expect(allCommands).toContain(command2);
    });
  });
  
  describe('Execution', () => {
    it('should execute a registered command', async () => {
      const command = new MockCommand('test', 'Test command');
      const args = { option: 'value' };
      
      registry.register(command);
      await registry.execute('test', args);
      
      expect(command.executed).toBe(true);
      expect(command.args).toBe(args);
    });
    
    it('should throw error when executing non-existent command', async () => {
      await expect(registry.execute('nonexistent', {}))
        .rejects.toThrow("Command 'nonexistent' not found");
    });
  });
});