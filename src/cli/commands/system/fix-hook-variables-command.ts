/**
 * Fix Hook Variables Command
 * Fixes environment variable interpolation for Claude Code 1.0.51+
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.js';
import { printSuccess, printError, printInfo, printWarning } from '../../../cli/core/output-formatter.js';
import { readFile, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export const fixHookVariablesCommand: CLICommand = {
  name: 'fix-hook-variables',
  description: 'Fix Claude Code hook variable interpolation for v1.0.51+',
  usage: 'flowx fix-hook-variables [file] [options]',
  examples: [
    'flowx fix-hook-variables',
    'flowx fix-hook-variables .claude/settings.json',
    'flowx fix-hook-variables --test',
    'flowx fix-hook-variables --all'
  ],
  arguments: [
    {
      name: 'file',
      description: 'Specific settings.json file to fix',
      required: false
    }
  ],
  options: [
    {
      name: 'test',
      short: 't',
      description: 'Create test configuration to verify hook variables',
      type: 'boolean'
    },
    {
      name: 'all',
      short: 'a',
      description: 'Fix all settings.json files found',
      type: 'boolean'
    },
    {
      name: 'backup',
      short: 'b',
      description: 'Create backup before modifying',
      type: 'boolean',
      default: true
    },
    {
      name: 'dry-run',
      short: 'd',
      description: 'Show what would be changed without applying',
      type: 'boolean'
    }
  ],
  handler: async (context: CLIContext) => {
    const { args, options } = context;
    
    try {
      if (options.test) {
        await createTestConfiguration();
        return;
      }
      
      const targetFile = args[0];
      
      if (targetFile) {
        await fixSingleFile(targetFile, options);
      } else if (options.all) {
        await fixAllFiles(options);
      } else {
        await fixDefaultFiles(options);
      }
      
    } catch (error) {
      printError(`Failed to fix hook variables: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
};

async function createTestConfiguration(): Promise<void> {
  const testConfig = {
    hooks: {
      PostToolUse: [
        {
          matcher: "Write",
          hooks: [
            {
              type: "command",
              command: "echo \"Hook test - File: $CLAUDE_EDITED_FILE\" >> .claude/hook-test.log"
            }
          ]
        }
      ]
    }
  };
  
  const testPath = '.claude/test-settings.json';
  await writeFile(testPath, JSON.stringify(testConfig, null, 2));
  
  printSuccess('Created test configuration at .claude/test-settings.json');
  printInfo('Test by editing a file and checking .claude/hook-test.log');
}

async function fixDefaultFiles(options: any): Promise<void> {
  const defaultPaths = [
    '.claude/settings.json',
    'claude-code/.claude/settings.json',
    '../.claude/settings.json'
  ];
  
  let found = false;
  
  for (const path of defaultPaths) {
    if (existsSync(path)) {
      printInfo(`Found settings file: ${path}`);
      await fixSingleFile(path, options);
      found = true;
    }
  }
  
  if (!found) {
    printWarning('No settings.json files found. Creating default configuration...');
    await createDefaultConfiguration();
  }
}

async function fixAllFiles(options: any): Promise<void> {
  // Find all settings.json files recursively
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync('find . -name "settings.json" -path "*/.claude/*" 2>/dev/null || true');
    const files = stdout.trim().split('\n').filter(f => f.length > 0);
    
    if (files.length === 0) {
      printWarning('No .claude/settings.json files found');
      return;
    }
    
    printInfo(`Found ${files.length} settings files to fix`);
    
    for (const file of files) {
      await fixSingleFile(file, options);
    }
    
  } catch (error) {
    printError(`Failed to find settings files: ${error}`);
  }
}

async function fixSingleFile(filePath: string, options: any): Promise<void> {
  try {
    await access(filePath);
  } catch {
    printError(`File not found: ${filePath}`);
    return;
  }
  
  const content = await readFile(filePath, 'utf8');
  let config;
  
  try {
    config = JSON.parse(content);
  } catch {
    printError(`Invalid JSON in ${filePath}`);
    return;
  }
  
  const fixedConfig = fixHookConfiguration(config);
  const hasChanges = JSON.stringify(config) !== JSON.stringify(fixedConfig);
  
  if (!hasChanges) {
    printInfo(`${filePath}: No changes needed`);
    return;
  }
  
  if (options.dryRun) {
    printInfo(`${filePath}: Would fix hook variables`);
    console.log('Changes would be:', JSON.stringify(fixedConfig.hooks, null, 2));
    return;
  }
  
  // Create backup if requested
  if (options.backup !== false) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await writeFile(backupPath, content);
    printInfo(`Backup created: ${backupPath}`);
  }
  
  // Write fixed configuration
  await writeFile(filePath, JSON.stringify(fixedConfig, null, 2));
  printSuccess(`Fixed hook variables in ${filePath}`);
}

function fixHookConfiguration(config: any): any {
  const fixed = JSON.parse(JSON.stringify(config)); // Deep clone
  
  if (!fixed.hooks) {
    fixed.hooks = {};
  }
  
  // Convert old format to new format if needed
  if (fixed.hooks.preEditHook) {
    // Convert old format to new Claude Code 1.0.51+ format
    fixed.hooks = convertLegacyHooks(fixed.hooks);
  }
  
  // Fix environment variable interpolation
  if (fixed.hooks.PreToolUse) {
    fixed.hooks.PreToolUse = fixHookArray(fixed.hooks.PreToolUse);
  }
  
  if (fixed.hooks.PostToolUse) {
    fixed.hooks.PostToolUse = fixHookArray(fixed.hooks.PostToolUse);
  }
  
  if (fixed.hooks.Stop) {
    fixed.hooks.Stop = fixHookArray(fixed.hooks.Stop);
  }
  
  return fixed;
}

function convertLegacyHooks(legacyHooks: any): any {
  const newHooks: any = {
    PreToolUse: [],
    PostToolUse: [],
    Stop: []
  };
  
  // Convert preEditHook
  if (legacyHooks.preEditHook) {
    newHooks.PreToolUse.push({
      matcher: "Write|Edit|MultiEdit",
      hooks: [{
        type: "command",
        command: buildCommand(legacyHooks.preEditHook, 'pre-edit', '$CLAUDE_EDITED_FILE')
      }]
    });
  }
  
  // Convert postEditHook
  if (legacyHooks.postEditHook) {
    newHooks.PostToolUse.push({
      matcher: "Write|Edit|MultiEdit",
      hooks: [{
        type: "command",
        command: buildCommand(legacyHooks.postEditHook, 'post-edit', '$CLAUDE_EDITED_FILE')
      }]
    });
  }
  
  // Convert preCommandHook
  if (legacyHooks.preCommandHook) {
    newHooks.PreToolUse.push({
      matcher: "Bash",
      hooks: [{
        type: "command",
        command: buildCommand(legacyHooks.preCommandHook, 'pre-command', '$CLAUDE_COMMAND')
      }]
    });
  }
  
  // Convert postCommandHook
  if (legacyHooks.postCommandHook) {
    newHooks.PostToolUse.push({
      matcher: "Bash",
      hooks: [{
        type: "command",
        command: buildCommand(legacyHooks.postCommandHook, 'post-command', '$CLAUDE_COMMAND')
      }]
    });
  }
  
  // Convert sessionEndHook
  if (legacyHooks.sessionEndHook) {
    newHooks.Stop.push({
      hooks: [{
        type: "command",
        command: buildCommand(legacyHooks.sessionEndHook, 'session-end')
      }]
    });
  }
  
  return newHooks;
}

function buildCommand(hookConfig: any, hookType: string, variablePattern?: string): string {
  const baseCmd = `${hookConfig.command} ${hookConfig.args.join(' ')}`;
  
  // Replace legacy variable patterns with new environment variables
  let fixedCmd = baseCmd
    .replace(/\$\{file\}/g, '$CLAUDE_EDITED_FILE')
    .replace(/\$\{command\}/g, '$CLAUDE_COMMAND')
    .replace(/\$\{tool\}/g, '$CLAUDE_TOOL')
    .replace(/\$\{tool\.params\.file_path\}/g, '$CLAUDE_EDITED_FILE')
    .replace(/\$\{tool\.input\.command\}/g, '$CLAUDE_COMMAND');
  
  // Add specific variable for this hook type
  if (variablePattern && !fixedCmd.includes(variablePattern)) {
    fixedCmd = fixedCmd.replace(/--file "[^"]*"/, `--file "${variablePattern}"`);
    fixedCmd = fixedCmd.replace(/--command "[^"]*"/, `--command "${variablePattern}"`);
  }
  
  return fixedCmd;
}

function fixHookArray(hooks: any[]): any[] {
  return hooks.map(hookGroup => {
    if (hookGroup.hooks) {
      hookGroup.hooks = hookGroup.hooks.map((hook: any) => {
        if (hook.command) {
          hook.command = fixEnvironmentVariables(hook.command);
        }
        return hook;
      });
    }
    return hookGroup;
  });
}

function fixEnvironmentVariables(command: string): string {
  return command
    .replace(/\$\{file\}/g, '$CLAUDE_EDITED_FILE')
    .replace(/\$\{command\}/g, '$CLAUDE_COMMAND')
    .replace(/\$\{tool\}/g, '$CLAUDE_TOOL')
    .replace(/\$\{tool\.params\.file_path\}/g, '$CLAUDE_EDITED_FILE')
    .replace(/\$\{tool\.input\.command\}/g, '$CLAUDE_COMMAND')
    .replace(/\$\{tool\.params\.path\}/g, '$CLAUDE_EDITED_FILE');
}

async function createDefaultConfiguration(): Promise<void> {
  const defaultConfig = {
    env: {
      "FLOWX_AUTO_COMMIT": "false",
      "FLOWX_AUTO_PUSH": "false",
      "FLOWX_HOOKS_ENABLED": "true",
      "FLOWX_TELEMETRY_ENABLED": "true",
      "FLOWX_REMOTE_EXECUTION": "true",
      "FLOWX_GITHUB_INTEGRATION": "true"
    },
    permissions: {
      allow: [
        "Bash(./cli.js *)",
        "Bash(node cli.js *)",
        "Bash(npm run *)",
        "Bash(npm test *)",
        "Bash(git *)",
        "Bash(gh *)",
        "Bash(node *)",
        "Bash(which *)",
        "Bash(pwd)",
        "Bash(ls *)"
      ],
      deny: [
        "Bash(rm -rf /)",
        "Bash(curl * | bash)",
        "Bash(wget * | sh)",
        "Bash(eval *)"
      ]
    },
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [
            {
              type: "command",
              command: "node cli.js hooks pre-command --command \"$CLAUDE_COMMAND\" --validate-safety true --prepare-resources true"
            }
          ]
        },
        {
          matcher: "Write|Edit|MultiEdit",
          hooks: [
            {
              type: "command",
              command: "node cli.js hooks pre-edit --file \"$CLAUDE_EDITED_FILE\" --auto-assign-agents true --load-context true"
            }
          ]
        }
      ],
      PostToolUse: [
        {
          matcher: "Bash",
          hooks: [
            {
              type: "command",
              command: "node cli.js hooks post-command --command \"$CLAUDE_COMMAND\" --track-metrics true --store-results true"
            }
          ]
        },
        {
          matcher: "Write|Edit|MultiEdit",
          hooks: [
            {
              type: "command",
              command: "node cli.js hooks post-edit --file \"$CLAUDE_EDITED_FILE\" --format true --update-memory true --train-neural true"
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command: "node cli.js hooks session-end --generate-summary true --persist-state true --export-metrics true"
            }
          ]
        }
      ]
    },
    mcpServers: {
      flowx: {
        command: "node",
        args: [
          "cli.js",
          "mcp",
          "serve",
          "--transport",
          "stdio",
          "--log-level",
          "info"
        ],
        env: {
          NODE_ENV: "production",
          FLOWX_ENV: "mcp",
          FLOWX_DATA_PATH: "./.flowx",
          FLOWX_HOOKS_ENABLED: "true",
          FLOWX_TELEMETRY_ENABLED: "true",
          FLOWX_REMOTE_READY: "true",
          FLOWX_GITHUB_INTEGRATION: "true"
        }
      }
    },
    includeCoAuthoredBy: true,
    features: {
      autoTopologySelection: true,
      parallelExecution: true,
      neuralTraining: true,
      bottleneckAnalysis: true,
      smartAutoSpawning: true,
      selfHealingWorkflows: true,
      crossSessionMemory: true,
      githubIntegration: true
    },
    performance: {
      maxAgents: 10,
      defaultTopology: "hierarchical",
      executionStrategy: "parallel",
      tokenOptimization: true,
      cacheEnabled: true,
      telemetryLevel: "detailed"
    }
  };
  
  // Ensure .claude directory exists
  const { mkdir } = await import('fs/promises');
  await mkdir('.claude', { recursive: true });
  
  // Write default configuration
  await writeFile('.claude/settings.json', JSON.stringify(defaultConfig, null, 2));
  printSuccess('Created default configuration at .claude/settings.json');
  printInfo('Configuration includes Claude Code 1.0.51+ compatible hooks');
} 