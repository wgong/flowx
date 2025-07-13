/**
 * README template generators
 * Functions to create various README files
 */

export function createAgentsReadme(projectName, config = {}) {
  return `# ${projectName} - Agents

## Overview
AI agents for automated task execution and workflow management.

## Configuration
${JSON.stringify(config, null, 2)}

## Available Agents

### Core Agents
- **Coordinator**: Manages overall workflow and task distribution
- **Researcher**: Gathers and analyzes information from various sources
- **Coder**: Implements solutions and writes code
- **Reviewer**: Validates code quality and provides feedback
- **Tester**: Runs tests and validates functionality

### Specialized Agents
- **Architect**: Designs system architecture and technical solutions
- **Optimizer**: Improves performance and efficiency
- **Documenter**: Creates and maintains documentation
- **Monitor**: Tracks system health and performance metrics
- **Security**: Handles security analysis and compliance

### Advanced Agents
- **Analyst**: Performs data analysis and reporting
- **DevOps**: Manages deployment and infrastructure
- **Specialist**: Domain-specific expertise agents

## Usage
\`\`\`bash
# List available agents
claude-flow agent list

# Spawn a new agent
claude-flow agent spawn researcher --name "DataBot"

# Assign task to agent
claude-flow agent assign "agent-id" "task-id"

# Monitor agent performance
claude-flow agent status "agent-id"

# Stop agent
claude-flow agent stop "agent-id"
\`\`\`

## Agent Capabilities
Each agent has specific capabilities and can be configured for different tasks:

- **Skills**: What the agent can do
- **Knowledge**: Domain expertise
- **Tools**: Available integrations
- **Constraints**: Operational limits
- **Preferences**: Optimization settings
`;
}

export function createSessionsReadme(projectName, config = {}) {
  return `# ${projectName} - Sessions

## Overview
Session management for agent interactions and workflow execution.

## Configuration
${JSON.stringify(config, null, 2)}

## Session Types

### Interactive Sessions
- Real-time agent interaction
- Command-line interface
- Web console access
- Direct agent communication

### Batch Sessions
- Automated workflow execution
- Scheduled task processing
- Bulk operations
- Background processing

### Collaborative Sessions
- Multi-agent coordination
- Shared workspace
- Real-time collaboration
- Consensus building

## Usage
\`\`\`bash
# Start interactive session
claude-flow session start --type interactive

# Create batch session
claude-flow session create --type batch --workflow "workflow.json"

# Join collaborative session
claude-flow session join "session-id"

# List active sessions
claude-flow session list

# End session
claude-flow session end "session-id"
\`\`\`

## Session Features
- **Persistence**: Sessions maintain state across interactions
- **Recovery**: Automatic session recovery after failures
- **Monitoring**: Real-time session metrics and logging
- **Security**: Authentication and authorization
- **Scaling**: Dynamic resource allocation
`;
} 