/**
 * Unit tests for Tool Registry
 */

import { describe, it, beforeEach, expect, afterEach, afterAll } from '@jest/globals';
import { ToolRegistry } from '../../../src/mcp/tools';
import { MCPTool } from '../../../src/utils/types';
import { Logger } from '../../../src/core/logger';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let logger: Logger;

  beforeEach(async () => {
    logger = Logger.getInstance();
    await logger.configure({
      level: 'debug',
      format: 'text',
      destination: 'console',
    });

    registry = new ToolRegistry(logger);
  });

  afterEach(async () => {
    // Clean up registry
    if (registry) {
      // Clean up any event listeners
      registry.removeAllListeners();
      
      // Clear all tools
      const tools = registry.listTools();
      for (const tool of tools) {
        registry.unregister(tool.name);
      }
    }
    
    // Clean up logger
    if (logger) {
      try {
        await logger.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  afterAll(async () => {
    // Final cleanup to ensure Jest exits
    if (logger) {
      try {
        await logger.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Small delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Tool Registration', () => {
    it('should register a valid tool', () => {
      const tool: MCPTool = {
        name: 'test/tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        },
        handler: async (input: any) => ({ result: 'success' })
      };

      registry.register(tool);
      const retrievedTool = registry.getTool('test/tool');
      
      expect(retrievedTool).toBeDefined();
      expect(retrievedTool?.name).toBe('test/tool');
      expect(retrievedTool?.description).toBe('A test tool');
    });

    it('should prevent duplicate tool registration', () => {
      const tool: MCPTool = {
        name: 'test/duplicate',
        description: 'A duplicate tool',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ result: 'success' })
      };

      registry.register(tool);
      
      expect(() => registry.register(tool)).toThrow();
    });

    it('should validate tool name format', () => {
      const invalidTool: MCPTool = {
        name: 'Invalid Name!',
        description: 'Invalid tool name',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ result: 'success' })
      };

      expect(() => registry.register(invalidTool)).toThrow();
    });

    it('should validate required tool properties', () => {
      const incompleteTool = {
        name: 'test/incomplete',
        description: 'Missing handler'
      } as MCPTool;

      expect(() => registry.register(incompleteTool)).toThrow();
    });
  });

  describe('Tool Retrieval', () => {
    it('should retrieve a tool by name', () => {
      const tool: MCPTool = {
        name: 'test/retrieval',
        description: 'A retrieval test tool',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => ({ result: 'retrieved' })
      };

      registry.register(tool);
      const retrieved = registry.getTool('test/retrieval');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test/retrieval');
    });

    it('should return undefined for non-existent tool', () => {
      const result = registry.getTool('test/nonexistent');
      expect(result).toBeUndefined();
    });

    it('should list all tools', () => {
      const tool1: MCPTool = {
        name: 'test/tool1',
        description: 'First tool',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ result: '1' })
      };

      const tool2: MCPTool = {
        name: 'test/tool2',
        description: 'Second tool',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ result: '2' })
      };

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.listTools();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toContain('test/tool1');
      expect(tools.map(t => t.name)).toContain('test/tool2');
    });

    it('should get tool count', () => {
      expect(registry.getToolCount()).toBe(0);

      const tool: MCPTool = {
        name: 'test/count',
        description: 'Tool for counting',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ result: 'counted' })
      };

      registry.register(tool);
      expect(registry.getToolCount()).toBe(1);
    });
  });

  describe('Tool Execution', () => {
    it('should execute a tool successfully', async () => {
      const tool: MCPTool = {
        name: 'test/execution',
        description: 'A tool for execution testing',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        handler: async (input: any) => ({ 
          result: `Hello ${input.message}` 
        })
      };

      registry.register(tool);
      const result = await registry.executeTool('test/execution', { message: 'World' }) as any;
      
      expect(result.result).toBe('Hello World');
    });

    it('should handle tool execution errors', async () => {
      const tool: MCPTool = {
        name: 'test/error',
        description: 'A tool that throws errors',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => {
          throw new Error('Tool execution failed');
        }
      };

      registry.register(tool);
      
      await expect(registry.executeTool('test/error', {})).rejects.toThrow('Tool execution failed');
    });

    it('should handle non-existent tool execution', async () => {
      await expect(registry.executeTool('test/nonexistent', {})).rejects.toThrow();
    });

    it('should validate input against schema', async () => {
      const tool: MCPTool = {
        name: 'test/validation',
        description: 'A tool with strict validation',
        inputSchema: {
          type: 'object',
          properties: {
            required_field: { type: 'string' }
          },
          required: ['required_field']
        },
        handler: async (input: any) => ({ result: input.required_field })
      };

      registry.register(tool);
      
      await expect(registry.executeTool('test/validation', {})).rejects.toThrow();
    });

    it('should validate input types', async () => {
      const tool: MCPTool = {
        name: 'test/typevalidation',
        description: 'A tool with type validation',
        inputSchema: {
          type: 'object',
          properties: {
            number_field: { type: 'number' }
          }
        },
        handler: async (input: any) => ({ result: input.number_field })
      };

      registry.register(tool);
      
      await expect(registry.executeTool('test/typevalidation', { 
        number_field: 'not-a-number' 
      })).rejects.toThrow();
    });
  });

  describe('Tool Unregistration', () => {
    it('should unregister a tool', () => {
      const tool: MCPTool = {
        name: 'test/unregister',
        description: 'A tool to be unregistered',
        inputSchema: { type: 'object', properties: {} },
        handler: async () => ({ result: 'unregistered' })
      };

      registry.register(tool);
      expect(registry.getTool('test/unregister')).toBeDefined();
      
      registry.unregister('test/unregister');
      expect(registry.getTool('test/unregister')).toBeUndefined();
    });

    it('should handle unregistering non-existent tool', () => {
      expect(() => registry.unregister('test/nonexistent')).toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should validate string types', async () => {
      const tool: MCPTool = {
        name: 'test/string',
        description: 'String validation tool',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string' }
          }
        },
        handler: async (input: any) => ({ result: input.text })
      };

      registry.register(tool);
      
      const result = await registry.executeTool('test/string', { text: 'hello' }) as any;
      expect(result.result).toBe('hello');
    });

    it('should validate number types', async () => {
      const tool: MCPTool = {
        name: 'test/number',
        description: 'Number validation tool',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'number' }
          }
        },
        handler: async (input: any) => ({ result: input.value * 2 })
      };

      registry.register(tool);
      
      const result = await registry.executeTool('test/number', { value: 42 }) as any;
      expect(result.result).toBe(84);
    });

    it('should validate boolean types', async () => {
      const tool: MCPTool = {
        name: 'test/boolean',
        description: 'Boolean validation tool',
        inputSchema: {
          type: 'object',
          properties: {
            flag: { type: 'boolean' }
          }
        },
        handler: async (input: any) => ({ result: !input.flag })
      };

      registry.register(tool);
      
      const result = await registry.executeTool('test/boolean', { flag: true }) as any;
      expect(result.result).toBe(false);
    });

    it('should validate array types', async () => {
      const tool: MCPTool = {
        name: 'test/array',
        description: 'Array validation tool',
        inputSchema: {
          type: 'object',
          properties: {
            items: { 
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        handler: async (input: any) => ({ result: input.items.length })
      };

      registry.register(tool);
      
      const result = await registry.executeTool('test/array', { items: ['a', 'b', 'c'] }) as any;
      expect(result.result).toBe(3);
    });

    it('should validate object types', async () => {
      const tool: MCPTool = {
        name: 'test/object',
        description: 'Object validation tool',
        inputSchema: {
          type: 'object',
          properties: {
            data: { 
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          }
        },
        handler: async (input: any) => ({ result: input.data.name })
      };

      registry.register(tool);
      
      const result = await registry.executeTool('test/object', { 
        data: { name: 'test' } 
      }) as any;
      expect(result.result).toBe('test');
    });

    it('should handle null input for non-object schema', async () => {
      const tool: MCPTool = {
        name: 'test/null',
        description: 'Null handling tool',
        inputSchema: {
          type: 'object',
          properties: {
            optional: { type: 'string' }
          }
        },
        handler: async (input: any) => ({ result: input.optional || 'default' })
      };

      registry.register(tool);
      
      const result = await registry.executeTool('test/null', {}) as any;
      expect(result.result).toBe('default');
    });
  });
});