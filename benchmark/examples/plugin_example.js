/**
 * Example demonstrating custom plugin creation and usage with the benchmark system
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
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`
  };
}

/**
 * Custom plugin that logs the start and completion of tasks
 */
class LoggingPlugin extends benchmarkSystem.EnginePlugin {
  constructor(options = {}) {
    super();
    this.logPrefix = options.prefix || '[LoggingPlugin]';
    this.verbose = options.verbose || false;
  }
  
  async preBenchmark(benchmark) {
    console.log(colors.blue(`${this.logPrefix} Starting benchmark: ${benchmark.name}`));
    console.log(colors.blue(`${this.logPrefix} Objective: ${benchmark.description || 'No description'}`));
    benchmark.metadata.loggingEnabled = true;
  }
  
  async postBenchmark(benchmark) {
    console.log(colors.blue(`${this.logPrefix} Benchmark complete: ${benchmark.name}`));
    console.log(colors.blue(`${this.logPrefix} Status: ${benchmark.status}`));
    console.log(colors.blue(`${this.logPrefix} Duration: ${benchmark.duration()}s`));
  }
  
  async preTask(task) {
    console.log(colors.gray(`${this.logPrefix} Starting task: ${task.id}`));
    console.log(colors.gray(`${this.logPrefix} Objective: ${task.objective}`));
    
    if (this.verbose) {
      console.log(colors.gray(`${this.logPrefix} Strategy: ${task.strategy}`));
      console.log(colors.gray(`${this.logPrefix} Mode: ${task.mode}`));
    }
  }
  
  async postTask(task, result) {
    console.log(colors.gray(`${this.logPrefix} Task complete: ${task.id}`));
    console.log(colors.gray(`${this.logPrefix} Status: ${result.status}`));
    
    if (this.verbose && result.errors && result.errors.length > 0) {
      console.log(colors.red(`${this.logPrefix} Errors: ${result.errors.join(', ')}`));
    }
    
    return result;
  }
}

/**
 * Custom plugin that adds timing information
 */
class TimingPlugin extends benchmarkSystem.EnginePlugin {
  constructor() {
    super();
    this.benchmarkStart = null;
    this.taskTimings = new Map();
  }
  
  async preBenchmark(benchmark) {
    this.benchmarkStart = Date.now();
    benchmark.metadata.timingEnabled = true;
    console.log(colors.yellow('[TimingPlugin] Starting timing for benchmark'));
  }
  
  async postBenchmark(benchmark) {
    const end = Date.now();
    const durationMs = end - this.benchmarkStart;
    
    benchmark.metadata.timing = {
      totalMs: durationMs,
      taskTimings: Object.fromEntries(this.taskTimings)
    };
    
    console.log(colors.yellow(`[TimingPlugin] Total benchmark time: ${(durationMs / 1000).toFixed(2)}s`));
    
    // Log task timings
    console.log(colors.yellow('[TimingPlugin] Task timings:'));
    for (const [taskId, timing] of this.taskTimings.entries()) {
      console.log(colors.yellow(`  ${taskId}: ${(timing.durationMs / 1000).toFixed(2)}s`));
    }
  }
  
  async preTask(task) {
    this.taskTimings.set(task.id, {
      startTime: Date.now()
    });
  }
  
  async postTask(task, result) {
    const taskTiming = this.taskTimings.get(task.id);
    if (taskTiming) {
      const end = Date.now();
      const durationMs = end - taskTiming.startTime;
      
      this.taskTimings.set(task.id, {
        ...taskTiming,
        endTime: end,
        durationMs
      });
      
      // Add timing to result metadata
      if (!result.metadata) result.metadata = {};
      result.metadata.executionTimeMs = durationMs;
    }
    
    return result;
  }
}

// Run a benchmark with custom plugins
async function runPluginExample() {
  console.log(colors.green('=== Running Plugin Example ==='));
  
  try {
    // Create instances of custom plugins
    const loggingPlugin = new LoggingPlugin({ verbose: true });
    const timingPlugin = new TimingPlugin();
    
    // Configure the benchmark
    const options = {
      objective: 'Test custom plugins integration',
      strategy: 'development',
      mode: 'centralized',
      maxAgents: 2,
      parallel: true,
      optimized: true,
      metrics: true,
      outputFormats: ['json'],
      outputDirectory: './benchmark-reports/plugin-example',
      plugins: [loggingPlugin, timingPlugin]
    };
    
    // Run the benchmark
    console.log(colors.cyan('Starting benchmark with 2 custom plugins...'));
    const result = await benchmarkSystem.runBenchmark(options);
    
    // Display results
    console.log(colors.green('\n=== Plugin Example Results ==='));
    console.log(`Status: ${colors.cyan(result.status)}`);
    console.log(`Summary: ${colors.cyan(result.summary)}`);
    console.log(`Duration: ${colors.cyan(result.duration.toFixed(2))}s`);
    
    if (result.metrics) {
      console.log(colors.green('\n=== Performance Metrics ==='));
      console.log(`Execution Time: ${colors.cyan(result.metrics.executionTime.toFixed(2))}s`);
      console.log(`Tasks Per Second: ${colors.cyan(result.metrics.tasksPerSecond.toFixed(2))}`);
      console.log(`Success Rate: ${colors.cyan((result.metrics.successRate * 100).toFixed(2))}%`);
    }
    
    // Show plugin-specific metadata
    console.log(colors.green('\n=== Plugin Metadata ==='));
    if (result.metadata?.timingEnabled) {
      console.log(`Total time: ${colors.cyan((result.metadata.timing.totalMs / 1000).toFixed(2))}s`);
    }
    if (result.metadata?.loggingEnabled) {
      console.log(colors.cyan('Logging was enabled for this benchmark'));
    }
    
    console.log(colors.green('\nPlugin example completed successfully!'));
    return result;
  } catch (error) {
    console.error(colors.red('Plugin example failed:'), error.message);
    process.exit(1);
  }
}

// Run the example
runPluginExample().catch(console.error);