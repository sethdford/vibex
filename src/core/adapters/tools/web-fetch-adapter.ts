/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult } from '../../domain/tool';
import { executeWebFetch } from '../../../tools/web-fetch';

/**
 * Adapter for the web_fetch tool to the new architecture
 * 
 * This tool fetches content from web URLs with support for content extraction
 * and processing multiple URLs in a single request.
 */
export class WebFetchTool extends BaseTool {
  constructor() {
    super(
      'web_fetch',
      'Fetch and process content from web URLs',
      {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Comprehensive prompt that includes URL(s) and processing instructions'
          },
          max_urls: {
            type: 'number',
            description: 'Maximum number of URLs to process (default: 5, max: 20)',
            default: 5,
            minimum: 1,
            maximum: 20
          },
          extract_text_only: {
            type: 'boolean',
            description: 'Whether to extract only text content (default: true)',
            default: true
          }
        },
        required: ['prompt']
      },
      {
        requiresConfirmation: false,
        tags: ['web', 'external']
      }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { prompt, max_urls, extract_text_only } = params as {
      prompt: string,
      max_urls?: number,
      extract_text_only?: boolean
    };
    
    try {
      // Setup progress reporting
      let lastProgress = 0;
      if (options?.onProgress) {
        options.onProgress({
          message: 'Analyzing prompt for URLs...',
          percentage: 10
        });
        lastProgress = 10;
      }
      
      // Extract URLs from the prompt
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
      const urls = prompt.match(urlRegex) || [];
      
      if (urls.length > 0 && options?.onProgress) {
        options.onProgress({
          message: `Found ${urls.length} URLs, starting to fetch content...`,
          percentage: 20
        });
        lastProgress = 20;
      }
      
      // Call the legacy implementation
      const legacyResult = await executeWebFetch({
        prompt,
        max_urls,
        extract_text_only
      });
      
      // Final progress update
      if (options?.onProgress) {
        options.onProgress({
          message: 'Completed web fetch',
          percentage: 100
        });
      }
      
      if (!legacyResult.success) {
        return {
          callId: (options?.context?.callId as string) || 'unknown',
          error: new Error(legacyResult.error || 'Unknown error during web fetch'),
          success: false,
          data: undefined
        } as ToolResult;
      }
      
      return {
        callId: options?.context?.callId || 'unknown',
        data: legacyResult.result as unknown,
        success: true,
        metadata: {
          urls: urls.length,
          contentLength: typeof legacyResult.result === 'string' ? legacyResult.result.length : 0
        }
      } as ToolResult;
    } catch (error) {
      return {
        callId: options?.context?.callId || 'unknown',
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
    
    const { prompt } = params as { prompt?: unknown };
    
    if (!prompt) {
      return 'Missing required parameter: prompt';
    }
    
    if (typeof prompt !== 'string') {
      return 'prompt must be a string';
    }
    
    if (prompt.trim().length === 0) {
      return 'prompt cannot be empty';
    }
    
    // Check for URLs in the prompt
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urls = prompt.match(urlRegex) || [];
    
    if (urls.length === 0) {
      return 'No URLs found in the prompt';
    }
    
    // Validate max_urls if provided
    const { max_urls } = params as { max_urls?: unknown };
    if (max_urls !== undefined) {
      if (typeof max_urls !== 'number') {
        return 'max_urls must be a number';
      }
      if (max_urls < 1 || max_urls > 20) {
        return 'max_urls must be between 1 and 20';
      }
    }
    
    return null;
  }
}