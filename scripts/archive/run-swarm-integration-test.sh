#!/bin/bash

# Swarm Integration Test Runner
# Compiles TypeScript and runs comprehensive swarm system tests

set -e

echo "🚀 Starting Swarm Integration Test Runner"
echo "=========================================="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "📁 Project root: $PROJECT_ROOT"

# Check if TypeScript files exist
if [ ! -f "scripts/test-swarm-integration-complete.ts" ]; then
    echo "❌ Integration test file not found"
    exit 1
fi

echo "🔧 Building project..."
if ! npm run build; then
    echo "❌ Build failed - attempting to continue with existing build"
fi

echo "🧪 Running Swarm Integration Tests..."
echo "====================================="

# Try to run the integration test
if [ -f "dist/scripts/test-swarm-integration-complete.js" ]; then
    echo "✅ Running compiled integration test"
    node dist/scripts/test-swarm-integration-complete.js
elif [ -f "scripts/test-swarm-integration-complete.js" ]; then
    echo "✅ Running integration test from scripts directory"
    node scripts/test-swarm-integration-complete.js
else
    echo "⚠️  Compiled test not found, trying to run with ts-node"
    if command -v npx >/dev/null 2>&1; then
        npx ts-node scripts/test-swarm-integration-complete.ts
    else
        echo "❌ Cannot run TypeScript file - no compiled version or ts-node available"
        echo "💡 Try running 'npm run build' first"
        exit 1
    fi
fi

echo ""
echo "🎯 Integration test completed!"
echo "Check the output above for detailed results." 