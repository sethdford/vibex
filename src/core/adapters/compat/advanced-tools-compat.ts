/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Backward compatibility layer for advanced file tools
 * 
 * This module provides functions that match the API of the legacy advanced file tools
 * but internally use the new architecture.
 */

import { toolAPI } from '../../domain/tool/tool-api';
import { LiveFeedbackCallbacks } from '../../../ui/components/LiveToolFeedback';
import { InternalToolResult } from '../../../tools';
import { ToolProgress } from '../../domain/tool/tool-interfaces';

/**
 * Legacy compatible list_directory function
 */
export async function executeListDirectory(
  input: any, 
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('list_directory', String(input.path), 'Listing directory...');
  
  try {
    const result = await toolAPI.executeTool('list_directory', {
      path: input.path,
      recursive: input.recursive,
      include_hidden: input.include_hidden,
      include_metadata: input.include_metadata,
      filter_pattern: input.filter_pattern,
      max_depth: input.max_depth,
      sort_by: input.sort_by,
      sort_order: input.sort_order
    }, {
      signal: new AbortController().signal,
      onProgress: (progress: ToolProgress) => {
        if (feedbackId && feedback?.onProgress) {
          feedback.onProgress(feedbackId, {
            status: 'processing',
            message: progress.message || 'Processing...',
            progress: progress.percentage ? { 
              current: progress.percentage, 
              total: 100, 
              unit: '%' 
            } : undefined
          });
        }
      }
    });
    
    const legacyResult = {
      success: result.success,
      result: result.data,
      metadata: result.metadata
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, legacyResult);
    }
    
    return legacyResult;
  } catch (error) {
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }
    
    return errorResult;
  }
}

/**
 * Legacy compatible read_many_files function
 */
export async function executeReadManyFiles(
  input: any, 
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('read_many_files', 'batch', 'Reading multiple files...');
  
  try {
    const result = await toolAPI.executeTool('read_many_files', {
      paths: input.paths,
      include_metadata: input.include_metadata,
      skip_binary: input.skip_binary,
      max_file_size: input.max_file_size,
      encoding: input.encoding
    }, {
      signal: new AbortController().signal,
      onProgress: (progress: ToolProgress) => {
        if (feedbackId && feedback?.onProgress) {
          feedback.onProgress(feedbackId, {
            status: 'processing',
            message: progress.message || 'Processing...',
            progress: progress.percentage ? { 
              current: progress.percentage, 
              total: 100, 
              unit: '%' 
            } : undefined
          });
        }
      }
    });
    
    const legacyResult = {
      success: result.success,
      result: result.data,
      metadata: result.metadata
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, legacyResult);
    }
    
    return legacyResult;
  } catch (error) {
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }
    
    return errorResult;
  }
}

/**
 * Legacy compatible edit function
 */
export async function executeEdit(
  input: any, 
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('edit', String(input.path), 'Editing file...');
  
  try {
    const result = await toolAPI.executeTool('edit', {
      path: input.path,
      content: input.content,
      create_backup: input.create_backup,
      diff_only: input.diff_only,
      line_range: input.line_range,
      encoding: input.encoding
    }, {
      signal: new AbortController().signal,
      onProgress: (progress: ToolProgress) => {
        if (feedbackId && feedback?.onProgress) {
          feedback.onProgress(feedbackId, {
            status: 'processing',
            message: progress.message || 'Processing...',
            progress: progress.percentage ? { 
              current: progress.percentage, 
              total: 100, 
              unit: '%' 
            } : undefined
          });
        }
      }
    });
    
    const legacyResult = {
      success: result.success,
      result: result.data,
      metadata: result.metadata
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, legacyResult);
    }
    
    return legacyResult;
  } catch (error) {
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }
    
    return errorResult;
  }
}

/**
 * Legacy compatible glob function
 */
export async function executeGlob(
  input: any, 
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('glob', 'pattern matching', 'Finding files...');
  
  try {
    const result = await toolAPI.executeTool('glob', {
      patterns: input.patterns,
      base_path: input.base_path,
      ignore_patterns: input.ignore_patterns,
      include_directories: input.include_directories,
      max_results: input.max_results,
      sort: input.sort
    }, {
      signal: new AbortController().signal,
      onProgress: (progress: ToolProgress) => {
        if (feedbackId && feedback?.onProgress) {
          feedback.onProgress(feedbackId, {
            status: 'processing',
            message: progress.message || 'Processing...',
            progress: progress.percentage ? { 
              current: progress.percentage, 
              total: 100, 
              unit: '%' 
            } : undefined
          });
        }
      }
    });
    
    const legacyResult = {
      success: result.success,
      result: result.data,
      metadata: result.metadata
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, legacyResult);
    }
    
    return legacyResult;
  } catch (error) {
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }
    
    return errorResult;
  }
}

/**
 * Legacy compatible advanced file tools
 */
export const advancedFileTools = {
  list_directory: {
    definition: {
      name: 'list_directory',
      description: 'List directory contents with advanced filtering and metadata',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list'
          },
          recursive: {
            type: 'boolean',
            description: 'Recursively list subdirectories'
          },
          include_hidden: {
            type: 'boolean',
            description: 'Include hidden files and directories'
          },
          include_metadata: {
            type: 'boolean',
            description: 'Include file metadata'
          }
        },
        required: ['path']
      }
    },
    handler: executeListDirectory
  },
  read_many_files: {
    definition: {
      name: 'read_many_files',
      description: 'Read multiple files in batch with content aggregation',
      input_schema: {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of file paths to read'
          }
        },
        required: ['paths']
      }
    },
    handler: executeReadManyFiles
  },
  edit: {
    definition: {
      name: 'edit',
      description: 'Advanced file editing with diff generation and backup',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to edit'
          },
          content: {
            type: 'string',
            description: 'New file content'
          }
        },
        required: ['path', 'content']
      }
    },
    handler: executeEdit
  },
  glob: {
    definition: {
      name: 'glob',
      description: 'Find files using glob patterns with advanced filtering',
      input_schema: {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Glob patterns to match'
          }
        },
        required: ['patterns']
      }
    },
    handler: executeGlob
  }
};