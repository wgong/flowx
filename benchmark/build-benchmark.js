#!/usr/bin/env node
/**
 * Build script for the benchmark system.
 * This script compiles TypeScript code and prepares the benchmark system for use.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths
const basePath = __dirname;
const srcPath = path.join(basePath, 'src');
const distPath = path.join(basePath, 'dist');
const nodeBin = path.join(basePath, '../node_modules/.bin');

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

console.log('🛠️ Building benchmark system...');

try {
  // Install TypeScript if not available
  try {
    execSync('tsc --version');
  } catch (err) {
    console.log('⚙️ Installing TypeScript...');
    execSync('npm install typescript --no-save');
  }
  
  // Compile TypeScript code
  console.log('🔄 Compiling TypeScript...');
  execSync(`tsc --project ${path.join(basePath, 'tsconfig.json')}`, { stdio: 'inherit' });
  
  // Copy Python files
  console.log('📋 Copying Python files...');
  execSync(`cp -r ${srcPath}/swarm_benchmark ${distPath}/`, { stdio: 'inherit' });
  
  // Install dependencies if needed
  console.log('📦 Installing dependencies...');
  if (!fs.existsSync(path.join(basePath, 'node_modules'))) {
    execSync('npm install', { cwd: basePath, stdio: 'inherit' });
  }
  
  // Update package.json scripts
  console.log('📝 Updating package.json scripts...');
  const pkgPath = path.join(basePath, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // Add benchmark scripts if they don't exist
  pkg.scripts = pkg.scripts || {};
  
  if (!pkg.scripts['benchmark:build']) {
    pkg.scripts['benchmark:build'] = 'node benchmark/build-benchmark.js';
  }
  
  if (!pkg.scripts['benchmark']) {
    pkg.scripts['benchmark'] = 'node benchmark/dist/bin/cli.js';
  }
  
  if (!pkg.scripts['benchmark:example']) {
    pkg.scripts['benchmark:example'] = 'node benchmark/examples/basic.js';
  }
  
  if (!pkg.scripts['benchmark:test']) {
    pkg.scripts['benchmark:test'] = 'jest --config benchmark/jest.config.js';
  }
  
  // Write updated package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  
  console.log('✅ Benchmark system built successfully!');
  console.log('\n🚀 You can now run:');
  console.log('  npm run benchmark -- --help           # Show benchmark help');
  console.log('  npm run benchmark -- run "objective"  # Run a benchmark');
  console.log('  npm run benchmark:example             # Run example benchmark');
  console.log('  npm run benchmark:test                # Run benchmark tests');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}