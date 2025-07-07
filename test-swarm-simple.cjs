#!/usr/bin/env node

// Simple Swarm Test Script (CommonJS)
const { execSync } = require('child_process');

function runCommand(command) {
  console.log(`\n🔧 Running: ${command}`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      timeout: 30000,
      stdio: 'pipe'
    });
    console.log('✅ Success!');
    if (output.trim()) {
      console.log(output);
    }
    return output;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.stdout) {
      console.log('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.log('STDERR:', error.stderr);
    }
    throw error;
  }
}

async function testSwarmCommands() {
  console.log('🚀 Simple Swarm Command Test');
  console.log('============================\n');

  try {
    // Test 1: Help command
    console.log('📖 Test 1: Swarm Help');
    runCommand('npx tsx src/cli/main.ts swarm --help');

    // Test 2: List swarms (should be empty)
    console.log('\n📋 Test 2: List Swarms');
    runCommand('npx tsx src/cli/main.ts swarm list');

    // Test 3: Try to create a small swarm
    console.log('\n🤖 Test 3: Create Small Swarm');
    runCommand('npx tsx src/cli/main.ts swarm create test-swarm --agents 2');

    // Test 4: List swarms again
    console.log('\n📋 Test 4: List Swarms After Creation');
    runCommand('npx tsx src/cli/main.ts swarm list');

    console.log('\n🎉 All basic swarm tests completed!');
    
  } catch (error) {
    console.error(`\n❌ Test suite failed: ${error.message}`);
    console.log('\n🔍 This indicates issues with swarm functionality that need fixing.');
    process.exit(1);
  }
}

testSwarmCommands(); 