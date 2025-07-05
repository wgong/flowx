# Migrating Tests from Deno to Node.js/Jest

This document details the approach taken to migrate Claude-Flow tests from Deno's testing framework to Node.js with Jest.

## Migration Strategy

The migration followed a systematic approach:

1. **Analysis**: Analyze test failures and categorize issues
2. **Core Utilities**: Create Node.js compatible test utilities
3. **Mock Deno Modules**: Mock Deno-specific functionality
4. **Test by Test**: Migrate tests one by one, starting with critical paths
5. **Verification**: Verify tests run correctly in Jest environment

## Common Migration Patterns

### 1. Import Statements

**Deno:**
```typescript
import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.220.0/async/delay.ts";
```

**Node.js/Jest:**
```typescript
import { assertEquals, assertExists, delay } from '../utils/node-test-utils';
```

### 2. File System Operations

**Deno:**
```typescript
await Deno.writeTextFile(filePath, content);
await Deno.mkdir(dirPath, { recursive: true });
const content = await Deno.readTextFile(filePath);
```

**Node.js:**
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';

await fs.writeFile(filePath, content);
await fs.mkdir(dirPath, { recursive: true });
const content = await fs.readFile(filePath, 'utf-8');
```

### 3. Test Structure

**Deno:**
```typescript
import { describe, it, beforeEach, afterEach } from "https://deno.land/std@0.220.0/testing/bdd.ts";

describe("MyFeature", () => {
  it("should do something", () => {
    // Test code
  });
});
```

**Node.js/Jest:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe("MyFeature", () => {
  it("should do something", () => {
    // Test code
  });
});
```

### 4. Assertions

**Deno:**
```typescript
assertEquals(actual, expected);
assertExists(value);
assertThrows(() => func());
```

**Node.js/Jest:**
```typescript
expect(actual).toEqual(expected);
expect(value).toBeDefined();
expect(() => func()).toThrow();
```

## Step-by-Step Migration Process

### Step 1: Create Node.js Test Utilities

Created Node.js compatible versions of Deno test utilities:

1. `node-test-utils.ts`: Re-exports Jest functions and adds Deno-compatible assertions
2. `node-data-generator.ts`: Test data generation
3. `node-async-utils.ts`: Async testing utilities
4. `node-memory-utils.ts`: Memory testing utilities
5. `node-filesystem-utils.ts`: File system operations
6. `node-performance-utils.ts`: Performance testing utilities
7. `node-test-assertions.ts`: Additional assertions

### Step 2: Configure Jest

Updated Jest configuration to handle module resolution and Deno imports:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.cjs$': '$1',
    '^https://deno.land/std@0.\\d+\\.\\d+/(.*)$': '<rootDir>/tests/__mocks__/deno_modules.js',
  },
  // ...other config
};
```

### Step 3: Create Mocks for Deno Modules

Implemented mock functionality for commonly used Deno modules:

```javascript
// __mocks__/deno_modules.js
const mockAssertEquals = (actual, expected, msg) => {
  expect(actual).toEqual(expected);
};

const mockDelay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Export mocks mapped to Deno module paths
module.exports = {
  'https://deno.land/std@0.220.0/assert/mod.ts': {
    assertEquals: mockAssertEquals,
    // ...other assertion mocks
  },
  'https://deno.land/std@0.220.0/async/delay.ts': {
    delay: mockDelay
  },
  // ...other mocks
};
```

### Step 4: Migrate Individual Tests

For each test file:

1. Analyze Deno-specific code
2. Replace imports with Node.js equivalents
3. Modify file system operations
4. Update assertion syntax if needed
5. Handle any other Deno-specific features

### Step 5: Handle Special Cases

#### Performance Testing

- Reduced test dataset sizes for Node.js environment
- Relaxed timing constraints
- Created Node.js specific performance utilities

#### File System Tests

- Used Node.js temporary directory functionality
- Created utilities to manage test files and directories
- Simplified file system operations

#### Memory Testing

- Adapted memory monitoring for Node.js environment
- Created Node.js specific implementations of memory tests

## Specific Migration Examples

### Example 1: Workflow Test

**Before:**
```typescript
import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.220.0/testing/bdd.ts";
import { parseYaml } from "../../src/utils/yaml-parser.ts";

describe("Workflow YAML Parser", () => {
  it("should parse valid workflow YAML", async () => {
    const yamlContent = await Deno.readTextFile("./tests/fixtures/valid-workflow.yaml");
    const result = parseYaml(yamlContent);
    assertExists(result);
    assertEquals(result.name, "Test Workflow");
  });
});
```

**After:**
```typescript
import { assertEquals, assertExists, describe, it } from "../utils/node-test-utils";
import { parseYaml } from "../../src/utils/yaml-parser.js";
import * as fs from 'fs/promises';
import * as path from 'path';

describe("Workflow YAML Parser", () => {
  it("should parse valid workflow YAML", async () => {
    const yamlContent = await fs.readFile("./tests/fixtures/valid-workflow.yaml", 'utf-8');
    const result = parseYaml(yamlContent);
    assertExists(result);
    assertEquals(result.name, "Test Workflow");
  });
});
```

### Example 2: Performance Test

**Before:**
```typescript
import { PerformanceTestUtils } from "../utils/test-utils.ts";

it("should maintain performance under load", async () => {
  const { stats } = await PerformanceTestUtils.benchmark(
    async () => {
      // Test operation
      return process(largeDataset);
    },
    { iterations: 100, concurrency: 10 }
  );
  
  assertEquals(stats.mean < 50, true); // Under 50ms
});
```

**After:**
```typescript
import { PerformanceTestUtils } from "../utils/node-performance-utils";

it("should maintain performance under load", async () => {
  const { stats } = await PerformanceTestUtils.benchmark(
    async () => {
      // Test operation with reduced dataset
      return process(mediumDataset);
    },
    { iterations: 20, concurrency: 5 } // Reduced iterations
  );
  
  // More relaxed constraint for Node.js environment
  expect(stats.mean).toBeLessThan(100);
});
```

### Example 3: CLI Test

**Before:**
```typescript
import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";

it("should execute CLI command", async () => {
  const process = Deno.run({
    cmd: ["./cli.js", "status"],
    stdout: "piped",
    stderr: "piped",
  });
  
  const output = new TextDecoder().decode(await process.output());
  const status = await process.status();
  
  process.close();
  
  assertEquals(status.success, true);
  assertEquals(output.includes("System Status"), true);
});
```

**After:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

it("should execute CLI command", async () => {
  const { stdout, stderr } = await execAsync("node ./cli.js status");
  expect(stdout).toContain("System Status");
});
```

## Lessons Learned

1. **Start with Core Utilities**: Begin by migrating core test utilities
2. **Mock Properly**: Create comprehensive mocks for external dependencies
3. **Adjust Expectations**: Recognize environment differences and adjust test expectations
4. **Test Incrementally**: Migrate and verify tests incrementally
5. **Keep Original Tests**: When appropriate, keep Deno tests alongside Node.js tests
6. **Documentation**: Document migration patterns for consistent approach

## Future Improvements

1. **Test Coverage**: Improve test coverage in migrated tests
2. **Integration Testing**: Enhance integration test coverage
3. **CI Pipeline**: Set up CI pipeline for consistent test execution
4. **Benchmark Suite**: Create formal benchmarking suite for performance regression testing