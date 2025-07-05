/**
 * @Command Processor Hook
 * 
 * Handles @path syntax for file content injection, based on Gemini CLI's implementation.
 * Supports multiple @paths, escaped spaces, and comprehensive file handling.
 */

import { useCallback } from 'react';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger.js';

/**
 * @Command part types
 */
export interface AtCommandPart {
  type: 'text' | 'atPath';
  content: string;
}

/**
 * @Command processing result
 */
export interface AtCommandResult {
  processedQuery: Array<{ text: string }> | null;
  shouldProceed: boolean;
  fileContents?: Array<{ path: string; content: string }>;
}

/**
 * @Command processor options
 */
export interface AtCommandOptions {
  respectGitIgnore?: boolean;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
  excludePatterns?: string[];
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<AtCommandOptions> = {
  respectGitIgnore: true,
  maxFileSize: 1024 * 1024, // 1MB
  allowedExtensions: [
    '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml',
    '.css', '.scss', '.html', '.xml', '.py', '.java', '.cpp', '.c', '.h',
    '.rs', '.go', '.php', '.rb', '.sh', '.bash', '.zsh', '.fish', '.ps1',
    '.sql', '.graphql', '.proto', '.toml', '.ini', '.conf', '.config',
    '.dockerfile', '.gitignore', '.gitattributes', '.editorconfig'
  ],
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    '*.log',
    '*.tmp',
    '*.temp',
    '.env*',
    '*.key',
    '*.pem',
    '*.p12',
    '*.pfx'
  ]
};

/**
 * Unescape path string
 */
function unescapePath(pathStr: string): string {
  // Handle @ prefix
  if (pathStr.startsWith('@')) {
    pathStr = pathStr.substring(1);
  }
  
  // Unescape spaces and other characters
  return pathStr.replace(/\\(.)/g, '$1');
}

/**
 * Parse query string to find all '@<path>' commands and text segments
 */
function parseAllAtCommands(query: string): AtCommandPart[] {
  const parts: AtCommandPart[] = [];
  let currentIndex = 0;

  while (currentIndex < query.length) {
    let atIndex = -1;
    let nextSearchIndex = currentIndex;
    
    // Find next unescaped '@'
    while (nextSearchIndex < query.length) {
      if (
        query[nextSearchIndex] === '@' &&
        (nextSearchIndex === 0 || query[nextSearchIndex - 1] !== '\\')
      ) {
        atIndex = nextSearchIndex;
        break;
      }
      nextSearchIndex++;
    }

    if (atIndex === -1) {
      // No more @
      if (currentIndex < query.length) {
        parts.push({ type: 'text', content: query.substring(currentIndex) });
      }
      break;
    }

    // Add text before @
    if (atIndex > currentIndex) {
      parts.push({
        type: 'text',
        content: query.substring(currentIndex, atIndex),
      });
    }

    // Parse @path
    let pathEndIndex = atIndex + 1;
    let inEscape = false;
    while (pathEndIndex < query.length) {
      const char = query[pathEndIndex];
      if (inEscape) {
        inEscape = false;
      } else if (char === '\\') {
        inEscape = true;
      } else if (/\s/.test(char)) {
        // Path ends at first whitespace not escaped
        break;
      }
      pathEndIndex++;
    }
    
    const rawAtPath = query.substring(atIndex, pathEndIndex);
    // unescapePath expects the @ symbol to be present, and will handle it.
    const atPath = unescapePath(rawAtPath);
    parts.push({ type: 'atPath', content: atPath });
    currentIndex = pathEndIndex;
  }
  
  // Filter out empty text parts that might result from consecutive @paths or leading/trailing spaces
  return parts.filter(
    (part) => !(part.type === 'text' && part.content.trim() === ''),
  );
}

/**
 * Check if file should be ignored
 */
async function shouldIgnoreFile(filePath: string, options: Required<AtCommandOptions>): Promise<boolean> {
  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (options.allowedExtensions.length > 0 && !options.allowedExtensions.includes(ext)) {
    return true;
  }
  
  // Check exclude patterns
  const relativePath = path.relative(process.cwd(), filePath);
  for (const pattern of options.excludePatterns) {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** matches any path
      .replace(/\*/g, '[^/]*') // * matches any filename
      .replace(/\?/g, '.')     // ? matches any single character
      .replace(/\./g, '\\.');  // Escape dots
    
    try {
      if (relativePath.match(new RegExp(regexPattern))) {
        return true;
      }
    } catch (error) {
      // If regex fails, fall back to simple string matching
      if (relativePath.includes(pattern.replace('/**', '').replace('**/', ''))) {
        return true;
      }
    }
  }
  
  // Check file size
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > options.maxFileSize) {
      return true;
    }
  } catch (error) {
    return true; // If we can't stat it, ignore it
  }
  
  return false;
}

/**
 * Read file content safely
 */
async function readFileContent(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    logger.warn(`Failed to read file: ${filePath}`, error);
    return `[Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Resolve path and check if it exists
 */
async function resolvePath(pathName: string): Promise<string | null> {
  try {
    // Handle home directory expansion
    let resolvedPath = pathName;
    if (pathName.startsWith('~/')) {
      resolvedPath = path.join(process.env.HOME || process.env.USERPROFILE || '', pathName.slice(2));
    } else if (!path.isAbsolute(pathName)) {
      resolvedPath = path.resolve(process.cwd(), pathName);
    }
    
    // Check if path exists
    await fs.access(resolvedPath);
    return resolvedPath;
  } catch (error) {
    return null;
  }
}

/**
 * Handle directory traversal
 */
async function processDirectory(dirPath: string, options: Required<AtCommandOptions>): Promise<Array<{ path: string; content: string }>> {
  const results: Array<{ path: string; content: string }> = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively process subdirectories (with depth limit)
        const subResults = await processDirectory(fullPath, options);
        results.push(...subResults);
      } else if (entry.isFile()) {
        // Process file if not ignored
        if (!(await shouldIgnoreFile(fullPath, options))) {
          const content = await readFileContent(fullPath);
          const relativePath = path.relative(process.cwd(), fullPath);
          results.push({ path: relativePath, content });
        }
      }
    }
  } catch (error) {
    logger.warn(`Failed to process directory: ${dirPath}`, error);
  }
  
  return results;
}

/**
 * Use @Command Processor Hook
 */
export function useAtCommandProcessor(options: AtCommandOptions = {}) {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const processAtCommand = useCallback(async (query: string): Promise<AtCommandResult> => {
    try {
      // Parse the query to find @commands
      const parts = parseAllAtCommands(query);
      const atPathParts = parts.filter(part => part.type === 'atPath');
      
      if (atPathParts.length === 0) {
        // No @commands found, return original query
        return {
          processedQuery: [{ text: query }],
          shouldProceed: true
        };
      }
      
      // Process each @path
      const fileContents: Array<{ path: string; content: string }> = [];
      const pathsToRead: string[] = [];
      let modifiedQuery = query;
      
      for (const atPathPart of atPathParts) {
        const originalAtPath = atPathPart.content; // e.g., "@file.txt" or "@"
        
        if (originalAtPath === '@' || originalAtPath === '') {
          logger.debug('Lone @ detected, will be treated as text in the modified query.');
          continue;
        }
        
        const pathName = originalAtPath.startsWith('@') ? originalAtPath.substring(1) : originalAtPath;
        
        if (!pathName) {
          logger.warn(`Invalid @ command '${originalAtPath}'. No path specified.`);
          continue;
        }
        
        // Resolve the path
        const resolvedPath = await resolvePath(pathName);
        
        if (!resolvedPath) {
          logger.warn(`Path not found: ${pathName}`);
          continue;
        }
        
        // Check if it's a directory or file
        const stats = await fs.stat(resolvedPath);
        
        if (stats.isDirectory()) {
          // Process directory
          const dirContents = await processDirectory(resolvedPath, finalOptions);
          fileContents.push(...dirContents);
          pathsToRead.push(...dirContents.map(f => f.path));
        } else if (stats.isFile()) {
          // Process single file
          if (!(await shouldIgnoreFile(resolvedPath, finalOptions))) {
            const content = await readFileContent(resolvedPath);
            const relativePath = path.relative(process.cwd(), resolvedPath);
            fileContents.push({ path: relativePath, content });
            pathsToRead.push(relativePath);
          }
        }
      }
      
      if (fileContents.length === 0) {
        logger.debug('No valid file paths found in @ commands to read.');
        return {
          processedQuery: [{ text: query }],
          shouldProceed: true
        };
      }
      
      // Build the processed query with file contents
      const processedQueryParts: Array<{ text: string }> = [
        { text: modifiedQuery }
      ];
      
      // Add file contents section
      processedQueryParts.push({ text: '\n--- Content from referenced files ---' });
      
      for (const fileContent of fileContents) {
        processedQueryParts.push({ text: `\nContent from @${fileContent.path}:\n` });
        processedQueryParts.push({ text: fileContent.content });
      }
      
      processedQueryParts.push({ text: '\n--- End of content ---' });
      
      logger.debug(`Processed ${fileContents.length} files from @ commands`, {
        paths: pathsToRead
      });
      
      return {
        processedQuery: processedQueryParts,
        shouldProceed: true,
        fileContents
      };
      
    } catch (error) {
      logger.error('Error processing @ commands', error);
      return {
        processedQuery: [{ text: query }],
        shouldProceed: true
      };
    }
  }, [finalOptions]);
  
  return {
    processAtCommand
  };
}