/**
 * Basic example of using the benchmark system
 */

import { runBenchmark } from '../dist/api.js';
import chalk from 'chalk';

// Use chalk for colorful output
const colors = chalk;

async function runBasicExample() {
  console.log(colors.blue('Running basic benchmark example...'));
  
  try {
    // Run benchmark with basic options
    const result = await runBenchmark({
      objective: 'Basic example benchmark',
      strategy: 'development',
      outputFormats: ['json'],
      outputDirectory: './benchmark-reports'
    });
    
    // Display results
    console.log(colors.green('\n=== Basic Example Results ==='));
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
    
    console.log(colors.green('\nBasic example completed successfully!'));
    return result;
  } catch (error) {
    console.error(colors.red('Basic example failed:'), error.message);
    process.exit(1);
  }
}

// Run the example
runBasicExample().catch(console.error);