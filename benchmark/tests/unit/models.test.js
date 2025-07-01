/**
 * Unit tests for benchmark models
 */

const { 
  BenchmarkConfig, 
  StrategyType, 
  CoordinationMode, 
  TaskStatus, 
  ResultStatus,
  Task,
  Result,
  Benchmark,
  PerformanceMetrics,
  ResourceUsage,
  BenchmarkMetrics
} = require('../../dist/swarm_benchmark/core/models');

describe('Benchmark Models', () => {
  describe('BenchmarkConfig', () => {
    test('should create with default values', () => {
      const config = new BenchmarkConfig();
      expect(config.id).toBeDefined();
      expect(config.name).toContain('benchmark-');
      expect(config.strategy).toBe(StrategyType.AUTO);
      expect(config.mode).toBe(CoordinationMode.CENTRALIZED);
      expect(config.maxAgents).toBe(3);
      expect(config.parallel).toBe(false);
      expect(config.taskTimeout).toBe(300);
      expect(config.maxRetries).toBe(3);
      expect(config.outputFormats).toEqual(['json']);
      expect(config.outputDirectory).toBe('./benchmark-reports');
    });

    test('should override defaults with provided values', () => {
      const config = new BenchmarkConfig({
        name: 'test-benchmark',
        strategy: StrategyType.DEVELOPMENT,
        mode: CoordinationMode.DISTRIBUTED,
        maxAgents: 5,
        parallel: true,
        taskTimeout: 600,
        maxRetries: 2,
        outputFormats: ['json', 'sqlite'],
        outputDirectory: './custom-reports'
      });

      expect(config.name).toBe('test-benchmark');
      expect(config.strategy).toBe(StrategyType.DEVELOPMENT);
      expect(config.mode).toBe(CoordinationMode.DISTRIBUTED);
      expect(config.maxAgents).toBe(5);
      expect(config.parallel).toBe(true);
      expect(config.taskTimeout).toBe(600);
      expect(config.maxRetries).toBe(2);
      expect(config.outputFormats).toEqual(['json', 'sqlite']);
      expect(config.outputDirectory).toBe('./custom-reports');
    });
  });

  describe('Task', () => {
    test('should create task with required objective', () => {
      const task = new Task({ objective: 'Test objective' });
      expect(task.id).toBeDefined();
      expect(task.objective).toBe('Test objective');
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.strategy).toBe(StrategyType.AUTO);
      expect(task.mode).toBe(CoordinationMode.CENTRALIZED);
      expect(task.timeout).toBe(300);
      expect(task.maxRetries).toBe(3);
      expect(task.retryCount).toBe(0);
      expect(task.parameters).toEqual({});
      expect(task.metadata).toEqual({});
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    test('should calculate task duration', () => {
      const task = new Task({ objective: 'Test objective' });
      
      // No start/complete dates
      expect(task.duration()).toBe(0);

      // With start date but no complete date
      task.startedAt = new Date(Date.now() - 5000); // 5 seconds ago
      expect(task.duration()).toBe(0);

      // With both dates
      task.completedAt = new Date();
      expect(task.duration()).toBeCloseTo(5, 0); // Roughly 5 seconds
    });
  });

  describe('Result', () => {
    test('should create result with required task and agent IDs', () => {
      const result = new Result({ 
        taskId: 'task-123', 
        agentId: 'agent-456' 
      });
      
      expect(result.id).toBeDefined();
      expect(result.taskId).toBe('task-123');
      expect(result.agentId).toBe('agent-456');
      expect(result.status).toBe(ResultStatus.SUCCESS);
      expect(result.output).toEqual({});
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.metadata).toEqual({});
      expect(result.performanceMetrics).toBeInstanceOf(PerformanceMetrics);
      expect(result.resourceUsage).toBeInstanceOf(ResourceUsage);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeUndefined();
    });

    test('should calculate result duration', () => {
      const result = new Result({ 
        taskId: 'task-123', 
        agentId: 'agent-456' 
      });
      
      // No complete date
      expect(result.duration()).toBe(0);

      // With complete date
      result.createdAt = new Date(Date.now() - 3000); // 3 seconds ago
      result.completedAt = new Date();
      expect(result.duration()).toBeCloseTo(3, 0); // Roughly 3 seconds
    });
  });

  describe('Benchmark', () => {
    test('should create benchmark with required name and config', () => {
      const config = new BenchmarkConfig();
      const benchmark = new Benchmark({ 
        name: 'test-benchmark',
        config: config
      });
      
      expect(benchmark.id).toBeDefined();
      expect(benchmark.name).toBe('test-benchmark');
      expect(benchmark.config).toBe(config);
      expect(benchmark.tasks).toEqual([]);
      expect(benchmark.results).toEqual([]);
      expect(benchmark.status).toBe(TaskStatus.PENDING);
      expect(benchmark.errorLog).toEqual([]);
      expect(benchmark.metadata).toEqual({});
      expect(benchmark.metrics).toBeInstanceOf(BenchmarkMetrics);
      expect(benchmark.createdAt).toBeInstanceOf(Date);
      expect(benchmark.startedAt).toBeUndefined();
      expect(benchmark.completedAt).toBeUndefined();
    });

    test('should add tasks and results', () => {
      const benchmark = new Benchmark({ 
        name: 'test-benchmark',
        config: new BenchmarkConfig()
      });
      
      const task = new Task({ objective: 'Test task' });
      benchmark.addTask(task);
      expect(benchmark.tasks).toContain(task);
      
      const result = new Result({ taskId: task.id, agentId: 'agent-123' });
      benchmark.addResult(result);
      expect(benchmark.results).toContain(result);
    });

    test('should calculate benchmark duration', () => {
      const benchmark = new Benchmark({ 
        name: 'test-benchmark',
        config: new BenchmarkConfig()
      });
      
      // No start/complete dates
      expect(benchmark.duration()).toBe(0);

      // With start date but no complete date
      benchmark.startedAt = new Date(Date.now() - 10000); // 10 seconds ago
      expect(benchmark.duration()).toBe(0);

      // With both dates
      benchmark.completedAt = new Date();
      expect(benchmark.duration()).toBeCloseTo(10, 0); // Roughly 10 seconds
    });
  });
});