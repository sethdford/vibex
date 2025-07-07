/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { Tool, ToolConfig, ToolFactory, BaseTool } from '../tool-interfaces';

/**
 * Implementation of a tool based on a configuration
 */
class ConfiguredTool extends BaseTool {
  /**
   * Handler function for execution
   */
  private handler: (params: unknown, options?: any) => Promise<unknown>;

  /**
   * Constructor
   */
  constructor(config: ToolConfig) {
    super(
      config.name, 
      config.description, 
      config.parameters,
      config.metadata
    );
    this.handler = config.handler;
  }

  /**
   * Execute the tool with the given parameters
   */
  async execute(params: unknown, options?: any): Promise<any> {
    try {
      // Call the handler function
      const result = await this.handler(params, options);
      
      // If the result is already a ToolResult, return it
      if (result && typeof result === 'object' && 'callId' in result && 'success' in result) {
        return result;
      }
      
      // Otherwise, wrap it in a ToolResult
      return {
        callId: options?.context?.callId || 'unknown',
        data: result,
        success: true,
        executionTime: 0 // This will be filled in by the execution service
      };
    } catch (error) {
      // Wrap errors in a ToolResult
      return {
        callId: options?.context?.callId || 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        success: false,
        executionTime: 0 // This will be filled in by the execution service
      };
    }
  }
}

/**
 * Implementation of the Tool Factory
 */
export class ToolFactoryImpl implements ToolFactory {
  /**
   * Create a tool from a configuration
   */
  createTool(config: ToolConfig): Tool {
    return new ConfiguredTool(config);
  }
  
  /**
   * Create built-in tools
   */
  createBuiltInTools(): Record<string, Tool[]> {
    // This method would create and return built-in tools
    // For now, return empty collections
    return {
      'default': [],
      'system': []
    };
  }
}

/**
 * Factory function to create a ToolFactory
 */
export function createToolFactory(): ToolFactory {
  return new ToolFactoryImpl();
}