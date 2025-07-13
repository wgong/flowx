/**
 * Claude.md template generators
 * Functions to create different types of claude.md files
 */

export function createSparcClaudeMd(projectName, config = {}) {
  return `# ${projectName} - SPARC Methodology

## Project Overview
This project follows the SPARC methodology for structured AI development.

## SPARC Structure
- **S**pecification: Define clear requirements
- **P**seudocode: Plan the implementation
- **A**rchitecture: Design the system structure
- **R**eview: Validate the approach
- **C**ode: Implement the solution

## Configuration
${JSON.stringify(config, null, 2)}

## Development Guidelines
- Follow SPARC methodology for all features
- Maintain clear documentation
- Use structured problem-solving approach
`;
}

export function createFullClaudeMd(projectName, config = {}) {
  return `# ${projectName} - Claude Flow Project

## Project Overview
Full-featured Claude Flow project with comprehensive AI agent integration.

## Features
- Multi-agent coordination
- Advanced workflow management
- Neural pattern recognition
- Hive-mind collective intelligence
- Real-time monitoring and analytics

## Configuration
${JSON.stringify(config, null, 2)}

## Agent Types
- Coordinator: Manages overall workflow
- Researcher: Gathers and analyzes information
- Coder: Implements solutions
- Reviewer: Validates code quality
- Optimizer: Improves performance

## Usage
\`\`\`bash
claude-flow start
claude-flow agent spawn researcher --name "DataBot"
claude-flow task create research "Analyze market trends"
\`\`\`
`;
}

export function createMinimalClaudeMd(projectName, config = {}) {
  return `# ${projectName}

## Overview
Minimal Claude Flow project setup.

## Configuration
${JSON.stringify(config, null, 2)}

## Quick Start
\`\`\`bash
claude-flow init
claude-flow start
\`\`\`
`;
} 