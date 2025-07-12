#!/usr/bin/env node

/**
 * Core Integration Test Script
 * Verifies that all core components work together seamlessly
 */

import { Container } from '../dist/scripts/src/core/container.js';
import { Logger } from '../dist/scripts/src/core/logger.js';
import { EventBus } from '../dist/scripts/src/core/event-bus.js';
import { createValidator } from '../dist/scripts/src/core/validation.js';
import { ConfigManager } from '../dist/scripts/src/core/config.js';

async function testCoreIntegration() {
  console.log('🚀 Starting Core Integration Test...\n');
  
  let success = true;
  const results = [];

  try {
    // Test 1: Container System
    console.log('📦 Testing Container System...');
    const container = new Container({
      enableCircularDependencyDetection: true,
      enableMetrics: true,
      maxResolutionDepth: 50
    });

    const logger = new Logger({
      level: 'info',
      format: 'json',
      destination: 'console'
    });

    const eventBus = EventBus.getInstance(true);
    const validator = createValidator();

    container.singleton('logger', () => logger);
    container.singleton('eventBus', () => eventBus);
    container.singleton('validator', () => validator);

    const resolvedLogger = await container.resolve('logger');
    const resolvedEventBus = await container.resolve('eventBus');
    const resolvedValidator = await container.resolve('validator');

    if (resolvedLogger && resolvedEventBus && resolvedValidator) {
      results.push({ component: 'Container', status: '✅ PASS', details: 'All services resolved' });
    } else {
      results.push({ component: 'Container', status: '❌ FAIL', details: 'Service resolution failed' });
      success = false;
    }

    // Test 2: Event Bus
    console.log('📡 Testing Event Bus...');
    let eventReceived = false;
    eventBus.on('test:integration', () => { eventReceived = true; });
    eventBus.emit('test:integration', { test: true });
    
    // Give event loop time to process
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (eventReceived) {
      results.push({ component: 'EventBus', status: '✅ PASS', details: 'Events emitted and received' });
    } else {
      results.push({ component: 'EventBus', status: '❌ FAIL', details: 'Event handling failed' });
      success = false;
    }

    // Test 3: Configuration Manager
    console.log('⚙️ Testing Configuration Manager...');
    const configManager = ConfigManager.getInstance();
    await configManager.load();
    const config = configManager.get();
    
    if (config && config.orchestrator && config.memory && config.logging) {
      results.push({ component: 'ConfigManager', status: '✅ PASS', details: 'Configuration loaded and validated' });
    } else {
      results.push({ component: 'ConfigManager', status: '❌ FAIL', details: 'Configuration loading failed' });
      success = false;
    }

    // Test 4: Validation System
    console.log('✅ Testing Validation System...');
    const testSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', required: true, minLength: 1 },
        age: { type: 'number', min: 0, max: 150 },
        email: { type: 'string', format: 'email' }
      }
    };

    const validData = { name: 'Test User', age: 25, email: 'test@example.com' };
    const validationResult = validator.validateObject(validData, testSchema);
    
    if (validationResult.valid) {
      results.push({ component: 'Validator', status: '✅ PASS', details: 'Validation system working' });
    } else {
      results.push({ component: 'Validator', status: '❌ FAIL', details: 'Validation failed' });
      success = false;
    }

    // Test 5: Container Metrics
    console.log('📊 Testing Container Metrics...');
    const metrics = container.getMetrics();
    
    if (metrics && typeof metrics.resolutions === 'number' && metrics.resolutions > 0) {
      results.push({ component: 'ContainerMetrics', status: '✅ PASS', details: `${metrics.resolutions} resolutions tracked` });
    } else {
      results.push({ component: 'ContainerMetrics', status: '❌ FAIL', details: 'Metrics tracking failed' });
      success = false;
    }

    // Test 6: Event Statistics
    console.log('📈 Testing Event Statistics...');
    eventBus.emit('test:metric', { count: 1 });
    eventBus.emit('test:metric', { count: 2 });
    
    const stats = eventBus.getEventStats();
    const testMetricStat = stats.find(s => s.event === 'test:metric');
    
    if (testMetricStat && testMetricStat.count === 2) {
      results.push({ component: 'EventStats', status: '✅ PASS', details: 'Event statistics working' });
    } else {
      results.push({ component: 'EventStats', status: '❌ FAIL', details: 'Event statistics failed' });
      success = false;
    }

    // Cleanup
    console.log('🧹 Cleaning up...');
    await logger.close();
    eventBus.resetStats();

    // Print Results
    console.log('\n📊 Integration Test Results:');
    console.log('═'.repeat(60));
    
    results.forEach(result => {
      console.log(`${result.component.padEnd(20)} ${result.status.padEnd(10)} ${result.details || ''}`);
    });
    
    console.log('═'.repeat(60));
    
    if (success) {
      console.log('🎉 CORE INTEGRATION TESTS PASSED!');
      console.log('\n✨ System Status:');
      console.log('   - Container: Dependency injection working');
      console.log('   - EventBus: Event communication established');
      console.log('   - Config: Configuration management active');
      console.log('   - Validation: Data validation system active');
      console.log('   - Metrics: Performance tracking enabled');
      console.log('\n🚀 Claude Flow core system is integrated and operational!');
      
      // Additional system verification
      console.log('\n🔍 System Verification:');
      console.log(`   - Container metrics: ${metrics.resolutions} resolutions, ${metrics.cacheHits} cache hits`);
      console.log(`   - Event statistics: ${stats.length} event types tracked`);
      console.log(`   - Configuration: ${Object.keys(config).length} config sections loaded`);
      console.log(`   - Logger: ${logger.constructor.name} instance created`);
      
      process.exit(0);
    } else {
      console.log('❌ SOME INTEGRATION TESTS FAILED!');
      console.log('\n🔧 Please check the failed components and fix any issues.');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Integration test failed with error:', error);
    results.push({ component: 'System', status: '❌ FAIL', details: `Error: ${error.message}` });
    process.exit(1);
  }
}

// Run the test
testCoreIntegration().catch(console.error); 