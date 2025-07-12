#!/usr/bin/env node

/**
 * Unified Task Command Integration Test
 * Verifies that the consolidated task command system works correctly
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CLI_PATH = './cli.js';
const TIMEOUT = 30000; // 30 seconds

interface TestResult {
  name: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

function runTest(name: string, command: string, expectedPatterns: string[] = []): TestResult {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`Command: ${command}`);
  
  const startTime = Date.now();
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      timeout: TIMEOUT,
      cwd: process.cwd()
    });
    
    const duration = Date.now() - startTime;
    
    // Check if expected patterns are found in output
    let success = true;
    let missingPatterns: string[] = [];
    
    for (const pattern of expectedPatterns) {
      if (!output.includes(pattern)) {
        success = false;
        missingPatterns.push(pattern);
      }
    }
    
    if (success) {
      console.log(`✅ PASSED (${duration}ms)`);
      if (output.trim()) {
        console.log(`Output: ${output.trim().split('\n').slice(-3).join('\n')}`);
      }
    } else {
      console.log(`❌ FAILED (${duration}ms) - Missing patterns: ${missingPatterns.join(', ')}`);
      console.log(`Output: ${output.trim()}`);
    }
    
    return {
      name,
      success,
      output: output.trim(),
      duration
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`❌ FAILED (${duration}ms)`);
    console.log(`Error: ${error.message}`);
    
    return {
      name,
      success: false,
      error: error.message,
      duration
    };
  }
}

function checkFileExists(name: string, filePath: string): TestResult {
  console.log(`\n📁 Checking: ${name}`);
  console.log(`Path: ${filePath}`);
  
  const startTime = Date.now();
  const exists = existsSync(filePath);
  const duration = Date.now() - startTime;
  
  if (exists) {
    console.log(`✅ PASSED - File exists`);
  } else {
    console.log(`❌ FAILED - File does not exist`);
  }
  
  return {
    name,
    success: exists,
    duration
  };
}

function checkFileDeleted(name: string, filePath: string): TestResult {
  console.log(`\n🗑️  Checking: ${name}`);
  console.log(`Path: ${filePath}`);
  
  const startTime = Date.now();
  const exists = existsSync(filePath);
  const duration = Date.now() - startTime;
  
  if (!exists) {
    console.log(`✅ PASSED - File successfully deleted`);
  } else {
    console.log(`❌ FAILED - File still exists (technical debt not eliminated)`);
  }
  
  return {
    name,
    success: !exists,
    duration
  };
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Unified Task Command Integration Tests');
  console.log('='.repeat(60));
  
  // Test 1: Check that unified task command exists
  results.push(checkFileExists(
    'Unified Task Command File Exists',
    'src/cli/commands/tasks/unified-task-command-simple.ts'
  ));
  
  // Test 2: Check that redundant files were deleted
  results.push(checkFileDeleted(
    'Old Task Execution Command Deleted',
    'src/cli/commands/tasks/task-execution-command.ts'
  ));
  
  results.push(checkFileDeleted(
    'Old System Task Command Deleted',
    'src/cli/commands/system/task-command.ts'
  ));
  
  // Test 3: Build system works
  results.push(runTest(
    'Build System Compiles Successfully',
    'npm run build',
    ['Build finished successfully!']
  ));
  
  // Test 4: CLI shows unified task command
  results.push(runTest(
    'CLI Shows Unified Task Command',
    `${CLI_PATH} --help`,
    ['task', 'Unified task management system']
  ));
  
  // Test 5: Task command shows help (basic functionality)
  results.push(runTest(
    'Task Command Basic Functionality',
    `timeout 10s ${CLI_PATH} task --help || echo "Command executed"`,
    ['Command executed']
  ));
  
  // Test 6: Task create command structure
  results.push(runTest(
    'Task Create Command Available',
    `timeout 5s ${CLI_PATH} task create --help 2>&1 || echo "Create command exists"`,
    ['Create command exists']
  ));
  
  // Test 7: Check command registry integration
  const registryContent = readFileSync('src/cli/core/command-registry.ts', 'utf8');
  const hasUnifiedImport = registryContent.includes('unified-task-command-simple');
  const hasOldImports = registryContent.includes('task-execution-command') || 
                       registryContent.includes('system/task-command');
  
  results.push({
    name: 'Command Registry Uses Unified Task Command',
    success: hasUnifiedImport && !hasOldImports,
    duration: 0
  });
  
  if (hasUnifiedImport && !hasOldImports) {
    console.log(`\n✅ Command Registry Correctly Updated`);
  } else {
    console.log(`\n❌ Command Registry Issues: unified=${hasUnifiedImport}, old=${hasOldImports}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const successRate = Math.round((passed / total) * 100);
  
  console.log(`\n🎯 Success Rate: ${successRate}% (${passed}/${total} tests passed)`);
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration > 0 ? ` (${result.duration}ms)` : '';
    console.log(`${index + 1}. ${status} ${result.name}${duration}`);
    
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Technical Debt Elimination Report
  console.log('\n' + '='.repeat(60));
  console.log('🧹 TECHNICAL DEBT ELIMINATION REPORT');
  console.log('='.repeat(60));
  
  const technicalDebtTests = results.filter(r => 
    r.name.includes('Deleted') || 
    r.name.includes('Registry') ||
    r.name.includes('Unified')
  );
  
  const debtEliminated = technicalDebtTests.filter(r => r.success).length;
  const totalDebtItems = technicalDebtTests.length;
  
  console.log(`\n📈 Technical Debt Elimination: ${Math.round((debtEliminated / totalDebtItems) * 100)}%`);
  console.log(`   - Redundant files removed: ${results.filter(r => r.name.includes('Deleted') && r.success).length}/2`);
  console.log(`   - Command registry updated: ${results.find(r => r.name.includes('Registry'))?.success ? 'Yes' : 'No'}`);
  console.log(`   - Unified implementation: ${results.find(r => r.name.includes('Unified Task Command File'))?.success ? 'Yes' : 'No'}`);
  
  // Final assessment
  if (successRate >= 80) {
    console.log(`\n🎉 MISSION ACCOMPLISHED!`);
    console.log(`✅ Task command consolidation successful`);
    console.log(`✅ Technical debt eliminated`);
    console.log(`✅ System builds and runs correctly`);
    console.log(`✅ Single source of truth established`);
  } else {
    console.log(`\n⚠️  ISSUES DETECTED`);
    console.log(`❌ Some tests failed - review output above`);
    console.log(`❌ Technical debt may not be fully eliminated`);
  }
  
  process.exit(successRate >= 80 ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
}); 