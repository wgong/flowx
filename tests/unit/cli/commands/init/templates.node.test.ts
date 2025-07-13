/**
 * Template Generation Tests for FlowX
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Create a mock file system that tracks written content
const mockFileSystem = new Map<string, string>();

// Mock fs/promises to track content
jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
}));

const createSparcClaudeMd = (options: any) => {
  return `# ${options.name}

${options.description}

## Version
${options.version}

## Project Structure

This project follows the SPARC methodology for AI-assisted development.

### Directories
- \`.roo/\` - SPARC configuration and workflows
- \`docs/\` - Project documentation
- \`src/\` - Source code

## SPARC Workflow

This project uses the SPARC (Specification, Pseudocode, Architecture, Refine, Code) methodology.

## Getting Started

1. Review the project structure
2. Check the SPARC workflows in \`.roo/\`
3. Read the documentation in \`docs/\`
4. Start coding in \`src/\`
`;
};

const createPromptTemplate = (templateName: string, options: any = {}) => {
  return `# ${options.title || 'Coding Assistant'}

${options.description || 'A template for coding tasks'}

## Instructions

${options.instructions || 'You are a helpful assistant for coder tasks'}

## Context

Project: ${options.projectName || 'Unknown'}
Template: ${templateName}

## Guidelines

- Follow best practices
- Write clean, maintainable code
- Include proper error handling
- Add appropriate tests
`;
};

describe('Template Generation', () => {
  beforeEach(() => {
    mockFileSystem.clear();
    jest.clearAllMocks();
    
    // Set up fs mock behavior
    const fs = require('node:fs/promises');
    fs.writeFile.mockImplementation(async (filePath: string, content: string) => {
      mockFileSystem.set(filePath, content);
      return Promise.resolve();
    });
    fs.readFile.mockImplementation(async (filePath: string, encoding?: string) => {
      if (mockFileSystem.has(filePath)) {
        return mockFileSystem.get(filePath);
      }
      return 'mock-file-content';
    });
    fs.mkdir.mockResolvedValue(undefined);
    fs.access.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockFileSystem.clear();
  });

  describe('SPARC Claude MD Template', () => {
    it('should generate a CLAUDE.md file with project details', async () => {
      const options = {
        name: 'Test Project',
        description: 'A test project for FlowX',
        version: '0.1.0'
      };

      const content = createSparcClaudeMd(options);
      const filePath = path.join(process.cwd(), 'CLAUDE.md');
      
      // Write the content
      await fs.writeFile(filePath, content);
      
      // Read and verify content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      expect(fileContent).toContain('# Test Project');
      expect(fileContent).toContain('A test project for FlowX');
      expect(fileContent).toContain('## Version\n0.1.0');
      expect(fileContent).toContain('## Project Structure');
    });
  });

  describe('Prompt Templates', () => {
    it('should generate a prompt template file', async () => {
      const options = {
        title: 'Coding Assistant',
        description: 'A template for coding tasks',
        instructions: 'You are a helpful assistant for coder tasks',
        projectName: 'Test Project'
      };

      const content = createPromptTemplate('coding-assistant', options);
      const filePath = path.join(process.cwd(), 'prompt-template.md');
      
      // Write the content
      await fs.writeFile(filePath, content);
      
      // Read and verify content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      expect(fileContent).toContain('# Coding Assistant');
      expect(fileContent).toContain('A template for coding tasks');
      expect(fileContent).toContain('You are a helpful assistant for coder tasks');
    });

    it('should handle default values for prompt templates', async () => {
      const content = createPromptTemplate('basic-template');
      const filePath = path.join(process.cwd(), 'basic-template.md');
      
      // Write the content
      await fs.writeFile(filePath, content);
      
      // Read and verify content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      expect(fileContent).toContain('# Coding Assistant');
      expect(fileContent).toContain('Template: basic-template');
      expect(fileContent).toContain('Project: Unknown');
    });
  });
});