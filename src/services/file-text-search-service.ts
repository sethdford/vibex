/**
 * File Text Search Service
 * 
 * Single Responsibility: Handle text searching within files
 * Following Gemini CLI's clean architecture patterns
 */

import { FileIOService, FileContent } from './file-io-service.js';
import { FileSearchService, FileMetadata, FileSearchOptions } from './file-search-service.js';
import { logger } from '../utils/logger.js';

export interface TextSearchConfig {
  maxMatchesPerFile?: number;
  contextLines?: number;
  caseSensitive?: boolean;
  useRegex?: boolean;
  maxFileSize?: number;
}

export interface TextSearchOptions extends FileSearchOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
  contextLines?: number;
  maxMatchesPerFile?: number;
}

export interface TextMatch {
  line: number;
  column: number;
  content: string;
  context?: Array<{
    line: number;
    content: string;
  }>;
}

export interface TextSearchResult {
  metadata: FileMetadata;
  matches: TextMatch[];
  totalMatches: number;
}

export interface TextSearchResponse {
  success: boolean;
  results?: TextSearchResult[];
  error?: string;
  stats: {
    filesSearched: number;
    filesWithMatches: number;
    totalMatches: number;
    duration: number;
  };
}

/**
 * File Text Search Service - Clean Architecture
 * Focus: Text searching within files only
 */
export class FileTextSearchService {
  private config: Required<TextSearchConfig>;
  private fileIOService: FileIOService;
  private fileSearchService: FileSearchService;

  constructor(
    fileIOService: FileIOService,
    fileSearchService: FileSearchService,
    config: TextSearchConfig = {}
  ) {
    this.fileIOService = fileIOService;
    this.fileSearchService = fileSearchService;
    
    this.config = {
      maxMatchesPerFile: config.maxMatchesPerFile || 100,
      contextLines: config.contextLines || 0,
      caseSensitive: config.caseSensitive ?? false,
      useRegex: config.useRegex ?? false,
      maxFileSize: config.maxFileSize || 1024 * 1024 // 1MB for text search
    };
  }

  /**
   * Search for text pattern in files
   */
  async searchText(
    rootDir: string,
    pattern: string,
    options: TextSearchOptions = {}
  ): Promise<TextSearchResponse> {
    const startTime = Date.now();
    const stats = {
      filesSearched: 0,
      filesWithMatches: 0,
      totalMatches: 0,
      duration: 0
    };

    try {
      // Find files to search
      const searchResult = await this.fileSearchService.findFiles(rootDir, {
        ...options,
        maxFileSize: options.maxFileSize || this.config.maxFileSize
      });

      if (!searchResult.success || !searchResult.files) {
        return {
          success: false,
          error: searchResult.error || 'Failed to find files',
          stats: { ...stats, duration: Date.now() - startTime }
        };
      }

      // Filter out directories and binary files
      const searchableFiles = searchResult.files.filter(file => 
        !file.isDirectory && 
        !this.isBinaryFile(file)
      );

      // Search options
      const searchOptions = {
        caseSensitive: options.caseSensitive ?? this.config.caseSensitive,
        useRegex: options.useRegex ?? this.config.useRegex,
        contextLines: options.contextLines ?? this.config.contextLines,
        maxMatchesPerFile: options.maxMatchesPerFile ?? this.config.maxMatchesPerFile
      };

      // Create regex pattern
      const regex = this.createSearchRegex(pattern, searchOptions);

      // Search in each file
      const results: TextSearchResult[] = [];

      for (const file of searchableFiles) {
        try {
          const fileResult = await this.searchInFile(file, regex, searchOptions);
          stats.filesSearched++;

          if (fileResult && fileResult.matches.length > 0) {
            results.push(fileResult);
            stats.filesWithMatches++;
            stats.totalMatches += fileResult.totalMatches;
          }
        } catch (error) {
          logger.warn(`Failed to search in file: ${file.path}`, error);
        }
      }

      stats.duration = Date.now() - startTime;

      logger.debug(`Text search completed`, {
        pattern,
        rootDir,
        stats
      });

      return {
        success: true,
        results,
        stats
      };
    } catch (error) {
      stats.duration = Date.now() - startTime;
      
      logger.error(`Text search failed`, error);
      
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stats
      };
    }
  }

  /**
   * Search for multiple patterns
   */
  async searchMultiplePatterns(
    rootDir: string,
    patterns: string[],
    options: TextSearchOptions = {}
  ): Promise<Map<string, TextSearchResponse>> {
    const results = new Map<string, TextSearchResponse>();

    for (const pattern of patterns) {
      const result = await this.searchText(rootDir, pattern, options);
      results.set(pattern, result);
    }

    return results;
  }

  /**
   * Search and replace text in files
   */
  async searchAndReplace(
    rootDir: string,
    searchPattern: string,
    replaceText: string,
    options: TextSearchOptions = {}
  ): Promise<{
    success: boolean;
    filesModified: number;
    totalReplacements: number;
    error?: string;
  }> {
    try {
      // First, find all matches
      const searchResult = await this.searchText(rootDir, searchPattern, options);

      if (!searchResult.success || !searchResult.results) {
        return {
          success: false,
          filesModified: 0,
          totalReplacements: 0,
          error: searchResult.error
        };
      }

      let filesModified = 0;
      let totalReplacements = 0;

      // Replace in each file
      for (const result of searchResult.results) {
        try {
          const replacements = await this.replaceInFile(
            result.metadata.path,
            searchPattern,
            replaceText,
            options
          );

          if (replacements > 0) {
            filesModified++;
            totalReplacements += replacements;
          }
        } catch (error) {
          logger.error(`Failed to replace in file: ${result.metadata.path}`, error);
        }
      }

      return {
        success: true,
        filesModified,
        totalReplacements
      };
    } catch (error) {
      return {
        success: false,
        filesModified: 0,
        totalReplacements: 0,
        error: `Replace failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get search statistics for a directory
   */
  async getSearchStats(rootDir: string, pattern: string, options: TextSearchOptions = {}): Promise<{
    totalFiles: number;
    searchableFiles: number;
    filesWithMatches: number;
    totalMatches: number;
    averageMatchesPerFile: number;
  }> {
    const searchResult = await this.searchText(rootDir, pattern, options);

    const totalFiles = searchResult.stats.filesSearched;
    const filesWithMatches = searchResult.stats.filesWithMatches;
    const totalMatches = searchResult.stats.totalMatches;

    return {
      totalFiles,
      searchableFiles: totalFiles,
      filesWithMatches,
      totalMatches,
      averageMatchesPerFile: filesWithMatches > 0 ? totalMatches / filesWithMatches : 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TextSearchConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Search within a single file
   */
  private async searchInFile(
    fileMetadata: FileMetadata,
    regex: RegExp,
    options: Required<Pick<TextSearchOptions, 'contextLines' | 'maxMatchesPerFile'>>
  ): Promise<TextSearchResult | null> {
    try {
      // Read file content
      const readResult = await this.fileIOService.readFile(fileMetadata.path);

      if (!readResult.success || !readResult.data || readResult.data.binary) {
        return null;
      }

      const lines = readResult.data.content.split('\n');
      const matches: TextMatch[] = [];

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        let match;

        // Reset regex for global matching
        regex.lastIndex = 0;

        while ((match = regex.exec(line)) !== null) {
          const textMatch: TextMatch = {
            line: lineIndex + 1,
            column: match.index + 1,
            content: match[0]
          };

          // Add context lines if requested
          if (options.contextLines > 0) {
            textMatch.context = this.getContextLines(
              lines,
              lineIndex,
              options.contextLines
            );
          }

          matches.push(textMatch);

          // Check max matches limit
          if (matches.length >= options.maxMatchesPerFile) {
            break;
          }

          // Prevent infinite loop for zero-width matches
          if (match[0].length === 0) {
            regex.lastIndex++;
          }
        }

        // Break if we've reached the match limit
        if (matches.length >= options.maxMatchesPerFile) {
          break;
        }
      }

      return {
        metadata: fileMetadata,
        matches,
        totalMatches: matches.length
      };
    } catch (error) {
      logger.error(`Failed to search in file: ${fileMetadata.path}`, error);
      return null;
    }
  }

  /**
   * Replace text in a single file
   */
  private async replaceInFile(
    filePath: string,
    searchPattern: string,
    replaceText: string,
    options: TextSearchOptions
  ): Promise<number> {
    try {
      // Read file content
      const readResult = await this.fileIOService.readFile(filePath);

      if (!readResult.success || !readResult.data || readResult.data.binary) {
        return 0;
      }

      // Create regex for replacement
      const searchOptions = {
        caseSensitive: options.caseSensitive ?? this.config.caseSensitive,
        useRegex: options.useRegex ?? this.config.useRegex,
        contextLines: 0,
        maxMatchesPerFile: Number.MAX_SAFE_INTEGER
      };

      const regex = this.createSearchRegex(searchPattern, searchOptions);

      // Count matches before replacement
      const matches = readResult.data.content.match(regex);
      const matchCount = matches ? matches.length : 0;

      if (matchCount === 0) {
        return 0;
      }

      // Perform replacement
      const newContent = readResult.data.content.replace(regex, replaceText);

      // Write back to file
      const writeResult = await this.fileIOService.writeFile(filePath, newContent);

      if (!writeResult.success) {
        throw new Error(writeResult.error);
      }

      return matchCount;
    } catch (error) {
      logger.error(`Failed to replace in file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Create search regex from pattern and options
   */
  private createSearchRegex(pattern: string, options: {
    caseSensitive: boolean;
    useRegex: boolean;
  }): RegExp {
    const flags = options.caseSensitive ? 'g' : 'gi';

    if (options.useRegex) {
      return new RegExp(pattern, flags);
    } else {
      // Escape special regex characters for literal search
      const escapedPattern = pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(escapedPattern, flags);
    }
  }

  /**
   * Get context lines around a match
   */
  private getContextLines(
    lines: string[],
    matchLineIndex: number,
    contextLines: number
  ): Array<{ line: number; content: string }> {
    const context: Array<{ line: number; content: string }> = [];
    
    const startLine = Math.max(0, matchLineIndex - contextLines);
    const endLine = Math.min(lines.length - 1, matchLineIndex + contextLines);

    for (let i = startLine; i <= endLine; i++) {
      if (i !== matchLineIndex) { // Don't include the match line itself
        context.push({
          line: i + 1,
          content: lines[i]
        });
      }
    }

    return context;
  }

  /**
   * Check if file is binary based on extension
   */
  private isBinaryFile(fileMetadata: FileMetadata): boolean {
    const binaryExtensions = [
      '.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg',
      '.gif', '.bmp', '.ico', '.pdf', '.zip', '.tar', '.gz', '.rar',
      '.7z', '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac', '.woff',
      '.woff2', '.ttf', '.eot', '.otf'
    ];

    return binaryExtensions.includes(fileMetadata.ext.toLowerCase());
  }
}

// Factory function for creating text search service
export function createFileTextSearchService(
  fileIOService: FileIOService,
  fileSearchService: FileSearchService,
  config?: TextSearchConfig
): FileTextSearchService {
  return new FileTextSearchService(fileIOService, fileSearchService, config);
} 