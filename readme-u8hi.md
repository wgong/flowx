
```bash
$ sudo npm install -g claude-flow
$ claude-flow --version
# 2025-07-18 07:48:10.280958: I tensorflow/core/platform/cpu_feature_guard.cc:193] This TensorFlow binary is optimized with oneAPI Deep Neural Network Library (oneDNN) to use the following CPU instructions in performance-critical operations:  AVX2 FMA
# To enable them in other operations, rebuild TensorFlow with the appropriate compiler flags.
# flowx v8.0.3


# Create default configuration file
$ sudo claude-flow config init
# Log level = info
# Maximum agents = 10
# Auto-restart on failure = Y
# MCP server port=7000
# transport=http
# Default agent type = general
# Max concurrent tasks per agent = 5
# Optimization mode = balanced (others: speed, memory)
# Enable caching = Y
# Enable encryption = N
# Enable rate limiting = Y

# claude-flow config show # not working
$ flowx config list

$ sudo claude-flow start
# all process

# Check system status
$ sudo claude-flow agent list
$ claude-flow memory stats
$ claude-flow mcp status
# Status: Stopped
$ flowx mcp start --port 3030

# MCP server started at http://localhost:3000/
# ℹ️ WebSocket endpoint: ws://${host}:${port}/
# ℹ️ API endpoint: http://${host}:${port}/api/
# Error: ENOENT: no such file or directory, stat '/usr/lib/ui/console/index.html'


# Step 1: Spawn a Research Agent
$ sudo flowx agent spawn researcher --name "Research Assistant"

Database saved to /usr/lib/node_modules/claude-code-flow/.flowx/flowx.db
✅ ✅ Agent spawned successfully: Research Assistant (agent-1752840851635-1s58wupp4)
ℹ️ Process ID: 135578
ℹ️ Status: running
ℹ️ Type: researcher
ℹ️ Working Directory: default
✅ 🛡️ Security Level: high


# Step 2: Create a Research Task
$ sudo flowx task create research "Analyze current trends in AI development tools" \
  --priority high \
  --estimated-duration 2h


✅ ✅ Task created: task_md8sax95_zlbs3x9pb
ℹ️ Type: research
ℹ️ Description: Analyze current trends in AI development tools
ℹ️ Priority: 7 (High)
ℹ️ Status: running


# Check task status

$ flowx task list
│ ID              │ Type     │ Description                                 │ Status  │ Priority │ Agent      │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ task_md8sax9... │ research │ Analyze current trends in AI development... │ pending │ 7 (High) │ Unassigned │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
✅ Found 1 tasks

# Monitor task execution
$ flowx task monitor --follow

# demo01
$ sudo flowx swarm create "Build a TODO API with GET, POST, PUT, DELETE endpoints"   --strategy development   --name todo-api-demo   --output ./output/todo-api   --verbose

Services initialized successfully
✅ Backend services initialized (24ms)
ℹ️ 🚀 Launching Claude Code with swarm coordination...
❌ Claude command not found. 


# demo02

$ export BOT_TYPE="coding help"
$ export PERSONALITY=professional
$ sudo flowx swarm create \
  "Build an interactive chat bot for $BOT_TYPE with a $PERSONALITY personality. Include:
   - Command-line interface
   - Conversation history
   - Multiple response modes
   - Help system
   - Configuration options" \
  --strategy development \
  --name chat-bot-demo \
  --output ./output/chat-bot \
  --monitor

Services initialized successfully
✅ Backend services initialized (24ms)
ℹ️ 🚀 Launching Claude Code with swarm coordination...
❌ Claude command not found. 
npm install -g @anthropic/claude-cli
```

## Install Claude-Code
https://docs.anthropic.com/en/docs/claude-code/setup