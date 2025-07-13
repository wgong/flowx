/**
 * Memory Bank template generators
 * Functions to create memory bank documentation
 */

export function createFullMemoryBankMd(projectName, config = {}) {
  return `# ${projectName} - Memory Bank

## Overview
Comprehensive memory management system for AI agents with persistent storage and retrieval capabilities.

## Features
- Persistent memory storage
- Semantic search capabilities
- Memory categorization and tagging
- Cross-agent memory sharing
- Memory lifecycle management
- Performance optimization

## Configuration
${JSON.stringify(config, null, 2)}

## Memory Types
- **Episodic**: Event-based memories
- **Semantic**: Knowledge and facts
- **Procedural**: Skills and processes
- **Working**: Temporary task-specific data

## Usage
\`\`\`bash
# Store memory
claude-flow memory store "key" "value" --type semantic

# Retrieve memory
claude-flow memory get "key"

# Search memories
claude-flow memory search "query" --type episodic

# List all memories
claude-flow memory list --category tasks
\`\`\`

## API Reference
- \`store(key, value, options)\`: Store new memory
- \`retrieve(key)\`: Get specific memory
- \`search(query, filters)\`: Search memories
- \`update(key, value)\`: Update existing memory
- \`delete(key)\`: Remove memory
`;
}

export function createMinimalMemoryBankMd(projectName, config = {}) {
  return `# ${projectName} - Memory Bank

## Overview
Basic memory storage for AI agents.

## Configuration
${JSON.stringify(config, null, 2)}

## Usage
\`\`\`bash
claude-flow memory store "key" "value"
claude-flow memory get "key"
\`\`\`
`;
} 