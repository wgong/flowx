/**
 * Integration tests for the benchmark API
 */

const { runBenchmark } = require('../../dist/swarm_benchmark/api');
const fs = require('fs');
const path = require('path');

// Create test output directory
const TEST_OUTPUT_DIR = path.join(__dirname, '../../test-output-api');
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

describe('Benchmark API Integration', () => {
  beforeEach(() => {
    // Clean test output directory before each test
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      const files = fs.readdirSync(TEST_OUTPUT_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
      }
    }
  });

  test('should run a benchmark with default options', async () => {
    const result = await runBenchmark({
      objective: 'API test benchmark',
      outputDirectory: TEST_OUTPUT_DIR
    });
    
    // Verify result structure
    expect(result).toBeDefined();
    expect(result.benchmarkId).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.metrics.tasksPerSecond).toBeGreaterThanOrEqual(0);
    expect(result.metrics.successRate).toBeGreaterThanOrEqual(0);
    expect(result.metrics.peakMemoryMb).toBeGreaterThanOrEqual(0);
    expect(result.metrics.avgCpuPercent).toBeGreaterThanOrEqual(0);
    expect(result.outputFiles).toBeDefined();
    expect(result.outputFiles.json).toBeDefined();
    
    // Verify output file exists
    expect(fs.existsSync(result.outputFiles.json)).toBe(true);
  });

  test('should run a benchmark with custom strategy', async () => {
    const result = await runBenchmark({
      objective: 'API custom strategy test',
      strategy: 'research',
      outputDirectory: TEST_OUTPUT_DIR
    });
    
    // Verify result
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
  });

  test('should run a benchmark with parallel execution', async () => {
    const result = await runBenchmark({
      objective: 'API parallel test',
      parallel: true,
      maxAgents: 3,
      outputDirectory: TEST_OUTPUT_DIR
    });
    
    // Verify result
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
  });

  test('should run a benchmark with multiple output formats', async () => {
    const result = await runBenchmark({
      objective: 'API multiple formats test',
      outputFormats: ['json', 'csv'],
      outputDirectory: TEST_OUTPUT_DIR
    });
    
    // Verify output files
    expect(result.outputFiles).toBeDefined();
    expect(result.outputFiles.json).toBeDefined();
    expect(result.outputFiles.csv).toBeDefined();
    
    // Verify files exist
    expect(fs.existsSync(result.outputFiles.json)).toBe(true);
    expect(fs.existsSync(result.outputFiles.csv)).toBe(true);
  });
});