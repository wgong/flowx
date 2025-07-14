#!/usr/bin/env node

/**
 * FlowX CLI Entry Point
 * Uses tsx to run TypeScript source directly for development
 */

// Use tsx to run TypeScript files directly
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsFile = join(__dirname, 'src/cli/main.ts');

// Use tsx to run the TypeScript file
const child = spawn('npx', ['tsx', tsFile, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('exit', (code) => {
  process.exit(code || 0);
});