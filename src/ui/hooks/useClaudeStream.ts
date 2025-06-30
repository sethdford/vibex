/**
 * Claude Stream Hook
 * 
 * Manages streaming communication with Claude AI, including tool use.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { StreamingState, MessageType, HistoryItem } from '../types';
import { UnifiedClaudeClient } from '../../ai/unified-client';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/index.js';

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
 * Hook for managing Claude AI streaming
 * 
 * @param claudeClient - Claude API client instance
 * @param history - Conversation history
 * @param addItem - Function to add items to history
 * @param setShowHelp - Function to toggle help display
 * @param config - Application configuration
 * @param setDebugMessage - Function to set debug message
 * @param handleSlashCommand - Function to handle slash commands
 * @param refreshContextFiles - Function to refresh context files
 * @returns Object containing streaming state and handlers
 */
export function useClaudeStream(
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
  
  // Clear pending items
  const clearPendingItems = useCallback(() => {
    setPendingHistoryItems([]);
  }, []);
  
  // Check if client is initialized
  const isClientInitialized = useMemo(() => {
    return !!claudeClient;
  }, [claudeClient]);
  
  // Initialize client if needed
  useEffect(() => {
    if (!isClientInitialized && !initError) {
      setInitError('Claude AI client is not initialized');
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
      // For now, we'll simulate tool execution
      // In the real implementation, this would use the tool registry
      logger.debug(`Executing tool: ${toolUse.name}`, toolUse.input);
      
      // Simulate delay for tool execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success response
      const result: ToolResult = {
        tool_use_id: toolUse.id,
        content: JSON.stringify({ success: true, message: `Executed ${toolUse.name} successfully` }),
        is_error: false
      };

      // Add tool result to history
      addItem(
        {
          type: MessageType.TOOL_OUTPUT,
          text: result.content,
          toolResult: {
            content: result.content,
            isError: !!result.is_error,
            toolUseId: result.tool_use_id
          }
        },
        timestamp + 1
      );

      return result;
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

  // Submit a query to Claude
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
      
      // Set streaming state to responding
      setStreamingState(StreamingState.Responding);
      setThought('');
      
      // Execute query
      try {
        if (!claudeClient) {
          throw new Error('Claude AI client is not initialized');
        }
        
        // Build message history
        const messageHistory = buildClaudeMessages();
        
        // Add current query
        messageHistory.push({ role: 'user', content: query });
        
        // Load system prompt from config
        const appConfig = await loadConfig();
        const systemPrompt = appConfig.ai?.systemPrompt || 'You are Claude, a helpful AI assistant.';
        
        // Set debug message with token count
        setDebugMessage(`Sending query to Claude with ${messageHistory.length} messages`);
        
        try {
          // Query Claude
          const response = await claudeClient.query(
            messageHistory,
            {
              system: systemPrompt,
              temperature: appConfig.ai?.temperature || 0.7,
              maxTokens: appConfig.ai?.maxTokens || 4000
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
            
            // Query Claude again with tool results
            const finalResponse = await claudeClient.query(
              updatedMessageHistory,
              {
                system: systemPrompt,
                temperature: appConfig.ai?.temperature || 0.7,
                maxTokens: appConfig.ai?.maxTokens || 4000
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
            setDebugMessage(`Response: ${finalResponse.usage.input_tokens} in, ${finalResponse.usage.output_tokens} out, ${finalResponse.metrics.cost.toFixed(6)} USD`);
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
            setDebugMessage(`Response: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out, ${response.metrics.cost.toFixed(6)} USD`);
          }
          
          // Clear pending items and reset state
          clearPendingItems();
          setStreamingState(StreamingState.Idle);
        } catch (error) {
          console.error('Error querying Claude:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error streaming response from Claude:', error);
        
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
      handleToolUses
    ]
  );
  
  return {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems,
    clearPendingItems,
    thought,
  };
}