/**
 * Simple Claude Client
 * 
 * A lightweight client for Claude API that avoids complex dependencies
 * and focuses on basic query functionality.
 */

import { logger } from '../utils/logger.js';
import { telemetry } from '../telemetry/index.js';
import type { AppConfigType } from '../config/schema.js';

export interface SimpleAIResponse {
  message: {
    content: Array<{
      type: string;
      text?: string;
    }>;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface SimpleClaudeClient {
  query(input: string, options?: any): Promise<SimpleAIResponse>;
  isAvailable(): boolean;
  getModel(): string;
}

/**
 * Create a simple Claude client that avoids complex dependencies
 */
export function createSimpleClient(apiKey: string, options: { config?: AppConfigType } = {}): SimpleClaudeClient {
  const config = options.config;
  const model = config?.ai?.model || 'claude-3-sonnet-20240229';
  
  return {
    async query(input: string, options: any = {}): Promise<SimpleAIResponse> {
      const startTime = Date.now();
      
      try {
        logger.debug(`Querying Claude with ${input.length} characters`);
        
        // Use dynamic import to avoid bundling issues
        const fetch = (await import('node-fetch')).default;
        
        const requestBody = {
          model,
          max_tokens: config?.ai?.maxTokens || 4000,
          temperature: config?.ai?.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: input
            }
          ]
        };
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json() as any;
        const duration = Date.now() - startTime;
        
        // Track metrics
        telemetry.trackApiCall('claude', duration, response.status, model);
        
        // Format response to match expected interface
        const formattedResponse: SimpleAIResponse = {
          message: {
            content: result.content || [{ type: 'text', text: 'No response received' }]
          },
          usage: result.usage ? {
            input_tokens: result.usage.input_tokens || 0,
            output_tokens: result.usage.output_tokens || 0
          } : undefined
        };
        
        logger.debug(`Claude response received in ${duration}ms`);
        return formattedResponse;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        telemetry.trackApiCall('claude', duration, 500, model);
        
        logger.error('Claude API request failed', error);
        throw error;
      }
    },
    
    isAvailable(): boolean {
      return !!apiKey;
    },
    
    getModel(): string {
      return model;
    }
  };
} 