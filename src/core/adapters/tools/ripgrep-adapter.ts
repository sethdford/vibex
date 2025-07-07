/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool } from '../../domain/tool/tool-interfaces';
import { 
  Tool,
  ToolResult,
  ToolExecutionOptions,
  ToolConfirmationDetails
} from '../../domain/tool/tool-interfaces';
import { createRipgrepTool } from '../../../tools/ripgrep';

/**
 * Adapter for the Ripgrep tool
 * 
 * This adapter wraps the ripgrep tool to fit into the Clean Architecture
 * tool interface. It provides advanced code search functionality with
 * ripgrep's performance benefits.
 */
export class RipgrepTool extends BaseTool {
  private ripgrepHandler: Function;
  
  /**
   * Constructor
   */
  constructor() {
    // Get tool definition from legacy tool
    const ripgrepTool = createRipgrepTool();
    
    super(
      'search_code',
      'Search for text patterns in files using ripgrep, a high-performance code search tool',
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The text pattern to search for (regular expression supported)'
          },
          path: {
            type: 'string',
            description: 'Directory or file path to search in',
            default: '.'
          },
          case_sensitive: {
            type: 'boolean',
            description: 'Whether the search should be case sensitive',
            default: false
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 50
          }
        },
        required: ['pattern']
      }
    );
    
    // Store the handler for execution
    this.ripgrepHandler = ripgrepTool.handler;
  }
  
  /**
   * Execute ripgrep search
   */
  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    try {
      // Report progress start
      if (options?.onProgress) {
        options.onProgress({
          message: 'Starting code search...'
        });
      }
      
      // Cast params to the right type
      const typedParams = params as {
        pattern: string;
        path?: string;
        case_sensitive?: boolean;
        max_results?: number;
      };
      
      // Execute legacy tool handler
      const startTime = Date.now();
      const result = await this.ripgrepHandler(typedParams);
      const executionTime = Date.now() - startTime;
      
      if (options?.onProgress) {
        options.onProgress({
          message: 'Search completed',
          percentage: 100
        });
      }
      
      // Return result
      return {
        success: true,
        data: result,
        callId: options?.callId || 'unknown',
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        callId: options?.callId || 'unknown',
        executionTime: 0
      };
    }
  }
  
  /**
   * Validate input parameters
   */
  validateParams(params: unknown): string | null {
    if (!params || typeof params !== 'object') {
      return 'Parameters must be an object';
    }
    
    const typedParams = params as Record<string, unknown>;
    
    if (!typedParams.pattern) {
      return 'Missing required parameter: pattern';
    }
    
    if (typedParams.pattern && typeof typedParams.pattern !== 'string') {
      return 'Parameter pattern must be a string';
    }
    
    if (typedParams.path && typeof typedParams.path !== 'string') {
      return 'Parameter path must be a string';
    }
    
    if (typedParams.case_sensitive !== undefined && typeof typedParams.case_sensitive !== 'boolean') {
      return 'Parameter case_sensitive must be a boolean';
    }
    
    if (typedParams.max_results !== undefined) {
      if (typeof typedParams.max_results !== 'number') {
        return 'Parameter max_results must be a number';
      }
      
      if (typedParams.max_results < 1 || typedParams.max_results > 1000) {
        return 'Parameter max_results must be between 1 and 1000';
      }
    }
    
    return null;
  }
  
  /**
   * Check if execution needs confirmation
   * Ripgrep is generally safe, but could expose sensitive data
   */
  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    // No confirmation needed for code search
    return null;
  }
}

export default RipgrepTool;