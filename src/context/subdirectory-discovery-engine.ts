/**
 * Subdirectory Discovery Engine
 * 
 * Implements downward subdirectory traversal for context discovery, based on Gemini CLI analysis.
 * Provides comprehensive subdirectory scanning with configurable depth limits, git-aware filtering,
 * and performance optimizations.
 * 
 * Key Features:
 * - Downward directory traversal (missing in VibeX)
 * - Configurable depth limits
 * - Enhanced Git-aware file filtering with advanced pattern matching
 * - Context file discovery (VIBEX.md, README.md, etc.)
 * - Performance optimizations (parallel scanning, caching)
 * - Security constraints (path validation, symlink handling)
 * - File relevance scoring for intelligent selection
 * - Binary file detection and exclusion
 */

import { EventEmitter } from 'events';
import { readdir, stat, readFile, access } from 'fs/promises';
import { join, relative, resolve, parse, basename } from 'path';
import { logger } from '../utils/logger.js';
import { GitAwareFileFilter, GitAwareFilterConfig, FileFilterResult, createGitAwareFileFilter } from './git-aware-file-filter.js';

/**
 * Subdirectory discovery configuration
 */
export interface SubdirectoryDiscoveryConfig {
  /**
   * Maximum depth for subdirectory traversal
   */
  maxDepth?: number;
  
  /**
   * Context filenames to search for
   */
  contextFilenames?: string[];
  
  /**
   * Whether to respect .gitignore files
   */
  respectGitignore?: boolean;
  
  /**
   * Whether to follow symbolic links
   */
  followSymlinks?: boolean;
  
  /**
   * Maximum number of files to process
   */
  maxFiles?: number;
  
  /**
   * File size limit (bytes)
   */
  maxFileSize?: number;
  
  /**
   * Patterns to exclude (glob patterns)
   */
  excludePatterns?: string[];
  
  /**
   * Patterns to include (glob patterns)
   */
  includePatterns?: string[];
  
  /**
   * Whether to enable parallel processing
   */
  enableParallel?: boolean;
  
  /**
   * Cache TTL for directory scans (ms)
   */
  cacheTTL?: number;
  
  /**
   * Enhanced git-aware filtering configuration
   */
  gitAwareFilterConfig?: Partial<GitAwareFilterConfig>;
  
  /**
   * Whether to enable advanced file relevance scoring
   */
  enableRelevanceScoring?: boolean;
  
  /**
   * Minimum relevance score for file inclusion
   */
  minRelevanceScore?: number;
}

/**
 * Discovered file entry
 */
export interface DiscoveredFile {
  /**
   * Absolute file path
   */
  path: string;
  
  /**
   * Relative path from discovery root
   */
  relativePath: string;
  
  /**
   * File content
   */
  content: string;
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * File modification time
   */
  modifiedTime: number;
  
  /**
   * Directory depth from root
   */
  depth: number;
  
  /**
   * File type/category
   */
  type: DiscoveredFileType;
  
  /**
   * Whether this file was found via gitignore patterns
   */
  gitignoreMatch?: boolean;
  
  /**
   * File relevance score
   */
  relevanceScore: number;
  
  /**
   * Whether this file is binary
   */
  isBinary: boolean;
  
  /**
   * File type category
   */
  fileTypeCategory: string;
}

/**
 * Discovered file types
 */
export enum DiscoveredFileType {
  CONTEXT = 'context',        // VIBEX.md, README.md, etc.
  DOCUMENTATION = 'documentation', // .md files
  CONFIGURATION = 'configuration', // package.json, tsconfig.json, etc.
  SOURCE_CODE = 'source_code',     // .ts, .js, .py, etc.
  TEMPLATE = 'template',           // .template, .example files
  OTHER = 'other'
}

/**
 * Discovery result
 */
export interface SubdirectoryDiscoveryResult {
  /**
   * Root directory that was scanned
   */
  root: string;
  
  /**
   * Discovered files
   */
  files: DiscoveredFile[];
  
  /**
   * Directories that were scanned
   */
  scannedDirectories: string[];
  
  /**
   * Directories that were skipped (gitignore, depth, etc.)
   */
  skippedDirectories: string[];
  
  /**
   * Discovery statistics
   */
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    scanTime: number;
    cacheHits: number;
    maxDepthReached: number;
  };
  
  /**
   * Gitignore patterns that were applied
   */
  gitignorePatterns: string[];
  
  /**
   * Errors encountered during discovery
   */
  errors: DiscoveryError[];
}

/**
 * Discovery error
 */
export interface DiscoveryError {
  path: string;
  error: string;
  type: 'permission' | 'size' | 'encoding' | 'symlink' | 'other' | 'processing';
}

/**
 * Discovery events
 */
export enum DiscoveryEvent {
  STARTED = 'discovery:started',
  DIRECTORY_ENTERED = 'discovery:directory_entered',
  FILE_DISCOVERED = 'discovery:file_discovered',
  DIRECTORY_SKIPPED = 'discovery:directory_skipped',
  ERROR = 'discovery:error',
  COMPLETED = 'discovery:completed',
  CACHE_HIT = 'discovery:cache_hit',
  GITIGNORE_LOADED = 'discovery:gitignore_loaded',
  FILE_FILTERED = 'discovery:file_filtered'
}

/**
 * Gitignore parser result
 */
interface GitignorePatterns {
  patterns: string[];
  regexes: RegExp[];
}

/**
 * Directory cache entry
 */
interface DirectoryCacheEntry {
  result: SubdirectoryDiscoveryResult;
  timestamp: number;
  configHash: string;
}

/**
 * Subdirectory Discovery Engine
 */
export class SubdirectoryDiscoveryEngine extends EventEmitter {
  private readonly config: Required<SubdirectoryDiscoveryConfig>;
  private readonly cache: Map<string, DirectoryCacheEntry> = new Map();
  private gitignoreCache: Map<string, GitignorePatterns> = new Map();
  private readonly gitAwareFilter: GitAwareFileFilter;
  
  constructor(config: Partial<SubdirectoryDiscoveryConfig> = {}) {
    super();
    
    this.config = {
      maxDepth: 5,
      contextFilenames: ['VIBEX.md', 'README.md', 'CONTEXT.md', '.vibex.md'],
      respectGitignore: true,
      followSymlinks: false,
      maxFiles: 1000,
      maxFileSize: 1024 * 1024, // 1MB
      excludePatterns: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.log',
        '*.tmp',
        '.DS_Store'
      ],
      includePatterns: [],
      enableParallel: true,
      cacheTTL: 60000, // 1 minute
      gitAwareFilterConfig: {},
      enableRelevanceScoring: true,
      minRelevanceScore: 10,
      ...config
    };
    
    // Initialize enhanced git-aware file filter
    this.gitAwareFilter = createGitAwareFileFilter({
      respectGitignore: this.config.respectGitignore,
      excludeBinaryFiles: true,
      enableRelevanceScoring: this.config.enableRelevanceScoring,
      maxFileSize: this.config.maxFileSize,
      minRelevanceScore: this.config.minRelevanceScore,
      customIgnorePatterns: this.config.excludePatterns,
      enableAdvancedBinaryDetection: true,
      enableNegationPatterns: true,
      ...this.config.gitAwareFilterConfig
    });
  }
  
  /**
   * Discover subdirectories and context files
   */
  public async discover(rootPath: string): Promise<SubdirectoryDiscoveryResult> {
    const startTime = Date.now();
    const absoluteRoot = resolve(rootPath);
    
    try {
      this.emit(DiscoveryEvent.STARTED, { root: absoluteRoot });
      
      // Check cache
      const cacheKey = this.generateCacheKey(absoluteRoot);
      const cached = this.cache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        this.emit(DiscoveryEvent.CACHE_HIT, { root: absoluteRoot });
        return cached.result;
      }
      
      // Initialize result
      const result: SubdirectoryDiscoveryResult = {
        root: absoluteRoot,
        files: [],
        scannedDirectories: [],
        skippedDirectories: [],
        stats: {
          totalFiles: 0,
          totalDirectories: 0,
          totalSize: 0,
          scanTime: 0,
          cacheHits: 0,
          maxDepthReached: 0
        },
        gitignorePatterns: [],
        errors: []
      };
      
      // Load gitignore patterns
      if (this.config.respectGitignore) {
        await this.loadGitignorePatterns(absoluteRoot, result);
      }
      
      // Start recursive discovery
      await this.discoverRecursive(absoluteRoot, absoluteRoot, 0, result);
      
      // Update statistics
      result.stats.scanTime = Date.now() - startTime;
      result.stats.totalFiles = result.files.length;
      result.stats.totalDirectories = result.scannedDirectories.length;
      result.stats.totalSize = result.files.reduce((sum, file) => sum + file.size, 0);
      
      // Cache result
      this.cacheResult(cacheKey, result);
      
      this.emit(DiscoveryEvent.COMPLETED, {
        root: absoluteRoot,
        files: result.files.length,
        directories: result.scannedDirectories.length,
        time: result.stats.scanTime
      });
      
      return result;
      
    } catch (error) {
      logger.error('Error during subdirectory discovery', error);
      throw error;
    }
  }
  
  /**
   * Recursive directory discovery
   */
  private async discoverRecursive(
    currentPath: string,
    rootPath: string,
    depth: number,
    result: SubdirectoryDiscoveryResult
  ): Promise<void> {
    // Check depth limit
    if (depth > this.config.maxDepth) {
      result.skippedDirectories.push(currentPath);
      return;
    }
    
    // Update max depth reached
    result.stats.maxDepthReached = Math.max(result.stats.maxDepthReached, depth);
    
    try {
      // Check if directory should be skipped
      if (await this.shouldSkipDirectory(currentPath, rootPath, result)) {
        result.skippedDirectories.push(currentPath);
        return;
      }
      
      this.emit(DiscoveryEvent.DIRECTORY_ENTERED, { path: currentPath, depth });
      result.scannedDirectories.push(currentPath);
      
      // Read directory contents
      const entries = await readdir(currentPath, { withFileTypes: true });
      
      // Process files and directories
      const filePromises: Promise<void>[] = [];
      const dirPromises: Promise<void>[] = [];
      
      for (const entry of entries) {
        const entryPath = join(currentPath, entry.name);
        
        if (entry.isFile()) {
          const processFile = async () => {
            try {
              await this.processFile(entryPath, rootPath, depth, result);
            } catch (error) {
              result.errors.push({
                path: entryPath,
                error: error instanceof Error ? error.message : String(error),
                type: 'other'
              });
            }
          };
          
          if (this.config.enableParallel) {
            filePromises.push(processFile());
          } else {
            await processFile();
          }
          
        } else if (entry.isDirectory()) {
          const processDir = async () => {
            await this.discoverRecursive(entryPath, rootPath, depth + 1, result);
          };
          
          if (this.config.enableParallel) {
            dirPromises.push(processDir());
          } else {
            await processDir();
          }
          
        } else if (entry.isSymbolicLink() && this.config.followSymlinks) {
          // Handle symbolic links carefully
          try {
            const stats = await stat(entryPath);
            if (stats.isDirectory()) {
              await this.discoverRecursive(entryPath, rootPath, depth + 1, result);
            } else if (stats.isFile()) {
              await this.processFile(entryPath, rootPath, depth, result);
            }
          } catch (error) {
            result.errors.push({
              path: entryPath,
              error: 'Broken symlink',
              type: 'symlink'
            });
          }
        }
      }
      
      // Wait for parallel operations
      if (this.config.enableParallel) {
        await Promise.all([...filePromises, ...dirPromises]);
      }
      
    } catch (error) {
      result.errors.push({
        path: currentPath,
        error: error instanceof Error ? error.message : String(error),
        type: 'permission'
      });
    }
  }
  
  /**
   * Process a discovered file with enhanced filtering
   */
  private async processFile(
    filePath: string,
    rootPath: string,
    depth: number,
    result: SubdirectoryDiscoveryResult
  ): Promise<void> {
    // Check file limits
    if (result.files.length >= this.config.maxFiles) {
      return;
    }
    
    try {
      // Use enhanced git-aware filtering
      const filterResult = await this.gitAwareFilter.filterSingleFile(filePath, rootPath);
      
      // Skip file if not included by filter
      if (!filterResult.include) {
        this.emit(DiscoveryEvent.FILE_FILTERED, {
          path: filePath,
          reason: filterResult.reason,
          relevanceScore: filterResult.relevanceScore
        });
        return;
      }
      
      // Read file content if it passed filtering
      const content = await readFile(filePath, 'utf-8');
      
      // Create discovered file entry with enhanced metadata
      const discoveredFile: DiscoveredFile = {
        path: filePath,
        relativePath: relative(rootPath, filePath),
        content,
        size: filterResult.metadata.size || 0,
        modifiedTime: filterResult.metadata.modifiedTime || Date.now(),
        depth,
        type: this.mapFileTypeCategory(filterResult.fileType),
        gitignoreMatch: filterResult.gitignoreMatch,
        relevanceScore: filterResult.relevanceScore,
        isBinary: filterResult.isBinary,
        fileTypeCategory: filterResult.fileType
      };
      
      result.files.push(discoveredFile);
      
      this.emit(DiscoveryEvent.FILE_DISCOVERED, {
        path: filePath,
        type: discoveredFile.type,
        size: discoveredFile.size,
        relevanceScore: discoveredFile.relevanceScore
      });
      
    } catch (error) {
      result.errors.push({
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
        type: 'processing'
      });
    }
  }
  
  /**
   * Map GitAware FileTypeCategory to DiscoveredFileType
   */
  private mapFileTypeCategory(category: any): DiscoveredFileType {
    switch (category) {
      case 'context': return DiscoveredFileType.CONTEXT;
      case 'source_code': return DiscoveredFileType.SOURCE_CODE;
      case 'configuration': return DiscoveredFileType.CONFIGURATION;
      case 'documentation': return DiscoveredFileType.DOCUMENTATION;
      default: return DiscoveredFileType.OTHER;
    }
  }
  
  /**
   * Check if directory should be skipped (enhanced version)
   */
  private async shouldSkipDirectory(
    dirPath: string,
    rootPath: string,
    result: SubdirectoryDiscoveryResult
  ): Promise<boolean> {
    const relativePath = relative(rootPath, dirPath);
    
    // Use git-aware filter for directory filtering
    try {
      const filterResult = await this.gitAwareFilter.filterSingleFile(dirPath, rootPath);
      return !filterResult.include;
    } catch {
      // Fallback to original logic if filtering fails
      return this.matchesPatterns(relativePath, this.config.excludePatterns);
    }
  }
  
  /**
   * Enhanced file inclusion check
   */
  private async shouldIncludeFile(
    filePath: string,
    rootPath: string,
    result: SubdirectoryDiscoveryResult
  ): Promise<boolean> {
    const filename = basename(filePath);
    const relativePath = relative(rootPath, filePath);
    
    // Always include context files
    if (this.config.contextFilenames.includes(filename)) {
      return true;
    }
    
    // Use enhanced git-aware filtering
    try {
      const filterResult = await this.gitAwareFilter.filterSingleFile(filePath, rootPath);
      return filterResult.include;
    } catch {
      // Fallback to original logic if filtering fails
      return this.originalShouldIncludeFile(filePath, rootPath, result);
    }
  }
  
  /**
   * Original file inclusion logic (fallback)
   */
  private async originalShouldIncludeFile(
    filePath: string,
    rootPath: string,
    result: SubdirectoryDiscoveryResult
  ): Promise<boolean> {
    const filename = basename(filePath);
    const relativePath = relative(rootPath, filePath);
    
    // Check include patterns
    if (this.config.includePatterns.length > 0) {
      if (!this.matchesPatterns(relativePath, this.config.includePatterns)) {
        return false;
      }
    }
    
    // Check exclude patterns
    if (this.matchesPatterns(relativePath, this.config.excludePatterns)) {
      return false;
    }
    
    // Check gitignore patterns (legacy)
    if (this.config.respectGitignore && this.isGitignoreMatch(filePath, rootPath, result)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Load gitignore patterns
   */
  private async loadGitignorePatterns(
    rootPath: string,
    result: SubdirectoryDiscoveryResult
  ): Promise<void> {
    const gitignorePath = join(rootPath, '.gitignore');
    
    try {
      await access(gitignorePath);
      const content = await readFile(gitignorePath, 'utf-8');
      const patterns = this.parseGitignore(content);
      
      result.gitignorePatterns = patterns.patterns;
      this.gitignoreCache.set(rootPath, patterns);
      
      this.emit(DiscoveryEvent.GITIGNORE_LOADED, {
        path: gitignorePath,
        patterns: patterns.patterns.length
      });
      
    } catch (error) {
      // No .gitignore file or can't read it
      logger.debug('No .gitignore file found or cannot read', { path: gitignorePath });
    }
  }
  
  /**
   * Parse gitignore content
   */
  private parseGitignore(content: string): GitignorePatterns {
    const patterns: string[] = [];
    const regexes: RegExp[] = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      patterns.push(trimmed);
      
      try {
        // Convert gitignore pattern to regex
        const regex = this.gitignorePatternToRegex(trimmed);
        regexes.push(regex);
      } catch (error) {
        logger.warn('Invalid gitignore pattern', { pattern: trimmed, error });
      }
    }
    
    return { patterns, regexes };
  }
  
  /**
   * Convert gitignore pattern to regex
   */
  private gitignorePatternToRegex(pattern: string): RegExp {
    // Escape special regex characters except * and ?
    let regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    // Handle directory patterns
    if (pattern.endsWith('/')) {
      regex = regex.slice(0, -2) + '($|/)';
    }
    
    // Handle negation
    if (pattern.startsWith('!')) {
      // TODO: Implement negation properly
      regex = regex.slice(1);
    }
    
    return new RegExp('^' + regex + '$');
  }
  
  /**
   * Check if path matches gitignore patterns
   */
  private isGitignoreMatch(
    filePath: string,
    rootPath: string,
    result: SubdirectoryDiscoveryResult
  ): boolean {
    const patterns = this.gitignoreCache.get(rootPath);
    if (!patterns) {
      return false;
    }
    
    const relativePath = relative(rootPath, filePath);
    
    for (const regex of patterns.regexes) {
      if (regex.test(relativePath)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if path matches patterns
   */
  private matchesPatterns(path: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchesPattern(path, pattern)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check if path matches a single pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob matching
    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp('^' + regex + '$').test(path);
  }
  
  /**
   * Generate cache key
   */
  private generateCacheKey(rootPath: string): string {
    const configHash = JSON.stringify(this.config);
    return `${rootPath}:${configHash}`;
  }
  
  /**
   * Check if cache entry is valid
   */
  private isCacheValid(entry: DirectoryCacheEntry): boolean {
    return Date.now() - entry.timestamp < this.config.cacheTTL;
  }
  
  /**
   * Cache discovery result
   */
  private cacheResult(key: string, result: SubdirectoryDiscoveryResult): void {
    const configHash = JSON.stringify(this.config);
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      configHash
    });
  }
  
  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.gitignoreCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    entries: number;
    gitignoreEntries: number;
    memoryUsage: number;
  } {
    const entries = this.cache.size;
    const gitignoreEntries = this.gitignoreCache.size;
    
    // Estimate memory usage
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      memoryUsage += JSON.stringify(entry).length;
    }
    
    return {
      entries,
      gitignoreEntries,
      memoryUsage
    };
  }
}

/**
 * Create subdirectory discovery engine
 */
export function createSubdirectoryDiscoveryEngine(
  config?: Partial<SubdirectoryDiscoveryConfig>
): SubdirectoryDiscoveryEngine {
  return new SubdirectoryDiscoveryEngine(config);
}

/**
 * Default configuration for common use cases
 */
export const DEFAULT_CONFIGS = {
  /**
   * Fast discovery with minimal depth
   */
  FAST: {
    maxDepth: 2,
    maxFiles: 100,
    enableParallel: true,
    cacheTTL: 30000
  } as Partial<SubdirectoryDiscoveryConfig>,
  
  /**
   * Comprehensive discovery
   */
  COMPREHENSIVE: {
    maxDepth: 8,
    maxFiles: 2000,
    enableParallel: true,
    followSymlinks: true,
    cacheTTL: 120000
  } as Partial<SubdirectoryDiscoveryConfig>,
  
  /**
   * Context-focused discovery
   */
  CONTEXT_ONLY: {
    maxDepth: 10,
    maxFiles: 500,
    includePatterns: ['*.md', 'VIBEX.md', 'README.md', 'CONTEXT.md'],
    enableParallel: true
  } as Partial<SubdirectoryDiscoveryConfig>
}; 