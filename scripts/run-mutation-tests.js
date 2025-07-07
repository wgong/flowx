#!/usr/bin/env node

/**
 * Run mutation tests for the codebase
 * 
 * Mutation testing helps ensure that your tests actually detect bugs
 * by making small changes to your code and verifying tests catch them.
 * 
 * Usage:
 *   node scripts/run-mutation-tests.js [options]
 * 
 * Options:
 *   --target=path/to/file  Target specific file or directory
 *   --ci                   Run in CI mode with minimal output
 *   --reporters            Comma separated list of reporters (e.g. html,clear-text)
 *   --concurrency=N        Number of mutation tests to run in parallel
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  target: null,
  ci: args.includes('--ci'),
  reporters: null,
  concurrency: null
};

// Parse named arguments
for (const arg of args) {
  if (arg.startsWith('--target=')) {
    options.target = arg.split('=')[1];
  } else if (arg.startsWith('--reporters=')) {
    options.reporters = arg.split('=')[1];
  } else if (arg.startsWith('--concurrency=')) {
    options.concurrency = parseInt(arg.split('=')[1], 10);
  }
}

// Set environment variables for test
process.env.CLAUDE_FLOW_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.STRYKER_DASHBOARD_API_KEY = process.env.STRYKER_DASHBOARD_API_KEY || '';

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), 'reports', 'mutation');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Build Stryker command
let strykerCmd = './node_modules/.bin/stryker run';

// Add options
if (options.target) {
  strykerCmd += ` --mutate "${options.target}"`;
}

if (options.reporters) {
  strykerCmd += ` --reporters=${options.reporters}`;
} else if (options.ci) {
  strykerCmd += ' --reporters=clear-text,progress,html';
}

if (options.concurrency) {
  strykerCmd += ` --concurrency ${options.concurrency}`;
}

if (options.ci) {
  strykerCmd += ' --fileLogLevel=error --logLevel=error';
}

// Print command and execute
console.log('Running mutation tests...');
console.log(`Command: ${strykerCmd}`);

try {
  execSync(strykerCmd, { stdio: 'inherit' });
  console.log('Mutation testing completed successfully.');
  
  // Open report in browser if not in CI
  if (!options.ci && process.platform === 'darwin') {
    try {
      execSync('open reports/mutation/mutation.html');
    } catch (err) {
      console.log('Could not open report automatically. Find it at: reports/mutation/mutation.html');
    }
  }
} catch (error) {
  console.error('Mutation testing failed with exit code:', error.status);
  process.exit(error.status);
}