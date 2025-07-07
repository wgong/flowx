/**
 * Coordination System Exports
 */

export { TaskScheduler } from "./scheduler.ts";
export { CoordinationManager } from "./manager.ts";
export { MessageCoordinator } from "./message-coordinator.ts";
export { MessageRouter } from "./messaging.ts";
export { WorkStealingCoordinator } from "./work-stealing.ts";
export { SwarmCoordinator } from '../swarm/coordinator.ts';
export { SwarmMonitor } from "./swarm-monitor.ts";
export { DependencyGraph } from "./dependency-graph.ts";
export { TaskOrchestrator } from "./task-orchestrator.ts";
export { TaskExecutionEngine } from "./task-execution-engine.ts";
export { CircuitBreakerManager } from "./circuit-breaker.ts";
export { ConflictResolver } from "./conflict-resolution.ts";
export { ResourceManager } from "./resources.ts";
export { LoadBalancer } from "./load-balancer.ts";
export { CoordinationMetricsCollector } from "./metrics.ts";
export { BackgroundExecutor } from "./background-executor.ts";

// Backward compatibility aliases
export { TaskOrchestrator as IntelligentTaskScheduler } from "./task-orchestrator.ts";
export { TaskExecutionEngine as AdvancedTaskExecutor } from "./task-execution-engine.ts";

// Types
export type { CoordinationConfig, Task, Resource, AgentProfile } from "../utils/types.ts";