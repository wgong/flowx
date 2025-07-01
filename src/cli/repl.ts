/**
 * Enhanced Interactive REPL for Claude-Flow
 */

import * as readline from 'readline';
import { AgentProfile, Task } from "../utils/types.js";
import { generateId } from "../utils/helpers.js";
import { formatStatusIndicator, formatDuration, formatProgressBar } from "./formatter.js";
import * as fs from 'fs/promises';

// Color utilities with bold combinations
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
};

// Color combination helpers
const colorCombinations = {
  cyanBold: (text: string) => `\x1b[1;36m${text}\x1b[0m`,
  greenBold: (text: string) => `\x1b[1;32m${text}\x1b[0m`,
  whiteBold: (text: string) => `\x1b[1;37m${text}\x1b[0m`,
  yellowBold: (text: string) => `\x1b[1;33m${text}\x1b[0m`,
  blueBold: (text: string) => `\x1b[1;34m${text}\x1b[0m`,
  redBold: (text: string) => `\x1b[1;31m${text}\x1b[0m`,
  grayBold: (text: string) => `\x1b[1;90m${text}\x1b[0m`
};

// Add bold variants to colors object
Object.assign(colors, {
  cyan: Object.assign(colors.cyan, {
    bold: colorCombinations.cyanBold
  }),
  green: Object.assign(colors.green, {
    bold: colorCombinations.greenBold
  }),
  white: Object.assign(colors.white, {
    bold: colorCombinations.whiteBold
  }),
  yellow: Object.assign(colors.yellow, {
    bold: colorCombinations.yellowBold
  }),
  blue: Object.assign(colors.blue, {
    bold: colorCombinations.blueBold
  }),
  red: Object.assign(colors.red, {
    bold: colorCombinations.redBold
  }),
  gray: Object.assign(colors.gray, {
    bold: colorCombinations.grayBold
  })
});

// Simple table utility
class Table {
  private headers: string[] = [];
  private rows: string[][] = [];
  private hasBorder: boolean = false;

  constructor() {}

  header(headers: string[]): this {
    this.headers = headers;
    return this;
  }

  body(rows: string[][]): this {
    this.rows = rows;
    return this;
  }

  push(row: string[]): this {
    this.rows.push(row);
    return this;
  }

  border(enabled: boolean): this {
    this.hasBorder = enabled;
    return this;
  }

  render(): void {
    console.log(this.toString());
  }

  toString(): string {
    if (this.headers.length === 0 && this.rows.length === 0) {
      return '';
    }

    const allRows = this.headers.length > 0 ? [this.headers, ...this.rows] : this.rows;
    const colWidths = this.headers.map((_, i) => 
      Math.max(...allRows.map(row => (row[i] || '').length))
    );

    let result = '';
    
    if (this.headers.length > 0) {
      result += this.headers.map((header, i) => header.padEnd(colWidths[i])).join(' | ') + '\n';
      result += colWidths.map(width => '-'.repeat(width)).join('-+-') + '\n';
    }

    for (const row of this.rows) {
      result += row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ') + '\n';
    }

    return result;
  }
}

// Simple prompt utilities
async function Input(options: { message: string; default?: string }): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`${options.message}${options.default ? ` (${options.default})` : ''}: `, (answer) => {
      rl.close();
      resolve(answer || options.default || '');
    });
  });
}

async function Confirm(options: { message: string; default?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const defaultText = options.default !== undefined ? (options.default ? ' (Y/n)' : ' (y/N)') : ' (y/n)';
    rl.question(`${options.message}${defaultText}: `, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase();
      if (normalized === 'y' || normalized === 'yes') {
        resolve(true);
      } else if (normalized === 'n' || normalized === 'no') {
        resolve(false);
      } else {
        resolve(options.default || false);
      }
    });
  });
}

async function Select(options: { message: string; options: string[] }): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log(options.message);
    options.options.forEach((option, i) => {
      console.log(`${i + 1}. ${option}`);
    });
    
    rl.question('Select option (number): ', (answer) => {
      rl.close();
      const index = parseInt(answer) - 1;
      if (index >= 0 && index < options.options.length) {
        resolve(options.options[index]);
      } else {
        resolve(options.options[0]);
      }
    });
  });
}

interface REPLCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  examples?: string[];
  handler: (args: string[], context: REPLContext) => Promise<void>;
}

interface REPLContext {
  options: any;
  history: string[];
  workingDirectory: string;
  currentSession?: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  lastActivity: Date;
}

class CommandHistory {
  private history: string[] = [];
  private maxSize = 1000;
  private historyFile: string;

  constructor(historyFile?: string) {
    this.historyFile = historyFile || '.claude-flow-history';
    this.loadHistory();
  }

  add(command: string): void {
    if (command.trim() && command !== this.history[this.history.length - 1]) {
      this.history.push(command);
      if (this.history.length > this.maxSize) {
        this.history = this.history.slice(-this.maxSize);
      }
      this.saveHistory();
    }
  }

  get(): string[] {
    return [...this.history];
  }

  search(query: string): string[] {
    return this.history.filter(cmd => cmd.includes(query));
  }

  private async loadHistory(): Promise<void> {
    try {
      const content = await fs.readFile(this.historyFile, 'utf8');
      this.history = content.split('\n').filter(line => line.trim());
    } catch {
      // History file doesn't exist yet
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await fs.writeFile(this.historyFile, this.history.join('\n'));
    } catch {
      // Ignore save errors
    }
  }
}

class CommandCompleter {
  private commands: Map<string, REPLCommand> = new Map();
  
  setCommands(commands: REPLCommand[]): void {
    this.commands.clear();
    for (const cmd of commands) {
      this.commands.set(cmd.name, cmd);
      if (cmd.aliases && Array.isArray(cmd.aliases)) {
        for (const alias of cmd.aliases) {
          this.commands.set(alias, cmd);
        }
      }
    }
  }

  complete(input: string): string[] {
    const parts = input.trim().split(/\s+/);
    
    if (parts.length === 1) {
      // Complete command names
      const prefix = parts[0];
      return Array.from(this.commands.keys())
        .filter(name => name.startsWith(prefix))
        .sort();
    }
    
    // Complete subcommands and arguments
    const commandName = parts[0];
    const command = this.commands.get(commandName);
    
    if (command) {
      return this.completeForCommand(command, parts.slice(1));
    }
    
    return [];
  }

  private completeForCommand(command: REPLCommand, args: string[]): string[] {
    // Basic completion for known commands
    switch (command.name) {
      case 'agent':
        if (args.length === 1) {
          return ['spawn', 'list', 'terminate', 'info'].filter(sub => 
            sub.startsWith(args[0])
          );
        }
        if (args[0] === 'spawn' && args.length === 2) {
          return ['coordinator', 'researcher', 'implementer', 'analyst', 'custom']
            .filter(type => type.startsWith(args[1]));
        }
        break;
      
      case 'task':
        if (args.length === 1) {
          return ['create', 'list', 'status', 'cancel', 'workflow'].filter(sub => 
            sub.startsWith(args[0])
          );
        }
        if (args[0] === 'create' && args.length === 2) {
          return ['research', 'implementation', 'analysis', 'coordination']
            .filter(type => type.startsWith(args[1]));
        }
        break;
      
      case 'session':
        if (args.length === 1) {
          return ['list', 'save', 'restore', 'delete', 'export', 'import']
            .filter(sub => sub.startsWith(args[0]));
        }
        break;
      
      case 'workflow':
        if (args.length === 1) {
          return ['run', 'validate', 'list', 'status', 'stop', 'template']
            .filter(sub => sub.startsWith(args[0]));
        }
        break;
    }
    
    return [];
  }
}

/**
 * Start the enhanced interactive REPL
 */
export async function startREPL(options: any = {}): Promise<void> {
  const context: REPLContext = {
    options,
    history: [],
    workingDirectory: process.cwd(),
    connectionStatus: 'disconnected',
    lastActivity: new Date(),
  };

  const history = new CommandHistory(options.historyFile);
  const completer = new CommandCompleter();
  
  const commands: REPLCommand[] = [
    {
      name: 'help',
      aliases: ['h', '?'],
      description: 'Show available commands or help for a specific command',
      usage: 'help [command]',
      examples: ['help', 'help agent', 'help task create'],
      handler: async (args) => {
        if (args.length === 0) {
          showHelp(commands);
        } else {
          showCommandHelp(commands, args[0]);
        }
      },
    },
    {
      name: 'status',
      aliases: ['st'],
      description: 'Show system status and connection info',
      usage: 'status [component]',
      examples: ['status', 'status orchestrator'],
      handler: async (args, ctx) => {
        await showSystemStatus(ctx, args[0]);
      },
    },
    {
      name: 'connect',
      aliases: ['conn'],
      description: 'Connect to Claude-Flow orchestrator',
      usage: 'connect [host:port]',
      examples: ['connect', 'connect localhost:3000'],
      handler: async (args, ctx) => {
        await connectToOrchestrator(ctx, args[0]);
      },
    },
    {
      name: 'agent',
      description: 'Agent management (spawn, list, terminate, info)',
      usage: 'agent <subcommand> [options]',
      examples: [
        'agent list',
        'agent spawn researcher --name "Research Agent"',
        'agent info agent-001',
        'agent terminate agent-001'
      ],
      handler: async (args, ctx) => {
        await handleAgentCommand(args, ctx);
      },
    },
    {
      name: 'task',
      description: 'Task management (create, list, status, cancel)',
      usage: 'task <subcommand> [options]',
      examples: [
        'task list',
        'task create research "Find quantum computing papers"',
        'task status task-001',
        'task cancel task-001'
      ],
      handler: async (args, ctx) => {
        await handleTaskCommand(args, ctx);
      },
    },
    {
      name: 'memory',
      description: 'Memory operations (query, stats, export)',
      usage: 'memory <subcommand> [options]',
      examples: [
        'memory stats',
        'memory query --agent agent-001',
        'memory export memory.json'
      ],
      handler: async (args, ctx) => {
        await handleMemoryCommand(args, ctx);
      },
    },
    {
      name: 'session',
      description: 'Session management (save, restore, list)',
      usage: 'session <subcommand> [options]',
      examples: [
        'session list',
        'session save "Development Session"',
        'session restore session-001'
      ],
      handler: async (args, ctx) => {
        await handleSessionCommand(args, ctx);
      },
    },
    {
      name: 'workflow',
      description: 'Workflow operations (run, list, status)',
      usage: 'workflow <subcommand> [options]',
      examples: [
        'workflow list',
        'workflow run workflow.json',
        'workflow status workflow-001'
      ],
      handler: async (args, ctx) => {
        await handleWorkflowCommand(args, ctx);
      },
    },
    {
      name: 'monitor',
      aliases: ['mon'],
      description: 'Start monitoring mode',
      usage: 'monitor [--interval seconds]',
      examples: ['monitor', 'monitor --interval 5'],
      handler: async (args) => {
        console.log(colors.cyan('Starting monitor mode...'));
        console.log(colors.gray('(This would start the live dashboard)'));
      },
    },
    {
      name: 'history',
      aliases: ['hist'],
      description: 'Show command history',
      usage: 'history [--search query]',
      examples: ['history', 'history --search agent'],
      handler: async (args) => {
        const searchQuery = args.indexOf('--search') >= 0 ? args[args.indexOf('--search') + 1] : null;
        const historyItems = searchQuery ? history.search(searchQuery) : history.get();
        
        console.log(colorCombinations.cyanBold(`Command History${searchQuery ? ` (search: ${searchQuery})` : ''}`));
        console.log('─'.repeat(50));
        
        if (historyItems.length === 0) {
          console.log(colors.gray('No commands in history'));
          return;
        }
        
        const recent = historyItems.slice(-20); // Show last 20
        recent.forEach((cmd, i) => {
          const lineNumber = historyItems.length - recent.length + i + 1;
          console.log(`${colors.gray(lineNumber.toString().padStart(3))} ${cmd}`);
        });
      },
    },
    {
      name: 'clear',
      aliases: ['cls'],
      description: 'Clear the screen',
      handler: async () => {
        console.clear();
      },
    },
    {
      name: 'cd',
      description: 'Change working directory',
      usage: 'cd <directory>',
      examples: ['cd /path/to/project', 'cd ..'],
      handler: async (args, ctx) => {
        if (args.length === 0) {
          console.log(ctx.workingDirectory);
          return;
        }
        
        try {
          const newDir = args[0] === '~' ? process.env.HOME || '/' : args[0];
          process.chdir(newDir);
          ctx.workingDirectory = process.cwd();
          console.log(colors.gray(`Changed to: ${ctx.workingDirectory}`));
        } catch (error) {
          console.error(colors.red('Error:'), error instanceof Error ? error.message : String(error));
        }
      },
    },
    {
      name: 'pwd',
      description: 'Print working directory',
      handler: async (_, ctx) => {
        console.log(ctx.workingDirectory);
      },
    },
    {
      name: 'echo',
      description: 'Echo arguments',
      usage: 'echo <text>',
      examples: ['echo "Hello, world!"'],
      handler: async (args) => {
        console.log(args.join(' '));
      },
    },
    {
      name: 'exit',
      aliases: ['quit', 'q'],
      description: 'Exit the REPL',
      handler: async () => {
        console.log(colors.gray('Goodbye!'));
        process.exit(0);
      },
    },
  ];

  // Set up command completion
  completer.setCommands(commands);
  
  // Show initial status
  if (!options.quiet) {
    await showSystemStatus(context);
    console.log(colors.gray('Type "help" for available commands or "exit" to quit.\n'));
  }

  // Main REPL loop
  while (true) {
    try {
      const prompt = createPrompt(context);
      const input = await Input({
        message: prompt,
      });

      if (!input.trim()) {
        continue;
      }

      // Add to history
      history.add(input);
      context.history.push(input);
      context.lastActivity = new Date();

      // Parse command
      const args = parseCommand(input);
      const [commandName, ...commandArgs] = args;
      
      // Find and execute command
      const command = commands.find(c => 
        c.name === commandName || 
        (c.aliases && c.aliases.includes(commandName))
      );

      if (command) {
        try {
          await command.handler(commandArgs, context);
        } catch (error) {
          console.error(colors.red('Command failed:'), error instanceof Error ? error.message : String(error));
        }
      } else {
        console.log(colors.red(`Unknown command: ${commandName}`));
        console.log(colors.gray('Type "help" for available commands'));
        
        // Suggest similar commands
        const suggestions = findSimilarCommands(commandName, commands);
        if (suggestions.length > 0) {
          console.log(colors.gray('Did you mean:'), suggestions.map(s => colors.cyan(s)).join(', '));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('EOF') || errorMessage.includes('interrupted')) {
        // Ctrl+D or Ctrl+C pressed
        console.log('\n' + colors.gray('Goodbye!'));
        break;
      }
      console.error(colors.red('REPL Error:'), errorMessage);
    }
  }
}

function createPrompt(context: REPLContext): string {
  const statusIcon = getConnectionStatusIcon(context.connectionStatus);
  const dir = context.workingDirectory.split('/').pop() || '/';
  
  return `${statusIcon} ${colors.cyan('claude-flow')}:${colors.yellow(dir)}${colors.white('>')} `;
}

function getConnectionStatusIcon(status: string): string {
  switch (status) {
    case 'connected': return colors.green('●');
    case 'connecting': return colors.yellow('◐');
    case 'disconnected': return colors.red('○');
    default: return colors.gray('?');
  }
}

function parseCommand(input: string): string[] {
  // Handle quoted arguments
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    args.push(current);
  }
  
  return args;
}

function showHelp(commands: REPLCommand[]): void {
  console.log();
  
  console.log(colors.bold(colors.white('Available Commands:')));
  console.log();
  
  const table = new Table().header(['Command', 'Aliases', 'Description']);
  const rows: string[][] = [];

  for (const cmd of commands) {
    rows.push([
      colors.cyan(cmd.name),
      cmd.aliases ? colors.gray(cmd.aliases.join(', ')) : '',
      cmd.description
    ]);
  }
  
  table.body(rows);
  console.log(table.toString());
  console.log();
  
  console.log(colors.gray('Tips:'));
  console.log(colors.gray('• Use TAB for command completion'));
  console.log(colors.gray('• Use "help <command>" for detailed help'));
  console.log(colors.gray('• Use UP/DOWN arrows for command history'));
  console.log(colors.gray('• Use Ctrl+C or "exit" to quit'));
}

function showCommandHelp(commands: REPLCommand[], commandName: string): void {
  const command = commands.find(c => 
    c.name === commandName || 
    (c.aliases && c.aliases.includes(commandName))
  );
  
  if (!command) {
    console.log(colors.red(`Unknown command: ${commandName}`));
    return;
  }
  
  console.log(colors.bold(colors.cyan(`Command: ${command.name}`)));
  console.log('─'.repeat(30));
  console.log(`${colors.white('Description:')} ${command.description}`);
  
  if (command.aliases) {
    console.log(`${colors.white('Aliases:')} ${command.aliases.join(', ')}`);
  }
  
  if (command.usage) {
    console.log(`${colors.white('Usage:')} ${command.usage}`);
  }
  
  if (command.examples) {
    console.log();
    console.log(colors.bold(colors.white('Examples:')));
    for (const example of command.examples) {
      console.log(`  ${colors.gray('$')} ${colors.cyan(example)}`);
    }
  }
}

async function showSystemStatus(context: REPLContext, component?: string): Promise<void> {
  console.log(colors.bold(colors.cyan('System Status')));
  console.log('─'.repeat(30));
  
  const statusIcon = formatStatusIndicator(context.connectionStatus === 'connected' ? 'success' : 'error');
  console.log(`${statusIcon} Connection: ${context.connectionStatus}`);
  console.log(`${colors.white('Working Directory:')} ${context.workingDirectory}`);
  console.log(`${colors.white('Last Activity:')} ${context.lastActivity.toLocaleTimeString()}`);
  
  if (context.currentSession) {
    console.log(`${colors.white('Current Session:')} ${context.currentSession}`);
  }
  
  console.log(`${colors.white('Commands in History:')} ${context.history.length}`);
  
  if (context.connectionStatus === 'disconnected') {
    console.log();
    console.log(colors.yellow('⚠ Not connected to orchestrator'));
    console.log(colors.gray('Use "connect" command to establish connection'));
  }
}

async function connectToOrchestrator(context: REPLContext, target?: string): Promise<void> {
  const host = target || 'localhost:3000';
  
  console.log(colors.yellow(`Connecting to ${host}...`));
  context.connectionStatus = 'connecting';
  
  // Mock connection attempt
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate connection result
  const success = Math.random() > 0.3; // 70% success rate
  
  if (success) {
    context.connectionStatus = 'connected';
    console.log(colors.green('✓ Connected successfully'));
  } else {
    context.connectionStatus = 'disconnected';
    console.log(colors.red('✗ Connection failed'));
    console.log(colors.gray('Make sure Claude-Flow is running with: claude-flow start'));
  }
}

async function handleAgentCommand(args: string[], context: REPLContext): Promise<void> {
  if (context.connectionStatus !== 'connected') {
    console.log(colors.yellow('⚠ Not connected to orchestrator'));
    console.log(colors.gray('Use "connect" to establish connection first'));
    return;
  }

  if (args.length === 0) {
    console.log(colors.gray('Usage: agent <spawn|list|terminate|info> [options]'));
    return;
  }
  
  const subcommand = args[0];
  switch (subcommand) {
    case 'list':
      await showAgentList();
      break;
    case 'spawn':
      await handleAgentSpawn(args.slice(1));
      break;
    case 'terminate':
      if (args.length < 2) {
        console.log(colors.red('Please specify agent ID'));
      } else {
        await handleAgentTerminate(args[1]);
      }
      break;
    case 'info':
      if (args.length < 2) {
        console.log(colors.red('Please specify agent ID'));
      } else {
        await showAgentInfo(args[1]);
      }
      break;
    default:
      console.log(colors.red(`Unknown agent subcommand: ${subcommand}`));
  }
}

async function showAgentList(): Promise<void> {
  // Mock agent data
  const agents = [
    { id: 'agent-001', name: 'Coordinator', type: 'coordinator', status: 'active', tasks: 2 },
    { id: 'agent-002', name: 'Researcher', type: 'researcher', status: 'active', tasks: 5 },
    { id: 'agent-003', name: 'Implementer', type: 'implementer', status: 'idle', tasks: 0 },
  ];
  
  console.log(colors.bold(colors.cyan(`Active Agents (${agents.length})`)));
  console.log('─'.repeat(50));
  
  const table = new Table().header(['ID', 'Name', 'Type', 'Status', 'Tasks']);
  const rows: string[][] = [];

  for (const agent of agents) {
    const statusIcon = formatStatusIndicator(agent.status);
    
    rows.push([
      colors.gray(agent.id),
      colors.white(agent.name),
      colors.cyan(agent.type),
      `${statusIcon} ${agent.status}`,
      agent.tasks.toString()
    ]);
  }
  
  table.body(rows);
  console.log(table.toString());
}

async function handleAgentSpawn(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log(colors.gray('Usage: agent spawn <type> [name]'));
    console.log(colors.gray('Types: coordinator, researcher, implementer, analyst, custom'));
    return;
  }

  const type = args[0];
  const name = args[1] || await Input({
    message: 'Agent name:',
    default: `${type}-agent`,
  });

  console.log(colors.yellow('Spawning agent...'));
  
  // Mock spawning
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const agentId = generateId('agent');
  console.log(colors.green('✓ Agent spawned successfully'));
  console.log(`${colors.white('ID:')} ${agentId}`);
  console.log(`${colors.white('Name:')} ${name}`);
  console.log(`${colors.white('Type:')} ${type}`);
}

async function handleAgentTerminate(agentId: string): Promise<void> {
  const confirmed = await Confirm({
    message: `Terminate agent ${agentId}?`,
    default: false,
  });
  
  if (!confirmed) {
    console.log(colors.gray('Termination cancelled'));
    return;
  }
  
  console.log(colors.yellow('Terminating agent...'));
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(colors.green('✓ Agent terminated'));
}

async function showAgentInfo(agentId: string): Promise<void> {
  // Mock agent info
  console.log(colorCombinations.cyanBold('Agent Information'));
  console.log('─'.repeat(30));
  console.log(`${colors.white('ID:')} ${agentId}`);
  console.log(`${colors.white('Name:')} Research Agent`);
  console.log(`${colors.white('Type:')} researcher`);
  console.log(`${colors.white('Status:')} ${formatStatusIndicator('success')} active`);
  console.log(`${colors.white('Uptime:')} ${formatDuration(3600000)}`);
  console.log(`${colors.white('Active Tasks:')} 3`);
  console.log(`${colors.white('Completed Tasks:')} 12`);
}

async function handleTaskCommand(args: string[], context: REPLContext): Promise<void> {
  if (context.connectionStatus !== 'connected') {
    console.log(colors.yellow('⚠ Not connected to orchestrator'));
    return;
  }

  if (args.length === 0) {
    console.log(colors.gray('Usage: task <create|list|status|cancel> [options]'));
    return;
  }
  
  const subcommand = args[0];
  switch (subcommand) {
    case 'list':
      await showTaskList();
      break;
    case 'create':
      await handleTaskCreate(args.slice(1));
      break;
    case 'status':
      if (args.length < 2) {
        console.log(colors.red('Please specify task ID'));
      } else {
        await showTaskStatus(args[1]);
      }
      break;
    case 'cancel':
      if (args.length < 2) {
        console.log(colors.red('Please specify task ID'));
      } else {
        await handleTaskCancel(args[1]);
      }
      break;
    default:
      console.log(colors.red(`Unknown task subcommand: ${subcommand}`));
  }
}

async function showTaskList(): Promise<void> {
  // Mock task data
  const tasks = [
    { id: 'task-001', type: 'research', description: 'Research quantum computing', status: 'running', agent: 'agent-002' },
    { id: 'task-002', type: 'analysis', description: 'Analyze research results', status: 'pending', agent: null },
    { id: 'task-003', type: 'implementation', description: 'Implement solution', status: 'completed', agent: 'agent-003' },
  ];
  
  console.log(colorCombinations.cyanBold(`Tasks (${tasks.length})`));
  console.log('─'.repeat(60));
  
  const table = new Table().header(['ID', 'Type', 'Description', 'Status', 'Agent']);
  const rows: string[][] = [];

  for (const task of tasks) {
    const statusIcon = formatStatusIndicator(task.status);
    
    rows.push([
      colors.gray(task.id),
      colors.white(task.type),
      task.description.substring(0, 30) + (task.description.length > 30 ? '...' : ''),
      `${statusIcon} ${task.status}`,
      task.agent ? colors.cyan(task.agent) : '-'
    ]);
  }
  
  table.body(rows);
  
  console.log(table.toString());
}

async function handleTaskCreate(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.log(colors.gray('Usage: task create <type> <description>'));
    return;
  }

  const type = args[0];
  const description = args.slice(1).join(' ');
  
  console.log(colors.yellow('Creating task...'));
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const taskId = generateId('task');
  console.log(colors.green('✓ Task created successfully'));
  console.log(`${colors.white('ID:')} ${taskId}`);
  console.log(`${colors.white('Type:')} ${type}`);
  console.log(`${colors.white('Description:')} ${description}`);
}

async function showTaskStatus(taskId: string): Promise<void> {
  console.log(colorCombinations.cyanBold('Task Status'));
  console.log('─'.repeat(30));
  console.log(`${colors.white('ID:')} ${taskId}`);
  console.log(`${colors.white('Type:')} research`);
  console.log(`${colors.white('Status:')} ${formatStatusIndicator('running')} running`);
  console.log(`${colors.white('Progress:')} ${formatProgressBar(65, 100, 20)} 65%`);
  console.log(`${colors.white('Agent:')} agent-002`);
  console.log(`${colors.white('Started:')} ${new Date().toLocaleTimeString()}`);
}

async function handleTaskCancel(taskId: string): Promise<void> {
  const confirmed = await Confirm({
    message: `Cancel task ${taskId}?`,
    default: false,
  });
  
  if (!confirmed) {
    console.log(colors.gray('Cancellation cancelled'));
    return;
  }
  
  console.log(colors.yellow('Cancelling task...'));
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(colors.green('✓ Task cancelled'));
}

async function handleMemoryCommand(args: string[], context: REPLContext): Promise<void> {
  if (context.connectionStatus !== 'connected') {
    console.log(colors.yellow('⚠ Not connected to orchestrator'));
    return;
  }

  if (args.length === 0) {
    console.log(colors.gray('Usage: memory <query|stats|export> [options]'));
    return;
  }
  
  const subcommand = args[0];
  switch (subcommand) {
    case 'stats':
      await showMemoryStats();
      break;
    case 'query':
      console.log(colors.yellow('Memory query functionality not yet implemented in REPL'));
      break;
    case 'export':
      console.log(colors.yellow('Memory export functionality not yet implemented in REPL'));
      break;
    default:
      console.log(colors.red(`Unknown memory subcommand: ${subcommand}`));
  }
}

async function showMemoryStats(): Promise<void> {
  console.log(colorCombinations.cyanBold('Memory Statistics'));
  console.log('─'.repeat(30));
  console.log(`${colors.white('Total Entries:')} 1,247`);
  console.log(`${colors.white('Cache Size:')} 95 MB`);
  console.log(`${colors.white('Hit Rate:')} 94.2%`);
  console.log(`${colors.white('Backend:')} SQLite + Markdown`);
}

async function handleSessionCommand(args: string[], context: REPLContext): Promise<void> {
  if (args.length === 0) {
    console.log(colors.gray('Usage: session <list|save|restore> [options]'));
    return;
  }
  
  const subcommand = args[0];
  switch (subcommand) {
    case 'list':
      await showSessionList();
      break;
    case 'save':
      await handleSessionSave(args.slice(1));
      break;
    case 'restore':
      if (args.length < 2) {
        console.log(colors.red('Please specify session ID'));
      } else {
        await handleSessionRestore(args[1]);
      }
      break;
    default:
      console.log(colors.red(`Unknown session subcommand: ${subcommand}`));
  }
}

async function showSessionList(): Promise<void> {
  // Mock session data
  const sessions = [
    { id: 'session-001', name: 'Research Project', date: '2024-01-15', agents: 3, tasks: 8 },
    { id: 'session-002', name: 'Development', date: '2024-01-14', agents: 2, tasks: 5 },
  ];
  
  console.log(colorCombinations.cyanBold(`Saved Sessions (${sessions.length})`));
  console.log('─'.repeat(50));
  
  const table = new Table()
    .header(['ID', 'Name', 'Date', 'Agents', 'Tasks'])
    .border(true);

  for (const session of sessions) {
    table.body([[
      colors.gray(session.id),
      colors.white(session.name),
      session.date,
      session.agents.toString(),
      session.tasks.toString()
    ]]);
  }
  
  console.log(table.toString());
}

async function handleSessionSave(args: string[]): Promise<void> {
  const name = args.length > 0 ? args.join(' ') : await Input({
    message: 'Session name:',
    default: `session-${new Date().toISOString().split('T')[0]}`,
  });
  
  console.log(colors.yellow('Saving session...'));
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const sessionId = generateId('session');
  console.log(colors.green('✓ Session saved successfully'));
  console.log(`${colors.white('ID:')} ${sessionId}`);
  console.log(`${colors.white('Name:')} ${name}`);
}

async function handleSessionRestore(sessionId: string): Promise<void> {
  const confirmed = await Confirm({
    message: `Restore session ${sessionId}?`,
    default: false,
  });
  
  if (!confirmed) {
    console.log(colors.gray('Restore cancelled'));
    return;
  }
  
  console.log(colors.yellow('Restoring session...'));
  await new Promise(resolve => setTimeout(resolve, 1500));
  console.log(colors.green('✓ Session restored successfully'));
}

async function handleWorkflowCommand(args: string[], context: REPLContext): Promise<void> {
  if (context.connectionStatus !== 'connected') {
    console.log(colors.yellow('⚠ Not connected to orchestrator'));
    return;
  }

  if (args.length === 0) {
    console.log(colors.gray('Usage: workflow <list|run|status> [options]'));
    return;
  }
  
  const subcommand = args[0];
  switch (subcommand) {
    case 'list':
      await showWorkflowList();
      break;
    case 'run':
      if (args.length < 2) {
        console.log(colors.red('Please specify workflow file'));
      } else {
        await handleWorkflowRun(args[1]);
      }
      break;
    case 'status':
      if (args.length < 2) {
        console.log(colors.red('Please specify workflow ID'));
      } else {
        await showWorkflowStatus(args[1]);
      }
      break;
    default:
      console.log(colors.red(`Unknown workflow subcommand: ${subcommand}`));
  }
}

async function showWorkflowList(): Promise<void> {
  // Mock workflow data
  const workflows = [
    { id: 'workflow-001', name: 'Research Pipeline', status: 'active', steps: 5 },
    { id: 'workflow-002', name: 'Data Processing', status: 'completed', steps: 3 },
  ];
  
  console.log(colorCombinations.cyanBold(`Workflows (${workflows.length})`));
  console.log('─'.repeat(50));
  
  const table = new Table().header(['ID', 'Name', 'Status', 'Steps']);
  const rows: string[][] = [];

  for (const workflow of workflows) {
    const statusIcon = formatStatusIndicator(workflow.status);
    
    rows.push([
      colors.gray(workflow.id),
      colors.white(workflow.name),
      `${statusIcon} ${workflow.status}`,
      workflow.steps.toString()
    ]);
  }
  
  table.body(rows);
  console.log(table.toString());
}

async function handleWorkflowRun(filename: string): Promise<void> {
  console.log(colors.yellow(`Running workflow: ${filename}`));
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const workflowId = generateId('workflow');
  console.log(colors.green('✓ Workflow started'));
  console.log(`${colors.white('ID:')} ${workflowId}`);
}

async function showWorkflowStatus(workflowId: string): Promise<void> {
  console.log(colorCombinations.cyanBold('Workflow Status'));
  console.log('─'.repeat(30));
  console.log(`${colors.white('ID:')} ${workflowId}`);
  console.log(`${colors.white('Name:')} Research Pipeline`);
  console.log(`${colors.white('Status:')} ${formatStatusIndicator('running')} running`);
  console.log(`${colors.white('Progress:')} ${formatProgressBar(3, 5, 20)} 3/5 steps`);
  console.log(`${colors.white('Started:')} ${new Date().toLocaleTimeString()}`);
}

function findSimilarCommands(input: string, commands: REPLCommand[]): string[] {
  const allNames = commands.flatMap(c => [c.name, ...(c.aliases || [])]);
  
  return allNames
    .filter(name => {
      // Simple similarity check - could use Levenshtein distance
      const commonChars = input.split('').filter(char => name.includes(char)).length;
      return commonChars >= Math.min(2, input.length / 2);
    })
    .slice(0, 3); // Top 3 suggestions
}

async function createReadlineInterface(completer: CommandCompleter): Promise<readline.Interface> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: (line: string) => {
      const completions = completer.complete(line);
      return [completions, line];
    }
  });
  
  return rl;
}