/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult, ToolConfirmationDetails } from '../../domain/tool';
import { executeListDirectory } from '../../../tools/advanced-file-tools';
import path from 'path';

/**
 * Adapter for the list_directory tool to the new architecture
 */
export class ListDirectoryTool extends BaseTool {
  constructor() {
    super(
      'list_directory',
      'List directory contents with advanced filtering and metadata',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list'
          },
          recursive: {
            type: 'boolean',
            description: 'Recursively list subdirectories',
            default: false
          },
          include_hidden: {
            type: 'boolean',
            description: 'Include hidden files and directories',
            default: false
          },
          include_metadata: {
            type: 'boolean',
            description: 'Include file metadata (size, modified date, permissions)',
            default: true
          },
          filter_pattern: {
            type: 'string',
            description: 'Filter files by glob pattern (e.g., "*.ts", "test/**")'
          },
          max_depth: {
            type: 'number',
            description: 'Maximum recursion depth',
            default: 10
          },
          sort_by: {
            type: 'string',
            description: 'Sort files by: name, size, modified, type',
            default: 'name'
          },
          sort_order: {
            type: 'string',
            description: 'Sort order: asc or desc',
            default: 'asc'
          }
        },
        required: ['path']
      },
      { requiresConfirmation: false }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { 
      path: dirPath,
      recursive,
      include_hidden,
      include_metadata,
      filter_pattern,
      max_depth,
      sort_by,
      sort_order
    } = params as { 
      path: string, 
      recursive?: boolean,
      include_hidden?: boolean,
      include_metadata?: boolean,
      filter_pattern?: string,
      max_depth?: number,
      sort_by?: string,
      sort_order?: string
    };
    
    try {
      // Call the legacy implementation
      const legacyResult = await executeListDirectory({
        path: dirPath,
        recursive,
        include_hidden,
        include_metadata,
        filter_pattern,
        max_depth,
        sort_by,
        sort_order
      }, {
        onProgress: (id: string, updates: Partial<Omit<any, 'id' | 'startTime'>>) => {
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
          success: false
        };
      }
      
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        data: legacyResult.result,
        success: true,
        metadata: legacyResult.metadata
      };
    } catch (error) {
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        success: false
      };
    }
  }

  validateParams(params: unknown): string | null {
    if (typeof params !== 'object' || params === null) {
      return 'Parameters must be an object';
    }
    
    const { path } = params as { path?: string };
    
    if (!path) {
      return 'Missing required parameter: path';
    }
    
    if (typeof path !== 'string') {
      return 'path must be a string';
    }
    
    const { sort_by } = params as { sort_by?: string };
    if (sort_by !== undefined && !['name', 'size', 'modified', 'type'].includes(sort_by)) {
      return 'sort_by must be one of: name, size, modified, type';
    }
    
    const { sort_order } = params as { sort_order?: string };
    if (sort_order !== undefined && !['asc', 'desc'].includes(sort_order)) {
      return 'sort_order must be one of: asc, desc';
    }
    
    return null;
  }
}