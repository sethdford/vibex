/**
 * Advanced File System Tools
 * 
 * Provides sophisticated file system operations for enhanced productivity:
 * - list_directory: Enhanced directory listing with filtering and metadata
 * - read_many_files: Batch file reading with content aggregation
 * - edit: Advanced file editing with diff generation and backup
 * - glob: Pattern-based file matching with multiple glob patterns
 */

import fs from 'fs/promises';
import path from 'path';
import { glob as nodeGlob } from 'glob';
import { logger } from '../utils/logger.js';
import { fileExists, directoryExists, readTextFile, writeTextFile, isBinaryFile } from '../fs/operations.js';
import type { ToolDefinition, InternalToolResult, ToolInputParameters } from './index.js';
import type { LiveFeedbackCallbacks } from '../ui/components/LiveToolFeedback.js';

/**
 * Directory listing options
 */
interface ListDirectoryOptions {
  path: string;
  recursive?: boolean;
  include_hidden?: boolean;
  include_metadata?: boolean;
  filter_pattern?: string;
  max_depth?: number;
  sort_by?: 'name' | 'size' | 'modified' | 'type';
  sort_order?: 'asc' | 'desc';
}

/**
 * File entry with metadata
 */
interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size?: number;
  modified?: string;
  permissions?: string;
  is_binary?: boolean;
  extension?: string;
}

/**
 * Batch file reading options
 */
interface ReadManyFilesOptions {
  paths: string[];
  include_metadata?: boolean;
  skip_binary?: boolean;
  max_file_size?: number;
  encoding?: string;
}

/**
 * File content result
 */
interface FileContentResult {
  path: string;
  content?: string;
  error?: string;
  size?: number;
  is_binary?: boolean;
  encoding?: string;
}

/**
 * File edit options
 */
interface EditFileOptions {
  path: string;
  content: string;
  create_backup?: boolean;
  diff_only?: boolean;
  line_range?: { start: number; end: number };
  encoding?: string;
}

/**
 * Edit result
 */
interface EditResult {
  path: string;
  success: boolean;
  diff?: string;
  backup_path?: string;
  lines_added?: number;
  lines_removed?: number;
  error?: string;
}

/**
 * Glob pattern matching options
 */
interface GlobOptions {
  patterns: string[];
  base_path?: string;
  ignore_patterns?: string[];
  include_directories?: boolean;
  max_results?: number;
  sort?: boolean;
}

/**
 * Create list_directory tool
 */
export function createListDirectoryTool(): ToolDefinition {
  return {
    name: 'list_directory',
    description: 'List directory contents with advanced filtering and metadata',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to list'
        },
        recursive: {
          type: 'boolean',
          description: 'Recursively list subdirectories',
          default: false
        },
        include_hidden: {
          type: 'boolean',
          description: 'Include hidden files and directories',
          default: false
        },
        include_metadata: {
          type: 'boolean',
          description: 'Include file metadata (size, modified date, permissions)',
          default: true
        },
        filter_pattern: {
          type: 'string',
          description: 'Filter files by glob pattern (e.g., "*.ts", "test/**")'
        },
        max_depth: {
          type: 'number',
          description: 'Maximum recursion depth',
          default: 10
        },
        sort_by: {
          type: 'string',
          description: 'Sort files by: name, size, modified, type',
          default: 'name'
        },
        sort_order: {
          type: 'string',
          description: 'Sort order: asc or desc',
          default: 'asc'
        }
      },
      required: ['path']
    }
  };
}

/**
 * Execute list_directory tool
 */
export async function executeListDirectory(
  input: ToolInputParameters,
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('list_directory', String(input.path), 'Listing directory...');
  
  try {
    const options: ListDirectoryOptions = {
      path: String(input.path),
      recursive: Boolean(input.recursive),
      include_hidden: Boolean(input.include_hidden),
      include_metadata: Boolean(input.include_metadata ?? true),
      filter_pattern: input.filter_pattern ? String(input.filter_pattern) : undefined,
      max_depth: typeof input.max_depth === 'number' ? input.max_depth : 10,
      sort_by: ['name', 'size', 'modified', 'type'].includes(String(input.sort_by)) 
        ? String(input.sort_by) as 'name' | 'size' | 'modified' | 'type'
        : 'name',
      sort_order: ['asc', 'desc'].includes(String(input.sort_order))
        ? String(input.sort_order) as 'asc' | 'desc'
        : 'asc'
    };

    // Validate directory exists
    if (!await directoryExists(options.path)) {
      const error = `Directory not found: ${options.path}`;
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, { success: false, error });
      }
      return { success: false, error };
    }

    // Update progress
    if (feedbackId && feedback?.onProgress) {
      feedback.onProgress(feedbackId, {
        status: 'processing',
        message: 'Scanning directory structure...'
      });
    }

    const entries = await listDirectoryRecursive(options, 0);
    
    // Apply filtering
    let filteredEntries = entries;
    if (options.filter_pattern) {
      const pattern = new RegExp(
        options.filter_pattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
          .replace(/\[([^\]]+)\]/g, '[$1]'),
        'i'
      );
      filteredEntries = entries.filter(entry => 
        pattern.test(entry.name) || pattern.test(entry.path)
      );
    }

    // Apply sorting
    filteredEntries.sort((a, b) => {
      let comparison = 0;
      
      switch (options.sort_by) {
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'modified':
          comparison = new Date(a.modified || 0).getTime() - new Date(b.modified || 0).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'name':
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return options.sort_order === 'desc' ? -comparison : comparison;
    });

    const result = {
      success: true,
      result: {
        path: options.path,
        total_entries: filteredEntries.length,
        directories: filteredEntries.filter(e => e.type === 'directory').length,
        files: filteredEntries.filter(e => e.type === 'file').length,
        entries: filteredEntries,
        options: options
      },
      metadata: {
        filesAffected: filteredEntries.length,
        outputSize: JSON.stringify(filteredEntries).length
      }
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, result);
    }

    return result;
  } catch (error) {
    const errorResult = {
      success: false,
      error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }

    return errorResult;
  }
}

/**
 * Recursively list directory contents
 */
async function listDirectoryRecursive(
  options: ListDirectoryOptions,
  currentDepth: number
): Promise<FileEntry[]> {
  if (currentDepth >= (options.max_depth || 10)) {
    return [];
  }

  const entries: FileEntry[] = [];
  const dirEntries = await fs.readdir(options.path, { withFileTypes: true });

  for (const dirent of dirEntries) {
    // Skip hidden files if not requested
    if (!options.include_hidden && dirent.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(options.path, dirent.name);
    const entry: FileEntry = {
      name: dirent.name,
      path: fullPath,
      type: dirent.isDirectory() ? 'directory' : dirent.isSymbolicLink() ? 'symlink' : 'file'
    };

    // Add metadata if requested
    if (options.include_metadata) {
      try {
        const stats = await fs.stat(fullPath);
        entry.size = stats.size;
        entry.modified = stats.mtime.toISOString();
        entry.permissions = stats.mode.toString(8);
        
        if (entry.type === 'file') {
          entry.extension = path.extname(dirent.name);
          entry.is_binary = isBinaryFile(fullPath);
        }
      } catch (error) {
        logger.warn(`Failed to get metadata for ${fullPath}:`, error);
      }
    }

    entries.push(entry);

    // Recurse into subdirectories if requested
    if (options.recursive && dirent.isDirectory()) {
      const subOptions = {
        ...options,
        path: fullPath
      };
      const subEntries = await listDirectoryRecursive(subOptions, currentDepth + 1);
      entries.push(...subEntries);
    }
  }

  return entries;
}

/**
 * Create read_many_files tool
 */
export function createReadManyFilesTool(): ToolDefinition {
  return {
    name: 'read_many_files',
    description: 'Read multiple files in batch with content aggregation',
    input_schema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of file paths to read'
        },
        include_metadata: {
          type: 'boolean',
          description: 'Include file metadata in results',
          default: true
        },
        skip_binary: {
          type: 'boolean',
          description: 'Skip binary files',
          default: true
        },
        max_file_size: {
          type: 'number',
          description: 'Maximum file size in bytes (default: 1MB)',
          default: 1048576
        },
        encoding: {
          type: 'string',
          description: 'Text encoding to use',
          default: 'utf-8'
        }
      },
      required: ['paths']
    }
  };
}

/**
 * Execute read_many_files tool
 */
export async function executeReadManyFiles(
  input: ToolInputParameters,
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('read_many_files', 'batch', 'Reading multiple files...');
  
  try {
    const options: ReadManyFilesOptions = {
      paths: Array.isArray(input.paths) ? input.paths.map(String) : [],
      include_metadata: Boolean(input.include_metadata ?? true),
      skip_binary: Boolean(input.skip_binary ?? true),
      max_file_size: typeof input.max_file_size === 'number' ? input.max_file_size : 1048576,
      encoding: String(input.encoding || 'utf-8')
    };

    if (options.paths.length === 0) {
      const error = 'No file paths provided';
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, { success: false, error });
      }
      return { success: false, error };
    }

    // Update progress
    if (feedbackId && feedback?.onProgress) {
      feedback.onProgress(feedbackId, {
        status: 'processing',
        message: `Reading ${options.paths.length} files...`,
        progress: { current: 0, total: options.paths.length, unit: 'files' }
      });
    }

    const results: FileContentResult[] = [];
    let totalSize = 0;

    for (let i = 0; i < options.paths.length; i++) {
      const filePath = options.paths[i];
      
      // Update progress
      if (feedbackId && feedback?.onProgress) {
        feedback.onProgress(feedbackId, {
          status: 'processing',
          message: `Reading ${path.basename(filePath)}...`,
          progress: { current: i + 1, total: options.paths.length, unit: 'files' }
        });
      }

      try {
        const result = await readSingleFile(filePath, options);
        results.push(result);
        totalSize += result.size || 0;
      } catch (error) {
        results.push({
          path: filePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const successCount = results.filter(r => !r.error).length;
    const errorCount = results.filter(r => r.error).length;

    const finalResult = {
      success: true,
      result: {
        total_files: options.paths.length,
        successful_reads: successCount,
        failed_reads: errorCount,
        total_size: totalSize,
        files: results,
        options: options
      },
      metadata: {
        filesAffected: successCount,
        outputSize: totalSize
      }
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, finalResult);
    }

    return finalResult;
  } catch (error) {
    const errorResult = {
      success: false,
      error: `Failed to read files: ${error instanceof Error ? error.message : String(error)}`
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }

    return errorResult;
  }
}

/**
 * Read a single file with options
 */
async function readSingleFile(
  filePath: string,
  options: ReadManyFilesOptions
): Promise<FileContentResult> {
  const result: FileContentResult = { path: filePath };

  try {
    // Check if file exists
    if (!await fileExists(filePath)) {
      result.error = 'File not found';
      return result;
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    result.size = stats.size;

    // Check file size limit
    if (stats.size > (options.max_file_size || 1048576)) {
      result.error = `File too large (${stats.size} bytes, limit: ${options.max_file_size})`;
      return result;
    }

    // Check if binary file
    const isBinary = isBinaryFile(filePath);
    result.is_binary = isBinary;

    if (isBinary && options.skip_binary) {
      result.error = 'Binary file skipped';
      return result;
    }

    // Read file content
    result.content = await readTextFile(filePath, options.encoding as BufferEncoding);
    result.encoding = options.encoding;

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Create edit tool
 */
export function createEditTool(): ToolDefinition {
  return {
    name: 'edit',
    description: 'Advanced file editing with diff generation and backup',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to edit'
        },
        content: {
          type: 'string',
          description: 'New file content'
        },
        create_backup: {
          type: 'boolean',
          description: 'Create backup before editing',
          default: true
        },
        diff_only: {
          type: 'boolean',
          description: 'Only generate diff without applying changes',
          default: false
        },
        line_range: {
          type: 'object',
          properties: {
            start: { type: 'number' },
            end: { type: 'number' }
          },
          description: 'Edit only specific line range'
        },
        encoding: {
          type: 'string',
          description: 'Text encoding to use',
          default: 'utf-8'
        }
      },
      required: ['path', 'content']
    }
  };
}

/**
 * Execute edit tool
 */
export async function executeEdit(
  input: ToolInputParameters,
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('edit', String(input.path), 'Editing file...');
  
  try {
    const options: EditFileOptions = {
      path: String(input.path),
      content: String(input.content),
      create_backup: Boolean(input.create_backup ?? true),
      diff_only: Boolean(input.diff_only),
      encoding: String(input.encoding || 'utf-8')
    };

    if (input.line_range && typeof input.line_range === 'object') {
      const range = input.line_range as { start?: number; end?: number };
      if (typeof range.start === 'number' && typeof range.end === 'number') {
        options.line_range = { start: range.start, end: range.end };
      }
    }

    // Update progress
    if (feedbackId && feedback?.onProgress) {
      feedback.onProgress(feedbackId, {
        status: 'processing',
        message: 'Analyzing file changes...'
      });
    }

    const editResult = await performFileEdit(options);

    const result = {
      success: editResult.success,
      result: editResult,
      metadata: {
        filesAffected: editResult.success ? 1 : 0,
        linesAdded: editResult.lines_added || 0,
        linesRemoved: editResult.lines_removed || 0
      }
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, result);
    }

    return result;
  } catch (error) {
    const errorResult = {
      success: false,
      error: `Failed to edit file: ${error instanceof Error ? error.message : String(error)}`
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }

    return errorResult;
  }
}

/**
 * Perform file edit operation
 */
async function performFileEdit(options: EditFileOptions): Promise<EditResult> {
  const result: EditResult = {
    path: options.path,
    success: false
  };

  try {
    let originalContent = '';
    let fileExistsFlag = false;

    // Read original content if file exists
    if (await fileExists(options.path)) {
      originalContent = await readTextFile(options.path, options.encoding as BufferEncoding);
      fileExistsFlag = true;
    }

    let newContent = options.content;

    // Handle line range editing
    if (options.line_range && fileExistsFlag) {
      const lines = originalContent.split('\n');
      const newLines = options.content.split('\n');
      
      const { start, end } = options.line_range;
      const startIndex = Math.max(0, start - 1);
      const endIndex = Math.min(lines.length, end);
      
      // Replace specified line range
      lines.splice(startIndex, endIndex - startIndex, ...newLines);
      newContent = lines.join('\n');
    }

    // Generate diff
    result.diff = generateDiff(originalContent, newContent);
    
    // Count line changes
    const originalLines = originalContent.split('\n');
    const newLines = newContent.split('\n');
    result.lines_added = Math.max(0, newLines.length - originalLines.length);
    result.lines_removed = Math.max(0, originalLines.length - newLines.length);

    // If diff_only mode, don't write changes
    if (options.diff_only) {
      result.success = true;
      return result;
    }

    // Create backup if requested and file exists
    if (options.create_backup && fileExistsFlag) {
      const backupPath = `${options.path}.backup.${Date.now()}`;
      await writeTextFile(backupPath, originalContent, { encoding: options.encoding as BufferEncoding });
      result.backup_path = backupPath;
    }

    // Write new content
    await writeTextFile(options.path, newContent, { 
      encoding: options.encoding as BufferEncoding,
      createDir: true 
    });

    result.success = true;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Generate a simple diff between two strings
 */
function generateDiff(original: string, modified: string): string {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  const diff: string[] = [];
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const originalLine = originalLines[i];
    const modifiedLine = modifiedLines[i];
    
    if (originalLine === undefined) {
      diff.push(`+ ${modifiedLine}`);
    } else if (modifiedLine === undefined) {
      diff.push(`- ${originalLine}`);
    } else if (originalLine !== modifiedLine) {
      diff.push(`- ${originalLine}`);
      diff.push(`+ ${modifiedLine}`);
    } else {
      diff.push(`  ${originalLine}`);
    }
  }
  
  return diff.join('\n');
}

/**
 * Create glob tool
 */
export function createGlobTool(): ToolDefinition {
  return {
    name: 'glob',
    description: 'Find files using glob patterns with advanced filtering',
    input_schema: {
      type: 'object',
      properties: {
        patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Glob patterns to match (e.g., ["**/*.ts", "src/**/*.js"])'
        },
        base_path: {
          type: 'string',
          description: 'Base directory to search from',
          default: '.'
        },
        ignore_patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to ignore (e.g., ["node_modules/**", "*.test.*"])'
        },
        include_directories: {
          type: 'boolean',
          description: 'Include directories in results',
          default: false
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 1000
        },
        sort: {
          type: 'boolean',
          description: 'Sort results alphabetically',
          default: true
        }
      },
      required: ['patterns']
    }
  };
}

/**
 * Execute glob tool
 */
export async function executeGlob(
  input: ToolInputParameters,
  feedback?: LiveFeedbackCallbacks
): Promise<InternalToolResult> {
  const feedbackId = feedback?.onStart?.('glob', 'pattern matching', 'Finding files...');
  
  try {
    const options: GlobOptions = {
      patterns: Array.isArray(input.patterns) ? input.patterns.map(String) : [],
      base_path: String(input.base_path || '.'),
      ignore_patterns: Array.isArray(input.ignore_patterns) ? input.ignore_patterns.map(String) : [],
      include_directories: Boolean(input.include_directories),
      max_results: typeof input.max_results === 'number' ? input.max_results : 1000,
      sort: Boolean(input.sort ?? true)
    };

    if (options.patterns.length === 0) {
      const error = 'No glob patterns provided';
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, { success: false, error });
      }
      return { success: false, error };
    }

    // Update progress
    if (feedbackId && feedback?.onProgress) {
      feedback.onProgress(feedbackId, {
        status: 'processing',
        message: 'Matching file patterns...'
      });
    }

    const allMatches = new Set<string>();

    // Process each pattern
    for (const pattern of options.patterns) {
      try {
        const matches = await nodeGlob(pattern, {
          cwd: options.base_path,
          ignore: options.ignore_patterns,
          nodir: !options.include_directories,
          absolute: true
        });
        
        (matches as string[]).forEach((match: string) => allMatches.add(match));
      } catch (error) {
        logger.warn(`Glob pattern failed: ${pattern}`, error);
      }
    }

    let results = Array.from(allMatches);

    // Limit results
    if (options.max_results && results.length > options.max_results) {
      results = results.slice(0, options.max_results);
    }

    // Sort results
    if (options.sort) {
      results.sort();
    }

    const finalResult = {
      success: true,
      result: {
        total_matches: results.length,
        patterns: options.patterns,
        base_path: options.base_path,
        files: results,
        truncated: options.max_results ? allMatches.size > options.max_results : false
      },
      metadata: {
        filesAffected: results.length,
        outputSize: results.join('\n').length
      }
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, finalResult);
    }

    return finalResult;
  } catch (error) {
    const errorResult = {
      success: false,
      error: `Failed to execute glob: ${error instanceof Error ? error.message : String(error)}`
    };

    if (feedbackId && feedback?.onComplete) {
      feedback.onComplete(feedbackId, errorResult);
    }

    return errorResult;
  }
}

/**
 * Export all advanced file tools
 */
export const advancedFileTools = {
  list_directory: {
    definition: createListDirectoryTool(),
    handler: executeListDirectory
  },
  read_many_files: {
    definition: createReadManyFilesTool(),
    handler: executeReadManyFiles
  },
  edit: {
    definition: createEditTool(),
    handler: executeEdit
  },
  glob: {
    definition: createGlobTool(),
    handler: executeGlob
  }
}; 