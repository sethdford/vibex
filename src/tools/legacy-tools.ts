/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Simple Legacy Tools Registry
 * 
 * This provides basic legacy tool functionality without circular dependencies.
 * Used by the migration bridge to avoid importing the full registry that depends on it.
 */

import { logger } from '../utils/logger.js';
import type { 
  ToolDefinition, 
  ToolHandler, 
  ToolUseBlock, 
  ToolResult 
} from './index.js';

/**
 * Simple legacy registry that doesn't use migration bridge
 */
class SimpleLegacyRegistry {
  private readonly tools = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();
  private readonly executionStats = new Map<string, { count: number; successCount: number; totalTime: number }>();

  /**
   * Register a tool
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
    
    // Initialize stats
    if (!this.executionStats.has(definition.name)) {
      this.executionStats.set(definition.name, {
        count: 0,
        successCount: 0,
        totalTime: 0
      });
    }
    
    logger.info(`Registered simple legacy tool: ${definition.name}`);
  }

  /**
   * Get all registered tools
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  /**
   * Get tool by name
   */
  get(name: string): { definition: ToolDefinition; handler: ToolHandler } | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool (simple implementation without migration bridge)
   */
  async execute(toolUse: ToolUseBlock): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolUse.name);

    if (!tool) {
      return {
        tool_use_id: toolUse.id,
        content: `Tool "${toolUse.name}" not found in simple legacy registry`,
        is_error: true
      };
    }

    try {
      const result = await tool.handler(toolUse.input);
      
      // Update stats
      this.updateExecutionStats(toolUse.name, startTime, result.success);

      return {
        tool_use_id: toolUse.id,
        content: result.success ? 
          (typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)) : 
          (result.error || 'Tool execution failed'),
        is_error: !result.success
      };
    } catch (error) {
      this.updateExecutionStats(toolUse.name, startTime, false);
      
      return {
        tool_use_id: toolUse.id,
        content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true
      };
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): Record<string, { count: number; successRate: number; avgTime: number }> {
    const stats: Record<string, { count: number; successRate: number; avgTime: number }> = {};
    
    for (const [name, stat] of this.executionStats) {
      stats[name] = {
        count: stat.count,
        successRate: stat.count > 0 ? stat.successCount / stat.count : 0,
        avgTime: stat.count > 0 ? stat.totalTime / stat.count : 0
      };
    }
    
    return stats;
  }

  /**
   * Clear execution statistics
   */
  clearStats(): void {
    for (const [name] of this.executionStats) {
      this.executionStats.set(name, { count: 0, successCount: 0, totalTime: 0 });
    }
  }

  private updateExecutionStats(toolName: string, startTime: number, success: boolean): void {
    const stat = this.executionStats.get(toolName);
    if (stat) {
      stat.count++;
      if (success) {
        stat.successCount++;
      }
      stat.totalTime += Date.now() - startTime;
    }
  }
}

/**
 * Create and configure a simple legacy registry with built-in tools
 */
export async function createSimpleLegacyRegistry(): Promise<SimpleLegacyRegistry> {
  const registry = new SimpleLegacyRegistry();
  
  // Register basic built-in tools without circular dependencies
  await registerBasicBuiltInTools(registry);
  
  return registry;
}

/**
 * Register basic built-in tools (subset of full tools to avoid dependencies)
 */
async function registerBasicBuiltInTools(registry: SimpleLegacyRegistry): Promise<void> {
  // Register a minimal set of tools with simple implementations
  
  // Read file tool
  registry.register(
    {
      name: 'read_file',
      description: 'Read the contents of a file from the filesystem',
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
    },
    async (params: any) => {
      try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(params.path, 'utf8');
        return {
          success: true,
          result: content
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  // Write file tool
  registry.register(
    {
      name: 'write_file',
      description: 'Write content to a file on the filesystem',
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
    },
    async (params: any) => {
      try {
        const fs = await import('fs/promises');
        await fs.writeFile(params.path, params.content, 'utf8');
        return {
          success: true,
          result: `Successfully wrote to ${params.path}`
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  logger.info(`Registered ${registry.getAll().length} basic built-in tools`);
} 