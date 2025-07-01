#!/usr/bin/env node

/**
 * Claude Flow CLI Entry Point
 * Updated to use consolidated command architecture
 */

import { getCommand } from './src/cli/core/command-registry.ts';
import { CommandParser } from './src/cli/core/command-parser.ts';
import { printError, printInfo } from './src/cli/core/output-formatter.ts';

async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Handle no arguments - show help
    if (args.length === 0) {
      const helpCommand = getCommand('help');
      if (helpCommand) {
        await helpCommand.handler({ 
          args: [], 
          options: {}, 
          config: {},
          command: 'help',
          workingDirectory: process.cwd(),
          environment: process.env,
          user: { id: process.env.USER || process.env.USERNAME }
        });
      }
      return;
    }

    // Parse command line arguments
    const parser = new CommandParser();
    const parsed = parser.parse(args);
    const { command: commandName, subcommand, args: commandArgs, options } = parsed;

    // Handle version flags
    if (commandName === '--version' || commandName === '-v') {
      const versionCommand = getCommand('version');
      if (versionCommand) {
        await versionCommand.handler({ 
          args: [], 
          options: {}, 
          config: {},
          command: 'version',
          workingDirectory: process.cwd(),
          environment: process.env,
          user: { id: process.env.USER || process.env.USERNAME }
        });
      }
      return;
    }

    // Handle help flags
    if (commandName === '--help' || commandName === '-h') {
      const helpCommand = getCommand('help');
      if (helpCommand) {
        await helpCommand.handler({ 
          args: [], 
          options: {}, 
          config: {},
          command: 'help',
          workingDirectory: process.cwd(),
          environment: process.env,
          user: { id: process.env.USER || process.env.USERNAME }
        });
      }
      return;
    }

    // Get command from registry
    const command = getCommand(commandName);
    if (!command) {
      printError(`Unknown command: ${commandName}`);
      printInfo('Run "claude-flow help" to see available commands.');
      process.exit(1);
    }

    // Create execution context
    const context = {
      args: commandArgs,
      options,
      config: {},
      command: commandName,
      subcommand,
      workingDirectory: process.cwd(),
      environment: process.env,
      user: { id: process.env.USER || process.env.USERNAME }
    };

    // Handle subcommands
    if (subcommand && command.subcommands) {
      const subCmd = command.subcommands.find(sc => sc.name === subcommand);
      if (subCmd) {
        await subCmd.handler(context);
        return;
      } else {
        printError(`Unknown subcommand: ${subcommand}`);
        printInfo(`Run "claude-flow help ${commandName}" to see available subcommands.`);
        process.exit(1);
      }
    }

    // Execute main command
    await command.handler(context);

  } catch (error) {
    printError(`CLI Error: ${error instanceof Error ? error.message : String(error)}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});