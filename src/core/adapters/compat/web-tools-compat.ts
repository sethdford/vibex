/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Backward compatibility layer for web tools
 * 
 * This module provides functions that match the API of the legacy web tools
 * but internally use the new architecture.
 */

import { toolAPI } from '../../domain/tool/tool-api';
import { LiveFeedbackCallbacks } from '../../../ui/components/LiveToolFeedback';
import { InternalToolResult } from '../../../tools';

/**
 * Legacy compatible web_fetch function
 */
export async function executeWebFetch(input: any): Promise<InternalToolResult> {
  try {
    const result = await toolAPI.executeTool('web_fetch', {
      prompt: input.prompt,
      max_urls: input.max_urls,
      extract_text_only: input.extract_text_only
    });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Unknown error'
      };
    }
    
    return {
      success: true,
      result: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

interface WebSearchResults {
  raw_results: any[];
}

/**
 * Legacy compatible WebSearchManager class
 */
export class WebSearchManagerCompat {
  /**
   * Search the web using the new architecture
   */
  async search(query: string, options: any = {}) {
    try {
      const result = await toolAPI.executeTool('web_search', {
        query,
        engine: options.engine,
        max_results: options.maxResults || options.limit,
        region: options.region,
        recency: options.recency
      });
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Search failed');
      }
      
      return (result.data as WebSearchResults).raw_results;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Format search results as markdown
   */
  formatResultsAsMarkdown(results: any[]) {
    if (results.length === 0) {
      return 'No search results found.';
    }
    
    let markdown = '### Web Search Results\n\n';
    
    for (const [i, result] of results.entries()) {
      markdown += `**${i + 1}. [${result.title}](${result.url})**\n`;
      markdown += `${result.snippet}\n`;
      
      if (result.source) {
        markdown += `*Source: ${result.source}`;
        if (result.publishedDate) {
          markdown += ` • ${new Date(result.publishedDate).toLocaleDateString()}`;
        }
        markdown += '*\n';
      }
      
      markdown += '\n';
    }
    
    return markdown;
  }
  
  /**
   * Get available search engines
   */
  getAvailableEngines() {
    // This is a simplification - in reality, we should get this from the tool
    return ['duckduckgo', 'google'];
  }
}

/**
 * Legacy compatible web search initialization
 */
export async function initWebSearch(config: Record<string, unknown>): Promise<WebSearchManagerCompat> {
  return new WebSearchManagerCompat();
}