/**
 * Claude CLI Client
 * Integration with the installed Claude CLI for powerful agent communication
 * Leverages the full power of Claude CLI including file operations, tools, and advanced features
 */

import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ILogger } from '../core/logger.ts';

export interface ClaudeCliConfig {
  claudePath?: string; // Path to claude executable
  workingDirectory?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retryAttempts?: number;
  verbose?: boolean;
  allowedTools?: string[];
  dangerouslySkipPermissions?: boolean;
}

export interface ClaudeRequest {
  prompt: string;
  files?: Array<{
    path: string;
    content?: string;
    operation: 'read' | 'write' | 'create' | 'edit';
  }>;
  tools?: string[];
  systemPrompt?: string;
  context?: Record<string, unknown>;
  outputFormat?: 'text' | 'json' | 'markdown';
}

export interface ClaudeResponse {
  success: boolean;
  output: string;
  files?: Array<{
    path: string;
    content: string;
    operation: string;
  }>;
  tokensUsed?: number;
  duration: number;
  error?: string;
  exitCode?: number;
}

export interface TaskExecutionOptions {
  workingDirectory?: string;
  timeout?: number;
  allowFileOperations?: boolean;
  allowNetworkAccess?: boolean;
  allowCodeExecution?: boolean;
  maxFileSize?: number;
}

/**
 * Claude CLI Client for powerful agent operations
 */
export class ClaudeApiClient extends EventEmitter {
  private config: Required<ClaudeCliConfig>;
  private logger: ILogger;
  private activeProcesses = new Map<string, ChildProcess>();
  private requestQueue: Array<{
    id: string;
    request: ClaudeRequest;
    options: TaskExecutionOptions;
    resolve: (value: ClaudeResponse | PromiseLike<ClaudeResponse>) => void;
    reject: (reason?: Error) => void;
  }> = [];
  private isProcessing = false;

  constructor(config: ClaudeCliConfig, logger: ILogger) {
    super();
    
    this.config = {
      claudePath: config.claudePath || 'claude',
      workingDirectory: config.workingDirectory || process.cwd(),
      model: config.model || 'claude-3-5-sonnet-20241022',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 8192,
      timeout: config.timeout || 300000, // 5 minutes
      retryAttempts: config.retryAttempts || 2,
      verbose: config.verbose || false,
      allowedTools: config.allowedTools || ['file_editor', 'bash', 'computer'],
      dangerouslySkipPermissions: config.dangerouslySkipPermissions || true // Default to true for automation
    };

    this.logger = logger;
    this.startRequestProcessor();
  }

  /**
   * Execute a task using Claude CLI
   */
  async sendMessage(request: ClaudeRequest, options: TaskExecutionOptions = {}): Promise<ClaudeResponse> {
    const requestId = this.generateRequestId();
    
    this.logger.debug('Queuing Claude CLI task', { 
      requestId, 
      promptLength: request.prompt.length,
      filesCount: request.files?.length || 0
    });

    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id: requestId,
        request,
        options,
        resolve,
        reject
      });

      this.processRequestQueue();
    });
  }

  /**
   * Execute a simple prompt with Claude CLI
   */
  async chat(prompt: string, options: TaskExecutionOptions = {}): Promise<ClaudeResponse> {
    return this.sendMessage({ prompt }, options);
  }

  /**
   * Execute a file operation task
   */
  async executeFileTask(
    prompt: string, 
    files: Array<{ path: string; content?: string; operation: 'read' | 'write' | 'create' | 'edit' }>,
    options: TaskExecutionOptions = {}
  ): Promise<ClaudeResponse> {
    return this.sendMessage({ prompt, files }, options);
  }

  /**
   * Execute a coding task with full file access
   */
  async executeCodingTask(
    description: string,
    targetDirectory: string,
    options: TaskExecutionOptions = {}
  ): Promise<ClaudeResponse> {
    const prompt = `
# Coding Task

${description}

## Instructions
- Work in the directory: ${targetDirectory}
- Create all necessary files and directories
- Follow best practices for the technology being used
- Ensure the implementation is complete and functional
- Test your implementation if possible

## Working Directory
All files should be created in: ${targetDirectory}

Please implement this requirement completely.
`;

    return this.sendMessage({ prompt }, {
      ...options,
      workingDirectory: targetDirectory,
      allowFileOperations: true,
      allowCodeExecution: true
    });
  }

  /**
   * Check if Claude CLI is available
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    try {
      const result = await this.runClaudeCommand(['--version'], { timeout: 5000 });
      return {
        healthy: result.exitCode === 0,
        details: {
          version: result.output.trim(),
          claudePath: this.config.claudePath,
          workingDirectory: this.config.workingDirectory
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          claudePath: this.config.claudePath
        }
      };
    }
  }

  /**
   * Get Claude CLI version and capabilities
   */
  async getInfo(): Promise<{ version: string; features: string[] }> {
    try {
      const versionResult = await this.runClaudeCommand(['--version'], { timeout: 5000 });
      const helpResult = await this.runClaudeCommand(['--help'], { timeout: 5000 });
      
      return {
        version: versionResult.output.trim(),
        features: this.parseFeatures(helpResult.output)
      };
    } catch (error) {
      throw new Error(`Failed to get Claude CLI info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel all running processes
   */
  cancelAllRequests(): void {
    for (const [requestId, process] of this.activeProcesses) {
      this.logger.info('Cancelling Claude CLI process', { requestId });
      process.kill('SIGTERM');
    }
    
    // Reject queued requests
    for (const queued of this.requestQueue) {
      queued.reject(new Error('Task cancelled'));
    }
    this.requestQueue = [];
  }

  /**
   * Shutdown the client gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Claude CLI client');
    
    this.cancelAllRequests();
    
    // Wait for active processes to complete
    const timeout = 30000;
    const startTime = Date.now();
    
    while (this.activeProcesses.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('shutdown');
  }

  // === PRIVATE METHODS ===

  private startRequestProcessor(): void {
    // Process requests every 100ms
    setInterval(() => {
      if (!this.isProcessing && this.requestQueue.length > 0) {
        this.processRequestQueue();
      }
    }, 100);
  }

  private async processRequestQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const queued = this.requestQueue.shift()!;

    try {
      const result = await this.executeClaudeTask(queued.request, queued.options, queued.id);
      queued.resolve(result);
    } catch (error) {
      // Fix: Ensure error is typed as Error
      const errorToReject = error instanceof Error ? error : new Error(String(error));
      queued.reject(errorToReject);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeClaudeTask(
    request: ClaudeRequest,
    options: TaskExecutionOptions,
    requestId: string
  ): Promise<ClaudeResponse> {
    const startTime = Date.now();
    
    try {
      // Prepare working directory
      const workDir = options.workingDirectory || this.config.workingDirectory;
      await mkdir(workDir, { recursive: true });

      // Prepare files if needed
      if (request.files) {
        await this.prepareFiles(request.files, workDir);
      }

      // Build Claude CLI command
      const args = this.buildClaudeArgs(request, options, workDir);
      
      this.logger.debug('Executing Claude CLI command', { requestId, args: args.slice(0, 3) });

      // Execute Claude CLI
      const result = await this.runClaudeCommand(args, {
        cwd: workDir,
        timeout: options.timeout || this.config.timeout
      });

      // Parse response
      const response: ClaudeResponse = {
        success: result.exitCode === 0,
        output: result.output,
        duration: Date.now() - startTime,
        exitCode: result.exitCode
      };

      if (!response.success) {
        response.error = result.error || 'Claude CLI execution failed';
      }

      // Check for created/modified files
      if (options.allowFileOperations !== false) {
        // Fix: Remove workDir parameter from detectFileChanges call
        response.files = await this.detectFileChanges();
      }

      this.logger.info('Claude CLI task completed', {
        requestId,
        success: response.success,
        duration: response.duration,
        filesChanged: response.files?.length || 0
      });

      this.emit('request:success', { requestId, response });
      return response;

    } catch (error) {
      const response: ClaudeResponse = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };

      this.logger.error('Claude CLI task failed', { requestId, error });
      this.emit('request:error', { requestId, error });
      return response;
    }
  }

  private buildClaudeArgs(request: ClaudeRequest, options: TaskExecutionOptions, workDir: string): string[] {
    const args: string[] = [];

    // Always use non-interactive mode for automation
    args.push('--print');
    
    // Output format
    if (request.outputFormat) {
      args.push('--output-format', request.outputFormat);
    } else {
      args.push('--output-format', 'text');
    }

    // Skip permissions for automation (repository pattern)
    if (this.config.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    // Add working directory context (repository pattern)
    if (workDir && workDir !== process.cwd()) {
      args.push('--add-dir', workDir);
    }

    // Model selection
    if (this.config.model) {
      args.push('--model', this.config.model);
    }

    // Temperature
    if (this.config.temperature !== undefined) {
      args.push('--temperature', this.config.temperature.toString());
    }

    // Max tokens
    if (this.config.maxTokens) {
      args.push('--max-tokens', this.config.maxTokens.toString());
    }

    // Tools configuration (repository pattern)
    if (this.config.allowedTools && this.config.allowedTools.length > 0) {
      args.push('--allowed-tools', this.config.allowedTools.join(','));
    }

    // Add the prompt as the last argument
    args.push(request.prompt);

    return args;
  }

  private async runClaudeCommand(
    args: string[],
    options: { cwd?: string; timeout?: number; env?: Record<string, string> } = {}
  ): Promise<{ output: string; error: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      // Prepare environment variables (repository pattern)
      const processEnv: Record<string, string> = {
        ...process.env,
        CLAUDE_INSTANCE_ID: `claude-api-${Date.now()}`,
        CLAUDE_FLOW_MODE: 'api-client',
        CLAUDE_FLOW_MEMORY_ENABLED: 'true',
        CLAUDE_WORKING_DIRECTORY: options.cwd || this.config.workingDirectory,
        // Add any additional environment variables
        ...options.env
      };

      const claudeProcess = spawn(this.config.claudePath, args, {
        cwd: options.cwd || this.config.workingDirectory,
        env: processEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      claudeProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      claudeProcess.stderr?.on('data', (data: Buffer) => {
        error += data.toString();
      });

      claudeProcess.on('close', (code: number | null) => {
        clearTimeout(timeoutHandle);
        resolve({
          output: output.trim(),
          error: error.trim(),
          exitCode: code || 0
        });
      });

      claudeProcess.on('error', (err: Error) => {
        clearTimeout(timeoutHandle);
        reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
      });

      // Set timeout with proper cleanup (repository uses longer timeouts)
      const timeoutHandle = setTimeout(() => {
        claudeProcess.kill('SIGTERM');
        reject(new Error(`Claude CLI timeout after ${options.timeout || this.config.timeout}ms`));
      }, options.timeout || this.config.timeout);
    });
  }

  private async prepareFiles(
    files: Array<{ path: string; content?: string; operation: string }>,
    workDir: string
  ): Promise<void> {
    for (const file of files) {
      const fullPath = join(workDir, file.path);
      
      if (file.operation === 'write' || file.operation === 'create') {
        if (file.content !== undefined) {
          await mkdir(join(fullPath, '..'), { recursive: true });
          await writeFile(fullPath, file.content);
        }
      }
    }
  }

  private async detectFileChanges(): Promise<Array<{ path: string; content: string; operation: string }>> {
    // This is a simplified implementation
    // In a full implementation, we'd track file changes more comprehensively
    const files: Array<{ path: string; content: string; operation: string }> = [];
    
    try {
      // For now, just return empty array
      // Real implementation would use file watching or git diff
      return files;
    } catch (error) {
      this.logger.warn('Failed to detect file changes', { error });
      return files;
    }
  }

  private parseFeatures(helpOutput: string): string[] {
    const features: string[] = [];
    
    if (helpOutput.includes('--allowedTools')) features.push('tools');
    if (helpOutput.includes('--model')) features.push('model-selection');
    if (helpOutput.includes('--temperature')) features.push('temperature-control');
    if (helpOutput.includes('--output-format')) features.push('output-formatting');
    if (helpOutput.includes('--dangerously-skip-permissions')) features.push('permission-bypass');
    
    return features;
  }

  private generateRequestId(): string {
    return `claude-api-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Factory function to create Claude CLI client
 */
export function createClaudeClient(logger: ILogger, config?: ClaudeCliConfig): ClaudeApiClient {
  const defaultConfig: ClaudeCliConfig = {
    claudePath: process.env.CLAUDE_CLI_PATH || 'claude',
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
    temperature: process.env.CLAUDE_TEMPERATURE ? parseFloat(process.env.CLAUDE_TEMPERATURE) : 0.7,
    maxTokens: process.env.CLAUDE_MAX_TOKENS ? parseInt(process.env.CLAUDE_MAX_TOKENS) : 8192,
    verbose: process.env.CLAUDE_VERBOSE === 'true',
    dangerouslySkipPermissions: process.env.CLAUDE_SKIP_PERMISSIONS === 'true' || true, // Default to true for automation
    ...config
  };

  return new ClaudeApiClient(defaultConfig, logger);
}

export default ClaudeApiClient;