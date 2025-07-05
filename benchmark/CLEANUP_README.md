# Benchmark System Cleanup

weThis directory contains the refactored benchmark system for claude-flow. The refactored system addresses issues with the original implementation, including code duplication, inconsistent APIs, and poor organization.

## Key Files

- `cleanup.js`: Script to clean up and reorganize the benchmark directory
- `CLEANUP_PLAN.md`: Detailed plan for directory cleanup
- `MIGRATION.md`: Guide for migrating from old to new benchmark system
- `README.md`: Main documentation for the benchmark system

## How to Run the Cleanup

Before running the cleanup, it's recommended to first run it in dry-run mode to see what changes will be made:

```bash
# Show what changes would be made without actually making them
npm run cleanup:dry
```

Once you're satisfied with the changes, run the actual cleanup:

```bash
# Perform the cleanup
npm run cleanup
```

The cleanup script will:

1. Create a backup of the current directory structure
2. Remove old/dead code files
3. Reorganize the directory structure
4. Consolidate duplicate documentation files
5. Create a migration guide for users

## After Cleanup

After running the cleanup, you should:

1. Run tests to ensure everything still works:
   ```bash
   npm test
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. Try running the benchmark CLI:
   ```bash
   npm run benchmark -- --help
   ```

4. Run the example benchmark test:
   ```bash
   npm run example:test
   ```

## Directory Structure After Cleanup

```
benchmark/
├── src/                  # Source code
│   ├── bin/              # CLI scripts
│   └── swarm_benchmark/  # Main package
│       ├── core/         # Core engine and models
│       ├── plugins/      # Plugin implementations
│       ├── metrics/      # Metrics collection
│       ├── output/       # Output handling
│       ├── utils/        # Utilities
│       └── cli/          # CLI implementation
├── dist/                 # Compiled TypeScript code
├── examples/             # Example usage
├── tests/                # Test suite
├── docs/                 # Documentation
├── reports/              # Sample benchmark reports
└── integration/          # Claude-flow integration
```

## New Features

The refactored benchmark system includes:

- **Unified Engine**: Single benchmark engine with pluggable architecture
- **Plugin System**: Extensible design with pre/post hooks
- **Improved Metrics**: Real-time performance and resource monitoring
- **Better Error Handling**: Robust error tracking and recovery
- **Multiple Output Formats**: JSON, SQLite, and CSV reporting
- **Enhanced CLI**: Modern command-line interface
- **TypeScript Support**: Full TypeScript integration