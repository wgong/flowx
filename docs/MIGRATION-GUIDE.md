# Migration Guide: Claude-Flow to FlowX

This guide is designed to help users transition smoothly from Claude-Flow to FlowX. It covers all the necessary steps and changes needed to upgrade your projects and workflows.

## Table of Contents
1. [Introduction](#introduction)
2. [Command-Line Changes](#command-line-changes)
3. [Configuration Files](#configuration-files)
4. [API Changes](#api-changes)
5. [Directory Structure](#directory-structure)
6. [Scripting and Automation](#scripting-and-automation)
7. [Troubleshooting](#troubleshooting)

## Introduction

FlowX is the next evolution of Claude-Flow, offering improved stability, performance, and features. This rebranding and upgrade marks a significant milestone in the project's development.

Key improvements in FlowX include:
- Enhanced performance and stability
- Better integration with Claude Code
- Improved multi-agent orchestration
- More consistent API design
- Expanded documentation and examples

## Command-Line Changes

### Executable Name

The primary change is the executable name:

**Old:**
```bash
./claude-flow <command> [options]
```

**New:**
```bash
./flowx <command> [options]
```

For backward compatibility, both `claude-flow` and `flowx` commands are supported in this release, but future versions may deprecate the `claude-flow` command.

### Package References

If you've installed the package globally or as a dependency:

**Old:**
```bash
npm install -g claude-flow
npx claude-flow <command>
```

**New:**
```bash
npm install -g flowx
npx flowx <command>
```

### Automated Migration

You can use the built-in migration utility to update your scripts and configurations:

```bash
./flowx migrate
```

This will scan your project for claude-flow references and offer to update them to flowx.

## Configuration Files

### Directory Changes

Configuration directory has been updated:

**Old:**
```
./.claude-flow/
```

**New:**
```
./.flowx/
```

The initialization command will automatically create the new directory structure:

```bash
./flowx init --migrate
```

This will copy configuration from `.claude-flow` to `.flowx` if it exists.

### Configuration Format

Configuration file formats remain the same, but references to Claude-Flow in the content should be updated to FlowX:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "platform": "flowx",
  "settings": {
    // Settings remain the same
  }
}
```

## API Changes

For developers using the JavaScript/TypeScript API directly:

### Package Imports

**Old:**
```javascript
import { Orchestrator } from 'claude-flow';
```

**New:**
```javascript
import { Orchestrator } from 'flowx';
```

### Class and Method Names

Most class and method names remain the same, but any with explicit Claude-Flow references have been updated:

**Old:**
```javascript
const agent = new ClaudeFlowAgent();
agent.initializeClaudeFlow();
```

**New:**
```javascript
const agent = new FlowXAgent();
agent.initializeFlowX();
```

## Directory Structure

When initializing a new project, the directory structure is now:

```
my-project/
├── .flowx/
│   ├── config.json
│   ├── settings.json
│   └── commands/
├── memory/
│   ├── agents/
│   └── sessions/
└── flowx
```

## Scripting and Automation

If you have scripts or CI/CD pipelines that reference `claude-flow`, update them to use `flowx` instead:

**Old:**
```bash
#!/bin/bash
./claude-flow start --ui
./claude-flow sparc "Build an API"
```

**New:**
```bash
#!/bin/bash
./flowx start --ui
./flowx sparc "Build an API"
```

## Troubleshooting

### Common Issues

1. **Command Not Found**
   
   If you see `command not found: flowx`, you may need to:
   - Run `./flowx init` in your project directory to create the local wrapper
   - Install globally with `npm install -g flowx`

2. **Configuration Not Found**
   
   If you see errors about missing configuration:
   - Run `./flowx init --migrate` to migrate your configuration
   - Check that your `.flowx` directory contains your configuration files

3. **API Reference Errors**
   
   If you're using the API directly and encounter errors:
   - Update all imports from 'claude-flow' to 'flowx'
   - Check class and method names for any remaining Claude-Flow references

### Support

If you encounter any issues during migration, please:
- Check the [documentation](https://github.com/sethdford/flowx/docs)
- Open an issue on [GitHub](https://github.com/sethdford/flowx/issues)
- Join the [Discord community](https://discord.gg/flowx) for real-time help

## Conclusion

The migration from Claude-Flow to FlowX should be straightforward for most users. The core functionality remains the same, with improvements in performance, stability, and features.

We're excited about this next chapter and are committed to making FlowX the best AI orchestration platform available. Thank you for your continued support!