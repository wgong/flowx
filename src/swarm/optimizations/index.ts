/**
 * Swarm Optimizations
 * Export all optimization components
 */

export { ClaudeConnectionPool } from "./connection-pool.ts";
export type { PoolConfig, PooledConnection } from "./connection-pool.ts";

export { AsyncFileManager } from "./async-file-manager.ts";
export type { FileOperationResult } from "./async-file-manager.ts";

export { CircularBuffer } from "./circular-buffer.ts";

export { TTLMap } from "./ttl-map.ts";
export type { TTLMapOptions } from "./ttl-map.ts";

export { OptimizedExecutor } from "./optimized-executor.ts";
export type { ExecutorConfig, ExecutionMetrics } from "./optimized-executor.ts";

export { AgentCapabilityIndex } from "./agent-capability-index.ts";
export type { 
  AgentCapability, 
  AgentPerformanceMetrics, 
  CapabilityMatch, 
  IndexConfig 
} from "./agent-capability-index.ts";

