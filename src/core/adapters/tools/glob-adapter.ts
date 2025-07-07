/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult } from '../../domain/tool';
import { executeGlob } from '../../../tools/advanced-file-tools';
import { LiveFeedbackData } from '../../../ui/components/LiveToolFeedback';

/**
 * Adapter for the glob tool to the new architecture
 */
export class GlobTool extends BaseTool {
  constructor() {
    super(
      'glob',
      'Find files using glob patterns with advanced filtering',
      {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Glob patterns to match (e.g., ["**/*.ts", "src/**/*.js"])'
          },
          base_path: {
            type: 'string',
            description: 'Base directory to search from',
            default: '.'
          },
          ignore_patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns to ignore (e.g., ["node_modules/**", "*.test.*"])'
          },
          include_directories: {
            type: 'boolean',
            description: 'Include directories in results',
            default: false
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 1000
          },
          sort: {
            type: 'boolean',
            description: 'Sort results alphabetically',
            default: true
          }
        },
        required: ['patterns']
      },
      { requiresConfirmation: false }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { 
      patterns, 
      base_path, 
      ignore_patterns, 
      include_directories, 
      max_results, 
      sort 
    } = params as { 
      patterns: string[],
      base_path?: string,
      ignore_patterns?: string[],
      include_directories?: boolean,
      max_results?: number,
      sort?: boolean
    };
    
    try {
      // Call the legacy implementation
      const legacyResult = await executeGlob({
        patterns,
        base_path,
        ignore_patterns,
        include_directories,
        max_results,
        sort
      }, {
        onProgress: (id: string, updates: Partial<Omit<LiveFeedbackData, 'id' | 'startTime'>>) => {
          options?.onProgress?.({
            message: updates.message,
            percentage: updates.progress?.current
          });
        }
      });
      
      if (!legacyResult.success) {
        return {
          callId: (options?.context?.callId as string) || 'unknown',
          error: new Error(legacyResult.error || 'Unknown error'),
          success: false,
          data: undefined
        } as ToolResult;
      }
      
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        data: legacyResult.result as unknown,
        success: true,
        metadata: legacyResult.metadata
      } as ToolResult;
    } catch (error) {
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        success: false,
        data: undefined
      } as ToolResult;
    }
  }

  validateParams(params: unknown): string | null {
    if (typeof params !== 'object' || params === null) {
      return 'Parameters must be an object';
    }
    
    const { patterns } = params as { patterns?: unknown };
    
    if (!patterns) {
      return 'Missing required parameter: patterns';
    }
    
    if (!Array.isArray(patterns)) {
      return 'patterns must be an array of strings';
    }
    
    const typedPatterns = patterns as string[];

    if (typedPatterns.length === 0) {
      return 'patterns must contain at least one glob pattern';
    }
    
    if (!typedPatterns.every(pattern => typeof pattern === 'string')) {
      return 'All patterns must be strings';
    }
    
    // Validate max_results if provided
    const { max_results } = params as { max_results?: unknown };
    if (max_results !== undefined && (typeof max_results !== 'number' || max_results <= 0)) {
      return 'max_results must be a positive number';
    }
    
    return null;
  }
}
