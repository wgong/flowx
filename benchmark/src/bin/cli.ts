#!/usr/bin/env node
/**
 * Command-line interface for the benchmark system.
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { runBenchmark, BenchmarkOptions } from '../api';
import { EnginePlugin, MetricsCollectionPlugin, OptimizationPlugin } from '../swarm_benchmark/core/plugins';

// Create CLI program
const program = new Command();

// Configure CLI
program
  .name('benchmark')
  .description('Claude-Flow Benchmark System')
  .version('1.0.0');

// Run command
program
  .command('run')
  .description('Run a benchmark')
  .argument('<objective>', 'The benchmark objective')
  .option('-s, --strategy <strategy>', 'Strategy to use (auto, research, development, analysis, testing, optimization, maintenance)')
  .option('-m, --mode <mode>', 'Coordination mode (centralized, distributed, hierarchical, mesh, hybrid)')
  .option('-a, --max-agents <number>', 'Maximum number of agents to use', '3')
  .option('-p, --parallel', 'Enable parallel execution')
  .option('--no-optimize', 'Disable optimizations')
  .option('--no-metrics', 'Disable detailed metrics collection')
  .option('-o, --output <formats>', 'Output formats (comma-separated)', 'json')
  .option('-d, --output-dir <path>', 'Output directory', './benchmark-reports')
  .option('-t, --timeout <seconds>', 'Task timeout in seconds', '300')
  .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .option('--log-file', 'Log to file in output directory')
  .action(async (objective, options) => {
    try {
      // Parse options
      const benchmarkOptions: BenchmarkOptions = {
        objective,
        strategy: options.strategy,
        mode: options.mode,
        maxAgents: parseInt(options.maxAgents, 10),
        parallel: options.parallel,
        optimized: options.optimize,
        metrics: options.metrics,
        outputFormats: options.output.split(','),
        outputDirectory: options.outputDir,
        timeout: parseInt(options.timeout, 10),
        logLevel: options.logLevel,
        logToFile: options.logFile
      };

      // Add default plugins if needed
      const plugins: EnginePlugin[] = [];
      
      if (options.optimize) {
        plugins.push(new OptimizationPlugin());
      }
      
      if (options.metrics) {
        plugins.push(new MetricsCollectionPlugin());
      }
      
      benchmarkOptions.plugins = plugins;
      
      console.log(`Running benchmark: ${objective}`);
      console.log(`Strategy: ${benchmarkOptions.strategy || 'auto'}, Mode: ${benchmarkOptions.mode || 'centralized'}`);
      
      // Run the benchmark
      const result = await runBenchmark(benchmarkOptions);
      
      // Display results
      console.log('\n=== Benchmark Results ===');
      console.log(`Status: ${result.status}`);
      console.log(`Summary: ${result.summary}`);
      console.log(`Duration: ${result.duration.toFixed(2)}s`);
      
      if (result.metrics) {
        console.log('\n=== Performance Metrics ===');
        console.log(`Execution Time: ${result.metrics.executionTime.toFixed(2)}s`);
        console.log(`Tasks Per Second: ${result.metrics.tasksPerSecond.toFixed(2)}`);
        console.log(`Success Rate: ${(result.metrics.successRate * 100).toFixed(2)}%`);
        console.log(`Peak Memory: ${result.metrics.peakMemoryMb.toFixed(2)} MB`);
        console.log(`Avg CPU: ${result.metrics.avgCpuPercent.toFixed(2)}%`);
      }
      
      if (result.outputFiles && Object.keys(result.outputFiles).length > 0) {
        console.log('\n=== Output Files ===');
        for (const [format, file] of Object.entries(result.outputFiles)) {
          console.log(`${format.toUpperCase()}: ${file}`);
        }
      }
      
    } catch (error) {
      console.error('Benchmark failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// List available strategies and modes
program
  .command('list')
  .description('List available strategies and coordination modes')
  .action(() => {
    console.log('=== Available Strategies ===');
    console.log('- auto: Automatically select the best strategy');
    console.log('- research: Information gathering and analysis');
    console.log('- development: Software development tasks');
    console.log('- analysis: Code and data analysis');
    console.log('- testing: Quality assurance workflows');
    console.log('- optimization: Performance improvements');
    console.log('- maintenance: System maintenance tasks');
    
    console.log('\n=== Coordination Modes ===');
    console.log('- centralized: Single coordinator (default)');
    console.log('- distributed: Multiple coordinators');
    console.log('- hierarchical: Tree structure');
    console.log('- mesh: Peer-to-peer coordination');
    console.log('- hybrid: Mixed coordination patterns');
  });

// Example command
program
  .command('example')
  .description('Run an example benchmark')
  .option('--type <type>', 'Example type (basic, advanced, plugin)', 'basic')
  .action(async (options) => {
    try {
      const exampleType = options.type;
      console.log(`Running ${exampleType} example benchmark...`);
      
      switch (exampleType) {
        case 'basic':
          // Basic benchmark example
          const basicResult = await runBenchmark({
            objective: 'Basic example benchmark',
            strategy: 'auto',
            outputFormats: ['json']
          });
          
          console.log('\n=== Example Result ===');
          console.log(`Status: ${basicResult.status}`);
          console.log(`Duration: ${basicResult.duration.toFixed(2)}s`);
          break;
          
        case 'advanced':
          // Advanced benchmark example
          const advancedResult = await runBenchmark({
            objective: 'Advanced example benchmark',
            strategy: 'development',
            mode: 'centralized',
            maxAgents: 3,
            parallel: true,
            optimized: true,
            metrics: true,
            outputFormats: ['json', 'sqlite'],
            outputDirectory: './benchmark-reports'
          });
          
          console.log('\n=== Example Result ===');
          console.log(`Status: ${advancedResult.status}`);
          console.log(`Duration: ${advancedResult.duration.toFixed(2)}s`);
          break;
          
        case 'plugin':
          // Plugin example - would normally use custom plugins
          const pluginResult = await runBenchmark({
            objective: 'Plugin example benchmark',
            strategy: 'development',
            plugins: [
              new OptimizationPlugin(),
              new MetricsCollectionPlugin()
            ]
          });
          
          console.log('\n=== Example Result ===');
          console.log(`Status: ${pluginResult.status}`);
          console.log(`Duration: ${pluginResult.duration.toFixed(2)}s`);
          break;
          
        default:
          console.error(`Unknown example type: ${exampleType}`);
          console.log('Available types: basic, advanced, plugin');
          process.exit(1);
      }
      
    } catch (error) {
      console.error('Example failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (process.argv.length <= 2) {
  program.help();
}