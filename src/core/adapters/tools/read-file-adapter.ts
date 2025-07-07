/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult } from '../../domain/tool';
import { readFile } from '../../../tools/read-file.js';

/**
 * Adapter for the read_file tool to the new architecture
 */
export class ReadFileTool extends BaseTool {
  constructor() {
    super(
      'read_file',
      'Read the contents of a file from the filesystem',
      {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the file to read (must be absolute)'
          },
          encoding: {
            type: 'string',
            description: 'Text encoding to use (default: utf8)',
            enum: ['utf8', 'ascii', 'base64', 'hex'],
            default: 'utf8'
          }
        },
        required: ['file_path']
      },
      { requiresConfirmation: false }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { file_path, encoding = 'utf8' } = params as { file_path: string, encoding?: BufferEncoding };
    
    try {
      const result = await readFile({ path: file_path, encoding });
      
      if (!result.success) {
        return {
          callId: (options?.context?.callId as string) || 'unknown',
          error: new Error(result.error || 'Unknown error'),
          success: false,
          data: undefined // Explicitly set optional data to undefined if not present
        } as ToolResult;
      }
      
      return {
        callId: options?.context?.callId || 'unknown',
        data: result.content as string,
        success: true,
        metadata: {
          size: result.size,
          path: result.path
        }
      } as ToolResult;
    } catch (error) {
      return {
        callId: options?.context?.callId || 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        success: false,
        data: undefined // Explicitly set optional data to undefined if not present
      } as ToolResult;
    }
  }

  validateParams(params: unknown): string | null {
    if (typeof params !== 'object' || params === null) {
      return 'Parameters must be an object';
    }
    
    const { file_path } = params as { file_path?: string };
    
    if (!file_path) {
      return 'Missing required parameter: file_path';
    }
    
    if (typeof file_path !== 'string') {
      return 'file_path must be a string';
    }
    
    return null;
  }
}