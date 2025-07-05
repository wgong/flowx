#!/usr/bin/env node

/**
 * Direct Test of Claude CLI
 * Tests the Claude CLI directly to verify it works for our use case
 */

const { spawn } = require('child_process');
const { writeFile, mkdir } = require('fs/promises');
const { join } = require('path');

async function testClaudeCliDirect() {
  console.log('🧪 Testing Claude CLI Direct Integration...\n');
  
  try {
    // Test 1: Version Check
    console.log('1️⃣ Testing Claude CLI version...');
    const versionResult = await runClaudeCommand(['--version'], { timeout: 5000 });
    console.log('Version:', versionResult.output);
    
    if (versionResult.exitCode !== 0) {
      console.error('❌ Claude CLI not working');
      return;
    }
    console.log('✅ Claude CLI available\n');

    // Test 2: Simple Prompt with proper flags
    console.log('2️⃣ Testing simple prompt...');
    const simpleResult = await runClaudeCommand([
      '--print',
      '--output-format', 'text',
      '--dangerously-skip-permissions',
      'Please respond with exactly "Hello from Claude CLI!" and nothing else'
    ], { timeout: 60000 }); // 60 second timeout like the repository
    
    console.log('Simple prompt result:', {
      success: simpleResult.exitCode === 0,
      output: simpleResult.output.trim(),
      exitCode: simpleResult.exitCode
    });
    
    if (simpleResult.exitCode === 0) {
      console.log('✅ Simple prompt working\n');
    } else {
      console.log('❌ Simple prompt failed\n');
      console.log('Error:', simpleResult.error);
    }

    // Test 3: File Creation Task with working directory
    console.log('3️⃣ Testing file creation...');
    const workDir = './examples/claude-test-output';
    await mkdir(workDir, { recursive: true });
    
    const fileCreationResult = await runClaudeCommand([
      '--print',
      '--output-format', 'text',
      '--dangerously-skip-permissions',
      '--add-dir', workDir,
      `Create a simple Hello World Node.js application. Create both an index.js file with console.log("Hello World!") and a package.json file with basic metadata.`
    ], { cwd: workDir, timeout: 120000 }); // 2 minute timeout for file operations
    
    console.log('File creation result:', {
      success: fileCreationResult.exitCode === 0,
      output: fileCreationResult.output.substring(0, 300) + (fileCreationResult.output.length > 300 ? '...' : ''),
      exitCode: fileCreationResult.exitCode
    });
    
    if (fileCreationResult.exitCode === 0) {
      console.log('✅ File creation working');
    } else {
      console.log('❌ File creation failed');
      console.log('Error:', fileCreationResult.error);
    }

    // Test 4: Test with environment variables like the repository
    console.log('4️⃣ Testing with environment variables...');
    const envResult = await runClaudeCommand([
      '--print',
      '--output-format', 'text',
      '--dangerously-skip-permissions',
      'What is your current working directory? Please use the bash tool to run "pwd" and show me the result.'
    ], { 
      cwd: workDir, 
      timeout: 60000,
      env: {
        ...process.env,
        CLAUDE_INSTANCE_ID: 'test-instance-123',
        CLAUDE_FLOW_MODE: 'test',
        CLAUDE_TASK_ID: 'test-task-456'
      }
    });
    
    console.log('Environment test result:', {
      success: envResult.exitCode === 0,
      output: envResult.output.substring(0, 200) + (envResult.output.length > 200 ? '...' : ''),
      exitCode: envResult.exitCode
    });

    console.log('\n🎉 Claude CLI direct test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

function runClaudeCommand(args, options = {}) {
  const timeout = options.timeout || 30000;
  console.log('Running command:', 'claude', args.slice(0, 3), '...');
  
  return new Promise((resolve, reject) => {
    const childProcess = spawn('claude', args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    childProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    childProcess.stderr?.on('data', (data) => {
      error += data.toString();
    });

    childProcess.on('close', (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        output: output.trim(),
        error: error.trim(),
        exitCode: code || 0
      });
    });

    childProcess.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
    });

    // Set timeout with proper cleanup
    const timeoutHandle = setTimeout(() => {
      childProcess.kill('SIGTERM');
      reject(new Error(`Claude CLI timeout after ${timeout}ms`));
    }, timeout);
  });
}

// Run the test
testClaudeCliDirect().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 