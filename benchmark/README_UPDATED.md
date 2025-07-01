# Claude-Flow Benchmark System

A streamlined benchmark system for measuring and analyzing claude-flow operations.

## Quick Start

```bash
# Run a simple benchmark
npm run benchmark

# Run the example with plugins
npm run benchmark:example

# Get information about registering with claude-flow
npm run benchmark:register
```

## What Works Now

The benchmark system has been simplified to a JavaScript implementation that works out-of-the-box. It includes:

1. **Core Benchmark System**: A working JavaScript implementation in `simple-benchmark.js`
2. **Plugin System**: Support for custom plugins that can hook into the benchmark lifecycle
3. **CLI Integration**: Scripts to integrate the benchmark system with claude-flow
4. **Output Formats**: JSON, CSV, and SQLite file generation
5. **Example Scripts**: Ready-to-run examples showing the benchmark system in action

## Directory Structure

```
benchmark/
├── simple-benchmark.js         # Main benchmark system implementation
├── examples/                   # Example usage
│   └── simple-example.js       # Example with plugins
├── scripts/                    # Integration scripts
│   └── register-simple.js      # Script to register with claude-flow
├── src/                        # TypeScript implementation (WIP)
└── docs/                       # Documentation
```

## Using the Benchmark System

### Running a benchmark

```javascript
const { runBenchmark } = require('./benchmark/simple-benchmark');

// Run a benchmark
const result = await runBenchmark({
  objective: 'Build a REST API',
  strategy: 'development',
  mode: 'centralized',
  parallel: true,
  outputFormats: ['json', 'csv']
});

console.log(`Benchmark completed in ${result.duration}s`);
```

### Using plugins

```javascript
const { runBenchmark, BenchmarkPlugin } = require('./benchmark/simple-benchmark');

// Create a custom plugin
class CustomPlugin extends BenchmarkPlugin {
  constructor() {
    super('My Custom Plugin');
  }
  
  async run(options) {
    console.log(`Running custom plugin for: ${options.objective}`);
    // Plugin implementation...
  }
}

// Run benchmark with plugin
const result = await runBenchmark({
  objective: 'Test custom plugin',
  plugins: [new CustomPlugin()]
});
```

## Integrating with Claude-Flow

The benchmark system can be integrated with claude-flow either through the built-in command or by registering the simplified benchmark system.

### Using the built-in command

```bash
# Run a benchmark
./claude-flow benchmark run "Build a REST API" --strategy development --parallel

# Run an example benchmark
./claude-flow benchmark example
```

### Using the registration script

```javascript
// In your claude-flow application
const { registerSimpleBenchmarkCommands } = require('./benchmark/scripts/register-simple');
registerSimpleBenchmarkCommands(app.commandRegistry);
```

## Future Improvements

The benchmark system is still being developed. Future improvements will include:

1. Complete TypeScript implementation
2. More sophisticated metrics collection
3. Real-time performance monitoring
4. Enhanced plugin system
5. Integration with external monitoring tools
6. Support for distributed benchmarking

## Contributing

Contributions are welcome! If you'd like to improve the benchmark system, please:

1. Check the TypeScript implementation in `src/` to see what's missing
2. Fix TypeScript errors and implement missing functionality
3. Add new plugins and metrics collectors
4. Improve documentation and examples