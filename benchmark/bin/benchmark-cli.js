#!/usr/bin/env node

/**
 * Command-line interface for running benchmarks directly.
 * This script allows running benchmarks without going through the claude-flow CLI.
 */

// This is a CommonJS wrapper script that loads the compiled benchmark-cli.js from dist
require('../dist/bin/benchmark-cli.js');