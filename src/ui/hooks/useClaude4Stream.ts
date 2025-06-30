/**
 * Claude 4 Stream Hook
 * 
 * Enhanced streaming communication with Claude 4 AI, including improved tool use
 * and streaming capabilities.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { StreamingState, MessageType, HistoryItem } from '../types';
import { UnifiedClaudeClient, CLAUDE_4_MODELS } from '../../ai/claude4-client';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/index.js';
import { toolRegistry } from '../../tools/index.js';

/**
 * Tool use interface from Claude API
 */
interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Tool result interface
 */
interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Stream event types from Claude 4 API
 */
interface StreamEvent {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_stop';
  content_block?: { type: string };
  delta?: { type: string; text?: string };
}

/**
 * Hook for managing Claude 4 AI streaming
 */
export function useClaude4Stream(
  claudeClient: UnifiedClaudeClient | null,
  history: HistoryItem[],
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
  setShowHelp: (show: boolean) => void,
  config: any,
  setDebugMessage: (message: string) => void,
  handleSlashCommand: (input: string) => boolean,
  refreshContextFiles: () => void,
) {
  // Streaming state
  const [streamingState, setStreamingState] = useState<StreamingState>(StreamingState.Idle);
  
  // Initialization error
  const [initError, setInitError] = useState<string | null>(null);
  
  // Current thought from Claude
  const [thought, setThought] = useState<string>('');
  
  // Pending history items (items being streamed)
  const [pendingHistoryItems, setPendingHistoryItems] = useState<HistoryItem[]>([]);
  
  // Currently streaming text
  const [streamingText, setStreamingText] = useState<string>('');
  
  // Current streaming item ID
  const [streamingItemId, setStreamingItemId] = useState<string | null>(null);
  
  // Clear pending items
  const clearPendingItems = useCallback(() => {
    setPendingHistoryItems([]);
    setStreamingText('');
    setStreamingItemId(null);
  }, []);
  
  // Check if client is initialized
  const isClientInitialized = useMemo(() => {
    return !!claudeClient;
  }, [claudeClient]);
  
  // Initialize client if needed
  useEffect(() => {
    if (!isClientInitialized && !initError) {
      setInitError('Claude 4 AI client is not initialized');
    } else if (isClientInitialized && initError) {
      setInitError(null);
    }
  }, [isClientInitialized, initError]);

  // Build message history for Claude from UI history
  const buildClaudeMessages = useCallback(() => {
    // Filter to only user and assistant messages
    return history
      .filter(item => item.type === MessageType.USER || item.type === MessageType.ASSISTANT)
      .map(item => ({
        role: item.type === MessageType.USER ? 'user' : 'assistant',
        content: item.text
      }));
  }, [history]);
  
  // Extract tool use blocks from Claude message
  const extractToolUseBlocks = useCallback((content: any[]): ToolUseBlock[] => {
    return content
      .filter(block => block.type === 'tool_use')
      .map(block => block as ToolUseBlock);
  }, []);

  // Execute tool and get result
  const executeTool = useCallback(async (toolUse: ToolUseBlock): Promise<ToolResult> => {
    // Add tool use to history
    const timestamp = Date.now();
    addItem(
      {
        type: MessageType.TOOL_USE,
        text: `Tool: ${toolUse.name}`,
        toolUse: {
          name: toolUse.name,
          input: toolUse.input,
          id: toolUse.id
        }
      },
      timestamp
    );

    try {
      // Find the tool in the registry
      const tool = toolRegistry.getTool(toolUse.name);
      
      if (!tool) {
        throw new Error(`Tool not found: ${toolUse.name}`);
      }
      
      logger.debug(`Executing tool: ${toolUse.name}`, toolUse.input);
      
      // Execute the tool
      const result = await tool.execute(toolUse.input);
      
      // Format the tool result
      const toolResult: ToolResult = {
        tool_use_id: toolUse.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
        is_error: false
      };

      // Add tool result to history
      addItem(
        {
          type: MessageType.TOOL_OUTPUT,
          text: toolResult.content,
          toolResult: {
            content: toolResult.content,
            isError: !!toolResult.is_error,
            toolUseId: toolResult.tool_use_id
          }
        },
        timestamp + 1
      );

      return toolResult;
    } catch (error) {
      // Handle error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult: ToolResult = {
        tool_use_id: toolUse.id,
        content: errorMessage,
        is_error: true
      };

      // Add error result to history
      addItem(
        {
          type: MessageType.TOOL_OUTPUT,
          text: errorMessage,
          toolResult: {
            content: errorMessage,
            isError: true,
            toolUseId: toolUse.id
          }
        },
        timestamp + 1
      );

      return errorResult;
    }
  }, [addItem]);

  // Handle tool use requests from Claude
  const handleToolUses = useCallback(async (toolUses: ToolUseBlock[]): Promise<ToolResult[]> => {
    // Execute tools sequentially
    const results: ToolResult[] = [];
    
    for (const toolUse of toolUses) {
      const result = await executeTool(toolUse);
      results.push(result);
    }
    
    return results;
  }, [executeTool]);

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
          setPendingHistoryItems([{
            ...pendingItem,
            text: updatedContent
          }]);
          
          // Update streaming text
          setStreamingText(updatedContent);
        }
        break;
        
      case 'content_block_stop':
        // Block is complete
        break;
        
      case 'message_stop':
        // Message is complete
        // Add the final message to history
        addItem(
          {
            type: MessageType.ASSISTANT,
            text: updatedContent,
          },
          pendingItem.timestamp
        );
        
        // Clear streaming state
        clearPendingItems();
        setStreamingState(StreamingState.Idle);
        break;
    }
    
    return updatedContent;
  }, [addItem, clearPendingItems]);

  // Submit a query to Claude 4
  const submitQuery = useCallback(
    async (query: string) => {
      // Check if this is a slash command
      if (query.startsWith('/')) {
        const handled = handleSlashCommand(query);
        if (handled) {
          return;
        }
      }
      
      // Add user message to history
      const timestamp = Date.now();
      addItem(
        {
          type: MessageType.USER,
          text: query,
        },
        timestamp
      );
      
      // Create pending assistant response
      const assistantItem: HistoryItem = {
        id: `pending-${timestamp}`,
        type: MessageType.ASSISTANT,
        text: '',
        timestamp: timestamp + 1,
      };
      
      setPendingHistoryItems([assistantItem]);
      setStreamingItemId(assistantItem.id);
      
      // Set streaming state to responding
      setStreamingState(StreamingState.Responding);
      setThought('Thinking about your question...');
      
      // Execute query
      try {
        if (!claudeClient) {
          throw new Error('Claude 4 AI client is not initialized');
        }
        
        // Build message history
        const messageHistory = buildClaudeMessages();
        
        // Add current query
        messageHistory.push({ role: 'user', content: query });
        
        // Load system prompt from config
        const appConfig = await loadConfig();
        const systemPrompt = appConfig.ai?.systemPrompt || 'You are Claude, a helpful AI assistant.';
        
        // Set debug message with token count
        setDebugMessage(`Sending query to Claude 4 with ${messageHistory.length} messages`);
        
        // Get all registered tools
        const tools = Array.from(toolRegistry.getDefinitions());
        
        // Simulate streaming response for now
        // In the real implementation, this would use the Claude 4 API's streaming capability
        try {
          // Query Claude 4
          const response = await claudeClient.query(
            messageHistory,
            {
              system: systemPrompt,
              temperature: appConfig.ai?.temperature || 0.7,
              maxTokens: appConfig.ai?.maxTokens || 4000,
              tools
            }
          );
          
          // Check for tool use requests
          const toolUses = extractToolUseBlocks(response.message.content);
          
          if (toolUses.length > 0) {
            setStreamingState(StreamingState.WaitingForConfirmation);
            
            // Execute tools
            const toolResults = await handleToolUses(toolUses);
            
            // Add tool results to message history
            const updatedMessageHistory = [
              ...messageHistory,
              { 
                role: 'assistant', 
                content: response.message.content.map(block => 
                  block.type === 'text' ? block.text : ''
                ).join('')
              },
              ...toolResults.map(result => ({
                role: 'tool' as any,
                content: result.content,
                tool_use_id: result.tool_use_id,
                is_error: result.is_error
              }))
            ];
            
            // Query Claude 4 again with tool results
            const finalResponse = await claudeClient.query(
              updatedMessageHistory,
              {
                system: systemPrompt,
                temperature: appConfig.ai?.temperature || 0.7,
                maxTokens: appConfig.ai?.maxTokens || 4000,
                tools
              }
            );
            
            // Extract response text
            let responseText = '';
            for (const block of finalResponse.message.content) {
              if (block.type === 'text') {
                responseText += block.text;
              }
            }
            
            // Update pending item with final response
            setPendingHistoryItems([{
              ...assistantItem,
              text: responseText
            }]);
            
            // Add final response to history
            addItem(
              {
                type: MessageType.ASSISTANT,
                text: responseText,
              },
              timestamp + toolResults.length + 2
            );
            
            // Update debug message with token usage
            if (finalResponse.usage) {
              setDebugMessage(`Response: ${finalResponse.usage.input_tokens} in, ${finalResponse.usage.output_tokens} out tokens`);
            }
          } else {
            // Extract response text
            let responseText = '';
            for (const block of response.message.content) {
              if (block.type === 'text') {
                responseText += block.text;
              }
            }
            
            // Update pending item with response
            setPendingHistoryItems([{
              ...assistantItem,
              text: responseText
            }]);
            
            // Add response to history
            addItem(
              {
                type: MessageType.ASSISTANT,
                text: responseText,
              },
              timestamp + 2
            );
            
            // Update debug message with token usage
            if (response.usage) {
              setDebugMessage(`Response: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out tokens`);
            }
          }
          
          // Clear pending items and reset state
          clearPendingItems();
          setStreamingState(StreamingState.Idle);
        } catch (error) {
          console.error('Error querying Claude 4:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error streaming response from Claude 4:', error);
        
        // Add error to history
        addItem(
          {
            type: MessageType.ERROR,
            text: `Error getting response from Claude 4: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
          timestamp + 2
        );
        
        // Reset state
        clearPendingItems();
        setStreamingState(StreamingState.Error);
      }
    },
    [
      handleSlashCommand,
      addItem,
      claudeClient,
      clearPendingItems,
      buildClaudeMessages,
      setDebugMessage,
      extractToolUseBlocks,
      handleToolUses,
      processStreamEvent
    ]
  );
  
  return {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems,
    clearPendingItems,
    thought,
    streamingText,
    streamingItemId
  };
}