/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult, ToolConfirmationDetails } from '../../domain/tool';
import { executeEdit } from '../../../tools/advanced-file-tools';
import path from 'path';
import { LiveFeedbackData } from '../../../ui/components/LiveToolFeedback';

/**
 * Adapter for the edit tool to the new architecture
 */
export class EditTool extends BaseTool {
  constructor() {
    super(
      'edit',
      'Advanced file editing with diff generation and backup',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to edit'
          },
          content: {
            type: 'string',
            description: 'New file content'
          },
          create_backup: {
            type: 'boolean',
            description: 'Create backup before editing',
            default: true
          },
          diff_only: {
            type: 'boolean',
            description: 'Only generate diff without applying changes',
            default: false
          },
          line_range: {
            type: 'object',
            properties: {
              start: { type: 'number' },
              end: { type: 'number' }
            },
            description: 'Edit only specific line range'
          },
          encoding: {
            type: 'string',
            description: 'Text encoding to use',
            default: 'utf-8'
          }
        },
        required: ['path', 'content']
      },
      { 
        requiresConfirmation: true,
        dangerous: true
      }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { 
      path: filePath, 
      content, 
      create_backup, 
      diff_only, 
      line_range, 
      encoding 
    } = params as { 
      path: string, 
      content: string,
      create_backup?: boolean,
      diff_only?: boolean,
      line_range?: { start: number, end: number },
      encoding?: string
    };
    
    try {
      // Call the legacy implementation
      const legacyResult = await executeEdit({
        path: filePath,
        content,
        create_backup,
        diff_only,
        line_range: line_range ? { start: line_range.start, end: line_range.end } : undefined,
        encoding
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
          success: false
        };
      }
      
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        data: legacyResult.result,
        success: true,
        metadata: legacyResult.metadata as Record<string, unknown>
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
    
    const { path, content } = params as { path?: string, content?: string };
    
    if (!path) {
      return 'Missing required parameter: path';
    }
    
    if (content === undefined) {
      return 'Missing required parameter: content';
    }
    
    if (typeof path !== 'string') {
      return 'path must be a string';
    }
    
    if (typeof content !== 'string') {
      return 'content must be a string';
    }
    
    // Validate line_range if provided
    const { line_range } = params as { line_range?: unknown };
    if (line_range !== undefined) {
      if (typeof line_range !== 'object' || line_range === null) {
        return 'line_range must be an object with start and end properties';
      }
      
      const range = line_range as { start?: unknown, end?: unknown };
      if (typeof range.start !== 'number' || typeof range.end !== 'number') {
        return 'line_range.start and line_range.end must be numbers';
      }
      
      if (range.start < 1) {
        return 'line_range.start must be a positive number';
      }
      
      if (range.end < range.start) {
        return 'line_range.end must be greater than or equal to line_range.start';
      }
    }
    
    return null;
  }

  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    const { path: filePath, content, diff_only } = params as { 
      path: string, 
      content: string,
      diff_only?: boolean
    };
    
    // Don't need confirmation for diff_only mode since it doesn't modify files
    if (diff_only === true) {
      return null;
    }
    
    const extension = path.extname(filePath).toLowerCase();
    const contentPreview = content.length > 100 
      ? content.substring(0, 97) + '...' 
      : content;
    
    return {
      title: `Confirm editing ${path.basename(filePath)}`,
      description: `This will modify file: ${filePath} (${content.length} bytes)`,
      type: 'edit',
      params: params as Record<string, unknown>,
      displayOptions: {
        language: this.detectLanguage(filePath),
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
