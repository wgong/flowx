#!/usr/bin/env node

/**
 * Run visual regression tests
 * 
 * This script runs visual tests against UI components and web interfaces.
 * It compares current screenshots with baselines to detect unwanted visual changes.
 * 
 * Usage:
 *   node scripts/run-visual-tests.js [options]
 * 
 * Options:
 *   --url=URL        Only test specified URL
 *   --update         Update baselines with current screenshots
 *   --ci             Run in CI mode with stricter thresholds
 *   --report=path    Path to save HTML report (default: reports/visual/index.html)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import visualRegression from '../tests/visual/visual-regression.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);
const options = {
  url: null,
  update: args.includes('--update'),
  ci: args.includes('--ci'),
  report: null
};

// Parse named arguments
for (const arg of args) {
  if (arg.startsWith('--url=')) {
    options.url = arg.split('=')[1];
  } else if (arg.startsWith('--report=')) {
    options.report = arg.split('=')[1];
  }
}

// Configure report path
const reportPath = options.report || join(rootDir, 'reports', 'visual', 'index.html');
const reportDir = dirname(reportPath);

// Configure visual testing
const config = {
  screenshotDir: join(rootDir, 'screenshots'),
  baselineDir: join(rootDir, 'screenshots', 'baseline'),
  diffDir: join(rootDir, 'screenshots', 'diff'),
  threshold: options.ci ? 0.05 : 0.1,
  allowedMismatchedRatio: options.ci ? 0.0005 : 0.001
};

// Define test cases - these would typically be loaded from a config file
// or discovered dynamically from component library
const tests = [
  {
    name: 'main-dashboard',
    url: 'http://localhost:3000/dashboard',
    viewport: { width: 1280, height: 800 }
  },
  {
    name: 'mobile-dashboard',
    url: 'http://localhost:3000/dashboard',
    viewport: { width: 375, height: 667 }
  },
  {
    name: 'agent-list',
    url: 'http://localhost:3000/agents',
    viewport: { width: 1280, height: 800 },
    options: {
      setupFn: async (page) => {
        // Wait for specific element to ensure page is fully loaded
        await page.waitForSelector('.agent-list-table', { timeout: 5000 });
      }
    }
  }
];

// Filter tests if URL is specified
const testsToRun = options.url 
  ? tests.filter(test => test.url.includes(options.url))
  : tests;

/**
 * Run the visual tests
 */
async function main() {
  try {
    // Create report directory
    await fs.mkdir(reportDir, { recursive: true });
    
    console.log('Starting visual regression tests...');
    console.log(`Mode: ${options.update ? 'Update baselines' : 'Compare with baselines'}`);
    console.log(`Environment: ${options.ci ? 'CI' : 'Development'}`);
    
    if (testsToRun.length === 0) {
      console.warn('No tests to run!');
      return;
    }
    
    if (options.update) {
      // Update mode - just take screenshots and update baselines
      await updateBaselines(testsToRun);
    } else {
      // Test mode - compare against baselines
      const results = await visualRegression.runVisualTests(testsToRun, config);
      
      // Generate report
      await visualRegression.generateReport(results, reportPath);
      
      // Check if any tests failed
      const failedTests = results.filter(result => !result.passed && !result.isBaseline);
      if (failedTests.length > 0) {
        console.error(`❌ ${failedTests.length} visual tests failed!`);
        
        if (!options.ci) {
          console.log(`\nView the report at: ${reportPath}`);
        }
        
        process.exit(1);
      } else {
        console.log(`✅ All ${results.length} visual tests passed!`);
      }
    }
  } catch (error) {
    console.error('Error running visual tests:', error);
    process.exit(1);
  }
}

/**
 * Update baselines for all tests
 */
async function updateBaselines(tests) {
  const browser = await visualRegression.launchBrowser();
  const initializedConfig = await visualRegression.init(config);
  
  try {
    for (const test of tests) {
      const page = await browser.newPage();
      
      try {
        console.log(`Updating baseline for ${test.name}...`);
        
        // Set viewport if specified
        if (test.viewport) {
          await page.setViewport(test.viewport);
        }
        
        // Navigate to URL
        await page.goto(test.url, { waitUntil: 'networkidle0' });
        
        // Apply additional setup if provided
        if (test.options?.setupFn && typeof test.options.setupFn === 'function') {
          await test.options.setupFn(page);
        }
        
        // Take screenshot
        const screenshot = await visualRegression.takeScreenshot(page, test.name, test.options?.screenshot);
        
        // Update baseline
        await visualRegression.updateBaseline(test.name, screenshot, initializedConfig);
        console.log(`✅ Updated baseline for ${test.name}`);
      } finally {
        await page.close();
      }
    }
    
    console.log(`✅ Updated ${tests.length} baselines!`);
  } finally {
    await browser.close();
  }
}

// Run tests
main().catch(error => {
  console.error('Visual regression tests failed:', error);
  process.exit(1);
});