/**
 * Web Fetch Tool
 * 
 * Allows Claude to fetch and process content from web URLs.
 * Supports multiple URLs, content extraction, and summarization.
 */

import { ToolDefinition, InternalToolResult } from './index.js';
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

export async function executeWebFetch(input: any): Promise<InternalToolResult> {
  try {
    const { prompt, max_urls = 5, extract_text_only = true } = input;
    
    // Extract URLs from the prompt
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const urls = prompt.match(urlRegex) || [];
    
    if (urls.length === 0) {
      return {
        success: false,
        error: 'No valid URLs found in the prompt. Please include at least one URL starting with http:// or https://'
      };
    }
    
    // Limit URLs
    const limitedUrls = urls.slice(0, Math.min(max_urls, 20));
    
    logger.info(`Fetching content from ${limitedUrls.length} URL(s)`);
    
    // Fetch content from all URLs
    const fetchPromises = limitedUrls.map((url: string) => fetchUrlContent(url, extract_text_only));
    const results = await Promise.allSettled(fetchPromises);
    
    // Process results
    const successfulFetches: Array<{ url: string; content: string; title?: string }> = [];
    const failedFetches: Array<{ url: string; error: string }> = [];
    
    results.forEach((result, index) => {
      const url = limitedUrls[index];
      if (result.status === 'fulfilled') {
        successfulFetches.push({ url, ...result.value });
      } else {
        failedFetches.push({ url, error: result.reason.message });
      }
    });
    
    // Format response
    let response = `Fetched content from ${successfulFetches.length} of ${limitedUrls.length} URLs:\n\n`;
    
    // Add successful fetches
    successfulFetches.forEach(({ url, content, title }, index) => {
      response += `## Source ${index + 1}: ${title || 'Web Page'}\n`;
      response += `**URL:** ${url}\n\n`;
      response += `**Content:**\n${content}\n\n`;
      response += '---\n\n';
    });
    
    // Add failed fetches
    if (failedFetches.length > 0) {
      response += '## Failed to fetch:\n\n';
      failedFetches.forEach(({ url, error }) => {
        response += `- **${url}**: ${error}\n`;
      });
      response += '\n';
    }
    
    // Add processing instruction
    response += `**Processing Instruction:** ${prompt.replace(urlRegex, '[URL]')}\n\n`;
    response += 'Please process the above content according to the instructions in the prompt.';
    
    return {
      success: true,
      result: response
    };
    
  } catch (error) {
    logger.error('Web fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch web content'
    };
  }
}

async function fetchUrlContent(url: string, extractTextOnly: boolean): Promise<{ content: string; title?: string }> {
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
      return { content: html };
    }
    
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractTextFromHtml(html: string): { content: string; title?: string } {
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
    text = text.substring(0, 8000) + '... [content truncated]';
  }
  
  return { content: text, title };
} 