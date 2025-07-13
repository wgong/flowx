/**
 * Mock for Deno standard library functions
 * Maps Deno testing functions to Jest equivalents
 */

// Mock Deno testing functions
const describe = global.describe;
const it = global.it;
const beforeEach = global.beforeEach;
const afterEach = global.afterEach;
const beforeAll = global.beforeAll;
const afterAll = global.afterAll;

// Mock Deno assertion functions
const assertEquals = (actual, expected, message) => {
  expect(actual).toEqual(expected);
};

const assertExists = (value, message) => {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
};

const assertStringIncludes = (actual, expected, message) => {
  expect(actual).toContain(expected);
};

const assertRejects = async (fn, ErrorClass, message) => {
  if (ErrorClass) {
    await expect(fn).rejects.toThrow(ErrorClass);
  } else {
    await expect(fn).rejects.toThrow();
  }
};

const assertThrows = (fn, ErrorClass, message) => {
  if (ErrorClass) {
    expect(fn).toThrow(ErrorClass);
  } else {
    expect(fn).toThrow();
  }
};

const assertGreater = (actual, expected, message) => {
  expect(actual).toBeGreaterThan(expected);
};

const assertLess = (actual, expected, message) => {
  expect(actual).toBeLessThan(expected);
};

const assertGreaterOrEqual = (actual, expected, message) => {
  expect(actual).toBeGreaterThanOrEqual(expected);
};

const assertLessOrEqual = (actual, expected, message) => {
  expect(actual).toBeLessThanOrEqual(expected);
};

const assertNotEquals = (actual, expected, message) => {
  expect(actual).not.toEqual(expected);
};

const assertStrictEquals = (actual, expected, message) => {
  expect(actual).toBe(expected);
};

const assertNotStrictEquals = (actual, expected, message) => {
  expect(actual).not.toBe(expected);
};

const assertArrayIncludes = (actual, expected, message) => {
  expect(actual).toContain(expected);
};

const assertMatch = (actual, expected, message) => {
  expect(actual).toMatch(expected);
};

const assertNotMatch = (actual, expected, message) => {
  expect(actual).not.toMatch(expected);
};

const assertInstanceOf = (actual, expected, message) => {
  expect(actual).toBeInstanceOf(expected);
};

const assertNotInstanceOf = (actual, expected, message) => {
  expect(actual).not.toBeInstanceOf(expected);
};

// Mock Deno filesystem functions
const ensureDir = async (path) => {
  const fs = require('fs/promises');
  await fs.mkdir(path, { recursive: true });
};

const exists = async (path) => {
  const fs = require('fs');
  return fs.existsSync(path);
};

// Mock Deno path functions
const join = (...paths) => {
  const path = require('path');
  return path.join(...paths);
};

// Mock spy functions
const spy = (fn) => {
  if (typeof fn === 'function') {
    return jest.fn(fn);
  }
  return jest.fn();
};

const assertSpyCalls = (spyFn, expectedCalls) => {
  expect(spyFn).toHaveBeenCalledTimes(expectedCalls);
};

// Mock FakeTime
class FakeTime {
  constructor() {
    jest.useFakeTimers();
  }
  
  restore() {
    jest.useRealTimers();
  }
  
  tick(ms) {
    jest.advanceTimersByTime(ms);
  }
}

// Mock Deno global object
const Deno = {
  makeTempDir: async (options = {}) => {
    const os = require('os');
    const fs = require('fs/promises');
    const path = require('path');
    const prefix = options.prefix || 'tmp_';
    const tempDir = path.join(os.tmpdir(), prefix + Math.random().toString(36).substr(2, 9));
    await fs.mkdir(tempDir, { recursive: true });
    
    // Ensure the directory exists and is accessible
    const stat = await fs.stat(tempDir);
    if (!stat.isDirectory()) {
      throw new Error(`Failed to create temporary directory: ${tempDir}`);
    }
    
    return tempDir;
  },
  
  cwd: () => process.cwd(),
  
  chdir: (path) => {
    const fs = require('fs');
    
    try {
      // Check if the directory exists and is accessible
      const stat = fs.statSync(path);
      if (!stat.isDirectory()) {
        throw new Error(`ENOTDIR: not a directory, chdir '${process.cwd()}' -> '${path}'`);
      }
      
      process.chdir(path);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`ENOENT: no such file or directory, chdir '${process.cwd()}' -> '${path}'`);
      } else if (error.code === 'ENOTDIR') {
        throw new Error(`ENOTDIR: not a directory, chdir '${process.cwd()}' -> '${path}'`);
      } else if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
        throw new Error(`ENOENT: no such file or directory, chdir '${process.cwd()}' -> '${path}'`);
      }
      throw error;
    }
  },
  
  env: {
    get: (key) => process.env[key],
    set: (key, value) => { process.env[key] = value; }
  },
  
  remove: async (path, options = {}) => {
    const fs = require('fs/promises');
    try {
      if (options.recursive) {
        await fs.rm(path, { recursive: true, force: true });
      } else {
        await fs.unlink(path);
      }
    } catch (error) {
      // Ignore errors if file doesn't exist
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
};

// Make Deno available globally for tests
global.Deno = Deno;

// Export all mocked functions
module.exports = {
  // Testing functions
  describe,
  it,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  
  // Assertion functions
  assertEquals,
  assertExists,
  assertStringIncludes,
  assertRejects,
  assertThrows,
  assertGreater,
  assertLess,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertNotEquals,
  assertStrictEquals,
  assertNotStrictEquals,
  assertArrayIncludes,
  assertMatch,
  assertNotMatch,
  assertInstanceOf,
  assertNotInstanceOf,
  
  // Filesystem functions
  ensureDir,
  exists,
  
  // Path functions
  join,
  
  // Spy functions
  spy,
  assertSpyCalls,
  
  // Time functions
  FakeTime,
  
  // Deno global
  Deno
};