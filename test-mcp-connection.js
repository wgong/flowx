#!/usr/bin/env node

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Testing MCP Server Connection...\n');

// Start the MCP server
const mcpProcess = spawn('node', ['./cli.js', 'mcp', 'serve'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Wait for server to start
await setTimeout(1000);

console.log('📤 Sending initialize request...');

// Send initialize request
const initRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
});

mcpProcess.stdin.write(initRequest + '\n');

// Listen for responses
let responseReceived = false;
let initialized = false;

mcpProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📥 Server output:', output);
  
  // Look for JSON responses
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{')) {
      try {
        const response = JSON.parse(line.trim());
        if (response.jsonrpc === '2.0') {
          console.log('✅ Received JSON-RPC response:', JSON.stringify(response, null, 2));
          responseReceived = true;
          
          if (response.method === 'notifications/initialized') {
            initialized = true;
            console.log('🎉 Server initialized successfully!');
            
            // Test tools/list request
            console.log('\n📤 Sending tools/list request...');
            const toolsRequest = JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "tools/list",
              params: {}
            });
            mcpProcess.stdin.write(toolsRequest + '\n');
          }
          
          if (response.id === 2 && response.result) {
            console.log('🛠️  Available tools:', response.result.tools?.length || 0);
            console.log('✅ MCP connection test successful!\n');
            mcpProcess.kill();
            process.exit(0);
          }
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
  }
});

mcpProcess.stderr.on('data', (data) => {
  console.log('❌ Server error:', data.toString());
});

mcpProcess.on('exit', (code) => {
  console.log(`\n🏁 MCP server exited with code ${code}`);
  if (!responseReceived) {
    console.log('❌ No valid JSON-RPC responses received');
    process.exit(1);
  }
});

// Timeout after 10 seconds
setTimeout(10000).then(() => {
  if (!responseReceived) {
    console.log('⏰ Test timed out');
    mcpProcess.kill();
    process.exit(1);
  }
}); 