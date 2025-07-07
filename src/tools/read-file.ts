/**
 * Read File Tool
 * 
 * Simple file reading tool based on Gemini CLI's approach.
 * Focuses on core functionality without over-engineering.
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface ReadFileParams {
  /**
   * Path to the file to read
   */
  path: string;
  
  /**
   * Encoding to use (default: utf8)
   */
  encoding?: BufferEncoding;
}

export interface ReadFileResult {
  /**
   * File content
   */
  content: string;
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * File path that was read
   */
  path: string;
  
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Read a file from the filesystem
 */
export async function readFile(params: ReadFileParams): Promise<ReadFileResult> {
  try {
    const { path: filePath, encoding = 'utf8' } = params;
    
    // Resolve absolute path
    const absolutePath = path.resolve(filePath);
    
    // Check if file exists
    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        return {
          content: '',
          size: 0,
          path: absolutePath,
          success: false,
          error: `Path is not a file: ${filePath}`
        };
      }
    } catch (error) {
      return {
        content: '',
        size: 0,
        path: absolutePath,
        success: false,
        error: `File not found: ${filePath}`
      };
    }
    
    // Read file content
    const content = await fs.readFile(absolutePath, encoding);
    const stats = await fs.stat(absolutePath);
    
    logger.debug(`Read file: ${absolutePath} (${stats.size} bytes)`);
    
    return {
      content,
      size: stats.size,
      path: absolutePath,
      success: true
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to read file: ${errorMessage}`);
    
    return {
      content: '',
      size: 0,
      path: params.path,
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Tool definition for Claude integration
 */
export const readFileTool = {
  name: 'read_file',
  description: 'Read the contents of a file from the filesystem',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read (relative or absolute)'
      },
      encoding: {
        type: 'string',
        description: 'Text encoding to use (default: utf8)',
        enum: ['utf8', 'ascii', 'base64', 'hex'],
        default: 'utf8'
      }
    },
    required: ['path']
  },
  handler: readFile
} as const; 