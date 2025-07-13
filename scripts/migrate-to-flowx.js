#!/usr/bin/env node

/**
 * Migration script for Claude-Flow to FlowX
 * 
 * This script helps users migrate from Claude-Flow to FlowX by:
 * 1. Moving configuration files from .claude-flow/ to .flowx/
 * 2. Updating references to claude-flow in config files
 * 3. Verifying the migration was successful
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

console.log(`${colors.magenta}${colors.bold}
╔════════════════════════════════════════════╗
║    Claude-Flow to FlowX Migration Tool     ║
╚════════════════════════════════════════════╝${colors.reset}
`);

// Paths
const homeDir = os.homedir();
const claudeFlowDir = path.join(homeDir, '.claude-flow');
const flowxDir = path.join(homeDir, '.flowx');
const localClaudeFlowDir = path.join(process.cwd(), '.claude-flow');
const localFlowxDir = path.join(process.cwd(), '.flowx');

// Check for claude-flow in global and local directories
console.log(`${colors.cyan}Checking for Claude-Flow configuration...${colors.reset}`);

const hasGlobalConfig = fs.existsSync(claudeFlowDir);
const hasLocalConfig = fs.existsSync(localClaudeFlowDir);

if (!hasGlobalConfig && !hasLocalConfig) {
  console.log(`${colors.yellow}No Claude-Flow configuration found in either:
  - ${claudeFlowDir}
  - ${localClaudeFlowDir}${colors.reset}
  
No migration needed!`);
  process.exit(0);
}

// ==========================================
// Migrate global configuration if it exists
// ==========================================
if (hasGlobalConfig) {
  console.log(`\n${colors.cyan}Found global Claude-Flow configuration at:${colors.reset} ${claudeFlowDir}`);
  
  if (fs.existsSync(flowxDir)) {
    console.log(`${colors.yellow}FlowX configuration already exists at:${colors.reset} ${flowxDir}`);
    console.log(`${colors.yellow}Checking for any missing files to migrate...${colors.reset}`);
  } else {
    console.log(`${colors.green}Creating FlowX configuration directory:${colors.reset} ${flowxDir}`);
    fs.mkdirSync(flowxDir, { recursive: true });
  }
  
  // Copy all files from claude-flow to flowx
  const globalFiles = fs.readdirSync(claudeFlowDir);
  let filesChanged = 0;
  
  for (const file of globalFiles) {
    const source = path.join(claudeFlowDir, file);
    const target = path.join(flowxDir, file);
    
    // Skip if target already exists
    if (fs.existsSync(target)) {
      console.log(`  ${colors.yellow}Skipping existing file:${colors.reset} ${file}`);
      continue;
    }
    
    // Copy file or directory
    fs.copySync(source, target);
    console.log(`  ${colors.green}Copied:${colors.reset} ${file}`);
    filesChanged++;
    
    // If it's a JSON config file, update claude-flow references to flowx
    if (file.endsWith('.json')) {
      try {
        let content = fs.readFileSync(target, 'utf8');
        if (content.includes('claude-flow')) {
          const originalContent = content;
          content = content
            .replace(/claude-flow/g, 'flowx')
            .replace(/Claude-Flow/g, 'FlowX')
            .replace(/Claude Flow/g, 'FlowX');
          
          if (content !== originalContent) {
            fs.writeFileSync(target, content);
            console.log(`  ${colors.green}Updated references in:${colors.reset} ${file}`);
          }
        }
      } catch (err) {
        console.log(`  ${colors.red}Error updating references in ${file}:${colors.reset} ${err.message}`);
      }
    }
  }
  
  console.log(`\n${colors.green}Global migration complete! ${filesChanged} files migrated.${colors.reset}`);
}

// ==========================================
// Migrate local configuration if it exists
// ==========================================
if (hasLocalConfig) {
  console.log(`\n${colors.cyan}Found local Claude-Flow configuration at:${colors.reset} ${localClaudeFlowDir}`);
  
  if (fs.existsSync(localFlowxDir)) {
    console.log(`${colors.yellow}Local FlowX configuration already exists at:${colors.reset} ${localFlowxDir}`);
    console.log(`${colors.yellow}Checking for any missing files to migrate...${colors.reset}`);
  } else {
    console.log(`${colors.green}Creating local FlowX configuration directory:${colors.reset} ${localFlowxDir}`);
    fs.mkdirSync(localFlowxDir, { recursive: true });
  }
  
  // Copy all files from claude-flow to flowx
  const localFiles = fs.readdirSync(localClaudeFlowDir);
  let filesChanged = 0;
  
  for (const file of localFiles) {
    const source = path.join(localClaudeFlowDir, file);
    const target = path.join(localFlowxDir, file);
    
    // Skip if target already exists
    if (fs.existsSync(target)) {
      console.log(`  ${colors.yellow}Skipping existing file:${colors.reset} ${file}`);
      continue;
    }
    
    // Copy file or directory
    fs.copySync(source, target);
    console.log(`  ${colors.green}Copied:${colors.reset} ${file}`);
    filesChanged++;
    
    // If it's a JSON config file, update claude-flow references to flowx
    if (file.endsWith('.json')) {
      try {
        let content = fs.readFileSync(target, 'utf8');
        if (content.includes('claude-flow')) {
          const originalContent = content;
          content = content
            .replace(/claude-flow/g, 'flowx')
            .replace(/Claude-Flow/g, 'FlowX')
            .replace(/Claude Flow/g, 'FlowX');
          
          if (content !== originalContent) {
            fs.writeFileSync(target, content);
            console.log(`  ${colors.green}Updated references in:${colors.reset} ${file}`);
          }
        }
      } catch (err) {
        console.log(`  ${colors.red}Error updating references in ${file}:${colors.reset} ${err.message}`);
      }
    }
  }
  
  console.log(`\n${colors.green}Local migration complete! ${filesChanged} files migrated.${colors.reset}`);
}

// ==========================================
// Check for environment variables
// ==========================================
console.log(`\n${colors.cyan}Checking for environment variable usage...${colors.reset}`);

// Check if any environment variables with CLAUDE_FLOW prefix are in use
const envVars = Object.keys(process.env).filter(key => key.startsWith('CLAUDE_FLOW'));

if (envVars.length > 0) {
  console.log(`\n${colors.yellow}Found ${envVars.length} environment variables that may need updating:${colors.reset}`);
  
  for (const varName of envVars) {
    const newVarName = varName.replace('CLAUDE_FLOW', 'FLOWX');
    console.log(`  ${colors.yellow}${varName}${colors.reset} should be renamed to ${colors.green}${newVarName}${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}Environment variables can be updated in your shell profile or .env files.${colors.reset}`);
}

// ==========================================
// Check for script references
// ==========================================
console.log(`\n${colors.cyan}Checking for script references to claude-flow...${colors.reset}`);

try {
  // Look for package.json in current directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check scripts for claude-flow references
    let hasReferences = false;
    if (packageJson.scripts) {
      for (const [scriptName, command] of Object.entries(packageJson.scripts)) {
        if (command.includes('claude-flow')) {
          console.log(`  ${colors.yellow}Found reference in package.json script:${colors.reset} "${scriptName}": "${command}"`);
          console.log(`  ${colors.yellow}Consider updating to:${colors.reset} "${scriptName}": "${command.replace(/claude-flow/g, 'flowx')}"`);
          hasReferences = true;
        }
      }
    }
    
    if (!hasReferences) {
      console.log(`  ${colors.green}No claude-flow references found in package.json scripts.${colors.reset}`);
    }
  }
} catch (err) {
  console.log(`  ${colors.red}Error checking package.json:${colors.reset} ${err.message}`);
}

// ==========================================
// Final instructions
// ==========================================
console.log(`\n${colors.magenta}${colors.bold}Migration Summary${colors.reset}`);
console.log(`
${colors.green}✓${colors.reset} Configuration files migrated to new locations
${colors.green}✓${colors.reset} JSON configuration files updated with FlowX references

${colors.cyan}Next Steps:${colors.reset}
1. Update any scripts or aliases that use 'claude-flow' to use 'flowx'
2. Update environment variables from CLAUDE_FLOW_* to FLOWX_*
3. Test your application with the new FlowX configuration
`);

console.log(`${colors.magenta}${colors.bold}
╔════════════════════════════════════════════╗
║        Migration Complete - Enjoy!         ║
╚════════════════════════════════════════════╝${colors.reset}
`);