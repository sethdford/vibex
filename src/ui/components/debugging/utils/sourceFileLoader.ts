/**
 * Source File Loader
 * 
 * Utilities for loading source files for the debugging interface.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Error thrown when a source file cannot be loaded
 */
export class SourceFileLoadError extends Error {
  constructor(filePath: string, cause: Error) {
    super(`Failed to load source file: ${filePath}`);
    this.name = 'SourceFileLoadError';
    this.cause = cause;
  }
}

/**
 * Options for loading source files
 */
export interface SourceFileLoadOptions {
  /**
   * Maximum file size in bytes (default: 1MB)
   */
  maxFileSize?: number;
  
  /**
   * Maximum number of lines to load (default: 10000)
   */
  maxLines?: number;
  
  /**
   * Line range to load [startLine, endLine] (0-based, inclusive)
   */
  lineRange?: [number, number];
  
  /**
   * Whether to cache loaded files (default: true)
   */
  useCache?: boolean;
}

/**
 * Result of loading a source file
 */
export interface SourceFileContent {
  /**
   * File path
   */
  path: string;
  
  /**
   * File content
   */
  content: string;
  
  /**
   * Content as individual lines
   */
  lines: string[];
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * File type (based on extension)
   */
  type: string;
  
  /**
   * Last modified time
   */
  lastModified: Date;
  
  /**
   * Whether the file was loaded from cache
   */
  fromCache: boolean;
}

/**
 * Cache of loaded source files
 */
const fileCache = new Map<string, SourceFileContent>();

/**
 * Load a source file
 * 
 * @param filePath Path to the source file
 * @param options Loading options
 * @returns Source file content
 * @throws {SourceFileLoadError} If the file cannot be loaded
 */
export async function loadSourceFile(
  filePath: string,
  options: SourceFileLoadOptions = {}
): Promise<SourceFileContent> {
  const {
    maxFileSize = 1024 * 1024, // 1MB
    maxLines = 10000,
    lineRange,
    useCache = true
  } = options;
  
  // Check cache first if enabled
  const cacheKey = filePath + (lineRange ? `:${lineRange[0]}-${lineRange[1]}` : '');
  if (useCache && fileCache.has(cacheKey)) {
    return { 
      ...fileCache.get(cacheKey)!,
      fromCache: true
    };
  }
  
  try {
    // Check if file exists and get its stats
    const stats = fs.statSync(filePath);
    
    // Check file size
    if (stats.size > maxFileSize) {
      throw new Error(`File size (${stats.size} bytes) exceeds maximum allowed size (${maxFileSize} bytes)`);
    }
    
    // Load file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Split into lines
    const allLines = content.split('\n');
    
    // Apply line range or maximum lines limit
    const lines = lineRange 
      ? allLines.slice(lineRange[0], lineRange[1] + 1) 
      : (allLines.length > maxLines ? allLines.slice(0, maxLines) : allLines);
    
    // Get file type from extension
    const ext = path.extname(filePath).slice(1).toLowerCase();
    
    // Create result
    const result: SourceFileContent = {
      path: filePath,
      content: lines.join('\n'),
      lines,
      size: stats.size,
      type: ext,
      lastModified: stats.mtime,
      fromCache: false
    };
    
    // Cache result if enabled
    if (useCache) {
      fileCache.set(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    throw new SourceFileLoadError(filePath, error as Error);
  }
}

/**
 * Clear the source file cache
 */
export function clearSourceFileCache(): void {
  fileCache.clear();
}

/**
 * Get a source file from the cache
 * 
 * @param filePath Path to the source file
 * @param lineRange Optional line range
 * @returns Source file content or undefined if not in cache
 */
export function getSourceFileFromCache(
  filePath: string,
  lineRange?: [number, number]
): SourceFileContent | undefined {
  const cacheKey = filePath + (lineRange ? `:${lineRange[0]}-${lineRange[1]}` : '');
  const cachedFile = fileCache.get(cacheKey);
  
  return cachedFile ? { ...cachedFile, fromCache: true } : undefined;
}