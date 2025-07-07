/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult, ToolConfirmationDetails } from '../../domain/tool';
import { WebSearchManager, SearchOptions, SearchResult } from '../../../tools/web-search';
import { logger } from '../../../utils/logger.js';
import { createUserError } from '../../../errors/formatter.js';
import { ErrorCategory } from '../../../errors/types.js';

/**
 * Adapter for the web_search tool to the new architecture
 * 
 * This tool provides internet search capabilities using various search engines,
 * allowing the AI to search the web for current information.
 */
export class WebSearchTool extends BaseTool {
  private searchManager: WebSearchManager;
  private defaultEngine: string;
  private maxResults: number;

  constructor(searchManager: WebSearchManager) {
    super(
      'web_search',
      'Search the web for current information using various search engines',
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to send to the search engine'
          },
          engine: {
            type: 'string',
            description: 'Search engine to use (google, duckduckgo)',
            enum: searchManager.getAvailableEngines()
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5,
            minimum: 1,
            maximum: 10
          },
          region: {
            type: 'string',
            description: 'Region code for localized results (e.g., "us", "uk", "ca")',
            default: 'us'
          },
          recency: {
            type: 'string',
            description: 'Filter results by recency',
            enum: ['day', 'week', 'month', 'year', 'all'],
            default: 'all'
          }
        },
        required: ['query']
      },
      {
        requiresConfirmation: false,
        tags: ['web', 'external']
      }
    );
    
    this.searchManager = searchManager;
    this.defaultEngine = searchManager.getAvailableEngines()[0] || 'duckduckgo';
    this.maxResults = 5;
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { 
      query, 
      engine = this.defaultEngine,
      max_results = this.maxResults,
      region = 'us',
      recency = 'all'
    } = params as {
      query: string,
      engine?: string,
      max_results?: number,
      region?: string,
      recency?: 'day' | 'week' | 'month' | 'year' | 'all'
    };
    
    try {
      // Setup progress reporting
      if (options?.onProgress) {
        options.onProgress({
          message: `Searching for "${query}" using ${engine}...`,
          percentage: 30
        });
      }
      
      // Perform the search
      const searchOptions: SearchOptions = {
        maxResults: max_results,
        limit: max_results,
        engine,
        region,
        recency,
        safeSearch: true
      };
      
      const results = await this.searchManager.search(query, searchOptions);
      
      // Update progress
      if (options?.onProgress) {
        options.onProgress({
          message: `Found ${results.length} results`,
          percentage: 70
        });
      }
      
      // Format results as markdown
      const formattedResults = this.searchManager.formatResultsAsMarkdown(results);
      
      // Final progress update
      if (options?.onProgress) {
        options.onProgress({
          message: 'Search completed',
          percentage: 100
        });
      }
      
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        data: {
          markdown: formattedResults,
          raw_results: results,
          query,
          engine,
          result_count: results.length
        } as unknown,
        success: true,
        metadata: {
          resultCount: results.length,
          engine
        }
      } as ToolResult;
    } catch (error) {
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        success: false,
        data: undefined
      } as ToolResult;
    }
  }

  validateParams(params: unknown): string | null {
    if (typeof params !== 'object' || params === null) {
      return 'Parameters must be an object';
    }
    
    const { query } = params as { query?: unknown };
    
    if (!query) {
      return 'Missing required parameter: query';
    }
    
    if (typeof query !== 'string') {
      return 'query must be a string';
    }
    
    if (query.trim().length === 0) {
      return 'query cannot be empty';
    }
    
    // Validate engine if provided
    const { engine } = params as { engine?: unknown };
    if (engine !== undefined && typeof engine === 'string') {
      const availableEngines = this.searchManager.getAvailableEngines();
      if (!availableEngines.includes(engine.toLowerCase())) {
        return `Invalid search engine: ${engine}. Available engines: ${availableEngines.join(', ')}`;
      }
    }
    
    // Validate max_results if provided
    const { max_results } = params as { max_results?: unknown };
    if (max_results !== undefined) {
      if (typeof max_results !== 'number') {
        return 'max_results must be a number';
      }
      if (max_results < 1 || max_results > 10) {
        return 'max_results must be between 1 and 10';
      }
    }
    
    // Validate recency if provided
    const { recency } = params as { recency?: unknown };
    if (recency !== undefined && typeof recency === 'string') {
      const validRecency = ['day', 'week', 'month', 'year', 'all'];
      if (!validRecency.includes(recency)) {
        return `Invalid recency value: ${recency}. Valid values: ${validRecency.join(', ')}`;
      }
    }
    
    return null;
  }

  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    const { query } = params as { query: string };
    
    // Check if query might be sensitive or personal
    const sensitiveTerms = ['password', 'social security', 'credit card', 'address', 'phone number', 'secret'];
    const mightBeSensitive = sensitiveTerms.some(term => query.toLowerCase().includes(term));
    
    if (mightBeSensitive) {
      return {
        title: 'Confirm potentially sensitive web search',
        description: `Your query may contain sensitive information. Are you sure you want to search for: "${query}"?`,
        type: 'warning',
        params: params as Record<string, unknown>
      };
    }
    
    return null; // No confirmation needed for normal searches
  }
}