const HelloWorldApp = require('./index.js');
const assert = require('assert');

/**
 * Test Suite for Hello World Application
 * Created by Claude Flow Swarm System
 */

console.log('🧪 Running Hello World Tests...\n');

// Test 1: Basic instantiation
console.log('Test 1: Basic instantiation');
const app = new HelloWorldApp();
assert(app instanceof HelloWorldApp, 'App should be instance of HelloWorldApp');
console.log('✅ Passed\n');

// Test 2: Custom configuration
console.log('Test 2: Custom configuration');
const customApp = new HelloWorldApp({
  name: 'Custom Hello World',
  version: '2.0.0',
  author: 'Test Author'
});
assert.strictEqual(customApp.config.name, 'Custom Hello World', 'Custom name should be set');
assert.strictEqual(customApp.config.version, '2.0.0', 'Custom version should be set');
assert.strictEqual(customApp.config.author, 'Test Author', 'Custom author should be set');
console.log('✅ Passed\n');

// Test 3: Synchronous run
console.log('Test 3: Synchronous run');
const result = app.run();
assert(typeof result === 'object', 'Run should return an object');
assert(result.message === 'Hello, World!', 'Message should be Hello, World!');
assert(result.timestamp, 'Result should have timestamp');
console.log('✅ Passed\n');

// Test 4: Asynchronous run
console.log('Test 4: Asynchronous run');
customApp.runAsync().then(asyncResult => {
  assert(typeof asyncResult === 'object', 'Async run should return an object');
  assert(asyncResult.message === 'Hello, World!', 'Async message should be Hello, World!');
  assert(asyncResult.timestamp, 'Async result should have timestamp');
  console.log('✅ Passed\n');
  
  console.log('🎉 All tests passed successfully!');
  console.log('Hello World application is working correctly.');
}).catch(error => {
  console.error('❌ Async test failed:', error);
  process.exit(1);
}); 