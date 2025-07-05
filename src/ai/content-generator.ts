/**
 * Content Generator
 * 
 * Defines the abstract interface for generating content from AI models
 * with support for different providers and models.
 */

import { EventEmitter } from 'events';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { ToolSchema } from './claude-client.js';

/**
 * Content generator configuration options
 */
export interface ContentGeneratorOptions {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  enableCaching?: boolean;
  debug?: boolean;
  additionalOptions?: Record<string, unknown>;
}

/**
 * Content request configuration
 */
export interface ContentRequestConfig {
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSchema[];
}

/**
 * Tool call information
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  type: 'function' | 'tool_use';
}

/**
 * Content generation response
 */
export interface ContentResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls?: ToolCall[];
}

/**
 * Content generation events
 */
export enum ContentEvent {
  START = 'start',
  CONTENT = 'content',
  THINKING = 'thinking',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  END = 'end',
  ERROR = 'error',
}

/**
 * Memory statistics for context optimization
 */
export interface MemoryStats {
  totalTokens: number;
  contextSize: number;
  availableTokens: number;
  compressionRecommended: boolean;
}

/**
 * Content Generator interface
 * 
 * Core abstraction for generating AI content across different providers
 */
export abstract class ContentGenerator extends EventEmitter {
  /**
   * Generate content with the specified messages and configuration
   */
  public abstract generate(
    messages: MessageParam[], 
    config: ContentRequestConfig
  ): Promise<ContentResponse>;
  
  /**
   * Generate content with streaming response
   */
  public abstract generateStream(
    messages: MessageParam[],
    config: ContentRequestConfig
  ): Promise<void>;
  
  /**
   * Estimate token count for messages
   */
  public abstract countTokens(
    messages: MessageParam[]
  ): Promise<MemoryStats>;
  
  /**
   * Check if model is available
   */
  public abstract isModelAvailable(model: string): boolean;
  
  /**
   * Get default model
   */
  public abstract getDefaultModel(): string;
  
  /**
   * Get model context window size
   */
  public abstract getModelContextSize(model: string): number;
}

/**
 * Factory function to create content generators based on provider
 * 
 * This is a placeholder that will be implemented when specific generators are available.
 * Each provider will have its own implementation file (claude-content-generator.ts, etc.)
 */
export function createContentGenerator(
  provider: 'claude' | 'gemini' | 'openai',
  _apiKey: string,
  _options: ContentGeneratorOptions = {}
): ContentGenerator {
  switch (provider) {
    case 'claude':
      // This will be implemented in claude-content-generator.ts
      throw new Error('Claude content generator not implemented yet');
    case 'gemini':
      throw new Error('Gemini content generator not implemented yet');
    case 'openai':
      throw new Error('OpenAI content generator not implemented yet');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}