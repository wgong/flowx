/**
 * API module for the refactored benchmark system.
 * Provides a clean interface for the main claude-flow system to use the benchmark features.
 */

import { UnifiedBenchmarkEngine } from './core/benchmark_engine';
import { BenchmarkConfig, StrategyType, CoordinationMode } from './core/models';
import { OptimizationPlugin, MetricsCollectionPlugin } from './plugins';
import { configure_logging } from './utils/error_handling';
import * as path from 'path';

/**
 * Configuration options for benchmark execution
 */
export interface BenchmarkOptions {
  /** Main objective of the benchmark */
  objective: string;
  
  /** Strategy to use (default: auto) */
  strategy?: 'auto' | 'research' | 'development' | 'analysis' | 'testing' | 'optimization' | 'maintenance';
  
  /** Coordination mode to use (default: centralized) */
  mode?: 'centralized' | 'distributed' | 'hierarchical' | 'mesh' | 'hybrid';
  
  /** Maximum number of agents to use (default: 3) */
  maxAgents?: number;
  
  /** Whether to use parallel execution (default: false) */
  parallel?: boolean;
  
  /** Whether to enable optimizations (default: true) */
  optimized?: boolean;
  
  /** Whether to collect detailed metrics (default: false) */
  metrics?: boolean;
  
  /** Output formats to use (default: ['json']) */
  outputFormats?: string[];
  
  /** Output directory (default: './reports') */
  outputDirectory?: string;
  
  /** Task timeout in seconds (default: 300) */
  timeout?: number;
  
  /** Log level (default: 'info') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  /** Whether to log to a file (default: false) */
  logToFile?: boolean;
}

/**
 * Result of benchmark execution
 */
export interface BenchmarkResult {
  /** Unique ID of the benchmark run */
  benchmarkId: string;
  
  /** Status of the benchmark run */
  status: 'success' | 'failed';
  
  /** Summary of the benchmark run */
  summary: string;
  
  /** Duration of the benchmark run in seconds */
  duration: number;
  
  /** Performance metrics */
  metrics: {
    /** Execution time in seconds */
    executionTime: number;
    
    /** Tasks completed per second */
    tasksPerSecond: number;
    
    /** Success rate (0-1) */
    successRate: number;
    
    /** Peak memory usage in MB */
    peakMemoryMb: number;
    
    /** Average CPU usage percentage */
    avgCpuPercent: number;
  };
  
  /** Detailed results (if available) */
  results?: any[];
  
  /** Error message (if status is 'failed') */
  error?: string;
  
  /** Output file paths */
  outputFiles?: {
    /** Path to JSON report */
    json?: string;
    
    /** Path to SQLite database */
    sqlite?: string;
    
    /** Path to CSV report */
    csv?: string;
  };
}

/**
 * Mapping from string strategy names to StrategyType enum
 */
const STRATEGY_MAP: Record<string, StrategyType> = {
  'auto': StrategyType.AUTO,
  'research': StrategyType.RESEARCH,
  'development': StrategyType.DEVELOPMENT,
  'analysis': StrategyType.ANALYSIS,
  'testing': StrategyType.TESTING,
  'optimization': StrategyType.OPTIMIZATION,
  'maintenance': StrategyType.MAINTENANCE
};

/**
 * Mapping from string mode names to CoordinationMode enum
 */
const MODE_MAP: Record<string, CoordinationMode> = {
  'centralized': CoordinationMode.CENTRALIZED,
  'distributed': CoordinationMode.DISTRIBUTED,
  'hierarchical': CoordinationMode.HIERARCHICAL,
  'mesh': CoordinationMode.MESH,
  'hybrid': CoordinationMode.HYBRID
};

/**
 * Run a benchmark with the given options
 * 
 * @param options Benchmark options
 * @returns Benchmark result
 */
export async function runBenchmark(options: BenchmarkOptions): Promise<BenchmarkResult> {
  // Configure logging
  configure_logging(
    options.logLevel === 'debug' ? 2 : 
    options.logLevel === 'info' ? 3 : 
    options.logLevel === 'warn' ? 4 : 5,
    options.logToFile ? path.join(options.outputDirectory || './reports', 'benchmark.log') : undefined
  );

  // Create benchmark config
  const config = new BenchmarkConfig();
  config.name = `benchmark-${options.strategy || 'auto'}-${options.mode || 'centralized'}`;
  config.strategy = STRATEGY_MAP[options.strategy || 'auto'];
  config.mode = MODE_MAP[options.mode || 'centralized'];
  config.maxAgents = options.maxAgents || 3;
  config.parallel = options.parallel || false;
  config.outputFormats = options.outputFormats || ['json'];
  config.outputDirectory = options.outputDirectory || './reports';
  config.taskTimeout = options.timeout || 300;
  
  // Create engine
  const engine = new UnifiedBenchmarkEngine(config);
  
  // Add plugins based on options
  if (options.optimized !== false) {
    engine.add_plugin(new OptimizationPlugin());
  }
  
  if (options.metrics) {
    engine.add_plugin(new MetricsCollectionPlugin());
  }
  
  try {
    // Run benchmark
    const result = await engine.run_benchmark(options.objective);
    
    // Map result to API format
    return {
      benchmarkId: result.benchmark_id,
      status: result.status,
      summary: result.summary,
      duration: result.duration,
      metrics: {
        executionTime: result.metrics.execution_time,
        tasksPerSecond: result.metrics.tasks_per_second || 0,
        successRate: result.metrics.success_rate || 0,
        peakMemoryMb: result.metrics.peak_memory_mb || 0,
        avgCpuPercent: result.metrics.average_cpu_percent || 0
      },
      results: result.results,
      outputFiles: result.output_files
    };
  } catch (error) {
    // Handle unexpected errors
    return {
      benchmarkId: `error-${Date.now()}`,
      status: 'failed',
      summary: 'Benchmark failed with an unexpected error',
      duration: 0,
      error: error instanceof Error ? error.message : String(error),
      metrics: {
        executionTime: 0,
        tasksPerSecond: 0,
        successRate: 0,
        peakMemoryMb: 0,
        avgCpuPercent: 0
      }
    };
  }
}

/**
 * Export all types and classes for advanced usage
 */
export {
  UnifiedBenchmarkEngine,
  BenchmarkConfig,
  StrategyType,
  CoordinationMode,
  OptimizationPlugin,
  MetricsCollectionPlugin
};