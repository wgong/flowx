/**
 * Error handling utilities for the benchmark system
 */

/**
 * Base benchmark error class
 */
export class BenchmarkError extends Error {
  public context?: string;
  public details?: Record<string, any>;
  
  constructor(message: string, context?: string, details?: Record<string, any>) {
    super(message);
    this.name = 'BenchmarkError';
    this.context = context;
    this.details = details;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BenchmarkError.prototype);
  }
  
  toString(): string {
    let result = `${this.name}: ${this.message}`;
    if (this.context) {
      result += ` [context: ${this.context}]`;
    }
    return result;
  }
}

/**
 * Error for task execution failures
 */
export class TaskExecutionError extends BenchmarkError {
  public taskId: string;
  
  constructor(message: string, taskId: string, context?: string, details?: Record<string, any>) {
    super(message, context, details);
    this.name = 'TaskExecutionError';
    this.taskId = taskId;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, TaskExecutionError.prototype);
  }
}

/**
 * Error for plugin failures
 */
export class PluginError extends BenchmarkError {
  public pluginName: string;
  
  constructor(message: string, pluginName: string, context?: string, details?: Record<string, any>) {
    super(message, context, details);
    this.name = 'PluginError';
    this.pluginName = pluginName;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, PluginError.prototype);
  }
}

/**
 * Error for configuration issues
 */
export class ConfigurationError extends BenchmarkError {
  constructor(message: string, context?: string, details?: Record<string, any>) {
    super(message, context, details);
    this.name = 'ConfigurationError';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error for timeout issues
 */
export class TimeoutError extends BenchmarkError {
  public timeoutMs: number;
  
  constructor(message: string, timeoutMs: number, context?: string, details?: Record<string, any>) {
    super(message, context, details);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Context manager for error handling
 */
export class ErrorContext {
  private contextName: string;
  private errorClass: typeof BenchmarkError;
  
  constructor(contextName: string, errorClass: typeof BenchmarkError = BenchmarkError) {
    this.contextName = contextName;
    this.errorClass = errorClass;
  }
  
  /**
   * Run a function with error context
   */
  async run<T>(fn: () => Promise<T> | T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof BenchmarkError) {
        // Add context to existing benchmark error if not already set
        if (!error.context) {
          error.context = this.contextName;
        }
        throw error;
      } else {
        // Wrap non-benchmark errors
        const message = error instanceof Error ? error.message : String(error);
        throw new this.errorClass(message, this.contextName, {
          originalError: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
  }
}

/**
 * Error reporter for collecting and handling errors
 */
export class ErrorReporter {
  private errors: Array<{
    timestamp: Date;
    error: Error;
    context?: string;
    handled: boolean;
  }> = [];
  
  /**
   * Report an error
   */
  report_error(message: string, error: Error, context?: string): void {
    this.errors.push({
      timestamp: new Date(),
      error,
      context,
      handled: false
    });
    
    // Log the error
    console.error(`[${context || 'general'}] ${message}: ${error.message}`);
  }
  
  /**
   * Get all reported errors
   */
  get_errors(): Array<{
    timestamp: Date;
    error: Error;
    context?: string;
    handled: boolean;
  }> {
    return this.errors;
  }
  
  /**
   * Clear all errors
   */
  clear_errors(): void {
    this.errors = [];
  }
}

/**
 * Utility to create a timeout promise
 */
export function createTimeout(ms: number, message = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(message, ms));
    }, ms);
  });
}

/**
 * Run a function with a timeout
 */
export async function withTimeout<T>(fn: () => Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    fn(),
    createTimeout(ms, message)
  ]);
}

/**
 * Safe function execution with error handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T> | T,
  onError: (error: Error) => T | Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    return onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Configure logging for the benchmark system
 * This is a placeholder function that will be implemented later
 */
export function configure_logging(logLevel: number, logFilePath?: string): void {
  // This is a placeholder - will be implemented later
  console.log(`Configured logging: level=${logLevel}, file=${logFilePath || 'none'}`);
}