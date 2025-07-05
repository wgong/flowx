# Claude-Flow Testing Framework

## Overview

This document provides a comprehensive guide to the Claude-Flow testing framework. It covers the architecture, test categories, usage patterns, and migration from Deno to Node.js/Jest.

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Test Categories](#test-categories)
3. [Running Tests](#running-tests)
4. [Test Utilities](#test-utilities)
5. [Mocking Strategy](#mocking-strategy)
6. [Node.js Migration](#nodejs-migration)
7. [Common Testing Patterns](#common-testing-patterns)
8. [Swarm and Coordination Testing](#swarm-and-coordination-testing)
9. [CLI and Command Testing](#cli-and-command-testing)
10. [Memory System Testing](#memory-system-testing)
11. [Troubleshooting](#troubleshooting)

## Testing Architecture

The Claude-Flow testing framework is built on Jest and follows a multi-layered approach:

```
tests/
├── unit/             # Unit tests for individual components
├── integration/      # Integration tests for component interactions
├── performance/      # Performance and load testing
├── e2e/              # End-to-end system tests
├── __mocks__/        # Mock implementations
└── utils/            # Testing utilities
```

### Key Design Principles

1. **Isolation**: Unit tests should test components in isolation with mocked dependencies
2. **Comprehensive Coverage**: Cover all critical paths and edge cases
3. **Performance Testing**: Ensure system performs well under load
4. **Test Independence**: Tests should not depend on each other's state
5. **Consistent Patterns**: Use consistent patterns across all tests

## Test Categories

### Unit Tests

Unit tests focus on testing individual components in isolation. They should be:

- Fast to execute
- Independent of external systems
- Comprehensive in covering edge cases

Example:
```typescript
describe('SwarmCoordinator', () => {
  it('should register agents correctly', async () => {
    const coordinator = new SwarmCoordinator();
    const agentId = await coordinator.registerAgent('test', 'researcher');
    expect(coordinator.getAgent(agentId)).toBeDefined();
  });
});
```

### Integration Tests

Integration tests verify that multiple components work correctly together:

- Test communication between components
- Validate complex workflows
- Focus on component interactions

Example:
```typescript
describe('Memory and Swarm Integration', () => {
  it('should store and retrieve swarm results in memory', async () => {
    const memory = new MemoryManager();
    const swarm = new SwarmCoordinator({ memoryManager: memory });
    await swarm.executeTask('test-task');
    const result = await memory.retrieve('test-task-result');
    expect(result).toBeDefined();
  });
});
```

### Performance Tests

Performance tests evaluate system behavior under load:

- Response time under various loads
- Resource utilization patterns
- System stability during stress testing

Example:
```typescript
describe('Performance Testing', () => {
  it('should maintain performance under load', async () => {
    const { stats } = await PerformanceTestUtils.benchmark(
      async () => {
        // Test operation
        return process(dataset);
      },
      { iterations: 100, concurrency: 10 }
    );
    
    expect(stats.mean).toBeLessThan(50); // Under 50ms
  });
});
```

### End-to-End Tests

End-to-end tests verify the entire system behaves correctly:

- Test the system as a black box
- Simulate real user scenarios
- Test integrations with external systems

Example:
```typescript
describe('End-to-End Workflow', () => {
  it('should execute a complete workflow', async () => {
    const cli = new CLITestRunner();
    const result = await cli.runCommand(['workflow', 'execute', 'test-workflow.json']);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Workflow completed successfully');
  });
});
```

## Running Tests

### Basic Commands

Run all tests:
```bash
npm test
```

Run specific tests:
```bash
npm test -- <test-file-or-pattern>
```

Run tests with coverage:
```bash
npm test -- --coverage
```

### Common Test Patterns

Individual test files:
```bash
npm test -- tests/unit/swarm/swarm-core.test.ts
```

Test categories:
```bash
npm test -- tests/unit
```

Multiple test patterns:
```bash
npm test -- tests/unit/swarm tests/unit/cli
```

## Test Utilities

The testing framework provides several utilities to simplify test creation:

### Node.js Compatible Test Utilities

Located in `tests/utils/`:

- `node-test-utils.ts`: Core testing functions compatible with Jest
- `node-data-generator.ts`: Test data generation utilities
- `node-async-utils.ts`: Async testing utilities
- `node-memory-utils.ts`: Memory testing utilities
- `node-filesystem-utils.ts`: Filesystem testing utilities
- `node-performance-utils.ts`: Performance testing utilities
- `node-test-assertions.ts`: Additional test assertions beyond Jest's

### Data Generation

The `TestDataGenerator` class provides utilities for generating test data:

```typescript
import { TestDataGenerator } from '../utils/node-data-generator';

// Generate random test data
const randomString = TestDataGenerator.randomString(10);
const randomNumber = TestDataGenerator.randomNumber(1, 100);
const randomArray = TestDataGenerator.randomArray(() => TestDataGenerator.randomString(5), 10);
```

### Assertions

Additional assertions beyond Jest's standard assertions:

```typescript
import { TestAssertions } from '../utils/node-test-assertions';

// Assert a value is within a range
TestAssertions.assertInRange(value, min, max);

// Assert an operation completes within a time limit
await TestAssertions.assertCompletesWithin(async () => {
  // Operation to test
}, 1000); // 1 second timeout
```

## Mocking Strategy

### Mock Implementations

The testing framework provides several mock implementations:

- `SwarmMock`: Mock implementation of swarm functionality
- `MemoryMock`: Mock implementation of memory system
- `WorkflowMock`: Mock implementation of workflow engine

Example:
```typescript
import { SwarmMock } from '../../__mocks__/swarm-mock';

describe('Swarm Testing', () => {
  it('should create a swarm', () => {
    const swarm = new SwarmMock();
    const swarmId = swarm.createSwarm('test-swarm');
    expect(swarm.getSwarm(swarmId)).toBeDefined();
  });
});
```

### Deno Modules

Deno modules are mocked using module mapping in Jest configuration:

```javascript
// jest.config.js
moduleNameMapper: {
  '^(\\.\\.?/.*)\\.js$': '$1',
  '^(\\.\\.?/.*)\\.cjs$': '$1',
  '^https://deno.land/std@0\\.\\d+\\.\\d+/(.*)$': '<rootDir>/tests/__mocks__/deno_modules.js',
},
```

## Node.js Migration

See [MIGRATION.md](MIGRATION.md) for details on the Deno to Node.js migration.

### Key Migration Patterns

1. **Replace Deno Imports**:
   ```typescript
   // Before (Deno)
   import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
   
   // After (Node.js)
   import { assertEquals } from '../utils/node-test-utils';
   ```

2. **Replace File System Operations**:
   ```typescript
   // Before (Deno)
   await Deno.writeTextFile(filePath, content);
   
   // After (Node.js)
   import * as fs from 'fs/promises';
   await fs.writeFile(filePath, content);
   ```

3. **Update Test Structure**:
   ```typescript
   // Before (Deno)
   import { describe, it } from "https://deno.land/std@0.220.0/testing/bdd.ts";
   
   // After (Node.js)
   import { describe, it } from '../utils/node-test-utils';
   ```

## Common Testing Patterns

### Setup and Teardown

```typescript
describe('Test Suite', () => {
  let testContext;
  
  beforeEach(() => {
    testContext = createTestContext();
  });
  
  afterEach(() => {
    cleanupTestContext(testContext);
  });
  
  it('should test something', () => {
    // Test using testContext
  });
});
```

### Temporary Files and Directories

```typescript
import { FileSystemTestUtils } from '../utils/node-filesystem-utils';

describe('File Operations', () => {
  let tempDir;
  
  beforeEach(async () => {
    tempDir = await FileSystemTestUtils.createTempDir();
  });
  
  afterEach(async () => {
    await FileSystemTestUtils.cleanup([tempDir]);
  });
  
  it('should create a file', async () => {
    const filePath = path.join(tempDir, 'test.txt');
    await fs.writeFile(filePath, 'test content');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('test content');
  });
});
```

### Mocking External Services

```typescript
describe('External Service Integration', () => {
  let originalFetch;
  
  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success' }),
    });
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
  });
  
  it('should call external service', async () => {
    const result = await callExternalService();
    expect(result).toEqual({ result: 'success' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
```

### Parameterized Tests

```typescript
it.each([
  [1, 1, 2],
  [2, 2, 4],
  [3, 4, 7],
])('should add %i + %i to get %i', (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**:
   - Ensure imports use the correct format for Jest/Node.js
   - Check moduleNameMapper in jest.config.js

2. **ESM Compatibility**:
   - Use `.js` extension in import statements
   - Configure tsconfig and jest.config properly for ESM

3. **Test Timeouts**:
   - Increase Jest timeout using `jest.setTimeout(ms)`
   - Break down long-running tests into smaller parts

4. **Memory Issues**:
   - Reduce test data set sizes
   - Clean up resources in afterEach/afterAll hooks

### Performance Considerations

- Use smaller data sets for performance tests in Node.js
- Relax timing constraints compared to Deno
- Be careful with memory usage in Node.js

### Environment Differences

Key differences between Deno and Node.js environments:

1. **File System Operations**: Different APIs
2. **Performance Characteristics**: Different runtime performance
3. **Module Resolution**: Different module systems
4. **Memory Management**: Different approaches and limits

## Swarm and Coordination Testing

The Swarm and Coordination components require specific testing approaches:

### Testing the UnifiedSwarmCoordinator

The `UnifiedSwarmCoordinator` combines production-ready agent integration with a comprehensive strategy system. Testing this component requires:

- Mocking agent processes
- Testing event emission and handling
- Verifying task distribution and execution
- Validating objective decomposition and completion

```typescript
describe('UnifiedSwarmCoordinator', () => {
  let coordinator;
  let mockAgentManager;
  
  beforeEach(() => {
    mockAgentManager = new MockAgentProcessManager();
    coordinator = new UnifiedSwarmCoordinator({
      agentProcessManager: mockAgentManager,
      enableMonitoring: false
    });
  });
  
  it('should initialize successfully', async () => {
    await coordinator.initialize();
    expect(coordinator.isRunningSwarm()).toBe(true);
  });
  
  it('should create and execute objectives', async () => {
    await coordinator.initialize();
    const objectiveId = await coordinator.createObjective('Test', 'Test description');
    await coordinator.executeObjective(objectiveId);
    
    const objective = coordinator.getObjective(objectiveId);
    expect(objective.status).toBe('executing');
  });
});
```

### Swarm Strategies Testing

Strategies control how tasks are decomposed and executed. Testing strategies requires:

- Verifying strategy selection logic
- Testing task decomposition
- Validating agent selection
- Measuring strategy effectiveness

```typescript
describe('AutoStrategy', () => {
  it('should decompose objectives into appropriate tasks', async () => {
    const strategy = new AutoStrategy();
    const objective = createTestObjective('Build a feature');
    
    const tasks = await strategy.decompose(objective);
    
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some(t => t.type === 'research')).toBe(true);
    expect(tasks.some(t => t.type === 'implementation')).toBe(true);
  });
});
```

## CLI and Command Testing

CLI and command tests verify the command-line interface functionality:

### Command Registry Testing

```typescript
describe('CommandRegistry', () => {
  let registry;
  
  beforeEach(() => {
    registry = new CommandRegistry();
  });
  
  it('should register and retrieve commands', () => {
    const command = {
      name: 'test',
      description: 'Test command',
      execute: jest.fn()
    };
    
    registry.register(command);
    const retrieved = registry.get('test');
    
    expect(retrieved).toBe(command);
  });
});
```

### System Monitor Testing

```typescript
describe('SystemMonitor', () => {
  let processManager;
  let monitor;
  
  beforeEach(() => {
    processManager = new MockProcessManager();
    monitor = new SystemMonitor(processManager, 100); // Short interval for testing
    
    // Add test processes
    processManager.addProcess('mcp-1', ProcessType.MCP);
    processManager.addProcess('agent-1', ProcessType.AGENT);
  });
  
  it('should collect metrics on processes', () => {
    monitor.start();
    
    const metrics = monitor.getLatestMetrics();
    expect(metrics.processes.total).toBe(2);
    expect(metrics.processes.byType.mcp).toBe(1);
    expect(metrics.processes.byType.agent).toBe(1);
  });
});
```

## Memory System Testing

Memory tests verify the persistence and retrieval functionality:

### Memory Manager Testing

```typescript
describe('MemoryManager', () => {
  let memory;
  
  beforeEach(async () => {
    memory = new MemoryManager({
      backend: 'memory', // In-memory backend for testing
      namespace: 'test'
    });
    await memory.initialize();
  });
  
  afterEach(async () => {
    await memory.clear();
  });
  
  it('should store and retrieve data', async () => {
    const testData = { id: 'test-item', content: 'test content' };
    
    await memory.store(testData);
    const retrieved = await memory.retrieve('test-item');
    
    expect(retrieved).toEqual(testData);
  });
  
  it('should handle search queries', async () => {
    await memory.store({ id: 'item1', tags: ['tag1'] });
    await memory.store({ id: 'item2', tags: ['tag2'] });
    
    const results = await memory.search({ tags: ['tag1'] });
    
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('item1');
  });
});
```

### Memory Backends Testing

```typescript
describe('SQLiteMemoryBackend', () => {
  let backend;
  let dbPath;
  
  beforeEach(async () => {
    dbPath = await FileSystemTestUtils.createTempFile('.db');
    backend = new SQLiteMemoryBackend({ path: dbPath });
    await backend.initialize();
  });
  
  afterEach(async () => {
    await backend.close();
    await FileSystemTestUtils.cleanup([dbPath]);
  });
  
  it('should persist data across instances', async () => {
    const testData = { id: 'persist-test', content: 'persisted content' };
    
    // Store in first instance
    await backend.store(testData);
    await backend.close();
    
    // Create new instance with same file
    const newBackend = new SQLiteMemoryBackend({ path: dbPath });
    await newBackend.initialize();
    
    // Data should still be there
    const retrieved = await newBackend.retrieve('persist-test');
    expect(retrieved).toEqual(testData);
    
    await newBackend.close();
  });
});
```

## Best Practices for Test Development

### Writing Maintainable Tests

1. **One assertion per test**: Focus each test on verifying one specific behavior
2. **Descriptive test names**: Use clear naming that describes the expected behavior
3. **Avoid test interdependence**: Tests should be able to run in any order
4. **Clean up after tests**: Use afterEach/afterAll to ensure proper cleanup
5. **Consistent patterns**: Follow established patterns across the codebase

### Testing Complex Systems

1. **Mock external dependencies**: Use mocks to isolate the component under test
2. **Test boundary conditions**: Focus on edge cases and error handling
3. **Use test fixtures**: Create reusable test fixtures to minimize setup code
4. **Test asynchronous behavior**: Use proper async/await patterns for testing asynchronous code
5. **Split complex tests**: Break down complex tests into smaller, focused tests

### Test Organization

Organize tests by feature area and test type:

```
tests/
├── unit/                  # Unit tests by component
│   ├── core/              # Core system components
│   ├── swarm/             # Swarm components
│   ├── memory/            # Memory system
│   └── cli/               # CLI components
├── integration/           # Integration tests
│   ├── core-memory/       # Core + Memory integration
│   ├── swarm-memory/      # Swarm + Memory integration
│   └── cli-system/        # CLI + System integration
├── performance/           # Performance tests
├── e2e/                   # End-to-end tests
└── utils/                 # Test utilities
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing Best Practices](https://www.testim.io/blog/typescript-testing-best-practices/)
- See [SUMMARY.md](SUMMARY.md) for migration project details
- Check the `examples` directory for example test patterns