/**
 * Advanced example of using the benchmark system with plugins and custom configuration
 */

// Try to import the TypeScript benchmark system
let benchmarkSystem;
try {
  benchmarkSystem = await import('../src/index.ts');
} catch (e) {
  console.error('TypeScript benchmark system not available, trying simplified version:', e.message);
  try {
    benchmarkSystem = await import('../simple-benchmark.js');
  } catch (e2) {
    console.error('Simplified benchmark system also not available:', e2.message);
    process.exit(1);
  }
}

// Get colors if available
let colors;
try {
  const colorsMod = await import('chalk');
  colors = colorsMod.default;
} catch (e) {
  // Basic fallback if chalk is not available
  colors = {
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`
  };
}

// Create custom plugin if available
let CustomPlugin;
try {
  const { EnginePlugin } = benchmarkSystem;
  
  // Define a custom plugin that logs benchmark progress
  CustomPlugin = class LoggingPlugin extends EnginePlugin {
    async preBenchmark(benchmark) {
      console.log(colors.magenta(`[Plugin] Starting benchmark: ${benchmark.name}`));
    }
    
    async postBenchmark(benchmark) {
      console.log(colors.magenta(`[Plugin] Completed benchmark: ${benchmark.name}`));
      console.log(colors.magenta(`[Plugin] Duration: ${benchmark.duration()}s`));
    }
    
    async preTask(task) {
      console.log(colors.magenta(`[Plugin] Starting task: ${task.objective.substring(0, 30)}...`));
    }
    
    async postTask(task, result) {
      console.log(colors.magenta(`[Plugin] Completed task: ${task.objective.substring(0, 30)}...`));
      console.log(colors.magenta(`[Plugin] Result status: ${result.status}`));
      return result; // Must return the result
    }
  };
} catch (e) {
  console.error('Could not create custom plugin:', e.message);
}

async function runAdvancedExample() {
  console.log(colors.blue('Running advanced benchmark example...'));
  
  try {
    // Create plugin instances
    const plugins = [];
    if (CustomPlugin) {
      plugins.push(new CustomPlugin());
    }
    
    // Define advanced options
    const options = {
      objective: 'Advanced benchmark example with multiple configurations',
      strategy: 'research',
      mode: 'distributed',
      maxAgents: 5,
      parallel: true,
      optimized: true,
      metrics: true,
      outputFormats: ['json', 'csv'],
      outputDirectory: './benchmark-reports/advanced',
      timeout: 300,
      logLevel: 'info',
      logToFile: false,
      plugins: plugins
    };
    
    // Run the benchmark
    console.log(colors.cyan('Starting advanced benchmark with custom plugins and configuration'));
    const result = await benchmarkSystem.runBenchmark(options);
    
    // Display results
    console.log(colors.green('\n=== Advanced Example Results ==='));
    console.log(`Status: ${colors.cyan(result.status)}`);
    console.log(`Summary: ${colors.cyan(result.summary)}`);
    console.log(`Duration: ${colors.cyan(result.duration.toFixed(2))}s`);
    
    if (result.metrics) {
      console.log(colors.green('\n=== Performance Metrics ==='));
      console.log(`Execution Time: ${colors.cyan(result.metrics.executionTime.toFixed(2))}s`);
      console.log(`Tasks Per Second: ${colors.cyan(result.metrics.tasksPerSecond.toFixed(2))}`);
      console.log(`Success Rate: ${colors.cyan((result.metrics.successRate * 100).toFixed(2))}%`);
      
      if (result.metrics.peakMemoryMb) {
        console.log(`Peak Memory: ${colors.cyan(result.metrics.peakMemoryMb.toFixed(2))} MB`);
      }
      
      if (result.metrics.avgCpuPercent) {
        console.log(`Avg CPU: ${colors.cyan(result.metrics.avgCpuPercent.toFixed(2))}%`);
      }
    }
    
    if (result.outputFiles && Object.keys(result.outputFiles).length > 0) {
      console.log(colors.green('\n=== Output Files ==='));
      for (const [format, file] of Object.entries(result.outputFiles)) {
        console.log(`${colors.yellow(format.toUpperCase())}: ${colors.cyan(file)}`);
      }
    }
    
    console.log(colors.green('\nAdvanced example completed successfully!'));
    return result;
  } catch (error) {
    console.error(colors.red('Advanced example failed:'), error.message);
    process.exit(1);
  }
}

// Run the example
runAdvancedExample().catch(console.error);