/**
 * File Management System
 * 
 * Comprehensive file operations with safety checks, validation,
 * and integration with the Claude AI system.
 */

import { EventEmitter } from 'events';
import { readFile, writeFile, mkdir, access, stat, readdir, unlink, rename, copyFile as fsCopyFile } from 'fs/promises';
import { join, dirname, resolve, relative, extname, basename, normalize, isAbsolute } from 'path';
import * as path from 'path';
import { createReadStream, createWriteStream, watch, FSWatcher } from 'fs';
import * as fs from 'fs';
import { createHash } from 'crypto';
import { ContentGenerator } from './content-generator.js';
import { ToolSchema } from './claude-client.js';
import { logger } from '../utils/logger.js';
import { constants } from 'fs';
import { createUserError } from '../errors/index.js';
import { ErrorCategory } from '../errors/types.js';
import { isValidFilePath, isValidDirectoryPath } from '../utils/validation.js';
import { 
  GitAwareFileFilter, 
  createGitAwareFileFilter, 
  type GitAwareFilterConfig,
  type FileFilterResult,
  type FilteringStats
} from '../context/git-aware-file-filter.js';
import { minimatch } from 'minimatch';

/**
 * File type categories
 */
export enum FileType {
  CODE = 'code',
  CONFIG = 'config',
  DOCUMENTATION = 'documentation',
  IMAGE = 'image',
  BINARY = 'binary',
  TEXT = 'text',
  UNKNOWN = 'unknown',
}

/**
 * File metadata
 */
export interface FileMetadata {
  path: string;
  name: string;
  ext: string;
  size: number;
  modified: Date;
  created: Date;
  fileType: FileType;
  lineCount?: number;
  hash?: string;
  language?: string;
  hasChanges?: boolean;
}

/**
 * File content with metadata
 */
export interface FileContent {
  metadata: FileMetadata;
  content: string;
  binary?: boolean;
  encoding?: string;
}

/**
 * File search options
 */
export interface FileSearchOptions {
  /**
   * Include patterns (glob format)
   */
  include?: string[];
  
  /**
   * Exclude patterns (glob format)
   */
  exclude?: string[];
  
  /**
   * Max depth for recursive search
   */
  maxDepth?: number;
  
  /**
   * Max file size in bytes
   */
  maxFileSize?: number;
  
  /**
   * Max number of files to return
   */
  maxFiles?: number;
  
  /**
   * Only return files of these types
   */
  fileTypes?: FileType[];
  
  /**
   * Follow symbolic links
   */
  followSymlinks?: boolean;
}

/**
 * Text search options
 */
export interface TextSearchOptions extends FileSearchOptions {
  /**
   * Case sensitivity
   */
  caseSensitive?: boolean;
  
  /**
   * Use regular expression
   */
  useRegex?: boolean;
  
  /**
   * Include context lines around matches
   */
  contextLines?: number;
  
  /**
   * Maximum matches per file
   */
  maxMatchesPerFile?: number;
}

/**
 * Text search result
 */
export interface TextSearchResult {
  /**
   * File metadata
   */
  metadata: FileMetadata;
  
  /**
   * Matches in file
   */
  matches: Array<{
    /**
     * Line number
     */
    line: number;
    
    /**
     * Column number
     */
    column: number;
    
    /**
     * Match content
     */
    content: string;
    
    /**
     * Context lines (if requested)
     */
    context?: Array<{
      line: number;
      content: string;
    }>;
  }>;
}

/**
 * Line modification type
 */
export enum LineModificationType {
  ADD = 'add',
  REMOVE = 'remove',
  REPLACE = 'replace',
}

/**
 * Line modification
 */
export interface LineModification {
  /**
   * Line number (1-based)
   */
  line: number;
  
  /**
   * Modification type
   */
  type: LineModificationType;
  
  /**
   * Content to add or replace with
   */
  content?: string;
  
  /**
   * Number of lines to remove (for REMOVE)
   */
  count?: number;
}

/**
 * File batch operation type
 */
export enum FileBatchOperationType {
  READ = 'read',
  WRITE = 'write',
  MODIFY = 'modify',
  DELETE = 'delete',
  MOVE = 'move',
  COPY = 'copy',
}

/**
 * File batch operation
 */
export interface FileBatchOperation {
  /**
   * Operation type
   */
  type: FileBatchOperationType;
  
  /**
   * Source path
   */
  source: string;
  
  /**
   * Target path (for MOVE, COPY)
   */
  target?: string;
  
  /**
   * Content (for WRITE)
   */
  content?: string;
  
  /**
   * Modifications (for MODIFY)
   */
  modifications?: LineModification[];
}

/**
 * File batch result
 */
export interface FileBatchResult {
  /**
   * Success flag
   */
  success: boolean;
  
  /**
   * Operation that was performed
   */
  operation: FileBatchOperation;
  
  /**
   * Error message (if failed)
   */
  error?: string;
  
  /**
   * File content (for READ)
   */
  content?: string;
  
  /**
   * File metadata
   */
  metadata?: FileMetadata;
}

/**
 * File change event
 */
export enum FileChangeEvent {
  CREATE = 'file:create',
  MODIFY = 'file:modify',
  DELETE = 'file:delete',
  RENAME = 'file:rename',
  READ = 'file:read',
  SEARCH = 'file:search',
  ERROR = 'file:error',
  BATCH = 'file:batch',
}

/**
 * File manager options
 */
export interface FileManagerOptions {
  /**
   * Root directory
   */
  rootDir?: string;
  
  /**
   * Default exclusion patterns
   */
  defaultExclusions?: string[];
  
  /**
   * Cache options
   */
  cache?: {
    /**
     * Enable file content caching
     */
    enabled: boolean;
    
    /**
     * Maximum cache size in bytes
     */
    maxSize: number;
    
    /**
     * Cache TTL in milliseconds
     */
    ttl: number;
  };
  
  /**
   * Watch for file changes
   */
  watch?: boolean;
  
  /**
   * File size limit for processing
   */
  fileSizeLimit?: number;
}

/**
 * Language detection result
 */
export interface LanguageDetectionResult {
  /**
   * Detected language
   */
  language: string;
  
  /**
   * Confidence score (0-1)
   */
  confidence: number;
}

/**
 * Advanced File Manager
 * 
 * System for intelligent file operations with context awareness
 */
export class FileManager extends EventEmitter {
  private contentGenerator: ContentGenerator;
  private options: Required<FileManagerOptions>;
  private cache: Map<string, { content: string; expires: number }> = new Map();
  private watchers: Map<string, FSWatcher> = new Map();
  private metadataCache: Map<string, FileMetadata> = new Map();
  private fileTypeMap: Map<string, FileType> = new Map();
  private languageExtensionMap: Map<string, string> = new Map();
  
  constructor(
    contentGenerator: ContentGenerator,
    options: FileManagerOptions = {}
  ) {
    super();
    
    this.contentGenerator = contentGenerator;
    
    // Set default options
    this.options = {
      rootDir: options.rootDir || process.cwd(),
      defaultExclusions: options.defaultExclusions || [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.log'
      ],
      cache: {
        enabled: options.cache?.enabled ?? true,
        maxSize: options.cache?.maxSize ?? 100 * 1024 * 1024, // 100MB
        ttl: options.cache?.ttl ?? 5 * 60 * 1000 // 5 minutes
      },
      watch: options.watch ?? false,
      fileSizeLimit: options.fileSizeLimit ?? 10 * 1024 * 1024 // 10MB
    };
    
    // Initialize mappings
    this.initializeFileTypeMappings();
    this.initializeLanguageMappings();
    
    logger.debug(`FileManager initialized with root: ${this.options.rootDir}`);
  }
  
  /**
   * Read file content with metadata
   */
  public async readFile(filePath: string, encoding: string = 'utf-8'): Promise<FileContent> {
    const absolutePath = this.resolvePath(filePath);
    
    try {
      // Check cache first if enabled
      if (this.options.cache.enabled) {
        const cached = this.cache.get(absolutePath);
        if (cached && cached.expires > Date.now()) {
          // Get metadata
          const metadata = await this.getFileMetadata(absolutePath);
          return {
            metadata,
            content: cached.content,
            encoding
          };
        }
      }
      
      // Get file stats
      const stats = await stat(absolutePath);
      
      // Check file size limit
      if (stats.size > this.options.fileSizeLimit) {
        throw new Error(`File size exceeds limit (${Math.round(stats.size / 1024)}KB)`);
      }
      
      // Get file metadata
      const metadata = await this.getFileMetadata(absolutePath);
      
      // Determine if it's a binary file
      const isBinary = this.isBinaryExtension(extname(absolutePath));
      
      // Read file content
      let content: string;
      if (isBinary) {
        // For binary files, read as base64
        const buffer = await readFile(absolutePath);
        content = buffer.toString('base64');
        
        return {
          metadata,
          content,
          binary: true,
          encoding: 'base64'
        };
      } else {
        // For text files, read with specified encoding
        content = await readFile(absolutePath, { encoding: encoding as BufferEncoding });
        
        // Cache the content if enabled
        if (this.options.cache.enabled) {
          this.cache.set(absolutePath, {
            content,
            expires: Date.now() + this.options.cache.ttl
          });
        }
        
        return {
          metadata,
          content,
          encoding
        };
      }
    } catch (error) {
      logger.error(`Failed to read file: ${absolutePath}`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        path: absolutePath,
        operation: 'read',
        error
      });
      
      throw error;
    } finally {
      this.emit(FileChangeEvent.READ, { path: absolutePath });
    }
  }
  
  /**
   * Write content to a file
   */
  public async writeFile(filePath: string, content: string, encoding: string = 'utf-8'): Promise<FileMetadata> {
    const absolutePath = this.resolvePath(filePath);
    
    try {
      // Ensure directory exists
      await mkdir(dirname(absolutePath), { recursive: true });
      
      // Write file content
      await writeFile(absolutePath, content, { encoding: encoding as BufferEncoding });
      
      // Get updated metadata
      const metadata = await this.getFileMetadata(absolutePath);
      
      // Update cache if enabled
      if (this.options.cache.enabled) {
        this.cache.set(absolutePath, {
          content,
          expires: Date.now() + this.options.cache.ttl
        });
      }
      
      // Clear metadata cache
      this.metadataCache.delete(absolutePath);
      
      return metadata;
    } catch (error) {
      logger.error(`Failed to write file: ${absolutePath}`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        path: absolutePath,
        operation: 'write',
        error
      });
      
      throw error;
    } finally {
      this.emit(FileChangeEvent.MODIFY, { path: absolutePath });
    }
  }
  
  /**
   * Delete a file
   */
  public async deleteFile(filePath: string): Promise<boolean> {
    const absolutePath = this.resolvePath(filePath);
    
    try {
      await unlink(absolutePath);
      
      // Clear caches
      this.cache.delete(absolutePath);
      this.metadataCache.delete(absolutePath);
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete file: ${absolutePath}`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        path: absolutePath,
        operation: 'delete',
        error
      });
      
      return false;
    } finally {
      this.emit(FileChangeEvent.DELETE, { path: absolutePath });
    }
  }
  
  /**
   * Move or rename a file
   */
  public async moveFile(sourcePath: string, targetPath: string): Promise<FileMetadata> {
    const absoluteSource = this.resolvePath(sourcePath);
    const absoluteTarget = this.resolvePath(targetPath);
    
    try {
      // Ensure target directory exists
      await mkdir(dirname(absoluteTarget), { recursive: true });
      
      // Move the file
      await rename(absoluteSource, absoluteTarget);
      
      // Clear caches for source
      this.cache.delete(absoluteSource);
      this.metadataCache.delete(absoluteSource);
      
      // Get metadata for target
      const metadata = await this.getFileMetadata(absoluteTarget);
      
      return metadata;
    } catch (error) {
      logger.error(`Failed to move file from ${absoluteSource} to ${absoluteTarget}`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        source: absoluteSource,
        target: absoluteTarget,
        operation: 'move',
        error
      });
      
      throw error;
    } finally {
      this.emit(FileChangeEvent.RENAME, { 
        source: absoluteSource,
        target: absoluteTarget
      });
    }
  }
  
  /**
   * Copy a file
   */
  public async copyFile(sourcePath: string, targetPath: string): Promise<FileMetadata> {
    const absoluteSource = this.resolvePath(sourcePath);
    const absoluteTarget = this.resolvePath(targetPath);
    
    try {
      // Ensure target directory exists
      await mkdir(dirname(absoluteTarget), { recursive: true });
      
      // Copy the file
      await fsCopyFile(absoluteSource, absoluteTarget);
      
      // Get metadata for target
      const metadata = await this.getFileMetadata(absoluteTarget);
      
      return metadata;
    } catch (error) {
      logger.error(`Failed to copy file from ${absoluteSource} to ${absoluteTarget}`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        source: absoluteSource,
        target: absoluteTarget,
        operation: 'copy',
        error
      });
      
      throw error;
    }
  }
  
  /**
   * Modify a file with line-by-line operations
   */
  public async modifyFile(filePath: string, modifications: LineModification[]): Promise<FileContent> {
    const absolutePath = this.resolvePath(filePath);
    
    try {
      // Read file content
      const { content } = await this.readFile(absolutePath);
      
      // Split into lines
      const lines = content.split('\n');
      
      // Sort modifications by line number in descending order
      // to avoid line number shifting during modification
      const sortedMods = [...modifications].sort((a, b) => b.line - a.line);
      
      // Apply modifications
      for (const mod of sortedMods) {
        const lineIndex = mod.line - 1; // Convert to 0-based index
        
        switch (mod.type) {
          case LineModificationType.ADD:
            if (mod.content === undefined) {
              throw new Error('Content is required for ADD modification');
            }
            lines.splice(lineIndex, 0, mod.content);
            break;
            
          case LineModificationType.REMOVE:
            const count = mod.count || 1;
            lines.splice(lineIndex, count);
            break;
            
          case LineModificationType.REPLACE:
            if (mod.content === undefined) {
              throw new Error('Content is required for REPLACE modification');
            }
            lines[lineIndex] = mod.content;
            break;
        }
      }
      
      // Join lines
      const newContent = lines.join('\n');
      
      // Write modified content back
      await this.writeFile(absolutePath, newContent);
      
      // Get updated metadata
      const metadata = await this.getFileMetadata(absolutePath);
      
      return {
        metadata,
        content: newContent,
        encoding: 'utf-8'
      };
    } catch (error) {
      logger.error(`Failed to modify file: ${absolutePath}`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        path: absolutePath,
        operation: 'modify',
        error
      });
      
      throw error;
    }
  }
  
  /**
   * Search for files matching patterns
   */
  public async findFiles(options: FileSearchOptions = {}): Promise<FileMetadata[]> {
    const rootDir = this.options.rootDir;
    
    try {
      const searchOptions: Required<FileSearchOptions> = {
        include: [],
        maxDepth: 10,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 1000,
        fileTypes: [],
        followSymlinks: false,
        ...options,
        exclude: [...(options.exclude || []), ...this.options.defaultExclusions],
      };
      
      const result = await this.traverseDirectory(rootDir, searchOptions);
      
      return result;
    } catch (error) {
      logger.error(`Failed to search files`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        operation: 'search',
        error
      });
      
      throw error;
    } finally {
      this.emit(FileChangeEvent.SEARCH, { 
        count: "results-not-tracked",
        options
      });
    }
  }
  
  /**
   * Search for text in files
   */
  public async searchText(
    pattern: string,
    options: TextSearchOptions = {}
  ): Promise<TextSearchResult[]> {
    try {
      // Find matching files first
      const files = await this.findFiles(options);
      
      const searchOptions = {
        caseSensitive: false,
        useRegex: false,
        contextLines: 0,
        maxMatchesPerFile: 100,
        ...options,
      };
      
      // Create regex from pattern
      const flags = searchOptions.caseSensitive ? 'g' : 'gi';
      const regex = searchOptions.useRegex 
        ? new RegExp(pattern, flags)
        : new RegExp(pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), flags);
      
      // Search in each file
      const results: TextSearchResult[] = [];
      
      for (const file of files) {
        const { content } = await this.readFile(file.path);
        const lines = content.split('\n');
        const matches = [];
        
        // Search each line
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let match: RegExpExecArray | null;
          
          while ((match = regex.exec(line)) !== null) {
            // Reset regex lastIndex if we reached the maximum matches for this file
            if (matches.length >= searchOptions.maxMatchesPerFile) {
              regex.lastIndex = 0;
              break;
            }
            
            const lineMatch = {
              line: i + 1,
              column: match.index + 1,
              content: line,
              context: [] as Array<{ line: number; content: string }>
            };
            
            // Add context lines if requested
            if (searchOptions.contextLines > 0) {
              const startLine = Math.max(0, i - searchOptions.contextLines);
              const endLine = Math.min(lines.length - 1, i + searchOptions.contextLines);
              
              for (let j = startLine; j <= endLine; j++) {
                if (j !== i) { // Skip the line with the match itself
                  lineMatch.context.push({
                    line: j + 1,
                    content: lines[j]
                  });
                }
              }
            }
            
            matches.push(lineMatch);
          }
        }
        
        if (matches.length > 0) {
          results.push({
            metadata: file,
            matches
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error(`Failed to search text: ${pattern}`, error);
      
      this.emit(FileChangeEvent.ERROR, {
        operation: 'text-search',
        pattern,
        error
      });
      
      throw error;
    }
  }
  
  /**
   * Execute batch file operations
   */
  public async executeBatch(operations: FileBatchOperation[]): Promise<FileBatchResult[]> {
    const results: FileBatchResult[] = [];
    
    for (const op of operations) {
      try {
        let result: FileBatchResult = {
          success: false,
          operation: op
        };
        
        switch (op.type) {
          case FileBatchOperationType.READ:
            const fileContent = await this.readFile(op.source);
            result = {
              success: true,
              operation: op,
              content: fileContent.content,
              metadata: fileContent.metadata
            };
            break;
            
          case FileBatchOperationType.WRITE:
            if (op.content === undefined) {
              throw new Error('Content is required for WRITE operation');
            }
            const metadata = await this.writeFile(op.source, op.content);
            result = {
              success: true,
              operation: op,
              metadata
            };
            break;
            
          case FileBatchOperationType.MODIFY:
            if (!op.modifications || op.modifications.length === 0) {
              throw new Error('Modifications are required for MODIFY operation');
            }
            const modifiedContent = await this.modifyFile(op.source, op.modifications);
            result = {
              success: true,
              operation: op,
              content: modifiedContent.content,
              metadata: modifiedContent.metadata
            };
            break;
            
          case FileBatchOperationType.DELETE:
            const deleted = await this.deleteFile(op.source);
            result = {
              success: deleted,
              operation: op
            };
            break;
            
          case FileBatchOperationType.MOVE:
            if (!op.target) {
              throw new Error('Target path is required for MOVE operation');
            }
            const movedMetadata = await this.moveFile(op.source, op.target);
            result = {
              success: true,
              operation: op,
              metadata: movedMetadata
            };
            break;
            
          case FileBatchOperationType.COPY:
            if (!op.target) {
              throw new Error('Target path is required for COPY operation');
            }
            const copiedMetadata = await this.copyFile(op.source, op.target);
            result = {
              success: true,
              operation: op,
              metadata: copiedMetadata
            };
            break;
        }
        
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        results.push({
          success: false,
          operation: op,
          error: errorMessage
        });
        
        logger.error(`Batch operation failed`, {
          operation: op,
          error: errorMessage
        });
      }
    }
    
    this.emit(FileChangeEvent.BATCH, {
      operations: operations.length,
      successful: results.filter(r => r.success).length
    });
    
    return results;
  }
  
  /**
   * Detect the programming language of a file
   */
  public async detectLanguage(filePath: string): Promise<LanguageDetectionResult> {
    const absolutePath = this.resolvePath(filePath);
    
    try {
      // Try to detect by extension first
      const ext = extname(absolutePath).toLowerCase();
      const language = this.languageExtensionMap.get(ext);
      
      if (language) {
        return {
          language,
          confidence: 0.9 // High confidence for extension-based detection
        };
      }
      
      // If extension detection failed, try to analyze content
      const { content } = await this.readFile(absolutePath);
      
      // This is a simplified implementation
      // In a real implementation, we would use a more sophisticated algorithm
      // or integrate with a language detection library
      
      // Some basic heuristics
      if (content.includes('<?php')) {
        return { language: 'php', confidence: 0.8 };
      } else if (content.includes('#!/usr/bin/env python') || content.includes('def ') && content.includes(':')) {
        return { language: 'python', confidence: 0.8 };
      } else if (content.includes('import React') || content.includes('import { ')) {
        return { language: 'typescript', confidence: 0.7 };
      } else if (content.includes('function') || content.includes('const ')) {
        return { language: 'javascript', confidence: 0.6 };
      } else if (content.includes('<!DOCTYPE html>') || content.includes('<html>')) {
        return { language: 'html', confidence: 0.8 };
      } else if (content.includes('package ') && content.includes('import ') && content.includes('func ')) {
        return { language: 'go', confidence: 0.8 };
      }
      
      // Default to plain text with low confidence
      return { language: 'text', confidence: 0.3 };
    } catch (error) {
      logger.error(`Failed to detect language for file: ${absolutePath}`, error);
      
      // Default to unknown
      return { language: 'unknown', confidence: 0 };
    }
  }
  
  /**
   * Watch a directory for changes
   */
  public watchDirectory(dirPath: string): void {
    const absolutePath = this.resolvePath(dirPath);
    
    try {
      // Check if already watching
      if (this.watchers.has(absolutePath)) {
        return;
      }
      
      // Create watcher
      const watcher = fs.watch(
        absolutePath,
        { recursive: true },
        (eventType: string, filename: string | null) => {
          if (!filename) return;
          
          const filePath = join(absolutePath, filename);
          
          switch (eventType) {
            case 'change':
              // Clear cache
              this.cache.delete(filePath);
              this.metadataCache.delete(filePath);
              
              this.emit(FileChangeEvent.MODIFY, {
                path: filePath
              });
              break;
              
            case 'rename':
              // Could be create or delete, check if file exists
              if (fs.existsSync(filePath)) {
                this.emit(FileChangeEvent.CREATE, {
                  path: filePath
                });
              } else {
                // Clear cache
                this.cache.delete(filePath);
                this.metadataCache.delete(filePath);
                
                this.emit(FileChangeEvent.DELETE, {
                  path: filePath
                });
              }
              break;
          }
        }
      );
      
      this.watchers.set(absolutePath, watcher);
      
      logger.debug(`Watching directory: ${absolutePath}`);
    } catch (error) {
      logger.error(`Failed to watch directory: ${absolutePath}`, error);
    }
  }
  
  /**
   * Stop watching a directory
   */
  public unwatchDirectory(dirPath: string): void {
    const absolutePath = this.resolvePath(dirPath);
    
    const watcher = this.watchers.get(absolutePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(absolutePath);
      
      logger.debug(`Stopped watching directory: ${absolutePath}`);
    }
  }
  
  /**
   * Clear all cache entries
   */
  public clearCache(): void {
    this.cache.clear();
    this.metadataCache.clear();
    
    logger.debug('File cache cleared');
  }
  
  /**
   * Calculate hash for a file
   */
  public async calculateFileHash(filePath: string): Promise<string> {
    const absolutePath = this.resolvePath(filePath);
    
    try {
      const buffer = await readFile(absolutePath);
      const hash = createHash('sha256');
      hash.update(buffer);
      return hash.digest('hex');
    } catch (error) {
      logger.error(`Failed to calculate hash for file: ${absolutePath}`, error);
      throw error;
    }
  }
  
  /**
   * Destroy the file manager and clean up resources
   */
  public destroy(): void {
    // Close all watchers
    for (const [path, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        logger.error(`Failed to close watcher for ${path}`, error);
      }
    }
    
    this.watchers.clear();
    this.clearCache();
    
    logger.debug('FileManager destroyed');
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    contentCacheSize: number;
    metadataCacheSize: number;
    watchersCount: number;
  } {
    return {
      contentCacheSize: this.cache.size,
      metadataCacheSize: this.metadataCache.size,
      watchersCount: this.watchers.size
    };
  }
  
  /**
   * Resolve a path relative to the root directory
   */
  private resolvePath(filePath: string): string {
    if (isAbsolute(filePath)) {
      return filePath;
    }
    return resolve(this.options.rootDir, filePath);
  }
  
  /**
   * Get file type based on extension and content
   */
  private async getFileType(filePath: string): Promise<FileType> {
    const ext = extname(filePath).toLowerCase();
    
    // Check extension mapping first
    const mappedType = this.fileTypeMap.get(ext);
    if (mappedType) {
      return mappedType;
    }
    
    // Default mapping for common extensions
    if (['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs'].includes(ext)) {
      return FileType.CODE;
    }
    
    if (['.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'].includes(ext)) {
      return FileType.CONFIG;
    }
    
    if (['.md', '.txt', '.rst', '.adoc'].includes(ext)) {
      return FileType.DOCUMENTATION;
    }
    
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
      return FileType.IMAGE;
    }
    
    if (['.exe', '.dll', '.so', '.dylib', '.bin'].includes(ext)) {
      return FileType.BINARY;
    }
    
    return FileType.TEXT;
  }
  
  /**
   * Check if file is cacheable
   */
  private isCacheable(filePath: string, size: number): boolean {
    if (!this.options.cache.enabled) {
      return false;
    }
    
    if (size > this.options.fileSizeLimit) {
      return false;
    }
    
    // Don't cache binary files
    const ext = extname(filePath).toLowerCase();
    const binaryExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.pdf'];
    
    return !binaryExtensions.includes(ext);
  }
  
  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(entry: { content: string; expires: number }): boolean {
    return Date.now() > entry.expires;
  }
  
  /**
   * Initialize file type mappings
   */
  private initializeFileTypeMappings(): void {
    // Code files
    const codeExtensions = [
      '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.h', 
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala'
    ];
    codeExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.CODE));
    
    // Config files
    const configExtensions = [
      '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'
    ];
    configExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.CONFIG));
    
    // Documentation files
    const docExtensions = ['.md', '.txt', '.rst', '.adoc'];
    docExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.DOCUMENTATION));
    
    // Image files
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    imageExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.IMAGE));
    
    // Binary files
    const binaryExtensions = ['.exe', '.dll', '.so', '.dylib', '.bin'];
    binaryExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.BINARY));
  }
  
  /**
   * Initialize language extension mappings
   */
  private initializeLanguageMappings(): void {
    const languageMappings = new Map([
      ['.js', 'javascript'],
      ['.jsx', 'javascript'],
      ['.ts', 'typescript'],
      ['.tsx', 'typescript'],
      ['.py', 'python'],
      ['.java', 'java'],
      ['.cpp', 'cpp'],
      ['.c', 'c'],
      ['.h', 'c'],
      ['.cs', 'csharp'],
      ['.php', 'php'],
      ['.rb', 'ruby'],
      ['.go', 'go'],
      ['.rs', 'rust'],
      ['.swift', 'swift'],
      ['.kt', 'kotlin'],
      ['.scala', 'scala'],
      ['.html', 'html'],
      ['.css', 'css'],
      ['.scss', 'scss'],
      ['.less', 'less'],
      ['.json', 'json'],
      ['.xml', 'xml'],
      ['.yaml', 'yaml'],
      ['.yml', 'yaml'],
      ['.md', 'markdown'],
      ['.sql', 'sql'],
      ['.sh', 'bash'],
      ['.bash', 'bash'],
      ['.zsh', 'zsh'],
      ['.fish', 'fish']
    ]);
    
    this.languageExtensionMap = languageMappings;
  }
  
  /**
   * Get file metadata
   */
  private async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const absolutePath = this.resolvePath(filePath);
    
    // Check cache first
    const cached = this.metadataCache.get(absolutePath);
    if (cached) {
      return cached;
    }
    
    try {
      const stats = await stat(absolutePath);
      const fileType = await this.getFileType(absolutePath);
      
      const metadata: FileMetadata = {
        path: absolutePath,
        name: basename(absolutePath),
        ext: extname(absolutePath),
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        fileType,
        lineCount: fileType === FileType.CODE || fileType === FileType.TEXT ? 
          await this.countLines(absolutePath) : undefined
      };
      
      // Cache metadata
      this.metadataCache.set(absolutePath, metadata);
      
      return metadata;
    } catch (error) {
      logger.error(`Failed to get metadata for file: ${absolutePath}`, error);
      throw error;
    }
  }
  
  /**
   * Check if file extension is binary
   */
  private isBinaryExtension(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const binaryExtensions = [
      '.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', 
      '.gif', '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
      '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac'
    ];
    
    return binaryExtensions.includes(ext);
  }
  
  /**
   * Count lines in a text file
   */
  private async countLines(filePath: string): Promise<number> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return content.split('\n').length;
    } catch (error) {
      logger.error(`Failed to count lines in file: ${filePath}`, error);
      return 0;
    }
  }
  
  /**
   * Traverse directory recursively
   */
  private async traverseDirectory(
    dirPath: string, 
    options: FileSearchOptions,
    currentDepth: number = 0
  ): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    
    if (options.maxDepth && currentDepth >= options.maxDepth) {
      return results;
    }
    
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        // Check exclusion patterns
        if (this.shouldExclude(fullPath, options.exclude || this.options.defaultExclusions)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          if (options.followSymlinks || !entry.isSymbolicLink()) {
            const subResults = await this.traverseDirectory(fullPath, options, currentDepth + 1);
            results.push(...subResults);
          }
        } else if (entry.isFile()) {
          try {
            const metadata = await this.getFileMetadata(fullPath);
            
            // Apply filters
            if (this.matchesSearchCriteria(metadata, options)) {
              results.push(metadata);
              
              // Check max files limit
              if (options.maxFiles && results.length >= options.maxFiles) {
                break;
              }
            }
          } catch (error) {
            logger.error(`Failed to process file: ${fullPath}`, error);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to traverse directory: ${dirPath}`, error);
    }
    
    return results;
  }
  
  /**
   * Check if path should be excluded
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => minimatch(filePath, pattern));
  }
  
  /**
   * Check if file metadata matches search criteria
   */
  private matchesSearchCriteria(metadata: FileMetadata, options: FileSearchOptions): boolean {
    // Check file types
    if (options.fileTypes && !options.fileTypes.includes(metadata.fileType)) {
      return false;
    }
    
    // Check file size
    if (options.maxFileSize && metadata.size > options.maxFileSize) {
      return false;
    }
    
    // Check include patterns
    if (options.include) {
      const matches = options.include.some(pattern => minimatch(metadata.path, pattern));
      if (!matches) {
        return false;
      }
    }
    
    return true;
  }
}