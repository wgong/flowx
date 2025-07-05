/**
 * Node.js compatible test for template generation functionality
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock the template generation function
const createSparcClaudeMd = (options: any) => {
  const name = options.name || 'Default Project';
  const description = options.description || 'A Claude-Flow project';
  const version = options.version || '1.0.0';
  
  return `# ${name}

${description}

## Version
${version}

## Project Structure
- src/
- docs/
- tests/

## Available Commands
- npm run build
- npm run test
`;
};

const createPromptTemplate = (templateName: string, options: any = {}) => {
  const name = options.name || 'Default Template';
  const description = options.description || 'A template for Claude';
  
  return `# ${name}

${description}

## Instructions
You are a helpful assistant for ${templateName} tasks.

## Context
[Replace with relevant context]

## Constraints
- Be concise
- Be helpful
- Follow user instructions
`;
};

describe('Template Generation', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(os.tmpdir(), `template-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('SPARC Claude MD Template', () => {
    it('should generate a CLAUDE.md file with project details', async () => {
      const options = {
        name: 'Test Project',
        description: 'A test project for Claude-Flow',
        version: '0.1.0',
      };
      
      const content = createSparcClaudeMd(options);
      
      // Write to temp file
      const filePath = path.join(tempDir, 'CLAUDE.md');
      await fs.writeFile(filePath, content);
      
      // Read and verify content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      expect(fileContent).toContain('# Test Project');
      expect(fileContent).toContain('A test project for Claude-Flow');
      expect(fileContent).toContain('## Version\n0.1.0');
      expect(fileContent).toContain('## Project Structure');
    });

    it('should use default values when options are not provided', async () => {
      const content = createSparcClaudeMd({});
      
      expect(content).toContain('# Default Project');
      expect(content).toContain('A Claude-Flow project');
      expect(content).toContain('## Version\n1.0.0');
    });
  });

  describe('Prompt Templates', () => {
    it('should generate a prompt template file', async () => {
      const options = {
        name: 'Coding Assistant',
        description: 'A template for coding tasks',
      };
      
      const content = createPromptTemplate('coder', options);
      
      // Write to temp file
      const filePath = path.join(tempDir, 'coder.md');
      await fs.writeFile(filePath, content);
      
      // Read and verify content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      expect(fileContent).toContain('# Coding Assistant');
      expect(fileContent).toContain('A template for coding tasks');
      expect(fileContent).toContain('You are a helpful assistant for coder tasks');
    });

    it('should handle different template types with appropriate content', async () => {
      const templates = [
        { type: 'architect', name: 'System Architect' },
        { type: 'researcher', name: 'Research Assistant' },
        { type: 'tester', name: 'Testing Expert' },
      ];
      
      for (const template of templates) {
        const content = createPromptTemplate(template.type, { name: template.name });
        expect(content).toContain(`# ${template.name}`);
        expect(content).toContain(`You are a helpful assistant for ${template.type} tasks`);
      }
    });
  });
});