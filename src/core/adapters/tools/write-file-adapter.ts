/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult, ToolConfirmationDetails } from '../../domain/tool';
import { writeFile } from '../../../tools/write-file.js';
import path from 'path';

/**
 * Adapter for the write_file tool to the new architecture
 */
export class WriteFileTool extends BaseTool {
  constructor() {
    super(
      'write_file',
      'Write content to a file on the filesystem with safety features',
      {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the file to write (must be absolute)'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          },
          encoding: {
            type: 'string',
            description: 'Text encoding to use (default: utf8)',
            enum: ['utf8', 'ascii', 'base64', 'hex'],
            default: 'utf8'
          },
          create_backup: {
            type: 'boolean',
            description: 'Whether to create backup of existing file (default: true)',
            default: true
          }
        },
        required: ['file_path', 'content']
      },
      { 
        requiresConfirmation: true, 
        dangerous: true 
      }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { 
      file_path, 
      content, 
      encoding = 'utf8', 
      create_backup = true 
    } = params as { 
      file_path: string, 
      content: string, 
      encoding?: BufferEncoding,
      create_backup?: boolean
    };
    
    try {
      // Call the legacy implementation
      const result = await writeFile({
        path: file_path,
        content,
        encoding,
        createBackup: create_backup,
        createDirs: true
      });
      
      if (!result.success) {
        return {
          callId: (options?.context?.callId as string) || 'unknown',
          error: new Error(result.error || 'Unknown error'),
          success: false,
          data: undefined
        } as ToolResult;
      }
      
      return {
        callId: options?.context?.callId || 'unknown',
        data: {
          path: result.path,
          bytesWritten: result.bytesWritten,
          created: result.created,
          backupPath: result.backupPath
        } as unknown,
        success: true
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
    
    const { file_path, content } = params as { file_path?: string, content?: string };
    
    if (!file_path) {
      return 'Missing required parameter: file_path';
    }
    
    if (!content && content !== '') {
      return 'Missing required parameter: content';
    }
    
    if (typeof file_path !== 'string') {
      return 'file_path must be a string';
    }
    
    if (typeof content !== 'string') {
      return 'content must be a string';
    }
    
    return null;
  }

  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    const { file_path, content } = params as { file_path: string, content: string };
    
    // Always request confirmation for file writes
    return {
      title: `Confirm writing to ${path.basename(file_path)}`,
      description: `This will write ${content.length} bytes to ${file_path}`,
      type: 'edit',
      params: params as Record<string, unknown>,
      displayOptions: {
        language: this.detectLanguage(file_path),
        showDiff: true,
        allowEdit: true
      }
    };
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const extensionMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.java': 'java',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
      '.json': 'json',
      '.xml': 'xml',
      '.sh': 'bash',
      '.yml': 'yaml',
      '.yaml': 'yaml'
    };
    
    return extensionMap[ext] || 'plaintext';
  }
}