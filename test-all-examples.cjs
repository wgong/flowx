#!/usr/bin/env node

/**
 * Master Example Test Script
 * Tests all Claude Flow examples using the working TypeScript CLI approach
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 CLAUDE FLOW EXAMPLES TEST SUITE');
console.log('==================================');

const CLI_CMD = 'npx tsx src/cli/main.ts';

// Test categories
const tests = [
  {
    name: 'Swarm Demo (Working)',
    command: `${CLI_CMD} swarm demo hello-world --agents 2 --output ./test-output-1`,
    timeout: 120000,
    expectedFiles: ['test-output-1/hello-world-app/index.html', 'test-output-1/hello-world-app/style.css']
  },
  {
    name: 'System Status',
    command: `${CLI_CMD} status`,
    timeout: 10000,
    expectedOutput: 'Claude Flow'
  },
  {
    name: 'Memory Stats', 
    command: `${CLI_CMD} memory stats`,
    timeout: 10000,
    expectedOutput: 'Memory'
  },
  {
    name: 'Agent List',
    command: `${CLI_CMD} agent list`,
    timeout: 10000,
    expectedOutput: 'agents'
  },
  {
    name: 'Task List',
    command: `${CLI_CMD} task list`,
    timeout: 10000,
    expectedOutput: 'tasks'
  }
];

// Showcase demos (these just display info)
const showcaseDemos = [
  'examples/swarm-showcase-demo.js',
  'examples/sparc-showcase-demo.js', 
  'examples/workflow-showcase-demo.js'
];

async function runTest(test) {
  console.log(`\n🔧 Testing: ${test.name}`);
  console.log(`Command: ${test.command}`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn('sh', ['-c', test.command], { 
      stdio: 'pipe',
      timeout: test.timeout 
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        // Check expected output
        if (test.expectedOutput && !output.includes(test.expectedOutput)) {
          console.log(`❌ FAIL: Expected output "${test.expectedOutput}" not found`);
          resolve({ success: false, duration, error: 'Missing expected output' });
          return;
        }
        
        // Check expected files
        if (test.expectedFiles) {
          const missingFiles = test.expectedFiles.filter(file => !fs.existsSync(file));
          if (missingFiles.length > 0) {
            console.log(`❌ FAIL: Missing files: ${missingFiles.join(', ')}`);
            resolve({ success: false, duration, error: 'Missing expected files' });
            return;
          }
        }
        
        console.log(`✅ PASS (${duration}ms)`);
        resolve({ success: true, duration });
      } else {
        console.log(`❌ FAIL: Exit code ${code}`);
        if (errorOutput) {
          console.log(`Error: ${errorOutput.substring(0, 200)}...`);
        }
        resolve({ success: false, duration, error: errorOutput });
      }
    });
    
    child.on('error', (error) => {
      console.log(`❌ FAIL: ${error.message}`);
      resolve({ success: false, duration: Date.now() - startTime, error: error.message });
    });
  });
}

async function runShowcaseDemo(demoPath) {
  console.log(`\n🎨 Testing Showcase: ${path.basename(demoPath)}`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn('node', [demoPath], { stdio: 'pipe' });
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0 && output.includes('Demo')) {
        console.log(`✅ PASS (${duration}ms)`);
        resolve({ success: true, duration });
      } else {
        console.log(`❌ FAIL: Exit code ${code}`);
        resolve({ success: false, duration });
      }
    });
  });
}

async function main() {
  console.log('\n📋 Phase 1: Core CLI Commands');
  console.log('==============================');
  
  const results = [];
  
  // Test core CLI commands
  for (const test of tests) {
    const result = await runTest(test);
    results.push({ name: test.name, ...result });
  }
  
  console.log('\n📋 Phase 2: Showcase Demos');
  console.log('===========================');
  
  // Test showcase demos
  for (const demoPath of showcaseDemos) {
    if (fs.existsSync(demoPath)) {
      const result = await runShowcaseDemo(demoPath);
      results.push({ name: path.basename(demoPath), ...result });
    } else {
      console.log(`⚠️  SKIP: ${demoPath} not found`);
    }
  }
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  try {
    execSync('rm -rf test-output-*', { stdio: 'ignore' });
    console.log('✅ Cleanup complete');
  } catch (e) {
    console.log('⚠️  Cleanup warning:', e.message);
  }
  
  console.log('\n🎯 Test suite complete!');
  
  if (failed === 0) {
    console.log('🎉 All examples are working correctly!');
    process.exit(0);
  } else {
    console.log('🔧 Some examples need fixes.');
    process.exit(1);
  }
}

main().catch(console.error); 