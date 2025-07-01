#!/usr/bin/env node
/**
 * Command-line interface for the refactored benchmark system.
 * Provides a simple way to run benchmarks from the command line.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runBenchmark, BenchmarkOptions } from '../swarm_benchmark/api';

// Parse command line arguments
const args = process.argv.slice(2);

// Show help if requested or if no arguments are provided
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Command handlers
const commands: Record<string, (args: string[]) => Promise<void>> = {
  'run': runBenchmarkCommand,
  'version': showVersion,
  'help': async () => { showHelp(); return Promise.resolve(); }
};

// Main function
async function main() {
  try {
    const command = args[0];
    const handler = commands[command];
    
    if (!handler) {
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
    }
    
    await handler(args.slice(1));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Run a benchmark from the command line
 * 
 * @param args Command line arguments
 */
async function runBenchmarkCommand(args: string[]): Promise<void> {
  // Parse options
  const options: BenchmarkOptions = {
    objective: '',
    strategy: 'auto',
    mode: 'centralized',
    maxAgents: 3,
    parallel: false,
    optimized: true,
    metrics: true,
    outputFormats: ['json'],
    outputDirectory: path.join(process.cwd(), 'benchmark-reports'),
    timeout: 300,
    logLevel: 'info',
    logToFile: false
  };
  
  // First non-flag argument is the objective
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (!arg.startsWith('-')) {
      options.objective = arg;
      continue;
    }
    
    // Parse flags
    switch (arg) {
      case '--strategy':
      case '-s':
        options.strategy = args[++i] as any;
        break;
        
      case '--mode':
      case '-m':
        options.mode = args[++i] as any;
        break;
        
      case '--max-agents':
      case '-a':
        options.maxAgents = parseInt(args[++i], 10);
        break;
        
      case '--parallel':
      case '-p':
        options.parallel = true;
        break;
        
      case '--no-optimize':
        options.optimized = false;
        break;
        
      case '--no-metrics':
        options.metrics = false;
        break;
        
      case '--output':
      case '-o':
        options.outputFormats = args[++i].split(',');
        break;
        
      case '--output-dir':
      case '-d':
        options.outputDirectory = args[++i];
        break;
        
      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i], 10);
        break;
        
      case '--log-level':
      case '-l':
        options.logLevel = args[++i] as any;
        break;
        
      case '--log-file':
        options.logToFile = true;
        break;
        
      case '--config':
      case '-c':
        // Load config from file
        const configPath = args[++i];
        const configFile = fs.readFileSync(configPath, 'utf-8');
        const fileConfig = JSON.parse(configFile);
        Object.assign(options, fileConfig);
        break;
        
      default:
        console.warn(`Unknown option: ${arg}`);
    }
  }
  
  // Validate required options
  if (!options.objective) {
    console.error('Error: No benchmark objective provided');
    process.exit(1);
  }
  
  // Ensure output directory exists
  if (options.outputDirectory && !fs.existsSync(options.outputDirectory)) {
    fs.mkdirSync(options.outputDirectory, { recursive: true });
  }
  
  // Run the benchmark
  console.log(`Running benchmark: ${options.objective}`);
  console.log(`Strategy: ${options.strategy}, Mode: ${options.mode}`);
  console.log(`Output directory: ${options.outputDirectory}`);
  
  const startTime = Date.now();
  const result = await runBenchmark(options);
  const duration = (Date.now() - startTime) / 1000;
  
  // Display results
  console.log('\n--- Benchmark Results ---');
  console.log(`Status: ${result.status}`);
  console.log(`Summary: ${result.summary}`);
  console.log(`Duration: ${duration.toFixed(2)}s (JS time: ${result.duration.toFixed(2)}s)`);
  
  if (result.status === 'failed') {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
  
  // Show metrics
  console.log('\n--- Performance Metrics ---');
  console.log(`Execution Time: ${result.metrics.executionTime.toFixed(2)}s`);
  console.log(`Tasks Per Second: ${result.metrics.tasksPerSecond.toFixed(2)}`);
  console.log(`Success Rate: ${(result.metrics.successRate * 100).toFixed(2)}%`);
  console.log(`Peak Memory: ${result.metrics.peakMemoryMb.toFixed(2)} MB`);
  console.log(`Avg CPU: ${result.metrics.avgCpuPercent.toFixed(2)}%`);
  
  // Show output files
  if (result.outputFiles) {
    console.log('\n--- Output Files ---');
    Object.entries(result.outputFiles).forEach(([format, path]) => {
      console.log(`${format.toUpperCase()}: ${path}`);
    });
  }
}

/**
 * Show version information
 */
async function showVersion(): Promise<void> {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
  );
  
  console.log(`Benchmark CLI v${packageJson.version}`);
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
Benchmark CLI - Run benchmarks for claude-flow swarm operations

Usage:
  benchmark run <objective> [options]
  benchmark version
  benchmark help

Commands:
  run        Run a benchmark with the given objective
  version    Show version information
  help       Show this help message

Options for 'run' command:
  --strategy, -s <strategy>     Strategy to use (auto, research, development, analysis, testing, optimization, maintenance)
                               Default: auto
  --mode, -m <mode>            Coordination mode (centralized, distributed, hierarchical, mesh, hybrid)
                               Default: centralized
  --max-agents, -a <number>    Maximum number of agents to use
                               Default: 3
  --parallel, -p               Enable parallel execution
                               Default: false
  --no-optimize                Disable optimizations
                               Default: optimizations enabled
  --no-metrics                 Disable detailed metrics collection
                               Default: metrics enabled
  --output, -o <formats>       Output formats (comma-separated: json,sqlite,csv)
                               Default: json
  --output-dir, -d <path>      Output directory
                               Default: ./benchmark-reports
  --timeout, -t <seconds>      Task timeout in seconds
                               Default: 300
  --log-level, -l <level>      Log level (debug, info, warn, error)
                               Default: info
  --log-file                   Log to file in output directory
                               Default: console only
  --config, -c <path>          Load options from JSON config file

Examples:
  benchmark run "Build a REST API" --strategy development --parallel
  benchmark run "Research best practices" --strategy research --output json,sqlite
  benchmark run "Test API endpoints" --config ./benchmark-config.json
  `);
}

// Run the CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});