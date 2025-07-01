/**
 * Main entry point for the benchmark system.
 * Exports the unified benchmark API.
 */

export { runBenchmark } from './api';
export type { BenchmarkOptions, BenchmarkResult } from './api';
export {
  UnifiedBenchmarkEngine,
  EnginePlugin,
  OptimizationPlugin,
  MetricsCollectionPlugin,
  create_strategy,
  OutputManager
} from './api';
export type {
  BenchmarkConfig,
  StrategyType,
  CoordinationMode
} from './api';

// Export core models
export {
  Task,
  Result,
  Benchmark
} from './swarm_benchmark/core/models';
export type {
  TaskStatus,
  ResultStatus
} from './swarm_benchmark/core/models';