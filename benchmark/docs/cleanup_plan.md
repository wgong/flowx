# Benchmark Directory Cleanup Plan

## Overview

The current benchmark directory contains a mix of old and new code, duplicate functionality, inconsistent naming conventions, and scattered documentation. This plan outlines how to clean up the directory while preserving important functionality.

## 1. Dead Code Removal

### Files to Remove (Old Implementation)

- `/benchmark/src/swarm_benchmark/core/benchmark_engine.py` - Replaced by unified_benchmark_engine.py
- `/benchmark/src/swarm_benchmark/core/optimized_benchmark_engine.py` - Merged into unified implementation
- `/benchmark/src/swarm_benchmark/core/real_benchmark_engine.py` - Merged into unified implementation
- `/benchmark/src/swarm_benchmark/metrics/performance_collector.py` - Replaced by unified_metrics_collector.py
- `/benchmark/src/swarm_benchmark/metrics/process_tracker.py` - Functionality moved to unified_metrics_collector.py
- `/benchmark/src/swarm_benchmark/metrics/resource_monitor.py` - Functionality moved to unified_metrics_collector.py
- `/benchmark/src/swarm_benchmark/metrics/metrics_aggregator.py` - Functionality moved to unified_metrics_collector.py
- `/benchmark/src/swarm_benchmark/output/json_writer.py` - Replaced by output_manager.py
- `/benchmark/src/swarm_benchmark/output/sqlite_manager.py` - Functionality moved to output_manager.py

### Duplicate Test Scripts to Remove

- `/benchmark/test_simple_run.py` - Covered by unit tests and examples
- `/benchmark/test_integration.py` - Replaced by proper integration tests
- `/benchmark/test_real_benchmark_engine.py` - Functionality tested in unified implementation
- `/benchmark/test_real_claude_flow.py` - Redundant with other test files
- `/benchmark/test_real_metrics.py` - Covered by unified metrics testing
- `/benchmark/test_real_simple.py` - Redundant with other test files

### Outdated Demo Files to Remove

- `/benchmark/demo_comprehensive.py` - Replaced by examples/advanced_benchmark.js
- `/benchmark/demo_real_benchmark.py` - Replaced by new example files
- `/benchmark/example_usage.py` - Replaced by examples/basic_benchmark.js
- `/benchmark/quick_test_integration.py` - No longer needed

## 2. Directory Structure Reorganization

### Source Code

- `/benchmark/src/swarm_benchmark/` - Main package
  - `/core/` - Core engine and models
  - `/plugins/` - Plugin system implementation
  - `/metrics/` - Metrics collection
  - `/utils/` - Utility functions
  - `/output/` - Output handling
  - `/cli/` - Command-line interface

### Tests

- `/benchmark/tests/` - Test directory
  - `/unit/` - Unit tests
  - `/integration/` - Integration tests
  - `/fixtures/` - Test fixtures and data

### Examples and Documentation

- `/benchmark/examples/` - Example usage
- `/benchmark/docs/` - Documentation
  - Consolidate duplicate and outdated docs into core docs

### Report Storage

- `/benchmark/reports/` - Benchmark reports (preserve for reference)
- `/benchmark/demo_reports/` - Demo reports (preserve for reference)

## 3. Documentation Consolidation

### Primary Documentation Files

- `/benchmark/README.md` - Main documentation
- `/benchmark/docs/usage.md` - Usage documentation
- `/benchmark/docs/api.md` - API documentation
- `/benchmark/docs/plugins.md` - Plugin system documentation
- `/benchmark/docs/cli.md` - CLI documentation
- `/benchmark/MIGRATION.md` - Migration guide from old to new system

### Documentation to Consolidate/Remove

- `/benchmark/IMPLEMENTATION_SUMMARY.md` - Content moved to docs
- `/benchmark/REAL_BENCHMARK_SUMMARY.md` - Relevant parts moved to docs
- `/benchmark/docs/*.md` - Review and consolidate duplicates
- `/benchmark/plans/*.md` - Review and incorporate into main docs

## 4. Additional Improvements

### File Naming Conventions

- Use snake_case for Python files
- Use kebab-case for documentation files
- Use consistent naming patterns (unified_*, etc.)

### Dependency Management

- Update requirements in `setup.py` and `package.json`
- Remove unused dependencies
- Add new dependencies required by the unified implementation

### Build System

- Ensure TypeScript compilation works for new files
- Add build scripts for both Python and TypeScript code

## Implementation Priority

1. Backup current code (separately)
2. Remove identified dead code
3. Reorganize directory structure
4. Consolidate documentation
5. Update build system
6. Test the cleaned-up implementation

## Backward Compatibility

The unified implementation provides backward compatibility through:

1. The migration guide in `/benchmark/MIGRATION.md`
2. Compatibility layers in the API
3. Example usage to demonstrate migration from old to new patterns