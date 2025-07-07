/**
 * Write File Tool
 * 
 * Simple file writing tool based on Gemini CLI's approach.
 * Includes safety features like backup creation.
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface WriteFileParams {
  /**
   * Path to the file to write
   */
  path: string;
  
  /**
   * Content to write to the file
   */
  content: string;
  
  /**
   * Encoding to use (default: utf8)
   */
  encoding?: BufferEncoding;
  
  /**
   * Whether to create backup of existing file (default: true)
   */
  createBackup?: boolean;
  
  /**
   * Whether to create parent directories if they don't exist (default: true)
   */
  createDirs?: boolean;
}

export interface WriteFileResult {
  /**
   * File path that was written
   */
  path: string;
  
  /**
   * Number of bytes written
   */
  bytesWritten: number;
  
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Path to backup file if created
   */
  backupPath?: string;
  
  /**
   * Whether this was a new file creation
   */
  created: boolean;
  
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Write content to a file
 */
export async function writeFile(params: WriteFileParams): Promise<WriteFileResult> {
  try {
    const { 
      path: filePath, 
      content, 
      encoding = 'utf8',
      createBackup = true,
      createDirs = true
    } = params;
    
    // Resolve absolute path
    const absolutePath = path.resolve(filePath);
    
    // Check if file exists
    let fileExists = false;
    let backupPath: string | undefined;
    
    try {
      await fs.access(absolutePath);
      fileExists = true;
    } catch {
      // File doesn't exist, which is fine
    }
    
    // Create backup if file exists and backup is requested
    if (fileExists && createBackup) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = `${absolutePath}.backup-${timestamp}`;
      
      try {
        await fs.copyFile(absolutePath, backupPath);
        logger.debug(`Created backup: ${backupPath}`);
      } catch (error) {
        logger.warn(`Failed to create backup: ${error}`);
        // Continue anyway - backup failure shouldn't stop the write
      }
    }
    
    // Create parent directories if needed
    if (createDirs) {
      const parentDir = path.dirname(absolutePath);
      try {
        await fs.mkdir(parentDir, { recursive: true });
      } catch (error) {
        logger.warn(`Failed to create parent directories: ${error}`);
      }
    }
    
    // Write the file
    await fs.writeFile(absolutePath, content, encoding);
    
    // Get file stats for bytes written
    const stats = await fs.stat(absolutePath);
    
    logger.debug(`Wrote file: ${absolutePath} (${stats.size} bytes)`);
    
    return {
      path: absolutePath,
      bytesWritten: stats.size,
      success: true,
      backupPath,
      created: !fileExists
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to write file: ${errorMessage}`);
    
    return {
      path: params.path,
      bytesWritten: 0,
      success: false,
      created: false,
      error: errorMessage
    };
  }
}

/**
 * Tool definition for Claude integration
 */
export const writeFileTool = {
  name: 'write_file',
  description: 'Write content to a file on the filesystem with safety features',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write (relative or absolute)'
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
      createBackup: {
        type: 'boolean',
        description: 'Whether to create backup of existing file (default: true)',
        default: true
      },
      createDirs: {
        type: 'boolean',
        description: 'Whether to create parent directories if needed (default: true)',
        default: true
      }
    },
    required: ['path', 'content']
  },
  handler: writeFile
} as const; 