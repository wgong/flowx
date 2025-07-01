# Plugin Development Guide

This guide explains how to create custom plugins for the benchmark system.

## Plugin System Overview

The benchmark system uses a plugin architecture that allows for extending functionality without modifying the core engine. Plugins can hook into the benchmark lifecycle at different points:

- Before benchmark execution
- After benchmark execution
- Before task execution
- After task execution

Plugins can be used for various purposes, such as:

- Performance optimization
- Metrics collection
- Logging and monitoring
- Custom result processing
- Integration with external systems

## Creating a Custom Plugin

### Basic Plugin Structure

All plugins must extend the `EnginePlugin` base class and implement one or more of the lifecycle hook methods:

```javascript
const { EnginePlugin } = require('claude-flow-benchmark');

class MyCustomPlugin extends EnginePlugin {
  // Constructor for initialization
  constructor(options = {}) {
    super();
    this.options = options;
  }
  
  // Called before benchmark execution
  async preBenchmark(benchmark) {
    // Access and potentially modify the benchmark object
    console.log(`Starting benchmark: ${benchmark.name}`);
    
    // You can add custom metadata
    benchmark.metadata.myPlugin = {
      enabled: true,
      startTime: Date.now()
    };
  }
  
  // Called after benchmark execution
  async postBenchmark(benchmark) {
    // Access benchmark results
    console.log(`Benchmark completed: ${benchmark.status}`);
    
    // Update metadata
    benchmark.metadata.myPlugin.endTime = Date.now();
    benchmark.metadata.myPlugin.duration = 
      benchmark.metadata.myPlugin.endTime - benchmark.metadata.myPlugin.startTime;
  }
  
  // Called before task execution
  async preTask(task) {
    // Access and potentially modify the task
    console.log(`Starting task: ${task.id}`);
    task.parameters.customParam = 'Added by plugin';
  }
  
  // Called after task execution with the result
  async postTask(task, result) {
    // Process the task result
    console.log(`Task completed: ${task.id} with status ${result.status}`);
    
    // You can modify the result before it's returned
    if (!result.metadata) result.metadata = {};
    result.metadata.processedByPlugin = true;
    
    return result;
  }
}
```

### Plugin Configuration

Plugins can be configured through their constructor:

```javascript
const plugin = new MyCustomPlugin({
  enableFeatureX: true,
  logLevel: 'debug',
  maxRetries: 3
});
```

### Using Your Custom Plugin

To use your custom plugin, add it to the plugins array when running a benchmark:

```javascript
const { runBenchmark } = require('claude-flow-benchmark');

// Create your plugins
const myPlugin = new MyCustomPlugin({ enableFeatureX: true });
const anotherPlugin = new AnotherPlugin();

// Run benchmark with plugins
const result = await runBenchmark({
  objective: "Test objective with custom plugins",
  strategy: "development",
  // Other options...
  plugins: [myPlugin, anotherPlugin]
});
```

## Plugin Examples

### Logging Plugin

A plugin that logs benchmark and task execution:

```javascript
class LoggingPlugin extends EnginePlugin {
  constructor(options = {}) {
    super();
    this.logPrefix = options.prefix || '[Benchmark]';
    this.verbose = options.verbose || false;
  }
  
  async preBenchmark(benchmark) {
    console.log(`${this.logPrefix} Starting benchmark: ${benchmark.name}`);
    console.log(`${this.logPrefix} Objective: ${benchmark.tasks[0]?.objective}`);
  }
  
  async postBenchmark(benchmark) {
    console.log(`${this.logPrefix} Benchmark complete: ${benchmark.name}`);
    console.log(`${this.logPrefix} Status: ${benchmark.status}`);
    console.log(`${this.logPrefix} Results: ${benchmark.results.length}`);
    
    if (this.verbose) {
      console.log(`${this.logPrefix} Error count: ${benchmark.errorLog.length}`);
      console.log(`${this.logPrefix} Duration: ${benchmark.duration()}s`);
    }
  }
  
  async preTask(task) {
    console.log(`${this.logPrefix} Starting task: ${task.id}`);
    if (this.verbose) {
      console.log(`${this.logPrefix} Objective: ${task.objective}`);
      console.log(`${this.logPrefix} Strategy: ${task.strategy}`);
    }
  }
  
  async postTask(task, result) {
    console.log(`${this.logPrefix} Task complete: ${task.id}`);
    console.log(`${this.logPrefix} Status: ${result.status}`);
    
    if (this.verbose && result.errors && result.errors.length > 0) {
      console.log(`${this.logPrefix} Errors: ${result.errors.length}`);
    }
    
    return result;
  }
}
```

### Timing Plugin

A plugin that measures execution time for benchmarks and tasks:

```javascript
class TimingPlugin extends EnginePlugin {
  constructor() {
    super();
    this.benchmarkStart = null;
    this.taskTimings = new Map();
  }
  
  async preBenchmark(benchmark) {
    this.benchmarkStart = process.hrtime.bigint();
    benchmark.metadata.timing = { started: true };
  }
  
  async postBenchmark(benchmark) {
    const end = process.hrtime.bigint();
    const durationNs = end - this.benchmarkStart;
    const durationMs = Number(durationNs) / 1_000_000;
    
    benchmark.metadata.timing = {
      ...benchmark.metadata.timing,
      durationMs,
      taskTimings: Object.fromEntries(this.taskTimings)
    };
  }
  
  async preTask(task) {
    this.taskTimings.set(task.id, {
      startTime: process.hrtime.bigint()
    });
  }
  
  async postTask(task, result) {
    const taskTiming = this.taskTimings.get(task.id);
    if (taskTiming) {
      const end = process.hrtime.bigint();
      const durationNs = end - taskTiming.startTime;
      const durationMs = Number(durationNs) / 1_000_000;
      
      this.taskTimings.set(task.id, {
        ...taskTiming,
        endTime: end,
        durationNs,
        durationMs
      });
      
      if (!result.metadata) result.metadata = {};
      result.metadata.executionTimeMs = durationMs;
    }
    
    return result;
  }
}
```

### Retry Plugin

A plugin that automatically retries failed tasks:

```javascript
class RetryPlugin extends EnginePlugin {
  constructor(options = {}) {
    super();
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // ms
    this.retriesPerTask = new Map();
  }
  
  async preBenchmark(benchmark) {
    benchmark.metadata.retryPlugin = {
      enabled: true,
      maxRetries: this.maxRetries
    };
  }
  
  async postBenchmark(benchmark) {
    benchmark.metadata.retryPlugin.totalRetries = 
      Array.from(this.retriesPerTask.values())
        .reduce((sum, retries) => sum + retries, 0);
  }
  
  async preTask(task) {
    this.retriesPerTask.set(task.id, 0);
  }
  
  async postTask(task, result) {
    // If task failed and we haven't reached max retries
    if (result.status === 'error' && 
        this.retriesPerTask.get(task.id) < this.maxRetries) {
      
      // Increment retry count
      const currentRetries = this.retriesPerTask.get(task.id);
      this.retriesPerTask.set(task.id, currentRetries + 1);
      
      // Log retry attempt
      console.log(`Retrying task ${task.id}, attempt ${currentRetries + 1} of ${this.maxRetries}`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      // Re-execute the task (we need access to the engine here)
      // This is a simplified example - in reality, you'd need to coordinate with the engine
      if (task._engine && typeof task._engine._executeTask === 'function') {
        return await task._engine._executeTask(task);
      }
    }
    
    return result;
  }
}
```

## Plugin Best Practices

1. **Keep plugins focused**: Each plugin should have a single responsibility.
2. **Handle errors gracefully**: Don't let plugin errors crash the benchmark.
3. **Document your plugins**: Provide clear documentation on what your plugin does and how to configure it.
4. **Respect the plugin lifecycle**: Understand when each hook is called and what it should be used for.
5. **Avoid modifying core data**: Be careful when modifying benchmark or task objects.
6. **Use metadata for custom data**: Store plugin-specific data in the metadata objects.
7. **Make plugins configurable**: Allow users to customize plugin behavior through constructor options.
8. **Test your plugins**: Write tests to ensure your plugins work correctly.

## Plugin Limitations

1. Plugins cannot directly interact with each other
2. The order of plugin execution is not guaranteed
3. Plugins cannot modify the core engine behavior
4. Plugins should be idempotent (calling them multiple times should be safe)

## Debugging Plugins

To debug your plugins, you can use console logging or add special debug options:

```javascript
class DebuggablePlugin extends EnginePlugin {
  constructor(options = {}) {
    super();
    this.debug = options.debug || false;
  }
  
  debugLog(...args) {
    if (this.debug) {
      console.log('[DEBUG]', ...args);
    }
  }
  
  async preBenchmark(benchmark) {
    this.debugLog('preBenchmark called', benchmark.id);
    // Plugin logic...
  }
  
  // Other methods...
}

const plugin = new DebuggablePlugin({ debug: true });
```