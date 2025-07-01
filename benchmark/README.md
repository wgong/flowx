# Claude-Flow Benchmark System

A comprehensive, modern benchmarking system for claude-flow swarm operations with robust metrics collection, parallel execution, and extensible architecture. This system replaces the previous fragmented implementation with a clean, well-organized TypeScript codebase.

## Features

- **Unified Architecture**: Single benchmark engine with pluggable components
- **Real-Time Metrics**: Detailed performance and resource usage tracking
- **Parallel Execution**: Efficient multi-agent and multi-task benchmarking
- **Multiple Output Formats**: JSON, SQLite, and CSV reporting
- **Robust Error Handling**: Comprehensive error tracking and reporting
- **CLI Interface**: Easy command-line usage
- **Integration API**: Seamless integration with claude-flow
- **TypeScript Support**: Full TypeScript integration with proper types

## Installation

```bash
# From the claude-flow root directory
cd benchmark
npm install
npm run build
```

## Usage

### Command Line via Claude-Flow

```bash
# Run a simple benchmark
npx claude-flow benchmark run "Build a REST API" --strategy development

# Run with detailed options
npx claude-flow benchmark run "Research microservices architecture" \
  --strategy research \
  --mode distributed \
  --parallel \
  --output json,sqlite \
  --output-dir ./benchmark-results

# Run an example benchmark
npx claude-flow benchmark example

# Run the benchmark system self-test
npx claude-flow benchmark test
```

### Standalone Command Line

```bash
# Run a benchmark directly
node benchmark/bin/benchmark-cli.js run "Build a REST API" --strategy development

# Run the benchmark system self-test
node benchmark/bin/benchmark-cli.js test
```

### JavaScript/TypeScript API

```javascript
import { runBenchmark } from './benchmark/src/index.ts';

async function main() {
  const result = await runBenchmark({
    objective: 'Build a simple REST API with Express',
    strategy: 'development',
    mode: 'centralized',
    maxAgents: 3,
    parallel: true,
    outputFormats: ['json', 'sqlite'],
    outputDirectory: './benchmark-reports'
  });
  
  console.log(`Benchmark completed: ${result.status}`);
  console.log(`Duration: ${result.duration.toFixed(2)}s`);
  console.log(`Peak Memory: ${result.metrics.peakMemoryMb.toFixed(2)} MB`);
}

main().catch(console.error);
```

## Directory Structure

```
benchmark/
├── src/                        # TypeScript source code
│   ├── api.ts                  # Public API
│   ├── index.ts                # Main entry point
│   └── swarm_benchmark/        # Core benchmark system
│       ├── core/               # Core functionality
│       │   ├── benchmark_engine.ts # Unified benchmark engine
│       │   ├── models.ts       # Data models
│       │   └── plugins.ts      # Plugin system
│       ├── strategies/         # Task execution strategies
│       ├── metrics/            # Metrics collection
│       ├── output/             # Output formatting
│       ├── utils/              # Utilities
│       └── plugins/            # Plugin implementations
├── bin/                        # CLI tools
├── examples/                   # Example usage
├── tests/                      # Tests
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── reports/                    # Default location for benchmark reports
├── simple-benchmark.js         # Simplified JavaScript implementation
└── package.json                # Dependencies and scripts
```

## Benchmark Options

| Option | Description | Default |
|--------|-------------|---------|
| `objective` | Main benchmark objective | (required) |
| `strategy` | Swarm strategy to use | `auto` |
| `mode` | Coordination mode | `centralized` |
| `maxAgents` | Maximum number of agents | `3` |
| `parallel` | Enable parallel execution | `false` |
| `optimized` | Enable performance optimizations | `true` |
| `metrics` | Collect detailed metrics | `true` |
| `outputFormats` | Output formats (`json`, `sqlite`, `csv`) | `['json']` |
| `outputDirectory` | Directory for benchmark reports | `./benchmark-reports` |
| `timeout` | Task timeout in seconds | `300` |
| `logLevel` | Log level (`debug`, `info`, `warn`, `error`) | `info` |
| `logToFile` | Log to file | `false` |

## Available Strategies

The benchmark system supports the following swarm strategies:

- **Auto**: Automatically select the best strategy
- **Research**: Information gathering and analysis
- **Development**: Software development tasks
- **Analysis**: Code and data analysis
- **Testing**: Quality assurance workflows
- **Optimization**: Performance improvements
- **Maintenance**: System maintenance tasks

## Coordination Modes

The benchmark system supports the following coordination modes:

- **Centralized**: Single coordinator (default)
- **Distributed**: Multiple coordinators
- **Hierarchical**: Tree structure
- **Mesh**: Peer-to-peer
- **Hybrid**: Mixed patterns

## Plugin System

You can extend the benchmark system with custom plugins:

```javascript
import { UnifiedBenchmarkEngine, EnginePlugin } from './benchmark/src/index.ts';

// Create custom plugin
class CustomPlugin extends EnginePlugin {
  async preBenchmark(benchmark) {
    console.log('Starting benchmark:', benchmark.name);
  }
  
  async postBenchmark(benchmark) {
    console.log('Benchmark completed:', benchmark.name);
    console.log('Duration:', benchmark.duration());
  }
}

// Create engine with custom plugin
const config = new BenchmarkConfig();
const engine = new UnifiedBenchmarkEngine(config);
engine.add_plugin(new CustomPlugin());

// Run benchmark
const result = await engine.run_benchmark('Test objective');
```

## Running Examples

The repository includes example scripts:

```bash
# Run the basic example
npm run example:basic

# Run the advanced example
npm run example:advanced

# Run the plugin example
npm run example:plugin

# Run the test example
npm run example:test
```

## Contributing

Contributions are welcome! Please make sure tests pass before submitting pull requests.

## License

This project is licensed under the MIT License.