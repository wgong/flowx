#!/usr/bin/env node

// Comprehensive Batch Examples Test Script
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

function testBatchCommands() {
  console.log('\n🚀 Testing Core Batch Commands');
  console.log('==============================');
  
  const commands = [
    { cmd: 'npx tsx src/cli/main.ts batch --help', name: 'Batch Help', timeout: 20000 },
    { cmd: 'npx tsx src/cli/main.ts batch status', name: 'Batch Status', timeout: 30000 },
    { cmd: 'npx tsx src/cli/main.ts batch templates', name: 'Batch Templates', timeout: 30000 }
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

function testBatchConfigFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n🔍 Testing: ${fileName}`);
  
  if (!fs.existsSync(filePath)) {
    logResult(fileName, 'failed', 'File does not exist');
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it's a valid JSON batch config
  if (filePath.endsWith('.json')) {
    try {
      const config = JSON.parse(content);
      
      // Basic batch config structure validation
      const requiredFields = ['name', 'version'];
      const missingFields = requiredFields.filter(field => !config[field]);
      
      if (missingFields.length > 0) {
        logResult(fileName, 'failed', `Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Check for deprecated CLI usage
      if (content.includes('./cli.js') || content.includes('node cli.js')) {
        logResult(fileName, 'failed', 'Uses broken built CLI - needs update to TypeScript CLI');
        return;
      }
      
      // Check for valid batch structure
      if (config.projects && Array.isArray(config.projects)) {
        logResult(fileName, 'passed', `Valid batch config with ${config.projects.length} projects`);
      } else {
        logResult(fileName, 'failed', 'Invalid batch config structure - missing projects array');
      }
      
    } catch (error) {
      logResult(fileName, 'failed', `Invalid JSON: ${error.message}`);
    }
  } else {
    logResult(fileName, 'skipped', 'Not a JSON batch config file');
  }
}

function findBatchExamples() {
  const batchFiles = [];
  
  // Batch configuration files
  const configFiles = [
    'examples/batch-config-simple.json',
    'examples/batch-config-advanced.json',
    'examples/batch-config-enterprise.json'
  ];
  
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      batchFiles.push(file);
    }
  }
  
  // Batch demo files
  const demoFiles = [
    'examples/batch-init-demo.js',
    'examples/README-batch-init.md'
  ];
  
  for (const file of demoFiles) {
    if (fs.existsSync(file)) {
      batchFiles.push(file);
    }
  }
  
  return batchFiles;
}

function testBatchConfigCreation() {
  console.log('\n🔧 Testing Batch Configuration Creation');
  console.log('=======================================');
  
  // Test creating a batch configuration
  console.log('\n🔧 Testing: Create Batch Config');
  const createResult = runCommand('npx tsx src/cli/main.ts batch config create test-batch-config.json', 30000);
  
  if (createResult.success) {
    logResult('Create Batch Config', 'passed', 'Batch config created successfully');
    
    // Check if file was created
    if (fs.existsSync('test-batch-config.json')) {
      logResult('Batch Config File Created', 'passed', 'Configuration file exists');
      
      // Validate the created config
      try {
        const content = fs.readFileSync('test-batch-config.json', 'utf8');
        const config = JSON.parse(content);
        
        if (config.name && config.version && config.projects) {
          logResult('Batch Config Validation', 'passed', 'Created config is valid');
        } else {
          logResult('Batch Config Validation', 'failed', 'Created config is missing required fields');
        }
        
        // Cleanup
        fs.unlinkSync('test-batch-config.json');
        
      } catch (error) {
        logResult('Batch Config Validation', 'failed', `Config validation failed: ${error.message}`);
      }
    } else {
      logResult('Batch Config File Created', 'failed', 'Configuration file not found');
    }
  } else {
    logResult('Create Batch Config', 'failed', `Error: ${createResult.error}`);
  }
}

function testBatchDryRun() {
  console.log('\n🔧 Testing Batch Dry Run Operations');
  console.log('===================================');
  
  const dryRunCommands = [
    { 
      cmd: 'npx tsx src/cli/main.ts batch init --projects "test1,test2,test3" --template basic --dry-run', 
      name: 'Batch Init Dry Run',
      timeout: 30000 
    },
    { 
      cmd: 'npx tsx src/cli/main.ts batch sparc architect "Test system" --modes "architect,code" --dry-run', 
      name: 'Batch SPARC Dry Run',
      timeout: 30000 
    },
    { 
      cmd: 'npx tsx src/cli/main.ts batch swarm create --swarms "test-swarm1,test-swarm2" --dry-run', 
      name: 'Batch Swarm Dry Run',
      timeout: 30000 
    }
  ];
  
  for (const { cmd, name, timeout } of dryRunCommands) {
    console.log(`\n🔧 Testing: ${name}`);
    const result = runCommand(cmd, timeout);
    
    if (result.success) {
      logResult(name, 'passed', 'Dry run executed successfully');
    } else {
      logResult(name, 'failed', `Error: ${result.error}`);
      if (result.stdout) {
        console.log(`   STDOUT: ${result.stdout.substring(0, 200)}...`);
      }
    }
  }
}

function analyzeBatchExamples() {
  console.log('\n📊 Analyzing Batch Examples');
  console.log('===========================');
  
  const batchFiles = findBatchExamples();
  console.log(`Found ${batchFiles.length} batch-related files`);
  
  const analysis = {
    total: batchFiles.length,
    configs: 0,
    demos: 0,
    docs: 0,
    deprecated: 0,
    modern: 0
  };
  
  for (const file of batchFiles) {
    if (file.endsWith('.json')) analysis.configs++;
    if (file.endsWith('.js')) analysis.demos++;
    if (file.endsWith('.md')) analysis.docs++;
    
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
  console.log(`   Total batch files: ${analysis.total}`);
  console.log(`   Configuration files: ${analysis.configs}`);
  console.log(`   Demo files: ${analysis.demos}`);
  console.log(`   Documentation files: ${analysis.docs}`);
  console.log(`   Using deprecated CLI: ${analysis.deprecated}`);
  console.log(`   Using modern TypeScript CLI: ${analysis.modern}`);
  
  return analysis;
}

async function main() {
  console.log('🚀 Comprehensive Batch Examples Test Suite');
  console.log('==========================================\n');
  
  // Test 1: Core batch commands
  testBatchCommands();
  
  // Test 2: Find and analyze batch examples
  const analysis = analyzeBatchExamples();
  
  // Test 3: Test individual batch config files
  console.log('\n📁 Testing Individual Batch Config Files');
  console.log('========================================');
  
  const batchFiles = findBatchExamples();
  const configFiles = batchFiles.filter(f => f.endsWith('.json'));
  
  for (const file of configFiles) {
    testBatchConfigFile(file);
  }
  
  // Test 4: Test batch configuration creation
  testBatchConfigCreation();
  
  // Test 5: Test dry run operations
  testBatchDryRun();
  
  // Test 6: Check demo files
  console.log('\n📚 Testing Demo Files');
  console.log('=====================');
  
  const demoFiles = batchFiles.filter(f => f.endsWith('.js') || f.endsWith('.md'));
  
  for (const file of demoFiles) {
    const fileName = path.basename(file);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('./cli.js') || content.includes('node cli.js')) {
        logResult(fileName, 'failed', 'Uses deprecated CLI commands - needs update');
      } else {
        logResult(fileName, 'passed', 'Demo file structure looks good');
      }
    } else {
      logResult(fileName, 'failed', 'Demo file missing');
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏭️ Skipped: ${testResults.skipped}`);
  console.log(`📊 Total: ${testResults.passed + testResults.failed + testResults.skipped}`);
  
  console.log('\n🎯 Batch Analysis:');
  console.log(`   📁 Total batch files: ${analysis.total}`);
  console.log(`   ⚙️ Configuration files: ${analysis.configs}`);
  console.log(`   🎬 Demo files: ${analysis.demos}`);
  console.log(`   📚 Documentation files: ${analysis.docs}`);
  console.log(`   🔧 Need CLI updates: ${analysis.deprecated}`);
  
  if (testResults.failed > 0) {
    console.log('\n🔧 Issues Found:');
    testResults.details
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`   • ${r.name}: ${r.details}`));
  }
  
  console.log('\n🎯 Recommendations:');
  console.log('   1. Update batch demo files to use TypeScript CLI');
  console.log('   2. Test batch operations with real project creation');
  console.log('   3. Validate batch configuration schemas');
  console.log('   4. Create more batch templates for common patterns');
  console.log('   5. Test integration between batch, SPARC, and swarm operations');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(console.error); 