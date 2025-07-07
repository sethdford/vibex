/**
 * File I/O Service
 * 
 * Single Responsibility: Handle basic file input/output operations
 * Following Gemini CLI's clean architecture patterns
 */

import { readFile, writeFile, mkdir, access, stat, unlink, rename, copyFile as fsCopyFile } from 'fs/promises';
import { dirname, extname } from 'path';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

export interface FileIOConfig {
  fileSizeLimit?: number;
  defaultEncoding?: string;
  createDirectories?: boolean;
}

export interface FileIOResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  timing?: {
    startTime: number;
    duration: number;
  };
}

export interface FileContent {
  content: string;
  encoding: string;
  binary?: boolean;
  size: number;
}

export interface FileStats {
  path: string;
  size: number;
  modified: Date;
  created: Date;
  exists: boolean;
}

/**
 * File I/O Service - Clean Architecture
 * Focus: Basic file operations only
 */
export class FileIOService {
  private config: Required<FileIOConfig>;

  constructor(config: FileIOConfig = {}) {
    this.config = {
      fileSizeLimit: config.fileSizeLimit || 10 * 1024 * 1024, // 10MB
      defaultEncoding: config.defaultEncoding || 'utf-8',
      createDirectories: config.createDirectories ?? true
    };
  }

  /**
   * Read file content
   */
  async readFile(filePath: string, encoding?: string): Promise<FileIOResult<FileContent>> {
    const startTime = Date.now();
    
    try {
      // Check if file exists
      const existsResult = await this.fileExists(filePath);
      if (!existsResult.success || !existsResult.data) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }

      // Get file stats
      const stats = await stat(filePath);
      
      // Check file size limit
      if (stats.size > this.config.fileSizeLimit) {
        return {
          success: false,
          error: `File size exceeds limit (${Math.round(stats.size / 1024)}KB > ${Math.round(this.config.fileSizeLimit / 1024)}KB)`,
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }

      // Determine if it's a binary file
      const isBinary = this.isBinaryExtension(filePath);
      const fileEncoding = encoding || this.config.defaultEncoding;

      let content: string;
      
      if (isBinary) {
        // For binary files, read as base64
        const buffer = await readFile(filePath);
        content = buffer.toString('base64');
        
        return {
          success: true,
          data: {
            content,
            encoding: 'base64',
            binary: true,
            size: stats.size
          },
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      } else {
        // For text files, read with specified encoding
        content = await readFile(filePath, { encoding: fileEncoding as BufferEncoding });
        
        return {
          success: true,
          data: {
            content,
            encoding: fileEncoding,
            binary: false,
            size: stats.size
          },
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }
    } catch (error) {
      logger.error(`Failed to read file: ${filePath}`, error);
      return {
        success: false,
        error: `Read failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string, encoding?: string): Promise<FileIOResult<FileStats>> {
    const startTime = Date.now();
    
    try {
      // Create directory if needed
      if (this.config.createDirectories) {
        await mkdir(dirname(filePath), { recursive: true });
      }

      const fileEncoding = encoding || this.config.defaultEncoding;
      
      // Write file
      await writeFile(filePath, content, { encoding: fileEncoding as BufferEncoding });
      
      // Get updated stats
      const statsResult = await this.getFileStats(filePath);
      if (!statsResult.success || !statsResult.data) {
        return {
          success: false,
          error: 'Failed to get file stats after write',
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }

      logger.debug(`File written successfully: ${filePath}`, {
        size: statsResult.data.size,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        data: statsResult.data,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to write file: ${filePath}`, error);
      return {
        success: false,
        error: `Write failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<FileIOResult> {
    const startTime = Date.now();
    
    try {
      await unlink(filePath);
      
      logger.debug(`File deleted successfully: ${filePath}`);
      
      return {
        success: true,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to delete file: ${filePath}`, error);
      return {
        success: false,
        error: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Move or rename a file
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<FileIOResult<FileStats>> {
    const startTime = Date.now();
    
    try {
      // Create target directory if needed
      if (this.config.createDirectories) {
        await mkdir(dirname(targetPath), { recursive: true });
      }

      // Move the file
      await rename(sourcePath, targetPath);
      
      // Get stats for target
      const statsResult = await this.getFileStats(targetPath);
      if (!statsResult.success || !statsResult.data) {
        return {
          success: false,
          error: 'Failed to get file stats after move',
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }

      logger.debug(`File moved successfully: ${sourcePath} -> ${targetPath}`);

      return {
        success: true,
        data: statsResult.data,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to move file: ${sourcePath} -> ${targetPath}`, error);
      return {
        success: false,
        error: `Move failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Copy a file
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<FileIOResult<FileStats>> {
    const startTime = Date.now();
    
    try {
      // Create target directory if needed
      if (this.config.createDirectories) {
        await mkdir(dirname(targetPath), { recursive: true });
      }

      // Copy the file
      await fsCopyFile(sourcePath, targetPath);
      
      // Get stats for target
      const statsResult = await this.getFileStats(targetPath);
      if (!statsResult.success || !statsResult.data) {
        return {
          success: false,
          error: 'Failed to get file stats after copy',
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }

      logger.debug(`File copied successfully: ${sourcePath} -> ${targetPath}`);

      return {
        success: true,
        data: statsResult.data,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to copy file: ${sourcePath} -> ${targetPath}`, error);
      return {
        success: false,
        error: `Copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<FileIOResult<boolean>> {
    try {
      await access(filePath);
      return {
        success: true,
        data: true
      };
    } catch {
      return {
        success: true,
        data: false
      };
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath: string): Promise<FileIOResult<FileStats>> {
    try {
      const stats = await stat(filePath);
      
      return {
        success: true,
        data: {
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
          exists: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Read file content as lines
   */
  async readFileLines(filePath: string, encoding?: string): Promise<FileIOResult<string[]>> {
    const readResult = await this.readFile(filePath, encoding);
    
    if (!readResult.success || !readResult.data) {
      return {
        success: false,
        error: readResult.error
      };
    }

    if (readResult.data.binary) {
      return {
        success: false,
        error: 'Cannot read binary file as lines'
      };
    }

    const lines = readResult.data.content.split('\n');
    
    return {
      success: true,
      data: lines
    };
  }

  /**
   * Write content as lines
   */
  async writeFileLines(filePath: string, lines: string[], encoding?: string): Promise<FileIOResult<FileStats>> {
    const content = lines.join('\n');
    return await this.writeFile(filePath, content, encoding);
  }

  /**
   * Append content to file
   */
  async appendToFile(filePath: string, content: string, encoding?: string): Promise<FileIOResult<FileStats>> {
    try {
      // Read existing content
      const existsResult = await this.fileExists(filePath);
      let existingContent = '';
      
      if (existsResult.data) {
        const readResult = await this.readFile(filePath, encoding);
        if (readResult.success && readResult.data && !readResult.data.binary) {
          existingContent = readResult.data.content;
        }
      }

      // Append new content
      const newContent = existingContent + content;
      
      return await this.writeFile(filePath, newContent, encoding);
    } catch (error) {
      return {
        success: false,
        error: `Append failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get file size limit
   */
  getFileSizeLimit(): number {
    return this.config.fileSizeLimit;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<FileIOConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if file extension indicates binary content
   */
  private isBinaryExtension(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const binaryExtensions = [
      '.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', 
      '.gif', '.bmp', '.ico', '.svg', '.pdf', '.zip', '.tar', '.gz', 
      '.bz2', '.7z', '.rar', '.mp3', '.mp4', '.avi', '.mov', '.wav', 
      '.flac', '.ogg', '.woff', '.woff2', '.ttf', '.eot', '.otf'
    ];
    
    return binaryExtensions.includes(ext);
  }
}

// Factory function for creating file I/O service
export function createFileIOService(config?: FileIOConfig): FileIOService {
  return new FileIOService(config);
} 