/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebFetchTool } from '../web-fetch-adapter';
import { WebSearchTool } from '../web-search-adapter';

// Mock the legacy web-fetch tool
vi.mock('../../../../tools/web-fetch', () => ({
  executeWebFetch: vi.fn().mockImplementation(async (input) => {
    if (!input.prompt || input.prompt.trim().length === 0) {
      return {
        success: false,
        error: 'Empty prompt provided'
      };
    }
    
    // Extract URLs from the prompt
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urls = input.prompt.match(urlRegex) || [];
    
    if (urls.length === 0) {
      return {
        success: true,
        result: 'No URLs found in the prompt.'
      };
    }
    
    let result = '';
    for (const url of urls.slice(0, input.max_urls || 5)) {
      if (url.includes('error')) {
        result += `**${url}**\nError: Failed to fetch content\n\n`;
      } else {
        result += `**${url}**\nFetched content from ${url}\n\n`;
      }
    }
    
    return {
      success: true,
      result
    };
  })
}));

// Mock the WebSearchManager class
class MockWebSearchManager {
  search(query: string, options = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Empty query');
    }
    
    if (query === 'error') {
      throw new Error('Search failed');
    }
    
    return Promise.resolve([
      {
        title: 'Test Result 1',
        url: 'https://example.com/1',
        snippet: 'This is test result 1',
        source: 'example.com',
        publishedDate: '2023-01-01'
      },
      {
        title: 'Test Result 2',
        url: 'https://example.com/2',
        snippet: 'This is test result 2',
        source: 'example.com'
      }
    ]);
  }
  
  formatResultsAsMarkdown(results: any[]) {
    return '### Web Search Results\n\n**1. [Test Result 1](https://example.com/1)**\nThis is test result 1\n*Source: example.com*\n\n**2. [Test Result 2](https://example.com/2)**\nThis is test result 2\n*Source: example.com*\n';
  }
  
  getAvailableEngines() {
    return ['google', 'duckduckgo'];
  }
}

// Mock the initWebSearch function
vi.mock('../../../../tools/web-search', () => ({
  WebSearchManager: MockWebSearchManager,
  initWebSearch: vi.fn().mockImplementation(() => Promise.resolve(new MockWebSearchManager()))
}));

describe('Web Tool Adapters', () => {
  describe('WebFetchTool', () => {
    let webFetchTool: WebFetchTool;

    beforeEach(() => {
      webFetchTool = new WebFetchTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(webFetchTool.validateParams({
        prompt: 'Analyze https://example.com and summarize the content'
      })).toBeNull();
      
      // Missing required params
      expect(webFetchTool.validateParams({})).not.toBeNull();
      
      // Invalid type
      expect(webFetchTool.validateParams({
        prompt: 123
      })).not.toBeNull();
      
      // Empty prompt
      expect(webFetchTool.validateParams({
        prompt: ''
      })).not.toBeNull();
      
      // No URLs in prompt
      expect(webFetchTool.validateParams({
        prompt: 'Analyze this content'
      })).not.toBeNull();
      
      // Invalid max_urls
      expect(webFetchTool.validateParams({
        prompt: 'Analyze https://example.com',
        max_urls: 'five'
      })).not.toBeNull();
      
      expect(webFetchTool.validateParams({
        prompt: 'Analyze https://example.com',
        max_urls: 0
      })).not.toBeNull();
      
      expect(webFetchTool.validateParams({
        prompt: 'Analyze https://example.com',
        max_urls: 30
      })).not.toBeNull();
    });

    it('should execute and return success result', async () => {
      const result = await webFetchTool.execute({
        prompt: 'Analyze https://example.com/1 and https://example.com/2',
        max_urls: 2
      });
      
      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('https://example.com/1');
      expect(result.data).toContain('https://example.com/2');
    });

    it('should handle URLs with errors', async () => {
      const result = await webFetchTool.execute({
        prompt: 'Analyze https://error.com',
        extract_text_only: true
      });
      
      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Error:');
    });

    it('should handle execution errors', async () => {
      const result = await webFetchTool.execute({
        prompt: ''
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('WebSearchTool', () => {
    let webSearchTool: WebSearchTool;

    beforeEach(async () => {
      const searchManager = new MockWebSearchManager();
      webSearchTool = new WebSearchTool(searchManager);
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(webSearchTool.validateParams({
        query: 'artificial intelligence'
      })).toBeNull();
      
      // Missing required params
      expect(webSearchTool.validateParams({})).not.toBeNull();
      
      // Invalid type
      expect(webSearchTool.validateParams({
        query: 123
      })).not.toBeNull();
      
      // Empty query
      expect(webSearchTool.validateParams({
        query: ''
      })).not.toBeNull();
      
      // Invalid engine
      expect(webSearchTool.validateParams({
        query: 'AI',
        engine: 'bing'
      })).not.toBeNull();
      
      // Valid engine
      expect(webSearchTool.validateParams({
        query: 'AI',
        engine: 'google'
      })).toBeNull();
      
      // Invalid max_results
      expect(webSearchTool.validateParams({
        query: 'AI',
        max_results: 20
      })).not.toBeNull();
      
      expect(webSearchTool.validateParams({
        query: 'AI',
        max_results: 0
      })).not.toBeNull();
      
      // Invalid recency
      expect(webSearchTool.validateParams({
        query: 'AI',
        recency: 'invalid'
      })).not.toBeNull();
      
      // Valid recency
      expect(webSearchTool.validateParams({
        query: 'AI',
        recency: 'day'
      })).toBeNull();
    });

    it('should check for sensitive queries', async () => {
      // Non-sensitive query
      expect(await webSearchTool.shouldConfirmExecute({
        query: 'artificial intelligence trends'
      })).toBeNull();
      
      // Sensitive query
      const confirmation = await webSearchTool.shouldConfirmExecute({
        query: 'How to find my password'
      });
      
      expect(confirmation).not.toBeNull();
      expect(confirmation?.type).toBe('warning');
    });

    it('should execute and return success result', async () => {
      const result = await webSearchTool.execute({
        query: 'artificial intelligence',
        engine: 'google',
        max_results: 5
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as any;
      expect(data.markdown).toContain('Web Search Results');
      expect(data.raw_results).toHaveLength(2);
      expect(data.query).toBe('artificial intelligence');
      expect(data.engine).toBe('google');
    });

    it('should handle search errors', async () => {
      const result = await webSearchTool.execute({
        query: 'error'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});