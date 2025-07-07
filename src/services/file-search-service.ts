/**
 * File Search Service
 * 
 * Single Responsibility: Handle file system navigation and searching
 * Following Gemini CLI's clean architecture patterns
 */

import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { minimatch } from 'minimatch';
import { logger } from '../utils/logger.js';

export interface FileSearchConfig {
  maxDepth?: number;
  maxFiles?: number;
  maxFileSize?: number;
  followSymlinks?: boolean;
  defaultExclusions?: string[];
}

export interface FileSearchOptions {
  include?: string[];
  exclude?: string[];
  maxDepth?: number;
  maxFileSize?: number;
  maxFiles?: number;
  fileTypes?: FileType[];
  followSymlinks?: boolean;
}

export enum FileType {
  CODE = 'code',
  CONFIG = 'config',
  DOCUMENTATION = 'documentation',
  IMAGE = 'image',
  BINARY = 'binary',
  TEXT = 'text',
  UNKNOWN = 'unknown',
}

export interface FileMetadata {
  path: string;
  name: string;
  ext: string;
  size: number;
  modified: Date;
  created: Date;
  fileType: FileType;
  isDirectory: boolean;
  isSymlink: boolean;
}

export interface FileSearchResult {
  success: boolean;
  files?: FileMetadata[];
  error?: string;
  stats: {
    filesScanned: number;
    directoriesScanned: number;
    filesMatched: number;
    maxDepthReached: boolean;
    maxFilesReached: boolean;
    duration: number;
  };
}

/**
 * File Search Service - Clean Architecture
 * Focus: File system navigation and searching only
 */
export class FileSearchService {
  private config: Required<FileSearchConfig>;
  private fileTypeMap: Map<string, FileType> = new Map();

  constructor(config: FileSearchConfig = {}) {
    this.config = {
      maxDepth: config.maxDepth || 10,
      maxFiles: config.maxFiles || 1000,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      followSymlinks: config.followSymlinks ?? false,
      defaultExclusions: config.defaultExclusions || [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.log',
        '.DS_Store',
        'Thumbs.db'
      ]
    };

    this.initializeFileTypeMappings();
  }

  /**
   * Find files matching search criteria
   */
  async findFiles(rootDir: string, options: FileSearchOptions = {}): Promise<FileSearchResult> {
    const startTime = Date.now();
    const stats = {
      filesScanned: 0,
      directoriesScanned: 0,
      filesMatched: 0,
      maxDepthReached: false,
      maxFilesReached: false,
      duration: 0
    };

    try {
      const searchOptions: Required<FileSearchOptions> = {
        include: options.include || [],
        exclude: [...(options.exclude || []), ...this.config.defaultExclusions],
        maxDepth: options.maxDepth || this.config.maxDepth,
        maxFileSize: options.maxFileSize || this.config.maxFileSize,
        maxFiles: options.maxFiles || this.config.maxFiles,
        fileTypes: options.fileTypes || [],
        followSymlinks: options.followSymlinks ?? this.config.followSymlinks
      };

      const files = await this.traverseDirectory(
        rootDir, 
        searchOptions, 
        0, 
        stats
      );

      stats.duration = Date.now() - startTime;

      logger.debug(`File search completed`, {
        rootDir,
        filesFound: files.length,
        stats
      });

      return {
        success: true,
        files,
        stats
      };
    } catch (error) {
      stats.duration = Date.now() - startTime;
      
      logger.error(`File search failed for ${rootDir}`, error);
      
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats
      };
    }
  }

  /**
   * Find files by pattern (glob)
   */
  async findByPattern(rootDir: string, pattern: string, options: Omit<FileSearchOptions, 'include'> = {}): Promise<FileSearchResult> {
    return await this.findFiles(rootDir, {
      ...options,
      include: [pattern]
    });
  }

  /**
   * Find files by extension
   */
  async findByExtension(rootDir: string, extensions: string[], options: Omit<FileSearchOptions, 'include'> = {}): Promise<FileSearchResult> {
    const patterns = extensions.map(ext => 
      ext.startsWith('.') ? `**/*${ext}` : `**/*.${ext}`
    );

    return await this.findFiles(rootDir, {
      ...options,
      include: patterns
    });
  }

  /**
   * Find files by type
   */
  async findByType(rootDir: string, fileTypes: FileType[], options: Omit<FileSearchOptions, 'fileTypes'> = {}): Promise<FileSearchResult> {
    return await this.findFiles(rootDir, {
      ...options,
      fileTypes
    });
  }

  /**
   * Get directory contents (non-recursive)
   */
  async getDirectoryContents(dirPath: string): Promise<FileSearchResult> {
    const startTime = Date.now();
    const stats = {
      filesScanned: 0,
      directoriesScanned: 1,
      filesMatched: 0,
      maxDepthReached: false,
      maxFilesReached: false,
      duration: 0
    };

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      const files: FileMetadata[] = [];

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        try {
          const metadata = await this.getFileMetadata(fullPath, entry.isDirectory(), entry.isSymbolicLink());
          files.push(metadata);
          
          if (entry.isFile()) {
            stats.filesScanned++;
          }
          
          stats.filesMatched++;
        } catch (error) {
          logger.warn(`Failed to get metadata for ${fullPath}`, error);
        }
      }

      stats.duration = Date.now() - startTime;

      return {
        success: true,
        files,
        stats
      };
    } catch (error) {
      stats.duration = Date.now() - startTime;
      
      logger.error(`Failed to read directory: ${dirPath}`, error);
      
      return {
        success: false,
        error: `Directory read failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats
      };
    }
  }

  /**
   * Check if path matches exclusion patterns
   */
  shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => minimatch(filePath, pattern));
  }

  /**
   * Check if file matches search criteria
   */
  matchesSearchCriteria(metadata: FileMetadata, options: FileSearchOptions): boolean {
    // Check file types
    if (options.fileTypes && options.fileTypes.length > 0) {
      if (!options.fileTypes.includes(metadata.fileType)) {
        return false;
      }
    }

    // Check file size
    if (options.maxFileSize && metadata.size > options.maxFileSize) {
      return false;
    }

    // Check include patterns
    if (options.include && options.include.length > 0) {
      const matches = options.include.some(pattern => minimatch(metadata.path, pattern));
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get file type statistics for a directory
   */
  async getFileTypeStats(rootDir: string, options: FileSearchOptions = {}): Promise<Map<FileType, number>> {
    const result = await this.findFiles(rootDir, options);
    const stats = new Map<FileType, number>();

    if (result.success && result.files) {
      for (const file of result.files) {
        if (!file.isDirectory) {
          const count = stats.get(file.fileType) || 0;
          stats.set(file.fileType, count + 1);
        }
      }
    }

    return stats;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<FileSearchConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): FileSearchConfig {
    return { ...this.config };
  }

  /**
   * Traverse directory recursively
   */
  private async traverseDirectory(
    dirPath: string,
    options: Required<FileSearchOptions>,
    currentDepth: number,
    stats: FileSearchResult['stats']
  ): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];

    // Check depth limit
    if (currentDepth >= options.maxDepth) {
      stats.maxDepthReached = true;
      return results;
    }

    // Check file limit
    if (stats.filesMatched >= options.maxFiles) {
      stats.maxFilesReached = true;
      return results;
    }

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      stats.directoriesScanned++;

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Check exclusion patterns
        if (this.shouldExclude(fullPath, options.exclude)) {
          continue;
        }

        try {
          if (entry.isDirectory()) {
            // Recurse into subdirectory
            if (options.followSymlinks || !entry.isSymbolicLink()) {
              const subResults = await this.traverseDirectory(
                fullPath,
                options,
                currentDepth + 1,
                stats
              );
              results.push(...subResults);
            }
          } else if (entry.isFile()) {
            stats.filesScanned++;
            
            const metadata = await this.getFileMetadata(fullPath, false, entry.isSymbolicLink());

            // Apply filters
            if (this.matchesSearchCriteria(metadata, options)) {
              results.push(metadata);
              stats.filesMatched++;

              // Check max files limit
              if (stats.filesMatched >= options.maxFiles) {
                stats.maxFilesReached = true;
                break;
              }
            }
          }
        } catch (error) {
          logger.warn(`Failed to process: ${fullPath}`, error);
        }
      }
    } catch (error) {
      logger.error(`Failed to traverse directory: ${dirPath}`, error);
    }

    return results;
  }

  /**
   * Get file metadata
   */
  private async getFileMetadata(filePath: string, isDirectory: boolean, isSymlink: boolean): Promise<FileMetadata> {
    const stats = await stat(filePath);
    const ext = extname(filePath);
    const name = basename(filePath);
    const fileType = isDirectory ? FileType.UNKNOWN : this.getFileType(ext);

    return {
      path: filePath,
      name,
      ext,
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      fileType,
      isDirectory,
      isSymlink
    };
  }

  /**
   * Determine file type from extension
   */
  private getFileType(extension: string): FileType {
    const ext = extension.toLowerCase();
    return this.fileTypeMap.get(ext) || FileType.UNKNOWN;
  }

  /**
   * Initialize file type mappings
   */
  private initializeFileTypeMappings(): void {
    // Code files
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj',
      '.hs', '.ml', '.fs', '.vb', '.pl', '.r', '.m', '.mm', '.dart', '.lua'
    ];
    codeExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.CODE));

    // Config files
    const configExtensions = [
      '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.config',
      '.env', '.properties', '.plist', '.xml'
    ];
    configExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.CONFIG));

    // Documentation
    const docExtensions = [
      '.md', '.txt', '.rst', '.adoc', '.tex', '.rtf', '.doc', '.docx', '.pdf'
    ];
    docExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.DOCUMENTATION));

    // Images
    const imageExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp', '.tiff'
    ];
    imageExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.IMAGE));

    // Binary files
    const binaryExtensions = [
      '.exe', '.dll', '.so', '.dylib', '.bin', '.zip', '.tar', '.gz', '.rar',
      '.7z', '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac', '.woff', '.ttf'
    ];
    binaryExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.BINARY));

    // Text files (catch-all for known text formats)
    const textExtensions = [
      '.log', '.csv', '.tsv', '.sql', '.sh', '.bat', '.ps1', '.vim'
    ];
    textExtensions.forEach(ext => this.fileTypeMap.set(ext, FileType.TEXT));
  }
}

// Factory function for creating file search service
export function createFileSearchService(config?: FileSearchConfig): FileSearchService {
  return new FileSearchService(config);
} 