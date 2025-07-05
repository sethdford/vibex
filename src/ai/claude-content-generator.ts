/**
 * Claude Content Generator
 * 
 * Implementation of the ContentGenerator interface for Anthropic's Claude models.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Message } from '@anthropic-ai/sdk/resources/messages';
import { ContentGenerator, ContentRequestConfig, ContentResponse, ContentEvent, MemoryStats, ContentGeneratorOptions } from './content-generator.js';
import { logger } from '../utils/logger.js';
import { retry, type RetryOptions } from '../utils/retry.js';
import type { AppConfigType } from '../config/schema.js';

// Model context window sizes (approximate)
const MODEL_CONTEXT_SIZES: Record<string, number> = {
  // Claude 4 Models (Latest - May 2025)
  'claude-opus-4-20250514': 200000,
  'claude-sonnet-4-20250514': 200000,
  
  // Claude 3.7 Models
  'claude-3-7-sonnet-20250219': 200000,
  
  // Claude 3.5 Models
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-sonnet-20240620': 200000,
  'claude-3-5-haiku-20241022': 200000,
  
  // Claude 3 Models (Legacy)
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
  
  // Claude 2 Models (Legacy)
  'claude-2.0': 100000,
  'claude-2.1': 200000,
  'claude-instant-1.2': 100000,
};

// Default model - Claude 4 Sonnet (our preferred choice)
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Claude-specific configuration options
 */
export interface ClaudeContentGeneratorOptions extends ContentGeneratorOptions {
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
  // Claude 4 specific features
  enableExtendedThinking?: boolean;
  enableVision?: boolean;
  priorityTier?: boolean;
}

/**
 * Claude Content Generator implementation
 */
export class ClaudeContentGenerator extends ContentGenerator {
  private client: Anthropic;
  private config: AppConfigType;
  
  constructor(apiKey: string, config: AppConfigType, options: ClaudeContentGeneratorOptions = {}) {
    super();
    
    logger.info('🏗️ Initializing ClaudeContentGenerator...');
    logger.debug('🔧 Generator options:', {
      model: config.ai.model,
      baseURL: options.baseURL || config.api.baseUrl,
      maxRetries: options.maxRetries || config.auth.maxRetryAttempts,
      timeout: options.timeout || config.api.timeout,
      apiKeyPrefix: apiKey.substring(0, 20) + '...'
    });
    
    this.config = config;
    
    logger.debug('🔌 Creating Anthropic client...');
    try {
      this.client = new Anthropic({
        apiKey,
        baseURL: options.baseURL || config.api.baseUrl,
        maxRetries: options.maxRetries || config.auth.maxRetryAttempts,
        timeout: options.timeout || config.api.timeout,
      });
      logger.info('✅ Anthropic client created successfully');
    } catch (error) {
      logger.error('❌ Failed to create Anthropic client', error);
      throw error;
    }
    
    const currentModel = config.ai.model;
    logger.info(`🎯 Claude Content Generator initialized with model: ${currentModel}`);
    
    // Log Claude 4 capabilities
    if (this.isClaude4Model(currentModel)) {
      logger.info('🚀 Claude 4 capabilities enabled:');
      logger.info(`  • Extended Thinking: ${this.supportsExtendedThinking(currentModel)}`);
      logger.info(`  • Vision Support: ${this.supportsVision(currentModel)}`);
      logger.info(`  • Max Output Tokens: ${this.getMaxOutputTokens(currentModel).toLocaleString()}`);
      logger.info(`  • Context Window: ${this.getModelContextSize(currentModel).toLocaleString()}`);
    } else if (currentModel.includes('claude-3-7')) {
      logger.info('⚡ Claude 3.7 capabilities enabled (Extended Thinking available)');
    } else {
      logger.info(`📝 Claude ${currentModel.includes('claude-3') ? '3.x' : '2.x'} model active`);
    }
  }
  
  /**
   * Generate content using Claude API
   */
  public async generate(
    messages: MessageParam[], 
    config: ContentRequestConfig
  ): Promise<ContentResponse> {
    const params = this.buildRequestParams(messages, config, false);
    const retryOptions = this.buildRetryOptions(config.model);
    
    try {
      const response = await retry(
        async () => await this.client.messages.create(params),
        retryOptions
      );
      
      // Ensure we have a Message response, not a Stream
      if (Symbol.asyncIterator in response) {
        throw new Error('Unexpected stream response in non-streaming mode');
      }
      
      return this.formatResponse(response as Message);
    } catch (error) {
      logger.error('Claude content generation failed', error);
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Generate content with streaming
   */
  public async generateStream(
    messages: MessageParam[],
    config: ContentRequestConfig
  ): Promise<void> {
    const params = this.buildRequestParams(messages, config, true);
    
    this.emit(ContentEvent.START, { model: config.model });
    
    try {
      const stream = await this.client.messages.create(params);
      
      // Type guard to check if it's a stream
      if (Symbol.asyncIterator in stream) {
        for await (const chunk of stream) {
          this.handleStreamChunk(chunk);
        }
      }
      
      this.emit(ContentEvent.END);
    } catch (error) {
      this.emit(ContentEvent.ERROR, error);
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Estimate token count for messages
   */
  public async countTokens(
    messages: MessageParam[]
  ): Promise<MemoryStats> {
    try {
      // Fallback: rough estimate (4 chars per token)
      // The Anthropic SDK doesn't currently expose countTokens in the stable API
      const totalTokens = Math.ceil(
        messages.reduce((acc, msg) => {
          const content = typeof msg.content === 'string' ? msg.content : 
            Array.isArray(msg.content) ? msg.content.map(c => 'text' in c ? c.text : '').join('') : '';
          return acc + content.length;
        }, 0) / 4
      );
      
      const contextSize = this.getModelContextSize(this.config.ai.model);
      const availableTokens = Math.max(0, contextSize - totalTokens);
      const compressionRecommended = totalTokens > contextSize * 0.8;
      
      return {
        totalTokens,
        contextSize,
        availableTokens,
        compressionRecommended,
      };
    } catch (error) {
      logger.error('Token counting failed', error);
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Check if model is available
   */
  public isModelAvailable(model: string): boolean {
    return model in MODEL_CONTEXT_SIZES || model.startsWith('claude-');
  }
  
  /**
   * Check if model supports Claude 4 features
   */
  public isClaude4Model(model: string): boolean {
    return model.includes('claude-opus-4') || model.includes('claude-sonnet-4');
  }
  
  /**
   * Check if model supports extended thinking
   */
  public supportsExtendedThinking(model: string): boolean {
    return this.isClaude4Model(model) || model.includes('claude-3-7-sonnet');
  }
  
  /**
   * Check if model supports vision capabilities
   */
  public supportsVision(model: string): boolean {
    // All Claude 3+ models support vision
    return !model.includes('claude-2') && !model.includes('claude-instant');
  }
  
  /**
   * Get maximum output tokens for model
   */
  public getMaxOutputTokens(model: string): number {
    if (model.includes('claude-opus-4')) return 32000;
    if (model.includes('claude-sonnet-4')) return 64000;
    if (model.includes('claude-3-7-sonnet')) return 64000;
    if (model.includes('claude-3-5')) return 8192;
    if (model.includes('claude-3-opus')) return 4096;
    return 4096; // Default fallback
  }
  
  /**
   * Get default model
   */
  public getDefaultModel(): string {
    return DEFAULT_MODEL;
  }
  
  /**
   * Get model context window size
   */
  public getModelContextSize(model: string): number {
    return MODEL_CONTEXT_SIZES[model] || 100000; // Default to 100k if unknown
  }
  
  /**
   * Get comprehensive model information
   */
  public getModelInfo(model: string): {
    name: string;
    generation: string;
    contextWindow: number;
    maxOutput: number;
    supportsVision: boolean;
    supportsExtendedThinking: boolean;
    isClaude4: boolean;
    trainingCutoff: string;
    description: string;
  } {
    const isClaude4 = this.isClaude4Model(model);
    const isOpus = model.includes('opus');
    const isSonnet = model.includes('sonnet');
    const isHaiku = model.includes('haiku');
    
    let generation = 'Unknown';
    let trainingCutoff = 'Unknown';
    let description = 'Claude AI model';
    
    if (isClaude4) {
      generation = 'Claude 4';
      trainingCutoff = 'March 2025';
      if (isOpus) {
        description = 'Our most capable and intelligent model yet. Sets new standards in complex reasoning and advanced coding.';
      } else if (isSonnet) {
        description = 'High-performance model with exceptional reasoning and efficiency.';
      }
    } else if (model.includes('claude-3-7')) {
      generation = 'Claude 3.7';
      trainingCutoff = 'November 2024';
      description = 'Hybrid reasoning model with extended thinking capabilities.';
    } else if (model.includes('claude-3-5')) {
      generation = 'Claude 3.5';
      trainingCutoff = model.includes('20241022') ? 'July 2024' : 'April 2024';
      description = 'High-performance model with superior reasoning capabilities.';
    } else if (model.includes('claude-3')) {
      generation = 'Claude 3';
      trainingCutoff = 'August 2023';
      if (isOpus) description = 'Powerful model for complex tasks.';
      else if (isSonnet) description = 'Balanced performance and capability.';
      else if (isHaiku) description = 'Fast and compact model for near-instant responsiveness.';
    }
    
    return {
      name: model,
      generation,
      contextWindow: this.getModelContextSize(model),
      maxOutput: this.getMaxOutputTokens(model),
      supportsVision: this.supportsVision(model),
      supportsExtendedThinking: this.supportsExtendedThinking(model),
      isClaude4,
      trainingCutoff,
      description
    };
  }
  
  /**
   * Build request parameters for Claude API
   */
  private buildRequestParams(
    messages: MessageParam[], 
    config: ContentRequestConfig, 
    stream: boolean
  ): Anthropic.Messages.MessageCreateParams {
    const params: Anthropic.Messages.MessageCreateParams = {
      model: config.model,
      messages,
      system: config.systemPrompt,
      max_tokens: Math.min(
        config.maxTokens || this.config.ai.maxTokens,
        this.getMaxOutputTokens(config.model)
      ),
      temperature: config.temperature || this.config.ai.temperature,
      stream,
      ...(config.tools && config.tools.length > 0 && { tools: config.tools }),
    };

    // Add Claude 4 specific features
    if (this.isClaude4Model(config.model)) {
      logger.debug(`Using Claude 4 model: ${config.model} with enhanced capabilities`);
      
      // Extended thinking capability
      if (this.supportsExtendedThinking(config.model)) {
        logger.debug('Extended thinking capability available for this model');
      }
      
      // Vision capability
      if (this.supportsVision(config.model)) {
        logger.debug('Vision capability available for this model');
      }
    }

    return params;
  }
  
  /**
   * Build retry options for API calls
   */
  private buildRetryOptions(model: string): RetryOptions {
    return {
      maxRetries: this.config.auth?.maxRetryAttempts ?? 3,
      initialDelayMs: 500,
      maxDelayMs: 15000,
      onRetry: (attempt: number, delayMs: number, error: unknown) => {
        logger.warn(`API request to ${model} failed (attempt ${attempt + 1}), retrying in ${delayMs}ms`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          model
        });
      },
      isRetryable: this.isRetryableError,
    };
  }
  
  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const errorStr = String(error);
    
    // Check for retryable error patterns
    const retryablePatterns = [
      'rate limit', 'too many requests', '429', 'server error',
      'timeout', 'socket hang up', 'network', 'ECONNRESET', 'ETIMEDOUT'
    ];
    
    if (retryablePatterns.some(pattern => errorStr.includes(pattern))) {
      return true;
    }
    
    // Check status codes
    const apiError = error as { status?: number; statusCode?: number };
    const status = apiError.status ?? apiError.statusCode;
    
    return status !== undefined && (status >= 500 || status === 429);
  }
  
  /**
   * Handle stream chunk events
   */
  private handleStreamChunk(chunk: Anthropic.Messages.MessageStreamEvent): void {
    if (chunk.type === 'content_block_delta' && (chunk as any).delta?.type === 'text_delta') {
      this.emit(ContentEvent.CONTENT, (chunk as any).delta.text);
    } else if (chunk.type === 'message_stop') {
      this.emit(ContentEvent.END);
    } else if (chunk.type === 'content_block_start' && (chunk as any).content_block?.type === 'tool_use') {
      this.emit(ContentEvent.TOOL_CALL, (chunk as any).content_block);
    }
  }
  
  /**
   * Format API response to ContentResponse
   */
  private formatResponse(response: Message): ContentResponse {
    const contentBlocks = response.content.map(block => {
      const blockAny = block as any;
      return {
        type: blockAny.type,
        text: 'text' in blockAny ? blockAny.text : undefined
      };
    });
    
    const toolCalls = response.content
      .filter(block => 'name' in (block as any) && 'input' in (block as any))
      .map(block => {
        const blockAny = block as any;
        return blockAny; // Type assertion for tool use blocks
      });
    
    return {
      content: contentBlocks,
      usage: response.usage ? {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      } : undefined,
      toolCalls
    };
  }
  
  /**
   * Handle API errors
   */
  private handleApiError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    
    return new Error(`Claude API error: ${String(error)}`);
  }
}

/**
 * Create a Claude content generator
 */
export function createClaudeContentGenerator(
  apiKey: string, 
  config: AppConfigType, 
  options: ClaudeContentGeneratorOptions = {}
): ClaudeContentGenerator {
  const generator = new ClaudeContentGenerator(apiKey, config, options);
  
  // Log model capabilities on creation
  const modelInfo = generator.getModelInfo(config.ai.model);
  logger.info(`🤖 ${modelInfo.generation} Content Generator ready:`);
  logger.info(`   Model: ${modelInfo.name}`);
  logger.info(`   Description: ${modelInfo.description}`);
  logger.info(`   Training Cutoff: ${modelInfo.trainingCutoff}`);
  
  return generator;
}