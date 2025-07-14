# Claude-Flow Testing Guide

## Overview

This guide provides comprehensive instructions for writing effective tests for the claude-flow project. The testing infrastructure has been designed to ensure consistent test behavior across different environments while properly isolating tests from external dependencies.

## Testing Architecture

The claude-flow project uses the following testing structure:

- **Unit Tests** (`/tests/unit/`): Test individual components in isolation
- **Integration Tests** (`/tests/integration/`): Test components working together
- **End-to-End Tests** (`/tests/e2e/`): Test the entire system from a user perspective

## Key Testing Tools

- **Jest**: Primary test framework
- **Mock System**: Centralized mock implementations (`/tests/mock-system.js`)
- **Jest Setup**: Global test configuration (`/tests/jest.setup.js`)
- **Helper Functions**: Common test utilities in the global scope

## Using the Mock System

The project includes a comprehensive mock system that provides consistent mock implementations for all external dependencies:

```javascript
// Import the mock system
import mockSystem from './mock-system.js';

// Initialize all mocks
beforeAll(() => {
  mockSystem.setup();
});
```

The mock system provides mocks for:

- File system operations (fs and fs/promises)
- Child process execution (exec, spawn)
- Logger functionality
- Deno runtime compatibility
- Event bus and messaging
- Persistence and state management

## Writing Effective Tests

### Basic Test Structure

```javascript
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ComponentToTest } from '../path/to/component';

describe('ComponentToTest', () => {
  let component;
  
  beforeEach(() => {
    // Setup for each test
    component = new ComponentToTest();
  });
  
  afterEach(() => {
    // Cleanup after each test
    if (component.dispose) {
      component.dispose();
    }
  });
  
  it('should perform expected behavior', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = component.doSomething(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Using Global Helper Functions

The test environment provides several global helper functions:

```javascript
// Create a mock event bus for testing event interactions
const eventBus = global.createMockEventBus();

// Create a mock persistence manager for testing data storage
const persistenceManager = global.createMockPersistenceManager();

// Create a mock MCP context for testing MCP tools
const mcpContext = global.createMockMcpContext();
```

### Testing Async Code

Many operations in claude-flow are asynchronous. Use the async/await pattern:

```javascript
it('should handle async operations', async () => {
  // Arrange
  const input = 'test';
  
  // Act
  const result = await component.doAsyncOperation(input);
  
  // Assert
  expect(result).toBe('expected output');
});
```

### Testing Event Handling

For testing event-based behavior:

```javascript
it('should react to events', async () => {
  // Setup event handler
  const mockHandler = jest.fn();
  component.on('someEvent', mockHandler);
  
  // Trigger event
  component.triggerEvent('payload');
  
  // Wait a bit for async event handling
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verify handler was called with correct payload
  expect(mockHandler).toHaveBeenCalledWith('payload');
});
```

## Handling External Dependencies

### File System

The mock system provides mocks for file system operations:

```javascript
// The mock system automatically mocks these modules:
// - fs
// - fs/promises
// - path

// Example of using the mocked fs/promises module:
import { promises as fs } from 'fs';

it('should write to a file', async () => {
  await fs.writeFile('test.txt', 'content');
  // No actual file is written, but the mock function is called
  expect(fs.writeFile).toHaveBeenCalledWith('test.txt', 'content');
});
```

### Network Requests

The mock system handles HTTP/HTTPS requests:

```javascript
// The mock system automatically mocks:
// - http
// - https

// Example of testing code that makes network requests:
it('should handle API responses', async () => {
  // Your code will use the mocked http/https modules
  // which return predefined responses without actual network calls
  const result = await component.fetchFromApi('https://example.com/api');
  expect(result).toBeDefined();
});
```

### Child Processes

The mock system provides mocks for child process operations:

```javascript
// The mock system automatically mocks:
// - child_process
// - node:child_process

import { exec } from 'child_process';

it('should execute commands', () => {
  // No actual command is executed
  exec('some-command', (error, stdout) => {
    expect(stdout).toBe('mocked stdout');
  });
});
```

## Testing MCP Tools

For testing MCP tools, use the following approach:

```javascript
import { createToolToTest } from '../path/to/tool';

describe('Tool Tests', () => {
  let tool;
  let mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  
  beforeEach(() => {
    tool = createToolToTest(mockLogger);
  });
  
  it('should handle tool inputs correctly', async () => {
    const mockContext = global.createMockMcpContext();
    const result = await tool.handler({ input: 'value' }, mockContext);
    expect(result).toHaveProperty('success', true);
  });
});
```

## Testing Tips and Best Practices

1. **Isolate Tests**: Each test should run in isolation and not depend on other tests.

2. **Mock External Dependencies**: Always use the mock system for external dependencies.

3. **Clean Up After Tests**: Use `afterEach` and `afterAll` to clean up resources.

4. **Use Descriptive Names**: Test names should describe the expected behavior.

5. **Follow AAA Pattern**:
   - **Arrange**: Set up the test conditions
   - **Act**: Perform the action being tested
   - **Assert**: Verify the expected outcome

6. **Test Error Cases**: Test both success and failure scenarios.

7. **Avoid Test Timeouts**: For time-sensitive operations, use Jest's timer mocks:

   ```javascript
   // Use fake timers
   jest.useFakeTimers();
   
   // Fast-forward time
   jest.advanceTimersByTime(1000); // advance 1 second
   
   // Restore real timers
   jest.useRealTimers();
   ```

8. **Avoid Flaky Tests**: Tests should be deterministic and reliable.

9. **Use Snapshot Testing**: For complex output structures.

10. **Test One Thing at a Time**: Each test should focus on a specific behavior.

## Troubleshooting Common Testing Issues

### Tests Taking Too Long

- Look for missing mock implementations
- Check for real network or filesystem operations
- Use Jest's `--detectOpenHandles` flag to find hanging promises

### Inconsistent Test Results

- Check for shared state between tests
- Ensure proper cleanup in `afterEach` blocks
- Look for race conditions in async code

### Module Resolution Errors

- Check Jest's `moduleNameMapper` configuration
- Verify import paths are correct
- Use absolute imports where possible

## Continuous Integration

The claude-flow project uses CI to automatically run tests:

- Tests run on every pull request
- All tests must pass before merging
- Code coverage reports are generated automatically

## Conclusion

Effective testing is crucial for the claude-flow project. By following this guide and leveraging the provided testing infrastructure, you can write reliable tests that ensure the quality and stability of the code base.

For specific testing scenarios or components not covered in this guide, refer to the existing tests as examples of best practices.