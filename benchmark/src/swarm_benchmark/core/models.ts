/**
 * Data models for the benchmark system
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Strategy types for benchmarks
 */
export enum StrategyType {
  AUTO = 'auto',
  DEVELOPMENT = 'development',
  RESEARCH = 'research',
  TESTING = 'testing',
  OPTIMIZATION = 'optimization',
  ANALYSIS = 'analysis',
  MAINTENANCE = 'maintenance'
}

/**
 * Coordination modes for benchmark execution
 */
export enum CoordinationMode {
  CENTRALIZED = 'centralized',
  DISTRIBUTED = 'distributed',
  HIERARCHICAL = 'hierarchical',
  MESH = 'mesh',
  HYBRID = 'hybrid'
}

/**
 * Task status values
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Result status values
 */
export enum ResultStatus {
  SUCCESS = 'success',
  PARTIAL = 'partial',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

/**
 * Configuration for a benchmark
 */
export class BenchmarkConfig {
  id: string = uuidv4();
  name: string = `benchmark-${this.id.split('-')[0]}`;
  description?: string;
  strategy: StrategyType = StrategyType.AUTO;
  mode: CoordinationMode = CoordinationMode.CENTRALIZED;
  maxAgents: number = 3;
  parallel: boolean = false;
  taskTimeout: number = 300; // seconds
  maxRetries: number = 3;
  outputFormats: string[] = ['json'];
  outputDirectory: string = './benchmark-reports';

  constructor(data: Partial<BenchmarkConfig> = {}) {
    Object.assign(this, data);
  }
}

/**
 * Performance metrics for a task or benchmark
 */
export class PerformanceMetrics {
  executionTime: number = 0;
  startTime?: Date;
  endTime?: Date;
  throughput: number = 0;
  successRate: number = 0;
  responseTime: number = 0;
  latency: number = 0;

  constructor(data: Partial<PerformanceMetrics> = {}) {
    Object.assign(this, data);
  }
}

/**
 * Resource usage information
 */
export class ResourceUsage {
  cpuPercent: number = 0;
  averageCpuPercent: number = 0;
  memoryMb: number = 0;
  peakMemoryMb: number = 0;
  diskIoBytes: number = 0;
  networkIoBytes: number = 0;

  constructor(data: Partial<ResourceUsage> = {}) {
    Object.assign(this, data);
  }
}

/**
 * Aggregate metrics for a benchmark
 */
export class BenchmarkMetrics {
  successRate: number = 0;
  errorRate: number = 0;
  throughput: number = 0; // tasks per second
  averageLatency: number = 0;
  peakMemoryUsage: number = 0;
  totalCpuTime: number = 0;

  constructor(data: Partial<BenchmarkMetrics> = {}) {
    Object.assign(this, data);
  }
}

/**
 * A task to be executed in a benchmark
 */
export class Task {
  id: string = uuidv4();
  objective: string;
  description?: string;
  strategy: StrategyType | string = StrategyType.AUTO;
  mode: CoordinationMode | string = CoordinationMode.CENTRALIZED;
  status: TaskStatus = TaskStatus.PENDING;
  timeout: number = 300; // seconds
  maxRetries: number = 3;
  retryCount: number = 0;
  parameters: Record<string, any> = {};
  metadata: Record<string, any> = {};
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date = new Date();

  constructor(data: Partial<Task> & { objective: string }) {
    this.objective = data.objective;
    Object.assign(this, data);
  }

  duration(): number {
    if (!this.startedAt || !this.completedAt) return 0;
    return (this.completedAt.getTime() - this.startedAt.getTime()) / 1000;
  }
}

/**
 * A result from executing a task
 */
export class Result {
  id: string = uuidv4();
  taskId: string;
  agentId: string;
  status: ResultStatus = ResultStatus.SUCCESS;
  output: Record<string, any> = {};
  errors: string[] = [];
  warnings: string[] = [];
  metadata: Record<string, any> = {};
  performanceMetrics: PerformanceMetrics = new PerformanceMetrics();
  resourceUsage: ResourceUsage = new ResourceUsage();
  createdAt: Date = new Date();
  completedAt?: Date;

  constructor(data: Partial<Result> & { taskId: string; agentId: string }) {
    this.taskId = data.taskId;
    this.agentId = data.agentId;
    Object.assign(this, data);
  }

  duration(): number {
    if (!this.completedAt) return 0;
    return (this.completedAt.getTime() - this.createdAt.getTime()) / 1000;
  }
}

/**
 * A benchmark containing tasks and results
 */
export class Benchmark {
  id: string = uuidv4();
  name: string;
  description?: string;
  config: BenchmarkConfig;
  tasks: Task[] = [];
  results: Result[] = [];
  status: TaskStatus = TaskStatus.PENDING;
  errorLog: string[] = [];
  metadata: Record<string, any> = {};
  metrics: BenchmarkMetrics = new BenchmarkMetrics();
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date = new Date();

  constructor(data: Partial<Benchmark> & { name: string; config: BenchmarkConfig }) {
    this.name = data.name;
    this.config = data.config;
    Object.assign(this, data);
  }

  addTask(task: Task): void {
    this.tasks.push(task);
  }

  addResult(result: Result): void {
    this.results.push(result);
  }

  duration(): number {
    if (!this.startedAt || !this.completedAt) return 0;
    return (this.completedAt.getTime() - this.startedAt.getTime()) / 1000;
  }
}