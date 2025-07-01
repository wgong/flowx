/**
 * Output formatting utilities for CLI
 */

import { Logger } from '../core/logger.js';
import { AgentProfile, Task, MemoryEntry, HealthStatus, ComponentHealth } from "../utils/types.js";

// Simple color utilities (replacing @cliffy/ansi/colors)
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[0m`,
};

// Extended color combinations
const colorCombos = {
  cyanBold: (text: string) => `\x1b[1;36m${text}\x1b[0m`,
  greenBold: (text: string) => `\x1b[1;32m${text}\x1b[0m`,
  yellowBold: (text: string) => `\x1b[1;33m${text}\x1b[0m`,
  redBold: (text: string) => `\x1b[1;31m${text}\x1b[0m`,
  magentaBold: (text: string) => `\x1b[1;35m${text}\x1b[0m`,
  whiteBold: (text: string) => `\x1b[1;37m${text}\x1b[0m`,
};

// Simple table utility (replacing @cliffy/table)
class SimpleTable {
  private rows: string[][] = [];
  private headers: string[] = [];

  constructor() {}

  header(headers: string[]): this {
    this.headers = headers;
    return this;
  }

  body(rows: string[][]): this {
    this.rows = rows;
    return this;
  }

  toString(): string {
    const allRows = this.headers.length > 0 ? [this.headers, ...this.rows] : this.rows;
    if (allRows.length === 0) return '';

    // Calculate column widths
    const colWidths = allRows[0].map((_, colIndex) => 
      Math.max(...allRows.map(row => (row[colIndex] || '').length))
    );

    // Format rows
    const formatRow = (row: string[]) => 
      '| ' + row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ') + ' |';

    const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';

    const result = [separator];
    if (this.headers.length > 0) {
      result.push(formatRow(this.headers));
      result.push(separator);
    }
    this.rows.forEach(row => result.push(formatRow(row)));
    result.push(separator);

    return result.join('\n');
  }
}

// Export the Table class properly
export { SimpleTable as Table };

/**
 * Formats an error for display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    let message = error.message;
    
    if ('code' in error) {
      message = `[${(error as any).code}] ${message}`;
    }
    
    if ('details' in error && (error as any).details) {
      message += '\n' + colors.gray('Details: ' + JSON.stringify((error as any).details, null, 2));
    }
    
    return message;
  }
  
  return String(error);
}

/**
 * Formats an agent profile for display
 */
export function formatAgent(agent: AgentProfile): string {
  const lines = [
    colorCombos.cyanBold(`Agent: ${agent.name}`),
    colors.gray(`ID: ${agent.id}`),
    colors.gray(`Type: ${agent.type}`),
    colors.gray(`Priority: ${agent.priority}`),
    colors.gray(`Max Tasks: ${agent.maxConcurrentTasks}`),
    colors.gray(`Capabilities: ${agent.capabilities.join(', ')}`),
  ];
  
  return lines.join('\n');
}

/**
 * Formats a task for display
 */
export function formatTask(task: Task): string {
  const statusColor = {
    pending: colors.gray,
    queued: colors.yellow,
    assigned: colors.blue,
    running: colors.cyan,
    completed: colors.green,
    failed: colors.red,
    cancelled: colors.magenta,
  } as Record<string, (text: string) => string>;

  const colorFn = statusColor[task.status] || colors.white;

  const lines = [
    colorCombos.yellowBold(`Task: ${task.description}`),
    colors.gray(`ID: ${task.id}`),
    colors.gray(`Type: ${task.type}`),
    colorFn(`Status: ${task.status}`),
    colors.gray(`Priority: ${task.priority}`),
  ];

  if (task.assignedAgent) {
    lines.push(colors.gray(`Assigned to: ${task.assignedAgent}`));
  }

  if (task.dependencies.length > 0) {
    lines.push(colors.gray(`Dependencies: ${task.dependencies.join(', ')}`));
  }

  if (task.error) {
    lines.push(colors.red(`Error: ${task.error.message}`));
  }

  return lines.join('\n');
}

/**
 * Formats a memory entry for display
 */
export function formatMemoryEntry(entry: MemoryEntry): string {
  const lines = [
    colorCombos.magentaBold(`Memory Entry: ${entry.type}`),
    colors.gray(`ID: ${entry.id}`),
    colors.gray(`Agent: ${entry.agentId}`),
    colors.gray(`Session: ${entry.sessionId}`),
    colors.gray(`Timestamp: ${entry.timestamp.toISOString()}`),
    colors.gray(`Version: ${entry.version}`),
  ];

  if (entry.tags.length > 0) {
    lines.push(colors.gray(`Tags: ${entry.tags.join(', ')}`));
  }

  lines.push('', colors.white('Content:'), entry.content);

  return lines.join('\n');
}

/**
 * Formats health status for display
 */
export function formatHealthStatus(health: HealthStatus): string {
  const statusColorMap = {
    healthy: colors.green,
    degraded: colors.yellow,
    unhealthy: colors.red,
  } as Record<string, (text: string) => string>;

  const statusColor = statusColorMap[health.status] || colors.white;

  const lines = [
    statusColor(`System Status: ${health.status.toUpperCase()}`),
    colors.gray(`Checked at: ${health.timestamp.toISOString()}`),
    '',
    colorCombos.cyanBold('Components:'),
  ];

  for (const [name, component] of Object.entries(health.components)) {
    const typedComponent = component as ComponentHealth;
    const compColorMap = {
      healthy: colors.green,
      degraded: colors.yellow,
      unhealthy: colors.red,
    } as Record<string, (text: string) => string>;

    const compColor = compColorMap[typedComponent.status] || colors.white;

    lines.push(compColor(`  ${name}: ${typedComponent.status}`));
    
    if (typedComponent.error) {
      lines.push(colors.red(`    Error: ${typedComponent.error}`));
    }

    if (typedComponent.metrics) {
      for (const [metric, value] of Object.entries(typedComponent.metrics)) {
        lines.push(colors.gray(`    ${metric}: ${value}`));
      }
    }
  }

  return lines.join('\n');
}

/**
 * Creates a table for agent listing
 */
export function createAgentTable(agents: AgentProfile[]): SimpleTable {
  const table = new SimpleTable()
    .header(['ID', 'Name', 'Type', 'Priority', 'Max Tasks']);

  const rows = agents.map(agent => [
    agent.id,
    agent.name,
    agent.type,
    agent.priority.toString(),
    agent.maxConcurrentTasks.toString(),
  ]);

  return table.body(rows);
}

/**
 * Creates a table for task listing
 */
export function createTaskTable(tasks: Task[]): SimpleTable {
  const table = new SimpleTable()
    .header(['ID', 'Type', 'Description', 'Status', 'Agent']);

  const rows = tasks.map(task => [
    task.id,
    task.type,
    task.description.substring(0, 30) + (task.description.length > 30 ? '...' : ''),
    task.status,
    task.assignedAgent || 'None',
  ]);

  return table.body(rows);
}

/**
 * Formats duration in human-readable form
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  return `${seconds}s`;
}

/**
 * Displays the Claude-Flow banner
 */
export function displayBanner(version: string): void {
  const banner = `
${colorCombos.cyanBold('╔══════════════════════════════════════════════════════════════╗')}
${colorCombos.cyanBold('║')}             ${colorCombos.whiteBold('🧠 Claude-Flow')} ${colors.gray('v' + version)}                        ${colorCombos.cyanBold('║')}
${colorCombos.cyanBold('║')}          ${colors.gray('Advanced AI Agent Orchestration')}               ${colorCombos.cyanBold('║')}
${colorCombos.cyanBold('╚══════════════════════════════════════════════════════════════╝')}
`;
  console.log(banner);
}

/**
 * Displays detailed version information
 */
export function displayVersion(version: string, buildDate: string): void {
  const nodeVersion = process.version;
  const info = [
    colorCombos.cyanBold('Claude-Flow Version Information'),
    '',
    colors.white('Version:    ') + colors.yellow(version),
    colors.white('Build Date: ') + colors.yellow(buildDate),
    colors.white('Runtime:    ') + colors.yellow('Node.js ' + nodeVersion),
    colors.white('Platform:   ') + colors.yellow(process.platform + ' ' + process.arch),
    '',
    colors.gray('Components:'),
    colors.white('  • Multi-Agent Orchestration'),
    colors.white('  • Memory Management'),
    colors.white('  • Terminal Integration'),
    colors.white('  • MCP Server'),
    colors.white('  • Task Coordination'),
    '',
    colors.blue('Homepage: ') + colors.underline('https://github.com/anthropics/claude-code-flow'),
  ];
  
  console.log(info.join('\n'));
}

/**
 * Formats a progress bar
 */
export function formatProgressBar(
  current: number,
  total: number,
  width: number = 40,
  label?: string
): string {
  const percentage = Math.min(100, (current / total) * 100);
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  
  const bar = colors.green('█'.repeat(filled)) + colors.gray('░'.repeat(empty));
  const percent = percentage.toFixed(1).padStart(5) + '%';
  
  let result = `[${bar}] ${percent}`;
  if (label) {
    result = `${label}: ${result}`;
  }
  
  return result;
}

/**
 * Creates a status indicator
 */
export function formatStatusIndicator(status: string): string {
  const indicators = {
    success: colors.green('✓'),
    error: colors.red('✗'),
    warning: colors.yellow('⚠'),
    info: colors.blue('ℹ'),
    running: colors.cyan('⟳'),
    pending: colors.gray('○'),
  };
  
  return indicators[status as keyof typeof indicators] || status;
}

/**
 * Formats a spinner with message
 */
export function formatSpinner(message: string, frame: number = 0): string {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const spinner = colors.cyan(frames[frame % frames.length]);
  return `${spinner} ${message}`;
}