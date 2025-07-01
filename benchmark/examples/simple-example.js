/**
 * Simple example using the simplified benchmark system
 */

// Import the benchmark API
const { runBenchmark, MetricsPlugin } = require('../simple-benchmark');

// Define a custom plugin
class LoggingPlugin {
  constructor() {
    this.name = 'Logging Plugin';
    this.logs = [];
  }
  
  async run(options) {
    console.log(`[${this.name}] Running benchmark: ${options.objective}`);
    this.logs.push({
      timestamp: new Date().toISOString(),
      message: `Started benchmark with strategy: ${options.strategy || 'auto'}`
    });
    
    // Wait a bit to simulate work
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.logs.push({
      timestamp: new Date().toISOString(),
      message: 'Benchmark execution in progress'
    });
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.logs.push({
      timestamp: new Date().toISOString(),
      message: 'Benchmark completed'
    });
    
    console.log(`[${this.name}] Recorded ${this.logs.length} log entries`);
  }
}

// Define the benchmark options
const options = {
  objective: 'Build a simple REST API with Express',
  strategy: 'development',
  mode: 'centralized',
  maxAgents: 3,
  parallel: true,
  optimized: true,
  metrics: true,
  outputFormats: ['json', 'csv'],
  outputDirectory: './benchmark-reports',
  plugins: [
    new MetricsPlugin(),
    new LoggingPlugin()
  ]
};

// Run the benchmark
async function runExample() {
  console.log(`Starting benchmark for: ${options.objective}`);
  console.log(`Strategy: ${options.strategy}, Mode: ${options.mode}`);
  
  try {
    // Run the benchmark
    const result = await runBenchmark(options);
    
    // Display results
    console.log('\n--- Benchmark Results ---');
    console.log(`Status: ${result.status}`);
    console.log(`Summary: ${result.summary}`);
    console.log(`Duration: ${result.duration.toFixed(2)}s`);
    
    // Show metrics
    console.log('\n--- Performance Metrics ---');
    console.log(`Execution Time: ${result.metrics.executionTime.toFixed(2)}s`);
    console.log(`Tasks Per Second: ${result.metrics.tasksPerSecond.toFixed(2)}`);
    console.log(`Success Rate: ${(result.metrics.successRate * 100).toFixed(2)}%`);
    console.log(`Peak Memory: ${result.metrics.peakMemoryMb.toFixed(2)} MB`);
    console.log(`Avg CPU: ${result.metrics.avgCpuPercent.toFixed(2)}%`);
    
    // Show output files
    if (result.outputFiles && Object.keys(result.outputFiles).length > 0) {
      console.log('\n--- Output Files ---');
      Object.entries(result.outputFiles).forEach(([format, path]) => {
        console.log(`${format.toUpperCase()}: ${path}`);
      });
    }
    
  } catch (error) {
    console.error('Benchmark failed:', error);
  }
}

runExample().catch(console.error);