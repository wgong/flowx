/**
 * Runtime Environment Detection and Compatibility Layer
 * Provides unified APIs that work in both Deno and Node.js
 */

// Detect runtime environment
export const isDeno = () => typeof Deno !== 'undefined';
export const isNode = () => typeof process !== 'undefined' && process.versions?.node;

// Environment variables access
export const getEnv = (key: string): string | undefined => {
  if (isDeno()) {
    return Deno.env.get(key);
  } else {
    return process.env[key];
  }
};

export const setEnv = (key: string, value: string): void => {
  if (isDeno()) {
    Deno.env.set(key, value);
  } else {
    process.env[key] = value;
  }
};

// File system operations
export const readTextFile = async (path: string): Promise<string> => {
  if (isDeno()) {
    return await Deno.readTextFile(path);
  } else {
    const { readFile } = await import('node:fs/promises');
    return await readFile(path, 'utf-8');
  }
};

export const writeTextFile = async (path: string, content: string): Promise<void> => {
  if (isDeno()) {
    await Deno.writeTextFile(path, content);
  } else {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path, content, 'utf-8');
  }
};

export const exists = async (path: string): Promise<boolean> => {
  try {
    if (isDeno()) {
      await Deno.stat(path);
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
    await Deno.mkdir(path, options);
  } else {
    const { mkdir: nodeMkdir } = await import('node:fs/promises');
    await nodeMkdir(path, options);
  }
};

// Process operations
export const exit = (code?: number): never => {
  if (isDeno()) {
    Deno.exit(code);
  } else {
    process.exit(code);
  }
};

export const cwd = (): string => {
  if (isDeno()) {
    return Deno.cwd();
  } else {
    return process.cwd();
  }
};

export const chdir = (path: string): void => {
  if (isDeno()) {
    Deno.chdir(path);
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
    
    const command = new Deno.Command(cmd, commandOptions);
    
    const { code, stdout, stderr } = await command.output();
    
    return {
      success: code === 0,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    };
  } else {
    const { spawn } = await import('node:child_process');
    const { promisify } = await import('node:util');
    
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

// Console utilities with color support
export const createConsole = () => {
  let chalk: any;
  
  const initChalk = async () => {
    if (!chalk) {
      if (isDeno()) {
        chalk = await import('npm:chalk');
      } else {
        chalk = await import('npm:chalk');
      }
    }
    return chalk.default || chalk;
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
  version: isDeno() ? Deno.version.deno : process.version,
  platform: isDeno() ? Deno.build.os : process.platform,
  arch: isDeno() ? Deno.build.arch : process.arch,
}); 