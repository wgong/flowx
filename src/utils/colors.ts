// A simple, dependency-free color utility
export const colors = {
  blue: (str: string) => `\x1b[34m${str}\x1b[0m`,
  green: (str: string) => `\x1b[32m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
  red: (str: string) => `\x1b[31m${str}\x1b[0m`,
  cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
  bold: (str: string) => `\x1b[1m${str}\x1b[0m`,
  dim: (str: string) => `\x1b[2m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
  italic: (str: string) => `\x1b[3m${str}\x1b[0m`,
  reset: '\x1b[0m',
  // Simple hex method that falls back to basic colors
  hex: (hexColor: string) => (str: string) => {
    // Map common hex colors to ANSI equivalents
    const colorMap: { [key: string]: string } = {
      '#00AA00': '\x1b[32m', // green
      '#FF0000': '\x1b[31m', // red
      '#FFAA00': '\x1b[33m', // yellow
      '#0066CC': '\x1b[34m', // blue
    };
    const ansi = colorMap[hexColor] || '\x1b[37m'; // default to white
    return `${ansi}${str}\x1b[0m`;
  }
}; 