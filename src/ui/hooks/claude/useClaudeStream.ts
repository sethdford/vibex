/**
 * Claude Stream Hook - Clean Architecture like Gemini CLI
 * 
 * Focused hook for handling Claude streaming responses
 */

import { useCallback } from 'react';
import { MessageType } from '../../types.js';
import { StreamingState } from '../../types.js';
import type { StreamEvent, HistoryItem } from './types.js';

/**
 * Hook for managing Claude streaming
 */
export function useClaudeStream(
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
  clearPendingItems: () => void,
  updatePendingItem: (itemId: string, updates: Partial<HistoryItem>) => void,
  updateStreamingText: (text: string) => void,
  updateStreamingState: (state: StreamingState) => void
) {
  // Process streaming events from Claude
  const processStreamEvent = useCallback((
    event: StreamEvent, 
    streamingContent: string,
    pendingItem: HistoryItem
  ): string => {
    let updatedContent = streamingContent;
    
    switch (event.type) {
      case 'content_block_delta':
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          updatedContent += event.delta.text;
          
          // Update the pending item with the new content
          updatePendingItem(pendingItem.id!, { text: updatedContent });
          
          // Update streaming text
          updateStreamingText(updatedContent);
        }
        break;
        
      case 'content_block_stop':
        // Block is complete
        break;
        
      case 'message_stop':
        // Message is complete
        addItem(
          {
            type: MessageType.ASSISTANT,
            text: updatedContent,
          },
          pendingItem.timestamp
        );
        
        clearPendingItems();
        updateStreamingState(StreamingState.IDLE);
        break;
    }
    
    return updatedContent;
  }, [addItem, clearPendingItems, updatePendingItem, updateStreamingText, updateStreamingState]);

  // Handle streaming response
  const handleStreamingResponse = useCallback((
    response: any,
    pendingItem: HistoryItem,
    onStreamEvent?: (event: StreamEvent) => void
  ) => {
    let streamingContent = '';
    
    // For non-streaming responses, process immediately
    if (!response.stream) {
      const contentArray = Array.isArray(response.message.content) 
        ? response.message.content 
        : [{ type: 'text', text: response.message.content }];
      
      let responseText = '';
      for (const block of contentArray) {
        if (block.type === 'text') {
          responseText += block.text;
        }
      }
      
      // Update pending item and add to history
      updatePendingItem(pendingItem.id!, { text: responseText });
      
      addItem(
        {
          type: MessageType.ASSISTANT,
          text: responseText,
        },
        pendingItem.timestamp
      );
      
      clearPendingItems();
      updateStreamingState(StreamingState.COMPLETE);
      
      return responseText;
    }
    
    // Handle streaming response
    response.stream.on('data', (event: StreamEvent) => {
      streamingContent = processStreamEvent(event, streamingContent, pendingItem);
      onStreamEvent?.(event);
    });
    
    response.stream.on('end', () => {
      updateStreamingState(StreamingState.COMPLETE);
      setTimeout(() => {
        updateStreamingState(StreamingState.IDLE);
      }, 1000);
    });
    
    response.stream.on('error', (error: Error) => {
      addItem(
        {
          type: MessageType.ERROR,
          text: `Streaming error: ${error.message}`,
        },
        Date.now()
      );
      
      clearPendingItems();
      updateStreamingState(StreamingState.ERROR);
      
      setTimeout(() => {
        updateStreamingState(StreamingState.IDLE);
      }, 3000);
    });
    
    return streamingContent;
  }, [processStreamEvent, addItem, clearPendingItems, updatePendingItem, updateStreamingState]);

  return {
    processStreamEvent,
    handleStreamingResponse,
  };
} 