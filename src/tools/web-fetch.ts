/**
 * Web Fetch Tool
 * 
 * Allows Claude to fetch and process content from web URLs.
 * Supports multiple URLs, content extraction, and summarization.
 */

import type { ToolDefinition, InternalToolResult } from './index.js';
import { logger } from '../utils/logger.js';

export function createWebFetchTool(): ToolDefinition {
  return {
    name: 'web_fetch',
    description: 'Fetch and process content from web URLs',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Comprehensive prompt that includes URL(s) and processing instructions'
        },
        max_urls: {
          type: 'number',
          description: 'Maximum number of URLs to process (default: 5, max: 20)',
          default: 5
        },
        extract_text_only: {
          type: 'boolean',
          description: 'Whether to extract only text content (default: true)',
          default: true
        }
      },
      required: ['prompt']
    }
  };
}

/**
 * Web fetch input interface
 */
export interface WebFetchInput {
  prompt?: string;
  max_urls?: number;
  extract_text_only?: boolean;
  url?: string;
  [key: string]: unknown;
}

export async function executeWebFetch(input: WebFetchInput): Promise<InternalToolResult> {
  try {
    // Extract and validate input parameters with proper typing
    const prompt = input.prompt as string;
    const max_urls = typeof input.max_urls === 'number' ? input.max_urls : 5;
    const extract_text_only = typeof input.extract_text_only === 'boolean' ? input.extract_text_only : true;
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('prompt parameter is required and must be a string');
    }
    
    // Extract URLs from the prompt
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urls = prompt.match(urlRegex) || [];
    
    if (urls.length === 0) {
      return {
        success: true,
        result: 'No URLs found in the prompt.'
      };
    }
    
    // Limit the number of URLs to process
    const limitedUrls = urls.slice(0, Math.min(max_urls, 20));
    
    logger.info(`Fetching content from ${limitedUrls.length} URL(s)`);
    
    // Fetch content from each URL
    const fetchPromises = limitedUrls.map(async (url: string) => fetchUrlContent(url, extract_text_only));
    const results = await Promise.allSettled(fetchPromises);
    
    let response = '';
    results.forEach((result: PromiseSettledResult<string>, index: number) => {
      const url = limitedUrls[index];
      if (result.status === 'fulfilled') {
        response += `**${url}**\n${result.value}\n\n`;
      } else {
        response += `**${url}**\nError: ${result.reason}\n\n`;
      }
    });
    
    // Clean up the prompt by replacing URLs with [URL] placeholder
    response += `**Processing Instruction:** ${prompt.replace(urlRegex, '[URL]')}\n\n`;
    
    return {
      success: true,
      result: response.trim()
    };
    
  } catch (error) {
    logger.error('Web fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch web content'
    };
  }
}

async function fetchUrlContent(url: string, extractTextOnly: boolean): Promise<string> {
  try {
    // Import fetch dynamically to support both Node.js versions
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Vibex/1.0 (Web Content Fetcher)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
    
    const html = await response.text();
    
    if (extractTextOnly) {
      return extractTextFromHtml(html);
    } else {
      return html;
    }
    
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractTextFromHtml(html: string): string {
  // Simple HTML text extraction (in production, use a proper HTML parser like cheerio)
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  
  // Remove script and style elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Limit content length
  if (text.length > 8000) {
    text = `${text.substring(0, 8000)}... [content truncated]`;
  }
  
  return text;
} 