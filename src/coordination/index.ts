/**
 * Coordination System Exports
 */

// Core coordination components
export { CoordinationManager } from './manager.ts';
export { TaskCoordinator } from './task-coordinator.ts';
export { WorkStealingCoordinator } from './work-stealing.ts';
export { CircuitBreakerManager } from './circuit-breaker.ts';
export { TaskExecutionEngine } from './task-execution-engine.ts';

// Advanced coordination components
export { BackgroundExecutor } from './background-executor.ts';
export { HiveOrchestrator } from './hive-orchestrator.ts';
export { LoadBalancer } from './load-balancer.ts';
export { TaskOrchestrator } from './task-orchestrator.ts';

// Types and interfaces
export type {
  BackgroundTaskConfig,
  BackgroundTaskDefinition,
  BackgroundExecutorMetrics
} from './background-executor.ts';

export type {
  HiveOrchestratorConfig,
  DecompositionStrategy,
  CoordinationStrategy,
  TaskDecomposition,
  SubTask,
  TaskRequirement,
  TaskDependency,
  AgentTopology,
  AgentNode,
  ConsensusVote,
  ConsensusResult,
  HiveOrchestratorMetrics
} from './hive-orchestrator.ts';

export type {
  LoadBalancerConfig,
  LoadBalancingStrategy,
  AgentLoad,
  LoadPrediction,
  LoadBalancingDecision,
  LoadBalancerMetrics
} from './load-balancer.ts';

export type {
  TaskOrchestratorConfig,
  WorkflowStrategy,
  WorkflowDefinition,
  WorkflowTask,
  WorkflowExecution,
  WorkflowState,
  WorkflowProgress,
  TaskOrchestratorMetrics
} from './task-orchestrator.ts';

// Core coordination types
export type {
  EnhancedCoordinationConfig,
  ICoordinationManager
} from './manager.ts';

export type {
  CoordinationConfig,
  SchedulingStrategy
} from './task-coordinator.ts';

export type {
  WorkStealingConfig
} from './work-stealing.ts';

export type {
  CircuitBreakerConfig
} from './circuit-breaker.ts';

export type {
  TaskExecutorConfig
} from './task-execution-engine.ts';