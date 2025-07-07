/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult, ToolConfirmationDetails } from '../../domain/tool';
import { executeReadManyFiles } from '../../../tools/advanced-file-tools';
import { LiveFeedbackData } from '../../../ui/components/LiveToolFeedback';

/**
 * Adapter for the read_many_files tool to the new architecture
 */
export class ReadManyFilesTool extends BaseTool {
  constructor() {
    super(
      'read_many_files',
      'Read multiple files in batch with content aggregation',
      {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of file paths to read'
          },
          include_metadata: {
            type: 'boolean',
            description: 'Include file metadata in results',
            default: true
          },
          skip_binary: {
            type: 'boolean',
            description: 'Skip binary files',
            default: true
          },
          max_file_size: {
            type: 'number',
            description: 'Maximum file size in bytes (default: 1MB)',
            default: 1048576
          },
          encoding: {
            type: 'string',
            description: 'Text encoding to use',
            default: 'utf-8'
          }
        },
        required: ['paths']
      },
      { 
        requiresConfirmation: true,
        dangerous: false
      }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { 
      paths, 
      include_metadata, 
      skip_binary, 
      max_file_size, 
      encoding 
    } = params as { 
      paths: string[],
      include_metadata?: boolean,
      skip_binary?: boolean,
      max_file_size?: number,
      encoding?: string
    };
    
    try {
      // Call the legacy implementation
      const legacyResult = await executeReadManyFiles({
        paths,
        include_metadata,
        skip_binary,
        max_file_size,
        encoding
      }, {
        onProgress: options?.onProgress ? (id: string, updates: Partial<Omit<LiveFeedbackData, 'id' | 'startTime'>>) => {
          options.onProgress?.({
            message: updates.message,
            percentage: updates.progress?.current
          });
        } : undefined
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
        callId: options?.context?.callId || 'unknown',
        data: legacyResult.result as unknown,
        success: true,
        metadata: legacyResult.metadata
      } as ToolResult;
    } catch (error) {
      return {
        callId: options?.context?.callId || 'unknown',
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
    
    const { paths } = params as { paths?: unknown };
    
    if (!paths) {
      return 'Missing required parameter: paths';
    }
    
    if (!Array.isArray(paths)) {
      return 'paths must be an array of strings';
    }
    
    if (paths.length === 0) {
      return 'paths must contain at least one file path';
    }
    
    if (!paths.every(path => typeof path === 'string')) {
      return 'All paths must be strings';
    }
    
    return null;
  }

  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    const { paths } = params as { paths: string[] };
    
    // Request confirmation if reading multiple files
    if (paths.length > 5) {
      return {
        title: `Confirm reading ${paths.length} files`,
        description: `This will read ${paths.length} files, which may take some time.`,
        type: 'info',
        params: params as Record<string, unknown>
      };
    }
    
    return null; // No confirmation needed for small batches
  }
}