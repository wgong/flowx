/**
 * Visual Regression Testing Framework
 * 
 * This module provides functionality for visual regression testing
 * of UI components and pages using puppeteer and pixelmatch.
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Configuration
const DEFAULT_CONFIG = {
  screenshotDir: './screenshots',
  baselineDir: './screenshots/baseline',
  diffDir: './screenshots/diff',
  threshold: 0.1,  // Threshold for pixel difference (0-1)
  allowedMismatchedRatio: 0.001,  // Allowed percentage of mismatched pixels (0-1)
};

/**
 * Initialize the visual testing environment
 * @param {Object} config - Configuration options
 */
export async function init(config = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Ensure directories exist
  await fs.mkdir(mergedConfig.screenshotDir, { recursive: true });
  await fs.mkdir(mergedConfig.baselineDir, { recursive: true });
  await fs.mkdir(mergedConfig.diffDir, { recursive: true });
  
  return mergedConfig;
}

/**
 * Launch a browser for visual testing
 * @param {Object} options - Puppeteer launch options
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
export async function launchBrowser(options = {}) {
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...options,
  });
}

/**
 * Take a screenshot of a page or component
 * @param {Page} page - Puppeteer page object
 * @param {string} name - Screenshot name
 * @param {Object} options - Screenshot options
 * @returns {Promise<Buffer>} Screenshot buffer
 */
export async function takeScreenshot(page, name, options = {}) {
  const screenshotOptions = {
    fullPage: false,
    type: 'png',
    ...options,
  };
  
  return page.screenshot(screenshotOptions);
}

/**
 * Compare a screenshot with its baseline
 * @param {Buffer} screenshot - Current screenshot buffer
 * @param {string} name - Screenshot name
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Comparison result
 */
export async function compareWithBaseline(screenshot, name, config) {
  const baselinePath = path.join(config.baselineDir, `${name}.png`);
  const diffPath = path.join(config.diffDir, `${name}-diff.png`);
  let baseline;
  let isBaseline = false;
  
  try {
    // Try to read baseline
    baseline = await fs.readFile(baselinePath);
  } catch (error) {
    // If baseline doesn't exist, create it
    if (error.code === 'ENOENT') {
      await fs.writeFile(baselinePath, screenshot);
      console.log(`Created baseline for ${name}`);
      isBaseline = true;
      return { match: true, diffCount: 0, isBaseline };
    }
    throw error;
  }
  
  // Parse PNG images
  const img1 = PNG.sync.read(screenshot);
  const img2 = PNG.sync.read(baseline);
  
  // Check dimensions
  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.error(`Image dimensions don't match for ${name}!`);
    return { 
      match: false, 
      error: 'Dimensions mismatch',
      dimensions1: { width: img1.width, height: img1.height },
      dimensions2: { width: img2.width, height: img2.height }
    };
  }
  
  // Create diff PNG
  const { width, height } = img1;
  const diff = new PNG({ width, height });
  
  // Compare images
  const diffCount = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: config.threshold }
  );
  
  // Calculate mismatch ratio
  const mismatchRatio = diffCount / (width * height);
  const match = mismatchRatio <= config.allowedMismatchedRatio;
  
  // Save diff image if there's a mismatch
  if (!match) {
    await fs.writeFile(diffPath, PNG.sync.write(diff));
  }
  
  return { match, diffCount, mismatchRatio, diffPath: match ? null : diffPath, isBaseline };
}

/**
 * Update baseline for a specific test
 * @param {string} name - Test name
 * @param {Buffer} screenshot - New baseline screenshot
 * @param {Object} config - Configuration options
 */
export async function updateBaseline(name, screenshot, config) {
  const baselinePath = path.join(config.baselineDir, `${name}.png`);
  await fs.writeFile(baselinePath, screenshot);
  return { updated: true, path: baselinePath };
}

/**
 * Run visual test for a specific component or page
 * @param {Page} page - Puppeteer page object
 * @param {string} url - URL to navigate to
 * @param {string} name - Test name
 * @param {Object} options - Test options
 * @param {Object} config - Configuration options
 */
export async function runVisualTest(page, url, name, options = {}, config) {
  // Navigate to URL
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  // Apply additional setup if provided
  if (options.setupFn && typeof options.setupFn === 'function') {
    await options.setupFn(page);
  }
  
  // Take screenshot
  const screenshot = await takeScreenshot(page, name, options.screenshot);
  
  // Compare with baseline
  const result = await compareWithBaseline(screenshot, name, config);
  
  return { 
    name,
    url,
    passed: result.match,
    isBaseline: result.isBaseline,
    diffCount: result.diffCount,
    mismatchRatio: result.mismatchRatio,
    diffPath: result.diffPath
  };
}

/**
 * Run a batch of visual tests
 * @param {Array<Object>} tests - Array of test configurations
 * @param {Object} config - Configuration options
 */
export async function runVisualTests(tests, config = {}) {
  const mergedConfig = await init(config);
  const browser = await launchBrowser();
  
  try {
    const results = [];
    
    for (const test of tests) {
      const page = await browser.newPage();
      try {
        // Set viewport if specified
        if (test.viewport) {
          await page.setViewport(test.viewport);
        }
        
        const result = await runVisualTest(
          page,
          test.url,
          test.name,
          test.options || {},
          mergedConfig
        );
        
        results.push(result);
        console.log(`Test ${test.name}: ${result.passed ? 'PASS' : 'FAIL'}`);
        
        if (!result.passed && !result.isBaseline) {
          console.log(`  Mismatch ratio: ${(result.mismatchRatio * 100).toFixed(2)}%`);
          console.log(`  Diff image: ${result.diffPath}`);
        }
      } finally {
        await page.close();
      }
    }
    
    return results;
  } finally {
    await browser.close();
  }
}

/**
 * Generate an HTML report for visual test results
 * @param {Array<Object>} results - Test results
 * @param {string} outputPath - Path to save the report
 */
export async function generateReport(results, outputPath) {
  // Calculate summary statistics
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const newBaselines = results.filter(r => r.isBaseline).length;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
    h1, h2 { margin-top: 0; }
    .summary { display: flex; margin-bottom: 20px; }
    .stat { margin-right: 20px; padding: 10px; border-radius: 4px; }
    .passed { background-color: #e7f7ee; color: #0a6640; }
    .failed { background-color: #ffe7e7; color: #b10000; }
    .new { background-color: #e6f1ff; color: #0055cc; }
    .test-result { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
    .test-result.pass { border-left: 4px solid #0a6640; }
    .test-result.fail { border-left: 4px solid #b10000; }
    .test-result.baseline { border-left: 4px solid #0055cc; }
    .test-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .test-name { font-weight: bold; font-size: 1.1em; }
    .test-status { padding: 3px 8px; border-radius: 3px; font-size: 0.8em; }
    .status-pass { background-color: #e7f7ee; color: #0a6640; }
    .status-fail { background-color: #ffe7e7; color: #b10000; }
    .status-baseline { background-color: #e6f1ff; color: #0055cc; }
    .comparison { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .image-container { max-width: 45%; }
    img { max-width: 100%; border: 1px solid #ddd; }
    .details { margin-top: 10px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>Visual Regression Test Report</h1>
  
  <div class="summary">
    <div class="stat">Total: ${total}</div>
    <div class="stat passed">Passed: ${passed}</div>
    <div class="stat failed">Failed: ${failed}</div>
    <div class="stat new">New Baselines: ${newBaselines}</div>
  </div>
  
  <h2>Test Results</h2>
  
  ${results.map(result => `
    <div class="test-result ${result.isBaseline ? 'baseline' : (result.passed ? 'pass' : 'fail')}">
      <div class="test-header">
        <div class="test-name">${result.name}</div>
        <div class="test-status ${result.isBaseline ? 'status-baseline' : (result.passed ? 'status-pass' : 'status-fail')}">
          ${result.isBaseline ? 'NEW BASELINE' : (result.passed ? 'PASSED' : 'FAILED')}
        </div>
      </div>
      <div>URL: ${result.url}</div>
      ${!result.passed && !result.isBaseline ? `
        <div class="details">
          Mismatch ratio: ${(result.mismatchRatio * 100).toFixed(2)}%
          (${result.diffCount} pixels different)
        </div>
        <div class="comparison">
          <div class="image-container">
            <h4>Baseline</h4>
            <img src="../baseline/${result.name}.png" alt="Baseline">
          </div>
          <div class="image-container">
            <h4>Diff</h4>
            <img src="${path.relative(path.dirname(outputPath), result.diffPath)}" alt="Diff">
          </div>
        </div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>`;

  await fs.writeFile(outputPath, html);
  console.log(`Report generated at: ${outputPath}`);
}

export default {
  init,
  launchBrowser,
  takeScreenshot,
  compareWithBaseline,
  updateBaseline,
  runVisualTest,
  runVisualTests,
  generateReport
};