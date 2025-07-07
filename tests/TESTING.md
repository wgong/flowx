# FlowX Testing Guide

This document provides a quick guide to the testing setup for the FlowX project.

## Test Structure

The test suite is organized into three main categories:

1. **Unit Tests** (`tests/unit/`): Test individual components in isolation.
2. **Integration Tests** (`tests/integration/`): Test interactions between multiple components.
3. **End-to-End Tests** (`tests/e2e/`): Test complete workflows using the CLI interface.

## Running Tests

The project uses Jest as the test framework and provides several npm scripts for running tests:

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:e2e
npm run test:integration

# Run with code coverage reporting
npm run test:coverage

# Run in watch mode during development
npm run test:watch

# Run in CI environment with additional reporting
npm run test:ci
```

## Mock Services

External dependencies are mocked in the `tests/__mocks__/` directory:

- `deno_modules.js`: Provides compatibility for code originally written for Deno
- `external-services.js`: Mocks for external APIs and services

## Writing Tests

### Unit Tests

Example of a unit test for a core component:

```javascript
import { describe, test, expect } from '@jest/globals';
import { EventBus } from '../../src/core/event-bus.js';

describe('EventBus', () => {
  test('should emit and receive events', () => {
    const eventBus = new EventBus();
    const handler = jest.fn();
    
    eventBus.on('test-event', handler);
    eventBus.emit('test-event', { data: 'test' });
    
    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

### Integration Tests

Example of an integration test for memory and swarm components:

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventBus } from '../../src/core/event-bus.js';
import { MemoryManager } from '../../src/memory/manager.js';
import { SwarmCoordinator } from '../../src/swarm/coordinator.js';

describe('Memory-Swarm Integration', () => {
  let eventBus;
  let memoryManager;
  let swarmCoordinator;
  
  beforeEach(async () => {
    eventBus = new EventBus();
    memoryManager = new MemoryManager({ backend: 'memory' }, eventBus);
    await memoryManager.initialize();
    
    swarmCoordinator = new SwarmCoordinator({}, eventBus);
    await swarmCoordinator.initialize();
  });
  
  afterEach(async () => {
    await swarmCoordinator.stop();
    await memoryManager.shutdown();
  });
  
  test('should store swarm data in memory', async () => {
    // Test implementation
  });
});
```

### End-to-End Tests

Example of an E2E test for a CLI command:

```javascript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';

describe('System Commands E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner();
    await runner.setup();
  });
  
  test('should show system status', async () => {
    const { stdout, code } = await runner.runCommand([
      'system', 'status', '--json'
    ]);
    
    expect(code).toBe(0);
    const status = JSON.parse(stdout);
    expect(status).toHaveProperty('version');
  });
});
```

## Code Coverage

Jest is configured to track code coverage with the following thresholds:

- Branches: 70%
- Functions: 75%
- Lines: 80%
- Statements: 80%

Run `npm run test:coverage` to generate a coverage report, then open `coverage/lcov-report/index.html` to view it in a browser.

## Best Practices

1. **Test Independence**: Each test should run independently of others.
2. **Clean Up Resources**: Always clean up resources in `afterEach`/`afterAll` blocks.
3. **Mock External Dependencies**: Use the mock implementations for external services.
4. **Clear Naming**: Use descriptive names for test suites and individual tests.
5. **Focused Tests**: Each test should verify one specific behavior.
6. **Complete Coverage**: Include tests for edge cases and error conditions.

## Continuous Integration

Tests are automatically run in CI environments using GitHub Actions. The workflow is configured to:

1. Run all tests with coverage reporting
2. Upload coverage reports
3. Fail the build if tests fail or coverage thresholds are not met

## Troubleshooting

If tests are failing, check these common issues:

1. **Environment Variables**: Make sure the correct environment variables are set for testing.
2. **Resource Cleanup**: Ensure previous tests are properly cleaning up resources.
3. **Asynchronous Code**: Make sure async operations are properly awaited.
4. **Test Isolation**: Verify that tests don't depend on each other's state.