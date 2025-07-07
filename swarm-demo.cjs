#!/usr/bin/env node

/**
 * Swarm Demo Runner
 * Uses TypeScript version to avoid dependency issues
 */

const { spawn } = require('child_process');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

// Build the command
const command = 'npx';
const commandArgs = ['tsx', 'src/cli/main.ts', 'swarm', 'demo', ...args];

console.log('🚀 Starting Claude Flow Swarm Demo...');
console.log(`Command: ${command} ${commandArgs.join(' ')}`);

// Spawn the process
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  cwd: __dirname
});

// Handle process events
child.on('error', (error) => {
  console.error('❌ Failed to start demo:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Demo completed successfully!');
  } else {
    console.log(`❌ Demo failed with exit code: ${code}`);
  }
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping demo...');
  child.kill('SIGINT');
}); 