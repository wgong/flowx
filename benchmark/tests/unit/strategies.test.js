/**
 * Unit tests for benchmark strategies
 */

const { Task, ResultStatus } = require('../../dist/swarm_benchmark/core/models');
const { 
  create_strategy,
  AutoStrategy,
  DevelopmentStrategy,
  ResearchStrategy
} = require('../../dist/swarm_benchmark/strategies');

describe('Benchmark Strategies', () => {
  describe('create_strategy', () => {
    test('should create strategies based on type string', () => {
      expect(create_strategy('auto')).toBeInstanceOf(AutoStrategy);
      expect(create_strategy('development')).toBeInstanceOf(DevelopmentStrategy);
      expect(create_strategy('research')).toBeInstanceOf(ResearchStrategy);
    });

    test('should fallback to auto strategy for unknown types', () => {
      expect(create_strategy('unknown')).toBeInstanceOf(AutoStrategy);
      expect(create_strategy('')).toBeInstanceOf(AutoStrategy);
    });
  });

  describe('Strategy execution', () => {
    const testTask = new Task({ objective: 'Test objective' });

    test('AutoStrategy should execute successfully', async () => {
      const strategy = new AutoStrategy();
      const result = await strategy.execute(testTask);
      
      expect(result.taskId).toBe(testTask.id);
      expect(result.status).toBe(ResultStatus.SUCCESS);
      expect(result.performanceMetrics.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.memoryMb).toBeGreaterThanOrEqual(0);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    test('DevelopmentStrategy should execute successfully', async () => {
      const strategy = new DevelopmentStrategy();
      const result = await strategy.execute(testTask);
      
      expect(result.taskId).toBe(testTask.id);
      expect(result.status).toBe(ResultStatus.SUCCESS);
      expect(result.output).toBeDefined();
      expect(result.performanceMetrics.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.memoryMb).toBeGreaterThanOrEqual(0);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    test('ResearchStrategy should execute successfully', async () => {
      const strategy = new ResearchStrategy();
      const result = await strategy.execute(testTask);
      
      expect(result.taskId).toBe(testTask.id);
      expect(result.status).toBe(ResultStatus.SUCCESS);
      expect(result.output).toBeDefined();
      expect(result.performanceMetrics.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.cpuPercent).toBeGreaterThanOrEqual(0);
      expect(result.resourceUsage.memoryMb).toBeGreaterThanOrEqual(0);
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });
});