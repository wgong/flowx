#!/usr/bin/env node

/**
 * Coverage gap analyzer for FlowX
 * 
 * This script analyzes existing coverage reports to identify areas that need testing.
 * It identifies files with no tests or low coverage and generates a report of gaps.
 * 
 * Usage:
 *   node scripts/identify-low-coverage.js [options]
 * 
 * Options:
 *   --threshold <number>  Set minimum coverage threshold (default: 80)
 *   --output <file>       Output file for the report (default: coverage-gaps.md)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convert exec to Promise-based
const execAsync = promisify(exec);

// Handle ES Module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  threshold: 80,
  output: 'coverage-gaps.md'
};

// Check for threshold parameter
const thresholdIndex = args.indexOf('--threshold');
if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
  options.threshold = parseInt(args[thresholdIndex + 1], 10);
}

// Check for output parameter
const outputIndex = args.indexOf('--output');
if (outputIndex !== -1 && args[outputIndex + 1]) {
  options.output = args[outputIndex + 1];
}

// Path configurations
const coverageDir = path.join(process.cwd(), 'test-results', 'coverage');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
const srcDir = path.join(process.cwd(), 'src');
const outputPath = path.join(process.cwd(), options.output);

/**
 * Get all source files in the project
 */
async function getAllSourceFiles(dir) {
  const allFiles = [];
  
  async function scanDir(currentDir) {
    const files = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file.name);
      
      if (file.isDirectory()) {
        await scanDir(fullPath);
      } else if (
        (file.name.endsWith('.js') || file.name.endsWith('.ts')) && 
        !file.name.endsWith('.test.js') && 
        !file.name.endsWith('.test.ts') && 
        !file.name.endsWith('.spec.js') && 
        !file.name.endsWith('.spec.ts') && 
        !file.name.endsWith('.d.ts')
      ) {
        const relativePath = path.relative(process.cwd(), fullPath);
        allFiles.push(relativePath);
      }
    }
  }
  
  await scanDir(dir);
  return allFiles;
}

/**
 * Find test files for a source file
 */
async function findTestsForFile(sourceFile) {
  const basename = path.basename(sourceFile, path.extname(sourceFile));
  const dirName = path.dirname(sourceFile);
  
  const possibleTestLocations = [
    path.join('tests', 'unit', dirName.replace('src/', ''), `${basename}.test.js`),
    path.join('tests', 'unit', dirName.replace('src/', ''), `${basename}.test.ts`),
    path.join('tests', 'unit', dirName.replace('src/', ''), `${basename}.spec.js`),
    path.join('tests', 'unit', dirName.replace('src/', ''), `${basename}.spec.ts`),
    path.join('tests', 'integration', dirName.replace('src/', ''), `${basename}.test.js`),
    path.join('tests', 'integration', dirName.replace('src/', ''), `${basename}.test.ts`),
    path.join('tests', 'integration', dirName.replace('src/', ''), `${basename}.spec.js`),
    path.join('tests', 'integration', dirName.replace('src/', ''), `${basename}.spec.ts`),
    path.join(dirName, '__tests__', `${basename}.test.js`),
    path.join(dirName, '__tests__', `${basename}.test.ts`),
    path.join(dirName, '__tests__', `${basename}.spec.js`),
    path.join(dirName, '__tests__', `${basename}.spec.ts`)
  ];
  
  const testFiles = [];
  
  for (const testLocation of possibleTestLocations) {
    try {
      await fs.access(testLocation);
      testFiles.push(testLocation);
    } catch (error) {
      // File doesn't exist, skip
    }
  }
  
  return testFiles;
}

/**
 * Get file exports by analyzing the source code
 */
async function getFileExports(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Simple regex pattern to identify exports
    const exportPatterns = [
      /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g,
      /export\s+default\s+(?:const|let|var|function|class)\s+(\w+)/g,
      /export\s+default\s+(\w+)/g
    ];
    
    const exports = new Set();
    
    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          exports.add(match[1]);
        }
      }
    }
    
    return Array.from(exports);
  } catch (error) {
    console.error(`Error analyzing ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * Count test imports that reference the original file
 */
async function countTestReferences(sourceFile, testFiles) {
  const basename = path.basename(sourceFile, path.extname(sourceFile));
  let referenceCount = 0;
  
  for (const testFile of testFiles) {
    try {
      const content = await fs.readFile(testFile, 'utf8');
      
      // Check for imports from the source file
      const importPatterns = [
        new RegExp(`import\\s+.*?from\\s+['"].*?${basename}['"]`, 'g'),
        new RegExp(`require\\s*\\(\\s*['"].*?${basename}['"]\\s*\\)`, 'g')
      ];
      
      for (const pattern of importPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          referenceCount += matches.length;
        }
      }
      
      // Check for direct mentions of the file name or exports
      const exports = await getFileExports(sourceFile);
      for (const exportName of exports) {
        const exportPattern = new RegExp(`\\b${exportName}\\b`, 'g');
        const matches = content.match(exportPattern);
        if (matches) {
          referenceCount += matches.length;
        }
      }
      
    } catch (error) {
      console.error(`Error analyzing test file ${testFile}: ${error.message}`);
    }
  }
  
  return referenceCount;
}

async function main() {
  console.log('\n🔍 FLOWX COVERAGE GAP ANALYZER 🔍');
  console.log('=============================================');
  console.log(`Threshold: ${options.threshold}%`);
  console.log(`Output: ${options.output}`);
  console.log('=============================================\n');
  
  try {
    // First, check if coverage data exists
    let coverageSummary;
    try {
      await fs.access(coverageSummaryPath);
      const summaryData = await fs.readFile(coverageSummaryPath, 'utf-8');
      coverageSummary = JSON.parse(summaryData);
    } catch (error) {
      console.log('⚠️ No existing coverage data found. Running tests with coverage...');
      
      try {
        await execAsync('node scripts/run-tests.js --coverage');
        console.log('✅ Tests completed.');
        
        try {
          const summaryData = await fs.readFile(coverageSummaryPath, 'utf-8');
          coverageSummary = JSON.parse(summaryData);
        } catch (error) {
          throw new Error('Failed to generate or read coverage data');
        }
      } catch (error) {
        console.error(`❌ Error running tests: ${error.message}`);
        process.exit(1);
      }
    }
    
    // Get all source files
    console.log('📂 Scanning source files...');
    const sourceFiles = await getAllSourceFiles(srcDir);
    console.log(`Found ${sourceFiles.length} source files.`);
    
    // Analyze each source file
    console.log('🔍 Analyzing coverage gaps...');
    
    const results = {
      filesWithNoTests: [],
      filesWithLowCoverage: [],
      filesWithGoodCoverage: [],
      summary: {
        total: sourceFiles.length,
        noTests: 0,
        lowCoverage: 0,
        goodCoverage: 0,
      }
    };
    
    for (const sourceFile of sourceFiles) {
      // Normalize file path to match coverage report format
      const normalizedPath = sourceFile.replace(/\\/g, '/');
      
      // Find test files for this source file
      const testFiles = await findTestsForFile(sourceFile);
      const testReferences = await countTestReferences(sourceFile, testFiles);
      
      // Check if file exists in coverage report
      const coverageData = coverageSummary[normalizedPath];
      
      if (!coverageData) {
        // No coverage data found
        results.filesWithNoTests.push({
          file: normalizedPath,
          testFiles: testFiles.length,
          testReferences,
          exports: await getFileExports(sourceFile)
        });
        results.summary.noTests++;
      } else {
        // Calculate average coverage
        const coverage = {
          statements: coverageData.statements.pct,
          branches: coverageData.branches.pct,
          functions: coverageData.functions.pct,
          lines: coverageData.lines.pct,
          average: (
            coverageData.statements.pct +
            coverageData.branches.pct +
            coverageData.functions.pct +
            coverageData.lines.pct
          ) / 4
        };
        
        if (coverage.average < options.threshold) {
          results.filesWithLowCoverage.push({
            file: normalizedPath,
            coverage,
            testFiles: testFiles.length,
            testReferences,
            exports: await getFileExports(sourceFile)
          });
          results.summary.lowCoverage++;
        } else {
          results.filesWithGoodCoverage.push({
            file: normalizedPath,
            coverage
          });
          results.summary.goodCoverage++;
        }
      }
    }
    
    // Sort results by importance
    results.filesWithNoTests.sort((a, b) => b.exports.length - a.exports.length);
    results.filesWithLowCoverage.sort((a, b) => a.coverage.average - b.coverage.average);
    
    // Generate report
    console.log('📝 Generating report...');
    let report = '# FlowX Coverage Gap Analysis\n\n';
    report += `Generated on ${new Date().toLocaleString()}\n\n`;
    
    // Summary section
    report += '## Summary\n\n';
    report += `- Total source files: ${results.summary.total}\n`;
    report += `- Files with no tests: ${results.summary.noTests} (${(results.summary.noTests / results.summary.total * 100).toFixed(1)}%)\n`;
    report += `- Files with low coverage: ${results.summary.lowCoverage} (${(results.summary.lowCoverage / results.summary.total * 100).toFixed(1)}%)\n`;
    report += `- Files with good coverage: ${results.summary.goodCoverage} (${(results.summary.goodCoverage / results.summary.total * 100).toFixed(1)}%)\n\n`;
    
    // Files with no tests
    if (results.filesWithNoTests.length > 0) {
      report += '## Files with No Tests\n\n';
      report += '| File | Exported Items | Priority |\n';
      report += '| ---- | -------------- | -------- |\n';
      
      results.filesWithNoTests.forEach(file => {
        const priority = file.exports.length > 3 ? 'High' : file.exports.length > 0 ? 'Medium' : 'Low';
        report += `| ${file.file} | ${file.exports.join(', ')} | ${priority} |\n`;
      });
    }
    
    // Files with low coverage
    if (results.filesWithLowCoverage.length > 0) {
      report += '\n## Files with Low Coverage\n\n';
      report += '| File | Average Coverage | Statements | Branches | Functions | Lines | Priority |\n';
      report += '| ---- | ---------------- | ---------- | -------- | --------- | ----- | -------- |\n';
      
      results.filesWithLowCoverage.forEach(file => {
        const avgCoverage = file.coverage.average.toFixed(1);
        const priority = file.coverage.average < options.threshold * 0.5 ? 'High' : 'Medium';
        
        report += `| ${file.file} | ${avgCoverage}% | ${file.coverage.statements.toFixed(1)}% | ${file.coverage.branches.toFixed(1)}% | ${file.coverage.functions.toFixed(1)}% | ${file.coverage.lines.toFixed(1)}% | ${priority} |\n`;
      });
    }
    
    // Action plan
    report += '\n## Action Plan\n\n';
    
    // High priority files that need tests
    const highPriorityNoTests = results.filesWithNoTests
      .filter(file => file.exports.length > 3)
      .slice(0, 5);
    
    if (highPriorityNoTests.length > 0) {
      report += '### 1. Create Tests for These Critical Files\n\n';
      highPriorityNoTests.forEach(file => {
        report += `- [ ] ${file.file} (${file.exports.length} exports)\n`;
      });
    }
    
    // High priority files that need better coverage
    const highPriorityLowCoverage = results.filesWithLowCoverage
      .filter(file => file.coverage.average < options.threshold * 0.5)
      .slice(0, 5);
    
    if (highPriorityLowCoverage.length > 0) {
      report += '\n### 2. Improve Coverage for These Files\n\n';
      highPriorityLowCoverage.forEach(file => {
        const lowestCoverage = ['statements', 'branches', 'functions', 'lines']
          .reduce((lowest, current) => 
            file.coverage[current] < file.coverage[lowest] ? current : lowest
          , 'statements');
        
        report += `- [ ] ${file.file} (${file.coverage.average.toFixed(1)}% average, ${lowestCoverage} need most work)\n`;
      });
    }
    
    // Save report
    await fs.writeFile(outputPath, report);
    
    console.log(`\n✅ Report saved to: ${outputPath}`);
    console.log(`Files with no tests: ${results.summary.noTests}`);
    console.log(`Files with low coverage: ${results.summary.lowCoverage}`);
    console.log(`Files with good coverage: ${results.summary.goodCoverage}`);
    
  } catch (error) {
    console.error(`\n❌ Error analyzing coverage: ${error.message}`);
    process.exit(1);
  }
}

main();