/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Simplified API for the tool system
 * 
 * This file provides a simplified API for integrating with the VibeX tool system,
 * abstracting away the complexity of the underlying clean architecture.
 */

import { 
  ToolCallRequest, 
  ToolConfirmationOutcome,
  ToolConfirmationDetails,
  Tool,
  ToolResult
} from './tool-interfaces';
import { ToolSystemConfig } from './tool-services';
import { createToolOrchestration } from './orchestration';
import { createToolFactory } from './factory';

/**
 * VibeX Tool API
 * 
 * Main entry point for the VibeX tool system, providing a simplified
 * interface for registering and executing tools.
 */
export class VibeXToolAPI {
  private orchestration = createToolOrchestration({});
  private toolFactory = createToolFactory();
  
  /**
   * Configure the tool system
   */
  configure(config: ToolSystemConfig): void {
    this.orchestration.configure(config);
  }
  
  /**
   * Register a tool
   */
  registerTool(tool: Tool): void {
    this.orchestration.registerTools();
  }
  
  /**
   * Create a tool from a config
   */
  createTool(name: string, description: string, parameters: Record<string, unknown>, handler: Function): Tool {
    return this.toolFactory.createTool({
      name,
      description,
      parameters,
      handler: async (params, options) => {
        return handler(params, options);
      }
    });
  }
  
  /**
   * Execute a tool
   */
  async executeTool(
    name: string, 
    params: unknown, 
    options?: { 
      timeout?: number, 
      signal?: AbortSignal,
      onProgress?: (progress: any) => void 
    }
  ): Promise<ToolResult> {
    const signal = options?.signal || new AbortController().signal;
    
    // Generate a call ID
    const callId = Math.random().toString(36).substring(2, 15);
    
    // Build the request
    const request: ToolCallRequest = {
      callId,
      name,
      params,
      options
    };
    
    // Execute the tool
    await this.orchestration.executeTools(request, signal);
    
    // TODO: This is a simplification - in a real implementation, we would
    // need to handle waiting for the tool to complete, retrieving the result,
    // and handling errors.
    
    // For now, just return a placeholder result
    return {
      callId,
      success: true,
      data: null,
      executionTime: 0
    };
  }
  
  /**
   * Get a tool by name
   */
  getTool(name: string, namespace?: string): Tool | undefined {
    return this.orchestration.getTool(name, namespace);
  }
  
  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return this.orchestration.getAllTools();
  }
}

/**
 * Create an instance of the VibeX Tool API
 */
export function createToolAPI(): VibeXToolAPI {
  return new VibeXToolAPI();
}

/**
 * Singleton instance of the VibeX Tool API for easy access
 */
export const toolAPI = createToolAPI();