#!/usr/bin/env node

/**
 * Run performance benchmarks for FlowX
 * 
 * This script runs performance benchmarks for core system components
 * and generates detailed performance reports.
 * 
 * Usage:
 *   node scripts/run-benchmarks.js [options]
 * 
 * Options:
 *   --component=<name>  Only benchmark specific component
 *   --compare=<file>    Compare with previous benchmark results
 *   --ci                Run in CI mode (fewer iterations)
 *   --quick             Run quick benchmarks (fewer iterations)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createBenchmarkSuite, compareWithPrevious } from '../tests/benchmark/benchmark-suite.js';

// Import benchmark modules
import runMemoryBenchmarks from '../tests/benchmark/memory-benchmarks.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse arguments
const args = process.argv.slice(2);
const options = {
  component: null,
  compare: null,
  ci: args.includes('--ci'),
  quick: args.includes('--quick')
};

// Parse named arguments
for (const arg of args) {
  if (arg.startsWith('--component=')) {
    options.component = arg.split('=')[1];
  } else if (arg.startsWith('--compare=')) {
    options.compare = arg.split('=')[1];
  }
}

// Available benchmark modules
const benchmarks = {
  memory: runMemoryBenchmarks,
  // Add other benchmark modules here as they are implemented
};

/**
 * Run the benchmarks
 */
async function runBenchmarks() {
  console.log('🚀 Starting FlowX Performance Benchmarks');
  console.log('═'.repeat(60));
  console.log(`Mode: ${options.ci ? 'CI' : (options.quick ? 'Quick' : 'Full')}`);
  if (options.component) {
    console.log(`Component filter: ${options.component}`);
  }
  console.log('═'.repeat(60));
  
  const startTime = Date.now();
  const results = {};
  
  // Create reports directory
  const reportsDir = path.join(process.cwd(), 'reports', 'benchmarks');
  await fs.mkdir(reportsDir, { recursive: true });
  
  // Run the selected benchmarks
  for (const [component, benchmarkFn] of Object.entries(benchmarks)) {
    if (options.component && options.component !== component) {
      continue;
    }
    
    console.log(`\n📊 Benchmarking ${component}...`);
    
    try {
      const componentResults = await benchmarkFn();
      results[component] = componentResults;
    } catch (error) {
      console.error(`Error running ${component} benchmarks:`, error);
    }
  }
  
  // Save consolidated results
  const resultsFile = path.join(reportsDir, `benchmark-results-${Date.now()}.json`);
  await fs.writeFile(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    options,
    environment: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCores: require('os').cpus().length
    },
    results
  }, null, 2));
  
  console.log('\n═'.repeat(60));
  console.log(`✅ Benchmarks completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  console.log(`Results saved to: ${resultsFile}`);
  
  // Compare with previous results if requested
  if (options.compare) {
    try {
      const compareFile = options.compare.startsWith('/') ? 
        options.compare : path.join(reportsDir, options.compare);
      
      console.log(`\n🔍 Comparing with previous results: ${compareFile}`);
      const comparison = await compareWithPrevious(results, compareFile);
      
      if (comparison) {
        const comparisonFile = path.join(reportsDir, `comparison-${Date.now()}.json`);
        await fs.writeFile(comparisonFile, JSON.stringify(comparison, null, 2));
        console.log(`Comparison saved to: ${comparisonFile}`);
        
        // Print summary of changes
        console.log('\n📈 Performance Change Summary:');
        
        for (const [testName, testResult] of Object.entries(comparison.tests)) {
          if (testResult.status === 'new') {
            console.log(`  ${testName}: NEW`);
            continue;
          }
          
          console.log(`  ${testName}:`);
          
          for (const [benchmarkName, benchResult] of Object.entries(testResult.benchmarks)) {
            if (benchResult.status === 'new') {
              console.log(`    - ${benchmarkName}: NEW`);
              continue;
            }
            
            const change = benchResult.percentChange.toFixed(2);
            const indicator = 
              benchResult.status === 'improvement' ? '✅' :
              benchResult.status === 'regression' ? '⚠️' : '•';
            
            console.log(`    - ${indicator} ${benchmarkName}: ${change}% ${benchResult.status === 'regression' ? 'slower' : (benchResult.status === 'improvement' ? 'faster' : '')}`);
          }
        }
      }
    } catch (error) {
      console.error('Error comparing benchmark results:', error);
    }
  }
  
  return results;
}

// Run benchmarks if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBenchmarks().catch(error => {
    console.error('Benchmark execution failed:', error);
    process.exit(1);
  });
}

export default runBenchmarks;