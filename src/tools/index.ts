/**
 * Tool Registry and Management System
 * 
 * This module serves as the central hub for all tool-related functionality,
 * providing registration, discovery, and execution of tools throughout the application.
 * Key capabilities include:
 * 
 * - Central tool registry for maintaining available tools
 * - Tool registration and deregistration interfaces
 * - Type-safe execution of tool operations
 * - Tool discovery and metadata access
 * - Built-in tool initialization for core functionality
 * - Tool result handling and formatting
 * - Error handling for tool execution failures
 * 
 * The tool system enables AI assistants to interact with the system by providing
 * a standardized interface for executing operations and receiving structured results.
 */

import { logger } from '../utils/logger.js';
import { createWebFetchTool, executeWebFetch } from './web-fetch.js';
import { createCodeAnalyzerTool, executeCodeAnalysis } from './code-analyzer.js';

/**
 * Tool definition interface
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Internal tool result interface
 */
export interface InternalToolResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Tool result interface
 */
export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Tool use block interface (from Claude API)
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Tool handler function type
 */
export type ToolHandler = (input: any) => Promise<InternalToolResult>;

/**
 * Tool registry class
 */
class ToolRegistry {
  private tools: Map<string, {
    definition: ToolDefinition;
    handler: ToolHandler;
  }> = new Map();

  /**
   * Register a tool
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    if (this.tools.has(definition.name)) {
      logger.warn(`Tool ${definition.name} is already registered, overwriting`);
    }

    this.tools.set(definition.name, { definition, handler });
    logger.debug(`Registered tool: ${definition.name}`);
  }

  /**
   * Get a tool by name
   */
  get(name: string): { definition: ToolDefinition; handler: ToolHandler } | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool definitions
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * Execute a tool
   */
  async execute(toolUse: ToolUseBlock): Promise<ToolResult> {
    const tool = this.tools.get(toolUse.name);
    if (!tool) {
      return {
        tool_use_id: toolUse.id,
        content: `Tool ${toolUse.name} not found`,
        is_error: true,
      };
    }

    try {
      const result = await tool.handler(toolUse.input);
      if (result.success) {
        return {
          tool_use_id: toolUse.id,
          content: JSON.stringify(result.result || ''),
        };
      } else {
        return {
          tool_use_id: toolUse.id,
          content: result.error || 'Tool execution failed',
          is_error: true,
        };
      }
    } catch (error) {
      logger.error(`Error executing tool ${toolUse.name}:`, error);
      return {
        tool_use_id: toolUse.id,
        content: error instanceof Error ? error.message : String(error),
        is_error: true,
      };
    }
  }

  /**
   * Execute multiple tools
   */
  async executeMany(toolUses: ToolUseBlock[]): Promise<ToolResult[]> {
    return Promise.all(toolUses.map(toolUse => this.execute(toolUse)));
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }


}

// Create singleton tool registry
export const toolRegistry = new ToolRegistry();

/**
 * Register built-in tools
 */
export function registerBuiltInTools(): void {
  // Register file system tools
  toolRegistry.register({
    name: 'read_file',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read'
        }
      },
      required: ['path']
    }
  }, async (input): Promise<InternalToolResult> => {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(input.path, 'utf-8');
      return { success: true, result: content };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to read file' 
      };
    }
  });

  toolRegistry.register({
    name: 'write_file',
    description: 'Write content to a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  }, async (input): Promise<InternalToolResult> => {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(input.path, input.content, 'utf-8');
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to write file' 
      };
    }
  });

  toolRegistry.register({
    name: 'list_directory',
    description: 'List files in a directory',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory'
        }
      },
      required: ['path']
    }
  }, async (input): Promise<InternalToolResult> => {
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(input.path);
      return { success: true, result: files };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list directory' 
      };
    }
  });

  // Register web fetch tool
  toolRegistry.register(createWebFetchTool(), executeWebFetch);

  // Register code analyzer tool
  toolRegistry.register(createCodeAnalyzerTool(), executeCodeAnalysis);

  logger.info('Registered built-in tools');
}

// Auto-register built-in tools when module is imported
registerBuiltInTools(); 