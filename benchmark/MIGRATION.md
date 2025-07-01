# Migrating to the New Benchmark System

This guide helps users migrate from the old benchmark implementation to the new unified system.

## Key Changes

- **Single Unified Engine**: Replaced multiple engines (standard, optimized, real) with a single unified engine
- **TypeScript Support**: Full TypeScript integration with proper types and interfaces
- **Plugin System**: Extensible architecture with pre/post hooks
- **Standardized API**: Consistent naming conventions and interface
- **Improved Error Handling**: Comprehensive error tracking with context
- **Multiple Output Formats**: Support for JSON, SQLite, and CSV

## API Changes

### Old API

```javascript
// Old benchmark API
const benchmarkEngine = require('./benchmark/standard-benchmark.js');
// or const benchmarkEngine = require('./benchmark/optimized-benchmark.js');
// or const benchmarkEngine = require('./benchmark/real-benchmark.js');

const result = await benchmarkEngine.runBenchmark({
  objective: 'Build a REST API',
  options: {
    mode: 'development',
    agents: 3,
    runParallel: true
  }
});
```

### New API

```javascript
// New benchmark API - ESM style
import { runBenchmark } from './benchmark/dist/index.js';

// New benchmark API - CommonJS style
const { runBenchmark } = require('./benchmark/dist/index.js');

const result = await runBenchmark({
  objective: 'Build a REST API',
  strategy: 'development', // Replaces mode
  maxAgents: 3,           // Replaces agents
  parallel: true,         // Replaces runParallel
  outputFormats: ['json', 'sqlite'],
  outputDirectory: './benchmark-reports'
});
```

## Parameter Mapping

| Old Parameter | New Parameter | Notes |
|--------------|---------------|-------|
| `mode` | `strategy` | Values: 'auto', 'development', 'research', 'testing', 'optimization', 'analysis', 'maintenance' |
| `agents` | `maxAgents` | Maximum number of agents to use |
| `runParallel` | `parallel` | Boolean to enable parallel execution |
| `optimized` | `optimized` | Boolean to enable optimizations (default: true) |
| `outputPath` | `outputDirectory` | Directory for benchmark reports |
| n/a | `outputFormats` | Array of formats: 'json', 'sqlite', 'csv' |
| n/a | `metrics` | Boolean to enable detailed metrics (default: true) |
| `timeout` | `timeout` | Task timeout in seconds |
| `logLevel` | `logLevel` | Log level ('debug', 'info', 'warn', 'error') |
| n/a | `logToFile` | Boolean to enable logging to file |

## Result Object Differences

### Old Result Format

```javascript
{
  benchmark_id: 'abc123',
  status: 'success',
  duration: 12.5,
  tasks: [...],
  results: [...],
  metrics: {
    executionTime: 12.5,
    taskCount: 5,
    successRate: 1.0
  }
}
```

### New Result Format

```javascript
{
  benchmarkId: 'abc123',
  status: 'success',
  summary: 'Completed 5 tasks',
  duration: 12.5,
  metrics: {
    executionTime: 12.5,
    tasksPerSecond: 0.4,
    successRate: 1.0,
    peakMemoryMb: 256,
    avgCpuPercent: 15.2
  },
  results: [...],
  outputFiles: {
    json: '/path/to/report.json',
    sqlite: '/path/to/report.db',
    csv: '/path/to/report.csv'
  }
}
```

## CLI Usage Changes

### Old CLI

```bash
node benchmark/bin/run-benchmark.js --mode development --agents 3 "Build a REST API"
```

### New CLI

```bash
# Standalone CLI
node benchmark/bin/benchmark-cli.js run "Build a REST API" --strategy development --max-agents 3

# Via npm script
npm run benchmark -- run "Build a REST API" --strategy development --max-agents 3
```

## Using the Plugin System

The new benchmark system includes a plugin system for extending functionality:

```javascript
import { EnginePlugin, UnifiedBenchmarkEngine, BenchmarkConfig } from './benchmark/dist/index.js';

// Create custom plugin
class CustomPlugin extends EnginePlugin {
  async preBenchmark(benchmark) {
    console.log('Starting benchmark:', benchmark.name);
  }
  
  async postBenchmark(benchmark) {
    console.log('Benchmark completed in', benchmark.duration(), 'seconds');
    console.log('Success rate:', benchmark.metrics.successRate);
  }
  
  async preTask(task) {
    console.log('Starting task:', task.objective);
  }
  
  async postTask(task, result) {
    console.log('Task completed in', result.performanceMetrics.executionTime, 'seconds');
    return result;
  }
}

// Create engine with plugin
const config = new BenchmarkConfig();
const engine = new UnifiedBenchmarkEngine(config);
engine.add_plugin(new CustomPlugin());

// Run benchmark
const result = await engine.run_benchmark('Test benchmark with plugins');
```

## Migration Checklist

1. Update imports to use the new API
2. Map old parameters to new parameter names
3. Update result handling to use the new result format
4. Consider using the plugin system for custom functionality
5. Update any CLI usage to the new format
