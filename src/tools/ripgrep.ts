/**
 * Ripgrep Tool - High Performance Code Search Engine
 * 
 * This module provides a unified interface for fast, efficient code searching
 * across an entire codebase. Features include:
 * 
 * - Primary implementation using ripgrep (rg) for maximum performance
 * - Automatic fallback to standard grep when ripgrep isn't available
 * - Consistent output formatting and error handling
 * - Support for case sensitivity options and result limiting
 * - Robust error handling with clear error messages
 * - Tool-compatible interface for integration with AI assistants
 * 
 * The search functionality is critical for code navigation, analysis, and
 * understanding large codebases during development activities.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface RipgrepTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  handler: (input: any) => Promise<string>;
}

/**
 * Create the ripgrep tool
 */
export function createRipgrepTool(): RipgrepTool {
  return {
    name: 'search_code',
    description: 'Search for text patterns in files using ripgrep',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The text pattern to search for'
        },
        path: {
          type: 'string',
          description: 'Directory or file path to search in',
          default: '.'
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Whether the search should be case sensitive',
          default: false
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50
        }
      },
      required: ['pattern']
    },
    handler: async (input: {
      pattern: string;
      path?: string;
      case_sensitive?: boolean;
      max_results?: number;
    }) => {
      const {
        pattern,
        path: searchPath = '.',
        case_sensitive = false,
        max_results = 50
      } = input;

      logger.debug(`Searching for pattern: "${pattern}" in ${searchPath}`);

      try {
        // Try ripgrep first (faster and better)
        const result = await searchWithRipgrep(pattern, searchPath, case_sensitive, max_results);
        return result;
      } catch (ripgrepError) {
        logger.debug('Ripgrep failed, falling back to grep');
        
        try {
          // Fallback to standard grep
          const result = await searchWithGrep(pattern, searchPath, case_sensitive, max_results);
          return result;
        } catch (grepError) {
          logger.error('Both ripgrep and grep failed:', grepError);
          return `Search failed: ${grepError instanceof Error ? grepError.message : String(grepError)}`;
        }
      }
    }
  };
}

/**
 * Search using ripgrep
 */
async function searchWithRipgrep(
  pattern: string,
  searchPath: string,
  caseSensitive: boolean,
  maxResults: number
): Promise<string> {
  const flags = [
    '--line-number',
    '--heading',
    '--color=never',
    `--max-count=${maxResults}`,
    caseSensitive ? '--case-sensitive' : '--smart-case'
  ];

  const command = `rg ${flags.join(' ')} "${pattern}" "${searchPath}"`;
  
  const { stdout, stderr } = await execAsync(command);
  
  if (stderr && !stdout) {
    throw new Error(stderr);
  }
  
  if (!stdout.trim()) {
    return `No matches found for pattern: "${pattern}"`;
  }
  
  return formatSearchResults(stdout, 'ripgrep');
}

/**
 * Search using standard grep
 */
async function searchWithGrep(
  pattern: string,
  searchPath: string,
  caseSensitive: boolean,
  maxResults: number
): Promise<string> {
  const flags = [
    '-n',  // line numbers
    '-r',  // recursive
    '--color=never',
    caseSensitive ? '' : '-i'  // case insensitive
  ].filter(Boolean);

  const command = `grep ${flags.join(' ')} "${pattern}" "${searchPath}" | head -${maxResults}`;
  
  const { stdout, stderr } = await execAsync(command);
  
  if (stderr && !stdout) {
    throw new Error(stderr);
  }
  
  if (!stdout.trim()) {
    return `No matches found for pattern: "${pattern}"`;
  }
  
  return formatSearchResults(stdout, 'grep');
}

/**
 * Format search results for better readability
 */
function formatSearchResults(output: string, tool: string): string {
  const lines = output.trim().split('\n');
  const totalMatches = lines.length;
  
  if (totalMatches === 0) {
    return 'No matches found.';
  }
  
  const formatted = lines
    .slice(0, 50) // Limit to 50 results for readability
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  const truncated = totalMatches > 50 ? ` (showing first 50 of ${totalMatches} matches)` : '';
  
  return `Search Results${truncated}:\n\n${formatted}`;
}