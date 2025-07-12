# Scripts Directory

This directory contains organized scripts for the Claude Flow project, maintaining zero technical debt through clean organization and single source of truth principles.

## Directory Structure

```
scripts/
├── README.md              # This file
├── install.js             # Post-install script (referenced in package.json)
├── testing/               # Test execution and benchmarking
├── coverage/              # Code coverage analysis and reporting
├── build/                 # Build and deployment scripts
├── demos/                 # Demo and example scripts
├── utils/                 # Utility and helper scripts
└── archive/               # Archived/deprecated scripts (preserved for reference)
```

## Core Scripts

### 📦 Installation
- `install.js` - Post-install script that runs after `npm install`

## Testing Scripts (`testing/`)

### 🧪 Test Execution
- `run-tests.js` - Main test runner with support for:
  - Unit tests (`--unit`)
  - E2E tests (`--e2e`) 
  - Integration tests (`--integration`)
  - Property tests (`--property`)
  - Coverage (`--coverage`)
  - CI mode (`--ci`)
  - Watch mode (`--watch`)

### 📊 Benchmarking
- `run-benchmarks.js` - Performance benchmarking
- `register-benchmark.js` - Benchmark registration utilities

## Coverage Scripts (`coverage/`)

### 📈 Coverage Analysis
- `generate-coverage-report.js` - Detailed coverage report generation
- `identify-low-coverage.js` - Low coverage identification and analysis
- `create-coverage-badge.js` - Coverage badge generation
- `coverage-report.ts` - Advanced coverage reporting utilities

## Build Scripts (`build/`)

### 🔨 Build & Deployment
- `prepare-publish.js` - Pre-publish preparation script
- `build-migration.sh` - Migration building utilities
- `build-prompt-copier.sh` - Prompt copying utilities

## Demo Scripts (`demos/`)

### 🎯 Demonstrations
- `demo-task-system.ts` - Task system demonstration
- `claude-sparc.sh` - SPARC methodology demonstration (24KB comprehensive script)

## Utility Scripts (`utils/`)

### 🛠️ Utilities
- `check-links.ts` - Link validation utilities
- `claude-wrapper.sh` - Claude CLI wrapper
- `spawn-claude-terminal.sh` - Terminal spawning utilities
- `migration-examples.ts` - Migration examples and utilities

## Archive (`archive/`)

Contains 30+ scripts that were moved during cleanup:
- Redundant test scripts
- Obsolete build scripts
- Debug/diagnostic scripts
- Experimental features

See `archive/README.md` for detailed information about archived scripts.

## Usage

### Running Tests
```bash
# All tests
npm test

# Specific test types
npm run test:unit
npm run test:e2e
npm run test:integration
npm run test:coverage

# CI mode
npm run test:ci
```

### Coverage Analysis
```bash
# Generate detailed coverage report
npm run coverage:report

# Analyze low coverage areas
npm run coverage:analyze

# Create coverage badge
npm run coverage:badge

# Open coverage report in browser
npm run coverage:open
```

### Build Operations
```bash
# Prepare for publishing
npm run prepare-publish

# Or use the prepublishOnly hook
npm publish
```

## Script Organization Principles

1. **Single Source of Truth**: Each functionality has one implementation
2. **Logical Grouping**: Scripts organized by purpose and functionality
3. **Clean Dependencies**: Clear separation between test, build, and utility scripts
4. **Preserved History**: Deprecated scripts archived, not deleted
5. **Documentation**: Each directory and script purpose clearly documented

## Maintenance

When adding new scripts:
1. Place in appropriate subdirectory based on purpose
2. Update this README if creating new categories
3. Update package.json scripts section if adding npm commands
4. Follow existing naming conventions
5. Document purpose and usage

## Migration from Old Structure

This organization was created to eliminate technical debt from the previous structure which had:
- 58 script files in root directory
- 35 test-related scripts with significant overlap
- Multiple implementations of similar functionality
- Unclear dependencies and purposes

The new structure maintains all essential functionality while providing clear organization and eliminating redundancy. 