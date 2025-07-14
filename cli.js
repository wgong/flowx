#!/usr/bin/env node

/**
 * FlowX CLI Entry Point
 * Uses built JavaScript files from dist directory
 */

// Use built JavaScript files
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jsFile = join(__dirname, 'dist/main.js');

// Run the built JavaScript file
const child = spawn('node', [jsFile, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('exit', (code) => {
  process.exit(code || 0);
});