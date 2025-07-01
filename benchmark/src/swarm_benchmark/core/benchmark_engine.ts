/**
 * Unified benchmark engine with pluggable architecture.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Benchmark, Task, Result, BenchmarkConfig, TaskStatus, 
  StrategyType, CoordinationMode, ResultStatus
} from './models';
import { EnginePlugin } from './plugins';
import { create_strategy } from '../strategies';
import { OutputManager } from '../output/output_manager';

/**
 * Unified benchmark engine with pluggable architecture.
 */
export class UnifiedBenchmarkEngine {
  private config: BenchmarkConfig;
  private plugins: EnginePlugin[];
  private status: string = 'READY';
  private taskQueue: Task[] = [];
  private currentBenchmark: Benchmark | null = null;
  private outputManager: OutputManager | null = null;
  
  /**
   * Initialize the unified benchmark engine.
   */
  constructor(config: BenchmarkConfig = new BenchmarkConfig(), plugins: EnginePlugin[] = []) {
    this.config = config;
    this.plugins = plugins;
  }
  
  /**
   * Add a plugin to the engine.
   */
  add_plugin(plugin: EnginePlugin): void {
    this.plugins.push(plugin);
  }
  
  /**
   * Set the output manager.
   */
  setOutputManager(manager: OutputManager): void {
    this.outputManager = manager;
  }
  
  /**
   * Submit a task to the benchmark queue.
   */
  submit_task(task: Task): void {
    this.taskQueue.push(task);
  }
  
  /**
   * Run a complete benchmark for the given objective.
   * 
   * @param objective - The main objective for the benchmark
   * @returns Benchmark results dictionary
   */
  async run_benchmark(objective: string): Promise<any> {
    // Create the main task
    const main_task = new Task({
      objective,
      description: `Benchmark task: ${objective}`,
      strategy: this.config.strategy,
      mode: this.config.mode,
      timeout: this.config.taskTimeout,
      maxRetries: this.config.maxRetries
    });
    
    // Create benchmark
    const benchmark = new Benchmark({
      name: this.config.name || `benchmark-${uuidv4().slice(0, 8)}`,
      description: this.config.description || `Benchmark for: ${objective}`,
      config: this.config
    });
    benchmark.addTask(main_task);
    benchmark.status = TaskStatus.RUNNING;
    benchmark.startedAt = new Date();
    
    this.currentBenchmark = benchmark;
    
    try {
      // Run pre-benchmark hooks for all plugins
      for (const plugin of this.plugins) {
        await plugin.preBenchmark(benchmark);
      }
      
      // Execute the task
      if (this.config.parallel && benchmark.tasks.length > 1) {
        // Execute tasks in parallel
        const results = await this._execute_parallel_tasks(benchmark.tasks);
        for (const result of results) {
          benchmark.addResult(result);
        }
      } else {
        // Execute main task
        const result = await this._execute_task(main_task);
        benchmark.addResult(result);
      }
      
      // Update benchmark status
      benchmark.status = TaskStatus.COMPLETED;
      benchmark.completedAt = new Date();
      
      // Run post-benchmark hooks for all plugins
      for (const plugin of this.plugins) {
        await plugin.postBenchmark(benchmark);
      }
      
      // Save results
      const outputResult = await this._save_benchmark_results(benchmark);
      
      return this._create_benchmark_response(benchmark, outputResult);
      
    } catch (e) {
      benchmark.status = TaskStatus.FAILED;
      benchmark.completedAt = new Date();
      benchmark.errorLog.push(String(e));
      
      // Run post-benchmark hooks even on failure
      for (const plugin of this.plugins) {
        try {
          await plugin.postBenchmark(benchmark);
        } catch (plugin_error) {
          benchmark.errorLog.push(`Plugin error during cleanup: ${String(plugin_error)}`);
        }
      }
      
      return {
        benchmark_id: benchmark.id,
        status: 'failed',
        error: String(e),
        duration: benchmark.duration()
      };
    }
  }
  
  /**
   * Execute a single task with all plugins.
   */
  async _execute_task(task: Task): Promise<Result> {
    // Run pre-task hooks for all plugins
    for (const plugin of this.plugins) {
      await plugin.preTask(task);
    }
    
    // Update task status
    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    
    try {
      // Execute the task using the specified strategy
      const strategy = create_strategy(
        typeof task.strategy === 'string' ? task.strategy : String(task.strategy)
      );
      const result = await strategy.execute(task);
      
      // Update task status
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      
      // Run post-task hooks for all plugins
      let processedResult = result;
      for (const plugin of this.plugins) {
        try {
          processedResult = await plugin.postTask(task, processedResult);
        } catch (e) {
          // Log plugin errors but don't fail the entire process
          if (!processedResult.errors) {
            processedResult.errors = [];
          }
          processedResult.errors.push(`Plugin error: ${String(e)}`);
        }
      }
      
      return processedResult;
      
    } catch (e) {
      // Handle task execution error
      task.status = TaskStatus.FAILED;
      task.completedAt = new Date();
      
      // Create error result
      const result = new Result({
        taskId: task.id,
        agentId: 'error-agent',
        status: ResultStatus.ERROR,
        output: {},
        errors: [String(e)]
      });
      
      // Run post-task hooks for all plugins
      let processedResult = result;
      for (const plugin of this.plugins) {
        try {
          processedResult = await plugin.postTask(task, processedResult);
        } catch (hook_error) {
          // Log plugin errors but don't fail the entire process
          if (!processedResult.errors) {
            processedResult.errors = [];
          }
          processedResult.errors.push(`Plugin error: ${String(hook_error)}`);
        }
      }
      
      return processedResult;
    }
  }
  
  /**
   * Execute multiple tasks in parallel.
   */
  async _execute_parallel_tasks(tasks: Task[]): Promise<Result[]> {
    // Create promises for all tasks
    const promises = tasks.map(task => this._execute_task(task));
    
    // Execute all tasks concurrently with the semaphore
    return Promise.all(promises);
  }
  
  /**
   * Save benchmark results to configured output formats.
   */
  async _save_benchmark_results(benchmark: Benchmark): Promise<any> {
    if (!this.outputManager) {
      // Create default output manager if none is set
      this.outputManager = new OutputManager();
    }
    
    const outputDir = this.config.outputDirectory;
    
    // Use output manager to save in all configured formats
    return this.outputManager.save_benchmark(
      benchmark, 
      outputDir, 
      this.config.outputFormats
    );
  }
  
  /**
   * Create a standardized benchmark response dictionary.
   */
  _create_benchmark_response(benchmark: Benchmark, outputResult: any = {}): any {
    // Set default metrics if they don't exist
    if (!benchmark.metrics.successRate) {
      benchmark.metrics.successRate = benchmark.results.filter(r => 
        r.status === ResultStatus.SUCCESS).length / benchmark.results.length || 0;
    }
    
    if (!benchmark.metrics.throughput) {
      benchmark.metrics.throughput = benchmark.tasks.length / Math.max(benchmark.duration(), 0.001);
    }
    
    // Set peak memory if not set
    if (!benchmark.metrics.peakMemoryUsage) {
      const memValues = benchmark.results
        .filter(r => r.resourceUsage && r.resourceUsage.peakMemoryMb)
        .map(r => r.resourceUsage.peakMemoryMb);
      benchmark.metrics.peakMemoryUsage = memValues.length ? Math.max(...memValues) : 0;
    }
    
    // Set CPU time if not set
    if (!benchmark.metrics.totalCpuTime) {
      const cpuValues = benchmark.results
        .filter(r => r.resourceUsage && r.resourceUsage.averageCpuPercent)
        .map(r => r.resourceUsage.averageCpuPercent);
      benchmark.metrics.totalCpuTime = cpuValues.length ? 
        cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0;
    }
    
    return {
      benchmark_id: benchmark.id,
      name: benchmark.name,
      status: 'success',
      summary: `Completed ${benchmark.results.length} tasks`,
      duration: benchmark.duration(),
      task_count: benchmark.tasks.length,
      success_rate: benchmark.metrics.successRate,
      metrics: {
        execution_time: benchmark.duration(),
        tasks_per_second: benchmark.metrics.throughput,
        success_rate: benchmark.metrics.successRate,
        peak_memory_mb: benchmark.metrics.peakMemoryUsage,
        average_cpu_percent: benchmark.metrics.totalCpuTime
      },
      results: benchmark.results.map(r => this._result_to_dict(r)),
      metadata: benchmark.metadata,
      output_files: outputResult.outputFiles || {}
    };
  }
  
  /**
   * Convert result to dictionary for JSON serialization.
   */
  _result_to_dict(result: Result): any {
    return {
      id: result.id,
      task_id: result.taskId,
      agent_id: result.agentId,
      status: typeof result.status === 'string' ? result.status : String(result.status),
      output_summary: this._summarize_output(result.output),
      errors: result.errors,
      warnings: result.warnings,
      performance: {
        execution_time: result.performanceMetrics.executionTime,
        success_rate: result.performanceMetrics.successRate,
        throughput: result.performanceMetrics.throughput
      },
      resources: {
        cpu_percent: result.resourceUsage.cpuPercent,
        memory_mb: result.resourceUsage.memoryMb,
        peak_memory_mb: result.resourceUsage.peakMemoryMb
      },
      created_at: result.createdAt.toISOString(),
      completed_at: result.completedAt ? result.completedAt.toISOString() : null
    };
  }
  
  /**
   * Create a summary version of the output for the response.
   */
  _summarize_output(output: Record<string, any>): Record<string, any> {
    if (!output) {
      return {};
    }
      
    // If output has raw_output, provide a truncated version
    if ('raw_output' in output && typeof output.raw_output === 'string') {
      const raw = output.raw_output;
      return {
        truncated_output: raw.length > 200 ? `${raw.substring(0, 200)}...` : raw,
        output_length: raw.length,
        sections_count: output.sections ? Object.keys(output.sections).length : 0
      };
    }
      
    return output;
  }
}