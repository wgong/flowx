/**
 * Base test class for CLI command testing
 * Provides utilities for testing CLI commands in a standardized way
 */

import { jest } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Base class for CLI command tests
 */
export class CommandTestBase {
  constructor(config = {}) {
    this.cliPath = path.resolve(process.cwd(), config.cliPath || 'cli.js');
    this.tempDir = null;
    this.debug = config.debug || false;
    this.timeout = config.timeout || 30000; // Default 30 second timeout
    this.preserveTemp = config.preserveTemp || false;
  }

  /**
   * Set up test environment
   */
  async setup() {
    // Create temporary directory for test isolation
    this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-flow-test-'));
    
    // Initialize any test-specific state
    this.testState = {};
    
    if (this.debug) {
      console.log(`Test temp directory: ${this.tempDir}`);
    }
    
    return this.tempDir;
  }
  
  /**
   * Clean up test environment
   */
  async teardown() {
    // Clean up temp directory unless preserveTemp is true
    if (this.tempDir && !this.preserveTemp) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true });
      } catch (error) {
        if (this.debug) {
          console.error(`Error cleaning up temp directory: ${error.message}`);
        }
      }
    }
  }
  
  /**
   * Run a CLI command
   */
  async runCommand(args, options = {}) {
    const cmdOptions = {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      timeout: options.timeout || this.timeout,
    };
    
    // If command is an array, join with spaces
    const cmdArgs = Array.isArray(args) ? args.join(' ') : args;
    
    const command = `node ${this.cliPath} ${cmdArgs}`;
    
    if (this.debug) {
      console.log(`Running command: ${command}`);
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, cmdOptions);
      
      if (this.debug) {
        console.log(`Command output: ${stdout}`);
        if (stderr) console.error(`Command errors: ${stderr}`);
      }
      
      return { 
        code: 0, 
        stdout, 
        stderr,
        success: true 
      };
    } catch (error) {
      // Command failed with non-zero exit code
      if (this.debug) {
        console.error(`Command failed: ${error.message}`);
        if (error.stdout) console.log(`Command output: ${error.stdout}`);
        if (error.stderr) console.error(`Command errors: ${error.stderr}`);
      }
      
      return {
        code: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        success: false,
        error
      };
    }
  }
  
  /**
   * Create a file in the test directory
   */
  async createFile(relativePath, content) {
    const filePath = path.join(this.tempDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
  }
  
  /**
   * Read a file from the test directory
   */
  async readFile(relativePath) {
    const filePath = path.join(this.tempDir, relativePath);
    return await fs.readFile(filePath, 'utf8');
  }
  
  /**
   * Create a test configuration file
   */
  async createConfig(config) {
    const configPath = path.join(this.tempDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }
  
  /**
   * Wait for a condition to be true
   */
  async waitForCondition(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  }
  
  /**
   * Parse JSON from command output
   */
  parseJsonOutput(output) {
    try {
      // Find JSON in the output (may be surrounded by other text)
      const jsonMatch = output.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON object/array found, try parsing the entire output
      return JSON.parse(output);
    } catch (error) {
      if (this.debug) {
        console.error(`Failed to parse JSON from output: ${error.message}`);
        console.error(`Output: ${output}`);
      }
      return null;
    }
  }
  
  /**
   * Extract ID from command output
   */
  extractId(output) {
    const idMatch = output.match(/"id":\s*"([^"]+)"/);
    if (idMatch) {
      return idMatch[1];
    }
    
    // Try uuid pattern
    const uuidMatch = output.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (uuidMatch) {
      return uuidMatch[1];
    }
    
    return null;
  }
}

/**
 * Create a test command runner
 */
export function createCommandTestRunner(config = {}) {
  return new CommandTestBase(config);
}