#!/usr/bin/env node
/**
 * Claude-Flow Batch Initialization Demo
 * Showcases batch operations for multiple projects and workflows
 */

console.log('🚀 Claude-Flow Batch Initialization Demo');
console.log('========================================\n');

// Demo 1: Basic Batch Project Initialization
console.log('📋 Demo 1: Batch Project Initialization');
console.log('--------------------------------------');
console.log('Command: node cli.js batch init --projects "demo-api,demo-web,demo-cli" --template basic');
console.log('This creates 3 basic projects with standardized structure.\n');

// Demo 2: Advanced Batch with Configuration
console.log('📋 Demo 2: Batch with Configuration File');
console.log('---------------------------------------');
console.log('Command: node cli.js batch config create enterprise-batch.json');
console.log('Command: node cli.js batch init --config enterprise-batch.json --parallel');
console.log('Uses configuration file for enterprise-grade batch initialization.\n');

// Demo 3: Batch SPARC Operations
console.log('📋 Demo 3: Batch SPARC Operations');
console.log('--------------------------------');
console.log('Command: node cli.js batch sparc architect "Design microservices system" --modes "architect,code,review"');
console.log('Executes multiple SPARC modes in sequence or parallel.\n');

// Demo 4: Batch Swarm Creation
console.log('📋 Demo 4: Batch Swarm Management');
console.log('--------------------------------');
console.log('Command: node cli.js batch swarm create --swarms "dev-team,qa-team,ops-team" --parallel');
console.log('Creates multiple coordinated swarms for different purposes.\n');

// Demo 5: Batch Templates
console.log('📋 Demo 5: Available Batch Templates');
console.log('-----------------------------------');
try {
  const { execSync } = require('child_process');
  const result = execSync('node cli.js batch templates', { encoding: 'utf8', stdio: 'pipe' });
  console.log(result);
} catch (error) {
  console.log('⚠️ Demo mode - would show available batch templates');
  console.log('Templates: microservices, fullstack, enterprise, development, research\n');
}

// Demo 6: Batch Status Monitoring
console.log('📋 Demo 6: Batch Operations Status');
console.log('---------------------------------');
try {
  const { execSync } = require('child_process');
  const result = execSync('node cli.js batch status', { encoding: 'utf8', stdio: 'pipe' });
  console.log(result);
} catch (error) {
  console.log('⚠️ Demo mode - would show batch operation status');
  console.log('Status: Running operations, completion times, success rates\n');
}

// Demo 7: Dry Run Examples
console.log('📋 Demo 7: Dry Run Mode');
console.log('----------------------');
console.log('Command: node cli.js batch init --projects "test1,test2,test3" --dry-run');
console.log('Shows what would be executed without actually running.\n');

try {
  const { execSync } = require('child_process');
  const result = execSync('node cli.js batch init --projects "test1,test2,test3" --dry-run', { encoding: 'utf8', stdio: 'pipe' });
  console.log(result);
} catch (error) {
  console.log('⚠️ Demo mode - would show dry run output\n');
}

// Demo 8: Real Batch Execution Examples
console.log('📋 Demo 8: Real Batch Command Examples');
console.log('------------------------------------');
console.log('# Initialize multiple microservices:');
console.log('node cli.js batch init --projects "user-service,order-service,payment-service" --template microservices\n');

console.log('# Batch SPARC workflow:');
console.log('node cli.js batch sparc architect "E-commerce platform" --modes "architect,code,tdd,security" --parallel\n');

console.log('# Create development environment:');
console.log('node cli.js batch init --template development --projects "frontend,backend,database" --force\n');

console.log('# Batch swarm coordination:');
console.log('node cli.js batch swarm create --swarms "dev,staging,prod" --agents 5 --parallel\n');

// Demo 9: Configuration Management
console.log('📋 Demo 9: Batch Configuration Management');
console.log('---------------------------------------');
console.log('# Create configuration:');
console.log('node cli.js batch config create my-project-batch.json\n');

console.log('# Validate configuration:');
console.log('node cli.js batch config validate my-project-batch.json\n');

console.log('# List available configurations:');
console.log('node cli.js batch config list\n');

// Demo 10: Integration with Other Commands
console.log('📋 Demo 10: Integration Examples');
console.log('------------------------------');
console.log('# Batch + Memory integration:');
console.log('node cli.js memory store "batch-template" "Standard microservices setup"');
console.log('node cli.js batch init --projects "service1,service2" --template microservices\n');

console.log('# Batch + Monitoring:');
console.log('node cli.js batch init --projects "app1,app2,app3" --template enterprise');
console.log('node cli.js monitor start --track-batch\n');

console.log('# Batch + SPARC + Swarm workflow:');
console.log('node cli.js batch sparc architect "Multi-service system" --modes "architect,code"');
console.log('node cli.js batch swarm create --swarms "implementation-team" --objective "Build architected system"\n');

console.log('🎯 Batch Operations Benefits');
console.log('===========================');
console.log('✅ Consistent project structure across multiple services');
console.log('✅ Parallel execution for faster development setup');
console.log('✅ Configuration-driven batch operations');
console.log('✅ Integration with SPARC methodology and Swarm coordination');
console.log('✅ Real-time monitoring and status tracking');
console.log('✅ Template-based standardization');
console.log('✅ Dry-run mode for safe planning');

console.log('\n💡 Best Practices');
console.log('================');
console.log('1. Use configuration files for complex batch operations');
console.log('2. Start with --dry-run to validate operations');
console.log('3. Leverage templates for consistent project structure');
console.log('4. Use parallel execution for independent operations');
console.log('5. Monitor batch operations with status commands');
console.log('6. Integrate with memory bank for reusable patterns');

console.log('\n🚀 Ready to scale your development with batch operations!');
console.log('Run any of the commands above to get started.');
console.log('Use "node cli.js batch --help" for complete batch command reference.');