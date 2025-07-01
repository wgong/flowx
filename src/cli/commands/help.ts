/**
 * Comprehensive help system for Claude-Flow CLI
 */

import { Command } from 'commander';
import * as readline from 'readline';

// Simple color utilities with bold combinations
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

// Color combination helpers
const colorCombos = {
  cyanBold: (text: string) => `\x1b[1;36m${text}\x1b[0m`,
  whiteBold: (text: string) => `\x1b[1;37m${text}\x1b[0m`,
  greenBold: (text: string) => `\x1b[1;32m${text}\x1b[0m`,
  yellowBold: (text: string) => `\x1b[1;33m${text}\x1b[0m`,
};

// Extend colors with bold combinations
Object.assign(colors, {
  cyan: Object.assign(colors.cyan, { bold: colorCombos.cyanBold }),
  white: Object.assign(colors.white, { bold: colorCombos.whiteBold }),
  green: Object.assign(colors.green, { bold: colorCombos.greenBold }),
  yellow: Object.assign(colors.yellow, { bold: colorCombos.yellowBold }),
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

// Simple select prompt
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

export const helpCommand = new Command()
  .description('Comprehensive help system with examples and tutorials')
  .argument('[topic]', 'Help topic to display')
  .option('-i, --interactive', 'Start interactive help mode')
  .option('-e, --examples', 'Show examples for the topic')
  .option('--tutorial', 'Show tutorial for the topic')
  .option('--all', 'Show all available help topics')
  .action(async (topic: string | undefined, options: any) => {
    if (options.interactive) {
      await startInteractiveHelp();
    } else if (options.all) {
      showAllTopics();
    } else if (topic) {
      await showTopicHelp(topic, options);
    } else {
      showMainHelp();
    }
  });

interface HelpTopic {
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'workflow' | 'configuration' | 'troubleshooting';
  examples?: HelpExample[];
  tutorial?: string[];
  related?: string[];
}

interface HelpExample {
  description: string;
  command: string;
  explanation?: string;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    name: 'getting-started',
    description: 'Basic introduction to Claude-Flow',
    category: 'basic',
    tutorial: [
      'Welcome to Claude-Flow! This tutorial will get you started.',
      '1. First, initialize a configuration file:',
      '   claude-flow config init',
      '',
      '2. Start the orchestration system:',
      '   claude-flow start',
      '',
      '3. In another terminal, spawn your first agent:',
      '   claude-flow agent spawn researcher --name "My Research Agent"',
      '',
      '4. Create a task for the agent:',
      '   claude-flow task create research "Find information about AI trends"',
      '',
      '5. Monitor progress:',
      '   claude-flow status',
      '',
      'You can also use the interactive REPL mode:',
      '   claude-flow repl',
      '',
      'For more help, try: claude-flow help <topic>'
    ],
    related: ['agents', 'tasks', 'configuration']
  },
  {
    name: 'agents',
    description: 'Working with Claude-Flow agents',
    category: 'basic',
    examples: [
      {
        description: 'Spawn a research agent',
        command: 'claude-flow agent spawn researcher --name "Research Assistant"',
        explanation: 'Creates a new research agent with specialized capabilities for information gathering'
      },
      {
        description: 'List all active agents',
        command: 'claude-flow agent list',
        explanation: 'Shows all currently running agents with their status and task counts'
      },
      {
        description: 'Get detailed agent information',
        command: 'claude-flow agent info agent-001',
        explanation: 'Displays comprehensive information about a specific agent'
      },
      {
        description: 'Terminate an agent',
        command: 'claude-flow agent terminate agent-001',
        explanation: 'Safely shuts down an agent and reassigns its tasks'
      }
    ],
    tutorial: [
      'Agents are the core workers in Claude-Flow. Each agent has:',
      '• A unique ID (automatically generated)',
      '• A name (for easy identification)',
      '• A type (coordinator, researcher, implementer, analyst, custom)',
      '• Capabilities (what the agent can do)',
      '• A system prompt (instructions for the agent)',
      '',
      'Agent Types:',
      '• coordinator: Plans and delegates tasks',
      '• researcher: Gathers and analyzes information',
      '• implementer: Writes code and creates solutions',
      '• analyst: Identifies patterns and generates insights',
      '• custom: User-defined behavior',
      '',
      'Best Practices:',
      '• Use descriptive names for your agents',
      '• Match agent types to your workflow needs',
      '• Monitor agent performance with "claude-flow status"',
      '• Terminate idle agents to free resources'
    ],
    related: ['tasks', 'workflows', 'coordination']
  },
  {
    name: 'tasks',
    description: 'Creating and managing tasks',
    category: 'basic',
    examples: [
      {
        description: 'Create a research task',
        command: 'claude-flow task create research "Find papers on quantum computing" --priority 5',
        explanation: 'Creates a high-priority research task with specific instructions'
      },
      {
        description: 'Create a task with dependencies',
        command: 'claude-flow task create analysis "Analyze research results" --dependencies task-001',
        explanation: 'Creates a task that waits for task-001 to complete before starting'
      },
      {
        description: 'Assign task to specific agent',
        command: 'claude-flow task create implementation "Write API client" --assign agent-003',
        explanation: 'Directly assigns a task to a specific agent'
      },
      {
        description: 'Monitor task progress',
        command: 'claude-flow task status task-001',
        explanation: 'Shows detailed status and progress information for a task'
      },
      {
        description: 'Cancel a running task',
        command: 'claude-flow task cancel task-001 --reason "Requirements changed"',
        explanation: 'Stops a task and provides a reason for cancellation'
      }
    ],
    tutorial: [
      'Tasks are units of work that agents execute. Key concepts:',
      '',
      'Task Properties:',
      '• ID: Unique identifier',
      '• Type: Category of work (research, implementation, analysis, etc.)',
      '• Description: What needs to be done',
      '• Priority: Execution order (0-10, higher = more urgent)',
      '• Dependencies: Tasks that must complete first',
      '• Input: Data needed by the task',
      '• Status: Current state (pending, running, completed, failed)',
      '',
      'Task Lifecycle:',
      '1. Created (pending status)',
      '2. Queued (waiting for agent)',
      '3. Assigned (agent selected)',
      '4. Running (actively being worked on)',
      '5. Completed/Failed (final state)',
      '',
      'Task Dependencies:',
      '• Tasks can depend on other tasks',
      '• Dependencies must complete before task starts',
      '• Use for sequential workflows',
      '• Circular dependencies are not allowed'
    ],
    related: ['agents', 'workflows', 'coordination']
  },
  {
    name: 'claude',
    description: 'Spawning Claude instances with specific configurations',
    category: 'basic',
    examples: [
      {
        description: 'Spawn Claude with web research capabilities',
        command: 'claude-flow claude spawn "implement user authentication" --research --parallel',
        explanation: 'Creates a Claude instance with WebFetchTool and BatchTool for parallel web research'
      },
      {
        description: 'Spawn Claude without permission prompts',
        command: 'claude-flow claude spawn "fix payment bug" --no-permissions',
        explanation: 'Runs Claude with --dangerously-skip-permissions flag to avoid interruptions'
      },
      {
        description: 'Spawn Claude with custom tools',
        command: 'claude-flow claude spawn "analyze codebase" --tools "View,Edit,GrepTool,LS"',
        explanation: 'Specifies exactly which tools Claude can use for the task'
      },
      {
        description: 'Spawn Claude with test coverage target',
        command: 'claude-flow claude spawn "write unit tests" --coverage 95 --commit feature',
        explanation: 'Sets test coverage goal to 95% and commits after each feature'
      },
      {
        description: 'Dry run to preview command',
        command: 'claude-flow claude spawn "build API" --mode backend-only --dry-run',
        explanation: 'Shows what would be executed without actually running Claude'
      }
    ],
    tutorial: [
      'The claude spawn command launches Claude instances with specific configurations.',
      '',
      'Available Options:',
      '• --tools, -t: Specify allowed tools (default: View,Edit,Replace,GlobTool,GrepTool,LS,Bash)',
      '• --no-permissions: Skip permission prompts with --dangerously-skip-permissions',
      '• --config, -c: Path to MCP configuration file',
      '• --mode, -m: Development mode (full, backend-only, frontend-only, api-only)',
      '• --parallel: Enable BatchTool and dispatch_agent for parallel execution',
      '• --research: Enable WebFetchTool for web research capabilities',
      '• --coverage: Test coverage target percentage (default: 80)',
      '• --commit: Commit frequency (phase, feature, manual)',
      '• --verbose, -v: Enable verbose output',
      '• --dry-run, -d: Preview what would be executed',
      '',
      'Environment Variables Set:',
      '• CLAUDE_INSTANCE_ID: Unique identifier for the Claude instance',
      '• CLAUDE_FLOW_MODE: Development mode setting',
      '• CLAUDE_FLOW_COVERAGE: Target test coverage percentage',
      '• CLAUDE_FLOW_COMMIT: Commit frequency setting',
      '',
      'Common Use Cases:',
      '• Full-stack development: --mode full --parallel',
      '• API development: --mode backend-only --coverage 90',
      '• Bug fixing: --no-permissions --verbose',
      '• Research tasks: --research --parallel',
      '• Test writing: --coverage 95 --commit feature'
    ],
    related: ['agents', 'tasks', 'workflows']
  },
  {
    name: 'workflows',
    description: 'Building complex multi-step workflows',
    category: 'workflow',
    examples: [
      {
        description: 'Run a workflow from file',
        command: 'claude-flow workflow run research-pipeline.json --watch',
        explanation: 'Executes a workflow definition and monitors progress in real-time'
      },
      {
        description: 'Validate workflow before running',
        command: 'claude-flow workflow validate my-workflow.json --strict',
        explanation: 'Checks workflow syntax and dependencies without executing'
      },
      {
        description: 'Generate workflow template',
        command: 'claude-flow workflow template research --output research-workflow.json',
        explanation: 'Creates a pre-configured workflow template for research tasks'
      },
      {
        description: 'Monitor running workflows',
        command: 'claude-flow workflow list --all',
        explanation: 'Shows all workflows including completed ones'
      },
      {
        description: 'Stop a running workflow',
        command: 'claude-flow workflow stop workflow-001 --force',
        explanation: 'Immediately stops all tasks in a workflow'
      }
    ],
    tutorial: [
      'Workflows orchestrate multiple tasks and agents. Structure:',
      '',
      'Workflow Definition (JSON):',
      '{',
      '  "name": "Research and Analysis",',
      '  "description": "Multi-stage research workflow",',
      '  "agents": [',
      '    {"id": "researcher", "type": "researcher"},',
      '    {"id": "analyzer", "type": "analyst"}',
      '  ],',
      '  "tasks": [',
      '    {',
      '      "id": "research-task",',
      '      "type": "research",',
      '      "description": "Gather information",',
      '      "assignTo": "researcher"',
      '    },',
      '    {',
      '      "id": "analyze-task",',
      '      "type": "analysis",',
      '      "description": "Analyze findings",',
      '      "assignTo": "analyzer",',
      '      "depends": ["research-task"]',
      '    }',
      '  ]',
      '}',
      '',
      'Workflow Features:',
      '• Variable substitution: ${variable}',
      '• Conditional execution',
      '• Parallel task execution',
      '• Error handling and retries',
      '• Progress monitoring',
      '',
      'Best Practices:',
      '• Start with simple workflows',
      '• Use descriptive task names',
      '• Plan dependencies carefully',
      '• Test with --dry-run first'
    ],
    related: ['tasks', 'agents', 'templates']
  },
  {
    name: 'configuration',
    description: 'Configuring Claude-Flow settings',
    category: 'configuration',
    examples: [
      {
        description: 'Initialize default configuration',
        command: 'claude-flow config init --template development',
        explanation: 'Creates a configuration file optimized for development'
      },
      {
        description: 'View current configuration',
        command: 'claude-flow config show --diff',
        explanation: 'Shows only settings that differ from defaults'
      },
      {
        description: 'Update a setting',
        command: 'claude-flow config set orchestrator.maxConcurrentAgents 20',
        explanation: 'Changes the maximum number of concurrent agents'
      },
      {
        description: 'Save configuration profile',
        command: 'claude-flow config profile save production',
        explanation: 'Saves current settings as a named profile'
      },
      {
        description: 'Load configuration profile',
        command: 'claude-flow config profile load development',
        explanation: 'Switches to a previously saved configuration profile'
      }
    ],
    tutorial: [
      'Configuration controls all aspects of Claude-Flow behavior.',
      '',
      'Main Configuration Sections:',
      '',
      '• orchestrator: Core system settings',
      '  - maxConcurrentAgents: How many agents can run simultaneously',
      '  - taskQueueSize: Maximum pending tasks',
      '  - healthCheckInterval: How often to check system health',
      '',
      '• terminal: Terminal integration settings',
      '  - type: Terminal type (auto, vscode, native)',
      '  - poolSize: Number of terminal sessions to maintain',
      '',
      '• memory: Memory management settings',
      '  - backend: Storage type (sqlite, markdown, hybrid)',
      '  - cacheSizeMB: Memory cache size',
      '  - retentionDays: How long to keep data',
      '',
      '• mcp: Model Context Protocol settings',
      '  - transport: Communication method (stdio, http)',
      '  - port: Network port for HTTP transport',
      '',
      'Configuration Files:',
      '• Global: ~/.claude-flow/config.json',
      '• Project: ./claude-flow.config.json',
      '• Profiles: ~/.claude-flow/profiles/',
      '',
      'Environment Variables:',
      '• CLAUDE_FLOW_LOG_LEVEL: Override log level',
      '• CLAUDE_FLOW_MAX_AGENTS: Override agent limit',
      '• CLAUDE_FLOW_MCP_PORT: Override MCP port'
    ],
    related: ['profiles', 'environment', 'troubleshooting']
  },
  {
    name: 'monitoring',
    description: 'Monitoring system health and performance',
    category: 'advanced',
    examples: [
      {
        description: 'Check system status',
        command: 'claude-flow status --watch',
        explanation: 'Continuously monitors system health and updates every few seconds'
      },
      {
        description: 'Start monitoring dashboard',
        command: 'claude-flow monitor --interval 5',
        explanation: 'Opens a live dashboard with real-time metrics and graphs'
      },
      {
        description: 'View component-specific status',
        command: 'claude-flow status --component orchestrator',
        explanation: 'Shows detailed status for a specific system component'
      },
      {
        description: 'Monitor in compact mode',
        command: 'claude-flow monitor --compact --no-graphs',
        explanation: 'Simplified monitoring view without visual graphs'
      }
    ],
    tutorial: [
      'Claude-Flow provides comprehensive monitoring capabilities.',
      '',
      'Monitoring Commands:',
      '• status: Point-in-time system status',
      '• monitor: Live dashboard with continuous updates',
      '',
      'Key Metrics:',
      '• System Health: Overall status (healthy/degraded/unhealthy)',
      '• Resource Usage: CPU, memory, agent count',
      '• Component Status: Individual system components',
      '• Agent Activity: Active agents and their tasks',
      '• Task Queue: Pending and completed tasks',
      '• Performance Graphs: Historical trends',
      '',
      'Monitoring Best Practices:',
      '• Check status before starting large workflows',
      '• Monitor during heavy usage',
      '• Watch for resource exhaustion',
      '• Track task completion rates',
      '• Set up alerts for critical issues',
      '',
      'Troubleshooting with Monitoring:',
      '• High CPU: Too many concurrent tasks',
      '• High Memory: Large cache or memory leaks',
      '• Failed Tasks: Agent or system issues',
      '• Slow Performance: Resource constraints'
    ],
    related: ['status', 'performance', 'troubleshooting']
  },
  {
    name: 'sessions',
    description: 'Managing sessions and state persistence',
    category: 'advanced',
    examples: [
      {
        description: 'Save current session',
        command: 'claude-flow session save "Development Session" --description "Working on API integration"',
        explanation: 'Saves all current agents, tasks, and memory state'
      },
      {
        description: 'List saved sessions',
        command: 'claude-flow session list',
        explanation: 'Shows all saved sessions with creation dates and metadata'
      },
      {
        description: 'Restore a session',
        command: 'claude-flow session restore session-001 --merge',
        explanation: 'Restores session state, merging with current state'
      },
      {
        description: 'Export session to file',
        command: 'claude-flow session export session-001 backup.json --include-memory',
        explanation: 'Creates a portable backup including agent memory'
      },
      {
        description: 'Clean up old sessions',
        command: 'claude-flow session clean --older-than 30 --dry-run',
        explanation: 'Shows what sessions would be deleted (older than 30 days)'
      }
    ],
    tutorial: [
      'Sessions capture the complete state of your Claude-Flow environment.',
      '',
      'What Sessions Include:',
      '• All active agents and their configurations',
      '• Current task queue and status',
      '• Agent memory and conversation history',
      '• System configuration snapshot',
      '',
      'Session Use Cases:',
      '• Save work-in-progress',
      '• Share team configurations',
      '• Backup before major changes',
      '• Reproduce issues for debugging',
      '• Switch between projects',
      '',
      'Session Management:',
      '• Automatic checksums for integrity',
      '• Compression for large sessions',
      '• Selective restore (agents only, tasks only)',
      '• Version compatibility checking',
      '',
      'Best Practices:',
      '• Save sessions before major changes',
      '• Use descriptive names and tags',
      '• Regular cleanup of old sessions',
      '• Export important sessions as backups',
      '• Test restore before relying on sessions'
    ],
    related: ['backup', 'state', 'persistence']
  },
  {
    name: 'repl',
    description: 'Using the interactive REPL mode',
    category: 'basic',
    examples: [
      {
        description: 'Start REPL mode',
        command: 'claude-flow repl',
        explanation: 'Opens interactive command line with tab completion'
      },
      {
        description: 'REPL with custom history file',
        command: 'claude-flow repl --history-file .my-history',
        explanation: 'Uses a specific file for command history'
      },
      {
        description: 'Skip welcome banner',
        command: 'claude-flow repl --no-banner',
        explanation: 'Starts REPL in minimal mode'
      }
    ],
    tutorial: [
      'The REPL (Read-Eval-Print Loop) provides an interactive interface.',
      '',
      'REPL Features:',
      '• Tab completion for commands and arguments',
      '• Command history (up/down arrows)',
      '• Real-time connection status',
      '• Built-in help system',
      '• Command aliases and shortcuts',
      '',
      'Special REPL Commands:',
      '• help: Show available commands',
      '• status: Check system status',
      '• connect: Connect to orchestrator',
      '• history: View command history',
      '• clear: Clear screen',
      '• cd/pwd: Navigate directories',
      '',
      'REPL Tips:',
      '• Use tab completion extensively',
      '• Check connection status regularly',
      '• Use "help <command>" for detailed help',
      '• History is saved between sessions',
      '• Ctrl+C or "exit" to quit'
    ],
    related: ['completion', 'interactive', 'commands']
  },
  {
    name: 'troubleshooting',
    description: 'Diagnosing and fixing common issues',
    category: 'troubleshooting',
    examples: [
      {
        description: 'Check system health',
        command: 'claude-flow status --component all',
        explanation: 'Comprehensive health check of all components'
      },
      {
        description: 'Enable debug logging',
        command: 'claude-flow start --log-level debug',
        explanation: 'Start with verbose logging for debugging'
      },
      {
        description: 'Validate configuration',
        command: 'claude-flow config validate claude-flow.config.json --strict',
        explanation: 'Check configuration file for errors'
      },
      {
        description: 'Reset to defaults',
        command: 'claude-flow config reset --confirm',
        explanation: 'Restore default configuration settings'
      }
    ],
    tutorial: [
      'Common issues and solutions:',
      '',
      'Connection Issues:',
      '• Problem: "Connection refused" errors',
      '• Solution: Ensure Claude-Flow is started with "claude-flow start"',
      '• Check: MCP transport settings match between client and server',
      '',
      'Agent Issues:',
      '• Problem: Agents not spawning',
      '• Solution: Check agent limits in configuration',
      '• Check: Available system resources',
      '',
      'Task Issues:',
      '• Problem: Tasks stuck in pending state',
      '• Solution: Verify agent availability and task dependencies',
      '• Check: Task queue size limits',
      '',
      'Performance Issues:',
      '• Problem: Slow response times',
      '• Solution: Reduce concurrent agents or increase resources',
      '• Check: Memory usage and cache settings',
      '',
      'Configuration Issues:',
      '• Problem: Settings not taking effect',
      '• Solution: Validate configuration file syntax',
      '• Check: Environment variable overrides',
      '',
      'Debug Commands:',
      '• claude-flow status: System health check',
      '• claude-flow config validate: Configuration check',
      '• claude-flow --verbose: Enable detailed logging',
      '• claude-flow monitor: Real-time diagnostics'
    ],
    related: ['monitoring', 'configuration', 'debugging']
  }
];

function showMainHelp(): void {
  console.log(colorCombos.cyanBold('🧠 Claude-Flow Help System'));
  console.log('');
  console.log('Claude-Flow is an advanced AI agent orchestration platform that enables');
  console.log('sophisticated multi-agent workflows with Claude AI.');
  console.log('');
  console.log('Quick Start:');
  console.log('  claude-flow help getting-started    # Complete beginner tutorial');
  console.log('  claude-flow config init             # Initialize configuration');
  console.log('  claude-flow start                   # Start the orchestration system');
  console.log('  claude-flow agent spawn researcher  # Spawn your first agent');
  console.log('');
  console.log('Common Commands:');
  console.log('  claude-flow start                   # Start orchestration system');
  console.log('  claude-flow agent <subcommand>      # Manage agents');
  console.log('  claude-flow task <subcommand>       # Manage tasks');
  console.log('  claude-flow status                  # Show system status');
  console.log('  claude-flow monitor                 # Live monitoring dashboard');
  console.log('  claude-flow repl                    # Interactive REPL mode');
  console.log('');
  console.log('Get Detailed Help:');
  console.log('  claude-flow help <topic>            # Show help for specific topic');
  console.log('  claude-flow help --all              # List all available topics');
  console.log('  claude-flow help --interactive      # Start interactive help mode');
  console.log('  claude-flow <command> --help        # Show help for specific command');
  console.log('');
  console.log('Popular Topics:');
  console.log('  agents, tasks, workflows, configuration, troubleshooting');
}

function showAllTopics(): void {
  console.log(colorCombos.cyanBold('📚 All Help Topics'));
  console.log('');
  
  const categories = {
    basic: 'Basic Usage',
    advanced: 'Advanced Features', 
    workflow: 'Workflow Management',
    configuration: 'Configuration',
    troubleshooting: 'Troubleshooting'
  };

  for (const [categoryKey, categoryName] of Object.entries(categories)) {
    const topicsInCategory = HELP_TOPICS.filter(t => t.category === categoryKey);
    if (topicsInCategory.length > 0) {
      console.log(colors.yellow(categoryName + ':'));
      for (const topic of topicsInCategory) {
        console.log(`  ${colors.cyan(topic.name.padEnd(20))} ${topic.description}`);
      }
      console.log('');
    }
  }
  
  console.log('Usage: claude-flow help <topic-name>');
  console.log('       claude-flow help <topic-name> --examples');
  console.log('       claude-flow help <topic-name> --tutorial');
}

async function showTopicHelp(topicName: string, options: any): Promise<void> {
  const topic = HELP_TOPICS.find(t => t.name === topicName);
  
  if (!topic) {
    console.log(colors.red(`❌ Help topic "${topicName}" not found.`));
    console.log('');
    console.log('Available topics:');
    for (const t of HELP_TOPICS) {
      console.log(`  ${colors.cyan(t.name)}`);
    }
    return;
  }

  console.log(colorCombos.cyanBold(`📖 Help: ${topic.name}`));
  console.log('');
  console.log(topic.description);
  console.log('');

  if (options.tutorial && topic.tutorial) {
    console.log(colorCombos.yellowBold('📚 Tutorial:'));
    console.log('');
    for (const step of topic.tutorial) {
      console.log(step);
    }
    console.log('');
  }

  if (options.examples && topic.examples) {
    console.log(colorCombos.greenBold('💡 Examples:'));
    console.log('');
    for (const example of topic.examples) {
      console.log(colorCombos.whiteBold(example.description + ':'));
      console.log(colors.gray('  $ ') + colors.cyan(example.command));
      if (example.explanation) {
        console.log('  ' + example.explanation);
      }
      console.log('');
    }
  }

  if (!options.tutorial && !options.examples) {
    // Show both by default
    if (topic.examples) {
      console.log(colorCombos.greenBold('💡 Examples:'));
      console.log('');
      for (const example of topic.examples.slice(0, 3)) { // Show first 3
        console.log(colorCombos.whiteBold(example.description + ':'));
        console.log(colors.gray('  $ ') + colors.cyan(example.command));
        if (example.explanation) {
          console.log('  ' + example.explanation);
        }
        console.log('');
      }
      
      if (topic.examples.length > 3) {
        console.log(colors.gray(`  ... and ${topic.examples.length - 3} more examples`));
        console.log(colors.gray(`  Use --examples to see all examples`));
        console.log('');
      }
    }

    if (topic.tutorial) {
      console.log(colors.gray('💡 Tip: Use --tutorial to see step-by-step tutorial'));
      console.log('');
    }
  }

  if (topic.related && topic.related.length > 0) {
    console.log(colorCombos.cyanBold('🔗 Related Topics:'));
    console.log('');
    for (const related of topic.related) {
      console.log(`  claude-flow help ${colors.cyan(related)}`);
    }
    console.log('');
  }
}

async function startInteractiveHelp(): Promise<void> {
  console.log(colorCombos.cyanBold('🧠 Claude-Flow Interactive Help'));
  console.log('');
  console.log('Welcome to the interactive help system!');
  console.log('You can browse topics by category or search for specific information.');
  console.log('');

  while (true) {
    const choice = await Select({
      message: 'What would you like to do?',
      options: [
        'Browse help topics by category',
        'Search for a specific topic',
        'Show getting started tutorial',
        'Show all available commands',
        'Exit interactive help'
      ]
    });

    switch (choice) {
      case 'Browse help topics by category':
        await browseByCategory();
        break;
      case 'Search for a specific topic':
        await searchTopics();
        break;
      case 'Show getting started tutorial':
        await showTopicHelp('getting-started', { tutorial: true });
        break;
      case 'Show all available commands':
        showAllTopics();
        break;
      case 'Exit interactive help':
        console.log('');
        console.log(colors.gray('Thanks for using Claude-Flow help! 👋'));
        return;
    }

    console.log('');
    console.log(colors.gray('Press Enter to continue...'));
    await new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('', () => {
        rl.close();
        resolve(void 0);
      });
    });
    console.clear();
  }
}

async function browseByCategory(): Promise<void> {
  const categories = {
    basic: 'Basic Usage',
    advanced: 'Advanced Features', 
    workflow: 'Workflow Management',
    configuration: 'Configuration',
    troubleshooting: 'Troubleshooting'
  };

  const categoryChoice = await Select({
    message: 'Select a category to browse:',
    options: Object.values(categories)
  });

  const categoryKey = Object.keys(categories).find(key => categories[key as keyof typeof categories] === categoryChoice);
  const topicsInCategory = HELP_TOPICS.filter(t => t.category === categoryKey);

  if (topicsInCategory.length === 0) {
    console.log(colors.yellow('No topics found in this category.'));
    return;
  }

  const topicChoice = await Select({
    message: 'Select a topic to view:',
    options: topicsInCategory.map(t => `${t.name} - ${t.description}`)
  });

  const selectedTopic = topicsInCategory.find(t => topicChoice.startsWith(t.name));
  if (selectedTopic) {
    await showTopicHelp(selectedTopic.name, {});
  }
}

async function searchTopics(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const searchTerm = await new Promise<string>((resolve) => {
    rl.question('Enter search term: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  const matchingTopics = HELP_TOPICS.filter(topic => 
    topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (matchingTopics.length === 0) {
    console.log(colors.yellow(`No topics found matching "${searchTerm}"`));
    return;
  }

  console.log(colors.green(`Found ${matchingTopics.length} matching topics:`));
  console.log('');

  for (const topic of matchingTopics) {
    console.log(`${colors.cyan(topic.name)} - ${topic.description}`);
  }

  if (matchingTopics.length === 1) {
    console.log('');
    await showTopicHelp(matchingTopics[0].name, {});
  } else {
    const topicChoice = await Select({
      message: 'Select a topic to view:',
      options: matchingTopics.map(t => `${t.name} - ${t.description}`)
    });

    const selectedTopic = matchingTopics.find(t => topicChoice.startsWith(t.name));
    if (selectedTopic) {
      await showTopicHelp(selectedTopic.name, {});
    }
  }
}