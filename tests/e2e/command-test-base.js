/**
 * Base utilities for testing CLI commands
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

/**
 * Creates a test runner for CLI commands
 * @param {Object} options - Test runner options
 * @param {boolean} options.debug - Enable debug output
 * @param {number} options.timeout - Command timeout in ms
 * @returns {Object} Test runner instance
 */
export function createCommandTestRunner(options = {}) {
  const debug = options.debug || false;
  const timeout = options.timeout || 30000; // Default 30s timeout
  
  // Get CLI path
  const cliPath = path.resolve(process.cwd(), 'src/cli/main.ts');
  
  // Default environment variables
  const defaultEnv = {
    ...process.env,
    CLAUDE_FLOW_ENV: 'test',
    NODE_ENV: 'test',
    NO_COLOR: '1', // Disable colors for consistent output
    DEBUG: debug ? '*' : undefined,
  };
  
  let tempDir = null;
  
  /**
   * Sets up test environment
   */
  const setup = async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flowx-cli-test-'));
    
    if (debug) {
      console.log(`Test temp directory: ${tempDir}`);
    }
    
    return tempDir;
  };
  
  /**
   * Cleans up test environment
   */
  const cleanup = async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };
  
  /**
   * Runs a CLI command
   * @param {string[]} args - Command arguments
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Command result
   */
  const runCommand = (args, options = {}) => {
    return new Promise((resolve, reject) => {
      const env = {
        ...defaultEnv,
        ...options.env
      };
      
      // Add --test-mode flag if not in args
      if (!args.includes('--test-mode')) {
        args.push('--test-mode');
      }
      
      const command = 'tsx';
      const commandArgs = [cliPath, ...args];
      
      if (debug) {
        console.log(`Running: ${command} ${commandArgs.join(' ')}`);
      }
      
      const childProcess = spawn(command, commandArgs, {
        env,
        cwd: options.cwd || process.cwd(),
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (debug) {
          console.log(`[stdout] ${text}`);
        }
      });
      
      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        if (debug) {
          console.log(`[stderr] ${text}`);
        }
      });
      
      const timer = setTimeout(() => {
        childProcess.kill();
        reject(new Error(`Command timed out after ${timeout}ms: ${args.join(' ')}`));
      }, timeout);
      
      childProcess.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      });
      
      childProcess.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  };
  
  /**
   * Creates a temporary file for testing
   * @param {string} content - File content
   * @param {string} extension - File extension
   * @returns {Promise<string>} File path
   */
  const createTempFile = async (content, extension = '.txt') => {
    if (!tempDir) {
      await setup();
    }
    
    const filename = `test-${Date.now()}${extension}`;
    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, content);
    return filePath;
  };
  
  /**
   * Reads a file from the test directory
   * @param {string} filename - File name
   * @returns {Promise<string>} File content
   */
  const readTempFile = async (filename) => {
    if (!tempDir) {
      throw new Error('Test environment not set up');
    }
    
    const filePath = path.join(tempDir, filename);
    return fs.readFile(filePath, 'utf8');
  };
  
  return {
    setup,
    cleanup,
    runCommand,
    createTempFile,
    readTempFile,
    tempDir: () => tempDir
  };
}

export default createCommandTestRunner;