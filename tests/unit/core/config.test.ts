/**
 * Tests for the ConfigManager
 */

import { configManager } from './config.cjs';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('ConfigManager', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Setup temporary directory for test configuration files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-test-'));
    configPath = path.join(tempDir, 'config.json');
    
    // Reset the configManager before each test
    configManager.reset();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should return default values', () => {
    const config = configManager.get();
    expect(config).toBeDefined();
    expect(config.orchestrator).toBeDefined();
    expect(config.terminal).toBeDefined();
    expect(config.memory).toBeDefined();
    expect(config.mcp).toBeDefined();
    expect(config.logging).toBeDefined();
  });

  test('should update configuration values', () => {
    configManager.update({
      orchestrator: { maxConcurrentAgents: 5 },
      terminal: { poolSize: 3 },
    });

    const config = configManager.get();
    expect(config.orchestrator.maxConcurrentAgents).toBe(5);
    expect(config.terminal.poolSize).toBe(3);
  });

  test('should set and get individual values', () => {
    configManager.set('memory.cacheSizeMB', 200);
    configManager.set('logging.level', 'debug');

    expect(configManager.getValue('memory.cacheSizeMB')).toBe(200);
    expect(configManager.getValue('logging.level')).toBe('debug');
  });

  test('should handle secure config', () => {
    // Just test that getSecure returns a config object
    const secureConfig = configManager.getSecure();
    expect(secureConfig).toBeDefined();
    expect(typeof secureConfig).toBe('object');
  });

  test('should compute diff between current and default', () => {
    configManager.set('memory.cacheSizeMB', 500);
    configManager.set('logging.level', 'debug');
    
    const diff = configManager.getDiff();
    expect(diff.memory.cacheSizeMB).toBe(500);
    expect(diff.logging.level).toBe('debug');
  });
});