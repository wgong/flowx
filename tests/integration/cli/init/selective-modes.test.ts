
// Mock implementation for Deno.Command
function mockDenoCommand(command, options = {}) {
  const { args = [], cwd = process.cwd(), stdout = "piped", stderr = "piped" } = options;
  
  return {
    output: async () => {
      return new Promise((resolve) => {
        // Handle both ESM and CommonJS environments
      const childProcess = typeof require !== 'undefined' ? 
        require('child_process') : 
        await import('node:child_process').then(m => m.default);
        const result = childProcess.spawnSync(command, args, { 
          cwd: cwd, 
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        resolve({
          success: result.status === 0,
          stdout: Buffer.from(result.stdout || ''),
          stderr: Buffer.from(result.stderr || '')
        });
      });
    }
  };
}

import { expect } from "@jest/globals";
const { assertEquals, assertExists, assertStringIncludes } = { assertEquals: expect.toBe, assertExists: expect.toBeDefined, assertStringIncludes: expect.toContain };
import fs from "fs";
const { exists } = fs.promises;
import path from "path";
const { join } = path;
import { beforeEach, afterEach, describe, it, jest } from "@jest/globals";

// Mock fs/promises for consistent behavior
// Using centralized mock system for better test isolation
jest.mock('../../../../tests/helpers/deno-fs-utils.ts');

// Mock child_process
// Using centralized mock system for better test isolation

// Duplicate mock removed to avoid conflicts

// Mock exists function
jest.mock('./tests/helpers/deno-fs-utils.ts', () => ({
  safeChdir: jest.fn().mockResolvedValue(true),
  safeCwd: jest.fn().mockReturnValue('/mock/cwd'),
  createTempTestDir: jest.fn().mockResolvedValue('/mock/temp-dir'),
  safeRemoveDir: jest.fn().mockResolvedValue(true),
  setupTestDirEnvironment: jest.fn().mockResolvedValue({
    originalCwd: '/mock/original-cwd',
    testDir: '/mock/test-dir'
  }),
  cleanupTestDirEnvironment: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(true)
}));

// Mock Deno.stat for compatibility
global.Deno = {
  stat: jest.fn().mockResolvedValue({ isFile: true })
};
import { safeChdir, safeCwd, createTempTestDir, safeRemoveDir, setupTestDirEnvironment, cleanupTestDirEnvironment } from "../../../helpers/deno-fs-utils.ts";
import { safeFn, tryCatch, withRetry } from "../../../helpers/error-capture.ts";
import { getTestEnvironmentInfo, shouldSkipTest } from "../../../helpers/test-environment.ts";

describe("Selective Mode Initialization Tests", () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Use our helper function for setup but with proper fallbacks
    // Create a mock test directory that won't actually be used
    const tmpTestDir = path.join(process.cwd(), 'test-dir-' + Date.now());
    originalCwd = process.cwd(); // Use current directory as fallback
    testDir = tmpTestDir;
    
    // Create the test directory
    await fs.promises.mkdir(tmpTestDir, { recursive: true });
  });

  afterEach(async () => {
    // Use our helper function for cleanup
    await cleanupTestDirEnvironment(originalCwd, testDir);
  });

  describe("Standard vs Minimal modes", () => {
    it("should create different content for standard vs minimal", async () => {
      // Create standard initialization
      const standardDir = join(testDir, "standard");
      await fs.promises.mkdir(standardDir);

      const standardCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init"
        ],
        cwd: standardDir,
        stdout: "piped",
        stderr: "piped"
      });

      await standardCommand.output();

      // Create minimal initialization
      const minimalDir = join(testDir, "minimal");
      await fs.promises.mkdir(minimalDir);

      const minimalCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--minimal"
        ],
        cwd: minimalDir,
        stdout: "piped",
        stderr: "piped"
      });

      await minimalCommand.output();

      // Compare content sizes
      const standardClaude = await fs.promises.readFile(join(standardDir, "CLAUDE.md"));
      const minimalClaude = await fs.promises.readFile(join(minimalDir, "CLAUDE.md"));

      assertEquals(standardClaude.length > minimalClaude.length, true);
      assertStringIncludes(minimalClaude, "Minimal project configuration");

      const standardMemory = await fs.promises.readFile(join(standardDir, "memory-bank.md"));
      const minimalMemory = await fs.promises.readFile(join(minimalDir, "memory-bank.md"));

      assertEquals(standardMemory.length > minimalMemory.length, true);
      assertStringIncludes(minimalMemory, "Simple memory tracking");
    });

    it("should create same directory structure for both modes", async () => {
      // Create both modes
      const dirs = ["standard", "minimal"];
      
      for (const mode of dirs) {
        const modeDir = join(testDir, mode);
        await fs.promises.mkdir(modeDir);

        const args = ["run", "--allow-all", join(originalCwd, "src/cli/simple-cli.ts"), "init"];
        if (mode === "minimal") args.push("--minimal");

        const command = mockDenoCommand("deno", {
          args,
          cwd: modeDir,
          stdout: "piped",
          stderr: "piped"
        });

        await command.output();
      }

      // Check both have same directory structure
      const expectedDirs = [
        "memory",
        "memory/agents",
        "memory/sessions",
        "coordination",
        "coordination/memory_bank",
        "coordination/subtasks",
        "coordination/orchestration",
        ".claude",
        ".claude/commands",
        ".claude/logs"
      ];

      for (const mode of dirs) {
        for (const dir of expectedDirs) {
          assertExists(await exists(join(testDir, mode, dir)));
        }
      }
    });
  });

  describe("SPARC vs Non-SPARC modes", () => {
    it("should create SPARC-specific files only with --sparc", async () => {
      // Create regular initialization
      const regularDir = join(testDir, "regular");
      await fs.promises.mkdir(regularDir);

      const regularCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init"
        ],
        cwd: regularDir,
        stdout: "piped",
        stderr: "piped"
      });

      await regularCommand.output();

      // Create SPARC initialization
      const sparcDir = join(testDir, "sparc");
      await fs.promises.mkdir(sparcDir);

      const sparcCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--sparc"
        ],
        cwd: sparcDir,
        stdout: "piped",
        stderr: "piped"
      });

      await sparcCommand.output();

      // Check SPARC-specific files
      assertEquals(await exists(join(regularDir, ".roo")), false);
      assertEquals(await exists(join(regularDir, ".roomodes")), false);
      assertEquals(await exists(join(regularDir, ".claude/commands/sparc")), false);

      assertExists(await exists(join(sparcDir, ".roo")));
      assertExists(await exists(join(sparcDir, ".roomodes")));
      assertExists(await exists(join(sparcDir, ".claude/commands/sparc")));

      // Check CLAUDE.md content differences
      const regularClaude = await fs.promises.readFile(join(regularDir, "CLAUDE.md"));
      const sparcClaude = await fs.promises.readFile(join(sparcDir, "CLAUDE.md"));

      assertEquals(regularClaude.includes("SPARC Development Environment"), false);
      assertStringIncludes(sparcClaude, "SPARC Development Environment");
      assertStringIncludes(sparcClaude, "## SPARC Development Commands");
    });

    it("should create appropriate SPARC command structure", async () => {
      const command = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--sparc"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await command.output();

      // Check SPARC directory structure
      const sparcDirs = [
        ".roo",
        ".roo/templates",
        ".roo/workflows",
        ".roo/modes",
        ".roo/configs"
      ];

      for (const dir of sparcDirs) {
        assertExists(await exists(join(testDir, dir)));
      }

      // Check Claude commands
      assertExists(await exists(join(testDir, ".claude/commands/sparc")));

      // Check workflow files
      assertExists(await exists(join(testDir, ".roo/workflows/basic-tdd.json")));
      assertExists(await exists(join(testDir, ".roo/README.md")));
    });
  });

  describe("Mixed mode combinations", () => {
    it("should handle --sparc --minimal combination correctly", async () => {
      const command = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--sparc",
          "--minimal"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await command.output();

      // Should have SPARC structure
      assertExists(await exists(join(testDir, ".roo")));
      assertExists(await exists(join(testDir, ".roomodes")));
      assertExists(await exists(join(testDir, ".claude/commands/sparc")));

      // Should have SPARC-enhanced CLAUDE.md (SPARC overrides minimal for CLAUDE.md)
      const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md"));
      assertStringIncludes(claudeContent, "SPARC Development Environment");

      // But memory-bank should be minimal
      const memoryContent = await fs.promises.readFile(join(testDir, "memory-bank.md"));
      assertStringIncludes(memoryContent, "Simple memory tracking");

      // Coordination should be minimal
      const coordContent = await fs.promises.readFile(join(testDir, "coordination.md"));
      assertStringIncludes(coordContent, "Simple coordination tracking");
    });

    it("should prioritize SPARC content over minimal for CLAUDE.md", async () => {
      // Create minimal first
      const minimalCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--minimal"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await minimalCommand.output();

      const minimalClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md"));

      // Now initialize with SPARC minimal (force overwrite)
      const sparcMinimalCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--sparc",
          "--minimal",
          "--force"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await sparcMinimalCommand.output();

      const sparcMinimalClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md"));

      // SPARC version should be different from minimal-only
      assertEquals(minimalClaude === sparcMinimalClaude, false);
      assertStringIncludes(sparcMinimalClaude, "SPARC Development Environment");
      assertEquals(minimalClaude.includes("SPARC Development Environment"), false);
    });
  });

  describe("Progressive initialization", () => {
    it("should support upgrading from minimal to full", async () => {
      // Start with minimal
      const minimalCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--minimal"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await minimalCommand.output();

      const minimalClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md"));
      const minimalMemory = await fs.promises.readFile(join(testDir, "memory-bank.md"));

      // Upgrade to full with force
      const fullCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--force"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await fullCommand.output();

      const fullClaude = await fs.promises.readFile(join(testDir, "CLAUDE.md"));
      const fullMemory = await fs.promises.readFile(join(testDir, "memory-bank.md"));

      // Should be different and longer
      assertEquals(minimalClaude === fullClaude, false);
      assertEquals(minimalMemory === fullMemory, false);
      assertEquals(fullClaude.length > minimalClaude.length, true);
      assertEquals(fullMemory.length > minimalMemory.length, true);
    });

    it("should support adding SPARC to existing project", async () => {
      // Start with regular init
      const regularCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await regularCommand.output();

      // Verify no SPARC files
      assertEquals(await exists(join(testDir, ".roo")), false);
      assertEquals(await exists(join(testDir, ".roomodes")), false);

      // Add SPARC with force
      const sparcCommand = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--sparc",
          "--force"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await sparcCommand.output();

      // Should now have SPARC files
      assertExists(await exists(join(testDir, ".roo")));
      assertExists(await exists(join(testDir, ".roomodes")));
      assertExists(await exists(join(testDir, ".claude/commands/sparc")));

      // CLAUDE.md should be SPARC-enhanced
      const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md"));
      assertStringIncludes(claudeContent, "SPARC Development Environment");
    });
  });

  describe("Mode-specific file validation", () => {
    it("should validate minimal mode file sizes", async () => {
      const command = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--minimal"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await command.output();

      // Check that minimal files are actually smaller
      const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md"));
      const memoryContent = await fs.promises.readFile(join(testDir, "memory-bank.md"));
      const coordContent = await fs.promises.readFile(join(testDir, "coordination.md"));

      // Minimal files should be under reasonable size limits
      assertEquals(claudeContent.length < 5000, true); // Should be much smaller than full
      assertEquals(memoryContent.length < 2000, true);
      assertEquals(coordContent.length < 2000, true);

      // But should still have basic structure
      assertStringIncludes(claudeContent, "# Claude Code Configuration");
      assertStringIncludes(memoryContent, "# Memory Bank");
      assertStringIncludes(coordContent, "# Multi-Agent Coordination");
    });

    it("should validate SPARC mode file completeness", async () => {
      const command = mockDenoCommand("deno", {
        args: [
          "run",
          "--allow-all",
          join(originalCwd, "src/cli/simple-cli.ts"),
          "init",
          "--sparc"
        ],
        cwd: testDir,
        stdout: "piped",
        stderr: "piped"
      });

      await command.output();

      // Check SPARC file contents
      const claudeContent = await fs.promises.readFile(join(testDir, "CLAUDE.md"));
      
      // Should include all SPARC sections
      const requiredSections = [
        "## SPARC Development Commands",
        "## SPARC Methodology Workflow", 
        "### 1. Specification Phase",
        "### 2. Pseudocode Phase",
        "### 3. Architecture Phase",
        "### 4. Refinement Phase",
        "### 5. Completion Phase",
        "## SPARC Mode Reference",
        "## SPARC Memory Integration"
      ];

      for (const section of requiredSections) {
        assertStringIncludes(claudeContent, section);
      }

      // Check .roomodes content
      if (await exists(join(testDir, ".roomodes"))) {
        const roomodesContent = await fs.promises.readFile(join(testDir, ".roomodes"));
        const roomodesData = JSON.parse(roomodesContent);
        
        assertEquals(typeof roomodesData.modes, "object");
        assertExists(roomodesData.modes.architect);
        assertExists(roomodesData.modes.tdd);
        assertExists(roomodesData.modes.code);
      }
    });
  });
});