#!/usr/bin/env node

/**
 * Core Integration Test Script
 * Tests that all core components work together properly
 */

import { Container } from '../src/core/container';
import { EventBus } from '../src/core/event-bus';
import { Logger } from '../src/core/logger';
import { ConfigManager } from '../src/core/config';
import { createValidator } from '../src/core/validation';
import { Application } from '../src/core/application';
import { Bootstrap } from '../src/core/bootstrap';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class CoreIntegrationTester {
  private results: TestResult[] = [];
  private container: Container;
  private eventBus: EventBus;
  private logger: Logger;

  constructor() {
    this.container = new Container();
    this.eventBus = EventBus.getInstance();
    this.logger = new Logger({
      level: 'info',
      enableConsole: true,
      enableFile: false,
      format: 'json'
    });
  }

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime
      });
      console.log(`✅ ${name} - PASSED (${Date.now() - startTime}ms)`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log(`❌ ${name} - FAILED: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Core Integration Tests...\n');

    // Test 1: Container System
    await this.runTest('Container Dependency Injection', async () => {
      // Register services
      this.container.singleton('config', () => ({ test: 'value' }));
      this.container.singleton('logger', () => this.logger);
      this.container.singleton('eventBus', () => this.eventBus);
      
      // Test service resolution
      const config = await this.container.resolve('config');
      const logger = await this.container.resolve('logger');
      const eventBus = await this.container.resolve('eventBus');
      
      if (!config || !logger || !eventBus) {
        throw new Error('Failed to resolve core services');
      }
      
      // Test metrics
      const metrics = this.container.getMetrics();
      if (metrics.resolutions < 3) {
        throw new Error('Container metrics not tracking properly');
      }
    });

    // Test 2: Event Bus Communication
    await this.runTest('Event Bus Communication', async () => {
      let eventReceived = false;
      let eventData: any = null;
      
      // Set up event listener
      this.eventBus.on('test-event', (data) => {
        eventReceived = true;
        eventData = data;
      });
      
      // Emit event
      this.eventBus.emit('test-event', { message: 'Hello World' });
      
      // Small delay to ensure event is processed
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (!eventReceived) {
        throw new Error('Event not received');
      }
      
      if (!eventData || eventData.message !== 'Hello World') {
        throw new Error('Event data not correct');
      }
      
      // Test event statistics
      const stats = this.eventBus.getEventStats();
      if (stats.length === 0) {
        throw new Error('Event statistics not working');
      }
    });

    // Test 3: Logger System
    await this.runTest('Logger System', async () => {
      // Test different log levels
      this.logger.info('Test info message');
      this.logger.warn('Test warning message');
      this.logger.error('Test error message');
      this.logger.debug('Test debug message');
      
      // Test structured logging
      this.logger.info('Structured log test', { 
        userId: '123',
        action: 'test',
        timestamp: new Date().toISOString()
      });
      
      // Logger should not throw errors
      if (!this.logger) {
        throw new Error('Logger not functioning');
      }
    });

    // Test 4: Configuration Management
    await this.runTest('Configuration Management', async () => {
      const configManager = ConfigManager.getInstance();
      
      // Test configuration loading - use load method instead of initialize
      const config = await configManager.load();
      if (!config) {
        throw new Error('Configuration not loaded');
      }
      
      // Test configuration access
      const currentConfig = configManager.get();
      if (!currentConfig) {
        throw new Error('Configuration not accessible');
      }
      
      // Test configuration validation by trying to update with valid data
      // This will internally validate the configuration
      try {
        configManager.update({ name: 'test-config' });
        // If no error is thrown, validation passed
      } catch (error) {
        throw new Error('Configuration validation failed');
      }
      
      // Test that we can access configuration properties
      if (!currentConfig.orchestrator) {
        throw new Error('Configuration structure is invalid');
      }
    });

    // Test 5: Validation System
    await this.runTest('Validation System', async () => {
      const validator = createValidator();
      
      // Test schema validation with proper ValidationRule format
      const schema = {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          age: { type: 'number' as const, min: 0 }
        },
        required: ['name', 'age']
      };
      
      // Valid data
      const validData = { name: 'John', age: 30 };
      const validResult = validator.validateObject(validData, schema);
      if (!validResult.valid) {
        throw new Error('Valid data failed validation');
      }
      
      // Invalid data
      const invalidData = { name: 'John' }; // missing age
      const invalidResult = validator.validateObject(invalidData, schema);
      if (invalidResult.valid) {
        throw new Error('Invalid data passed validation');
      }
      
      // Check that we have the expected error
      if (invalidResult.errors.length === 0) {
        throw new Error('No validation errors for invalid data');
      }
    });

    // Test 6: Application Framework
    await this.runTest('Application Framework', async () => {
      const app = new Application({
        name: 'test-app',
        version: '1.0.0',
        environment: 'test'
      }, this.container);
      
      // Test module registration
      await app.registerModule({
        name: 'test-module',
        async initialize() {
          // Module initialization
        },
        async start() {
          // Module start
        },
        async healthCheck() {
          return true;
        }
      });
      
      // Test application lifecycle
      await app.start();
      
      const health = await app.getHealthStatus();
      if (!health || health.status !== 'healthy') {
        throw new Error('Application health check failed');
      }
      
      await app.stop();
    });

    // Test 7: Bootstrap System (simplified to avoid missing dependencies)
    await this.runTest('Bootstrap System', async () => {
      // Create a minimal bootstrap config that doesn't require all services
      const bootstrap = new Bootstrap({
        name: 'test-bootstrap',
        version: '1.0.0',
        environment: 'test',
        gracefulShutdownTimeout: 5000,
        enableHealthChecks: true,
        enableMetrics: true,
        // Disable modules that require external services
        modules: [],
        plugins: []
      });
      
      // Test bootstrap initialization
      const app = await bootstrap.initialize();
      if (!app) {
        throw new Error('Bootstrap failed to initialize application');
      }
      
      // Test graceful shutdown
      await app.stop();
    });

    // Test 8: Integration Test
    await this.runTest('Full Integration Test', async () => {
      // Create a new container for integration test
      const integrationContainer = new Container();
      
      // Register all core services
      integrationContainer.singleton('logger', () => this.logger);
      integrationContainer.singleton('eventBus', () => this.eventBus);
      integrationContainer.singleton('config', () => ConfigManager.getInstance());
      integrationContainer.singleton('validator', () => createValidator());
      
      // Test cross-component communication
      const logger = await integrationContainer.resolve('logger');
      const eventBus = await integrationContainer.resolve('eventBus');
      const config = await integrationContainer.resolve('config');
      const validator = await integrationContainer.resolve('validator');
      
      // Test that all components work together
      let integrationEventReceived = false;
      eventBus.on('integration-test', () => {
        integrationEventReceived = true;
      });
      
      logger.info('Integration test starting');
      eventBus.emit('integration-test', { source: 'integration-test' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (!integrationEventReceived) {
        throw new Error('Integration event not received');
      }
      
      // Test container metrics
      const metrics = integrationContainer.getMetrics();
      if (metrics.resolutions < 4) {
        throw new Error('Container not tracking resolutions properly');
      }
    });

    this.printResults();
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
    }
    
    console.log('\n⏱️  Performance:');
    this.results.forEach(result => {
      console.log(`  - ${result.name}: ${result.duration}ms`);
    });
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\nTotal Duration: ${totalDuration}ms`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Core integration is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  }
}

// Run the tests
async function main() {
  const tester = new CoreIntegrationTester();
  await tester.runAllTests();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { CoreIntegrationTester }; 