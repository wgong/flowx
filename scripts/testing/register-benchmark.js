#!/usr/bin/env node
/**
 * Script to register the benchmark system with claude-flow
 * This script should be run after building the benchmark system
 */

const path = require('path');
const fs = require('fs');

console.log('🔗 Registering benchmark system with claude-flow...');

// Get the benchmark integration path
const benchmarkIntegrationPath = path.join(__dirname, '../benchmark/integration/register_benchmark.js');

// Check if the integration file exists
if (!fs.existsSync(benchmarkIntegrationPath)) {
  console.error('❌ Benchmark integration file not found:', benchmarkIntegrationPath);
  console.log('🔧 Please run the benchmark build script first:');
  console.log('   npm run benchmark:build');
  process.exit(1);
}

try {
  // Load the integration module
  const { registerBenchmarkSystem } = require(benchmarkIntegrationPath);
  
  // Load the claude-flow app
  const appPath = path.join(__dirname, '../src/cli/index.ts');
  if (!fs.existsSync(appPath)) {
    throw new Error(`Claude-flow app not found at ${appPath}`);
  }
  
  // Get the app instance
  console.log('📋 Loading claude-flow app...');
  const app = require(appPath);
  
  // Register the benchmark system
  console.log('🔄 Registering benchmark system...');
  const result = registerBenchmarkSystem(app);
  
  console.log('✅ Benchmark system registered successfully!');
  console.log(`🧩 Components registered: ${result.components.join(', ')}`);
  
  // Print usage examples
  console.log('\n📝 Usage examples:');
  console.log('  ./claude-flow benchmark run "Test objective" --strategy development');
  console.log('  ./claude-flow benchmark help');
  
} catch (error) {
  console.error('❌ Failed to register benchmark system:', error.message);
  console.error('⚙️ Try building the benchmark system first:');
  console.error('   npm run benchmark:build');
  process.exit(1);
}