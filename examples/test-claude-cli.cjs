#!/usr/bin/env node

/**
 * Test Claude CLI Integration
 * Verifies that our Claude CLI client can communicate with the installed Claude CLI
 */

const { createClaudeClient } = require('../dist/agents/claude-api-client.js');

// Simple logger implementation
const logger = {
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || ''),
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

async function testClaudeCli() {
  console.log('🧪 Testing Claude CLI Integration...\n');
  
  try {
    // Create Claude CLI client
    const claudeClient = createClaudeClient(logger, {
      verbose: true,
      dangerouslySkipPermissions: true
    });

    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    const health = await claudeClient.healthCheck();
    console.log('Health check result:', health);
    
    if (!health.healthy) {
      console.error('❌ Claude CLI is not available');
      return;
    }
    
    console.log('✅ Claude CLI is healthy\n');

    // Test 2: Simple Chat
    console.log('2️⃣ Testing simple chat...');
    const chatResponse = await claudeClient.chat('Hello! Please respond with just "Hello from Claude CLI!"', {
      timeout: 30000
    });
    
    console.log('Chat response:', {
      success: chatResponse.success,
      output: chatResponse.output.substring(0, 100) + (chatResponse.output.length > 100 ? '...' : ''),
      duration: chatResponse.duration + 'ms',
      error: chatResponse.error
    });
    
    if (chatResponse.success) {
      console.log('✅ Simple chat working\n');
    } else {
      console.log('❌ Simple chat failed\n');
    }

    // Test 3: Coding Task
    console.log('3️⃣ Testing coding task...');
    const codingResponse = await claudeClient.executeCodingTask(
      'Create a simple Hello World Node.js application with a package.json file',
      './examples/claude-test-output',
      {
        timeout: 60000,
        allowFileOperations: true,
        allowCodeExecution: true
      }
    );
    
    console.log('Coding task response:', {
      success: codingResponse.success,
      output: codingResponse.output.substring(0, 200) + (codingResponse.output.length > 200 ? '...' : ''),
      duration: codingResponse.duration + 'ms',
      filesCreated: codingResponse.files?.length || 0,
      error: codingResponse.error
    });
    
    if (codingResponse.success) {
      console.log('✅ Coding task working');
    } else {
      console.log('❌ Coding task failed');
    }

    // Cleanup
    await claudeClient.shutdown();
    
    console.log('\n🎉 Claude CLI integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testClaudeCli().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 