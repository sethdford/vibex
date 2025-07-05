/**
 * Conversation Compression System
 * 
 * Automatically compresses conversations when approaching token limits
 * to prevent the 400 error we just encountered.
 */

import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ContentGenerator } from './content-generator.js';
import { logger } from '../utils/logger.js';

export interface CompressionResult {
  compressedMessages: MessageParam[];
  originalTokenCount: number;
  compressedTokenCount: number;
  compressionRatio: number;
  summary: string;
}

export interface CompressionOptions {
  maxTokens?: number;
  targetCompressionRatio?: number;
  preserveRecentMessages?: number;
  model?: string;
}

export class ConversationCompressor {
  private contentGenerator: ContentGenerator;
  
  constructor(contentGenerator: ContentGenerator) {
    this.contentGenerator = contentGenerator;
  }
  
  /**
   * Check if conversation needs compression
   */
  async needsCompression(
    messages: MessageParam[],
    maxTokens: number = 180000 // Leave buffer below 200k limit
  ): Promise<boolean> {
    try {
      const tokenCount = await this.estimateTokenCount(messages);
      return tokenCount > maxTokens;
    } catch (error) {
      logger.error('Error checking compression need:', error);
      return false;
    }
  }
  
  /**
   * Compress conversation by summarizing older messages
   */
  async compressConversation(
    messages: MessageParam[],
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const {
      maxTokens = 180000,
      targetCompressionRatio = 0.6,
      preserveRecentMessages = 10,
      model = 'claude-3-5-sonnet-20241022'
    } = options;
    
    const originalTokenCount = await this.estimateTokenCount(messages);
    
    if (originalTokenCount <= maxTokens) {
      return {
        compressedMessages: messages,
        originalTokenCount,
        compressedTokenCount: originalTokenCount,
        compressionRatio: 1.0,
        summary: 'No compression needed'
      };
    }
    
    // Keep recent messages intact
    const recentMessages = messages.slice(-preserveRecentMessages);
    const messagesToCompress = messages.slice(0, -preserveRecentMessages);
    
    if (messagesToCompress.length === 0) {
      return {
        compressedMessages: recentMessages,
        originalTokenCount,
        compressedTokenCount: await this.estimateTokenCount(recentMessages),
        compressionRatio: recentMessages.length / messages.length,
        summary: 'Kept only recent messages'
      };
    }
    
    // Create summary of older messages
    const summary = await this.summarizeMessages(messagesToCompress, model);
    
    // Create compressed conversation
    const summaryMessage: MessageParam = {
      role: 'user',
      content: `[CONVERSATION SUMMARY - Previous messages compressed]\n\n${summary}`
    };
    
    const compressedMessages = [summaryMessage, ...recentMessages];
    const compressedTokenCount = await this.estimateTokenCount(compressedMessages);
    
    return {
      compressedMessages,
      originalTokenCount,
      compressedTokenCount,
      compressionRatio: compressedTokenCount / originalTokenCount,
      summary
    };
  }
  
  /**
   * Summarize a set of messages
   */
  private async summarizeMessages(
    messages: MessageParam[],
    model: string
  ): Promise<string> {
    try {
      const conversationText = messages.map(msg => {
        const role = msg.role;
        const content = typeof msg.content === 'string' 
          ? msg.content 
          : Array.isArray(msg.content)
            ? msg.content.map(block => 
                block.type === 'text' ? block.text : `[${block.type}]`
              ).join(' ')
            : '[complex content]';
        return `${role}: ${content}`;
      }).join('\n\n');
      
      const summaryPrompt: MessageParam[] = [
        {
          role: 'user',
          content: `Please create a concise but comprehensive summary of this conversation, preserving key information, decisions, and context that would be important for continuing the discussion:

${conversationText}

Focus on:
- Main topics discussed
- Key decisions or conclusions
- Important technical details
- Context needed for future messages
- Any ongoing tasks or goals

Keep the summary detailed enough to maintain conversation continuity.`
        }
      ];
      
      const response = await this.contentGenerator.generate(summaryPrompt, { model });
      
      return response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');
        
    } catch (error) {
      logger.error('Error summarizing messages:', error);
      return 'Error creating summary - conversation history compressed';
    }
  }
  
  /**
   * Estimate token count for messages
   */
  private async estimateTokenCount(messages: MessageParam[]): Promise<number> {
    // Simple estimation: ~4 characters per token
    const text = JSON.stringify(messages);
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Auto-compress if needed
   */
  async autoCompress(
    messages: MessageParam[],
    options: CompressionOptions = {}
  ): Promise<MessageParam[]> {
    const needsCompression = await this.needsCompression(
      messages, 
      options.maxTokens
    );
    
    if (!needsCompression) {
      return messages;
    }
    
    logger.info('Auto-compressing conversation due to token limit');
    
    const result = await this.compressConversation(messages, options);
    
    logger.info('Conversation compressed', {
      originalTokens: result.originalTokenCount,
      compressedTokens: result.compressedTokenCount,
      ratio: result.compressionRatio
    });
    
    return result.compressedMessages;
  }
}

export function createConversationCompressor(
  contentGenerator: ContentGenerator
): ConversationCompressor {
  return new ConversationCompressor(contentGenerator);
} 