/**
 * Node.js compatible tests for validation functions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock validation functions
interface ValidationResult {
  valid: boolean;
  message?: string;
}

// Project name validation
const validateProjectName = (name: string): ValidationResult => {
  if (!name || name.trim() === '') {
    return { valid: false, message: 'Project name cannot be empty' };
  }
  
  if (!/^[a-z0-9-_]+$/i.test(name)) {
    return { valid: false, message: 'Project name can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true };
};

// Directory validation
const validateDirectory = async (dir: string): Promise<ValidationResult> => {
  try {
    const stats = await fs.stat(dir);
    
    if (!stats.isDirectory()) {
      return { valid: false, message: 'Path is not a directory' };
    }
    
    // Check if directory is empty
    const files = await fs.readdir(dir);
    if (files.length > 0) {
      return { valid: false, message: 'Directory is not empty' };
    }
    
    return { valid: true };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist, which is fine (we'll create it)
      return { valid: true };
    }
    
    return { valid: false, message: `Directory error: ${error.message}` };
  }
};

// Configuration validation
const validateConfig = (config: any): ValidationResult => {
  if (!config) {
    return { valid: false, message: 'Configuration is required' };
  }
  
  if (typeof config !== 'object') {
    return { valid: false, message: 'Configuration must be an object' };
  }
  
  // Check required fields
  if (!config.name) {
    return { valid: false, message: 'Configuration must include a name' };
  }
  
  // Validate specific fields if they exist
  if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
    return { valid: false, message: 'Version must be in format x.y.z' };
  }
  
  return { valid: true };
};

describe('Validation Functions', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join('src/tests/.tmp', `validation-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });
  
  describe('Project Name Validation', () => {
    it('should accept valid project names', () => {
      const validNames = [
        'project', 
        'project-name', 
        'project_name', 
        'Project123'
      ];
      
      for (const name of validNames) {
        const result = validateProjectName(name);
        expect(result.valid).toBe(true);
      }
    });
    
    it('should reject invalid project names', () => {
      const invalidNames = [
        '',
        ' ',
        'project name', // contains space
        'project!name', // contains special character
        'project/name', // contains slash
      ];
      
      for (const name of invalidNames) {
        const result = validateProjectName(name);
        expect(result.valid).toBe(false);
        expect(result.message).toBeTruthy();
      }
    });
  });
  
  describe('Directory Validation', () => {
    it('should validate empty directory', async () => {
      const result = await validateDirectory(tempDir);
      expect(result.valid).toBe(true);
    });
    
    it('should reject non-empty directory', async () => {
      // Create a file in the directory
      const filePath = path.join(tempDir, 'test-file.txt');
      await fs.writeFile(filePath, 'test content');
      
      const result = await validateDirectory(tempDir);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Directory is not empty');
    });
    
    it('should accept non-existent directory', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      const result = await validateDirectory(nonExistentDir);
      expect(result.valid).toBe(true);
    });
    
    it('should reject path that is a file', async () => {
      // Create a file
      const filePath = path.join(tempDir, 'test-file.txt');
      await fs.writeFile(filePath, 'test content');
      
      const result = await validateDirectory(filePath);
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Path is not a directory');
    });
  });
  
  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        name: 'test-project',
        version: '1.0.0',
        description: 'A test project'
      };
      
      const result = validateConfig(validConfig);
      expect(result.valid).toBe(true);
    });
    
    it('should reject missing name', () => {
      const invalidConfig = {
        version: '1.0.0'
      };
      
      const result = validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('name');
    });
    
    it('should reject invalid version format', () => {
      const invalidConfig = {
        name: 'test-project',
        version: '1.0'  // Missing patch version
      };
      
      const result = validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Version');
    });
    
    it('should reject non-object config', () => {
      const invalidConfigs = [
        null,
        'string',
        123,
        []
      ];
      
      for (const config of invalidConfigs) {
        const result = validateConfig(config);
        expect(result.valid).toBe(false);
      }
    });
  });
});