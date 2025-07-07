/**
 * File Manager Orchestrator
 * 
 * Clean orchestrator that coordinates all file management services
 * Following Gemini CLI's clean architecture patterns
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

// Service imports
import { FileIOService, createFileIOService, type FileIOConfig, type FileContent, type FileStats } from './file-io-service.js';
import { FileSearchService, createFileSearchService, type FileSearchConfig, type FileSearchOptions, type FileMetadata, type FileType } from './file-search-service.js';
import { FileTextSearchService, createFileTextSearchService, type TextSearchConfig, type TextSearchOptions, type TextSearchResponse } from './file-text-search-service.js';
import { FileModificationService, createFileModificationService, type FileModificationConfig, type LineModification, type ModificationResult } from './file-modification-service.js';
import { FileCacheService, createFileCacheService, type FileCacheConfig, type CacheStats } from './file-cache-service.js';
import { FileWatcherService, createFileWatcherService, type FileWatcherConfig, type FileChangeEvent, FileChangeType } from './file-watcher-service.js';

export interface FileManagerConfig {
  rootDir?: string;
  fileIO?: FileIOConfig;
  search?: FileSearchConfig;
  textSearch?: TextSearchConfig;
  modification?: FileModificationConfig;
  cache?: FileCacheConfig;
  watcher?: FileWatcherConfig;
}

export interface BatchOperation {
  type: 'read' | 'write' | 'modify' | 'delete' | 'move' | 'copy';
  source: string;
  target?: string;
  content?: string;
  modifications?: LineModification[];
}

export interface BatchResult {
  success: boolean;
  operation: BatchOperation;
  error?: string;
  content?: string;
  metadata?: FileStats;
}

/**
 * File Manager Orchestrator - Clean Architecture
 * Coordinates all file management services without business logic
 */
export class FileManagerOrchestrator extends EventEmitter {
  private rootDir: string;
  private fileIOService: FileIOService;
  private fileSearchService: FileSearchService;
  private fileTextSearchService: FileTextSearchService;
  private fileModificationService: FileModificationService;
  private fileCacheService: FileCacheService;
  private fileWatcherService: FileWatcherService;

  constructor(config: FileManagerConfig = {}) {
    super();
    
    this.rootDir = config.rootDir || process.cwd();
    
    // Initialize services
    this.fileIOService = createFileIOService(config.fileIO);
    this.fileSearchService = createFileSearchService(config.search);
    this.fileCacheService = createFileCacheService(config.cache);
    this.fileModificationService = createFileModificationService(this.fileIOService, config.modification);
    this.fileTextSearchService = createFileTextSearchService(
      this.fileIOService,
      this.fileSearchService,
      config.textSearch
    );
    this.fileWatcherService = createFileWatcherService(config.watcher);

    // Set up event forwarding
    this.setupEventForwarding();

    logger.debug('File manager orchestrator initialized', {
      rootDir: this.rootDir
    });
  }

  // ===== FILE I/O OPERATIONS =====

  /**
   * Read file content with caching
   */
  async readFile(filePath: string, encoding?: string): Promise<FileContent & { cached?: boolean }> {
    const absolutePath = this.resolvePath(filePath);
    
    // Check cache first
    const cacheResult = this.fileCacheService.get(absolutePath);
    if (cacheResult.hit && cacheResult.data) {
      const statsResult = await this.fileIOService.getFileStats(absolutePath);
      
      return {
        content: cacheResult.data,
        encoding: encoding || 'utf-8',
        binary: false,
        size: statsResult.data?.size || 0,
        cached: true
      } as FileContent & { cached: boolean };
    }

    // Read from disk
    const result = await this.fileIOService.readFile(absolutePath, encoding);
    
    if (result.success && result.data && !result.data.binary) {
      // Cache the content
      this.fileCacheService.set(absolutePath, result.data.content);
    }

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to read file');
    }

    return {
      ...result.data,
      cached: false
    };
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string, encoding?: string): Promise<FileStats> {
    const absolutePath = this.resolvePath(filePath);
    
    const result = await this.fileIOService.writeFile(absolutePath, content, encoding);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to write file');
    }

    // Invalidate cache
    this.fileCacheService.delete(absolutePath);

    return result.data;
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    const absolutePath = this.resolvePath(filePath);
    
    const result = await this.fileIOService.deleteFile(absolutePath);
    
    if (result.success) {
      // Invalidate cache
      this.fileCacheService.delete(absolutePath);
    }

    return result.success;
  }

  /**
   * Move file
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<FileStats> {
    const absoluteSource = this.resolvePath(sourcePath);
    const absoluteTarget = this.resolvePath(targetPath);
    
    const result = await this.fileIOService.moveFile(absoluteSource, absoluteTarget);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to move file');
    }

    // Update cache
    this.fileCacheService.delete(absoluteSource);

    return result.data;
  }

  /**
   * Copy file
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<FileStats> {
    const absoluteSource = this.resolvePath(sourcePath);
    const absoluteTarget = this.resolvePath(targetPath);
    
    const result = await this.fileIOService.copyFile(absoluteSource, absoluteTarget);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to copy file');
    }

    return result.data;
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const absolutePath = this.resolvePath(filePath);
    const result = await this.fileIOService.fileExists(absolutePath);
    return result.data || false;
  }

  /**
   * Get file statistics
   */
  async getFileStats(filePath: string): Promise<FileStats> {
    const absolutePath = this.resolvePath(filePath);
    const result = await this.fileIOService.getFileStats(absolutePath);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get file stats');
    }

    return result.data;
  }

  // ===== FILE SEARCH OPERATIONS =====

  /**
   * Find files matching criteria
   */
  async findFiles(options: FileSearchOptions = {}): Promise<FileMetadata[]> {
    const result = await this.fileSearchService.findFiles(this.rootDir, options);
    
    if (!result.success || !result.files) {
      throw new Error(result.error || 'Failed to find files');
    }

    return result.files;
  }

  /**
   * Find files by pattern
   */
  async findByPattern(pattern: string, options: Omit<FileSearchOptions, 'include'> = {}): Promise<FileMetadata[]> {
    const result = await this.fileSearchService.findByPattern(this.rootDir, pattern, options);
    
    if (!result.success || !result.files) {
      throw new Error(result.error || 'Failed to find files by pattern');
    }

    return result.files;
  }

  /**
   * Find files by extension
   */
  async findByExtension(extensions: string[], options: Omit<FileSearchOptions, 'include'> = {}): Promise<FileMetadata[]> {
    const result = await this.fileSearchService.findByExtension(this.rootDir, extensions, options);
    
    if (!result.success || !result.files) {
      throw new Error(result.error || 'Failed to find files by extension');
    }

    return result.files;
  }

  /**
   * Find files by type
   */
  async findByType(fileTypes: FileType[], options: Omit<FileSearchOptions, 'fileTypes'> = {}): Promise<FileMetadata[]> {
    const result = await this.fileSearchService.findByType(this.rootDir, fileTypes, options);
    
    if (!result.success || !result.files) {
      throw new Error(result.error || 'Failed to find files by type');
    }

    return result.files;
  }

  // ===== TEXT SEARCH OPERATIONS =====

  /**
   * Search for text in files
   */
  async searchText(pattern: string, options: TextSearchOptions = {}): Promise<TextSearchResponse> {
    return await this.fileTextSearchService.searchText(this.rootDir, pattern, options);
  }

  /**
   * Search and replace text in files
   */
  async searchAndReplace(searchPattern: string, replaceText: string, options: TextSearchOptions = {}): Promise<{
    success: boolean;
    filesModified: number;
    totalReplacements: number;
    error?: string;
  }> {
    const result = await this.fileTextSearchService.searchAndReplace(this.rootDir, searchPattern, replaceText, options);
    
    // Invalidate cache for modified files
    if (result.success && result.filesModified > 0) {
      this.fileCacheService.clear(); // Simple approach - clear all cache
    }

    return result;
  }

  // ===== FILE MODIFICATION OPERATIONS =====

  /**
   * Modify file with line operations
   */
  async modifyFile(filePath: string, modifications: LineModification[]): Promise<ModificationResult> {
    const absolutePath = this.resolvePath(filePath);
    const result = await this.fileModificationService.modifyFile(absolutePath, modifications);
    
    if (result.success) {
      // Invalidate cache
      this.fileCacheService.delete(absolutePath);
    }

    return result;
  }

  /**
   * Insert lines at position
   */
  async insertLines(filePath: string, lineNumber: number, lines: string[]): Promise<ModificationResult> {
    const absolutePath = this.resolvePath(filePath);
    const result = await this.fileModificationService.insertLines(absolutePath, lineNumber, lines);
    
    if (result.success) {
      this.fileCacheService.delete(absolutePath);
    }

    return result;
  }

  /**
   * Remove lines from file
   */
  async removeLines(filePath: string, startLine: number, count: number = 1): Promise<ModificationResult> {
    const absolutePath = this.resolvePath(filePath);
    const result = await this.fileModificationService.removeLines(absolutePath, startLine, count);
    
    if (result.success) {
      this.fileCacheService.delete(absolutePath);
    }

    return result;
  }

  /**
   * Replace specific lines
   */
  async replaceLines(filePath: string, replacements: Array<{ line: number; content: string }>): Promise<ModificationResult> {
    const absolutePath = this.resolvePath(filePath);
    const result = await this.fileModificationService.replaceLines(absolutePath, replacements);
    
    if (result.success) {
      this.fileCacheService.delete(absolutePath);
    }

    return result;
  }

  // ===== BATCH OPERATIONS =====

  /**
   * Execute batch operations
   */
  async executeBatch(operations: BatchOperation[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const operation of operations) {
      try {
        let result: BatchResult = {
          success: false,
          operation
        };

        switch (operation.type) {
          case 'read':
            const fileContent = await this.readFile(operation.source);
            result = {
              success: true,
              operation,
              content: fileContent.content
            };
            break;

          case 'write':
            if (!operation.content) {
              throw new Error('Content is required for write operation');
            }
            const stats = await this.writeFile(operation.source, operation.content);
            result = {
              success: true,
              operation,
              metadata: stats
            };
            break;

          case 'modify':
            if (!operation.modifications) {
              throw new Error('Modifications are required for modify operation');
            }
            const modResult = await this.modifyFile(operation.source, operation.modifications);
            result = {
              success: modResult.success,
              operation,
              content: modResult.modifiedContent,
              error: modResult.error
            };
            break;

          case 'delete':
            const deleted = await this.deleteFile(operation.source);
            result = {
              success: deleted,
              operation
            };
            break;

          case 'move':
            if (!operation.target) {
              throw new Error('Target is required for move operation');
            }
            const moveStats = await this.moveFile(operation.source, operation.target);
            result = {
              success: true,
              operation,
              metadata: moveStats
            };
            break;

          case 'copy':
            if (!operation.target) {
              throw new Error('Target is required for copy operation');
            }
            const copyStats = await this.copyFile(operation.source, operation.target);
            result = {
              success: true,
              operation,
              metadata: copyStats
            };
            break;

          default:
            result = {
              success: false,
              operation,
              error: `Unknown operation type: ${(operation as any).type}`
            };
        }

        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          operation,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // ===== FILE WATCHING =====

  /**
   * Start watching directory
   */
  watchDirectory(dirPath: string, recursive?: boolean): boolean {
    const absolutePath = this.resolvePath(dirPath);
    return this.fileWatcherService.watch(absolutePath, recursive);
  }

  /**
   * Stop watching directory
   */
  unwatchDirectory(dirPath: string): boolean {
    const absolutePath = this.resolvePath(dirPath);
    return this.fileWatcherService.unwatch(absolutePath);
  }

  /**
   * Stop watching all directories
   */
  unwatchAll(): void {
    this.fileWatcherService.unwatchAll();
  }

  // ===== CACHE MANAGEMENT =====

  /**
   * Clear file cache
   */
  clearCache(): void {
    this.fileCacheService.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.fileCacheService.getStats();
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate file hash
   */
  async calculateFileHash(filePath: string): Promise<string> {
    const content = await this.readFile(filePath);
    const hash = createHash('sha256');
    hash.update(content.content);
    return hash.digest('hex');
  }

  /**
   * Get root directory
   */
  getRootDir(): string {
    return this.rootDir;
  }

  /**
   * Update root directory
   */
  setRootDir(rootDir: string): void {
    this.rootDir = rootDir;
    logger.debug(`Root directory updated: ${rootDir}`);
  }

  /**
   * Destroy orchestrator and clean up all services
   */
  destroy(): void {
    this.fileWatcherService.destroy();
    this.fileCacheService.destroy();
    this.removeAllListeners();
    
    logger.debug('File manager orchestrator destroyed');
  }

  /**
   * Resolve path relative to root directory
   */
  private resolvePath(filePath: string): string {
    if (require('path').isAbsolute(filePath)) {
      return filePath;
    }
    return require('path').resolve(this.rootDir, filePath);
  }

  /**
   * Set up event forwarding from services
   */
  private setupEventForwarding(): void {
    // Forward file watcher events
    this.fileWatcherService.on('change', (event: FileChangeEvent) => {
      this.emit('fileChange', event);
      
      // Invalidate cache for changed files
      if (event.type === FileChangeType.MODIFIED || event.type === FileChangeType.DELETED) {
        this.fileCacheService.delete(event.path);
      }
    });

    this.fileWatcherService.on('error', (error) => {
      this.emit('watcherError', error);
    });

    this.fileWatcherService.on('watcherAdded', (info) => {
      this.emit('watcherAdded', info);
    });

    this.fileWatcherService.on('watcherRemoved', (info) => {
      this.emit('watcherRemoved', info);
    });
  }
}

// Factory function for creating file manager orchestrator
export function createFileManager(config?: FileManagerConfig): FileManagerOrchestrator {
  return new FileManagerOrchestrator(config);
}

// Export types for convenience
export type {
  FileContent,
  FileStats,
  FileMetadata,
  FileType,
  FileSearchOptions,
  TextSearchOptions,
  TextSearchResponse,
  LineModification,
  ModificationResult,
  CacheStats,
  FileChangeEvent,
  FileChangeType
};