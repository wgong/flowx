/**
 * Jest adapter for CLI Integration Tests
 * This adapter allows running the CLI tests with Jest
 */

import { CLITestRunner, basicCommandsTestSuite, agentCommandsTestSuite, swarmCommandsTestSuite,
  sparcCommandsTestSuite, batchCommandsTestSuite, memoryCommandsTestSuite,
  configCommandsTestSuite, mcpCommandsTestSuite, errorHandlingTestSuite } from './cli-comprehensive.test';

// Jest test suite
describe('CLI Integration Tests', () => {
  const runner = new CLITestRunner();
  
  beforeAll(async () => {
    await runner.setup();
  });
  
  afterAll(async () => {
    await runner.cleanup();
  });

  // Test basic commands
  describe('Basic Commands', () => {
    basicCommandsTestSuite.tests.forEach(test => {
      it(`${test.name}`, async () => {
        const result = await runner.runTest(test);
        expect(result.passed).toBe(true);
        if (!result.passed) {
          console.error(result.message);
        }
      });
    });
  });

  // Test agent commands
  describe('Agent Commands', () => {
    agentCommandsTestSuite.tests.forEach(test => {
      it(`${test.name}`, async () => {
        const result = await runner.runTest(test);
        expect(result.passed).toBe(true);
        if (!result.passed) {
          console.error(result.message);
        }
      });
    });
  });

  // Test swarm commands
  describe('Swarm Commands', () => {
    swarmCommandsTestSuite.tests.forEach(test => {
      // Skip swarm creation tests in Jest environment as they may require more resources
      const testFn = test.name.includes('Create swarm') ? it.skip : it;
      
      testFn(`${test.name}`, async () => {
        const result = await runner.runTest(test);
        expect(result.passed).toBe(true);
        if (!result.passed) {
          console.error(result.message);
        }
      });
    });
  });

  // Test memory commands
  describe('Memory Commands', () => {
    memoryCommandsTestSuite.tests.forEach(test => {
      it(`${test.name}`, async () => {
        const result = await runner.runTest(test);
        expect(result.passed).toBe(true);
        if (!result.passed) {
          console.error(result.message);
        }
      });
    });
  });

  // Test config commands
  describe('Config Commands', () => {
    configCommandsTestSuite.tests.forEach(test => {
      it(`${test.name}`, async () => {
        const result = await runner.runTest(test);
        expect(result.passed).toBe(true);
        if (!result.passed) {
          console.error(result.message);
        }
      });
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    errorHandlingTestSuite.tests.forEach(test => {
      it(`${test.name}`, async () => {
        const result = await runner.runTest(test);
        expect(result.passed).toBe(true);
        if (!result.passed) {
          console.error(result.message);
        }
      });
    });
  });

  // Skip resource-intensive tests in Jest environment
  describe.skip('Resource-Intensive Tests', () => {
    // SPARC commands
    describe('SPARC Commands', () => {
      sparcCommandsTestSuite.tests.forEach(test => {
        it(`${test.name}`, async () => {
          const result = await runner.runTest(test);
          expect(result.passed).toBe(true);
        });
      });
    });

    // MCP commands
    describe('MCP Commands', () => {
      mcpCommandsTestSuite.tests.forEach(test => {
        it(`${test.name}`, async () => {
          const result = await runner.runTest(test);
          expect(result.passed).toBe(true);
        });
      });
    });

    // Batch commands
    describe('Batch Commands', () => {
      batchCommandsTestSuite.tests.forEach(test => {
        it(`${test.name}`, async () => {
          const result = await runner.runTest(test);
          expect(result.passed).toBe(true);
        });
      });
    });
  });
});