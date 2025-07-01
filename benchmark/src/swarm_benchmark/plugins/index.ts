/**
 * Exports all plugin implementations for the benchmark system.
 */

import { EnginePlugin } from '../core/plugins';
import { MetricsCollector, ProcessMonitor } from '../metrics/metrics_collector';
import { Benchmark, Task, Result, PerformanceMetrics } from '../core/models';
import { ErrorReporter } from '../utils/error_handling';

/**
 * Plugin for optimized benchmark execution.
 */
export class OptimizationPlugin extends EnginePlugin {
  private cache: Map<string, any>;
  private executionHistory: any[];
  private connectionPool: any;
  
  /**
   * Create a new optimization plugin.
   * 
   * @param config Optional configuration
   */
  constructor(config?: Record<string, any>) {
    super();
    this.cache = new Map();
    this.executionHistory = [];
    this.connectionPool = null;
  }
  
  /**
   * Initialize optimization for the benchmark.
   * 
   * @param benchmark Benchmark instance
   */
  async pre_benchmark(benchmark: Benchmark): Promise<void> {
    benchmark.metadata.optimized = true;
    benchmark.metadata.optimizationConfig = {
      cacheEnabled: true,
      poolSize: benchmark.config.maxAgents || 5,
      batchProcessing: true
    };
    
    // Initialize connection pool for optimized I/O
    this.connectionPool = {
      connections: Array(benchmark.config.maxAgents || 5).fill(null).map(() => ({
        inUse: false,
        lastUsed: Date.now()
      }))
    };
  }
  
  /**
   * Clean up optimization resources after benchmark completion.
   * 
   * @param benchmark Benchmark instance
   */
  async post_benchmark(benchmark: Benchmark): Promise<void> {
    benchmark.metadata.optimization_metrics = {
      cache_hits: this.cache.size,
      execution_history: this.executionHistory.length,
      pool_utilization: this.connectionPool ? 
        this.connectionPool.connections.filter((c: any) => c.inUse).length / this.connectionPool.connections.length : 0
    };
    
    // Clean up resources
    this.cache.clear();
  }
  
  /**
   * Apply task-level optimizations.
   * 
   * @param task Task instance
   */
  async pre_task(task: Task): Promise<void> {
    task.parameters.optimized = true;
    
    // Check cache for similar task
    const cacheKey = `${task.strategy}-${task.objective}`;
    if (this.cache.has(cacheKey)) {
      task.parameters.cachedResult = this.cache.get(cacheKey);
    }
  }
  
  /**
   * Process task result with optimizations.
   * 
   * @param task Task instance
   * @param result Task result
   * @returns Processed result
   */
  async post_task(task: Task, result: Result): Promise<Result> {
    // Cache result for reuse
    const cacheKey = `${task.strategy}-${task.objective}`;
    this.cache.set(cacheKey, {
      resultId: result.id,
      timestamp: Date.now()
    });
    
    // Record execution metrics
    this.executionHistory.push({
      taskId: task.id,
      executionTime: result.performanceMetrics.executionTime,
      timestamp: Date.now()
    });
    
    // Keep execution history at a reasonable size
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }
    
    return result;
  }
}

/**
 * Plugin for detailed metrics collection during benchmark execution.
 */
export class MetricsCollectionPlugin extends EnginePlugin {
  private metricsCollector: MetricsCollector;
  private processMonitor: ProcessMonitor;
  private taskCollectors: Map<string, MetricsCollector>;
  private errorReporter: ErrorReporter;
  
  /**
   * Create a new metrics collection plugin.
   * 
   * @param samplingInterval Metrics sampling interval in seconds (default: 0.1)
   */
  constructor(samplingInterval: number = 0.1) {
    super();
    this.metricsCollector = new MetricsCollector(samplingInterval);
    this.processMonitor = new ProcessMonitor(samplingInterval);
    this.taskCollectors = new Map();
    this.errorReporter = new ErrorReporter();
  }
  
  /**
   * Initialize metrics collection for the benchmark.
   * 
   * @param benchmark Benchmark instance
   */
  async pre_benchmark(benchmark: Benchmark): Promise<void> {
    // Start overall metrics collection
    this.metricsCollector.start_collection();
    
    // Initialize metrics in benchmark metadata
    benchmark.metadata.metrics_collection = {
      started_at: new Date().toISOString(),
      sampling_interval: this.metricsCollector.sampling_interval
    };
  }
  
  /**
   * Finalize metrics collection and aggregate results.
   * 
   * @param benchmark Benchmark instance
   */
  async post_benchmark(benchmark: Benchmark): Promise<void> {
    // Stop overall metrics collection
    const metrics = this.metricsCollector.stop_collection();
    
    // Update benchmark metadata
    benchmark.metadata.metrics_collection.completed_at = new Date().toISOString();
    
    // Calculate peak values across all tasks
    if (benchmark.results.length > 0) {
      const peak_memory = Math.max(...benchmark.results.map(r => r.resourceUsage.peakMemoryMb || 0));
      const avg_cpu = benchmark.results.reduce((sum, r) => sum + (r.resourceUsage.averageCpuPercent || 0), 0) / benchmark.results.length;
      
      benchmark.metadata.metrics_collection.peak_memory_mb = peak_memory;
      benchmark.metadata.metrics_collection.avg_cpu_percent = avg_cpu;
    }
    
    // Save detailed metrics report if output directory is specified
    if (benchmark.config.outputDirectory) {
      const outputPath = require('path').join(
        benchmark.config.outputDirectory,
        `metrics_${benchmark.id}.json`
      );
      
      try {
        this.metricsCollector.save_metrics_report(outputPath);
        benchmark.metadata.metrics_report_path = outputPath;
      } catch (error) {
        this.errorReporter.report_error(
          "Failed to save metrics report",
          error instanceof Error ? error : new Error(String(error)),
          "metrics_collection"
        );
      }
    }
  }
  
  /**
   * Initialize metrics collection for a task.
   * 
   * @param task Task instance
   */
  async pre_task(task: Task): Promise<void> {
    // Create task-specific collector
    const collector = new MetricsCollector(this.metricsCollector.sampling_interval);
    this.taskCollectors.set(task.id, collector);
    
    // Start collection
    collector.start_collection();
    
    // Initialize metrics in task parameters
    task.parameters.metrics_collection = {
      started_at: new Date().toISOString()
    };
  }
  
  /**
   * Process task metrics and enhance result.
   * 
   * @param task Task instance
   * @param result Task result
   * @returns Enhanced result
   */
  async post_task(task: Task, result: Result): Promise<Result> {
    // Get collector for this task
    const collector = this.taskCollectors.get(task.id);
    if (collector) {
      // Stop collection
      const metrics = collector.stop_collection();
      
      // Update task parameters
      task.parameters.metrics_collection.completed_at = new Date().toISOString();
      task.parameters.metrics_collection.execution_time = metrics.execution_time;
      
      // Update result metrics
      result.performanceMetrics = new PerformanceMetrics();
      result.performanceMetrics.executionTime = metrics.execution_time;
      result.performanceMetrics.throughput = metrics.throughput;
      
      // Clean up
      this.taskCollectors.delete(task.id);
    }
    
    return result;
  }
}

/**
 * Export all plugin types
 */
export { EnginePlugin };