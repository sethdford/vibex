/**
 * @ Command Processor
 * 
 * Processes @ commands (e.g., @file, @dir, @search) that provide quick
 * access to file and directory operations.
 */

import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';
import type { AppConfigType } from '../config/schema.js';
import type { HistoryItem } from '../ui/types.js';
import { MessageType } from '../ui/types.js';

interface MessageWithMetadata extends HistoryItem {
  metadata?: Record<string, unknown>;
}

interface AtCommandResult {
  /** Whether to proceed with processing the command */
  shouldProceed: boolean;
  /** The processed query after handling the command */
  processedQuery?: string;
  /** Any additional metadata about the command execution */
  metadata?: Record<string, unknown>;
}

interface AtCommandOptions {
  /** The original query text with the @ command */
  query: string;
  /** Current configuration */
  config: AppConfigType;
  /** Function to add messages to the history */
  addItem: (item: Partial<MessageWithMetadata>, timestamp?: number) => void;
  /** Function to log debug messages */
  onDebugMessage: (message: string) => void;
  /** ID for the message being processed */
  messageId: number;
  /** AbortSignal to cancel the operation */
  signal: AbortSignal;
}

/**
 * Check if the query is an @ command
 */
export function isAtCommand(query: string): boolean {
  return /^@\w+/.test(query.trim());
}

/**
 * Get the @ command and arguments from a query
 */
function parseAtCommand(query: string): { command: string; args: string } {
  const match = query.trim().match(/^@(\w+)\s*(.*)/);
  if (!match) {
    return { command: '', args: '' };
  }
  return { command: match[1].toLowerCase(), args: match[2] };
}

/**
 * Process an @ command
 */
export async function handleAtCommand(
  command: string,
  config: AppConfigType
): Promise<AtCommandResult>;
export async function handleAtCommand(options: AtCommandOptions): Promise<AtCommandResult>;
export async function handleAtCommand(
  commandOrOptions: string | AtCommandOptions,
  config?: AppConfigType
): Promise<AtCommandResult> {
  // Handle both function signatures for backward compatibility
  let options: AtCommandOptions;
  if (typeof commandOrOptions === 'string') {
    // Legacy signature: handleAtCommand(command, config)
    options = {
      query: commandOrOptions,
      config: config!,
      addItem: () => {},
      onDebugMessage: () => {},
      messageId: 0,
      signal: new AbortController().signal
    };
  } else {
    // New signature: handleAtCommand(options)
    options = commandOrOptions;
  }
  
  const { query, config: optionsConfig, addItem, onDebugMessage, messageId, signal } = options;
  
  if (signal.aborted) {
    return { shouldProceed: false, processedQuery: '' };
  }
  
  const { command, args } = parseAtCommand(query);
  onDebugMessage(`Processing @${command} command with args: ${args}`);
  
  try {
    switch (command) {
      case 'file':
        return await handleFileCommand(args, options);
      case 'dir':
        return await handleDirCommand(args, options);
      case 'search':
        return await handleSearchCommand(args, options);
      case 'list':
        return await handleListCommand(args, options);
      default:
        // Unknown @ command, let the AI handle it
        addItem(
          { 
            type: MessageType.USER,
            text: query,
            metadata: { 
              command: `@${command}` 
            }
          },
          messageId
        );
        return { shouldProceed: true, processedQuery: query };
    }
  } catch (error) {
    logger.error(`Error processing @ command: ${error instanceof Error ? error.message : String(error)}`);
    addItem(
      { 
        type: MessageType.ERROR,
        text: `Error processing @${command}: ${error instanceof Error ? error.message : String(error)}`,
      },
      messageId
    );
    return { shouldProceed: false, processedQuery: '' };
  }
}

/**
 * Handle @file command to read file contents
 */
async function handleFileCommand(args: string, options: AtCommandOptions): Promise<AtCommandResult> {
  const { addItem, onDebugMessage, messageId } = options;
  
  if (!args) {
    addItem(
      { 
        type: MessageType.ERROR,
        text: 'Please specify a file path, e.g., @file /path/to/file.js',
      },
      messageId
    );
    return { shouldProceed: false, processedQuery: '' };
  }
  
  // Resolve the path (handling ~ for home directory)
  const filePath = resolvePath(args);
  onDebugMessage(`Reading file: ${filePath}`);
  
  try {
    // Check if file exists
    await fs.access(filePath);
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Get file extension for syntax highlighting
    const ext = path.extname(filePath).slice(1).toLowerCase();
    
    // Create a message with file content
    addItem(
      { 
        type: MessageType.USER,
        text: `Please analyze this file (${filePath}):\n\n\`\`\`${ext}\n${content}\n\`\`\``,
        metadata: { 
          file: filePath,
          operation: 'read'
        }
      },
      messageId
    );
    
    return { 
      shouldProceed: true, 
      processedQuery: `Please analyze this file (${filePath}):\n\n\`\`\`${ext}\n${content}\n\`\`\``,
      metadata: { file: filePath }
    };
  } catch (error) {
    addItem(
      { 
        type: MessageType.ERROR,
        text: `Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      },
      messageId
    );
    return { shouldProceed: false, processedQuery: '' };
  }
}

/**
 * Handle @dir command to list directory contents
 */
async function handleDirCommand(args: string, options: AtCommandOptions): Promise<AtCommandResult> {
  const { addItem, onDebugMessage, messageId } = options;
  
  // Default to current directory if no path provided
  const dirPath = args ? resolvePath(args) : process.cwd();
  onDebugMessage(`Listing directory: ${dirPath}`);
  
  try {
    // Check if directory exists
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      addItem(
        { 
          type: MessageType.ERROR,
          text: `${dirPath} is not a directory`,
        },
        messageId
      );
      return { shouldProceed: false, processedQuery: '' };
    }
    
    // Read directory contents
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Sort entries: directories first, then files
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) {return -1;}
      if (!a.isDirectory() && b.isDirectory()) {return 1;}
      return a.name.localeCompare(b.name);
    });
    
    // Format directory listing
    let listing = `Directory listing of ${dirPath}:\n\n`;
    
    // List directories
    const dirs = entries.filter(entry => entry.isDirectory());
    if (dirs.length > 0) {
      listing += 'Directories:\n';
      for (const dir of dirs) {
        listing += `📁 ${dir.name}/\n`;
      }
      listing += '\n';
    }
    
    // List files
    const files = entries.filter(entry => entry.isFile());
    if (files.length > 0) {
      listing += 'Files:\n';
      for (const file of files) {
        // Get file size
        const fileStat = await fs.stat(path.join(dirPath, file.name));
        const size = formatFileSize(fileStat.size);
        listing += `📄 ${file.name} (${size})\n`;
      }
    }
    
    // Create a message with directory listing
    addItem(
      { 
        type: MessageType.USER,
        text: `Please help me understand this directory:\n\n${listing}`,
        metadata: { 
          directory: dirPath,
          operation: 'list'
        }
      },
      messageId
    );
    
    return { 
      shouldProceed: true, 
      processedQuery: `Please help me understand this directory:\n\n${listing}`,
      metadata: { directory: dirPath }
    };
  } catch (error) {
    addItem(
      { 
        type: MessageType.ERROR,
        text: `Error listing directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
      },
      messageId
    );
    return { shouldProceed: false, processedQuery: '' };
  }
}

/**
 * Handle @search command to search for files or content
 */
async function handleSearchCommand(args: string, options: AtCommandOptions): Promise<AtCommandResult> {
  const { addItem, onDebugMessage, messageId } = options;
  
  if (!args) {
    addItem(
      { 
        type: MessageType.ERROR,
        text: 'Please specify a search pattern, e.g., @search "findMe" or @search -p "src/" -e "js,ts" "pattern"',
      },
      messageId
    );
    return { shouldProceed: false, processedQuery: '' };
  }
  
  // Parse search arguments
  const { searchDir, pattern, extensions } = parseSearchArgs(args);
  const resolvedDir = resolvePath(searchDir);
  
  onDebugMessage(`Searching in ${resolvedDir} for pattern "${pattern}" with extensions ${extensions.join(',') || 'all'}`);
  
  try {
    // Check if directory exists
    const stats = await fs.stat(resolvedDir);
    if (!stats.isDirectory()) {
      addItem(
        { 
          type: MessageType.ERROR,
          text: `${resolvedDir} is not a directory`,
        },
        messageId
      );
      return { shouldProceed: false, processedQuery: '' };
    }
    
    // Perform search (implementation depends on available tools)
    const searchResults = await performSearch(resolvedDir, pattern, extensions);
    
    if (searchResults.matches.length === 0) {
      addItem(
        { 
          type: MessageType.SYSTEM,
          text: `No matches found for "${pattern}" in ${resolvedDir}`,
        },
        messageId
      );
      return { shouldProceed: false, processedQuery: '' };
    }
    
    // Format search results
    let resultText = `Search results for "${pattern}" in ${resolvedDir}:\n\n`;
    
    for (const match of searchResults.matches) {
      resultText += `📄 ${match.file}${match.line ? `:${match.line}` : ''}\n`;
      if (match.content) {
        resultText += `   ${match.content.trim()}\n\n`;
      }
    }
    
    if (searchResults.truncated) {
      resultText += `\n(Results truncated, showing ${searchResults.matches.length} of ${searchResults.totalMatches} matches)`;
    }
    
    // Create a message with search results
    addItem(
      { 
        type: MessageType.USER,
        text: `Please help me understand these search results for "${pattern}":\n\n${resultText}`,
        metadata: { 
          searchPattern: pattern,
          searchDir: resolvedDir,
          operation: 'search'
        }
      },
      messageId
    );
    
    return { 
      shouldProceed: true, 
      processedQuery: `Please help me understand these search results for "${pattern}":\n\n${resultText}`,
      metadata: { searchPattern: pattern, searchDir: resolvedDir }
    };
  } catch (error) {
    addItem(
      { 
        type: MessageType.ERROR,
        text: `Error searching in ${resolvedDir}: ${error instanceof Error ? error.message : String(error)}`,
      },
      messageId
    );
    return { shouldProceed: false, processedQuery: '' };
  }
}

/**
 * Handle @list command to list available @ commands
 */
async function handleListCommand(args: string, options: AtCommandOptions): Promise<AtCommandResult> {
  const { addItem, messageId } = options;
  
  const commandList = `
Available @ commands:

@file <path>              - Read and analyze a file
@dir [path]               - List directory contents (defaults to current directory)
@search [options] <query> - Search for files or content
  Options:
    -p, --path <path>     - Directory to search in (defaults to current directory)
    -e, --ext <ext>       - File extensions to search (comma-separated, e.g., js,ts)
@list                     - Show this list of commands
`;
  
  addItem(
    { 
      type: MessageType.SYSTEM,
      text: commandList,
    },
    messageId
  );
  
  return { shouldProceed: false, processedQuery: '' };
}

/**
 * Parse search command arguments
 */
function parseSearchArgs(args: string): { searchDir: string; pattern: string; extensions: string[] } {
  // Default values
  let searchDir = '.';
  let pattern = '';
  let extensions: string[] = [];
  
  // Simple argument parsing
  const argParts = args.split(' ');
  for (let i = 0; i < argParts.length; i++) {
    const arg = argParts[i];
    
    if (arg === '-p' || arg === '--path') {
      if (i + 1 < argParts.length) {
        searchDir = argParts[i + 1];
        i++; // Skip the next argument
      }
    } else if (arg === '-e' || arg === '--ext') {
      if (i + 1 < argParts.length) {
        extensions = argParts[i + 1].split(',').map(ext => ext.trim());
        i++; // Skip the next argument
      }
    } else if (!pattern) {
      // First non-option argument is the pattern
      pattern = arg;
    }
  }
  
  return { searchDir, pattern, extensions };
}

/**
 * Perform a search in the directory
 */
async function performSearch(dir: string, pattern: string, extensions: string[]): Promise<{ matches: Array<{ file: string; line?: number; content?: string }>; truncated: boolean; totalMatches: number }> {
  // Implementation will depend on available search tools
  // For now, we'll use a simple recursive search
  const matches: Array<{ file: string; line?: number; content?: string }> = [];
  let totalMatches = 0;
  const maxMatches = 100; // Limit the number of matches to avoid overwhelming the response
  
  // Helper function to search recursively
  async function searchInDir(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (totalMatches >= maxMatches) {break;}
      
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);
      
      // Skip hidden files and directories
      if (entry.name.startsWith('.')) {continue;}
      
      // Skip node_modules
      if (entry.name === 'node_modules' || entry.name === '.git') {continue;}
      
      if (entry.isDirectory()) {
        await searchInDir(fullPath);
      } else if (entry.isFile()) {
        // Check file extension if extensions are specified
        if (extensions.length > 0) {
          const fileExt = path.extname(entry.name).slice(1).toLowerCase();
          if (!extensions.includes(fileExt)) {continue;}
        }
        
        // Check if filename matches pattern
        if (entry.name.includes(pattern)) {
          matches.push({ file: relativePath });
          totalMatches++;
          continue;
        }
        
        // Search file contents
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            if (totalMatches >= maxMatches) {break;}
            
            if (lines[i].includes(pattern)) {
              matches.push({
                file: relativePath,
                line: i + 1,
                content: lines[i]
              });
              totalMatches++;
            }
          }
        } catch (error) {
          // Skip files that can't be read
          logger.debug(`Error reading file ${fullPath}: ${error}`);
        }
      }
    }
  }
  
  await searchInDir(dir);
  
  return {
    matches,
    truncated: totalMatches > maxMatches,
    totalMatches
  };
}

/**
 * Format file size in bytes to a human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

/**
 * Resolve a path, handling ~ for home directory
 */
function resolvePath(inputPath: string): string {
  if (inputPath.startsWith('~')) {
    return path.join(process.env.HOME || process.env.USERPROFILE || '', inputPath.slice(1));
  }
  return path.resolve(inputPath);
}