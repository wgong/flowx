#!/usr/bin/env node
/**
 * Script to clean up the benchmark directory structure.
 * This script implements the plan outlined in CLEANUP_PLAN.md.
 * 
 * Usage:
 *   node cleanup.js         # Run cleanup
 *   node cleanup.js --dry-run  # Show what would be done without making changes
 */

const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Base directory
const baseDir = path.resolve(__dirname);

// Files to remove (old implementation)
const filesToRemove = [
  // Old core files
  'src/swarm_benchmark/core/benchmark_engine.py',
  'src/swarm_benchmark/core/optimized_benchmark_engine.py',
  'src/swarm_benchmark/core/real_benchmark_engine.py',
  
  // Old metrics files
  'src/swarm_benchmark/metrics/performance_collector.py',
  'src/swarm_benchmark/metrics/process_tracker.py',
  'src/swarm_benchmark/metrics/resource_monitor.py',
  'src/swarm_benchmark/metrics/metrics_aggregator.py',
  
  // Old output files
  'src/swarm_benchmark/output/json_writer.py',
  'src/swarm_benchmark/output/sqlite_manager.py',
  
  // Old test scripts
  'test_simple_run.py',
  'test_integration.py',
  'test_real_benchmark_engine.py',
  'test_real_claude_flow.py',
  'test_real_metrics.py',
  'test_real_simple.py',
  
  // Outdated demo files
  'demo_comprehensive.py',
  'demo_real_benchmark.py',
  'example_usage.py',
  'quick_test_integration.py',
  
  // Outdated docs (will be consolidated)
  'IMPLEMENTATION_SUMMARY.md',
  'REAL_BENCHMARK_SUMMARY.md',
];

// Directories to create (if they don't exist)
const directoriesToCreate = [
  'src/swarm_benchmark/plugins',
  'src/swarm_benchmark/utils',
  'tests/unit',
  'tests/integration',
  'tests/fixtures',
  'examples',
  'docs',
];

// Files to move
const filesToMove = [
  // Move refactored files to their proper locations
  { from: 'src/swarm_benchmark/core/unified_benchmark_engine.py', to: 'src/swarm_benchmark/core/benchmark_engine.py' },
  { from: 'src/swarm_benchmark/metrics/unified_metrics_collector.py', to: 'src/swarm_benchmark/metrics/collector.py' },
  { from: 'src/swarm_benchmark/output/output_manager.py', to: 'src/swarm_benchmark/output/manager.py' },
  { from: 'src/swarm_benchmark/utils/error_handling.py', to: 'src/swarm_benchmark/utils/errors.py' },
  
  // Move example files
  { from: 'examples/basic_benchmark.js', to: 'examples/basic.js' },
  { from: 'examples/advanced_benchmark.js', to: 'examples/advanced.js' },
  
  // Move test files
  { from: 'tests/unit/test_unified_benchmark_engine.py', to: 'tests/unit/test_benchmark_engine.py' },
  { from: 'tests/unit/test_unified_metrics_collector.py', to: 'tests/unit/test_metrics_collector.py' },
  { from: 'tests/unit/test_error_handling.py', to: 'tests/unit/test_errors.py' },
  
  // Move documentation files
  { from: 'REFACTORED_IMPLEMENTATION_SUMMARY.md', to: 'docs/implementation.md' },
  { from: 'CLEANUP_PLAN.md', to: 'docs/cleanup_plan.md' },
];

// Documentation files to consolidate
const docsToConsolidate = [
  'docs/README.md',
  'docs/analysis.md',
  'docs/basic-usage.md',
  'docs/best-practices.md',
  'docs/cli-reference.md',
  'docs/coordination-modes.md',
  'docs/optimization-guide.md',
  'docs/quick-start.md',
  'docs/strategies.md',
  'docs/PARALLEL_EXECUTION.md',
  'docs/integration_guide.md',
  'docs/real-benchmark-architecture.md',
  'docs/real-benchmark-quickstart.md',
  'docs/real_metrics_collection.md',
  'plans/architecture-design.md',
  'plans/deployment-guide.md',
  'plans/implementation-plan.md',
  'plans/testing-strategy.md',
];

// Main function
async function cleanup() {
  console.log(`🧹 ${isDryRun ? 'DRY RUN: ' : ''}Starting benchmark directory cleanup...`);
  
  try {
    // Create backup of current directory (even in dry run mode)
    console.log('📦 Creating backup...');
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(baseDir, '..', `benchmark-backup-${date}`);
    
    if (!isDryRun) {
      try {
        // Use rsync for efficient copying if available
        execSync(`rsync -a "${baseDir}/" "${backupDir}/"`);
        console.log(`✅ Backup created at ${backupDir}`);
      } catch (err) {
        // Fallback to manual copying
        console.log('⚠️ rsync not available, using manual copy...');
        await fs.mkdir(backupDir, { recursive: true });
        await copyDir(baseDir, backupDir);
        console.log(`✅ Backup created at ${backupDir}`);
      }
    } else {
      console.log(`✅ Would create backup at ${backupDir}`);
    }
    
    // Create directories
    console.log('📂 Creating directories...');
    for (const dir of directoriesToCreate) {
      const dirPath = path.join(baseDir, dir);
      if (isDryRun) {
        console.log(`  Would create: ${dir}`);
      } else {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`  Created: ${dir}`);
      }
    }
    
    // Remove old files
    console.log('🗑️ Removing old files...');
    for (const file of filesToRemove) {
      const filePath = path.join(baseDir, file);
      try {
        if (isDryRun) {
          // Check if file exists
          try {
            await fs.access(filePath);
            console.log(`  Would remove: ${file}`);
          } catch {
            console.log(`  Would remove (not found): ${file}`);
          }
        } else {
          await fs.unlink(filePath);
          console.log(`  Removed: ${file}`);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`  Error ${isDryRun ? 'checking' : 'removing'} ${file}: ${err.message}`);
        } else if (!isDryRun) {
          console.log(`  File not found (already removed): ${file}`);
        }
      }
    }
    
    // Move files to their new locations
    console.log('📋 Moving files...');
    for (const { from, to } of filesToMove) {
      const fromPath = path.join(baseDir, from);
      const toPath = path.join(baseDir, to);
      
      try {
        // Check if source file exists
        try {
          await fs.access(fromPath);
        } catch (err) {
          console.log(`  Source file not found (skipping): ${from}`);
          continue;
        }
        
        if (isDryRun) {
          console.log(`  Would move: ${from} → ${to}`);
        } else {
          await fs.mkdir(path.dirname(toPath), { recursive: true });
          await fs.copyFile(fromPath, toPath);
          await fs.unlink(fromPath);
          console.log(`  Moved: ${from} → ${to}`);
        }
      } catch (err) {
        console.error(`  Error ${isDryRun ? 'checking' : 'moving'} ${from} to ${to}: ${err.message}`);
      }
    }
    
    // Consolidate documentation files
    console.log('📚 Consolidating documentation...');
    const consolidatedDocs = [];
    
    for (const doc of docsToConsolidate) {
      const docPath = path.join(baseDir, doc);
      try {
        // Check if file exists
        try {
          await fs.access(docPath);
        } catch (err) {
          console.log(`  File not found (skipping): ${doc}`);
          continue;
        }
        
        if (!isDryRun) {
          const content = await fs.readFile(docPath, 'utf-8');
          const docName = path.basename(doc);
          consolidatedDocs.push(`## From ${docName}\n\n${content}`);
          console.log(`  Added content from: ${doc}`);
        } else {
          console.log(`  Would add content from: ${doc}`);
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`  Error ${isDryRun ? 'checking' : 'reading'} ${doc}: ${err.message}`);
        }
      }
    }
    
    // Write consolidated documentation
    if (consolidatedDocs.length > 0 || isDryRun) {
      const legacyDocPath = path.join(baseDir, 'docs', 'legacy_documentation.md');
      if (isDryRun) {
        console.log(`  Would create: docs/legacy_documentation.md`);
      } else {
        await fs.writeFile(
          legacyDocPath,
          `# Legacy Documentation\n\nThis file contains consolidated documentation from older versions.\n\n${consolidatedDocs.join('\n\n---\n\n')}`
        );
        console.log(`  Created: docs/legacy_documentation.md`);
      }
    }
    
    // Create migration guide
    console.log('📝 Creating migration guide...');
    const migrationPath = path.join(baseDir, 'MIGRATION.md');
    
    if (isDryRun) {
      console.log(`  Would create: MIGRATION.md`);
    } else {
      await fs.writeFile(
        migrationPath,
        `# Benchmark System Migration Guide

## Overview

The benchmark system has been refactored to improve maintainability, performance, and extensibility. This guide explains how to migrate from the old system to the new unified architecture.

## Key Changes

1. **Unified Engine**: The three separate engines (standard, optimized, real) have been consolidated into a single unified engine with plugins
2. **Plugin System**: New plugin architecture for extending functionality
3. **Metrics Collection**: Improved metrics collection with better performance and more detail
4. **Error Handling**: Comprehensive error handling and reporting
5. **Output Management**: Flexible output format support (JSON, SQLite, CSV)

## Migration Steps

### Basic Usage

**Old Approach**:
\`\`\`python
from swarm_benchmark import run_benchmark

result = run_benchmark("Test objective", strategy="development")
\`\`\`

**New Approach**:
\`\`\`javascript
const { runBenchmark } = require('claude-flow-benchmark');

const result = await runBenchmark({
  objective: "Test objective",
  strategy: "development"
});
\`\`\`

### Advanced Configuration

**Old Approach**:
\`\`\`python
from swarm_benchmark.core.benchmark_engine import BenchmarkEngine
from swarm_benchmark.core.models import BenchmarkConfig

config = BenchmarkConfig(
    name="custom-benchmark",
    strategy="development",
    mode="centralized",
    max_agents=5,
    parallel=True
)

engine = BenchmarkEngine(config)
result = await engine.run_benchmark("Test objective")
\`\`\`

**New Approach**:
\`\`\`javascript
const { UnifiedBenchmarkEngine, BenchmarkConfig, StrategyType, CoordinationMode } = require('claude-flow-benchmark');

const config = new BenchmarkConfig();
config.name = "custom-benchmark";
config.strategy = StrategyType.DEVELOPMENT;
config.mode = CoordinationMode.CENTRALIZED;
config.max_agents = 5;
config.parallel = true;

const engine = new UnifiedBenchmarkEngine(config);
const result = await engine.run_benchmark("Test objective");
\`\`\`

### Using Plugins

**Old Approach**:
\`\`\`python
# Not directly supported in the old system
from swarm_benchmark.core.optimized_benchmark_engine import OptimizedBenchmarkEngine

engine = OptimizedBenchmarkEngine(config, enable_optimizations=True)
result = await engine.run_benchmark("Test objective")
\`\`\`

**New Approach**:
\`\`\`javascript
const { UnifiedBenchmarkEngine, OptimizationPlugin, MetricsCollectionPlugin } = require('claude-flow-benchmark');

const engine = new UnifiedBenchmarkEngine(config);
engine.add_plugin(new OptimizationPlugin());
engine.add_plugin(new MetricsCollectionPlugin());

const result = await engine.run_benchmark("Test objective");
\`\`\`

## CLI Migration

The command-line interface has been updated to provide a more consistent experience:

**Old Command**:
\`\`\`bash
python -m swarm_benchmark run "Test objective" --strategy development
\`\`\`

**New Command**:
\`\`\`bash
benchmark run "Test objective" --strategy development
\`\`\`

## File Output

Output files are now managed by the OutputManager:

**Old Approach**: Files were saved to \`./reports\` by default
**New Approach**: Files are saved to the directory specified in \`outputDirectory\` option

## Need Help?

See the full documentation in the \`docs/\` directory for more details on the new system.
`
      );
      console.log(`  Created: MIGRATION.md`);
    }
    
    console.log(`✨ Cleanup ${isDryRun ? 'dry run' : ''} completed successfully!`);
    
  } catch (err) {
    console.error(`❌ Error during cleanup ${isDryRun ? 'dry run' : ''}:`, err);
    process.exit(1);
  }
}

// Helper function to copy directories recursively
async function copyDir(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  await fs.mkdir(dest, { recursive: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Run the cleanup
cleanup().catch(console.error);