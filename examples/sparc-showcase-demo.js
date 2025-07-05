#!/usr/bin/env node
/**
 * SPARC Methodology Showcase Demo
 * Demonstrates the full power of SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
 */

import { execSync } from 'child_process';

console.log('🧠 SPARC Methodology Showcase Demo');
console.log('==================================\n');

function runCommand(cmd, description) {
  console.log(`🔧 ${description}`);
  console.log(`Command: ${cmd}`);
  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Success');
    return result;
  } catch (error) {
    console.log('⚠️ Demo mode - would execute in real environment');
  }
  console.log();
}

// Demo 1: Architecture Mode
console.log('📐 Demo 1: SPARC Architecture Mode');
console.log('=================================');
runCommand(
  'node cli.js sparc architect "Design a microservices e-commerce platform"',
  'Architectural planning for complex systems'
);

// Demo 2: Code Development Mode
console.log('💻 Demo 2: SPARC Code Development Mode');
console.log('====================================');
runCommand(
  'node cli.js sparc code "Implement user authentication service with JWT"',
  'Systematic code implementation'
);

// Demo 3: Test-Driven Development
console.log('🧪 Demo 3: SPARC TDD Mode');
console.log('========================');
runCommand(
  'node cli.js sparc tdd "Create comprehensive test suite for payment processing"',
  'Test-driven development workflow'
);

// Demo 4: Code Review Mode
console.log('👁️  Demo 4: SPARC Review Mode');
console.log('============================');
runCommand(
  'node cli.js sparc review "Analyze codebase for security vulnerabilities and performance"',
  'Systematic code review and analysis'
);

// Demo 5: Debugging Mode
console.log('🐛 Demo 5: SPARC Debug Mode');
console.log('==========================');
runCommand(
  'node cli.js sparc debug "Troubleshoot memory leaks in Node.js application"',
  'Systematic debugging approach'
);

// Demo 6: Documentation Mode
console.log('📚 Demo 6: SPARC Documentation Mode');
console.log('==================================');
runCommand(
  'node cli.js sparc docs "Generate API documentation and user guides"',
  'Comprehensive documentation generation'
);

// Demo 7: Security Analysis
console.log('🛡️  Demo 7: SPARC Security Mode');
console.log('==============================');
runCommand(
  'node cli.js sparc security "Perform security audit of web application"',
  'Security analysis and vulnerability assessment'
);

// Demo 8: Batch Mode - Multiple SPARC Modes
console.log('🚀 Demo 8: SPARC Batch Mode');
console.log('==========================');
runCommand(
  'node cli.js sparc batch --modes "architect,code,tdd,review" --parallel',
  'Parallel execution of multiple SPARC modes'
);

// Demo 9: SPARC with Options
console.log('⚙️  Demo 9: SPARC with Advanced Options');
console.log('=====================================');
runCommand(
  'node cli.js sparc architect "Design API gateway" --namespace production --verbose --dry-run',
  'SPARC with custom options and dry-run mode'
);

// Demo 10: List Available Modes
console.log('📋 Demo 10: Available SPARC Modes');
console.log('================================');
console.log('Command: node cli.js sparc list');
try {
  const modes = execSync('node cli.js sparc list', { encoding: 'utf8' });
  console.log(modes);
} catch (error) {
  console.log('Available SPARC Modes:');
  console.log('• architect - Architecture design and system planning');
  console.log('• code - Code implementation and development');
  console.log('• tdd - Test-driven development and testing');
  console.log('• review - Code review and quality assurance');
  console.log('• debug - Debugging and troubleshooting');
  console.log('• docs - Documentation generation');
  console.log('• security - Security analysis and review');
  console.log('• batch - Batch execution of multiple modes');
}

console.log('\n🎯 SPARC Methodology Benefits');
console.log('============================');
console.log('✅ Systematic approach to software development');
console.log('✅ Consistent quality across all development phases');
console.log('✅ Parallel processing for faster delivery');
console.log('✅ Built-in validation and error checking');
console.log('✅ Memory persistence for knowledge retention');
console.log('✅ Real-time monitoring and progress tracking');

console.log('\n💡 Best Practices');
console.log('================');
console.log('1. Start with "architect" mode for system design');
console.log('2. Use "tdd" mode before "code" for better quality');
console.log('3. Run "review" mode after implementation');
console.log('4. Use "security" mode for production systems');
console.log('5. Leverage "batch" mode for comprehensive workflows');
console.log('6. Use --dry-run for planning and validation');

console.log('\n🚀 Ready to experience SPARC methodology!');
console.log('Run any of the commands above to get started.');
console.log('Use "node cli.js sparc --help" for detailed options.'); 