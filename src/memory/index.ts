/**
 * Memory Module - Hierarchical Memory System
 * Exports all memory management components
 */

// Core interfaces and types
export * from './interfaces.js';

// Storage implementations
export * from './storage.js';

// Embedding providers
export * from './embedding-provider.js';

// Main memory manager
export * from './hierarchical-manager.js';



// Default factory function for easy setup
export { createHierarchicalMemoryManager as createMemoryManager } from './hierarchical-manager.js';

/**
 * VibeX Memory System
 * 
 * Provides a hierarchical memory system for loading context files from various locations
 * and in multiple formats. Supports both explicit context files and directory-based context.
 */

import fs from 'fs/promises';
import { watch } from 'fs';
import type { FSWatcher } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { processImports } from './import-processor.js';

/**
 * Memory file information
 */
export interface MemoryFile {
  /**
   * Path to the file
   */
  path: string;
  
  /**
   * File name
   */
  name: string;
  
  /**
   * File content
   */
  content: string;
  
  /**
   * File format (md, json, etc.)
   */
  format: 'md' | 'json' | 'txt' | 'unknown';
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * Last modified timestamp
   */
  lastModified: Date;
  
  /**
   * Optional source location (project, user, global)
   */
  source?: 'project' | 'user' | 'global';
  
  /**
   * Optional priority (higher priority files are processed first)
   */
  priority?: number;
}

/**
 * Memory file load result
 */
export interface MemoryLoadResult {
  /**
   * Combined content of all memory files
   */
  content: string;
  
  /**
   * Number of files loaded
   */
  count: number;
  
  /**
   * Total character count
   */
  charCount: number;
  
  /**
   * List of found files
   */
  files: MemoryFile[];
  
  /**
   * List of file formats found
   */
  formats: Set<string>;
  
  /**
   * Any errors encountered during loading
   */
  errors?: Error[];
}

/**
 * Memory search options
 */
export interface MemoryOptions {
  /**
   * Include files in the .vibex directory
   */
  includeVibexDir?: boolean;

  /**
   * Include GEMINI.md, CLAUDE.md, and VIBEX.md files in the root
   */
  includeRootFiles?: boolean;
  
  /**
   * Include JSON files
   */
  includeJsonFiles?: boolean;
  
  /**
   * Include Markdown files
   */
  includeMarkdownFiles?: boolean;
  
  /**
   * Include text files
   */
  includeTextFiles?: boolean;
  
  /**
   * Maximum depth to search for files (relative to base dir)
   */
  maxDepth?: number;
  
  /**
   * Recursively search subdirectories
   */
  recursive?: boolean;
}

/**
 * Default memory search options
 */
const DEFAULT_OPTIONS: MemoryOptions = {
  includeVibexDir: true,
  includeRootFiles: true,
  includeJsonFiles: true,
  includeMarkdownFiles: true,
  includeTextFiles: false,
  maxDepth: 3,
  recursive: true,
};

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 */
async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get file format from extension
 */
function getFileFormat(filePath: string): 'md' | 'json' | 'txt' | 'unknown' {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.md':
    case '.markdown':
      return 'md';
    case '.json':
      return 'json';
    case '.txt':
      return 'txt';
    default:
      return 'unknown';
  }
}

/**
 * Load a memory file
 */
async function loadMemoryFile(filePath: string, processFileImports = true): Promise<MemoryFile> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    // Process imports if needed
    const processedContent = processFileImports 
      ? await processImports(content, path.dirname(filePath)) 
      : content;
    
    return {
      path: filePath,
      name: path.basename(filePath),
      content: processedContent,
      format: getFileFormat(filePath),
      size: stats.size,
      lastModified: new Date(stats.mtime),
    };
  } catch (error) {
    logger.error(`Error loading memory file ${filePath}: ${error}`);
    throw error;
  }
}

/**
 * Process memory file content based on format
 */
function processMemoryContent(file: MemoryFile): string {
  switch (file.format) {
    case 'md':
      return `\n# File: ${file.name}\n\n${file.content}\n`;
      
    case 'json':
      try {
        const data = JSON.parse(file.content);
        if (typeof data === 'object' && data !== null) {
          // Check if this is a memory context object with special fields
          if (data.context || data.instructions || data.system_prompt) {
            let formattedContent = `\n# File: ${file.name}\n\n`;
            
            // Process special fields
            if (data.context) {
              formattedContent += `## Context\n\n${data.context}\n\n`;
            }
            
            if (data.instructions) {
              formattedContent += `## Instructions\n\n${data.instructions}\n\n`;
            }
            
            if (data.system_prompt) {
              formattedContent += `## System Prompt\n\n${data.system_prompt}\n\n`;
            }
            
            // Add any other fields as JSON
            const otherFields = {...data};
            delete otherFields.context;
            delete otherFields.instructions;
            delete otherFields.system_prompt;
            
            if (Object.keys(otherFields).length > 0) {
              formattedContent += `## Additional Configuration\n\n\`\`\`json\n${JSON.stringify(otherFields, null, 2)}\n\`\`\`\n`;
            }
            
            return formattedContent;
          }
          
          // Format regular JSON data as markdown
          return `\n# File: ${file.name}\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
        } else {
          return `\n# File: ${file.name}\n\n${file.content}\n`;
        }
      } catch {
        return `\n# File: ${file.name} (malformed JSON)\n\n${file.content}\n`;
      }
      
    case 'txt':
      return `\n# File: ${file.name}\n\n${file.content}\n`;
      
    default:
      return `\n# File: ${file.name} (unknown format)\n\n${file.content}\n`;
  }
}

/**
 * Find memory files in a directory
 */
async function findMemoryFiles(dir: string, options: MemoryOptions, currentDepth = 0): Promise<MemoryFile[]> {
  if (currentDepth > (options.maxDepth || 3)) {
    return [];
  }
  
  try {
    if (!await directoryExists(dir)) {
      return [];
    }
    
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const result: MemoryFile[] = [];
    
    // Process directories first for depth-first search
    if (options.recursive) {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Skip node_modules and .git directories
          if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
          }
          
          // Special handling for .vibex directory
          if (entry.name === '.vibex' && options.includeVibexDir) {
            const vibexPath = path.join(dir, entry.name);
            const vibexFiles = await findMemoryFiles(vibexPath, {
              ...options,
              includeVibexDir: false, // Avoid infinite recursion
            }, currentDepth + 1);
            
            result.push(...vibexFiles.map(file => ({
              ...file,
              source: 'project' as const,
              priority: 100, // Higher priority for .vibex files
            })));
          } 
          // Handle other directories if recursive search is enabled
          else if (options.recursive) {
            const subDirPath = path.join(dir, entry.name);
            const subDirFiles = await findMemoryFiles(subDirPath, options, currentDepth + 1);
            result.push(...subDirFiles);
          }
        }
      }
    }
    
    // Process files
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(dir, entry.name);
        const ext = path.extname(entry.name).toLowerCase();
        const baseName = entry.name.toUpperCase();
        
        // Check if this is a root context file
        const isRootContextFile = 
          options.includeRootFiles && 
          (baseName === 'GEMINI.MD' || 
           baseName === 'CLAUDE.MD' || 
           baseName === 'VIBEX.MD');
           
        // Check if it's a supported format
        const isMarkdown = options.includeMarkdownFiles && (ext === '.md' || ext === '.markdown');
        const isJson = options.includeJsonFiles && ext === '.json';
        const isText = options.includeTextFiles && ext === '.txt';
        
        if (isRootContextFile || isMarkdown || isJson || isText) {
          try {
            const file = await loadMemoryFile(filePath);
            
            // Add priority for root context files
            if (isRootContextFile) {
              file.source = 'project';
              
              // Assign different priorities based on file name
              if (baseName === 'VIBEX.MD') {
                file.priority = 200; // VIBEX.MD has highest priority
              } else if (baseName === 'CLAUDE.MD') {
                file.priority = 150; // CLAUDE.MD has second highest priority
              } else {
                file.priority = 100; // GEMINI.MD has third highest priority
              }
            }
            
            result.push(file);
          } catch (error) {
            logger.warn(`Failed to load memory file ${filePath}: ${error}`);
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    logger.error(`Error finding memory files in ${dir}: ${error}`);
    return [];
  }
}

/**
 * Load memory files from a directory with various options
 */
export async function loadMemoryFiles(
  baseDir: string, 
  options: MemoryOptions = DEFAULT_OPTIONS
): Promise<MemoryLoadResult> {
  try {
    const startTime = Date.now();
    logger.debug(`Loading memory files from ${baseDir}`);
    
    // Find all memory files
    const files = await findMemoryFiles(baseDir, options);
    
    // Sort by priority (if defined) then by name
    const sortedFiles = files.sort((a, b) => {
      // Sort by priority first (higher priority first)
      if (a.priority !== undefined && b.priority !== undefined) {
        return b.priority - a.priority;
      } else if (a.priority !== undefined) {
        return -1; // a has priority, b doesn't
      } else if (b.priority !== undefined) {
        return 1; // b has priority, a doesn't
      }
      
      // Then by name
      return a.name.localeCompare(b.name);
    });
    
    // Process files and combine content
    let combinedContent = '';
    const formats = new Set<string>();
    
    for (const file of sortedFiles) {
      const processedContent = processMemoryContent(file);
      combinedContent += processedContent;
      formats.add(file.format);
    }
    
    const endTime = Date.now();
    logger.debug(`Loaded ${files.length} memory files in ${endTime - startTime}ms`);
    
    return {
      content: combinedContent,
      count: files.length,
      charCount: combinedContent.length,
      files: sortedFiles,
      formats,
    };
  } catch (error) {
    logger.error(`Error loading memory files: ${error}`);
    return {
      content: '',
      count: 0,
      charCount: 0,
      files: [],
      formats: new Set(),
      errors: [error instanceof Error ? error : new Error(String(error))],
    };
  }
}

/**
 * Save a memory file to the .vibex directory
 */
export async function saveMemoryFile(baseDir: string, fileName: string, content: string): Promise<void> {
  try {
    const vibexDir = path.join(baseDir, '.vibex');
    
    // Create .vibex directory if it doesn't exist
    if (!await directoryExists(vibexDir)) {
      await fs.mkdir(vibexDir, { recursive: true });
    }
    
    const filePath = path.join(vibexDir, fileName);
    await fs.writeFile(filePath, content, 'utf-8');
    logger.debug(`Saved memory file to ${filePath}`);
  } catch (error) {
    logger.error(`Error saving memory file: ${error}`);
    throw error;
  }
}

/**
 * Create a default VIBEX.md file with instructions
 */
export async function createDefaultMemoryFile(baseDir: string): Promise<void> {
  const defaultContent = `# VIBEX.md - Memory File

This file serves as a memory context for the VibeX AI assistant.
Add information, instructions, or constraints here to guide the AI's behavior.

## Project Information

- Project Name: Your Project
- Description: Brief description of your project
- Author: Your Name

## Special Instructions

- Add any special instructions for the AI here
- Define constraints on how the AI should respond
- Specify preferred coding styles or conventions

## Sample Commands

- \`./vibex chat\` - Start interactive chat mode
- \`./vibex analyze <file>\` - Analyze a code file
- \`./vibex explain <file>\` - Explain what a code file does

## Configuration

You can customize VibeX by editing .vibex/config.json
`;

  try {
    const filePath = path.join(baseDir, 'VIBEX.md');
    if (!await fileExists(filePath)) {
      await fs.writeFile(filePath, defaultContent, 'utf-8');
      logger.info(`Created default VIBEX.md file at ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error creating default memory file: ${error}`);
    throw error;
  }
}

/**
 * Watch for changes in memory files
 */
/**
 * Watch for changes in memory files and trigger callback when they change
 * @param baseDir Base directory to watch
 * @param options Memory options
 * @param onChange Callback when files change
 * @returns Object with stop() method to stop watching
 */
export async function watchMemoryFiles(
  baseDir: string, 
  options: MemoryOptions = DEFAULT_OPTIONS,
  onChange: (result: MemoryLoadResult) => void
): Promise<{ stop: () => void }> {
  try {
    // Set up file watching for relevant paths
    let watchers: FSWatcher[] = [];
    // Debounce timer to prevent multiple reloads for rapid file changes
    let debounceTimer: NodeJS.Timeout;
    
    // We'll use Node's built-in fs.watch API
    const watchDir = async (dir: string) => {
    if (await directoryExists(dir)) {
      try {
        // Watch the directory for changes
        const watcher = watch(dir, { recursive: options.recursive }, async (_eventType: string, filename: string | null) => {
          if (!filename) {return;}
          // Check if this is a relevant file
          const ext = path.extname(filename).toLowerCase();
          const isMarkdown = options.includeMarkdownFiles && (ext === '.md' || ext === '.markdown');
          const isJson = options.includeJsonFiles && ext === '.json';
          const isText = options.includeTextFiles && ext === '.txt';
          
          // If it's a relevant file type or a known special file
          if (isMarkdown || isJson || isText || 
              filename.toUpperCase() === 'VIBEX.MD' ||
              filename.toUpperCase() === 'CLAUDE.MD' ||
              filename.toUpperCase() === 'GEMINI.MD') {
            
            // Debounce file change events to avoid rapid re-loading
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
              // Reload all memory files and notify
              try {
                logger.debug(`Memory file changed: ${filename}, reloading...`);
                const result = await loadMemoryFiles(baseDir, options);
                onChange(result);
              } catch (error) {
                logger.error(`Error reloading memory files after change: ${error}`);
              }
            }, 300); // 300ms debounce
          }
        });
        
        watchers.push(watcher);
      } catch (error) {
        logger.error(`Error setting up file watcher for ${dir}: ${error}`);
      }
    }
  };
  
  // Start watching the base directory
  watchDir(baseDir);
  
  // Watch .vibex directory if it exists
  if (options.includeVibexDir) {
    const vibexDir = path.join(baseDir, '.vibex');
    watchDir(vibexDir);
  }
  
    // Return function to stop all watchers
    return {
      stop: () => {
        watchers.forEach(watcher => {
          try {
            watcher.close();
          } catch (error) {
            logger.warn(`Error closing watcher: ${error}`);
          }
        });
        watchers = [];
      }
    };
  } catch (error) {
    logger.error(`Failed to set up memory file watching: ${error}`);
    // Return a dummy watcher that does nothing
    return {
      stop: () => {}
    };
  }
}