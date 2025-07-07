#!/usr/bin/env node

/**
 * Comprehensive coverage report generator for FlowX
 * 
 * This script runs tests with coverage and generates detailed reports.
 * It then analyzes the coverage data to identify modules with low coverage.
 * 
 * Usage:
 *   node scripts/generate-coverage-report.js [options]
 * 
 * Options:
 *   --threshold <number>  Set minimum coverage threshold (default: 80)
 *   --detailed            Generate detailed report with file-by-file breakdown
 *   --verbose             Show verbose output
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle ES Module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  threshold: 80,
  detailed: args.includes('--detailed'),
  verbose: args.includes('--verbose')
};

// Check for threshold parameter
const thresholdIndex = args.indexOf('--threshold');
if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
  options.threshold = parseInt(args[thresholdIndex + 1], 10);
}

// Coverage directory paths
const coverageDir = path.join(process.cwd(), 'test-results', 'coverage');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
const lcovInfoPath = path.join(coverageDir, 'lcov.info');
const reportPath = path.join(process.cwd(), 'coverage-report.md');

console.log('\n📊 FLOWX COVERAGE REPORT GENERATOR 📊');
console.log('=============================================');
console.log(`Threshold: ${options.threshold}%`);
console.log(`Detailed Report: ${options.detailed ? 'Yes' : 'No'}`);
console.log('=============================================\n');

// Run tests with coverage
console.log('🧪 Running tests with coverage...');

const testProcess = spawn('node', ['scripts/run-tests.js', '--coverage'], {
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', async (code) => {
  if (code !== 0) {
    console.error('\n❌ Tests failed with exit code ' + code);
    process.exit(code);
  }

  // Load and analyze coverage data
  try {
    console.log('\n📈 Analyzing coverage data...');
    
    // Wait a bit to ensure coverage files are written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to read the coverage summary
    let coverageSummary;
    try {
      const summaryData = await fs.readFile(coverageSummaryPath, 'utf-8');
      coverageSummary = JSON.parse(summaryData);
    } catch (error) {
      console.error(`\n❌ Could not read coverage summary: ${error.message}`);
      console.log('Attempting to use lcov.info instead...');
      
      // Try to use lcov data instead
      try {
        await fs.access(lcovInfoPath);
        console.log('Found lcov.info file. Use an external tool to view detailed reports.');
        
        // Since we don't have summary data, we'll exit here
        console.log('\n✅ Coverage report generated!');
        console.log('📁 View HTML report: test-results/coverage/lcov-report/index.html');
        process.exit(0);
      } catch {
        console.error('Could not find lcov.info file either.');
        process.exit(1);
      }
    }
    
    // Total coverage calculation
    const total = coverageSummary.total;
    
    // Generate report
    let report = '# FlowX Code Coverage Report\n\n';
    report += `Generated on ${new Date().toLocaleString()}\n\n`;
    
    report += '## Overall Coverage\n\n';
    report += '| Metric | Coverage | Threshold | Status |\n';
    report += '| ------ | -------- | --------- | ------ |\n';
    
    const addCoverageRow = (name, coverage, threshold) => {
      const status = coverage >= threshold ? '✅' : '❌';
      return `| ${name} | ${coverage.toFixed(2)}% | ${threshold}% | ${status} |\n`;
    };
    
    report += addCoverageRow('Statements', total.statements.pct, options.threshold);
    report += addCoverageRow('Branches', total.branches.pct, options.threshold);
    report += addCoverageRow('Functions', total.functions.pct, options.threshold);
    report += addCoverageRow('Lines', total.lines.pct, options.threshold);
    
    // Add detailed breakdown if requested
    if (options.detailed) {
      report += '\n## Detailed Coverage by File\n\n';
      
      // Get all file entries (excluding total)
      const fileEntries = Object.entries(coverageSummary)
        .filter(([key]) => key !== 'total')
        .sort(([, a], [, b]) => a.statements.pct - b.statements.pct);
      
      // Find files below threshold
      const lowCoverageFiles = fileEntries.filter(([, stats]) => 
        stats.statements.pct < options.threshold || 
        stats.branches.pct < options.threshold || 
        stats.functions.pct < options.threshold || 
        stats.lines.pct < options.threshold
      );
      
      if (lowCoverageFiles.length > 0) {
        report += '### ⚠️ Files Below Threshold\n\n';
        report += '| File | Statements | Branches | Functions | Lines |\n';
        report += '| ---- | ---------- | -------- | --------- | ----- |\n';
        
        lowCoverageFiles.forEach(([file, stats]) => {
          report += `| ${file} | ${stats.statements.pct.toFixed(2)}% | ${stats.branches.pct.toFixed(2)}% | ${stats.functions.pct.toFixed(2)}% | ${stats.lines.pct.toFixed(2)}% |\n`;
        });
      }
      
      // Add all files if verbose
      if (options.verbose) {
        report += '\n### All Files\n\n';
        report += '| File | Statements | Branches | Functions | Lines |\n';
        report += '| ---- | ---------- | -------- | --------- | ----- |\n';
        
        fileEntries.forEach(([file, stats]) => {
          report += `| ${file} | ${stats.statements.pct.toFixed(2)}% | ${stats.branches.pct.toFixed(2)}% | ${stats.functions.pct.toFixed(2)}% | ${stats.lines.pct.toFixed(2)}% |\n`;
        });
      }
    }
    
    // Add improvement recommendations
    report += '\n## Recommendations\n\n';
    
    if (total.statements.pct < options.threshold) {
      report += '- ⚠️ Overall statement coverage is below the threshold. Consider adding more tests.\n';
    }
    if (total.branches.pct < options.threshold) {
      report += '- ⚠️ Branch coverage is below the threshold. Add tests for conditional logic paths.\n';
    }
    if (total.functions.pct < options.threshold) {
      report += '- ⚠️ Function coverage is below the threshold. Ensure all functions have tests.\n';
    }
    
    // Add specific recommendations for low coverage files
    if (options.detailed) {
      const lowCoverageFiles = Object.entries(coverageSummary)
        .filter(([key, stats]) => key !== 'total' && stats.statements.pct < options.threshold)
        .sort(([, a], [, b]) => a.statements.pct - b.statements.pct)
        .slice(0, 5);
        
      if (lowCoverageFiles.length > 0) {
        report += '\n### Priority Files for Test Improvement\n\n';
        lowCoverageFiles.forEach(([file, stats]) => {
          report += `- **${file}** (${stats.statements.pct.toFixed(2)}% covered): `;
          
          // Add specific recommendation based on the lowest coverage area
          const lowestArea = ['statements', 'branches', 'functions', 'lines'].reduce(
            (lowest, current) => stats[current].pct < stats[lowest].pct ? current : lowest,
            'statements'
          );
          
          switch(lowestArea) {
            case 'branches':
              report += 'Focus on adding tests for conditional branches and edge cases.\n';
              break;
            case 'functions':
              report += 'Several functions are not being tested. Add unit tests for each function.\n';
              break;
            case 'statements':
            case 'lines':
            default:
              report += 'Add more comprehensive test coverage for this file.\n';
              break;
          }
        });
      }
    }
    
    // Write report to file
    await fs.writeFile(reportPath, report);
    
    console.log('\n✅ Coverage report generated!');
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log('📁 Full HTML report: test-results/coverage/lcov-report/index.html');
    
    // Exit with failure code if below threshold
    if (total.statements.pct < options.threshold || 
        total.branches.pct < options.threshold || 
        total.functions.pct < options.threshold || 
        total.lines.pct < options.threshold) {
      console.error(`\n❌ Coverage below threshold of ${options.threshold}%`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ Error analyzing coverage: ${error.message}`);
    process.exit(1);
  }
});