# Claude-Flow to FlowX Migration Guide

This guide helps users migrate from Claude-Flow to FlowX.

## What's Changed

Claude-Flow has been rebranded as FlowX. This migration includes:

- Renamed CLI command from `claude-flow` to `flowx`
- Updated configuration paths from `.claude-flow/` to `.flowx/`
- Fixed several bugs and improved stability
- Enhanced test coverage for key components
- Improved error handling and dependency management

## Migration Steps

### 1. Update Executable References

If you've been using `claude-flow` in scripts or automation:

```bash
# Before
claude-flow command [options]

# After
flowx command [options]
```

For backward compatibility, `claude-flow` will continue to work during the transition period.

### 2. Configuration Files

Configuration has moved from `.claude-flow/` to `.flowx/`:

```bash
# Move your configuration files
mkdir -p .flowx
cp -r .claude-flow/* .flowx/
```

### 3. Environment Variables

Update any environment variables:

```bash
# Before
CLAUDE_FLOW_ENV=development

# After
FLOWX_ENV=development
```

### 4. API References

If you're using the API directly:

```typescript
// Before
import { ClaudeFlowError } from './utils/errors.ts';
import { createClaudeFlowTools } from './mcp/claude-flow-tools.ts';

// After
import { FlowXError } from './utils/errors.ts';
import { createFlowXTools } from './mcp/flowx-tools.ts';
```

### 5. Memory Files

Memory storage has been moved:

```bash
# Update memory database path reference
mv .claude-flow/memory.db .flowx/memory.db
```

## Breaking Changes

- Error class names have changed (e.g., `ClaudeFlowError` → `FlowXError`)
- Some internal APIs have been modified for better type safety
- Configuration paths now use `.flowx/` instead of `.claude-flow/`

## Bug Fixes

This migration includes important fixes for:

- Circular dependency detection and handling
- Circuit breaker behavior in transient network conditions
- Conflict resolution for resource management
- Enhanced Jest compatibility for testing
- Improved error reporting with more context

## Need Help?

If you encounter any issues migrating from Claude-Flow to FlowX, please:

1. Check the detailed documentation in the `docs/` directory
2. Review any error messages for specific migration guidance
3. File an issue in our GitHub repository with details about your migration challenge

We're committed to making this transition as smooth as possible!