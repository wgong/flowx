#!/usr/bin/env node

// Quick Swarm Test Script
// Tests swarm functionality using the TypeScript CLI

import { spawn } from 'child_process';

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Running: npx tsx src/cli/main.ts ${command} ${args.join(' ')}`);
    
    const process = spawn('npx', ['tsx', 'src/cli/main.ts', command, ...args], {
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Command completed successfully`);
        resolve();
      } else {
        console.log(`❌ Command failed with code ${code}`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    process.on('error', (error) => {
      console.error(`❌ Process error: ${error.message}`);
      reject(error);
    });
  });
}

async function testSwarmFunctionality() {
  console.log('🚀 Quick Swarm Functionality Test');
  console.log('==================================\n');

  try {
    // Test 1: Check system status
    console.log('📊 Test 1: System Status');
    await runCommand('status');

    // Test 2: List swarms (should be empty initially)
    console.log('\n📋 Test 2: List Swarms');
    await runCommand('swarm', ['list']);

    // Test 3: Create a small swarm
    console.log('\n🤖 Test 3: Create Test Swarm');
    await runCommand('swarm', ['create', 'test-swarm', '--agents', '3', '--coordinator', 'centralized', '--strategy', 'auto']);

    // Test 4: List swarms again
    console.log('\n📋 Test 4: List Swarms After Creation');
    await runCommand('swarm', ['list']);

    // Test 5: Show swarm status
    console.log('\n📊 Test 5: Swarm Status');
    await runCommand('swarm', ['status', 'test-swarm']);

    // Test 6: List agents
    console.log('\n🤖 Test 6: List Agents');
    await runCommand('agent', ['list']);

    console.log('\n🎉 All swarm tests completed successfully!');
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
testSwarmFunctionality(); 