/**
 * Memory Manager
 * 
 * Utilities for optimizing memory usage and context window management
 * for AI conversations. Provides capabilities for context compression,
 * message prioritization, and token counting.
 */

import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ContentGenerator, MemoryStats } from './content-generator.js';
import { logger } from '../utils/logger.js';

/**
 * Memory optimization strategy
 */
export enum MemoryOptimizationStrategy {
  SUMMARIZE = 'summarize',
  TRUNCATE = 'truncate',
  PRIORITIZE = 'prioritize',
  COMPRESS = 'compress',
}

/**
 * Message priority for retention
 */
export enum MessagePriority {
  CRITICAL = 'critical',   // Must keep
  HIGH = 'high',           // Important context
  MEDIUM = 'medium',       // Useful but not critical
  LOW = 'low',             // Can be dropped if needed
}

/**
 * Memory compression info
 */
export interface MemoryCompressionResult {
  originalTokenCount: number;
  newTokenCount: number;
  compressionRatio: number;
  strategy: MemoryOptimizationStrategy;
  keptMessages: number;
  removedMessages: number;
}

/**
 * Memory manager options
 */
export interface MemoryManagerOptions {
  /**
   * Maximum context window as percentage (0.0-1.0)
   */
  maxContextUtilization?: number;
  
  /**
   * Auto-compress threshold as percentage (0.0-1.0)
   */
  autoCompressThreshold?: number;
  
  /**
   * Default optimization strategy
   */
  defaultStrategy?: MemoryOptimizationStrategy;
  
  /**
   * Keep system prompts during optimization
   */
  preserveSystemPrompts?: boolean;
  
  /**
   * Keep recent messages during optimization
   */
  preserveRecentMessages?: number;
}

/**
 * Extended message parameter that includes system and tool roles
 */
export interface ExtendedMessageParam {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<{
    type: string;
    text?: string;
  }>;
}

/**
 * Memory Manager for optimizing context windows
 */
export class MemoryManager {
  private contentGenerator: ContentGenerator;
  private options: Required<MemoryManagerOptions>;
  private messageCache: Map<string, ExtendedMessageParam[]> = new Map();
  private tokenCountCache: Map<string, MemoryStats> = new Map();
  
  constructor(
    contentGenerator: ContentGenerator,
    options: MemoryManagerOptions = {}
  ) {
    this.contentGenerator = contentGenerator;
    
    // Default options
    this.options = {
      maxContextUtilization: 0.8,
      autoCompressThreshold: 0.9,
      defaultStrategy: MemoryOptimizationStrategy.SUMMARIZE,
      preserveSystemPrompts: true,
      preserveRecentMessages: 5,
      ...options
    };
    
    logger.debug('Memory Manager initialized', { options: this.options });
  }
  
  /**
   * Get memory stats for messages
   */
  public async getMemoryStats(
    messages: ExtendedMessageParam[],
    model?: string
  ): Promise<MemoryStats> {
    const cacheKey = this.getCacheKey(messages, model || 'default');
    
    if (this.tokenCountCache.has(cacheKey)) {
      return this.tokenCountCache.get(cacheKey)!;
    }
    
    try {
      // Convert to MessageParam format for token counting
      const apiMessages = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => msg as MessageParam);
      
      const stats = await this.contentGenerator.countTokens(apiMessages);
      this.tokenCountCache.set(cacheKey, stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get memory stats', error);
      
      // Fallback to estimation
      const totalTokens = this.estimateTokenCount(messages);
      const contextSize = 100000; // Default context size
      const availableTokens = Math.max(0, contextSize - totalTokens);
      const compressionRecommended = totalTokens > contextSize * 0.8;
      
      return {
        totalTokens,
        contextSize,
        availableTokens,
        compressionRecommended,
      };
    }
  }
  
  /**
   * Check if compression is needed
   */
  public async isCompressionNeeded(
    messages: ExtendedMessageParam[],
    model?: string
  ): Promise<boolean> {
    const stats = await this.getMemoryStats(messages, model);
    return stats.compressionRecommended;
  }
  
  /**
   * Optimize memory usage with the specified strategy
   */
  public async optimizeMemory(
    messages: ExtendedMessageParam[],
    model?: string,
    strategy?: MemoryOptimizationStrategy
  ): Promise<MemoryCompressionResult> {
    const cacheKey = this.getCacheKey(messages, model || 'default');
    
    if (this.messageCache.has(cacheKey)) {
      const cachedMessages = this.messageCache.get(cacheKey)!;
      const originalStats = await this.getMemoryStats(messages, model);
      const newStats = await this.getMemoryStats(cachedMessages, model);
      
      return {
        originalTokenCount: originalStats.totalTokens,
        newTokenCount: newStats.totalTokens,
        compressionRatio: newStats.totalTokens / originalStats.totalTokens,
        strategy: strategy || this.options.defaultStrategy,
        keptMessages: cachedMessages.length,
        removedMessages: messages.length - cachedMessages.length,
      };
    }
    
    const originalStats = await this.getMemoryStats(messages, model);
    const selectedStrategy = strategy || this.options.defaultStrategy;
    
    let optimizedMessages: ExtendedMessageParam[];
    
    switch (selectedStrategy) {
      case MemoryOptimizationStrategy.SUMMARIZE:
        optimizedMessages = await this.summarizeMessages(messages, model || 'claude-3-5-sonnet-20241022');
        break;
      case MemoryOptimizationStrategy.TRUNCATE:
        optimizedMessages = this.truncateMessages(messages);
        break;
      case MemoryOptimizationStrategy.PRIORITIZE:
        optimizedMessages = this.prioritizeMessages(messages);
        break;
      case MemoryOptimizationStrategy.COMPRESS:
        optimizedMessages = await this.compressMessages(messages, model || 'claude-3-5-sonnet-20241022');
        break;
      default:
        optimizedMessages = messages;
    }
    
    this.messageCache.set(cacheKey, optimizedMessages);
    
    const newStats = await this.getMemoryStats(optimizedMessages, model);
    
    const result: MemoryCompressionResult = {
      originalTokenCount: originalStats.totalTokens,
      newTokenCount: newStats.totalTokens,
      compressionRatio: newStats.totalTokens / originalStats.totalTokens,
      strategy: selectedStrategy,
      keptMessages: optimizedMessages.length,
      removedMessages: messages.length - optimizedMessages.length,
    };
    
    logger.debug('Memory optimization completed', result);
    
    return result;
  }
  
  /**
   * Summarize conversation context
   */
  private async summarizeMessages(
    messages: ExtendedMessageParam[],
    model: string
  ): Promise<ExtendedMessageParam[]> {
    if (messages.length <= this.options.preserveRecentMessages) {
      return messages;
    }
    
    try {
      // Keep system messages and recent messages
      const systemMessages = this.options.preserveSystemPrompts 
        ? messages.filter(msg => msg.role === 'system')
        : [];
      
      const recentMessages = messages.slice(-this.options.preserveRecentMessages);
      
      // Messages to summarize
      const messagesToSummarize = messages.filter(msg => {
        const isSystem = msg.role === 'system';
        const isRecent = recentMessages.includes(msg);
        return !isSystem && !isRecent;
      });
      
      if (messagesToSummarize.length === 0) {
        return messages;
      }
      
      // Create a summary request (convert to MessageParam format)
      const summaryRequest: MessageParam[] = [
        {
          role: 'user',
          content: `Summarize the following conversation context concisely while preserving all important information, facts, code, and decisions:

${messagesToSummarize.map(msg => {
  const role = msg.role.toUpperCase();
  const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
  return `${role}: ${content}`;
}).join('\n\n')}`
        }
      ];
      
      // Generate summary
      const summaryResponse = await this.contentGenerator.generate(
        summaryRequest,
        { model }
      );
      
      const summaryText = summaryResponse.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('');
      
      // Create new optimized message list
      const result: ExtendedMessageParam[] = [
        ...systemMessages,
        {
          role: 'system',
          content: `[CONVERSATION SUMMARY]: ${summaryText}`
        } as ExtendedMessageParam,
        ...recentMessages
      ];
      
      return result;
    } catch (error) {
      logger.error('Failed to summarize conversation', error);
      
      // Fall back to truncation
      return this.truncateMessages(messages);
    }
  }
  
  /**
   * Truncate messages to fit context window
   */
  private truncateMessages(messages: ExtendedMessageParam[]): ExtendedMessageParam[] {
    // Keep system messages and recent messages
    const systemMessages = this.options.preserveSystemPrompts 
      ? messages.filter(msg => msg.role === 'system')
      : [];
    
    const recentMessages = messages.slice(-this.options.preserveRecentMessages);
    
    // Compute how many additional messages we can keep
    const targetMessageCount = Math.floor(
      messages.length * this.options.maxContextUtilization
    );
    
    const additionalMessagesNeeded = Math.max(
      0, 
      targetMessageCount - systemMessages.length - recentMessages.length
    );
    
    // Middle messages (excluding system and recent)
    const middleMessages = messages.filter(msg => {
      const isSystem = msg.role === 'system';
      const isRecent = recentMessages.includes(msg);
      return !isSystem && !isRecent;
    });
    
    // Keep as many middle messages as we can
    const keptMiddleMessages = middleMessages.slice(-additionalMessagesNeeded);
    
    // Combine all parts
    return [
      ...systemMessages,
      ...keptMiddleMessages,
      ...recentMessages.filter(msg => !systemMessages.includes(msg))
    ];
  }
  
  /**
   * Prioritize messages based on importance
   */
  private prioritizeMessages(messages: ExtendedMessageParam[]): ExtendedMessageParam[] {
    // Priority scoring
    const getPriority = (msg: ExtendedMessageParam): number => {
      // System messages get highest priority
      if (msg.role === 'system') {
        return 100;
      }
      
      // Check for explicit priority markers
      const contentStr = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      
      if (contentStr.includes('[CRITICAL]')) return 90;
      if (contentStr.includes('[HIGH]')) return 80;
      if (contentStr.includes('[MEDIUM]')) return 70;
      if (contentStr.includes('[LOW]')) return 60;
      
      // Recent messages get higher priority
      const indexPriority = messages.indexOf(msg) / messages.length * 50;
      
      // Tool messages get lower priority unless they contain code
      if (msg.role === 'tool') {
        return contentStr.includes('```') ? 65 : 40;
      }
      
      // Base priority plus index priority
      return 50 + indexPriority;
    };
    
    // Sort by priority (higher first)
    const sortedMessages = [...messages].sort(
      (a, b) => getPriority(b) - getPriority(a)
    );
    
    // Keep top percentage based on maxContextUtilization
    const keepCount = Math.max(
      this.options.preserveRecentMessages,
      Math.floor(messages.length * this.options.maxContextUtilization)
    );
    
    return sortedMessages.slice(0, keepCount);
  }
  
  /**
   * Compress messages by removing less important parts
   */
  private async compressMessages(
    messages: ExtendedMessageParam[],
    model: string
  ): Promise<ExtendedMessageParam[]> {
    return Promise.all(messages.map(async msg => {
      // Don't compress system messages or short messages
      if (msg.role === 'system') {
        return msg;
      }
      
      const contentStr = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
        
      // Don't compress short messages
      if (contentStr.length < 500) {
        return msg;
      }
      
      try {
        // For long messages, create a compressed version
        const compressionRequest: MessageParam[] = [
          {
            role: 'user',
            content: `Compress the following message by removing redundant information while preserving all important facts, code, and details:
            
${contentStr}`
          }
        ];
        
        const compressionResponse = await this.contentGenerator.generate(
          compressionRequest,
          { model, maxTokens: Math.floor(this.estimateTokenCount({ content: contentStr } as ExtendedMessageParam) * 0.6) }
        );
        
        const compressedText = compressionResponse.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('');
        
        // Only use the compressed version if it's actually smaller
        if (compressedText.length < contentStr.length * 0.8) {
          return {
            ...msg,
            content: compressedText
          };
        }
      } catch (error) {
        logger.error('Failed to compress message', error);
      }
      
      return msg;
    }));
  }
  
  /**
   * Estimate token count for a message or messages
   * 
   * Simple heuristic: ~4 characters per token
   */
  private estimateTokenCount(message: ExtendedMessageParam | ExtendedMessageParam[]): number {
    const messages = Array.isArray(message) ? message : [message];
    
    return messages.reduce((total, msg) => {
      const contentStr = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      
      // Rough estimate: 4 characters per token
      return total + Math.ceil(contentStr.length / 4);
    }, 0);
  }
  
  /**
   * Generate cache key for messages and model
   */
  private getCacheKey(messages: ExtendedMessageParam[], model: string): string {
    const messageHash = messages
      .map(msg => `${msg.role}:${typeof msg.content === 'string' ? msg.content.slice(0, 50) : 'complex'}`)
      .join('|');
    
    return `${model}:${messageHash}:${messages.length}`;
  }
}

/**
 * Create a memory manager
 */
export function createMemoryManager(
  contentGenerator: ContentGenerator,
  options?: MemoryManagerOptions
): MemoryManager {
  return new MemoryManager(contentGenerator, options);
}