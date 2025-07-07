#!/usr/bin/env node

// Comprehensive Swarm Examples Test Script
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

function logResult(name, status, details = '') {
  testResults.details.push({ name, status, details });
  testResults[status]++;
  
  const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
  console.log(`${emoji} ${name}: ${status.toUpperCase()}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function runCommand(command, timeout = 30000) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      timeout,
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    };
  }
}

function testSwarmExampleFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n🔍 Testing: ${fileName}`);
  
  if (!fs.existsSync(filePath)) {
    logResult(fileName, 'failed', 'File does not exist');
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it uses the broken built CLI
  if (content.includes('./cli.js') || content.includes('node cli.js')) {
    logResult(fileName, 'failed', 'Uses broken built CLI - needs update to TypeScript CLI');
    return;
  }
  
  // Check if it's executable
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
  } catch (error) {
    logResult(fileName, 'failed', 'Not executable - run chmod +x');
    return;
  }
  
  // Check if it has proper shebang
  if (!content.startsWith('#!/bin/bash') && !content.startsWith('#!/usr/bin/env node')) {
    logResult(fileName, 'failed', 'Missing proper shebang');
    return;
  }
  
  logResult(fileName, 'passed', 'File structure looks good');
}

function testSwarmCommands() {
  console.log('\n🤖 Testing Core Swarm Commands');
  console.log('================================');
  
  // Test basic swarm commands
  const commands = [
    { cmd: 'npx tsx src/cli/main.ts swarm --help', name: 'Swarm Help', timeout: 20000 },
    { cmd: 'npx tsx src/cli/main.ts swarm list', name: 'Swarm List', timeout: 30000 },
    { cmd: 'npx tsx src/cli/main.ts agent list', name: 'Agent List', timeout: 30000 },
    { cmd: 'npx tsx src/cli/main.ts status', name: 'System Status', timeout: 30000 }
  ];
  
  for (const { cmd, name, timeout } of commands) {
    console.log(`\n🔧 Testing: ${name}`);
    const result = runCommand(cmd, timeout);
    
    if (result.success) {
      logResult(name, 'passed', 'Command executed successfully');
    } else {
      logResult(name, 'failed', `Error: ${result.error}`);
      if (result.stdout) {
        console.log(`   STDOUT: ${result.stdout.substring(0, 200)}...`);
      }
    }
  }
}

function findSwarmExamples() {
  const exampleDirs = [
    'examples',
    'examples/03-demos',
    'examples/05-swarm-apps'
  ];
  
  const swarmFiles = [];
  
  for (const dir of exampleDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isFile() && (
          file.name.includes('swarm') || 
          file.name.includes('demo') ||
          file.name.includes('agent')
        )) {
          swarmFiles.push(fullPath);
        }
        
        if (file.isDirectory()) {
          const subDir = fullPath;
          if (fs.existsSync(subDir)) {
            try {
              const subFiles = fs.readdirSync(subDir);
              for (const subFile of subFiles) {
                if (subFile.includes('swarm') || subFile.includes('demo')) {
                  swarmFiles.push(path.join(subDir, subFile));
                }
              }
            } catch (error) {
              // Skip directories we can't read
            }
          }
        }
      }
    }
  }
  
  return swarmFiles;
}

async function main() {
  console.log('🚀 Comprehensive Swarm Examples Test Suite');
  console.log('==========================================\n');
  
  // Test 1: Core swarm commands
  testSwarmCommands();
  
  // Test 2: Find and test swarm example files
  console.log('\n📁 Testing Swarm Example Files');
  console.log('===============================');
  
  const swarmFiles = findSwarmExamples();
  console.log(`Found ${swarmFiles.length} potential swarm example files`);
  
  for (const file of swarmFiles) {
    testSwarmExampleFile(file);
  }
  
  // Test 3: Check for working examples
  console.log('\n✨ Checking Working Examples');
  console.log('============================');
  
  const workingFiles = [
    'examples/working-swarm-demo-tsx.sh',
    'swarm-demo.cjs',
    'test-swarm-simple.cjs'
  ];
  
  for (const file of workingFiles) {
    if (fs.existsSync(file)) {
      logResult(path.basename(file), 'passed', 'Working example exists');
    } else {
      logResult(path.basename(file), 'failed', 'Working example missing');
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️ Skipped: ${testResults.skipped}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed + testResults.skipped}`);
  
  if (testResults.failed > 0) {
    console.log('\n🔧 Issues Found:');
    testResults.details
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`   • ${r.name}: ${r.details}`));
  }
  
  console.log('\n🎯 Recommendations:');
  console.log('   1. Update all example scripts to use TypeScript CLI');
  console.log('   2. Fix broken built CLI dependency issues');
  console.log('   3. Ensure all scripts are executable (chmod +x)');
  console.log('   4. Test swarm creation and coordination features');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(console.error); 