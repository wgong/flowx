/**
 * TypeScript API for the benchmark system.
 * This file exports the public API for the benchmark system.
 */

import { BenchmarkConfig, StrategyType, CoordinationMode } from './swarm_benchmark/core/models';
import { UnifiedBenchmarkEngine } from './swarm_benchmark/core/benchmark_engine';
import { EnginePlugin, OptimizationPlugin, MetricsCollectionPlugin } from './swarm_benchmark/core/plugins';
import { create_strategy } from './swarm_benchmark/strategies';
import { OutputManager } from './swarm_benchmark/output/output_manager';

/**
 * Options for running a benchmark
 */
export interface BenchmarkOptions {
  objective: string;
  strategy?: string;
  mode?: string;
  maxAgents?: number;
  parallel?: boolean;
  optimized?: boolean;
  metrics?: boolean;
  outputFormats?: string[];
  outputDirectory?: string;
  timeout?: number;
  logLevel?: string;
  logToFile?: boolean;
  plugins?: EnginePlugin[];
}

/**
 * Result of a benchmark run
 */
export interface BenchmarkResult {
  benchmarkId: string;
  name: string;
  status: string;
  summary: string;
  duration: number;
  taskCount: number;
  metrics: {
    executionTime: number;
    tasksPerSecond: number;
    successRate: number;
    peakMemoryMb: number;
    avgCpuPercent: number;
  };
  results: any[];
  outputFiles?: Record<string, string>;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Run a benchmark with the given options
 * 
 * @param options Benchmark options
 * @returns Benchmark result
 */
export async function runBenchmark(options: BenchmarkOptions): Promise<BenchmarkResult> {
  // Create benchmark config
  const config = new BenchmarkConfig();
  config.name = options.objective.substring(0, 20) + '...';
  config.description = options.objective;
  
  // Set strategy
  if (options.strategy) {
    switch (options.strategy.toLowerCase()) {
      case 'development':
        config.strategy = StrategyType.DEVELOPMENT;
        break;
      case 'research':
        config.strategy = StrategyType.RESEARCH;
        break;
      case 'testing':
        config.strategy = StrategyType.TESTING;
        break;
      case 'optimization':
        config.strategy = StrategyType.OPTIMIZATION;
        break;
      case 'analysis':
        config.strategy = StrategyType.ANALYSIS;
        break;
      case 'maintenance':
        config.strategy = StrategyType.MAINTENANCE;
        break;
      default:
        config.strategy = StrategyType.AUTO;
    }
  }
  
  // Set coordination mode
  if (options.mode) {
    switch (options.mode.toLowerCase()) {
      case 'centralized':
        config.mode = CoordinationMode.CENTRALIZED;
        break;
      case 'distributed':
        config.mode = CoordinationMode.DISTRIBUTED;
        break;
      case 'hierarchical':
        config.mode = CoordinationMode.HIERARCHICAL;
        break;
      case 'mesh':
        config.mode = CoordinationMode.MESH;
        break;
      case 'hybrid':
        config.mode = CoordinationMode.HYBRID;
        break;
      default:
        config.mode = CoordinationMode.CENTRALIZED;
    }
  }
  
  // Set other options
  config.maxAgents = options.maxAgents || 3;
  config.parallel = !!options.parallel;
  config.taskTimeout = options.timeout || 300;
  config.outputFormats = options.outputFormats || ['json'];
  config.outputDirectory = options.outputDirectory || './benchmark-reports';
  
  // Create plugins
  const plugins = [...(options.plugins || [])];
  
  // Add optimization plugin if requested
  if (options.optimized !== false) {
    plugins.push(new OptimizationPlugin());
  }
  
  // Add metrics plugin if requested
  if (options.metrics !== false) {
    plugins.push(new MetricsCollectionPlugin());
  }
  
  // Create and configure the engine
  const engine = new UnifiedBenchmarkEngine(config, plugins);

  // Set output manager
  engine.setOutputManager(new OutputManager());
  
  // Run the benchmark
  const rawResult = await engine.run_benchmark(options.objective);
  
  // Process and return the result
  return {
    benchmarkId: rawResult.benchmark_id,
    name: rawResult.name,
    status: rawResult.status,
    summary: rawResult.summary,
    duration: rawResult.duration,
    taskCount: rawResult.task_count,
    metrics: {
      executionTime: rawResult.metrics.execution_time,
      tasksPerSecond: rawResult.metrics.tasks_per_second,
      successRate: rawResult.metrics.success_rate,
      peakMemoryMb: rawResult.metrics.peak_memory_mb,
      avgCpuPercent: rawResult.metrics.average_cpu_percent
    },
    results: rawResult.results,
    outputFiles: rawResult.output_files,
    metadata: rawResult.metadata,
    error: rawResult.error
  };
}

// Export plugin classes and other utilities
export {
  UnifiedBenchmarkEngine,
  EnginePlugin,
  OptimizationPlugin,
  MetricsCollectionPlugin,
  BenchmarkConfig,
  StrategyType,
  CoordinationMode,
  create_strategy,
  OutputManager
};