/**
 * Performance Benchmark Suite for FlowX
 * 
 * This module provides a comprehensive benchmark framework for measuring
 * the performance of critical components and operations in the FlowX system.
 */

import Benchmark from 'benchmark';
import microtime from 'microtime';
import fs from 'fs/promises';
import path from 'path';
import { EventBus } from '../../src/core/event-bus';
import { Logger } from '../../src/core/logger';

interface BenchmarkContext {
  logger: Logger;
  eventBus: EventBus;
  metrics: Record<string, any>;
  createFixture: typeof createFixture;
  suiteStartTime?: number;
  [key: string]: any;
}

interface BenchmarkSuiteOptions {
  context?: Record<string, any>;
}

interface FixtureOptions {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  complexity?: 'simple' | 'medium' | 'complex' | 'veryComplex';
  type?: 'object' | 'array' | 'tree' | 'graph';
}

/**
 * Create a benchmark suite with common utilities and setup
 * @param {string} name - Suite name
 * @param {Object} options - Suite options
 * @returns {Benchmark.Suite} Configured benchmark suite
 */
export function createBenchmarkSuite(name: string, options: BenchmarkSuiteOptions = {}): Benchmark.Suite & { ctx: BenchmarkContext } {
  const logger = new Logger({
    level: 'error', // Minimize noise during benchmarks
    format: 'json',
    destination: 'console'
  }, { component: 'benchmark' });
  
  const eventBus = new EventBus();
  
  // Create and configure suite
  const suite = new Benchmark.Suite(name) as Benchmark.Suite & { ctx: BenchmarkContext };
  
  // Add common utilities to suite context
  suite.ctx = {
    logger,
    eventBus,
    metrics: {},
    createFixture: createFixture,
    ...options.context
  };
  
  // Configure event handlers
  suite
    .on('start', function(this: typeof suite) {
      console.log(`\n🚀 Starting benchmark suite: ${this.name}`);
      console.log('═'.repeat(50));
      
      // Record start time for the entire suite
      this.ctx.suiteStartTime = microtime.now();
    })
    .on('cycle', function(this: typeof suite, event: Benchmark.Event) {
      console.log(String(event.target));
      
      // Store metric for this test
      const benchmark = event.target;
      this.ctx.metrics[benchmark.name] = {
        hz: benchmark.hz,
        rme: benchmark.stats.rme,
        samples: benchmark.stats.sample.length,
        mean: benchmark.stats.mean,
        variance: benchmark.stats.variance
      };
    })
    .on('complete', function(this: typeof suite) {
      const suiteTime = (microtime.now() - (this.ctx.suiteStartTime || 0)) / 1000000;
      console.log('═'.repeat(50));
      console.log(`✅ Suite complete: ${this.name}`);
      console.log(`Total execution time: ${suiteTime.toFixed(2)}s`);
      
      if (this.filter('fastest').length > 0) {
        const fastest = this.filter('fastest')[0];
        const slowest = this.filter('slowest')[0];
        
        console.log(`Fastest: ${fastest.name}`);
        console.log(`Slowest: ${slowest.name}`);
        
        if (fastest !== slowest) {
          const diff = ((fastest.hz / slowest.hz) * 100 - 100).toFixed(2);
          console.log(`${fastest.name} is ~${diff}% faster than ${slowest.name}`);
        }
      }
    })
    .on('error', function(this: typeof suite, event: Benchmark.Event) {
      console.error(`Error in benchmark ${event.target.name}:`, event.error);
    });
  
  return suite;
}

/**
 * Create a test fixture with the given size and complexity
 * @param {Object} options - Fixture options
 * @returns {Object} Test fixture
 */
export function createFixture({ 
  size = 'medium', 
  complexity = 'medium',
  type = 'object'
}: FixtureOptions = {}): any {
  // Size configurations
  const sizes: Record<string, number> = {
    tiny: 10,
    small: 100,
    medium: 1000,
    large: 10000,
    huge: 100000
  };
  
  // Complexity configurations
  const complexities: Record<string, number> = {
    simple: 1,
    medium: 3,
    complex: 5,
    veryComplex: 10
  };
  
  const itemCount = sizes[size] || sizes.medium;
  const depthLevel = complexities[complexity] || complexities.medium;
  
  switch (type) {
    case 'array':
      return createArrayFixture(itemCount, depthLevel);
    case 'tree':
      return createTreeFixture(itemCount, depthLevel);
    case 'graph':
      return createGraphFixture(itemCount, depthLevel);
    case 'object':
    default:
      return createObjectFixture(itemCount, depthLevel);
  }
}

/**
 * Create an object fixture with nested properties
 */
function createObjectFixture(count: number, depth: number): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (let i = 0; i < count; i++) {
    let current = result;
    const key = `key${i}`;
    
    if (depth <= 1) {
      current[key] = `value-${i}`;
    } else {
      current[key] = {};
      current = current[key];
      
      for (let d = 1; d < depth; d++) {
        const nestedKey = `nested${d}_${i}`;
        
        if (d === depth - 1) {
          current[nestedKey] = `deep-value-${i}-${d}`;
        } else {
          current[nestedKey] = {};
          current = current[nestedKey];
        }
      }
    }
  }
  
  return result;
}

/**
 * Create an array fixture with nested arrays
 */
function createArrayFixture(count: number, depth: number): any[] {
  const result: any[] = [];
  
  for (let i = 0; i < count; i++) {
    if (depth <= 1) {
      result.push(`value-${i}`);
    } else {
      const nestedArray: any[] = [];
      let current = nestedArray;
      
      for (let d = 1; d < depth; d++) {
        if (d === depth - 1) {
          for (let j = 0; j < Math.min(5, count / 10); j++) {
            current.push(`deep-value-${i}-${j}`);
          }
        } else {
          const newArray: any[] = [];
          current.push(newArray);
          current = newArray;
        }
      }
      
      result.push(nestedArray);
    }
  }
  
  return result;
}

interface TreeNode {
  id: string;
  value: string;
  children: TreeNode[];
}

/**
 * Create a tree fixture
 */
function createTreeFixture(count: number, depth: number): TreeNode {
  function createNode(id: string, currentDepth: number): TreeNode {
    const node: TreeNode = {
      id: `node-${id}`,
      value: `value-${id}`,
      children: []
    };
    
    if (currentDepth < depth) {
      const childCount = Math.max(2, 5 - currentDepth);
      for (let i = 0; i < childCount; i++) {
        if (node.children.length < count) {
          node.children.push(createNode(`${id}-${i}`, currentDepth + 1));
        }
      }
    }
    
    return node;
  }
  
  return createNode('root', 0);
}

interface GraphNode {
  id: string;
  value: string;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Create a graph fixture
 */
function createGraphFixture(count: number, complexity: number): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Create nodes
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `node-${i}`,
      value: `value-${i}`
    });
  }
  
  // Create edges based on complexity
  const edgeCount = Math.min(count * complexity, count * (count - 1) / 2);
  
  for (let e = 0; e < edgeCount; e++) {
    const source = Math.floor(Math.random() * count);
    let target;
    do {
      target = Math.floor(Math.random() * count);
    } while (target === source);
    
    edges.push({
      source: `node-${source}`,
      target: `node-${target}`,
      weight: Math.random()
    });
  }
  
  return { nodes, edges };
}

interface BenchmarkResults {
  timestamp: string;
  platform: string;
  nodeVersion: string;
  results: Record<string, any>;
}

/**
 * Save benchmark results to a file
 * @param {Object} results - Benchmark results
 * @param {string} filename - Output filename
 */
export async function saveResults(results: Record<string, any>, filename: string): Promise<void> {
  const resultsWithTimestamp: BenchmarkResults = {
    timestamp: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version,
    results
  };
  
  const resultsDir = path.join(process.cwd(), 'reports', 'benchmarks');
  await fs.mkdir(resultsDir, { recursive: true });
  
  const filePath = path.join(resultsDir, filename);
  await fs.writeFile(filePath, JSON.stringify(resultsWithTimestamp, null, 2));
  
  console.log(`Benchmark results saved to: ${filePath}`);
}

interface ComparisonResult {
  timestamp: string;
  comparedWith: string;
  tests: Record<string, any>;
}

/**
 * Compare current benchmark results with previous results
 * @param {Object} currentResults - Current benchmark results
 * @param {string} previousResultsFile - Path to previous results file
 * @returns {Object} Comparison results
 */
export async function compareWithPrevious(
  currentResults: Record<string, any>, 
  previousResultsFile: string
): Promise<ComparisonResult | null> {
  try {
    const previousContent = await fs.readFile(previousResultsFile, 'utf8');
    const previousResults = JSON.parse(previousContent) as BenchmarkResults;
    
    const comparison: ComparisonResult = {
      timestamp: new Date().toISOString(),
      comparedWith: previousResults.timestamp,
      tests: {}
    };
    
    // Compare each benchmark
    Object.keys(currentResults).forEach(suiteName => {
      const currentSuite = currentResults[suiteName];
      const previousSuite = previousResults.results[suiteName];
      
      if (!previousSuite) {
        comparison.tests[suiteName] = { status: 'new' };
        return;
      }
      
      comparison.tests[suiteName] = { benchmarks: {} };
      
      Object.keys(currentSuite).forEach(benchmarkName => {
        const current = currentSuite[benchmarkName];
        const previous = previousSuite[benchmarkName];
        
        if (!previous) {
          comparison.tests[suiteName].benchmarks[benchmarkName] = { status: 'new' };
          return;
        }
        
        const percentChange = ((current.hz - previous.hz) / previous.hz) * 100;
        
        comparison.tests[suiteName].benchmarks[benchmarkName] = {
          currentHz: current.hz,
          previousHz: previous.hz,
          percentChange: percentChange,
          status: percentChange < -5 ? 'regression' : 
                  percentChange > 5 ? 'improvement' : 
                  'stable'
        };
      });
    });
    
    return comparison;
  } catch (error) {
    console.error('Error comparing with previous results:', error);
    return null;
  }
}

export default {
  createBenchmarkSuite,
  createFixture,
  saveResults,
  compareWithPrevious
};