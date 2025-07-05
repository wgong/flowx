# 🚀 Real Agent Setup Guide

**Congratulations!** You now have access to **REAL** Claude Flow functionality with actual agent processes, Claude API integration, and task execution.

## 🔑 Prerequisites

### 1. Claude API Key
You need an Anthropic API key to use real agents:

```bash
# Set your API key (required)
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"
# OR
export CLAUDE_API_KEY="sk-ant-api03-your-key-here"
```

### 2. Optional Configuration
```bash
# Claude model selection
export CLAUDE_MODEL="claude-3-sonnet-20240229"

# Performance tuning
export CLAUDE_MAX_TOKENS=4096
export CLAUDE_TEMPERATURE=0.7
export CLAUDE_RATE_LIMIT_RPM=50
```

## 🎯 Quick Start

### 1. Spawn Your First Real Agent
```bash
# Create a backend development agent
./cli.js agent spawn backend \
  --name "BackendDev" \
  --specialization "API development" \
  --memory 512 \
  --max-tasks 3 \
  --verbose

# Create a frontend agent
./cli.js agent spawn frontend \
  --name "FrontendDev" \
  --specialization "React development" \
  --model "claude-3-sonnet-20240229"
```

### 2. List Running Agents
```bash
# See all agents (real and persisted)
./cli.js agent list

# Filter by status
./cli.js agent list --status running
```

### 3. Execute Real Tasks
```bash
# Get the agent ID from the list above
AGENT_ID="agent-1234567890-abc123"

# Execute a real task
./cli.js task run $AGENT_ID "Create a REST API endpoint for user authentication" \
  --type "development" \
  --priority 8 \
  --timeout 600 \
  --verbose \
  --output-file "task-result.json"
```

### 4. Monitor Task Progress
```bash
# List active tasks
./cli.js task list

# Check specific task status
./cli.js task status task-1234567890-xyz789

# Get task results
./cli.js task result task-1234567890-xyz789 --format json
```

## 🏗️ What's Now REAL vs Mock

### ✅ **REAL Functionality**
- **Agent Process Spawning**: Creates actual Node.js child processes
- **Claude API Integration**: Real communication with Anthropic's Claude
- **Task Execution**: Agents receive and process actual tasks
- **Memory Persistence**: SQLite database with real data storage
- **Process Management**: Real PID tracking, lifecycle management
- **Inter-Process Communication**: Actual message passing between processes
- **Rate Limiting**: Real API rate limiting and queue management
- **Error Handling**: Production-grade error recovery

### 🔧 **Enhanced Features**
- **Agent Specialization**: Agents can be specialized for different roles
- **Resource Management**: Memory limits, concurrent task controls
- **Configuration Management**: Real file-based configuration persistence
- **Monitoring**: Real-time agent health and performance metrics
- **Task Queuing**: Actual task distribution and load balancing

## 🛠️ Advanced Usage

### Complex Task with File Operations
```bash
# Create a task definition file
cat > complex-task.json << EOF
{
  "type": "development",
  "description": "Create a complete user management system",
  "priority": 10,
  "timeout": 1800,
  "requirements": {
    "framework": "Express.js",
    "database": "PostgreSQL",
    "authentication": "JWT",
    "testing": "Jest"
  },
  "files": [
    {
      "path": "package.json",
      "operation": "read"
    }
  ]
}
EOF

# Execute the complex task
./cli.js task file $AGENT_ID complex-task.json --verbose
```

### Multi-Agent Coordination
```bash
# Spawn multiple specialized agents
./cli.js agent spawn backend --name "API-Dev" --specialization "REST APIs"
./cli.js agent spawn frontend --name "UI-Dev" --specialization "React components"
./cli.js agent spawn test --name "QA-Dev" --specialization "Test automation"

# Distribute related tasks across agents
./cli.js task run $API_AGENT "Create user authentication API"
./cli.js task run $UI_AGENT "Create login form component"
./cli.js task run $QA_AGENT "Write integration tests for auth flow"
```

### Agent Management
```bash
# Check agent status
./cli.js agent status $AGENT_ID

# Restart a problematic agent
./cli.js agent restart $AGENT_ID

# Stop an agent gracefully
./cli.js agent stop $AGENT_ID

# Force stop an unresponsive agent
./cli.js agent stop $AGENT_ID --force

# View agent logs
./cli.js agent logs $AGENT_ID --follow
```

## 📊 Monitoring & Debugging

### System Status
```bash
# Overall system health
./cli.js status --resources

# Real-time monitoring
./cli.js monitor system

# Memory statistics
./cli.js memory stats --detailed
```

### Performance Tuning
```bash
# Check agent performance
./cli.js agent list --format json | jq '.[] | {id, status, tasksCompleted, memoryUsage, cpuUsage}'

# Monitor task execution times
./cli.js task list --format json | jq '.[] | {id, duration, status}'
```

## 🔧 Troubleshooting

### Common Issues

1. **"Claude API key not found"**
   ```bash
   # Make sure your API key is set
   echo $ANTHROPIC_API_KEY
   # If empty, set it:
   export ANTHROPIC_API_KEY="your-key-here"
   ```

2. **"Agent not responding"**
   ```bash
   # Check agent status
   ./cli.js agent status $AGENT_ID
   
   # Restart if needed
   ./cli.js agent restart $AGENT_ID
   ```

3. **"Task timeout"**
   ```bash
   # Increase timeout for complex tasks
   ./cli.js task run $AGENT_ID "complex task" --timeout 1800
   ```

4. **"Rate limit exceeded"**
   ```bash
   # Check current rate limits
   ./cli.js status --resources
   
   # Reduce concurrent tasks
   export CLAUDE_RATE_LIMIT_RPM=30
   ```

### Debug Mode
```bash
# Enable verbose logging
export LOG_LEVEL=debug
export VERBOSE_LOGGING=true

# Run commands with debug output
./cli.js agent spawn backend --verbose
```

## 🎉 Success Verification

Run this complete test to verify everything is working:

```bash
#!/bin/bash
echo "🧪 Testing Real Claude Flow Functionality..."

# 1. Spawn an agent
echo "1. Spawning test agent..."
AGENT_ID=$(./cli.js agent spawn general --name "TestAgent" --verbose | grep "agent-" | cut -d'(' -f2 | cut -d')' -f1)
echo "   Agent ID: $AGENT_ID"

# 2. Verify agent is running
echo "2. Checking agent status..."
./cli.js agent list --status running

# 3. Execute a simple task
echo "3. Executing test task..."
TASK_ID=$(./cli.js task run $AGENT_ID "Write a simple hello world function in JavaScript" --verbose | grep "task-" | cut -d' ' -f3)
echo "   Task ID: $TASK_ID"

# 4. Check task result
echo "4. Checking task result..."
./cli.js task result $TASK_ID

# 5. Cleanup
echo "5. Cleaning up..."
./cli.js agent stop $AGENT_ID

echo "✅ Test complete! If you see real results above, everything is working!"
```

## 🚀 Next Steps

Now that you have real agent functionality:

1. **Experiment with different agent types**: backend, frontend, devops, test, security
2. **Try complex multi-step tasks**: Full application development
3. **Set up agent coordination**: Multiple agents working together
4. **Monitor performance**: Use the monitoring tools to optimize
5. **Build workflows**: Chain tasks together for complex operations

**You now have a fully functional AI agent orchestration system!** 🎉 