# FlowX Code Coverage Report

Generated on July 7, 2025, 6:00:00 PM

## Overall Coverage

| Metric | Coverage | Threshold | Status |
| ------ | -------- | --------- | ------ |
| Statements | 78.90% | 80% | ❌ |
| Branches | 70.00% | 80% | ❌ |
| Functions | 77.90% | 80% | ❌ |
| Lines | 78.90% | 80% | ❌ |

## Detailed Coverage by File

### ⚠️ Files Below Threshold

| File | Statements | Branches | Functions | Lines |
| ---- | ---------- | -------- | --------- | ----- |
| src/swarm/sparc-executor.js | 59.60% | 50.00% | 58.30% | 60.50% |
| src/task/commands.js | 64.10% | 57.10% | 61.10% | 64.80% |
| src/task/coordination.js | 66.40% | 61.90% | 63.20% | 67.20% |
| src/memory/indexer.js | 66.90% | 59.40% | 66.70% | 68.10% |
| src/task/engine.js | 69.10% | 63.40% | 66.70% | 70.30% |
| src/swarm/coordinator.js | 69.00% | 59.70% | 69.20% | 69.70% |
| src/memory/manager.js | 70.60% | 66.30% | 67.90% | 72.00% |
| src/memory/backends/sqlite.js | 73.40% | 64.60% | 71.40% | 74.20% |
| src/core/logger.js | 75.80% | 66.70% | 75.00% | 76.90% |

### All Files

| File | Statements | Branches | Functions | Lines |
| ---- | ---------- | -------- | --------- | ----- |
| src/swarm/sparc-executor.js | 59.60% | 50.00% | 58.30% | 60.50% |
| src/task/commands.js | 64.10% | 57.10% | 61.10% | 64.80% |
| src/task/coordination.js | 66.40% | 61.90% | 63.20% | 67.20% |
| src/memory/indexer.js | 66.90% | 59.40% | 66.70% | 68.10% |
| src/task/engine.js | 69.10% | 63.40% | 66.70% | 70.30% |
| src/swarm/coordinator.js | 69.00% | 59.70% | 69.20% | 69.70% |
| src/memory/manager.js | 70.60% | 66.30% | 67.90% | 72.00% |
| src/memory/backends/sqlite.js | 73.40% | 64.60% | 71.40% | 74.20% |
| src/core/logger.js | 75.80% | 66.70% | 75.00% | 76.90% |
| src/swarm/types.js | 82.40% | 75.00% | 83.30% | 82.40% |
| src/task/index.js | 85.40% | 81.30% | 83.30% | 85.40% |
| src/memory/distributed-memory.js | 86.20% | 83.70% | 87.50% | 86.80% |
| src/core/event-bus.js | 94.60% | 92.90% | 94.10% | 95.50% |

## Recommendations

- ⚠️ Overall statement coverage is below the threshold. Consider adding more tests.
- ⚠️ Branch coverage is below the threshold. Add tests for conditional logic paths.
- ⚠️ Function coverage is below the threshold. Ensure all functions have tests.

### Priority Files for Test Improvement

- **src/swarm/sparc-executor.js** (59.60% covered): Focus on adding tests for conditional branches and edge cases.
- **src/task/commands.js** (64.10% covered): Several functions are not being tested. Add unit tests for each function.
- **src/task/coordination.js** (66.40% covered): Several functions are not being tested. Add unit tests for each function.
- **src/memory/indexer.js** (66.90% covered): Focus on adding tests for conditional branches and edge cases.
- **src/task/engine.js** (69.10% covered): Focus on adding tests for conditional branches and edge cases.