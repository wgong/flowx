/**
 * Command Registry
 * Central registry for all CLI commands
 */

import type { CLICommand } from '../interfaces/index.ts';

// System Commands
import { statusCommand } from '../commands/system/status-command.ts';
import { initCommand } from '../commands/system/initialization-command.ts';

// Agent Commands
import { agentCommand } from '../commands/agents/agent-management-command.ts';

// Swarm Commands
import { swarmCommand } from '../commands/swarm/swarm-management-command.ts';

// Memory Commands
import { memoryCommand } from '../commands/memory/memory-management-command.ts';

// Workflow Commands (placeholder for future implementation)
const workflowCommand: CLICommand = {
  name: 'workflow',
  description: 'Manage workflows and automation',
  category: 'Workflows',
  usage: 'claude-flow workflow <subcommand>',
  examples: ['claude-flow workflow list', 'claude-flow workflow run my-workflow'],
  handler: async () => {
    console.log('Workflow management coming soon...');
  }
};

// Task Commands (placeholder for future implementation)
const taskCommand: CLICommand = {
  name: 'task',
  description: 'Manage tasks and execution',
  category: 'Tasks',
  usage: 'claude-flow task <subcommand>',
  examples: ['claude-flow task list', 'claude-flow task create "My task"'],
  handler: async () => {
    console.log('Task management coming soon...');
  }
};

// Integration Commands (placeholder for future implementation)
const integrationCommand: CLICommand = {
  name: 'integration',
  description: 'Manage external integrations',
  category: 'Integration',
  usage: 'claude-flow integration <subcommand>',
  examples: ['claude-flow integration list', 'claude-flow integration add mcp'],
  handler: async () => {
    console.log('Integration management coming soon...');
  }
};

// Utility Commands
const helpCommand: CLICommand = {
  name: 'help',
  description: 'Show help information',
  category: 'Utilities',
  usage: 'claude-flow help [COMMAND]',
  examples: ['claude-flow help', 'claude-flow help agent'],
  handler: async (context) => {
    const { args } = context;
    const commandName = args[0];
    
    if (commandName) {
      const command = getCommand(commandName);
      if (command) {
        showCommandHelp(command);
      } else {
        console.log(`Unknown command: ${commandName}`);
        console.log('Run "claude-flow help" to see all available commands.');
      }
    } else {
      showGeneralHelp();
    }
  }
};

const versionCommand: CLICommand = {
  name: 'version',
  description: 'Show version information',
  category: 'Utilities',
  usage: 'claude-flow version',
  examples: ['claude-flow version'],
  handler: async () => {
    console.log('Claude Flow CLI v1.0.0');
    console.log('Enterprise AI Automation Platform');
  }
};

// Command Registry
const commands = new Map<string, CLICommand>([
  // System Commands
  ['status', statusCommand],
  ['init', initCommand],
  
  // Agent Commands
  ['agent', agentCommand],
  
  // Swarm Commands
  ['swarm', swarmCommand],
  
  // Memory Commands
  ['memory', memoryCommand],
  
  // Workflow Commands
  ['workflow', workflowCommand],
  
  // Task Commands
  ['task', taskCommand],
  
  // Integration Commands
  ['integration', integrationCommand],
  
  // Utility Commands
  ['help', helpCommand],
  ['version', versionCommand]
]);

// Command aliases
const aliases = new Map<string, string>([
  ['--version', 'version'],
  ['-v', 'version'],
  ['--help', 'help'],
  ['-h', 'help'],
  ['stat', 'status'],
  ['initialize', 'init'],
  ['agents', 'agent'],
  ['swarms', 'swarm'],
  ['mem', 'memory'],
  ['workflows', 'workflow'],
  ['tasks', 'task']
]);

/**
 * Get a command by name or alias
 */
export function getCommand(name: string): CLICommand | undefined {
  // Check direct command name
  if (commands.has(name)) {
    return commands.get(name);
  }
  
  // Check aliases
  const aliasTarget = aliases.get(name);
  if (aliasTarget && commands.has(aliasTarget)) {
    return commands.get(aliasTarget);
  }
  
  return undefined;
}

/**
 * Get all registered commands
 */
export function getAllCommands(): CLICommand[] {
  return Array.from(commands.values());
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(): Map<string, CLICommand[]> {
  const categorized = new Map<string, CLICommand[]>();
  
  for (const command of commands.values()) {
    const category = command.category || 'General';
    if (!categorized.has(category)) {
      categorized.set(category, []);
    }
    categorized.get(category)!.push(command);
  }
  
  return categorized;
}

/**
 * Register a new command
 */
export function registerCommand(command: CLICommand): void {
  commands.set(command.name, command);
}

/**
 * Register a command alias
 */
export function registerAlias(alias: string, commandName: string): void {
  aliases.set(alias, commandName);
}

/**
 * Show help for a specific command
 */
function showCommandHelp(command: CLICommand): void {
  console.log(`\n${command.name} - ${command.description}\n`);
  
  console.log('USAGE:');
  console.log(`  ${command.usage}\n`);
  
  if (command.arguments && command.arguments.length > 0) {
    console.log('ARGUMENTS:');
    command.arguments.forEach(arg => {
      const required = arg.required ? ' (required)' : ' (optional)';
      console.log(`  ${arg.name}${required}`);
      console.log(`    ${arg.description}`);
    });
    console.log();
  }
  
  if (command.options && command.options.length > 0) {
    console.log('OPTIONS:');
    command.options.forEach(opt => {
      const short = opt.short ? `-${opt.short}, ` : '    ';
      const defaultVal = opt.default ? ` (default: ${opt.default})` : '';
      console.log(`  ${short}--${opt.name}${defaultVal}`);
      console.log(`    ${opt.description}`);
    });
    console.log();
  }
  
  if (command.subcommands && command.subcommands.length > 0) {
    console.log('SUBCOMMANDS:');
    command.subcommands.forEach(sub => {
      console.log(`  ${sub.name.padEnd(15)} ${sub.description}`);
    });
    console.log();
  }
  
  if (command.examples && command.examples.length > 0) {
    console.log('EXAMPLES:');
    command.examples.forEach(example => {
      console.log(`  ${example}`);
    });
    console.log();
  }
}

/**
 * Show general help
 */
function showGeneralHelp(): void {
  console.log('\n🚀 Claude Flow CLI - Enterprise AI Automation Platform\n');
  
  console.log('USAGE:');
  console.log('  claude-flow <command> [subcommand] [options]\n');
  
  const categorized = getCommandsByCategory();
  
  // Sort categories for consistent display
  const sortedCategories = Array.from(categorized.keys()).sort((a, b) => {
    const order = ['System', 'Agents', 'Swarm', 'Memory', 'Workflows', 'Tasks', 'Integration', 'Utilities'];
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    } else if (aIndex !== -1) {
      return -1;
    } else if (bIndex !== -1) {
      return 1;
    } else {
      return a.localeCompare(b);
    }
  });
  
  for (const category of sortedCategories) {
    const categoryCommands = categorized.get(category)!;
    console.log(`${category.toUpperCase()} COMMANDS:`);
    
    categoryCommands.forEach(command => {
      console.log(`  ${command.name.padEnd(15)} ${command.description}`);
    });
    console.log();
  }
  
  console.log('GLOBAL OPTIONS:');
  console.log('  -h, --help       Show help information');
  console.log('  -v, --version    Show version information');
  console.log();
  
  console.log('EXAMPLES:');
  console.log('  claude-flow status                    # Show system status');
  console.log('  claude-flow init my-project           # Initialize new project');
  console.log('  claude-flow agent list                # List all agents');
  console.log('  claude-flow swarm create dev-swarm    # Create new swarm');
  console.log('  claude-flow memory query "search"     # Search memory bank');
  console.log('  claude-flow help agent                # Show agent command help');
  console.log();
  
  console.log('For more information on a specific command, run:');
  console.log('  claude-flow help <command>');
  console.log();
}

export default {
  getCommand,
  getAllCommands,
  getCommandsByCategory,
  registerCommand,
  registerAlias
}; 