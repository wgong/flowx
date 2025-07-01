/**
 * Modern CLI Architecture
 * Provides command composition, middleware, validation, and error handling
 */

import { EventEmitter } from 'node:events';

export interface ValidationRule {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

// Simple interfaces for the CLI system
export interface CLILogger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, error?: unknown): void;
}

export interface CLIContainer {
  resolve<T>(name: string): Promise<T>;
  has(name: string): boolean;
}

export interface CLIValidator {
  validate(value: any, rule: any): { valid: boolean; errors: any[]; value?: any };
}

export interface CLIContext {
  container: CLIContainer;
  logger: CLILogger;
  validator: CLIValidator;
  args: string[];
  options: Record<string, any>;
  command: string;
  subcommand?: string;
  workingDirectory: string;
  environment: Record<string, string>;
  user: {
    id?: string;
    name?: string;
    preferences?: Record<string, any>;
  };
}

export interface CLICommand {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  aliases?: string[];
  category?: string;
  hidden?: boolean;
  
  // Validation
  arguments?: ArgumentDefinition[];
  options?: OptionDefinition[];
  
  // Middleware
  middleware?: CLIMiddleware[];
  
  // Execution
  handler: (context: CLIContext) => Promise<any> | any;
  
  // Subcommands
  subcommands?: CLICommand[];
}

export interface ArgumentDefinition {
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
  validation?: ValidationRule;
  default?: any;
}

export interface OptionDefinition {
  name: string;
  short?: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: any;
  choices?: string[];
  validation?: ValidationRule;
}

export interface CLIMiddleware {
  name: string;
  handler: (context: CLIContext, next: () => Promise<any>) => Promise<any>;
  priority?: number;
}

export interface CLIError extends Error {
  code: string;
  exitCode: number;
  context?: any;
  suggestions?: string[];
}

export class CLIApplication extends EventEmitter {
  private commands = new Map<string, CLICommand>();
  private middleware: CLIMiddleware[] = [];
  private globalOptions: OptionDefinition[] = [];

  constructor(
    private container: CLIContainer,
    private logger: CLILogger,
    private validator: CLIValidator
  ) {
    super();
    this.setupGlobalOptions();
    this.setupGlobalMiddleware();
  }

  /**
   * Register a command
   */
  command(command: CLICommand): this {
    // Validate command definition
    this.validateCommand(command);
    
    // Register main command
    this.commands.set(command.name, command);
    
    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command);
      }
    }

    // Register subcommands
    if (command.subcommands) {
      for (const subcommand of command.subcommands) {
        const fullName = `${command.name}:${subcommand.name}`;
        this.commands.set(fullName, subcommand);
      }
    }

    return this;
  }

  /**
   * Register multiple commands
   */
  registerCommands(commands: CLICommand[]): this {
    commands.forEach(cmd => this.command(cmd));
    return this;
  }

  /**
   * Register global middleware
   */
  use(middleware: CLIMiddleware): this {
    this.middleware.push(middleware);
    this.middleware.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return this;
  }

  /**
   * Add global option
   */
  option(option: OptionDefinition): this {
    this.globalOptions.push(option);
    return this;
  }

  /**
   * Execute a command
   */
  async execute(args: string[]): Promise<any> {
    try {
      // Parse command and arguments
      const { command, subcommand, parsedArgs, options } = this.parseArgs(args);
      
      // Find command
      const cmd = this.findCommand(command, subcommand);
      if (!cmd) {
        throw this.createError(
          `Command not found: ${command}${subcommand ? `:${subcommand}` : ''}`,
          'COMMAND_NOT_FOUND',
          1,
          { command, subcommand }
        );
      }

      // Create context
      const context: CLIContext = {
        container: this.container,
        logger: this.logger,
        validator: this.validator,
        args: parsedArgs,
        options,
        command,
        subcommand,
        workingDirectory: process.cwd(),
        environment: process.env as Record<string, string>,
        user: {
          ...(process.env.USER && { id: process.env.USER }),
          ...(process.env.USERNAME && !process.env.USER && { id: process.env.USERNAME }),
          ...(process.env.USER && { name: process.env.USER }),
          ...(process.env.USERNAME && !process.env.USER && { name: process.env.USERNAME })
        }
      };

      // Validate arguments and options
      await this.validateInput(cmd, context);

      // Execute middleware chain
      const result = await this.executeMiddleware(cmd, context);
      
      this.emit('commandExecuted', { command: cmd.name, result, context });
      return result;

    } catch (error) {
      this.emit('commandError', { error, args });
      throw error;
    }
  }

  /**
   * Get command help
   */
  getHelp(commandName?: string): string {
    if (commandName) {
      const cmd = this.commands.get(commandName);
      if (!cmd) {
        return `Command not found: ${commandName}`;
      }
      return this.formatCommandHelp(cmd);
    }

    return this.formatGlobalHelp();
  }

  /**
   * Get all commands
   */
  getCommands(): CLICommand[] {
    const unique = new Map<string, CLICommand>();
    
    for (const [name, cmd] of this.commands) {
      if (!unique.has(cmd.name)) {
        unique.set(cmd.name, cmd);
      }
    }

    return Array.from(unique.values())
      .filter(cmd => !cmd.hidden)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private parseArgs(args: string[]): {
    command: string;
    subcommand?: string;
    parsedArgs: string[];
    options: Record<string, any>;
  } {
    if (args.length === 0) {
      throw this.createError('No command provided', 'NO_COMMAND', 1);
    }

    const command = args[0];
    let subcommand: string | undefined;
    let startIndex = 1;

    // Check for subcommand
    if (args.length > 1 && !args[1].startsWith('-')) {
      const fullCommand = `${command}:${args[1]}`;
      if (this.commands.has(fullCommand)) {
        subcommand = args[1];
        startIndex = 2;
      }
    }

    // Parse options and arguments
    const options: Record<string, any> = {};
    const parsedArgs: string[] = [];

    for (let i = startIndex; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Long option
        const [key, value] = arg.slice(2).split('=', 2);
        if (value !== undefined) {
          options[key] = value;
        } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options[key] = args[++i];
        } else {
          options[key] = true;
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        // Short option(s)
        const flags = arg.slice(1);
        for (let j = 0; j < flags.length; j++) {
          const flag = flags[j];
          if (j === flags.length - 1 && i + 1 < args.length && !args[i + 1].startsWith('-')) {
            options[flag] = args[++i];
          } else {
            options[flag] = true;
          }
        }
      } else {
        // Argument
        parsedArgs.push(arg);
      }
    }

    return { command, subcommand, parsedArgs, options };
  }

  private findCommand(command: string, subcommand?: string): CLICommand | undefined {
    if (subcommand) {
      return this.commands.get(`${command}:${subcommand}`);
    }
    return this.commands.get(command);
  }

  private async validateInput(cmd: CLICommand, context: CLIContext): Promise<void> {
    const errors: string[] = [];

    // Validate arguments
    if (cmd.arguments) {
      for (let i = 0; i < cmd.arguments.length; i++) {
        const argDef = cmd.arguments[i];
        const value = context.args[i];

        if (argDef.required && value === undefined) {
          errors.push(`Required argument '${argDef.name}' is missing`);
          continue;
        }

        if (value !== undefined && argDef.validation) {
          const result = this.validator.validate(value, argDef.validation);
          if (!result.valid) {
            errors.push(...result.errors.map(e => `Argument '${argDef.name}': ${e.message}`));
          } else {
            context.args[i] = result.value;
          }
        }
      }
    }

    // Validate options
    const allOptions = [...this.globalOptions, ...(cmd.options || [])];
    for (const optDef of allOptions) {
      const value = context.options[optDef.name] || context.options[optDef.short || ''];

      if (optDef.required && value === undefined) {
        errors.push(`Required option '--${optDef.name}' is missing`);
        continue;
      }

      if (value !== undefined) {
        // Type conversion
        let convertedValue = value;
        if (optDef.type === 'number' && typeof value === 'string') {
          convertedValue = parseFloat(value);
          if (isNaN(convertedValue)) {
            errors.push(`Option '--${optDef.name}' must be a number`);
            continue;
          }
        }

        // Choices validation
        if (optDef.choices && !optDef.choices.includes(convertedValue)) {
          errors.push(`Option '--${optDef.name}' must be one of: ${optDef.choices.join(', ')}`);
          continue;
        }

        // Custom validation
        if (optDef.validation) {
          const result = this.validator.validate(convertedValue, optDef.validation);
          if (!result.valid) {
            errors.push(...result.errors.map(e => `Option '--${optDef.name}': ${e.message}`));
          } else {
            context.options[optDef.name] = result.value;
          }
        } else {
          context.options[optDef.name] = convertedValue;
        }
      }
    }

    if (errors.length > 0) {
      throw this.createError(
        `Validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`,
        'VALIDATION_FAILED',
        1,
        { errors }
      );
    }
  }

  private async executeMiddleware(cmd: CLICommand, context: CLIContext): Promise<any> {
    const allMiddleware = [
      ...this.middleware,
      ...(cmd.middleware || [])
    ].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let index = 0;

    const next = async (): Promise<any> => {
      if (index < allMiddleware.length) {
        const middleware = allMiddleware[index++];
        return await middleware.handler(context, next);
      } else {
        // Execute command handler
        return await cmd.handler(context);
      }
    };

    return await next();
  }

  private validateCommand(command: CLICommand): void {
    if (!command.name || typeof command.name !== 'string') {
      throw new Error('Command name is required and must be a string');
    }

    if (!command.handler || typeof command.handler !== 'function') {
      throw new Error('Command handler is required and must be a function');
    }

    if (command.arguments) {
      const requiredAfterOptional = command.arguments.some((arg, i) => 
        arg.required && command.arguments!.slice(0, i).some(prev => !prev.required)
      );
      
      if (requiredAfterOptional) {
        throw new Error('Required arguments cannot come after optional arguments');
      }
    }
  }

  private formatCommandHelp(cmd: CLICommand): string {
    let help = `${cmd.name} - ${cmd.description}\n\n`;

    if (cmd.usage) {
      help += `Usage: ${cmd.usage}\n\n`;
    }

    if (cmd.arguments && cmd.arguments.length > 0) {
      help += 'Arguments:\n';
      for (const arg of cmd.arguments) {
        const required = arg.required ? '' : '?';
        help += `  ${arg.name}${required}  ${arg.description}\n`;
      }
      help += '\n';
    }

    if (cmd.options && cmd.options.length > 0) {
      help += 'Options:\n';
      for (const opt of cmd.options) {
        const short = opt.short ? `-${opt.short}, ` : '    ';
        help += `  ${short}--${opt.name}  ${opt.description}\n`;
      }
      help += '\n';
    }

    if (cmd.examples && cmd.examples.length > 0) {
      help += 'Examples:\n';
      for (const example of cmd.examples) {
        help += `  ${example}\n`;
      }
      help += '\n';
    }

    return help;
  }

  private formatGlobalHelp(): string {
    let help = 'Available commands:\n\n';

    const commands = this.getCommands();
    const categories = new Map<string, CLICommand[]>();

    // Group by category
    for (const cmd of commands) {
      const category = cmd.category || 'General';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(cmd);
    }

    // Format each category
    for (const [category, cmds] of categories) {
      help += `${category}:\n`;
      for (const cmd of cmds) {
        help += `  ${cmd.name.padEnd(20)} ${cmd.description}\n`;
      }
      help += '\n';
    }

    return help;
  }

  private createError(message: string, code: string, exitCode: number, context?: any): CLIError {
    const error = new Error(message) as CLIError;
    error.code = code;
    error.exitCode = exitCode;
    error.context = context;
    return error;
  }

  private setupGlobalOptions(): void {
    this.globalOptions = [
      {
        name: 'help',
        short: 'h',
        description: 'Show help information',
        type: 'boolean'
      },
      {
        name: 'version',
        short: 'v',
        description: 'Show version information',
        type: 'boolean'
      },
      {
        name: 'verbose',
        description: 'Enable verbose logging',
        type: 'boolean'
      },
      {
        name: 'quiet',
        short: 'q',
        description: 'Suppress output',
        type: 'boolean'
      },
      {
        name: 'config',
        short: 'c',
        description: 'Configuration file path',
        type: 'string'
      }
    ];
  }

  private setupGlobalMiddleware(): void {
    // Help middleware
    this.use({
      name: 'help',
      priority: 1000,
      handler: async (context, next) => {
        if (context.options.help) {
          const help = this.getHelp(context.command);
          console.log(help);
          return;
        }
        return await next();
      }
    });

    // Version middleware
    this.use({
      name: 'version',
      priority: 999,
      handler: async (context, next) => {
        if (context.options.version) {
          const version = process.env.npm_package_version || '1.0.0';
          console.log(`claude-flow v${version}`);
          return;
        }
        return await next();
      }
    });

    // Logging middleware
    this.use({
      name: 'logging',
      priority: 900,
      handler: async (context, next) => {
        const start = Date.now();
        
        if (context.options.verbose) {
          context.logger.info('Executing command', {
            command: context.command,
            subcommand: context.subcommand,
            args: context.args,
            options: context.options
          });
        }

        try {
          const result = await next();
          
          if (context.options.verbose) {
            context.logger.info('Command completed', {
              command: context.command,
              duration: Date.now() - start
            });
          }
          
          return result;
        } catch (error) {
          context.logger.error('Command failed', {
            command: context.command,
            error: error instanceof Error ? error.message : error,
            duration: Date.now() - start
          });
          throw error;
        }
      }
    });
  }
} 