#!/usr/bin/env node

/**
 * Coverage badge generator for FlowX
 * 
 * This script generates a coverage badge SVG file based on current test coverage.
 * It reads the coverage-summary.json file and creates an SVG badge for README.
 * 
 * Usage:
 *   node scripts/create-coverage-badge.js [options]
 * 
 * Options:
 *   --output <file>  Output path for SVG badge (default: coverage-badge.svg)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle ES Module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  output: 'coverage-badge.svg'
};

// Check for output parameter
const outputIndex = args.indexOf('--output');
if (outputIndex !== -1 && args[outputIndex + 1]) {
  options.output = args[outputIndex + 1];
}

// Path configurations
const coverageDir = path.join(process.cwd(), 'test-results', 'coverage');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
const outputPath = path.join(process.cwd(), options.output);

/**
 * Generate badge color based on coverage percentage
 * @param {number} coverage - Coverage percentage
 * @returns {string} - Color hex code
 */
function getBadgeColor(coverage) {
  if (coverage >= 90) return '#4c1';
  if (coverage >= 80) return '#97CA00';
  if (coverage >= 70) return '#DFB317';
  if (coverage >= 60) return '#FE7D37';
  return '#E05D44';
}

/**
 * Generate SVG badge with coverage data
 * @param {number} coverage - Coverage percentage
 * @returns {string} - SVG badge markup
 */
function generateBadgeSvg(coverage) {
  const color = getBadgeColor(coverage);
  const percentageText = `${coverage.toFixed(0)}%`;
  const labelWidth = 62;
  const valueWidth = percentageText.length * 8 + 12;
  const totalWidth = labelWidth + valueWidth;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth/2}" y="15" fill="#010101" fill-opacity=".3">coverage</text>
    <text x="${labelWidth/2}" y="14">coverage</text>
    <text x="${labelWidth + valueWidth/2}" y="15" fill="#010101" fill-opacity=".3">${percentageText}</text>
    <text x="${labelWidth + valueWidth/2}" y="14">${percentageText}</text>
  </g>
</svg>`;
}

/**
 * Generate markdown code for badge inclusion in README
 * @param {string} badgePath - Path to the badge SVG file
 * @returns {string} - Markdown code
 */
function generateMarkdownCode(badgePath) {
  return `![Test Coverage](${badgePath})`;
}

async function main() {
  console.log('\n🔖 FLOWX COVERAGE BADGE GENERATOR 🔖');
  console.log('=============================================');
  console.log(`Output: ${options.output}`);
  console.log('=============================================\n');
  
  try {
    // Read coverage summary
    let coverageSummary;
    try {
      await fs.access(coverageSummaryPath);
      const summaryData = await fs.readFile(coverageSummaryPath, 'utf-8');
      coverageSummary = JSON.parse(summaryData);
    } catch (error) {
      console.log('⚠️ No coverage summary found. Running tests with coverage...');
      
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const testProcess = spawn('node', ['scripts/run-tests.js', '--coverage'], {
          stdio: 'inherit',
          shell: true
        });
        
        testProcess.on('close', async (code) => {
          if (code !== 0) {
            reject(new Error(`Tests failed with exit code ${code}`));
            return;
          }
          
          try {
            // Wait a bit to ensure coverage files are written
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const summaryData = await fs.readFile(coverageSummaryPath, 'utf-8');
            coverageSummary = JSON.parse(summaryData);
            
            await generateBadge(coverageSummary);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    await generateBadge(coverageSummary);
    
  } catch (error) {
    console.error(`\n❌ Error generating badge: ${error.message}`);
    process.exit(1);
  }
}

async function generateBadge(coverageSummary) {
  // Calculate overall coverage
  const total = coverageSummary.total;
  const overallCoverage = (
    total.statements.pct +
    total.branches.pct +
    total.functions.pct +
    total.lines.pct
  ) / 4;
  
  console.log(`Overall coverage: ${overallCoverage.toFixed(2)}%`);
  
  // Generate SVG badge
  const badge = generateBadgeSvg(overallCoverage);
  
  // Save badge
  await fs.writeFile(outputPath, badge);
  
  console.log(`\n✅ Badge saved to: ${outputPath}`);
  console.log(`\nTo include in your README, use this markdown:\n`);
  console.log(`${generateMarkdownCode(path.basename(outputPath))}\n`);
}

main().catch(error => {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
});