/**
 * Enhanced Git-Aware File Filtering System
 * 
 * Consolidates and enhances git-aware filtering capabilities from SubdirectoryDiscoveryEngine
 * and other components to provide comprehensive intelligent file filtering that:
 * 
 * - Respects .gitignore patterns with advanced pattern matching
 * - Excludes binary files with sophisticated detection
 * - Implements file relevance scoring for intelligent selection
 * - Supports multiple .gitignore files and custom ignore patterns
 * - Provides configurable filtering rules and repository-aware discovery
 * - Integrates seamlessly with full-context mode and context discovery
 */

import { EventEmitter } from 'events';
import { readFile, access, stat } from 'fs/promises';
import { join, relative, resolve, basename, extname, dirname } from 'path';
import { logger } from '../utils/logger.js';
import { isBinaryFile } from '../fs/operations.js';

/**
 * File filtering configuration
 */
export interface GitAwareFilterConfig {
  /**
   * Whether to respect .gitignore files
   */
  respectGitignore?: boolean;
  
  /**
   * Whether to exclude binary files
   */
  excludeBinaryFiles?: boolean;
  
  /**
   * Whether to enable advanced file relevance scoring
   */
  enableRelevanceScoring?: boolean;
  
  /**
   * Custom ignore patterns (glob-style)
   */
  customIgnorePatterns?: string[];
  
  /**
   * Additional .gitignore file names to respect
   */
  additionalIgnoreFiles?: string[];
  
  /**
   * Maximum file size in bytes
   */
  maxFileSize?: number;
  
  /**
   * File extensions to always include (overrides other filters)
   */
  forceIncludeExtensions?: string[];
  
  /**
   * File extensions to always exclude
   */
  forceExcludeExtensions?: string[];
  
  /**
   * Directories to always exclude
   */
  excludeDirectories?: string[];
  
  /**
   * Enable advanced binary detection (content-based)
   */
  enableAdvancedBinaryDetection?: boolean;
  
  /**
   * Minimum relevance score for inclusion (0-1000)
   */
  minRelevanceScore?: number;
  
  /**
   * Enable negation pattern support in .gitignore
   */
  enableNegationPatterns?: boolean;
  
  /**
   * Cache TTL for gitignore patterns (ms)
   */
  gitignoreCacheTTL?: number;
}

/**
 * File filtering result
 */
export interface FileFilterResult {
  /**
   * Whether the file should be included
   */
  include: boolean;
  
  /**
   * Reason for inclusion/exclusion
   */
  reason: string;
  
  /**
   * Relevance score (0-1000)
   */
  relevanceScore: number;
  
  /**
   * Whether file matched gitignore patterns
   */
  gitignoreMatch: boolean;
  
  /**
   * Whether file is binary
   */
  isBinary: boolean;
  
  /**
   * File type category
   */
  fileType: FileTypeCategory;
  
  /**
   * Additional metadata
   */
  metadata: {
    size?: number;
    extension: string;
    pathDepth: number;
    modifiedTime?: number;
    isContextFile: boolean;
    isConfigFile: boolean;
    isDocumentation: boolean;
  };
}

/**
 * File type categories for relevance scoring
 */
export enum FileTypeCategory {
  CONTEXT = 'context',
  SOURCE_CODE = 'source_code',
  CONFIGURATION = 'configuration',
  DOCUMENTATION = 'documentation',
  BUILD_OUTPUT = 'build_output',
  DEPENDENCY = 'dependency',
  MEDIA = 'media',
  BINARY = 'binary',
  TEMPORARY = 'temporary',
  SYSTEM = 'system',
  OTHER = 'other'
}

/**
 * Gitignore pattern cache entry
 */
interface GitignoreCache {
  patterns: string[];
  regexes: RegExp[];
  negationPatterns: string[];
  timestamp: number;
}

/**
 * File filtering statistics
 */
export interface FilteringStats {
  totalFiles: number;
  includedFiles: number;
  excludedFiles: number;
  gitignoreExclusions: number;
  binaryExclusions: number;
  sizeExclusions: number;
  relevanceExclusions: number;
  averageRelevanceScore: number;
  processingTime: number;
}

/**
 * Enhanced Git-Aware File Filter
 */
export class GitAwareFileFilter extends EventEmitter {
  private readonly config: Required<GitAwareFilterConfig>;
  private readonly gitignoreCache = new Map<string, GitignoreCache>();
  private readonly relevanceCache = new Map<string, number>();
  
  constructor(config: Partial<GitAwareFilterConfig> = {}) {
    super();
    
    this.config = {
      respectGitignore: true,
      excludeBinaryFiles: true,
      enableRelevanceScoring: true,
      customIgnorePatterns: [
        // Build outputs
        'dist/**', 'build/**', 'out/**', 'target/**',
        // Dependencies
        'node_modules/**', 'vendor/**', '.venv/**',
        // IDE and system files
        '.vscode/**', '.idea/**', '**/.DS_Store',
        // Temporary files
        '**/*.tmp', '**/*.temp', '**/*.log', '**/*.cache'
      ],
      additionalIgnoreFiles: ['.geminiignore', '.vibexignore'],
      maxFileSize: 1024 * 1024, // 1MB
      forceIncludeExtensions: ['.md', '.txt', '.json'],
      forceExcludeExtensions: ['.exe', '.dll', '.so', '.dylib'],
      excludeDirectories: ['node_modules', '.git', 'dist', 'build'],
      enableAdvancedBinaryDetection: true,
      minRelevanceScore: 10,
      enableNegationPatterns: true,
      gitignoreCacheTTL: 60000, // 1 minute
      ...config
    };
  }
  
  /**
   * Filter a list of file paths
   */
  public async filterFiles(
    filePaths: string[],
    rootPath: string = process.cwd()
  ): Promise<{
    included: string[];
    excluded: string[];
    results: Map<string, FileFilterResult>;
    stats: FilteringStats;
  }> {
    const startTime = Date.now();
    const absoluteRoot = resolve(rootPath);
    const results = new Map<string, FileFilterResult>();
    const included: string[] = [];
    const excluded: string[] = [];
    
    // Load gitignore patterns if enabled
    if (this.config.respectGitignore) {
      await this.loadGitignorePatterns(absoluteRoot);
    }
    
    // Process each file
    for (const filePath of filePaths) {
      const result = await this.filterSingleFile(filePath, absoluteRoot);
      results.set(filePath, result);
      
      if (result.include) {
        included.push(filePath);
      } else {
        excluded.push(filePath);
      }
    }
    
    // Calculate statistics
    const stats = this.calculateStats(results, Date.now() - startTime);
    
    return {
      included,
      excluded,
      results,
      stats
    };
  }
  
  /**
   * Filter a single file
   */
  public async filterSingleFile(
    filePath: string,
    rootPath: string = process.cwd()
  ): Promise<FileFilterResult> {
    const absolutePath = resolve(filePath);
    const absoluteRoot = resolve(rootPath);
    const relativePath = relative(absoluteRoot, absolutePath);
    const extension = extname(absolutePath).toLowerCase();
    const filename = basename(absolutePath);
    
    // Initialize result
    const result: FileFilterResult = {
      include: false,
      reason: '',
      relevanceScore: 0,
      gitignoreMatch: false,
      isBinary: false,
      fileType: FileTypeCategory.OTHER,
      metadata: {
        extension,
        pathDepth: relativePath.split('/').length - 1,
        isContextFile: false,
        isConfigFile: false,
        isDocumentation: false
      }
    };
    
    try {
      // Get file stats
      const stats = await stat(absolutePath);
      result.metadata.size = stats.size;
      result.metadata.modifiedTime = stats.mtime.getTime();
      
      // Skip binary detection for directories
      if (!stats.isFile()) {
        result.include = false;
        result.reason = 'Not a file (directory or other type)';
        return result;
      }
      
      // Determine file type
      result.fileType = this.determineFileType(absolutePath, filename, extension);
      result.metadata.isContextFile = this.isContextFile(filename);
      result.metadata.isConfigFile = this.isConfigFile(filename, extension);
      result.metadata.isDocumentation = this.isDocumentationFile(filename, extension);
      
      // Check force include extensions
      if (this.config.forceIncludeExtensions.includes(extension)) {
        result.include = true;
        result.reason = `Force included extension: ${extension}`;
        result.relevanceScore = 800;
        return result;
      }
      
      // Check force exclude extensions
      if (this.config.forceExcludeExtensions.includes(extension)) {
        result.include = false;
        result.reason = `Force excluded extension: ${extension}`;
        return result;
      }
      
      // Check directory exclusions
      if (this.isInExcludedDirectory(relativePath)) {
        result.include = false;
        result.reason = 'In excluded directory';
        return result;
      }
      
      // Check file size limit
      if (stats.size > this.config.maxFileSize) {
        result.include = false;
        result.reason = `File too large: ${Math.round(stats.size / 1024)}KB`;
        return result;
      }
      
      // Check gitignore patterns
      if (this.config.respectGitignore) {
        const gitignoreMatch = await this.isGitignoreMatch(relativePath, absoluteRoot);
        result.gitignoreMatch = gitignoreMatch;
        
        if (gitignoreMatch) {
          result.include = false;
          result.reason = 'Matched .gitignore pattern';
          return result;
        }
      }
      
      // Check custom ignore patterns
      if (this.matchesCustomIgnorePatterns(relativePath)) {
        result.include = false;
        result.reason = 'Matched custom ignore pattern';
        return result;
      }
      
      // Check binary file exclusion (only for actual files)
      if (this.config.excludeBinaryFiles) {
        const isBinary = this.config.enableAdvancedBinaryDetection
          ? isBinaryFile(absolutePath)
          : this.isBinaryExtension(extension);
        
        result.isBinary = isBinary;
        
        if (isBinary && !result.metadata.isContextFile) {
          result.include = false;
          result.reason = 'Binary file excluded';
          return result;
        }
      }
      
      // Calculate relevance score
      if (this.config.enableRelevanceScoring) {
        result.relevanceScore = this.calculateRelevanceScore(
          absolutePath,
          result.fileType,
          result.metadata
        );
        
        if (result.relevanceScore < this.config.minRelevanceScore) {
          result.include = false;
          result.reason = `Low relevance score: ${result.relevanceScore}`;
          return result;
        }
      } else {
        result.relevanceScore = 100; // Default score
      }
      
      // File passes all filters
      result.include = true;
      result.reason = 'Passed all filters';
      
      return result;
      
    } catch (error) {
      result.include = false;
      result.reason = `Error processing file: ${error instanceof Error ? error.message : String(error)}`;
      return result;
    }
  }
  
  /**
   * Load gitignore patterns for a directory
   */
  private async loadGitignorePatterns(rootPath: string): Promise<void> {
    const cacheKey = rootPath;
    const cached = this.gitignoreCache.get(cacheKey);
    
    // Check cache validity
    if (cached && Date.now() - cached.timestamp < this.config.gitignoreCacheTTL) {
      return;
    }
    
    const patterns: string[] = [];
    const regexes: RegExp[] = [];
    const negationPatterns: string[] = [];
    
    // Load standard .gitignore
    const gitignoreFiles = ['.gitignore', ...this.config.additionalIgnoreFiles];
    
    for (const ignoreFile of gitignoreFiles) {
      const ignoreFilePath = join(rootPath, ignoreFile);
      
      try {
        await access(ignoreFilePath);
        const content = await readFile(ignoreFilePath, 'utf-8');
        const parsed = this.parseGitignoreContent(content);
        
        patterns.push(...parsed.patterns);
        regexes.push(...parsed.regexes);
        negationPatterns.push(...parsed.negationPatterns);
        
        logger.debug(`Loaded ${parsed.patterns.length} patterns from ${ignoreFile}`);
      } catch {
        // File doesn't exist or can't be read, continue
      }
    }
    
    // Cache the patterns
    this.gitignoreCache.set(cacheKey, {
      patterns,
      regexes,
      negationPatterns,
      timestamp: Date.now()
    });
    
    logger.info(`Loaded ${patterns.length} gitignore patterns for ${rootPath}`);
  }
  
  /**
   * Parse gitignore file content
   */
  private parseGitignoreContent(content: string): {
    patterns: string[];
    regexes: RegExp[];
    negationPatterns: string[];
  } {
    const patterns: string[] = [];
    const regexes: RegExp[] = [];
    const negationPatterns: string[] = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Handle negation patterns
      if (trimmed.startsWith('!') && this.config.enableNegationPatterns) {
        const negationPattern = trimmed.slice(1);
        negationPatterns.push(negationPattern);
        patterns.push(trimmed);
        continue;
      }
      
      patterns.push(trimmed);
      
      try {
        const regex = this.gitignorePatternToRegex(trimmed);
        regexes.push(regex);
      } catch (error) {
        logger.warn(`Invalid gitignore pattern: ${trimmed}`, error);
      }
    }
    
    return { patterns, regexes, negationPatterns };
  }
  
  /**
   * Convert gitignore pattern to regex
   */
  private gitignorePatternToRegex(pattern: string): RegExp {
    let regex = pattern;
    
    // Handle negation (already processed above)
    if (regex.startsWith('!')) {
      regex = regex.slice(1);
    }
    
    // Escape special regex characters except * and ?
    regex = regex
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '___DOUBLESTAR___')  // Temporarily replace **
      .replace(/\*/g, '[^/]*')               // * matches any filename chars
      .replace(/___DOUBLESTAR___/g, '.*')    // ** matches any path
      .replace(/\?/g, '.');                  // ? matches any single char
    
    // Handle directory patterns
    if (pattern.endsWith('/')) {
      regex = regex.slice(0, -1) + '($|/.*)';
    }
    
    // Handle patterns starting with /
    if (pattern.startsWith('/')) {
      regex = '^' + regex.slice(1);
    } else {
      regex = '(^|.*/)' + regex;
    }
    
    return new RegExp(regex + '$');
  }
  
  /**
   * Check if path matches gitignore patterns
   */
  private async isGitignoreMatch(relativePath: string, rootPath: string): Promise<boolean> {
    const cached = this.gitignoreCache.get(rootPath);
    if (!cached) {
      return false;
    }
    
    // Check normal patterns
    for (const regex of cached.regexes) {
      if (regex.test(relativePath)) {
        // Check if excluded by negation pattern
        if (this.config.enableNegationPatterns) {
          for (const negationPattern of cached.negationPatterns) {
            const negationRegex = this.gitignorePatternToRegex(negationPattern);
            if (negationRegex.test(relativePath)) {
              return false; // Negation pattern overrides exclusion
            }
          }
        }
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if path matches custom ignore patterns
   */
  private matchesCustomIgnorePatterns(relativePath: string): boolean {
    return this.config.customIgnorePatterns.some(pattern => {
      const regex = new RegExp(
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '.')
          .replace(/\./g, '\\.')
      );
      return regex.test(relativePath);
    });
  }
  
  /**
   * Check if file is in excluded directory
   */
  private isInExcludedDirectory(relativePath: string): boolean {
    const pathSegments = relativePath.split('/');
    return this.config.excludeDirectories.some(excludeDir =>
      pathSegments.includes(excludeDir)
    );
  }
  
  /**
   * Determine file type category
   */
  private determineFileType(filePath: string, filename: string, extension: string): FileTypeCategory {
    // Context files
    if (this.isContextFile(filename)) {
      return FileTypeCategory.CONTEXT;
    }
    
    // Configuration files
    if (this.isConfigFile(filename, extension)) {
      return FileTypeCategory.CONFIGURATION;
    }
    
    // Documentation files
    if (this.isDocumentationFile(filename, extension)) {
      return FileTypeCategory.DOCUMENTATION;
    }
    
    // Source code files
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt'];
    if (codeExtensions.includes(extension)) {
      return FileTypeCategory.SOURCE_CODE;
    }
    
    // Build outputs
    if (filePath.includes('/dist/') || filePath.includes('/build/') || filePath.includes('/out/')) {
      return FileTypeCategory.BUILD_OUTPUT;
    }
    
    // Dependencies
    if (filePath.includes('/node_modules/') || filePath.includes('/vendor/')) {
      return FileTypeCategory.DEPENDENCY;
    }
    
    // Media files
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.wav', '.avi', '.mov'];
    if (mediaExtensions.includes(extension)) {
      return FileTypeCategory.MEDIA;
    }
    
    // Binary files
    if (this.isBinaryExtension(extension)) {
      return FileTypeCategory.BINARY;
    }
    
    // Temporary files
    const tempExtensions = ['.tmp', '.temp', '.log', '.cache'];
    if (tempExtensions.includes(extension) || filename.includes('.tmp') || filename.includes('.temp')) {
      return FileTypeCategory.TEMPORARY;
    }
    
    // System files
    if (filename.startsWith('.') && !extension) {
      return FileTypeCategory.SYSTEM;
    }
    
    return FileTypeCategory.OTHER;
  }
  
  /**
   * Check if file is a context file
   */
  private isContextFile(filename: string): boolean {
    const contextFiles = ['VIBEX.md', 'CLAUDE.md', 'GEMINI.md', 'CONTEXT.md', 'README.md', '.vibexrc', 'vibex.json'];
    return contextFiles.includes(filename);
  }
  
  /**
   * Check if file is a configuration file
   */
  private isConfigFile(filename: string, extension: string): boolean {
    const configExtensions = ['.json', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config'];
    const configFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', '.gitignore', '.eslintrc', '.prettierrc'];
    
    return configExtensions.includes(extension) || 
           configFiles.includes(filename) ||
           filename.includes('.config.') ||
           filename.includes('.rc') ||
           filename.startsWith('.env');
  }
  
  /**
   * Check if file is documentation
   */
  private isDocumentationFile(filename: string, extension: string): boolean {
    const docExtensions = ['.md', '.txt', '.rst', '.adoc'];
    const docFiles = ['README', 'CHANGELOG', 'LICENSE', 'CONTRIBUTING', 'INSTALL'];
    
    return docExtensions.includes(extension) ||
           docFiles.some(docFile => filename.toUpperCase().includes(docFile));
  }
  
  /**
   * Check if extension indicates binary file
   */
  private isBinaryExtension(extension: string): boolean {
    const binaryExtensions = [
      '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.obj', '.class',
      '.jar', '.war', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
      '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.ttf', '.otf', '.woff', '.woff2'
    ];
    
    return binaryExtensions.includes(extension);
  }
  
  /**
   * Calculate file relevance score
   */
  private calculateRelevanceScore(
    filePath: string,
    fileType: FileTypeCategory,
    metadata: FileFilterResult['metadata']
  ): number {
    const cacheKey = filePath;
    const cached = this.relevanceCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    
    let score = 50; // Base score
    
    // File type bonuses
    const typeScores: Record<FileTypeCategory, number> = {
      [FileTypeCategory.CONTEXT]: 200,
      [FileTypeCategory.CONFIGURATION]: 150,
      [FileTypeCategory.SOURCE_CODE]: 100,
      [FileTypeCategory.DOCUMENTATION]: 80,
      [FileTypeCategory.OTHER]: 50,
      [FileTypeCategory.BUILD_OUTPUT]: 10,
      [FileTypeCategory.DEPENDENCY]: 5,
      [FileTypeCategory.MEDIA]: 20,
      [FileTypeCategory.BINARY]: 10,
      [FileTypeCategory.TEMPORARY]: 5,
      [FileTypeCategory.SYSTEM]: 30
    };
    
    score += typeScores[fileType] || 0;
    
    // Extension-specific bonuses
    const extensionBonus = this.getExtensionBonus(metadata.extension);
    score += extensionBonus;
    
    // Depth penalty (files closer to root are more relevant)
    score -= metadata.pathDepth * 10;
    
    // Size factor (smaller files often more important for context)
    if (metadata.size) {
      const sizeKB = metadata.size / 1024;
      if (sizeKB < 10) score += 30;      // Very small files
      else if (sizeKB < 50) score += 15; // Small files
      else if (sizeKB > 500) score -= 30; // Large files
    }
    
    // Special file bonuses
    if (metadata.isContextFile) score += 200;
    if (metadata.isConfigFile) score += 100;
    if (metadata.isDocumentation) score += 50;
    
    // Recency bonus
    if (metadata.modifiedTime) {
      const ageMs = Date.now() - metadata.modifiedTime;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 1) score += 50;      // Modified today
      else if (ageDays < 7) score += 25; // Modified this week
      else if (ageDays < 30) score += 10; // Modified this month
    }
    
    // Path-based importance
    const pathLower = filePath.toLowerCase();
    if (pathLower.includes('/src/')) score += 30;
    if (pathLower.includes('/lib/')) score += 20;
    if (pathLower.includes('/config/')) score += 40;
    if (pathLower.includes('/docs/')) score += 15;
    if (pathLower.includes('/test/')) score += 10;
    
    // Clamp score to valid range
    const finalScore = Math.max(0, Math.min(1000, score));
    
    // Cache the result
    this.relevanceCache.set(cacheKey, finalScore);
    
    return finalScore;
  }
  
  /**
   * Get extension-specific bonus score
   */
  private getExtensionBonus(extension: string): number {
    const bonusMap: Record<string, number> = {
      // High priority source files
      '.ts': 80, '.tsx': 80, '.js': 70, '.jsx': 70,
      '.py': 70, '.java': 60, '.cpp': 60, '.c': 60,
      
      // Configuration files
      '.json': 70, '.yaml': 60, '.yml': 60, '.toml': 50,
      '.conf': 50, '.config': 50, '.ini': 40,
      
      // Documentation
      '.md': 60, '.txt': 30, '.rst': 40, '.adoc': 40,
      
      // Build and deployment
      '.dockerfile': 60, '.tf': 50,
      
      // Web files
      '.html': 40, '.css': 30, '.scss': 30, '.less': 30,
      
      // Data files
      '.sql': 40, '.graphql': 40, '.proto': 50,
      
      // Shell scripts
      '.sh': 40, '.bash': 40, '.zsh': 40, '.fish': 30,
      
      // Other languages
      '.go': 60, '.rs': 60, '.swift': 50, '.kt': 50,
      '.cs': 50, '.php': 40, '.rb': 40
    };
    
    return bonusMap[extension] || 0;
  }
  
  /**
   * Calculate filtering statistics
   */
  private calculateStats(
    results: Map<string, FileFilterResult>,
    processingTime: number
  ): FilteringStats {
    const totalFiles = results.size;
    let includedFiles = 0;
    let gitignoreExclusions = 0;
    let binaryExclusions = 0;
    let sizeExclusions = 0;
    let relevanceExclusions = 0;
    let totalRelevanceScore = 0;
    
    for (const result of results.values()) {
      if (result.include) {
        includedFiles++;
      }
      
      if (result.gitignoreMatch) gitignoreExclusions++;
      if (result.isBinary && result.reason.includes('Binary')) binaryExclusions++;
      if (result.reason.includes('too large')) sizeExclusions++;
      if (result.reason.includes('Low relevance')) relevanceExclusions++;
      
      totalRelevanceScore += result.relevanceScore;
    }
    
    return {
      totalFiles,
      includedFiles,
      excludedFiles: totalFiles - includedFiles,
      gitignoreExclusions,
      binaryExclusions,
      sizeExclusions,
      relevanceExclusions,
      averageRelevanceScore: totalFiles > 0 ? totalRelevanceScore / totalFiles : 0,
      processingTime
    };
  }
  
  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.gitignoreCache.clear();
    this.relevanceCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    gitignoreCacheSize: number;
    relevanceCacheSize: number;
    memoryUsage: number;
  } {
    return {
      gitignoreCacheSize: this.gitignoreCache.size,
      relevanceCacheSize: this.relevanceCache.size,
      memoryUsage: this.gitignoreCache.size * 1000 + this.relevanceCache.size * 100 // Rough estimate
    };
  }
}

/**
 * Create a new git-aware file filter instance
 */
export function createGitAwareFileFilter(config?: Partial<GitAwareFilterConfig>): GitAwareFileFilter {
  return new GitAwareFileFilter(config);
}

/**
 * Convenience function to filter files with default configuration
 */
export async function filterFilesGitAware(
  filePaths: string[],
  rootPath?: string,
  config?: Partial<GitAwareFilterConfig>
): Promise<string[]> {
  const filter = createGitAwareFileFilter(config);
  const result = await filter.filterFiles(filePaths, rootPath);
  return result.included;
} 