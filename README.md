# 🌊 FlowX: Advanced AI Agent Orchestration Platform

<div align="center">

[![🌟 Star on GitHub](https://img.shields.io/github/stars/sethdford/flowx?style=for-the-badge&logo=github&color=gold)](https://github.com/sethdford/flowx)
[![📦 NPX Ready](https://img.shields.io/npm/v/flowx?style=for-the-badge&logo=npm&color=blue&label=v1.0.0)](https://www.npmjs.com/package/flowx)
[![⚡ Claude Code](https://img.shields.io/badge/Claude%20Code-Ready-green?style=for-the-badge&logo=anthropic)](https://github.com/sethdford/flowx)
[![🦕 Multi-Runtime](https://img.shields.io/badge/Runtime-Node%20%7C%20Deno-blue?style=for-the-badge&logo=javascript)](https://github.com/sethdford/flowx)
[![⚡ TypeScript](https://img.shields.io/badge/TypeScript-Full%20Support-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![🛡️ MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=opensourceinitiative)](https://opensource.org/licenses/MIT)

</div>

## 🎯 **Transform Your Development Workflow**

**FlowX** is the ultimate orchestration platform that revolutionizes how you work with Claude Code. Coordinate **multiple AI agents** simultaneously, manage complex workflows, and build sophisticated applications with AI-powered development.

> 🔥 **One command to rule them all**: `npx flowx@latest init --sparc` - Deploy a full AI agent coordination system in seconds!


## 🚀 **What's New in v1.0.0**

### 🎯 **Claude Code Settings Optimization**
- **✅ Auto-Settings Creation**: `init` command now creates `.claude/settings.json` with automation-optimized settings
- **✅ Extended Timeouts**: 5-minute default, 10-minute max for Bash commands (300s/600s)
- **✅ Full Tool Permissions**: All tools allowed with wildcards `(*)` for complete automation
- **✅ Large Output Support**: 500KB character limit for handling extensive outputs
- **✅ Automation Features**: Parallel execution, batch operations, and auto-save to memory enabled

### 🔧 **Enhanced SPARC Integration**
- **✅ Better Prompts**: SPARC and swarm prompts now emphasize batch tools and memory usage
- **✅ Memory First**: All modes now save to memory after each step for better coordination
- **✅ Agent Clarity**: Swarm prompts specify exact agent counts and immediate execution
- **✅ Task Tracking**: Added visual progress indicators and task format to all prompts
- **✅ Action-Oriented**: Changed from planning to immediate execution language

### 🚀 **Developer Experience**
- **✅ Zero Configuration**: Optimal settings applied automatically on init
- **✅ Long Operations**: Support for extended running tasks without timeouts
- **✅ Better Reliability**: Auto-accept for Claude Code warnings in swarm mode
- **✅ Version Consistency**: All components updated to v1.0.0

---

## ⚡ **Quick Start** 

### 🚀 **Instant Setup**
```bash
# Install and initialize with SPARC development environment
npx flowx@latest init --sparc

# Use the local wrapper (created by init)
./flowx start --ui --port 3000

# Run SPARC commands
./flowx sparc "build a REST API"
```

### 🎛️ **SPARC Development Modes** (17 Specialized Agents)
```bash
# List all available SPARC modes
./flowx sparc modes

# Run specific development workflows
./flowx sparc run coder "implement user authentication"
./flowx sparc run architect "design microservice architecture"
./flowx sparc tdd "create test suite for API"
```

## 🏗️ **Core Features**

### 🤖 **Multi-Agent Orchestration**
- **Parallel Execution**: Run up to 10 agents concurrently with BatchTool
- **Smart Coordination**: Intelligent task distribution and load balancing
- **Memory Sharing**: Persistent knowledge bank across all agents
- **Real-time Monitoring**: Live dashboard for agent status and progress

### 🧠 **SPARC Development Framework**
- **17 Specialized Modes**: Architect, Coder, TDD, Security, DevOps, and more
- **Workflow Orchestration**: Complete development lifecycle automation
- **Interactive & Non-interactive**: Flexible execution modes
- **Boomerang Pattern**: Iterative development with continuous refinement

### 📊 **Advanced Monitoring & Analytics**
- **System Health Dashboard**: Real-time metrics and performance tracking
- **Task Coordination**: Dependency management and conflict resolution
- **Terminal Pool Management**: Efficient resource utilization
- **Coverage Reports**: Comprehensive test and code coverage analysis

---

## 🛠️ **Installation & Setup**

### **Method 1: Quick Start with NPX (Recommended)**
```bash
# Initialize with full SPARC environment
npx flowx@latest init --sparc

# This creates:
# ✓ Local ./flowx wrapper script
# ✓ .claude/ directory with configuration
# ✓ CLAUDE.md (project instructions for Claude Code)
# ✓ .roomodes (17 pre-configured SPARC modes)
# ✓ Swarm command documentation

# Start using immediately
./flowx start --ui --port 3000
```

### **Method 2: Global Installation**
```bash
# Install globally
npm install -g flowx

# Initialize anywhere
flowx init --sparc

# Use directly
flowx start --ui
```

### **Method 3: Local Project Installation**
```bash
# Add to project
npm install flowx --save-dev

# Initialize
npx flowx init --sparc

# Use with local wrapper
./flowx start --ui
```

---

## 🎮 **Usage Examples**

### 🚀 **Basic Operations**
```bash
# Check system status
./flowx status

# Start orchestration with Web UI
./flowx start --ui --port 3000

# Check MCP server status
./flowx mcp status

# Manage agents
./flowx agent spawn researcher --name "DataBot"
./flowx agent info agent-123
./flowx agent terminate agent-123
```

### 🔥 **Advanced Workflows**

#### **Multi-Agent Development**
```bash
# Deploy swarm for full-stack development
./flowx swarm "Build e-commerce platform" \
  --strategy development \
  --max-agents 5 \
  --parallel \
  --monitor

# BatchTool parallel development
batchtool run --parallel \
  "./flowx sparc run architect 'design user auth'" \
  "./flowx sparc run code 'implement login API'" \
  "./flowx sparc run tdd 'create auth tests'" \
  "./flowx sparc run security-review 'audit auth flow'"
```

#### **SPARC Development Modes**
```bash
# Complete development workflow
./flowx sparc run ask "research best practices for microservices"
./flowx sparc run architect "design scalable architecture"
./flowx sparc run code "implement user service"
./flowx sparc run tdd "create comprehensive test suite"
./flowx sparc run integration "integrate all services"
./flowx sparc run devops "setup CI/CD pipeline"
```

#### **Memory & Coordination**
```bash
# Store and query project knowledge
./flowx memory store requirements "User auth with JWT"
./flowx memory store architecture "Microservice design patterns"
./flowx memory query auth

# Task coordination
./flowx task create research "Market analysis for AI tools"
./flowx task workflow examples/development-pipeline.json
```

---

## 📋 **Available Commands**

### **Core Commands**
| Command | Description | Example |
|---------|-------------|---------|
| `init` | Initialize project with Claude integration | `./flowx init --sparc` |
| `start` | Start orchestration system | `./flowx start --ui` |
| `status` | Show system health and metrics | `./flowx status` |
| `agent` | Manage AI agents and hierarchies | `./flowx agent spawn researcher` |
| `swarm` | Advanced multi-agent coordination | `./flowx swarm "Build API" --parallel` |

### **SPARC Development Modes**
| Mode | Purpose | Example |
|------|---------|---------|
| `architect` | System design and architecture | `./flowx sparc run architect "design API"` |
| `code` | Code development and implementation | `./flowx sparc run code "user authentication"` |
| `tdd` | Test-driven development | `./flowx sparc run tdd "payment system"` |
| `security-review` | Security auditing and analysis | `./flowx sparc run security-review "auth flow"` |
| `integration` | System integration and testing | `./flowx sparc run integration "microservices"` |
| `devops` | Deployment and CI/CD | `./flowx sparc run devops "k8s deployment"` |

### **Memory & Coordination**
| Command | Description | Example |
|---------|-------------|---------|
| `memory store` | Store information in knowledge bank | `./flowx memory store key "value"` |
| `memory query` | Search stored information | `./flowx memory query "authentication"` |
| `task create` | Create and manage tasks | `./flowx task create research "AI trends"` |
| `monitor` | Real-time system monitoring | `./flowx monitor --dashboard` |

### **Enterprise Commands**
| Command | Description | Example |
|---------|-------------|---------|
| `project` | Project lifecycle management | `./flowx project create "API Project" --type web-app` |
| `deploy` | Deployment automation & strategies | `./flowx deploy create "v1.2.0" --strategy blue-green` |
| `cloud` | Multi-cloud infrastructure management | `./flowx cloud resources create "web-server" compute` |
| `security` | Security scanning & compliance | `./flowx security scan "Vulnerability Check" ./src` |
| `analytics` | Performance analytics & insights | `./flowx analytics insights --timerange 7d` |
| `audit` | Enterprise audit logging | `./flowx audit report compliance --framework SOC2` |

---

## 🏗️ **Architecture Overview**

### **Multi-Layer Agent System**
```
┌─────────────────────────────────────────────────────────┐
│                 BatchTool Orchestrator                  │
├─────────────────────────────────────────────────────────┤
│  Agent 1    Agent 2    Agent 3    Agent 4    Agent 5   │
│ Architect │   Coder   │   TDD    │ Security │  DevOps   │
├─────────────────────────────────────────────────────────┤
│              Shared Memory Bank & Coordination          │
├─────────────────────────────────────────────────────────┤
│         Terminal Pool & Resource Management             │
├─────────────────────────────────────────────────────────┤
│              Claude Code Integration Layer              │
└─────────────────────────────────────────────────────────┘
```

### **Key Components**
- **🎛️ Orchestrator**: Central coordination and task distribution
- **🤖 Agent Pool**: Specialized AI agents for different domains
- **🧠 Memory Bank**: Persistent knowledge sharing across agents
- **📊 Monitor**: Real-time metrics and health monitoring
- **🔗 MCP Server**: Model Context Protocol for tool integration

---

## 🧪 **Testing & Quality Assurance**

### **Comprehensive Test Coverage**
```bash
# Run full test suite
npm test

# Run specific test categories
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests

# Generate coverage reports
npm run test:coverage

# Lint and typecheck
npm run lint
npm run typecheck
```

### **Quality Metrics (v1.0.0)**
- **✅ Project-Focused**: CLAUDE.md explicitly guides building user applications
- **✅ Clear Instructions**: No confusion about modifying flowx itself
- **✅ Real Examples**: All documentation shows building actual applications
- **✅ NPM Publishing**: Fully compatible with npx and global installation
- **✅ Cross-Platform**: Windows, Mac, and Linux support

---

## 📚 **Documentation & Resources**

### **Getting Started**
- [🚀 Quick Start Guide](./docs/quick-start.md)
- [⚙️ Configuration Options](./docs/configuration.md)
- [🤖 Agent Management](./docs/agents.md)
- [🧠 SPARC Development](./docs/sparc-modes.md)

### **Advanced Topics**
- [🔧 BatchTool Integration](./docs/batchtool.md)
- [📊 Monitoring & Analytics](./docs/monitoring.md)
- [🔗 MCP Server Setup](./docs/mcp-integration.md)
- [🔒 Security Best Practices](./docs/security.md)

### **API Reference**
- [📖 Command Reference](./docs/commands.md)
- [🎛️ Configuration Schema](./docs/config-schema.md)
- [🔌 Plugin Development](./docs/plugins.md)
- [🛠️ Troubleshooting](./docs/troubleshooting.md)

---

## 🤝 **Contributing**

We welcome contributions! Here's how to get started:

### **Development Setup**
```bash
# Clone the repository
git clone https://github.com/sethdford/flowx.git
cd flowx

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Link for local development
npm link
```

### **Contributing Guidelines**
- 🐛 **Bug Reports**: Use GitHub issues with detailed reproduction steps
- 💡 **Feature Requests**: Propose new features with use cases
- 🔧 **Pull Requests**: Follow our coding standards and include tests
- 📚 **Documentation**: Help improve docs and examples

---

## 🔄 **Project Evolution**

FlowX represents a **complete architectural rewrite** of the original concept pioneered in [claude-code-flow](https://github.com/ruvnet/claude-code-flow). While the original repository demonstrated the power and potential of AI agent orchestration, it also revealed the challenges of rapid "vibe coding" development.

### **From Concept to Production**

**Original Vision (claude-code-flow)**: 
- ✅ Pioneered multi-agent AI orchestration
- ✅ Demonstrated SPARC methodology effectiveness  
- ✅ Proved the viability of autonomous development workflows
- ❌ Suffered from technical debt and architectural inconsistencies
- ❌ Lacked systematic engineering practices

**FlowX Evolution**:
- 🎯 **Zero Technical Debt Policy**: Every component follows strict architectural standards
- 🏗️ **Enterprise-Grade Architecture**: Production-ready from day one
- 🔒 **Type Safety**: 100% TypeScript with comprehensive error handling
- 🧪 **Test-Driven Development**: Comprehensive test coverage and validation
- 📚 **Documentation-First**: Clear, maintainable, and extensible codebase

> **"FlowX takes the brilliant concepts from claude-code-flow and rebuilds them with the engineering discipline they deserved from the start."**

The original repository stands as both inspiration and cautionary tale - proof that revolutionary ideas need revolutionary execution to reach their full potential.

---

## 📄 **License**

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🎉 **Acknowledgments**

- **rUv & claude-code-flow**: For pioneering the AI agent orchestration concept and proving its viability
- **Anthropic**: For the amazing Claude AI that powers this platform
- **Node.js Team**: For the excellent JavaScript runtime
- **Open Source Community**: For contributions and feedback
- **SPARC Methodology**: For the structured development approach

---

<div align="center">

### **🚀 Ready to transform your development workflow?**

```bash
npx flowx@latest init --sparc
```

**Join thousands of developers already using FlowX!**

[![GitHub](https://img.shields.io/badge/GitHub-sethdford/flowx-blue?style=for-the-badge&logo=github)](https://github.com/sethdford/flowx)
[![NPM](https://img.shields.io/badge/NPM-flowx-red?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/flowx)
[![Discord](https://img.shields.io/badge/Discord-Join%20Community-purple?style=for-the-badge&logo=discord)](https://discord.gg/flowx)

---

**Built with ❤️ by [Seth D. Ford](https://github.com/sethdford) | Powered by Claude AI**

</div>
