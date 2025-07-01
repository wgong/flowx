# Benchmark System Architecture

This document describes the architecture of the refactored benchmark system for claude-flow.

## Overview

The benchmark system is designed to measure and analyze the performance of claude-flow operations. It provides a unified architecture with a plugin system that allows for extensibility and customization. The system collects detailed metrics, handles errors robustly, and supports multiple output formats.

## Key Components

### Core Components

#### Benchmark Engine

The `UnifiedBenchmarkEngine` is the central component of the benchmark system. It manages the execution of benchmark tasks, coordinates plugins, and handles results. The engine provides a unified interface that replaces the previous three separate engines (standard, optimized, and real).

Key features:
- Plugin architecture with pre/post hooks
- Task execution management
- Parallel execution support
- Error handling and recovery
- Result collection and formatting

#### Plugin System

The plugin system allows for extending the benchmark functionality without modifying the core engine. Plugins can hook into the benchmark lifecycle at different points:

- `preBenchmark`: Called before benchmark execution
- `postBenchmark`: Called after benchmark execution
- `preTask`: Called before task execution
- `postTask`: Called after task execution with the result

Built-in plugins:
- `OptimizationPlugin`: Provides performance optimizations and caching
- `MetricsCollectionPlugin`: Collects detailed performance metrics

#### Models

The system uses a set of data models to represent benchmark components:

- `Benchmark`: Represents a complete benchmark operation
- `Task`: Represents a single task within a benchmark
- `Result`: Contains the result of a task execution
- `BenchmarkConfig`: Configuration options for the benchmark engine

#### Strategies

Strategies implement different approaches to executing benchmark tasks:

- `AutoStrategy`: Automatically selects the best strategy
- `DevelopmentStrategy`: Optimized for development tasks
- `ResearchStrategy`: Designed for research operations
- `TestingStrategy`: Focused on test execution
- `OptimizationStrategy`: Specialized for optimization tasks
- `AnalysisStrategy`: Designed for analyzing code and data

### Supporting Components

#### Metrics Collection

The metrics collection system captures performance data during benchmark execution:

- System metrics (CPU, memory, disk I/O)
- Process metrics (execution time, resource usage)
- Custom metrics for specific tasks

#### Output Management

The output manager handles saving benchmark results in different formats:

- JSON: Standard human-readable format
- SQLite: Database storage for advanced querying
- CSV: For integration with spreadsheets and data tools

#### Error Handling

The error handling framework provides a robust system for tracking and reporting errors:

- Error context tracking
- Hierarchical error classes
- Recovery mechanisms
- Detailed error reporting

## Integration Points

The benchmark system integrates with claude-flow through several interfaces:

### JavaScript/TypeScript API

The API provides a clean interface for running benchmarks from JavaScript/TypeScript code:

```javascript
const { runBenchmark } = require('claude-flow-benchmark');

const result = await runBenchmark({
  objective: "Test objective",
  strategy: "development",
  // other options...
});
```

### Command Line Interface

The benchmark system can be used via the claude-flow CLI:

```bash
./claude-flow benchmark run "Test objective" --strategy development --parallel
```

### MCP Integration

The benchmark system integrates with the claude-flow MCP through registered tools:

```javascript
// Example MCP tool usage
await mcp.runTool('runBenchmark', {
  objective: "Test objective",
  strategy: "development"
});
```

## Data Flow

1. User initiates a benchmark through the API, CLI, or MCP
2. The benchmark engine creates a benchmark instance with the specified configuration
3. Plugins are initialized and their `preBenchmark` hooks are called
4. Tasks are created and executed using the specified strategy
   - For each task, `preTask` hooks are called
   - The task is executed by the appropriate strategy
   - `postTask` hooks are called with the result
5. Results are collected and aggregated
6. `postBenchmark` hooks are called
7. Results are saved using the output manager
8. The final benchmark report is returned to the user

## Directory Structure

```
benchmark/
├── src/                  # Source code
│   ├── bin/              # CLI scripts
│   └── swarm_benchmark/  # Main package
│       ├── core/         # Core engine and models
│       ├── plugins/      # Plugin implementations
│       ├── metrics/      # Metrics collection
│       ├── output/       # Output handling
│       ├── utils/        # Utilities
│       └── cli/          # CLI implementation
├── dist/                 # Compiled TypeScript code
├── examples/             # Example usage
├── tests/                # Test suite
├── docs/                 # Documentation
├── reports/              # Sample benchmark reports
└── integration/          # Claude-flow integration
```

## Future Extensions

The benchmark system is designed to be extensible. Some potential future extensions include:

1. Additional plugins for specific benchmark scenarios
2. More output formats (e.g., HTML reports, Prometheus metrics)
3. Real-time monitoring and visualization
4. Distributed benchmarking across multiple machines
5. Benchmark history tracking and comparison
6. Integration with external monitoring systems

## Best Practices

When working with the benchmark system:

1. Use plugins to extend functionality rather than modifying the core engine
2. Create custom plugins for specific benchmark requirements
3. Use appropriate strategies for different types of tasks
4. Enable metrics collection for detailed performance analysis
5. Choose output formats based on how you plan to analyze the results
6. Set appropriate timeouts for long-running benchmarks