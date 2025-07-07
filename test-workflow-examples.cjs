#!/usr/bin/env node

// Comprehensive Workflow Examples Test Script
const { execSync } = require('child_process');
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

function testWorkflowCommands() {
  console.log('\n🔄 Testing Core Workflow Commands');
  console.log('=================================');
  
  const commands = [
    { cmd: 'npx tsx src/cli/main.ts workflow --help', name: 'Workflow Help', timeout: 20000 },
    { cmd: 'npx tsx src/cli/main.ts workflow list', name: 'Workflow List', timeout: 30000 },
    { cmd: 'npx tsx src/cli/main.ts workflow template', name: 'Workflow Templates', timeout: 30000 }
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

function testWorkflowExampleFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n🔍 Testing: ${fileName}`);
  
  if (!fs.existsSync(filePath)) {
    logResult(fileName, 'failed', 'File does not exist');
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it's a valid JSON workflow
  if (filePath.endsWith('.json')) {
    try {
      const workflow = JSON.parse(content);
      
      // Basic workflow structure validation
      const requiredFields = ['name', 'description'];
      const missingFields = requiredFields.filter(field => !workflow[field]);
      
      if (missingFields.length > 0) {
        logResult(fileName, 'failed', `Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Check for deprecated CLI usage
      if (content.includes('./cli.js') || content.includes('node cli.js')) {
        logResult(fileName, 'failed', 'Uses broken built CLI - needs update to TypeScript CLI');
        return;
      }
      
      // Check for modern workflow structure
      if (workflow.agents && Array.isArray(workflow.agents)) {
        logResult(fileName, 'passed', `Valid workflow with ${workflow.agents.length} agents`);
      } else if (workflow.steps && Array.isArray(workflow.steps)) {
        logResult(fileName, 'passed', `Valid workflow with ${workflow.steps.length} steps`);
      } else {
        logResult(fileName, 'failed', 'Invalid workflow structure - missing agents or steps');
      }
      
    } catch (error) {
      logResult(fileName, 'failed', `Invalid JSON: ${error.message}`);
    }
  } else {
    logResult(fileName, 'skipped', 'Not a JSON workflow file');
  }
}

function findWorkflowExamples() {
  const workflowDirs = [
    'examples/02-workflows',
    'examples/02-workflows/simple',
    'examples/02-workflows/parallel',
    'examples/02-workflows/sequential',
    'examples/02-workflows/complex',
    'examples/02-workflows/specialized'
  ];
  
  const workflowFiles = [];
  
  for (const dir of workflowDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isFile() && (
            file.endsWith('.json') || 
            file.endsWith('.yaml') || 
            file.endsWith('.yml')
          )) {
            workflowFiles.push(fullPath);
          }
        }
      } catch (error) {
        console.log(`   Warning: Could not read directory ${dir}`);
      }
    }
  }
  
  // Also check for workflow files in examples root
  const rootFiles = [
    'examples/research-workflow.yaml',
    'examples/development-workflow.json',
    'examples/workflow-showcase-demo.js'
  ];
  
  for (const file of rootFiles) {
    if (fs.existsSync(file)) {
      workflowFiles.push(file);
    }
  }
  
  return workflowFiles;
}

function testWorkflowCreation() {
  console.log('\n🔧 Testing Workflow Creation');
  console.log('============================');
  
  // Test creating a basic workflow
  console.log('\n🔧 Testing: Create Basic Workflow');
  const createResult = runCommand('npx tsx src/cli/main.ts workflow create --name "Test Workflow" --description "Test workflow for validation"', 30000);
  
  if (createResult.success) {
    logResult('Create Basic Workflow', 'passed', 'Workflow created successfully');
    
    // Try to list workflows to see if it shows up
    console.log('\n🔧 Testing: List Workflows After Creation');
    const listResult = runCommand('npx tsx src/cli/main.ts workflow list', 30000);
    
    if (listResult.success) {
      logResult('List Workflows After Creation', 'passed', 'Workflows listed successfully');
    } else {
      logResult('List Workflows After Creation', 'failed', `Error: ${listResult.error}`);
    }
  } else {
    logResult('Create Basic Workflow', 'failed', `Error: ${createResult.error}`);
  }
}

function analyzeWorkflowExamples() {
  console.log('\n📊 Analyzing Workflow Examples');
  console.log('==============================');
  
  const workflowFiles = findWorkflowExamples();
  console.log(`Found ${workflowFiles.length} workflow files`);
  
  const analysis = {
    total: workflowFiles.length,
    json: 0,
    yaml: 0,
    deprecated: 0,
    modern: 0,
    broken: 0
  };
  
  for (const file of workflowFiles) {
    if (file.endsWith('.json')) analysis.json++;
    if (file.endsWith('.yaml') || file.endsWith('.yml')) analysis.yaml++;
    
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('./cli.js') || content.includes('node cli.js')) {
        analysis.deprecated++;
      } else if (content.includes('npx tsx src/cli/main.ts')) {
        analysis.modern++;
      }
    }
  }
  
  console.log('\n📈 Analysis Results:');
  console.log(`   Total workflow files: ${analysis.total}`);
  console.log(`   JSON workflows: ${analysis.json}`);
  console.log(`   YAML workflows: ${analysis.yaml}`);
  console.log(`   Using deprecated CLI: ${analysis.deprecated}`);
  console.log(`   Using modern TypeScript CLI: ${analysis.modern}`);
  
  return analysis;
}

async function main() {
  console.log('🚀 Comprehensive Workflow Examples Test Suite');
  console.log('=============================================\n');
  
  // Test 1: Core workflow commands
  testWorkflowCommands();
  
  // Test 2: Find and analyze workflow examples
  const analysis = analyzeWorkflowExamples();
  
  // Test 3: Test individual workflow files
  console.log('\n📁 Testing Individual Workflow Files');
  console.log('====================================');
  
  const workflowFiles = findWorkflowExamples();
  for (const file of workflowFiles) {
    testWorkflowExampleFile(file);
  }
  
  // Test 4: Test workflow creation
  testWorkflowCreation();
  
  // Test 5: Check README files
  console.log('\n📚 Testing Documentation');
  console.log('========================');
  
  const readmeFiles = [
    'examples/02-workflows/README.md'
  ];
  
  for (const file of readmeFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('./cli.js') || content.includes('node cli.js')) {
        logResult(path.basename(file), 'failed', 'Documentation uses deprecated CLI commands');
      } else {
        logResult(path.basename(file), 'passed', 'Documentation looks good');
      }
    } else {
      logResult(path.basename(file), 'failed', 'Documentation file missing');
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️ Skipped: ${testResults.skipped}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed + testResults.skipped}`);
  
  console.log('\n🎯 Workflow Analysis:');
  console.log(`   📁 Total workflow files: ${analysis.total}`);
  console.log(`   📄 JSON workflows: ${analysis.json}`);
  console.log(`   📝 YAML workflows: ${analysis.yaml}`);
  console.log(`   🔧 Need CLI updates: ${analysis.deprecated}`);
  
  if (testResults.failed > 0) {
    console.log('\n🔧 Issues Found:');
    testResults.details
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`   • ${r.name}: ${r.details}`));
  }
  
  console.log('\n🎯 Recommendations:');
  console.log('   1. Update workflow documentation to use TypeScript CLI');
  console.log('   2. Test workflow execution with real examples');
  console.log('   3. Validate JSON workflow schemas');
  console.log('   4. Create workflow templates for common patterns');
  console.log('   5. Add YAML support for workflow definitions');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(console.error); 