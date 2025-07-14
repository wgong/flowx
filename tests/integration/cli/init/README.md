# Integration Tests for Init Command

## Error Resolution

These tests were failing with `ENOENT: no such file or directory, uv_cwd` errors. The following issues have been addressed:

### Import Path Issues
- Fixed imports from `@std/...` to use proper URLs (`https://deno.land/std/...`)

### File System and Working Directory Handling
- Added proper error handling for Deno's `cwd()` and `chdir()` operations
- Created helper utilities in `tests/helpers/deno-fs-utils.ts` for safely handling directory operations
- Added test environment information utilities in `tests/helpers/test-environment.ts`

### Persistence Manager Improvements
- Enhanced error handling in the PersistenceManager class
- Improved directory path resolution and creation logic
- Added fallback to in-memory mode when filesystem operations fail

### Initialization Command Robustness
- Added better error handling in directory validation
- Improved project directory path resolution
- Made directory creation more resilient with recursive options

### Test Utilities
- Added retries and safe function execution patterns in `tests/helpers/error-capture.ts`
- Created test environment helpers to detect platform-specific issues

## Running Tests

To run these tests:

```bash
deno test tests/integration/cli/init/e2e-workflow.test.ts
deno test tests/integration/cli/init/selective-modes.test.ts
deno test tests/integration/cli/init/full-init-flow.test.ts
```

Or run all tests in this directory:

```bash
deno test tests/integration/cli/init/
```