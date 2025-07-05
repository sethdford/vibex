/**
 * Claude AI Client
 * 
 * Claude API client implementation with conversation management,
 * memory optimization, and streaming capabilities.
 */

import { EventEmitter } from 'events';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ContentGenerator } from './content-generator.js';
import { ClaudeContentGenerator } from './claude-content-generator.js';
import { TurnManager } from './turn-manager.js';
import { ContentStreamManager, createContentStream } from './content-stream.js';
import { MemoryManager, MemoryOptimizationStrategy } from './memory-manager.js';
import type { AppConfigType } from '../config/schema.js';
import { logger } from '../utils/logger.js';
import type { AIClient } from './ai-client.interface.js';

/**
 * Tool schema definition
 */
export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Query options for AI requests
 */
export interface QueryOptions {
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
  retry?: boolean;
  tools?: ToolSchema[];
  /**
   * Enable memory management
   */
  enableMemoryManagement?: boolean;
  
  /**
   * Memory optimization strategy
   */
  memoryStrategy?: MemoryOptimizationStrategy;
  
  /**
   * Enable streaming optimization
   */
  optimizeStreaming?: boolean;
  
  /**
   * Signal for cancellation
   */
  signal?: AbortSignal;
}

/**
 * Message interface
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * AI result interface
 */
export interface AIResult {
  [key: string]: unknown;
}

/**
 * AI response interface
 */
export interface AIResponse {
  message: {
    content: string | Array<{
      type: string;
      text?: string;
    }>;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Client configuration
 */
export interface ClientConfig {
  apiKey: string;
  config: AppConfigType;
}

/**
 * Claude AI Client implementation
 */
export class ClaudeClient extends EventEmitter implements AIClient {
  public readonly config: AppConfigType;
  private contentGenerator: ContentGenerator;
  private turnManager: TurnManager | null = null;
  private streamManager: ContentStreamManager | null = null;
  private memoryManager: MemoryManager;
  private conversationMessages: MessageParam[] = [];
  private currentModel: string;

  constructor(clientConfig: ClientConfig) {
    super();
    
    logger.info('🏗️ Initializing ClaudeClient...');
    
    this.config = clientConfig.config;
    this.currentModel = this.config.ai.model;
    
    // Initialize content generator
    logger.debug('✅ Content generator created successfully');
    this.contentGenerator = new ClaudeContentGenerator(
      clientConfig.apiKey,
      this.config
    );
    
    // Initialize memory manager
    logger.debug('✅ Memory manager created successfully');
    this.memoryManager = new MemoryManager(this.contentGenerator);
    
    // Set up event listeners
    this.setupEventListeners();
    
    logger.info('✅ ClaudeClient initialized successfully');
  }
  
  /**
   * Query the AI model
   */
  public async query(
    input: string | MessageParam[], 
    options: QueryOptions = {}
  ): Promise<AIResponse> {
    try {
      const messages = this.prepareMessages(input);
      const model = options.model || this.currentModel;
      
      // Optimize memory if needed and enabled
      if (options.enableMemoryManagement !== false) {
        await this.optimizeMemoryIfNeeded(messages, model, options);
      }
      
      // Generate response
      const response = await this.contentGenerator.generate(messages, {
        model,
        systemPrompt: options.system || this.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools: options.tools,
      });
      
      // Update conversation history
      this.updateConversationHistory(messages, response);
      
      return {
        message: {
          content: response.content
        },
        usage: response.usage ? {
          input_tokens: response.usage.inputTokens,
          output_tokens: response.usage.outputTokens
        } : undefined
      };
      
    } catch (error) {
      logger.error('Query failed', error);
      throw this.handleApiError(error, 'query');
    }
  }
  
  /**
   * Stream query with real-time responses
   */
  public async queryStream(
    prompt: string, 
    options: QueryOptions = {}
  ): Promise<void> {
    try {
      const messages = this.prepareMessages(prompt);
      const model = options.model || this.currentModel;
      
      // Optimize memory if needed and enabled
      if (options.enableMemoryManagement !== false) {
        await this.optimizeMemoryIfNeeded(messages, model, options);
      }
      
      // Create turn manager for streaming
      this.turnManager = new TurnManager(
        this.contentGenerator,
        {
          model,
          systemPrompt: options.system || this.systemPrompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          tools: options.tools,
        },
        this.conversationMessages
      );
      
      // Create stream manager
      this.streamManager = createContentStream(this.turnManager, {
        monitorPerformance: true,
        autoRetry: true,
      });
      
      // Forward events
      this.forwardTurnEvents(this.turnManager);
      this.forwardStreamEvents(this.streamManager);
      
      // Execute streaming turn
      await this.turnManager.execute(prompt, options.signal);
      
      // Update conversation
      this.conversationMessages = this.turnManager.getMessages();
      
    } catch (error) {
      logger.error('Stream query failed', error);
      throw this.handleApiError(error, 'queryStream');
    }
  }
  
  /**
   * Check if the client is available
   */
  public isAvailable(): boolean {
    return this.contentGenerator.isModelAvailable(this.currentModel);
  }
  
  /**
   * Get the current model
   */
  public getModel(): string {
    return this.currentModel;
  }
  
  /**
   * Set the current model
   */
  public setModel(model: string): void {
    if (this.contentGenerator.isModelAvailable(model)) {
      this.currentModel = model;
      logger.debug(`Model changed to: ${model}`);
    } else {
      throw new Error(`Model not available: ${model}`);
    }
  }
  
  /**
   * Get memory statistics
   */
  public async getMemoryStats(): Promise<any> {
    return this.memoryManager.getMemoryStats(
      this.conversationMessages,
      this.currentModel
    );
  }
  
  /**
   * Clear conversation history
   */
  public clearConversation(): void {
    this.conversationMessages = [];
    logger.debug('Conversation cleared');
  }
  
  /**
   * Get conversation messages
   */
  public getConversation(): MessageParam[] {
    return [...this.conversationMessages];
  }
  
  /**
   * Get content generator instance
   */
  public getContentGenerator(): ContentGenerator {
    return this.contentGenerator;
  }
  
  /**
   * Set conversation messages
   */
  public setConversation(messages: MessageParam[]): void {
    this.conversationMessages = [...messages];
    logger.debug(`Conversation set with ${messages.length} messages`);
  }
  
  /**
   * Submit tool result
   */
  public async submitToolResult(
    toolCallId: string,
    result: AIResult,
    options: QueryOptions = {}
  ): Promise<void> {
    if (!this.turnManager) {
      throw new Error('No active turn to submit tool result to');
    }
    
    try {
      await this.turnManager.submitToolResult({
        toolCallId,
        result,
      });
    } catch (error) {
      logger.error('Tool result submission failed', error);
      throw this.handleApiError(error, 'submitToolResult');
    }
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Forward content generator events
    this.contentGenerator.on('error', (error) => {
      this.emit('error', error);
    });
  }
  
  /**
   * Get system prompt
   */
  private get systemPrompt(): string {
    return this.config.ai.systemPrompt || 'You are a helpful AI assistant.';
  }
  
  /**
   * Prepare messages for API call
   */
  private prepareMessages(input: string | MessageParam[]): MessageParam[] {
    const messages = [...this.conversationMessages];
    
    if (typeof input === 'string') {
      messages.push({
        role: 'user' as const,
        content: input
      });
    } else if (Array.isArray(input)) {
      messages.push(...input);
    }
    
    return messages;
  }
  
  /**
   * Update conversation history with response
   */
  private updateConversationHistory(
    messages: MessageParam[], 
    response: any
  ): void {
    // Add user messages that aren't already in conversation
    const newMessages = messages.slice(this.conversationMessages.length);
    this.conversationMessages.push(...newMessages);
    
    // Add assistant response
    if (response.content) {
      const assistantContent = Array.isArray(response.content)
        ? response.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('')
        : response.content;
      
      if (assistantContent) {
        this.conversationMessages.push({
          role: 'assistant' as const,
          content: assistantContent
        });
      }
    }
  }
  
  /**
   * Forward turn manager events
   */
  private forwardTurnEvents(turnManager: TurnManager): void {
    turnManager.on('start', (data) => this.emit('turn:start', data));
    turnManager.on('content', (text) => this.emit('turn:content', text));
    turnManager.on('thinking', (text) => this.emit('turn:thinking', text));
    turnManager.on('tool_call', (toolCall) => this.emit('turn:tool_call', toolCall));
    turnManager.on('tool_result', (result) => this.emit('turn:tool_result', result));
    turnManager.on('complete', (result) => this.emit('turn:complete', result));
    turnManager.on('error', (error) => this.emit('turn:error', error));
  }
  
  /**
   * Forward stream manager events
   */
  private forwardStreamEvents(streamManager: ContentStreamManager): void {
    streamManager.on('stream:start', (data) => this.emit('stream:start', data));
    streamManager.on('stream:content', (text) => this.emit('stream:content', text));
    streamManager.on('stream:thinking', (text) => this.emit('stream:thinking', text));
    streamManager.on('stream:tool_call', (toolCall) => this.emit('stream:tool_call', toolCall));
    streamManager.on('stream:tool_result', (result) => this.emit('stream:tool_result', result));
    streamManager.on('stream:complete', (data) => this.emit('stream:complete', data));
    streamManager.on('stream:error', (error) => this.emit('stream:error', error));
  }
  
  /**
   * Optimize memory if needed
   */
  private async optimizeMemoryIfNeeded(
    messages: MessageParam[],
    model: string,
    options: QueryOptions
  ): Promise<void> {
    try {
      // Check if optimization is needed
      const needsOptimization = await this.memoryManager.isCompressionNeeded(
        messages,
        model
      );
      
      if (needsOptimization) {
        logger.debug('Memory optimization needed, compressing conversation');
        
        const result = await this.memoryManager.optimizeMemory(
          messages,
          model,
          options.memoryStrategy
        );
        
        logger.debug('Memory optimized', {
          originalTokens: result.originalTokenCount,
          newTokens: result.newTokenCount,
          compressionRatio: result.compressionRatio
        });
        
        this.emit('memory:optimized', result);
      }
      
    } catch (error) {
      logger.warn('Memory optimization failed', error);
      // Continue without optimization rather than failing the request
    }
  }
  
  /**
   * Handle API errors
   */
  private handleApiError(error: unknown, operation: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`${operation} failed:`, message);
    return new Error(`${operation} failed: ${message}`);
  }
}

/**
 * Create a Claude AI client
 */
export function createClaudeClient(
  apiKey: string,
  config: AppConfigType
): AIClient {
  return new ClaudeClient({ apiKey, config });
}