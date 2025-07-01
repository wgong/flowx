/**
 * Output Formatter
 * Provides consistent formatting and color utilities for CLI output
 */

// Color combinations for consistent theming
export const colorCombos = {
  // Success states
  successBold: '\x1b[1m\x1b[32m',      // Bold green
  successNormal: '\x1b[32m',            // Green
  
  // Error states  
  errorBold: '\x1b[1m\x1b[31m',        // Bold red
  errorNormal: '\x1b[31m',              // Red
  
  // Warning states
  warningBold: '\x1b[1m\x1b[33m',      // Bold yellow
  warningNormal: '\x1b[33m',            // Yellow
  
  // Info states
  infoBold: '\x1b[1m\x1b[36m',         // Bold cyan
  infoNormal: '\x1b[36m',               // Cyan
  
  // Primary states
  primaryBold: '\x1b[1m\x1b[34m',      // Bold blue
  primaryNormal: '\x1b[34m',            // Blue
  
  // Neutral states
  mutedBold: '\x1b[1m\x1b[90m',        // Bold gray
  mutedNormal: '\x1b[90m',              // Gray
  
  // Special combinations
  whiteBold: '\x1b[1m\x1b[37m',        // Bold white
  whiteNormal: '\x1b[37m',              // White
  
  // Reset
  reset: '\x1b[0m'
};

// Individual color codes for compatibility
export const colors = {
  // Basic colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  strikethrough: '\x1b[9m',
  
  // Reset
  reset: '\x1b[0m'
};

// Hex color support
export function hex(color: string): string {
  // Convert hex to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

// Color utility functions
export function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

export function bold(text: string): string {
  return `${colors.bold}${text}${colors.reset}`;
}

export function dim(text: string): string {
  return `${colors.dim}${text}${colors.reset}`;
}

export function underline(text: string): string {
  return `${colors.underline}${text}${colors.reset}`;
}

// Semantic formatting functions
export function success(text: string): string {
  return colorize(text, colorCombos.successNormal);
}

export function error(text: string): string {
  return colorize(text, colorCombos.errorNormal);
}

export function warning(text: string): string {
  return colorize(text, colorCombos.warningNormal);
}

export function info(text: string): string {
  return colorize(text, colorCombos.infoNormal);
}

export function primary(text: string): string {
  return colorize(text, colorCombos.primaryNormal);
}

export function muted(text: string): string {
  return colorize(text, colorCombos.mutedNormal);
}

// Bold variants
export function successBold(text: string): string {
  return colorize(text, colorCombos.successBold);
}

export function errorBold(text: string): string {
  return colorize(text, colorCombos.errorBold);
}

export function warningBold(text: string): string {
  return colorize(text, colorCombos.warningBold);
}

export function infoBold(text: string): string {
  return colorize(text, colorCombos.infoBold);
}

export function primaryBold(text: string): string {
  return colorize(text, colorCombos.primaryBold);
}

export function mutedBold(text: string): string {
  return colorize(text, colorCombos.mutedBold);
}

export function whiteBold(text: string): string {
  return colorize(text, colorCombos.whiteBold);
}

// Message formatting with icons
export function printSuccess(message: string): void {
  console.log(`${success('✅')} ${message}`);
}

export function printError(message: string): void {
  console.error(`${error('❌')} ${message}`);
}

export function printWarning(message: string): void {
  console.warn(`${warning('⚠️')} ${message}`);
}

export function printInfo(message: string): void {
  console.log(`${info('ℹ️')} ${message}`);
}

// Progress and status indicators
export function progressBar(current: number, total: number, width: number = 20): string {
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(percentage * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.round(percentage * 100);
  
  return `${primary('[')}${success(bar)}${primary(']')} ${percent}%`;
}

export function spinner(frame: number): string {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  return primary(frames[frame % frames.length]);
}

// Table formatting
export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

export function formatTable(data: any[], columns: TableColumn[]): string {
  if (data.length === 0) return '';
  
  // Calculate column widths
  const widths = columns.map(col => {
    const headerWidth = col.header.length;
    const dataWidth = Math.max(...data.map(row => {
      const value = col.formatter ? col.formatter(row[col.key]) : String(row[col.key] || '');
      return value.length;
    }));
    return col.width || Math.max(headerWidth, dataWidth);
  });
  
  let result = '';
  
  // Header
  const headerRow = columns.map((col, i) => {
    const text = col.header.padEnd(widths[i]);
    return primaryBold(text);
  }).join(' │ ');
  
  result += `┌${'─'.repeat(headerRow.length - 8)}┐\n`; // Adjust for color codes
  result += `│ ${headerRow} │\n`;
  result += `├${'─'.repeat(headerRow.length - 8)}┤\n`;
  
  // Data rows
  for (const row of data) {
    const dataRow = columns.map((col, i) => {
      const value = col.formatter ? col.formatter(row[col.key]) : String(row[col.key] || '');
      return value.padEnd(widths[i]);
    }).join(' │ ');
    
    result += `│ ${dataRow} │\n`;
  }
  
  result += `└${'─'.repeat(headerRow.length - 8)}┘`;
  
  return result;
}

// Formatting utilities
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatDate(date: Date): string {
  return date.toLocaleString();
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// Box drawing for highlighting content
export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxWidth = Math.max(...lines.map(line => line.length));
  const width = Math.max(maxWidth, title ? title.length + 4 : 0);
  
  let result = '';
  
  if (title) {
    result += `┌─ ${primaryBold(title)} ${'─'.repeat(Math.max(0, width - title.length - 3))}┐\n`;
  } else {
    result += `┌${'─'.repeat(width + 2)}┐\n`;
  }
  
  for (const line of lines) {
    result += `│ ${line.padEnd(width)} │\n`;
  }
  
  result += `└${'─'.repeat(width + 2)}┘`;
  
  return result;
}

// Banner and logo formatting
export function banner(text: string, subtitle?: string): string {
  const lines = [text];
  if (subtitle) lines.push(subtitle);
  
  const maxWidth = Math.max(...lines.map(line => line.length));
  const padding = 4;
  const totalWidth = maxWidth + padding * 2;
  
  let result = '';
  result += primaryBold('═'.repeat(totalWidth)) + '\n';
  
  for (const line of lines) {
    const leftPad = Math.floor((totalWidth - line.length) / 2);
    const rightPad = totalWidth - line.length - leftPad;
    result += primaryBold('║') + ' '.repeat(leftPad) + whiteBold(line) + ' '.repeat(rightPad) + primaryBold('║') + '\n';
  }
  
  result += primaryBold('═'.repeat(totalWidth));
  
  return result;
}

// Export all for convenience
export const formatter = {
  colors,
  colorCombos,
  hex,
  colorize,
  bold,
  dim,
  underline,
  success,
  error,
  warning,
  info,
  primary,
  muted,
  successBold,
  errorBold,
  warningBold,
  infoBold,
  primaryBold,
  mutedBold,
  whiteBold,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  progressBar,
  spinner,
  formatTable,
  formatBytes,
  formatDuration,
  formatDate,
  formatRelativeTime,
  box,
  banner
};

export default formatter; 