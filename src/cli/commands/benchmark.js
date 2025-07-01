/**
 * Benchmark command integration for Claude-Flow
 */

import { Command } from 'commander';
import { colors } from '../../utils/colors.ts';
import { isFunction } from '../../utils/helpers.ts';

// First try to import the TypeScript benchmark system, then fallback to simplified version if needed
let benchmarkSystem;
try {
  // Try to import the TypeScript benchmark system
  benchmarkSystem = await import('../../../benchmark/src/index.ts');
} catch (e) {
  console.error('TypeScript benchmark system not available, trying simplified version:', e.message);
  try {
    benchmarkSystem = await import('../../../benchmark/simple-benchmark.js');
  } catch (e2) {
    console.error('Simplified benchmark system also not available:', e2.message);
  }
}

/**
 * Create and register the benchmark command
 */
export const benchmarkCommand = new Command()
  .name('benchmark')
  .description('Run benchmarks for claude-flow operations')
  .action(() => {
    benchmarkCommand.help();
  });

// Only add subcommands if benchmark system is available
if (benchmarkSystem) {
  benchmarkCommand
    .command('run')
    .description('Run a benchmark with the given objective')
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
      console.log(colors.blue(`Running benchmark: ${objective}`));
      console.log(colors.gray(`Strategy: ${options.strategy || 'auto'}, Mode: ${options.mode || 'centralized'}`));
      
      try {
        // Parse options
        const benchmarkOptions = {
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
        
        // Run the benchmark
        const result = await benchmarkSystem.runBenchmark(benchmarkOptions);
        
        // Display results
        console.log(colors.green('\n=== Benchmark Results ==='));
        console.log(`Status: ${colors.cyan(result.status)}`);
        console.log(`Summary: ${colors.cyan(result.summary)}`);
        console.log(`Duration: ${colors.cyan(result.duration.toFixed(2))}s`);
        
        if (result.metrics) {
          console.log(colors.green('\n=== Performance Metrics ==='));
          console.log(`Execution Time: ${colors.cyan(result.metrics.executionTime.toFixed(2))}s`);
          console.log(`Tasks Per Second: ${colors.cyan(result.metrics.tasksPerSecond.toFixed(2))}`);
          console.log(`Success Rate: ${colors.cyan((result.metrics.successRate * 100).toFixed(2))}%`);
          console.log(`Peak Memory: ${colors.cyan(result.metrics.peakMemoryMb.toFixed(2))} MB`);
          console.log(`Avg CPU: ${colors.cyan(result.metrics.avgCpuPercent.toFixed(2))}%`);
        }
        
        if (result.outputFiles && Object.keys(result.outputFiles).length > 0) {
          console.log(colors.green('\n=== Output Files ==='));
          for (const [format, file] of Object.entries(result.outputFiles)) {
            console.log(`${colors.yellow(format.toUpperCase())}: ${colors.cyan(file)}`);
          }
        }
        
      } catch (error) {
        console.error(colors.red('Benchmark failed:'), error.message);
        process.exit(1);
      }
    });

  benchmarkCommand
    .command('example')
    .description('Run an example benchmark')
    .action(async () => {
      console.log(colors.blue('Running example benchmark...'));
      
      try {
        // Run example benchmark with default options
        const result = await benchmarkSystem.runBenchmark({
          objective: 'Example benchmark',
          strategy: 'development',
          outputFormats: ['json'],
          outputDirectory: './benchmark-reports'
        });
        
        // Display results
        console.log(colors.green('\n=== Example Benchmark Results ==='));
        console.log(`Status: ${colors.cyan(result.status)}`);
        console.log(`Summary: ${colors.cyan(result.summary)}`);
        console.log(`Duration: ${colors.cyan(result.duration.toFixed(2))}s`);
        
      } catch (error) {
        console.error(colors.red('Example benchmark failed:'), error.message);
        process.exit(1);
      }
    });
    
  benchmarkCommand
    .command('test')
    .description('Run benchmark system self-test')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (options) => {
      console.log(colors.blue('Running benchmark system self-test...'));
      
      try {
        // Run a test benchmark with minimal configuration
        const result = await benchmarkSystem.runBenchmark({
          objective: 'Benchmark system self-test',
          strategy: 'auto',
          outputFormats: ['json'],
          outputDirectory: './benchmark-reports/test'
        });
        
        console.log(colors.green('\n=== Self-Test Results ==='));
        console.log(`Status: ${colors.cyan(result.status)}`);
        
        if (result.status === 'success') {
          console.log(colors.green('✓ Benchmark system is working correctly'));
        } else {
          console.log(colors.red('✗ Benchmark system self-test failed'));
          console.log(`Error: ${colors.red(result.error || 'Unknown error')}`);
        }
        
        if (options.verbose) {
          console.log(colors.green('\n=== Details ==='));
          console.log(`Duration: ${colors.cyan(result.duration.toFixed(2))}s`);
          console.log(`Tasks: ${colors.cyan(result.taskCount)}`);
          console.log(`Results: ${colors.cyan(result.results ? result.results.length : 0)}`);
          
          if (result.metrics) {
            console.log(colors.green('\n=== Metrics ==='));
            Object.entries(result.metrics).forEach(([key, value]) => {
              console.log(`${key}: ${colors.cyan(typeof value === 'number' ? value.toFixed(2) : value)}`);
            });
          }
        }
        
      } catch (error) {
        console.error(colors.red('Benchmark self-test failed:'), error.message);
        process.exit(1);
      }
    });
} else {
  // Display a message if the benchmark system is not available
  benchmarkCommand
    .command('run')
    .description('Run a benchmark (Not available - benchmark system not installed)')
    .action(() => {
      console.error(colors.red('Benchmark system not available.'));
      console.log(colors.gray('Please run: cd benchmark && npm install'));
    });
}