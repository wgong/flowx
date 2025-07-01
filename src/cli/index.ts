#!/usr/bin/env -S deno run --allow-all
/**
 * Claude-Flow CLI entry point
 * This redirects to simple-cli.ts for remote execution compatibility
 */

// Import and run the simple CLI which doesn't have external dependencies
import "./simple-cli.ts";
import { Command } from 'commander';
import { colors } from "../utils/colors.ts";
import { logger } from "../core/logger.ts";
import { configManager } from "../core/config.ts";
import { startCommand } from "./commands/start.ts";
import { agentCommand } from "./commands/agent.ts";
import { taskCommand } from "./commands/task.ts";
import { createMemoryCommands, memoryCommand } from "./commands/memory.ts";
import { configCommand } from "./commands/config.ts";
import { statusCommand } from "./commands/status.ts";
import { monitorCommand } from "./commands/monitor.ts";
import { sessionCommand } from "./commands/session.ts";
import { workflowCommand } from "./commands/workflow.ts";
import { helpCommand } from "./commands/help.ts";
import { mcpCommand } from "./commands/mcp.ts";
import { formatError, displayBanner, displayVersion } from "./formatter.ts";
import { startREPL } from "./repl.ts";
import { CompletionGenerator } from "./completion.ts";

// Version information
const VERSION = '1.1.2';
const BUILD_DATE = new Date().toISOString().split('T')[0];

// Main CLI command
const cli = new Command()
  .name('claude-flow')
  .version(VERSION)
  .description('Claude-Flow: Advanced AI agent orchestration system for multi-agent coordination')
  .option('-c, --config <path>', 'Path to configuration file', './claude-flow.config.json')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
  .option('--no-color', 'Disable colored output')
  .option('--json', 'Output in JSON format where applicable')
  .option('--profile <profile>', 'Use named configuration profile')
  .action(async (options: any) => {
    // If no subcommand, show banner and start REPL
    await setupLogging(options);
    
    if (!options.quiet) {
      displayBanner(VERSION);
      console.log(colors.gray('Type "help" for available commands or "exit" to quit.\n'));
    }
    
    await startREPL(options);
  });

// Add subcommands
cli
  .command('start')
  .description('Start the Claude-Flow system')
  .action(async (options: any) => {
    await startCommand.action(options);
  });

cli
  .command('agent')
  .description('Manage AI agents')
  .action(async (options: any) => {
    await agentCommand.action(options);
  });

cli
  .command('task')
  .description('Manage tasks')
  .action(async (options: any) => {
    await taskCommand.action(options);
  });

cli
  .command('memory')
  .description('Manage memory')
  .action(async (options: any) => {
    await memoryCommand.action(options);
  });

cli
  .command('config')
  .description('Manage configuration')
  .action(async (options: any) => {
    await configCommand.action(options);
  });

cli
  .command('status')
  .description('Check system status')
  .action(async (options: any) => {
    await statusCommand.action(options);
  });

cli
  .command('monitor')
  .description('Monitor system activity')
  .action(async (options: any) => {
    await monitorCommand.action(options);
  });

cli
  .command('session')
  .description('Manage sessions')
  .action(async (options: any) => {
    await sessionCommand.action(options);
  });

cli
  .command('workflow')
  .description('Manage workflows')
  .action(async (options: any) => {
    await workflowCommand.action(options);
  });

cli
  .command('mcp')
  .description('Manage multi-agent coordination')
  .action(async (options: any) => {
    await mcpCommand.action(options);
  });

cli
  .command('help')
  .description('Show help for a command')
  .action(async (options: any) => {
    await helpCommand.action(options);
  });

cli
  .command('repl')
  .description('Start interactive REPL mode with command completion')
  .option('--no-banner', 'Skip welcome banner')
  .option('--history-file <path>', 'Custom history file path')
  .action(async (options: any) => {
    await setupLogging(options);
    if (options.banner !== false) {
      displayBanner(VERSION);
    }
    await startREPL(options);
  });

cli
  .command('version')
  .description('Show detailed version information')
  .option('--short', 'Show version number only')
  .action(async (options: any) => {
    if (options.short) {
      console.log(VERSION);
    } else {
      displayVersion(VERSION, BUILD_DATE);
    }
  });

cli
  .command('completion [shell]')
  .description('Generate shell completion scripts')
  .option('--install', 'Install completion script automatically')
  .action(async (shell: string | undefined, options: any) => {
    const generator = new CompletionGenerator();
    await generator.generate(shell || 'detect', options.install === true);
  });

// Global error handler
async function handleError(error: unknown, options?: any): Promise<void> {
  const formatted = formatError(error);
  
  if (options?.json) {
    console.error(JSON.stringify({
      error: true,
      message: formatted,
      timestamp: new Date().toISOString(),
    }));
  } else {
    console.error(colors.red(colors.bold('✗ Error:')), formatted);
  }
  
  // Show stack trace in debug mode or verbose
  if (Deno.env.get('CLAUDE_FLOW_DEBUG') === 'true' || options?.verbose) {
    console.error(colors.gray('\nStack trace:'));
    console.error(error);
  }
  
  // Suggest helpful actions
  if (!options?.quiet) {
    console.error(colors.gray('\nTry running with --verbose for more details'));
    console.error(colors.gray('Or use "claude-flow help" to see available commands'));
  }
  
  Deno.exit(1);
}

// Setup logging and configuration based on CLI options
async function setupLogging(options: any): Promise<void> {
  // Determine log level
  let logLevel = options.logLevel;
  if (options.verbose) logLevel = 'debug';
  if (options.quiet) logLevel = 'warn';
  
  // Configure logger
  await logger.configure({
    level: logLevel as any,
    format: options.json ? 'json' : 'text',
    destination: 'console',
  });
  
  // Load configuration
  try {
    if (options.config) {
      await configManager.load(options.config);
    } else {
      // Try to load default config file if it exists
      try {
        await configManager.load('./claude-flow.config.json');
      } catch {
        // Use default config if no file found
        configManager.loadDefault();
      }
    }
    
    // Apply profile if specified
    if (options.profile) {
      await configManager.applyProfile(options.profile);
    }
  } catch (error) {
    logger.warn('Failed to load configuration:', (error as Error).message);
    configManager.loadDefault();
  }
}

// Signal handlers for graceful shutdown
function setupSignalHandlers(): void {
  const gracefulShutdown = () => {
    console.log('\n' + colors.gray('Gracefully shutting down...'));
    Deno.exit(0);
  };
  
  // Note: Deno signal handling would need to be implemented differently
  // This is a placeholder for the signal handling logic
}

// Main execution function
async function main(): Promise<void> {
  let globalOptions: any = {};
  
  try {
    // Setup signal handlers
    setupSignalHandlers();
    
    // Pre-parse global options for error handling
    const args = process.argv.slice(2);
    globalOptions = {
      verbose: args.includes('-v') || args.includes('--verbose'),
      quiet: args.includes('-q') || args.includes('--quiet'),
      json: args.includes('--json'),
      noColor: args.includes('--no-color'),
    };
    
    // Parse and execute
    await cli.parseAsync(args, { from: 'user' });
    
  } catch (error: unknown) {
    await handleError(error, globalOptions);
  }
}

// Check if this module is being run directly
if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('CLI Error:', error);
    process.exit(1);
  });
}