/**
 * Claude Core Hook - Clean Architecture like Gemini CLI
 * 
 * Main Claude hook that composes all focused hooks
 */

import { useCallback, useEffect, useMemo } from 'react';
import { MessageType, StreamingState } from '../../types.js';
import { logger } from '../../../utils/logger.js';
import { useOperationStatus } from '../useOperationStatus.js';

// Focused hooks
import { useClaudeState } from './useClaudeState.js';
import { useClaudeTools } from './useClaudeTools.js';
import { useClaudeContext } from './useClaudeContext.js';
import { useClaudeMessages } from './useClaudeMessages.js';
import { useClaudeStream } from './useClaudeStream.js';

// Types
import type { ClaudeReturn, ClaudeDependencies, ClaudeOptions } from './types.js';

/**
 * Main Claude Hook - Composes all focused hooks
 */
export function useClaudeCore(
  dependencies: ClaudeDependencies,
  options: ClaudeOptions = {}
): ClaudeReturn {
  // Default options
  const {
    enableAdvancedStreaming = true,
    useConversationHistory = true,
    enableRealToolExecution = true,
    maxRetries = 3,
    requestTimeout = 120000,
    enableDebugLogging = false
  } = options;

  const { claudeClient, history, addItem, config, setDebugMessage, handleSlashCommand } = dependencies;

  // State management
  const {
    streamingState,
    initError,
    thought,
    pendingHistoryItems,
    streamingText,
    streamingItemId,
    lastQuery,
    retryCount,
    contextIntegration,
    setInitError,
    setLastQuery,
    setRetryCount,
    getUniqueId,
    clearPendingItems,
    cancelStreaming,
    updateStreamingState,
    updateThought,
    updateStreamingText,
    addPendingItem,
    updatePendingItem,
    setAbortController,
    setRequestTimeout,
    clearRequestTimeout,
    abortControllerRef,
  } = useClaudeState();

  // Tool execution
  const {
    extractToolUseBlocks,
    handleToolUses,
    getAvailableTools,
  } = useClaudeTools(addItem, enableRealToolExecution, enableDebugLogging);

  // Context management
  const {
    storeQueryInMemory,
    createContextSnapshot,
    buildSystemPrompt,
  } = useClaudeContext(config, useConversationHistory, enableDebugLogging);

  // Message handling
  const {
    buildClaudeMessages,
    compressConversationIfNeeded,
    prepareQueryInput,
    formatDebugMessage,
  } = useClaudeMessages(history, useConversationHistory, enableDebugLogging);

  // Streaming
  const {
    handleStreamingResponse,
  } = useClaudeStream(
    addItem,
    clearPendingItems,
    updatePendingItem,
    updateStreamingText,
    updateStreamingState
  );

  // Operation tracking
  const operationTracker = useOperationStatus();

  // Check if client is initialized
  const isInitialized = useMemo(() => !!claudeClient, [claudeClient]);

  // Initialize client if needed
  useEffect(() => {
    if (!isInitialized && !initError) {
      setInitError('Claude AI client is not initialized');
    } else if (isInitialized && initError) {
      setInitError(null);
    }
  }, [isInitialized, initError, setInitError]);

  // Submit a query to Claude
  const submitQuery = useCallback(
    async (query: string) => {
      // Store query for retry functionality
      setLastQuery(query);
      setRetryCount(0);
      
      // Check if this is a slash command
      if (query.startsWith('/')) {
        const handled = handleSlashCommand(query);
        if (handled) {
          return;
        }
      }
      
      // Validate client
      if (!claudeClient) {
        const error = 'Claude AI client is not initialized';
        setInitError(error);
        throw new Error(error);
      }
      
      // Cancel any existing request
      cancelStreaming();
      
      // Create new abort controller
      const abortController = new AbortController();
      setAbortController(abortController);
      
      // Add user message to history
      const timestamp = Date.now();
      addItem(
        {
          type: MessageType.USER,
          text: query,
        },
        timestamp
      );
      
      // Store query in memory
      await storeQueryInMemory(query);
      
      // Capture context snapshot before processing
      await createContextSnapshot();
      
      // Create pending assistant response
      const assistantItem = {
        id: getUniqueId(),
        type: MessageType.ASSISTANT,
        text: '',
        timestamp: timestamp + 1,
      };
      
      addPendingItem(assistantItem);
      
      // Set streaming state
      if (enableAdvancedStreaming) {
        updateStreamingState(StreamingState.RESPONDING);
        updateThought('Analyzing your request...');
      } else {
        updateStreamingState(StreamingState.RESPONDING);
      }
      
      // Start operation tracking
      operationTracker.clearOperations();
      const queryOpId = operationTracker.startOperation('query_processing', '🧠 Processing your query...');
      
      // Set request timeout
      const timeout = setTimeout(() => {
        cancelStreaming();
        addItem(
          {
            type: MessageType.ERROR,
            text: `Request timed out after ${requestTimeout / 1000} seconds`,
          },
          timestamp + 2
        );
        updateStreamingState(StreamingState.ERROR);
      }, requestTimeout);
      setRequestTimeout(timeout);
      
      try {
        // Build system prompt with context
        const systemPrompt = buildSystemPrompt();
        
        // Build message history
        let messageHistory = buildClaudeMessages();
        
        // Compress conversation if needed
        messageHistory = await compressConversationIfNeeded(claudeClient, messageHistory, query);
        
        // Prepare query input
        const queryInput = prepareQueryInput(messageHistory, query);
        
        // Set debug message
        setDebugMessage(formatDebugMessage(messageHistory, query));
        
        // Get available tools
        const availableTools = getAvailableTools();
        
        // Update streaming state
        updateStreamingState(StreamingState.RESPONDING);
        updateThought('Generating response...');
        
        // Update operation status
        operationTracker.updateOperation(queryOpId, 'executing', '🤖 Querying Claude 4 Sonnet...');
        
        // Query Claude
        const response = await claudeClient.query(
          queryInput,
          {
            system: systemPrompt,
            temperature: config.ai?.temperature || 0.7,
            maxTokens: config.ai?.maxTokens || 4000,
            tools: availableTools.length > 0 ? availableTools : undefined,
            signal: abortController.signal
          }
        );
        
        // Clear timeout
        clearRequestTimeout();
        
        // Update operation status
        operationTracker.updateOperation(queryOpId, 'executing', '📝 Processing Claude response...');
        
        // Process response
        const contentArray = Array.isArray(response.message.content) 
          ? response.message.content 
          : [{ type: 'text', text: response.message.content }];
        
        const toolUses = extractToolUseBlocks(contentArray);
        
        if (toolUses.length > 0 && enableRealToolExecution) {
          // Handle tool execution
          updateStreamingState(StreamingState.TOOL_EXECUTING);
          updateThought('Executing tools...');
          
          const toolResults = await handleToolUses(toolUses);
          
          // Get response text
          const responseContentText = Array.isArray(response.message.content)
            ? response.message.content.map((block: any) => 
                block.type === 'text' ? block.text || '' : ''
              ).join('')
            : response.message.content;
          
          // Query Claude again with tool results for final response
          const finalMessageHistory = [
            ...messageHistory,
            { role: 'user' as const, content: query },
            { role: 'assistant' as const, content: responseContentText },
            ...toolResults.map(result => ({
              role: 'user' as const,
              content: `Tool result from ${result.tool_use_id}: ${result.content}`
            }))
          ];
          
          const finalResponse = await claudeClient.query(
            useConversationHistory ? finalMessageHistory : query,
            {
              system: systemPrompt,
              temperature: config.ai?.temperature || 0.7,
              maxTokens: config.ai?.maxTokens || 4000,
              signal: abortController.signal
            }
          );
          
          // Extract final response text
          let finalResponseText = '';
          const finalContentArray = Array.isArray(finalResponse.message.content)
            ? finalResponse.message.content
            : [{ type: 'text', text: finalResponse.message.content }];
            
          for (const block of finalContentArray) {
            if (block.type === 'text') {
              finalResponseText += block.text;
            }
          }
          
          // Update pending item and add to history
          updatePendingItem(assistantItem.id!, { text: finalResponseText });
          
          addItem(
            {
              type: MessageType.ASSISTANT,
              text: finalResponseText,
            },
            timestamp + toolResults.length + 2
          );
          
          // Update debug message
          if (finalResponse.usage) {
            setDebugMessage(`Response: ${finalResponse.usage.input_tokens} in, ${finalResponse.usage.output_tokens} out tokens`);
          }
        } else {
          // Handle regular response without tools
          let responseText = '';
          for (const block of contentArray) {
            if (block.type === 'text') {
              responseText += block.text;
            }
          }
          
          // Update pending item and add to history
          updatePendingItem(assistantItem.id!, { text: responseText });
          
          addItem(
            {
              type: MessageType.ASSISTANT,
              text: responseText,
            },
            timestamp + 2
          );
          
          // Update debug message
          if (response.usage) {
            setDebugMessage(`Response: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out tokens`);
          }
        }
        
        // Capture context snapshot after response
        await createContextSnapshot();
        
        // Clear streaming state
        clearPendingItems();
        updateStreamingState(StreamingState.IDLE);
        
        // Complete operation tracking
        operationTracker.completeOperation(queryOpId, true, '✅ Response generated successfully');
        
        // Reset to idle after brief delay
        setTimeout(() => {
          updateStreamingState(StreamingState.IDLE);
        }, 1000);
        
        if (enableDebugLogging) {
          logger.debug('Query completed successfully');
        }
        
      } catch (error) {
        // Clear timeout
        clearRequestTimeout();
        
        // Handle abort
        if (error instanceof Error && error.name === 'AbortError') {
          operationTracker.completeOperation(queryOpId, false, '⚠️ Request was cancelled');
          if (enableDebugLogging) {
            logger.debug('Request was cancelled');
          }
          return;
        }
        
        if (enableDebugLogging) {
          logger.error('Error streaming response from Claude:', error);
        }
        
        // Complete operation with error
        operationTracker.completeOperation(queryOpId, false, `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        
        // Add error to history
        addItem(
          {
            type: MessageType.ERROR,
            text: `Error getting response from Claude: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
          timestamp + 2
        );
        
        // Reset state
        clearPendingItems();
        updateStreamingState(StreamingState.ERROR);
        
        // Reset to idle after delay
        setTimeout(() => {
          updateStreamingState(StreamingState.IDLE);
        }, 3000);
      }
    },
    [
      setLastQuery,
      setRetryCount,
      handleSlashCommand,
      claudeClient,
      setInitError,
      cancelStreaming,
      setAbortController,
      addItem,
      storeQueryInMemory,
      createContextSnapshot,
      getUniqueId,
      addPendingItem,
      enableAdvancedStreaming,
      updateStreamingState,
      updateThought,
      operationTracker,
      setRequestTimeout,
      requestTimeout,
      buildSystemPrompt,
      buildClaudeMessages,
      compressConversationIfNeeded,
      prepareQueryInput,
      formatDebugMessage,
      setDebugMessage,
      getAvailableTools,
      clearRequestTimeout,
      extractToolUseBlocks,
      enableRealToolExecution,
      handleToolUses,
      updatePendingItem,
      clearPendingItems,
      enableDebugLogging,
      config,
      useConversationHistory
    ]
  );
  
  // Retry last request
  const retryLastRequest = useCallback(async () => {
    if (!lastQuery) {
      logger.warn('No previous query to retry');
      return;
    }
    
    if (retryCount >= maxRetries) {
      addItem(
        {
          type: MessageType.ERROR,
          text: `Maximum retry attempts (${maxRetries}) exceeded`,
        },
        Date.now()
      );
      return;
    }
    
    setRetryCount(prev => prev + 1);
    
    if (enableDebugLogging) {
      logger.debug(`Retrying request (attempt ${retryCount + 1}/${maxRetries})`);
    }
    
    await submitQuery(lastQuery);
  }, [lastQuery, retryCount, maxRetries, addItem, enableDebugLogging, submitQuery, setRetryCount]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelStreaming();
    };
  }, [cancelStreaming]);
  
  return {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems,
    clearPendingItems,
    thought,
    streamingText,
    streamingItemId,
    isInitialized,
    retryLastRequest,
    cancelStreaming,
    operationTracker,
    contextIntegration,
  };
}