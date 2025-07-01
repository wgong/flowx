#!/usr/bin/env node
/**
 * Comprehensive benchmark test script that demonstrates the full
 * functionality of the refactored benchmark system.
 * 
 * This script runs a series of benchmarks with different configurations
 * and displays the results in a structured format.
 */

const { runBenchmark } = require('../dist/api');
const chalk = require('chalk'); // Assuming chalk is installed for colored output

// Header display
console.log(chalk.bold.blue('═══════════════════════════════════════════════════════'));
console.log(chalk.bold.blue('             CLAUDE-FLOW BENCHMARK TEST               '));
console.log(chalk.bold.blue('═══════════════════════════════════════════════════════'));
console.log();

// Benchmark configurations to test
const benchmarks = [
  {
    name: 'Research Task',
    options: {
      objective: 'Research best practices for microservices architecture',
      strategy: 'research',
      mode: 'distributed',
      maxAgents: 3,
      parallel: true,
      metrics: true,
      outputFormats: ['json'],
      outputDirectory: './benchmark-test-results',
      timeout: 60,
      logLevel: 'info'
    }
  },
  {
    name: 'Development Task',
    options: {
      objective: 'Build a REST API with Express and MongoDB',
      strategy: 'development',
      mode: 'centralized',
      maxAgents: 2,
      parallel: false,
      metrics: true,
      outputFormats: ['json', 'sqlite'],
      outputDirectory: './benchmark-test-results',
      timeout: 60,
      logLevel: 'info'
    }
  },
  {
    name: 'Analysis Task',
    options: {
      objective: 'Analyze code quality and performance issues',
      strategy: 'analysis',
      mode: 'hierarchical',
      maxAgents: 4,
      parallel: true,
      metrics: true,
      outputFormats: ['json'],
      outputDirectory: './benchmark-test-results',
      timeout: 60,
      logLevel: 'info'
    }
  },
  {
    name: 'Optimization Task',
    options: {
      objective: 'Optimize database queries for performance',
      strategy: 'optimization',
      mode: 'mesh',
      maxAgents: 3,
      parallel: true,
      metrics: true,
      outputFormats: ['json'],
      outputDirectory: './benchmark-test-results',
      timeout: 60,
      logLevel: 'info'
    }
  },
];

// Results storage
const results = [];

/**
 * Run a single benchmark and display its results
 */
async function runSingleBenchmark(benchmark) {
  console.log(chalk.bold.yellow(`Running benchmark: ${benchmark.name}`));
  console.log(`Objective: ${benchmark.options.objective}`);
  console.log(`Strategy: ${benchmark.options.strategy}, Mode: ${benchmark.options.mode}`);
  console.log(`Agents: ${benchmark.options.maxAgents}, Parallel: ${benchmark.options.parallel ? 'Yes' : 'No'}`);
  console.log();
  
  const startTime = Date.now();
  
  try {
    // Run the benchmark
    const result = await runBenchmark(benchmark.options);
    
    // Calculate wall-clock time
    const duration = (Date.now() - startTime) / 1000;
    
    // Store result
    results.push({
      name: benchmark.name,
      status: result.status,
      duration: duration,
      metrics: result.metrics,
      benchmark: benchmark
    });
    
    // Display result
    if (result.status === 'success') {
      console.log(chalk.green('✓ Benchmark completed successfully'));
      console.log(`  Duration: ${duration.toFixed(2)}s`);
      console.log(`  Tasks per second: ${result.metrics.tasksPerSecond.toFixed(2)}`);
      console.log(`  Peak memory: ${result.metrics.peakMemoryMb.toFixed(2)} MB`);
      console.log(`  Success rate: ${(result.metrics.successRate * 100).toFixed(2)}%`);
      
      if (result.outputFiles) {
        console.log('  Output files:');
        Object.entries(result.outputFiles).forEach(([format, path]) => {
          console.log(`    ${format}: ${path}`);
        });
      }
    } else {
      console.log(chalk.red(`✗ Benchmark failed: ${result.error || 'Unknown error'}`));
    }
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
    
  } catch (error) {
    console.error(chalk.red(`Error running benchmark ${benchmark.name}:`), error);
    results.push({
      name: benchmark.name,
      status: 'error',
      error: error.message,
      benchmark: benchmark
    });
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
  }
}

/**
 * Display comparative results
 */
function displayResults() {
  console.log(chalk.bold.blue('═══════════════════════════════════════════════════════'));
  console.log(chalk.bold.blue('                  BENCHMARK RESULTS                   '));
  console.log(chalk.bold.blue('═══════════════════════════════════════════════════════'));
  console.log();
  
  // Display table header
  console.log(chalk.bold('Name                Duration    Peak Mem    CPU %    Success Rate'));
  console.log(chalk.gray('─'.repeat(70)));
  
  // Display each result
  results.forEach(result => {
    if (result.status === 'success') {
      console.log(
        `${result.name.padEnd(20)} ${result.duration.toFixed(2).padStart(8)}s ${
          result.metrics.peakMemoryMb.toFixed(2).padStart(8)} MB ${
          result.metrics.avgCpuPercent.toFixed(2).padStart(8)}% ${
          (result.metrics.successRate * 100).toFixed(2).padStart(10)}%`
      );
    } else {
      console.log(chalk.red(
        `${result.name.padEnd(20)} FAILED`
      ));
    }
  });
  
  console.log();
  
  // Find best performer
  if (results.filter(r => r.status === 'success').length > 0) {
    const successfulResults = results.filter(r => r.status === 'success');
    
    const fastest = successfulResults.reduce((prev, current) => 
      prev.duration < current.duration ? prev : current);
      
    const mostEfficient = successfulResults.reduce((prev, current) => 
      prev.metrics.peakMemoryMb < current.metrics.peakMemoryMb ? prev : current);
    
    const mostReliable = successfulResults.reduce((prev, current) => 
      prev.metrics.successRate > current.metrics.successRate ? prev : current);
    
    console.log(chalk.bold('Performance Winners:'));
    console.log(`  Fastest: ${chalk.green(fastest.name)} (${fastest.duration.toFixed(2)}s)`);
    console.log(`  Most memory-efficient: ${chalk.green(mostEfficient.name)} (${mostEfficient.metrics.peakMemoryMb.toFixed(2)} MB)`);
    console.log(`  Most reliable: ${chalk.green(mostReliable.name)} (${(mostReliable.metrics.successRate * 100).toFixed(2)}%)`);
  }
}

/**
 * Main function to run all benchmarks sequentially
 */
async function runAllBenchmarks() {
  try {
    // Run benchmarks
    for (const benchmark of benchmarks) {
      await runSingleBenchmark(benchmark);
    }
    
    // Display comparative results
    displayResults();
    
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

// Run the benchmarks
runAllBenchmarks().catch(console.error);