/**
 * Runtime Environment Detection and Compatibility Layer
 * Provides unified APIs that work in both Deno and Node.js
 */

// Type declarations for Deno when it might not be available
declare global {
  var Deno: any;
}

// Detect runtime environment
export const isDeno = (): boolean => typeof globalThis.Deno !== 'undefined';
export const isNode = (): boolean => typeof process !== 'undefined' && !!process.versions?.node;

// Environment variables access
export const getEnv = (key: string): string | undefined => {
  if (isDeno()) {
    return globalThis.Deno.env.get(key);
  } else {
    return process.env[key];
  }
};

export const setEnv = (key: string, value: string): void => {
  if (isDeno()) {
    globalThis.Deno.env.set(key, value);
  } else {
    process.env[key] = value;
  }
};

// File system operations
export const readTextFile = async (path: string): Promise<string> => {
  if (isDeno()) {
    return await globalThis.Deno.readTextFile(path);
  } else {
    const { readFile } = await import('node:fs/promises');
    return await readFile(path, 'utf-8');
  }
};

export const writeTextFile = async (path: string, content: string): Promise<void> => {
  if (isDeno()) {
    await globalThis.Deno.writeTextFile(path, content);
  } else {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path, content, 'utf-8');
  }
};

export const exists = async (path: string): Promise<boolean> => {
  try {
    if (isDeno()) {
      await globalThis.Deno.stat(path);
      return true;
    } else {
      const { access } = await import('node:fs/promises');
      await access(path);
      return true;
    }
  } catch {
    return false;
  }
};

export const mkdir = async (path: string, options?: { recursive?: boolean }): Promise<void> => {
  if (isDeno()) {
    await globalThis.Deno.mkdir(path, options);
  } else {
    const { mkdir: nodeMkdir } = await import('node:fs/promises');
    await nodeMkdir(path, options);
  }
};

// Process operations
export const exit = (code?: number): never => {
  if (isDeno()) {
    globalThis.Deno.exit(code);
  } else {
    process.exit(code);
  }
  // This line should never be reached, but TypeScript requires it
  throw new Error('Process exit failed');
};

export const cwd = (): string => {
  if (isDeno()) {
    return globalThis.Deno.cwd();
  } else {
    return process.cwd();
  }
};

export const chdir = (path: string): void => {
  if (isDeno()) {
    globalThis.Deno.chdir(path);
  } else {
    process.chdir(path);
  }
};

// Path utilities
export const resolvePath = (...paths: string[]): string => {
  if (isDeno()) {
    return new URL(paths.join('/'), import.meta.url).pathname;
  } else {
    const path = require('node:path');
    return path.resolve(...paths);
  }
};

// Command execution
export const runCommand = async (
  cmd: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> }
): Promise<{ success: boolean; stdout: string; stderr: string }> => {
  if (isDeno()) {
    const commandOptions: any = {
      args,
      stdout: 'piped',
      stderr: 'piped',
    };
    
    if (options?.cwd) {
      commandOptions.cwd = options.cwd;
    }
    
    if (options?.env) {
      commandOptions.env = options.env;
    }
    
    const command = new globalThis.Deno.Command(cmd, commandOptions);
    
    const { code, stdout, stderr } = await command.output();
    
    return {
      success: code === 0,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
  } else {
    const { spawn } = await import('node:child_process');
    
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        stdio: 'pipe',
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
        });
      });
    });
  }
};

export const runInteractiveCommand = async (
  cmd: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> }
): Promise<number> => {
  if (isDeno()) {
    const commandOptions: any = {
      args,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    };
    if (options?.cwd) {
        commandOptions.cwd = options.cwd;
    }
    if (options?.env) {
        commandOptions.env = options.env;
    }
    const command = new globalThis.Deno.Command(cmd, commandOptions);
    const process = command.spawn();
    const { code } = await process.status;
    return code ?? 1;
  } else {
    const { spawn } = await import('node:child_process');
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        stdio: 'inherit',
      });
      child.on('close', (code) => {
        resolve(code ?? 1);
      });
    });
  }
};

// Simple color utilities (replacing npm:chalk)
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

// Console utilities with color support
export const createConsole = () => {
  let chalk: any;
  
  const initChalk = async () => {
    if (!chalk) {
      // Use built-in colors utility instead of npm:chalk
      chalk = colors;
    }
    return chalk;
  };
  
  return {
    log: console.log,
    error: console.error,
    warn: console.warn,
    
    // Colored output methods
    success: async (message: string) => {
      const c = await initChalk();
      console.log(c.green(message));
    },
    
    warning: async (message: string) => {
      const c = await initChalk();
      console.log(c.yellow(message));
    },
    
    danger: async (message: string) => {
      const c = await initChalk();
      console.log(c.red(message));
    },
    
    info: async (message: string) => {
      const c = await initChalk();
      console.log(c.blue(message));
    },
    
    bold: async (message: string) => {
      const c = await initChalk();
      console.log(c.bold(message));
    },
  };
};

// Export runtime info
export const getRuntimeInfo = () => ({
  runtime: isDeno() ? 'deno' : 'node',
  version: isDeno() ? globalThis.Deno.version.deno : process.version,
  platform: isDeno() ? globalThis.Deno.build.os : process.platform,
  arch: isDeno() ? globalThis.Deno.build.arch : process.arch,
}); 