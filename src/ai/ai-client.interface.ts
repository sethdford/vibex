/**
 * AI Client Interface
 * 
 * Core interface for AI client implementations providing model interaction,
 * conversation management, and tool integration capabilities.
 */

import { EventEmitter } from 'events';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { QueryOptions, AIResponse } from './claude-client.js';

/**
 * Core AI client interface for model interaction
 */
export interface AIClient extends EventEmitter {
  /**
   * Query the AI model
   */
  query(input: string | MessageParam[], options?: QueryOptions): Promise<AIResponse>;
  
  /**
   * Stream query with real-time responses
   */
  queryStream(prompt: string, options?: QueryOptions): Promise<void>;
  
  /**
   * Check if the client is available
   */
  isAvailable(): boolean;
  
  /**
   * Get the current model
   */
  getModel(): string;
  
  /**
   * Set the current model
   */
  setModel(model: string): void;
  
  /**
   * Submit tool result
   */
  submitToolResult(toolCallId: string, result: any): Promise<void>;
  
  /**
   * Clear conversation
   */
  clearConversation(): void;
  
  /**
   * Get conversation
   */
  getConversation(): MessageParam[];
  
  /**
   * Set conversation
   */
  setConversation(messages: MessageParam[]): void;
  
  /**
   * Get memory stats
   */
  getMemoryStats(): Promise<any>;
}