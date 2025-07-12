/**
 * Tests for swarm memory functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock SwarmMemory implementation for Node.js tests
class SwarmMemory {
  private data: Map<string, any>;
  private namespace: string;
  private persistPath: string | null;
  private autoFlush: boolean;

  constructor(options: {
    namespace?: string;
    persistPath?: string;
    autoFlush?: boolean;
  } = {}) {
    this.data = new Map();
    this.namespace = options.namespace || 'default';
    this.persistPath = options.persistPath || null;
    this.autoFlush = options.autoFlush !== undefined ? options.autoFlush : false;
  }

  // Store a value with key
  async set(key: string, value: any): Promise<void> {
    const fullKey = `${this.namespace}:${key}`;
    this.data.set(fullKey, {
      key: fullKey,
      value,
      timestamp: Date.now()
    });
    
    if (this.autoFlush && this.persistPath) {
      await this.flush();
    }
  }

  // Get a value by key
  async get(key: string): Promise<any | null> {
    const fullKey = `${this.namespace}:${key}`;
    const entry = this.data.get(fullKey);
    return entry ? entry.value : null;
  }

  // Check if key exists
  async has(key: string): Promise<boolean> {
    const fullKey = `${this.namespace}:${key}`;
    return this.data.has(fullKey);
  }

  // Delete a key
  async delete(key: string): Promise<boolean> {
    const fullKey = `${this.namespace}:${key}`;
    const result = this.data.delete(fullKey);
    
    if (result && this.autoFlush && this.persistPath) {
      await this.flush();
    }
    
    return result;
  }

  // List all keys in namespace
  async keys(): Promise<string[]> {
    const prefix = `${this.namespace}:`;
    return Array.from(this.data.keys())
      .filter(key => key.startsWith(prefix))
      .map(key => key.substring(prefix.length));
  }

  // Get all entries in namespace
  async entries(): Promise<Array<{ key: string; value: any; timestamp: number }>> {
    const prefix = `${this.namespace}:`;
    return Array.from(this.data.values())
      .filter(entry => entry.key.startsWith(prefix))
      .map(entry => ({
        key: entry.key.substring(prefix.length),
        value: entry.value,
        timestamp: entry.timestamp
      }));
  }

  // Clear all entries in namespace
  async clear(): Promise<void> {
    const keysToDelete = await this.keys();
    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  // Persist memory to disk
  async flush(): Promise<boolean> {
    if (!this.persistPath) {
      return false;
    }

    try {
      const entries = await this.entries();
      const serialized = JSON.stringify(entries);
      await fs.writeFile(this.persistPath, serialized, 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to flush memory:', error);
      return false;
    }
  }

  // Load memory from disk
  async load(): Promise<boolean> {
    if (!this.persistPath) {
      return false;
    }

    try {
      const exists = await fs.access(this.persistPath).then(() => true).catch(() => false);
      if (!exists) {
        return false;
      }

      const data = await fs.readFile(this.persistPath, 'utf-8');
      const entries = JSON.parse(data);
      
      for (const entry of entries) {
        const fullKey = `${this.namespace}:${entry.key}`;
        this.data.set(fullKey, {
          key: fullKey,
          value: entry.value,
          timestamp: entry.timestamp
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load memory:', error);
      return false;
    }
  }
}

// Tests
describe('Swarm Memory', () => {
  let tempDir: string;
  let memoryPath: string;
  
  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join('./.tmp', `swarm-memory-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    memoryPath = path.join(tempDir, 'swarm-memory.json');
  });
  
  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });
  
  describe('In-memory Operations', () => {
    it('should store and retrieve values', async () => {
      const memory = new SwarmMemory({ namespace: 'test' });
      
      await memory.set('key1', 'value1');
      await memory.set('key2', { nested: 'value2' });
      
      expect(await memory.get('key1')).toBe('value1');
      expect(await memory.get('key2')).toEqual({ nested: 'value2' });
    });
    
    it('should check if keys exist', async () => {
      const memory = new SwarmMemory();
      
      await memory.set('existingKey', 'value');
      
      expect(await memory.has('existingKey')).toBe(true);
      expect(await memory.has('nonExistingKey')).toBe(false);
    });
    
    it('should delete keys', async () => {
      const memory = new SwarmMemory();
      
      await memory.set('key1', 'value1');
      await memory.set('key2', 'value2');
      
      expect(await memory.delete('key1')).toBe(true);
      expect(await memory.has('key1')).toBe(false);
      expect(await memory.has('key2')).toBe(true);
    });
    
    it('should list all keys', async () => {
      const memory = new SwarmMemory({ namespace: 'test' });
      
      await memory.set('key1', 'value1');
      await memory.set('key2', 'value2');
      
      const keys = await memory.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
    
    it('should get all entries', async () => {
      const memory = new SwarmMemory();
      
      await memory.set('key1', 'value1');
      await memory.set('key2', 'value2');
      
      const entries = await memory.entries();
      expect(entries.length).toBe(2);
      expect(entries[0].key).toBe('key1');
      expect(entries[0].value).toBe('value1');
      expect(entries[1].key).toBe('key2');
      expect(entries[1].value).toBe('value2');
    });
    
    it('should clear all entries', async () => {
      const memory = new SwarmMemory();
      
      await memory.set('key1', 'value1');
      await memory.set('key2', 'value2');
      
      await memory.clear();
      
      expect(await memory.keys()).toEqual([]);
    });
    
    it('should respect namespaces', async () => {
      const memory1 = new SwarmMemory({ namespace: 'ns1' });
      const memory2 = new SwarmMemory({ namespace: 'ns2' });
      
      await memory1.set('key', 'value1');
      await memory2.set('key', 'value2');
      
      expect(await memory1.get('key')).toBe('value1');
      expect(await memory2.get('key')).toBe('value2');
    });
  });
  
  describe('Persistence', () => {
    it('should persist memory to disk', async () => {
      const memory = new SwarmMemory({
        namespace: 'test',
        persistPath: memoryPath
      });
      
      await memory.set('key1', 'value1');
      await memory.set('key2', { complex: 'value2' });
      
      const result = await memory.flush();
      expect(result).toBe(true);
      
      // Check file was created
      const exists = await fs.access(memoryPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
    
    it('should load memory from disk', async () => {
      // Create and persist memory
      const memory1 = new SwarmMemory({
        namespace: 'test',
        persistPath: memoryPath
      });
      
      await memory1.set('key1', 'value1');
      await memory1.set('key2', { complex: 'value2' });
      await memory1.flush();
      
      // Create new instance and load
      const memory2 = new SwarmMemory({
        namespace: 'test',
        persistPath: memoryPath
      });
      
      const loadResult = await memory2.load();
      expect(loadResult).toBe(true);
      
      // Check values were loaded
      expect(await memory2.get('key1')).toBe('value1');
      expect(await memory2.get('key2')).toEqual({ complex: 'value2' });
    });
    
    it('should automatically flush when autoFlush is enabled', async () => {
      const memory = new SwarmMemory({
        namespace: 'test',
        persistPath: memoryPath,
        autoFlush: true
      });
      
      await memory.set('key', 'value');
      
      // Check file was created without explicit flush
      const exists = await fs.access(memoryPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Create new instance and load
      const memory2 = new SwarmMemory({
        namespace: 'test',
        persistPath: memoryPath
      });
      
      await memory2.load();
      expect(await memory2.get('key')).toBe('value');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid JSON when loading', async () => {
      // Create invalid JSON file
      await fs.writeFile(memoryPath, 'invalid json content', 'utf-8');
      
      const memory = new SwarmMemory({
        namespace: 'test',
        persistPath: memoryPath
      });
      
      const result = await memory.load();
      expect(result).toBe(false);
    });
    
    it('should handle missing file when loading', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent-file.json');
      
      const memory = new SwarmMemory({
        namespace: 'test',
        persistPath: nonExistentPath
      });
      
      const result = await memory.load();
      expect(result).toBe(false);
    });
  });
});