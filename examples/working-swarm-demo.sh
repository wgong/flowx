#!/bin/bash

# Claude Flow Swarm Demonstration Script
# This script shows the working swarm functionality using CLI commands

echo "🚀 Claude Flow Swarm Demonstration"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Show initial system status
print_step "1" "Checking System Status"
./cli.js status
echo ""

# Step 2: Create multiple swarms
print_step "2" "Creating Multiple Swarms"

print_info "Creating Hello World Development Swarm (12 agents)..."
./cli.js swarm create hello-world-dev --agents 12 --coordinator centralized --strategy auto
echo ""

print_info "Creating API Service Swarm (8 agents)..."
./cli.js swarm create api-service --agents 8 --coordinator hierarchical --strategy auto
echo ""

print_info "Creating Testing Swarm (6 agents)..."
./cli.js swarm create testing-swarm --agents 6 --coordinator mesh --strategy hybrid
echo ""

# Step 3: List all swarms
print_step "3" "Listing Active Swarms"
./cli.js swarm list --detailed
echo ""

# Step 4: Show swarm status
print_step "4" "Checking Swarm Status"
print_info "Getting status of hello-world-dev swarm..."
./cli.js swarm status hello-world-dev
echo ""

# Step 5: Show agents in swarm
print_step "5" "Listing Swarm Agents"
./cli.js swarm agents hello-world-dev
echo ""

# Step 6: Scale a swarm
print_step "6" "Scaling Swarm"
print_info "Scaling hello-world-dev swarm to 15 agents..."
./cli.js swarm scale hello-world-dev --agents 15
echo ""

# Step 7: Show system monitoring
print_step "7" "System Monitoring"
./cli.js monitor swarms
echo ""

# Step 8: Memory operations
print_step "8" "Memory Bank Operations"
print_info "Storing project requirements..."
./cli.js memory store --key "hello-world-requirements" --value "Create a comprehensive Hello World application with Node.js, Express, tests, and documentation" --type project
echo ""

print_info "Storing agent instructions..."
./cli.js memory store --key "agent-instructions" --value "Each agent should focus on their specialization: developers write code, testers create tests, documenters write docs" --type system
echo ""

print_info "Querying stored memories..."
./cli.js memory query --search "hello world" --limit 5
echo ""

# Step 9: Show memory statistics
print_step "9" "Memory Statistics"
./cli.js memory stats --detailed
echo ""

# Step 10: Agent management
print_step "10" "Agent Management"
print_info "Listing all agents..."
./cli.js agent list --format table
echo ""

# Step 11: Task operations
print_step "11" "Task Management"
print_info "Creating sample tasks..."
./cli.js task create "Setup Node.js project structure" --type setup --priority high --assignTo hello-world-dev
./cli.js task create "Implement Express server" --type development --priority high --assignTo hello-world-dev
./cli.js task create "Create unit tests" --type testing --priority medium --assignTo testing-swarm
./cli.js task create "Write documentation" --type documentation --priority medium --assignTo hello-world-dev
echo ""

print_info "Listing tasks..."
./cli.js task list --status all
echo ""

# Step 12: Configuration
print_step "12" "System Configuration"
./cli.js config list --format table
echo ""

# Step 13: Final system status
print_step "13" "Final System Status"
./cli.js status --detailed
echo ""

# Summary
echo ""
echo "🎉 Swarm Demonstration Complete!"
echo "================================"
echo ""
print_success "Successfully demonstrated:"
echo "  • Multiple swarm creation and management"
echo "  • Agent registration and scaling"
echo "  • Memory bank operations"
echo "  • Task management"
echo "  • System monitoring"
echo "  • Configuration management"
echo ""
print_info "Key Features Shown:"
echo "  📊 Real-time swarm coordination"
echo "  🤖 Multi-agent collaboration"
echo "  🧠 Persistent memory management"
echo "  📋 Task distribution and tracking"
echo "  ⚡ Dynamic scaling capabilities"
echo "  🔧 Comprehensive configuration"
echo ""
print_info "Next Steps:"
echo "  • Use './cli.js ui start' for interactive dashboard"
echo "  • Monitor with './cli.js monitor' for real-time updates"
echo "  • Scale swarms as needed with './cli.js swarm scale'"
echo "  • Check logs with './cli.js logs follow'"
echo "" 