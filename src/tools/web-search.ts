/**
 * Web Search Tool
 * 
 * Provides internet search capabilities using various search engines API.
 * This tool allows the AI to search the web for current information and context.
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { telemetry, TelemetryEventType } from '../telemetry/index.js';

// Search engine API interface
export interface SearchEngineApi {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  name(): string;
}

// Search result interface
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedDate?: string;
}

// Search options interface
export interface SearchOptions {
  maxResults?: number;
  limit?: number;
  safeSearch?: boolean;
  region?: string;
  engine?: string;
  recency?: 'day' | 'week' | 'month' | 'year' | 'all';
  additionalParams?: Record<string, string>;
}

/**
 * Web search config interface
 */
export interface WebSearchConfig {
  [key: string]: unknown;
}

/**
 * Search result item interface
 */
export interface SearchResultItem {
  title?: string;
  link?: string;
  snippet?: string;
}

/**
 * Search topic interface
 */
export interface SearchTopic {
  Text?: string;
  FirstURL?: string;
  [key: string]: unknown;
}

/**
 * Google search result item interface
 */
export interface GoogleSearchItem {
  title?: string;
  link?: string;
  snippet?: string;
  displayLink?: string;
  pagemap?: {
    metatags?: Array<{
      'article:published_time'?: string;
      [key: string]: string | undefined;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

class GoogleSearchApi implements SearchEngineApi {
  private readonly apiKey: string;
  private readonly cx: string;
  
  constructor(apiKey: string, cx: string) {
    this.apiKey = apiKey;
    this.cx = cx;
  }
  
  name(): string {
    return 'Google';
  }
  
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.cx,
          q: query,
          num: options.limit || 5,
          safe: options.safeSearch ? 'active' : 'off',
          gl: options.region || 'us',
          ...options.additionalParams
        },
        timeout: 10000
      });
      
      if (!response.data.items || !Array.isArray(response.data.items)) {
        return [];
      }
      
      return response.data.items.map((item: GoogleSearchItem) => ({
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
        source: item.displayLink || '',
        publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'] || ''
      }));
    } catch (error) {
      logger.error('Google search API error', error);
      throw createUserError('Failed to perform Google search', {
        category: ErrorCategory.EXTERNAL_SERVICE,
        cause: error,
        resolution: 'Check your API key and internet connection'
      });
    }
  }
}

/**
 * DuckDuckGo API implementation (unofficial)
 */
class DuckDuckGoApi implements SearchEngineApi {
  name(): string {
    return 'DuckDuckGo';
  }
  
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const response = await fetch(url);
      const data = await response.json() as any;
      
      const results: SearchResult[] = [];
      
      // Process abstract
      if (data.Abstract) {
        results.push({
          title: data.AbstractText || 'DuckDuckGo Abstract',
          url: data.AbstractURL || 'https://duckduckgo.com',
          snippet: data.Abstract,
          source: 'duckduckgo.com',
          publishedDate: ''
        });
      }
      
      // Process related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, options.maxResults || 10).forEach((topic: any) => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || '',
              url: topic.FirstURL,
              snippet: topic.Text,
              source: new URL(topic.FirstURL).hostname
            });
          }
        });
      }
      
      return results;
    } catch (error) {
      logger.error('DuckDuckGo search error:', error);
      return [];
    }
  }
}

/**
 * Web Search Manager
 */
export class WebSearchManager {
  private readonly apiKey?: string;
  private readonly cx?: string;
  private readonly engines: Map<string, SearchEngineApi> = new Map();
  private readonly config: WebSearchConfig;
  
  constructor(config: Record<string, unknown> = {}) {
    this.config = config;
    this.apiKey = (config.search as { apiKey?: string })?.apiKey;
    this.cx = (config.search as { cx?: string })?.cx;
    
    // Initialize search engines
    this.initializeEngines();
  }
  
  /**
   * Initialize available search engines based on configuration
   */
  private initializeEngines(): void {
    // Add DuckDuckGo as fallback (doesn't require API key)
    this.engines.set('duckduckgo', new DuckDuckGoApi());
    
    // Add Google if API key is configured
    if (this.apiKey && this.cx) {
      this.engines.set('google', new GoogleSearchApi(this.apiKey, this.cx));
      logger.info('Google Search API initialized');
    } else {
      logger.info('Google Search API not configured, using DuckDuckGo as default');
    }
  }
  
  /**
   * Perform a web search
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const engineName = options.engine || (this.config.search as { defaultEngine?: string })?.defaultEngine || 'duckduckgo';
    const engine = this.engines.get(engineName.toLowerCase());
    
    if (!engine) {
      throw createUserError(`Search engine "${engineName}" is not available`, {
        category: ErrorCategory.CONFIGURATION,
        resolution: `Available engines: ${Array.from(this.engines.keys()).join(', ')}`
      });
    }
    
    logger.info(`Performing web search with ${engine.name()}`, { query });
    const startTime = Date.now();
    
    try {
      const results = await engine.search(query, options);
      
      const duration = Date.now() - startTime;
      logger.debug(`Web search completed in ${duration}ms, found ${results.length} results`);
      
      // Track search in telemetry
      telemetry.trackEvent(TelemetryEventType.WEB_SEARCH, {
        query,
        resultCount: results.length,
        duration,
        engine: engineName,
        success: true
      });
      
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed search in telemetry
      telemetry.trackEvent(TelemetryEventType.WEB_SEARCH, {
        query,
        error: error instanceof Error ? error.message : String(error),
        duration,
        engine: engineName,
        success: false
      });
      
      throw error;
    }
  }
  
  /**
   * Format search results as markdown
   */
  formatResultsAsMarkdown(results: SearchResult[]): string {
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
  getAvailableEngines(): string[] {
    return Array.from(this.engines.keys());
  }
}

/**
 * Initialize the web search manager
 */
export async function initWebSearch(config: Record<string, unknown>): Promise<WebSearchManager> {
  logger.info('Initializing web search tools');
  return new WebSearchManager(config);
}