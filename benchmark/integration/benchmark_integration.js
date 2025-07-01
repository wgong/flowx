/**
 * Integration module for connecting the refactored benchmark system
 * with the main claude-flow application.
 */

const path = require('path');
const { runBenchmark } = require('../dist/api');

/**
 * Run a benchmark from within claude-flow
 * 
 * @param {Object} options Benchmark options
 * @param {Object} context Claude-flow context
 * @returns {Promise<Object>} Benchmark result
 */
async function runBenchmarkIntegration(options, context = {}) {
  // Apply defaults from context
  const enhancedOptions = {
    objective: options.objective,
    strategy: options.strategy || 'auto',
    mode: options.mode || 'centralized',
    maxAgents: options.maxAgents || context.maxAgents || 3,
    parallel: options.parallel || context.parallel || false,
    optimized: options.optimized !== false,
    metrics: options.metrics !== false,
    outputFormats: options.outputFormats || ['json'],
    outputDirectory: options.outputDirectory || path.join(context.baseDir || process.cwd(), 'benchmark-reports'),
    timeout: options.timeout || context.timeout || 300,
    logLevel: options.logLevel || context.logLevel || 'info',
    logToFile: options.logToFile || false
  };
  
  // Log benchmarking start through claude-flow logger if available
  if (context.logger) {
    context.logger.info(`Starting benchmark: ${enhancedOptions.objective}`);
    context.logger.info(`Strategy: ${enhancedOptions.strategy}, Mode: ${enhancedOptions.mode}`);
  } else {
    console.log(`Starting benchmark: ${enhancedOptions.objective}`);
  }
  
  // Run the benchmark
  const result = await runBenchmark(enhancedOptions);
  
  // Log results through claude-flow logger if available
  if (context.logger) {
    if (result.status === 'success') {
      context.logger.info(`Benchmark completed: ${result.summary}`);
      context.logger.info(`Duration: ${result.duration.toFixed(2)}s`);
    } else {
      context.logger.error(`Benchmark failed: ${result.error}`);
    }
  }
  
  return result;
}

/**
 * Register benchmark commands with claude-flow
 * 
 * @param {Object} commandRegistry Claude-flow command registry
 */
function registerBenchmarkCommands(commandRegistry) {
  // Register benchmark command
  commandRegistry.register({
    name: 'benchmark',
    description: 'Run benchmarks for claude-flow operations',
    execute: async (args, context) => {
      const subcommand = args._[0] || 'run';
      
      if (subcommand === 'help') {
        return showHelp(context);
      }
      
      if (subcommand === 'run') {
        // Get the objective (everything after 'run')
        const objective = args._.slice(1).join(' ');
        if (!objective) {
          return { error: 'No benchmark objective provided. Use benchmark help for usage.' };
        }
        
        // Extract options
        const options = {
          objective,
          strategy: args.strategy || args.s,
          mode: args.mode || args.m,
          maxAgents: args.maxAgents || args.agents || args.a,
          parallel: args.parallel || args.p || false,
          optimized: !args.noOptimize,
          metrics: !args.noMetrics,
          outputFormats: args.output || args.o || ['json'],
          outputDirectory: args.outputDir || args.d,
          timeout: args.timeout || args.t,
          logLevel: args.logLevel || args.l,
          logToFile: args.logFile || false
        };
        
        // Run the benchmark
        const result = await runBenchmarkIntegration(options, context);
        return result;
      }
      
      return { error: `Unknown subcommand: ${subcommand}. Use benchmark help for usage.` };
    }
  });
}

/**
 * Show help information
 * 
 * @param {Object} context Claude-flow context
 * @returns {Object} Help information
 */
function showHelp(context) {
  const help = `
Benchmark Commands:

benchmark run <objective> [options]
  Run a benchmark with the given objective

  Options:
    --strategy, -s <strategy>   Strategy to use (auto, research, development, analysis, testing, optimization, maintenance)
    --mode, -m <mode>          Coordination mode (centralized, distributed, hierarchical, mesh, hybrid)
    --max-agents, -a <number>  Maximum number of agents to use
    --parallel, -p             Enable parallel execution
    --no-optimize              Disable optimizations
    --no-metrics               Disable detailed metrics collection
    --output, -o <formats>     Output formats (comma-separated: json,sqlite,csv)
    --output-dir, -d <path>    Output directory
    --timeout, -t <seconds>    Task timeout in seconds
    --log-level, -l <level>    Log level (debug, info, warn, error)
    --log-file                 Log to file in output directory

benchmark help
  Show this help message

Examples:
  benchmark run "Build a REST API" --strategy development --parallel
  benchmark run "Research best practices" --strategy research --output json,sqlite
  benchmark run "Test API endpoints" --max-agents 5 --timeout 600
`;

  if (context.logger) {
    context.logger.info(help);
  }
  
  return { help };
}

module.exports = {
  runBenchmarkIntegration,
  registerBenchmarkCommands
};