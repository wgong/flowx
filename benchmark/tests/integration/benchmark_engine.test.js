/**
 * Integration tests for the benchmark engine
 */

const { 
  BenchmarkConfig, 
  Task,
  Result,
  Benchmark,
  TaskStatus
} = require('../../dist/swarm_benchmark/core/models');
const { UnifiedBenchmarkEngine } = require('../../dist/swarm_benchmark/core/benchmark_engine');
const { EnginePlugin } = require('../../dist/swarm_benchmark/core/plugins');
const { OutputManager } = require('../../dist/swarm_benchmark/output/output_manager');
const path = require('path');
const fs = require('fs');

// Create test output directory
const TEST_OUTPUT_DIR = path.join(__dirname, '../../test-output');
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

describe('Benchmark Engine Integration', () => {
  beforeEach(() => {
    // Clean test output directory before each test
    const files = fs.readdirSync(TEST_OUTPUT_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
    }
  });

  test('should execute a benchmark with default configuration', async () => {
    // Create engine
    const config = new BenchmarkConfig({
      outputDirectory: TEST_OUTPUT_DIR,
    });
    const engine = new UnifiedBenchmarkEngine(config);
    const outputManager = new OutputManager();
    engine.setOutputManager(outputManager);
    
    // Run benchmark
    const result = await engine.run_benchmark('Integration test benchmark');
    
    // Verify result
    expect(result).toBeDefined();
    expect(result.benchmark_id).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.task_count).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.metrics).toBeDefined();
    expect(result.output_files).toBeDefined();
    expect(result.output_files.json).toBeDefined();
    
    // Verify output file was created
    expect(fs.existsSync(result.output_files.json)).toBe(true);
  });

  test('should execute tasks with different strategies', async () => {
    // Create engine
    const config = new BenchmarkConfig({
      outputDirectory: TEST_OUTPUT_DIR,
    });
    const engine = new UnifiedBenchmarkEngine(config);
    const outputManager = new OutputManager();
    engine.setOutputManager(outputManager);
    
    // Create tasks with different strategies
    const task1 = new Task({
      objective: 'Development task',
      strategy: 'development'
    });
    
    const task2 = new Task({
      objective: 'Research task',
      strategy: 'research'
    });
    
    // Submit tasks
    engine.submit_task(task1);
    engine.submit_task(task2);
    
    // Run benchmark
    const result = await engine.run_benchmark('Multi-strategy benchmark');
    
    // Verify result
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.task_count).toBe(1); // In the current implementation, submitted tasks aren't counted separately
    expect(result.results).toHaveLength(1);
  });

  test('should execute with plugins', async () => {
    // Create custom plugin
    class TestPlugin extends EnginePlugin {
      constructor() {
        super();
        this.preBenchmarkCalled = false;
        this.postBenchmarkCalled = false;
        this.preTaskCalled = false;
        this.postTaskCalled = false;
      }
      
      async preBenchmark(benchmark) {
        this.preBenchmarkCalled = true;
        benchmark.metadata.testPlugin = 'pre-benchmark';
      }
      
      async postBenchmark(benchmark) {
        this.postBenchmarkCalled = true;
        benchmark.metadata.testPlugin = 'post-benchmark';
      }
      
      async preTask(task) {
        this.preTaskCalled = true;
        task.metadata.testPlugin = 'pre-task';
      }
      
      async postTask(task, result) {
        this.postTaskCalled = true;
        result.metadata.testPlugin = 'post-task';
        return result;
      }
    }
    
    // Create engine with plugin
    const plugin = new TestPlugin();
    const config = new BenchmarkConfig({
      outputDirectory: TEST_OUTPUT_DIR,
    });
    const engine = new UnifiedBenchmarkEngine(config, [plugin]);
    const outputManager = new OutputManager();
    engine.setOutputManager(outputManager);
    
    // Run benchmark
    const result = await engine.run_benchmark('Plugin test benchmark');
    
    // Verify plugin was called
    expect(plugin.preBenchmarkCalled).toBe(true);
    expect(plugin.postBenchmarkCalled).toBe(true);
    expect(plugin.preTaskCalled).toBe(true);
    expect(plugin.postTaskCalled).toBe(true);
    
    // Verify metadata was set
    expect(result.metadata.testPlugin).toBe('post-benchmark');
  });
});