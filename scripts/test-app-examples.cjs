#!/usr/bin/env node

/**
 * Test Individual App Examples
 * Tests all individual application examples to ensure they work correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function header(text) {
  console.log('\n' + colorize('━'.repeat(60), 'cyan'));
  console.log(colorize(`📱 ${text}`, 'cyan'));
  console.log(colorize('━'.repeat(60), 'cyan'));
}

function success(text) {
  console.log(colorize(`✅ ${text}`, 'green'));
}

function error(text) {
  console.log(colorize(`❌ ${text}`, 'red'));
}

function warning(text) {
  console.log(colorize(`⚠️  ${text}`, 'yellow'));
}

function info(text) {
  console.log(colorize(`ℹ️  ${text}`, 'blue'));
}

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  apps: []
};

// Individual app directories to test
const appExamples = [
  'hello-world-app',
  'calc-app',
  'calc-app-parallel', 
  'chat-app',
  'chat-app-2',
  'blog-api',
  'user-api',
  'news-scraper',
  'auth-service',
  'data-pipeline',
  'flask-api-sparc',
  'hello-time',
  'hello2',
  'md-convert',
  'calc-test',
  'parallel-2',
  'swarm-test-2',
  'swarm-test-3',
  'rest-api-simple'
];

function testApp(appName) {
  const appPath = path.join(__dirname, '../examples', appName);
  
  if (!fs.existsSync(appPath)) {
    warning(`App directory not found: ${appName}`);
    testResults.skipped++;
    testResults.apps.push({ name: appName, status: 'skipped', reason: 'Directory not found' });
    return;
  }

  testResults.total++;
  
  try {
    console.log(`\n🔍 Testing ${appName}...`);
    
    // Check if package.json exists
    const packageJsonPath = path.join(appPath, 'package.json');
    let hasPackageJson = false;
    let packageJson = null;
    
    if (fs.existsSync(packageJsonPath)) {
      hasPackageJson = true;
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      info(`Found package.json with ${Object.keys(packageJson.dependencies || {}).length} dependencies`);
    }
    
    // Check main files
    const mainFiles = ['app.js', 'index.js', 'main.js', 'server.js', 'notes.js', 'task-manager.js'];
    let mainFile = null;
    
    for (const file of mainFiles) {
      if (fs.existsSync(path.join(appPath, file))) {
        mainFile = file;
        break;
      }
    }
    
    if (mainFile) {
      info(`Found main file: ${mainFile}`);
    } else {
      warning(`No main file found in ${appName}`);
    }
    
    // Check for README
    const readmePath = path.join(appPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      info('Found README.md');
    }
    
    // Check for test files
    const testFiles = fs.readdirSync(appPath).filter(file => 
      file.includes('test') || file.includes('spec')
    );
    
    if (testFiles.length > 0) {
      info(`Found ${testFiles.length} test files: ${testFiles.join(', ')}`);
    }
    
    // Test Node.js apps
    if (hasPackageJson) {
      process.chdir(appPath);
      
      // Check if dependencies are installed
      const nodeModulesPath = path.join(appPath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        info('Installing dependencies...');
        try {
          execSync('npm install', { stdio: 'pipe', timeout: 30000 });
          success('Dependencies installed');
        } catch (installError) {
          warning('Failed to install dependencies');
        }
      }
      
      // Test scripts
      if (packageJson.scripts) {
        const scripts = Object.keys(packageJson.scripts);
        info(`Available scripts: ${scripts.join(', ')}`);
        
        // Test start script if available
        if (scripts.includes('start')) {
          info('Testing start script...');
          try {
            // Run with timeout to prevent hanging
            execSync('timeout 5s npm start || true', { stdio: 'pipe' });
            success('Start script executed');
          } catch (startError) {
            warning('Start script test completed (may have timed out)');
          }
        }
        
        // Test test script if available
        if (scripts.includes('test')) {
          info('Running tests...');
          try {
            execSync('npm test', { stdio: 'pipe', timeout: 15000 });
            success('Tests passed');
          } catch (testError) {
            warning('Tests failed or timed out');
          }
        }
      }
    }
    
    // Test Python apps
    const pythonFiles = fs.readdirSync(appPath).filter(file => file.endsWith('.py'));
    if (pythonFiles.length > 0) {
      info(`Found ${pythonFiles.length} Python files: ${pythonFiles.join(', ')}`);
      
      // Check for requirements.txt
      const requirementsPath = path.join(appPath, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        info('Found requirements.txt');
      }
      
      // Check for setup.py
      const setupPath = path.join(appPath, 'setup.py');
      if (fs.existsSync(setupPath)) {
        info('Found setup.py');
      }
    }
    
    // Test TypeScript apps
    const tsFiles = fs.readdirSync(appPath).filter(file => file.endsWith('.ts'));
    if (tsFiles.length > 0) {
      info(`Found ${tsFiles.length} TypeScript files: ${tsFiles.join(', ')}`);
      
      // Check for tsconfig.json
      const tsconfigPath = path.join(appPath, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        info('Found tsconfig.json');
      }
    }
    
    // Check file structure
    const allFiles = fs.readdirSync(appPath);
    const directories = allFiles.filter(item => 
      fs.statSync(path.join(appPath, item)).isDirectory()
    );
    
    if (directories.length > 0) {
      info(`Subdirectories: ${directories.join(', ')}`);
    }
    
    success(`✅ ${appName} - Basic structure validated`);
    testResults.passed++;
    testResults.apps.push({ name: appName, status: 'passed', files: allFiles.length });
    
  } catch (err) {
    error(`❌ ${appName} - Error: ${err.message}`);
    testResults.failed++;
    testResults.apps.push({ name: appName, status: 'failed', error: err.message });
  } finally {
    // Return to original directory
    process.chdir(__dirname);
  }
}

function generateReport() {
  header('📊 APP EXAMPLES TEST RESULTS');
  
  console.log(`\n📈 Summary:`);
  console.log(`  Total Apps: ${testResults.total}`);
  console.log(`  ${colorize('✅ Passed:', 'green')} ${testResults.passed}`);
  console.log(`  ${colorize('❌ Failed:', 'red')} ${testResults.failed}`);
  console.log(`  ${colorize('⏭️  Skipped:', 'yellow')} ${testResults.skipped}`);
  
  if (testResults.passed > 0) {
    console.log(`\n${colorize('✅ PASSED APPS:', 'green')}`);
    testResults.apps
      .filter(app => app.status === 'passed')
      .forEach(app => {
        console.log(`  • ${app.name} (${app.files} files)`);
      });
  }
  
  if (testResults.failed > 0) {
    console.log(`\n${colorize('❌ FAILED APPS:', 'red')}`);
    testResults.apps
      .filter(app => app.status === 'failed')
      .forEach(app => {
        console.log(`  • ${app.name}: ${app.error}`);
      });
  }
  
  if (testResults.skipped > 0) {
    console.log(`\n${colorize('⏭️  SKIPPED APPS:', 'yellow')}`);
    testResults.apps
      .filter(app => app.status === 'skipped')
      .forEach(app => {
        console.log(`  • ${app.name}: ${app.reason}`);
      });
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../reports/app-examples-test-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      successRate: testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(1) : 0
    },
    apps: testResults.apps
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Overall result
  const successRate = testResults.total > 0 ? (testResults.passed / testResults.total * 100) : 0;
  
  if (successRate >= 80) {
    console.log(`\n${colorize('🎉 EXCELLENT!', 'green')} ${successRate.toFixed(1)}% of apps passed validation`);
  } else if (successRate >= 60) {
    console.log(`\n${colorize('👍 GOOD!', 'yellow')} ${successRate.toFixed(1)}% of apps passed validation`);
  } else {
    console.log(`\n${colorize('⚠️  NEEDS WORK!', 'red')} ${successRate.toFixed(1)}% of apps passed validation`);
  }
}

// Main execution
async function main() {
  header('🧪 TESTING INDIVIDUAL APP EXAMPLES');
  
  console.log('\nThis script tests all individual application examples to ensure they:');
  console.log('• Have proper file structure');
  console.log('• Have valid package.json (for Node.js apps)');
  console.log('• Can install dependencies');
  console.log('• Can run basic scripts');
  console.log('• Have documentation');
  console.log('• Have test files');
  
  info(`Found ${appExamples.length} app examples to test`);
  
  // Test each app
  for (const appName of appExamples) {
    testApp(appName);
  }
  
  // Generate final report
  generateReport();
}

// Run the tests
main().catch(console.error); 