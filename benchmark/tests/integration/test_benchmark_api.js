/**
 * Integration tests for the benchmark API
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { runBenchmark } = require('../../dist/api');

describe('Benchmark API Integration Tests', () => {
  const testOutputDir = path.join(__dirname, '../test-outputs');
  
  // Create test output directory if it doesn't exist
  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });
  
  // Clean up test output directory after tests
  afterAll(() => {
    if (fs.existsSync(testOutputDir)) {
      // Keep the directory but remove files
      const files = fs.readdirSync(testOutputDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testOutputDir, file));
      }
    }
  });

  test('should run a simple benchmark successfully', async () => {
    const options = {
      objective: 'Simple test benchmark',
      strategy: 'auto',
      mode: 'centralized',
      maxAgents: 1,
      parallel: false,
      optimized: false,
      metrics: true,
      outputFormats: ['json'],
      outputDirectory: testOutputDir,
      timeout: 10,
      logLevel: 'error',
      logToFile: false
    };
    
    const result = await runBenchmark(options);
    
    // Check basic result structure
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.benchmarkId).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.metrics).toBeDefined();
    
    // Check that output files were created
    expect(result.outputFiles).toBeDefined();
    expect(result.outputFiles.json).toBeDefined();
    expect(fs.existsSync(result.outputFiles.json)).toBe(true);
  });
  
  test('should run a benchmark with optimizations', async () => {
    const options = {
      objective: 'Optimized test benchmark',
      strategy: 'development',
      mode: 'centralized',
      maxAgents: 2,
      parallel: true,
      optimized: true,
      metrics: true,
      outputFormats: ['json'],
      outputDirectory: testOutputDir,
      timeout: 10,
      logLevel: 'error',
      logToFile: false
    };
    
    const result = await runBenchmark(options);
    
    // Check optimizations were applied
    expect(result).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.optimized).toBe(true);
  });
  
  test('should handle multiple output formats', async () => {
    const options = {
      objective: 'Multi-format test benchmark',
      strategy: 'auto',
      mode: 'centralized',
      maxAgents: 1,
      parallel: false,
      optimized: false,
      metrics: true,
      outputFormats: ['json', 'sqlite'],
      outputDirectory: testOutputDir,
      timeout: 10,
      logLevel: 'error',
      logToFile: false
    };
    
    const result = await runBenchmark(options);
    
    // Check that both output formats were created
    expect(result.outputFiles).toBeDefined();
    expect(result.outputFiles.json).toBeDefined();
    expect(result.outputFiles.sqlite).toBeDefined();
    expect(fs.existsSync(result.outputFiles.json)).toBe(true);
    expect(fs.existsSync(result.outputFiles.sqlite)).toBe(true);
  });
  
  test('should handle errors gracefully', async () => {
    const options = {
      objective: 'Error test benchmark',
      strategy: 'invalid_strategy', // Invalid strategy to trigger error
      mode: 'centralized',
      maxAgents: 1,
      parallel: false,
      optimized: false,
      metrics: true,
      outputFormats: ['json'],
      outputDirectory: testOutputDir,
      timeout: 10,
      logLevel: 'error',
      logToFile: false
    };
    
    try {
      const result = await runBenchmark(options);
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    } catch (error) {
      // If the API throws instead of returning error object, that's acceptable too
      expect(error).toBeDefined();
    }
  });
});