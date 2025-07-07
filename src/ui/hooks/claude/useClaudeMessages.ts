/**
 * Claude Messages Hook - Clean Architecture like Gemini CLI
 * 
 * Focused hook for managing Claude message history and formatting
 */

import { useCallback } from 'react';
import { MessageType } from '../../types.js';
import { ConversationCompressor } from '../../../ai/conversation-compression.js';
import { logger } from '../../../utils/logger.js';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { HistoryItem } from '../../types.js';
import type { ClaudeMessage } from './types.js';
import type { ClaudeClient } from '../../../ai/claude-client.js';

/**
 * Hook for managing Claude messages
 */
export function useClaudeMessages(
  history: HistoryItem[],
  useConversationHistory: boolean = true,
  enableDebugLogging: boolean = false
) {
  // Build message history for Claude from UI history
  const buildClaudeMessages = useCallback((): ClaudeMessage[] => {
    if (!useConversationHistory) {
      return [];
    }
    
    return history
      .filter(item => item.type === MessageType.USER || item.type === MessageType.ASSISTANT)
      .map(item => ({
        role: (item.type === MessageType.USER ? 'user' : 'assistant') as 'user' | 'assistant',
        content: item.text
      }));
  }, [history, useConversationHistory]);

  // Compress conversation if needed
  const compressConversationIfNeeded = useCallback(async (
    claudeClient: ClaudeClient,
    messageHistory: ClaudeMessage[],
    newQuery: string
  ): Promise<ClaudeMessage[]> => {
    if (!useConversationHistory || !claudeClient.getContentGenerator) {
      return messageHistory;
    }

    try {
      const compressor = new ConversationCompressor(claudeClient.getContentGenerator());
      
      // Convert to MessageParam format for compression
      const messageParams: MessageParam[] = messageHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      const fullHistory = [...messageParams, { role: 'user' as const, content: newQuery }];
      
      // Check if compression is needed
      const needsCompression = await compressor.needsCompression(fullHistory);
      if (needsCompression) {
        if (enableDebugLogging) {
          logger.debug('Compressing conversation to stay within token limits...');
        }
        
        const compressedHistory = await compressor.autoCompress(fullHistory);
        
        // Convert back to our message format
        const compressedMessages = compressedHistory.slice(0, -1).map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }));
        
        if (enableDebugLogging) {
          logger.info('Conversation compressed to prevent token limit', {
            originalLength: fullHistory.length,
            compressedLength: compressedHistory.length
          });
        }
        
        return compressedMessages;
      }
      
      return messageHistory;
    } catch (error) {
      logger.warn('Failed to compress conversation, using original:', error);
      return messageHistory;
    }
  }, [useConversationHistory, enableDebugLogging]);

  // Prepare query input for Claude
  const prepareQueryInput = useCallback((
    messageHistory: ClaudeMessage[],
    query: string
  ) => {
    return useConversationHistory 
      ? [...messageHistory, { role: 'user' as const, content: query }]
      : query;
  }, [useConversationHistory]);

  // Format debug message for UI
  const formatDebugMessage = useCallback((
    messageHistory: ClaudeMessage[],
    query: string
  ): string => {
    if (useConversationHistory) {
      return `Sending query to Claude with ${messageHistory.length + 1} messages + project context`;
    } else {
      return `Sending query to Claude with ${query.length} characters + project context`;
    }
  }, [useConversationHistory]);

  return {
    buildClaudeMessages,
    compressConversationIfNeeded,
    prepareQueryInput,
    formatDebugMessage,
  };
} 