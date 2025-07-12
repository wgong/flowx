#!/usr/bin/env node

/**
 * AI-Assisted Test Generator
 * 
 * This script uses Claude to automatically generate tests based on source files.
 * It analyzes code structure, identifies edge cases, and creates comprehensive tests.
 * 
 * Usage:
 *   node scripts/ai-test-generator.js [options] <file-path>
 * 
 * Options:
 *   --output=<path>         Output file path (default: auto-generated)
 *   --model=claude-3.5-sonnet   Model to use (default: claude-3.5-sonnet)
 *   --coverage=<percentage> Target code coverage percentage (default: 90)
 *   --type=<unit|integration|e2e> Test type to generate (default: unit)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
let filePath = null;
const options = {
  output: null,
  model: 'claude-3.5-sonnet',
  coverage: 90,
  type: 'unit'
};

// Parse options
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value;
  } else {
    filePath = arg;
  }
}

if (!filePath) {
  console.error('Error: No file path provided');
  console.log('Usage: node scripts/ai-test-generator.js [options] <file-path>');
  process.exit(1);
}

// Resolve to absolute path
if (!path.isAbsolute(filePath)) {
  filePath = path.resolve(process.cwd(), filePath);
}

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

// Determine output file path if not specified
if (!options.output) {
  const parsedPath = path.parse(filePath);
  const baseDir = path.join(process.cwd(), 'tests');
  
  // Create appropriate test directory based on type
  let testDir;
  switch (options.type) {
    case 'unit':
      testDir = path.join(baseDir, 'unit', parsedPath.dir.replace(/^.*?src\//, ''));
      break;
    case 'integration':
      testDir = path.join(baseDir, 'integration');
      break;
    case 'e2e':
      testDir = path.join(baseDir, 'e2e');
      break;
    default:
      testDir = path.join(baseDir);
  }
  
  // Create directory if it doesn't exist
  fs.mkdirSync(testDir, { recursive: true });
  
  // Set output path
  options.output = path.join(testDir, parsedPath.name + '.test.js');
}

/**
 * Read the file and its dependencies to analyze
 */
function readSourceFile() {
  const content = fs.readFileSync(filePath, 'utf8');
  return content;
}

/**
 * Generate prompts for AI model to create tests
 */
function generatePrompt(sourceCode, options) {
  return `
# Test Generation Task

## Source File to Test
\`\`\`javascript
${sourceCode}
\`\`\`

## Test Type
${options.type} test

## Coverage Target
${options.coverage}% code coverage

## Test Framework
Jest with ES modules

## Requirements
1. Create comprehensive ${options.type} tests for the code above
2. Focus on covering edge cases and ensuring robust testing
3. Use proper mocking for external dependencies
4. Use proper test structure with describe/test blocks
5. Include setup and teardown code as needed
6. Aim for ${options.coverage}% code coverage
7. The tests should run in a Node.js environment
8. Use ES module syntax (import/export)

## Special Instructions
1. Don't just test the happy path - include tests for error conditions
2. Use modern JavaScript features (async/await, etc.)
3. Make tests deterministic (no random dependencies)
4. Group related tests with nested describe blocks
5. Use clear, descriptive test names
6. Include comments explaining complex test scenarios
7. Generate comprehensive tests for all functions in the code

Return only the complete test file content in JavaScript format.
`;
}

/**
 * Run Claude to generate tests
 */
async function generateTests() {
  try {
    // Read source code
    console.log(`Reading source file: ${filePath}`);
    const sourceCode = readSourceFile();
    
    // Generate prompt
    const prompt = generatePrompt(sourceCode, options);
    
    // Call Claude Code CLI 
    console.log(`Generating ${options.type} tests with ${options.model}...`);
    
    // Create temporary prompt file
    const tempPromptFile = path.join(os.tmpdir(), `test-prompt-${Date.now()}.md`);
    fs.writeFileSync(tempPromptFile, prompt);
    
    // Run Claude Code
    const result = execSync(
      `claude-code --model=${options.model} prompt ${tempPromptFile}`,
      { encoding: 'utf8' }
    );
    
    // Parse the result to extract just the test code
    // Claude might return markdown code blocks, so we need to extract the JS content
    let testCode = result;
    if (result.includes('```javascript') || result.includes('```js')) {
      const codeBlockMatch = result.match(/```(?:javascript|js)([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        testCode = codeBlockMatch[1].trim();
      }
    }
    
    // Write to output file
    console.log(`Writing tests to: ${options.output}`);
    fs.writeFileSync(options.output, testCode);
    
    // Clean up temporary file
    fs.unlinkSync(tempPromptFile);
    
    return options.output;
  } catch (error) {
    console.error('Error generating tests:', error.message);
    return null;
  }
}

/**
 * Run the generated tests to verify they work
 */
function verifyTests(testFilePath) {
  console.log('Verifying generated tests...');
  
  try {
    execSync(`npx jest ${testFilePath} --passWithNoTests`, { stdio: 'inherit' });
    console.log('✅ Generated tests pass!');
    return true;
  } catch (error) {
    console.error('❌ Generated tests failed:', error.message);
    return false;
  }
}

/**
 * Main execution flow
 */
async function main() {
  const testFile = await generateTests();
  if (testFile) {
    const verified = verifyTests(testFile);
    if (verified) {
      // Check code coverage
      console.log(`Successfully generated ${options.type} tests with target ${options.coverage}% coverage.`);
      console.log(`Test file: ${testFile}`);
    }
  }
}

main().catch(error => {
  console.error('AI test generation failed:', error);
  process.exit(1);
});