/**
 * Claude-specific commands for the CLI
 */

import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { generateId } from '../../utils/helpers.js';
import { readFile } from 'node:fs/promises';

// Simple color utilities (replacing Cliffy)
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};

export const claudeCommand = new Command('claude')
  .description('Manage Claude instances')
  .action(() => {
    claudeCommand.help();
  });

claudeCommand
  .command('spawn')
  .description('Spawn a new Claude instance with specific configuration')
  .argument('<task>', 'Task description for Claude')
  .option('-t, --tools <tools>', 'Allowed tools (comma-separated)', 'View,Edit,Replace,GlobTool,GrepTool,LS,Bash')
  .option('--no-permissions', 'Use --dangerously-skip-permissions flag')
  .option('-c, --config <config>', 'MCP config file path')
  .option('-m, --mode <mode>', 'Development mode (full, backend-only, frontend-only, api-only)', 'full')
  .option('--parallel', 'Enable parallel execution with BatchTool')
  .option('--research', 'Enable web research with WebFetchTool')
  .option('--coverage <coverage>', 'Test coverage target', '80')
  .option('--commit <frequency>', 'Commit frequency (phase, feature, manual)', 'phase')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--dry-run', 'Show what would be executed without running')
  .action(async (task: string, options: any) => {
    try {
      const instanceId = generateId('claude');
      
      // Build allowed tools list
      let tools = options.tools;
      if (options.parallel && !tools.includes('BatchTool')) {
        tools += ',BatchTool,dispatch_agent';
      }
      if (options.research && !tools.includes('WebFetchTool')) {
        tools += ',WebFetchTool';
      }
      
      // Build Claude command
      const claudeArgs = [task];
      claudeArgs.push('--allowedTools', tools);
      
      if (options.noPermissions) {
        claudeArgs.push('--dangerously-skip-permissions');
      }
      
      if (options.config) {
        claudeArgs.push('--mcp-config', options.config);
      }
      
      if (options.verbose) {
        claudeArgs.push('--verbose');
      }
      
      if (options.dryRun) {
        console.log(colors.yellow('DRY RUN - Would execute:'));
        console.log(colors.gray(`claude ${claudeArgs.join(' ')}`));
        console.log('\nConfiguration:');
        console.log(`  Instance ID: ${instanceId}`);
        console.log(`  Task: ${task}`);
        console.log(`  Tools: ${tools}`);
        console.log(`  Mode: ${options.mode}`);
        console.log(`  Coverage: ${options.coverage}%`);
        console.log(`  Commit: ${options.commit}`);
        return;
      }
      
      console.log(colors.green(`Spawning Claude instance: ${instanceId}`));
      console.log(colors.gray(`Task: ${task}`));
      console.log(colors.gray(`Tools: ${tools}`));
      
      // Spawn Claude process
      const claude = spawn('claude', claudeArgs, {
        stdio: 'inherit',
        env: {
          ...process.env,
          CLAUDE_INSTANCE_ID: instanceId,
          CLAUDE_FLOW_MODE: options.mode,
          CLAUDE_FLOW_COVERAGE: options.coverage.toString(),
          CLAUDE_FLOW_COMMIT: options.commit,
        }
      });
      
      claude.on('error', (err: any) => {
        console.error(colors.red('Failed to spawn Claude:'), err.message);
      });
      
      claude.on('exit', (code: any) => {
        if (code === 0) {
          console.log(colors.green(`Claude instance ${instanceId} completed successfully`));
        } else {
          console.log(colors.red(`Claude instance ${instanceId} exited with code ${code}`));
        }
      });
      
    } catch (error) {
      console.error(colors.red('Failed to spawn Claude:'), (error as Error).message);
    }
  });

claudeCommand
  .command('batch')
  .description('Spawn multiple Claude instances from workflow')
  .argument('<workflow-file>', 'Path to workflow JSON file')
  .option('--dry-run', 'Show what would be executed without running')
  .action(async (workflowFile: string, options: any) => {
    try {
      const content = await readFile(workflowFile, 'utf-8');
      const workflow = JSON.parse(content);
      
      console.log(colors.green('Loading workflow:'), workflow.name || 'Unnamed');
      console.log(colors.gray(`Tasks: ${workflow.tasks?.length || 0}`));
      
      if (!workflow.tasks || workflow.tasks.length === 0) {
        console.log(colors.yellow('No tasks found in workflow'));
        return;
      }
      
      for (const task of workflow.tasks) {
        const claudeArgs = [task.description || task.name];
        
        // Add tools
        if (task.tools) {
          claudeArgs.push('--allowedTools', Array.isArray(task.tools) ? task.tools.join(',') : task.tools);
        }
        
        // Add flags
        if (task.skipPermissions) {
          claudeArgs.push('--dangerously-skip-permissions');
        }
        
        if (task.config) {
          claudeArgs.push('--mcp-config', task.config);
        }
        
        if (options.dryRun) {
          console.log(colors.yellow(`\nDRY RUN - Task: ${task.name || task.id}`));
          console.log(colors.gray(`claude ${claudeArgs.join(' ')}`));
        } else {
          console.log(colors.blue(`\nSpawning Claude for task: ${task.name || task.id}`));
          
          const claude = spawn('claude', claudeArgs, {
            stdio: 'inherit',
            env: {
              ...process.env,
              CLAUDE_TASK_ID: task.id || generateId('task'),
              CLAUDE_TASK_TYPE: task.type || 'general',
            }
          });
          
          // Wait for completion if sequential
          if (!workflow.parallel) {
            await new Promise((resolve) => {
              claude.on('exit', resolve);
            });
          }
        }
      }
      
      if (!options.dryRun && workflow.parallel) {
        console.log(colors.green('\nAll Claude instances spawned in parallel mode'));
      }
      
    } catch (error) {
      console.error(colors.red('Failed to process workflow:'), (error as Error).message);
    }
  });