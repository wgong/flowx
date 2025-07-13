/**
 * Coordination template generators
 * Functions to create coordination documentation
 */

export function createFullCoordinationMd(projectName, config = {}) {
  return `# ${projectName} - Agent Coordination

## Overview
Advanced multi-agent coordination system with intelligent task distribution and workflow management.

## Features
- Dynamic task assignment
- Agent capability matching
- Workflow orchestration
- Conflict resolution
- Performance monitoring
- Adaptive coordination strategies

## Configuration
${JSON.stringify(config, null, 2)}

## Coordination Strategies
- **Hierarchical**: Tree-based command structure
- **Mesh**: Peer-to-peer coordination
- **Ring**: Circular communication pattern
- **Star**: Central coordinator model
- **Hybrid**: Adaptive mixed strategies

## Agent Roles
- **Coordinator**: Manages overall workflow
- **Specialist**: Domain-specific expertise
- **Monitor**: System health and performance
- **Optimizer**: Efficiency improvements

## Usage
\`\`\`bash
# Create coordination group
claude-flow coordination create --strategy mesh --agents 5

# Assign task to group
claude-flow coordination assign-task "task-id" --group "group-id"

# Monitor coordination
claude-flow coordination status --group "group-id"

# Optimize coordination
claude-flow coordination optimize --group "group-id"
\`\`\`

## Workflow Patterns
- Sequential processing
- Parallel execution
- Pipeline processing
- Event-driven coordination
- Consensus-based decisions
`;
}

export function createMinimalCoordinationMd(projectName, config = {}) {
  return `# ${projectName} - Agent Coordination

## Overview
Basic agent coordination for task management.

## Configuration
${JSON.stringify(config, null, 2)}

## Usage
\`\`\`bash
claude-flow coordination create --agents 3
claude-flow coordination assign-task "task-id"
\`\`\`
`;
} 