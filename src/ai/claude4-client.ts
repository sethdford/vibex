/**
 * Claude 4 AI Client Implementation
 * 
 * This module provides a specialized client for interacting with Anthropic's Claude 4 API.
 * It extends the unified client architecture with Claude 4-specific features and optimizations.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { 
  Message,
  MessageParam,
  Tool,
  ToolUseBlock,
  TextBlock,
  ContentBlock,
  ImageBlockParam,
  Usage
} from '@anthropic-ai/sdk/resources/messages.js';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger.js';
import { toolRegistry, ToolResult } from '../tools/index.js';
import { AppConfigType } from '../config/schema.js';
import { telemetry } from '../telemetry/index.js';
import { UnifiedClaudeClient, QueryOptions, QueryResult, AIResponse } from './unified-client.js';

// Updated model constants to include Claude 4 models
export const CLAUDE_4_MODELS = {
  CLAUDE_4_HAIKU: 'claude-4-haiku-20240307',
  CLAUDE_4_SONNET: 'claude-4-sonnet-20240229',
  CLAUDE_4_OPUS: 'claude-4-opus-20240229'
} as const;

// Claude 4 specific options
export interface Claude4Options extends QueryOptions {
  vision?: boolean;
  visionEnhancements?: {
    detail: 'low' | 'high';
  };
  toolChoice?: 'auto' | 'any' | 'none' | { type: 'tool'; name: string };
}

/**
 * Claude 4 Client for enhanced capabilities
 */
export class Claude4Client implements UnifiedClaudeClient {
  private client: Anthropic;
  private apiKey: string;
  private config?: AppConfigType;
  private defaultModel: string;

  constructor(apiKey: string, config?: AppConfigType) {
    this.apiKey = apiKey;
    this.config = config;
    this.defaultModel = CLAUDE_4_MODELS.CLAUDE_4_SONNET;
    
    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: config?.api?.baseUrl || 'https://api.anthropic.com',
      maxRetries: config?.auth?.maxRetryAttempts || 3,
      timeout: config?.api?.timeout || 60000,
    });
    
    logger.info('Claude 4 client initialized successfully');
  }

  /**
   * Query Claude 4 with enhanced options
   */
  async query(input: string | MessageParam[], options: Claude4Options = {}): Promise<AIResponse> {
    const startTime = performance.now();
    let messages: MessageParam[];
    
    // Convert string input to message format
    if (typeof input === 'string') {
      messages = [{ role: 'user', content: input }];
    } else {
      messages = [...input];
    }
    
    // Determine which model to use
    const model = options.model || this.config?.ai?.model || this.defaultModel;
    
    try {
      logger.debug(`Querying Claude 4 (${model}) with ${typeof input === 'string' ? input.length : 'structured'} input`);
      
      // Create message with Claude 4 specific options
      const response = await this.client.messages.create({
        model,
        messages,
        system: options.system || this.config?.ai?.systemPrompt,
        max_tokens: options.maxTokens || this.config?.ai?.maxTokens || 4096,
        temperature: options.temperature || this.config?.ai?.temperature || 0.7,
        tools: options.tools || Array.from(toolRegistry.getDefinitions()),
        tool_choice: options.toolChoice,
        stream: false,
      });
      
      const duration = performance.now() - startTime;
      
      // Track metrics for telemetry
      telemetry.trackApiCall('claude4', duration, 200, model);
      
      // Format and return the response
      const formattedResponse: AIResponse = {
        message: {
          content: response.content.map(block => ({
            type: block.type,
            ...('text' in block ? { text: block.text } : {})
          }))
        },
        usage: response.usage
      };
      
      logger.debug(`Claude 4 response received in ${Math.round(duration)}ms`);
      return formattedResponse;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      telemetry.trackApiCall('claude4', duration, 500, model);
      
      logger.error('Claude 4 API request failed', error);
      throw error;
    }
  }
  
  /**
   * Check if the client is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  /**
   * Get the current model being used
   */
  getModel(): string {
    return this.defaultModel;
  }
  
  /**
   * Update the default model
   */
  setModel(model: string): void {
    if (Object.values(CLAUDE_4_MODELS).includes(model as any)) {
      this.defaultModel = model;
    } else {
      logger.warn(`Attempted to set invalid Claude 4 model: ${model}. Using default instead.`);
    }
  }
  
  /**
   * Get tool definitions
   */
  getTools(): Tool[] {
    return Array.from(toolRegistry.getDefinitions());
  }
}

/**
 * Create a Claude 4 client instance
 */
export function createClaude4Client(apiKey: string, config?: AppConfigType): UnifiedClaudeClient {
  return new Claude4Client(apiKey, config);
}