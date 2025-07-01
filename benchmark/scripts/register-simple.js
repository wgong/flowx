/**
 * Simple script to register the simplified benchmark system with claude-flow
 */

const path = require('path');

// Import the simplified benchmark API
const { runBenchmark } = require('../simple-benchmark');

// Create a registration function
function registerSimpleBenchmarkCommands(commandRegistry) {
  // Check if command registry is valid
  if (!commandRegistry || typeof commandRegistry.register !== 'function') {
    throw new Error('Invalid command registry');
  }
  
  // Register the benchmark command
  commandRegistry.register({
    name: 'benchmark',
    description: 'Run benchmarks for claude-flow operations',
    execute: async (args, context) => {
      // Extract the subcommand (default to 'run')
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
        
        // Print a status message
        if (context.logger) {
          context.logger.info(`Starting benchmark: ${objective}`);
          context.logger.info(`Strategy: ${options.strategy || 'auto'}, Mode: ${options.mode || 'centralized'}`);
        } else {
          console.log(`Starting benchmark: ${objective}`);
        }
        
        try {
          // Run the benchmark
          const result = await runBenchmark(options);
          
          // Log results
          if (context.logger) {
            if (result.status === 'success') {
              context.logger.info(`Benchmark completed: ${result.summary}`);
              context.logger.info(`Duration: ${result.duration.toFixed(2)}s`);
            } else {
              context.logger.error(`Benchmark failed: ${result.error}`);
            }
          }
          
          return result;
          
        } catch (error) {
          if (context.logger) {
            context.logger.error(`Benchmark failed: ${error.message}`);
          }
          
          return { error: `Benchmark failed: ${error.message}` };
        }
      }
      
      return { error: `Unknown subcommand: ${subcommand}. Use benchmark help for usage.` };
    }
  });
  
  console.log('✅ Benchmark commands registered successfully');
  
  return {
    registered: true,
    components: ['commands']
  };
}

/**
 * Show help information
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
  benchmark run "Research best practices" --output json,sqlite
  benchmark run "Test API endpoints" --max-agents 5 --timeout 600
`;

  if (context.logger) {
    context.logger.info(help);
  }
  
  return { help };
}

// Export the registration function
module.exports = {
  registerSimpleBenchmarkCommands
};

// If this script is run directly, output usage instructions
if (require.main === module) {
  console.log('📋 Simple Benchmark System Registration Script');
  console.log('📝 Usage:');
  console.log('  - Import this module in your claude-flow application');
  console.log('  - Call registerSimpleBenchmarkCommands(commandRegistry)');
  console.log('  - Then use the benchmark commands in claude-flow');
  console.log('\n📝 Example:');
  console.log('  const { registerSimpleBenchmarkCommands } = require("./benchmark/scripts/register-simple");');
  console.log('  registerSimpleBenchmarkCommands(app.commandRegistry);');
}