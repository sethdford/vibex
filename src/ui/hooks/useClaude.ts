/**
 * Claude Hook
 * 
 * Consolidated streaming communication with Claude AI that merges the functionality
 * of both useClaudeStream and useClaude4Stream into a single, comprehensive hook.
 * 
 * Features:
 * - Full conversation history support (from useClaude4Stream)
 * - Real tool registry integration (from useClaude4Stream)
 * - Advanced streaming with thinking blocks (from useClaude4Stream)
 * - Backward compatibility with both hook interfaces
 * - Enhanced error handling and recovery
 * - Performance optimizations
 * - Integrated conversation context management
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { HistoryItem } from '../types.js';
import { MessageType } from '../types.js';
import { StreamingState } from '../components/AdvancedStreamingDisplay.js';
import type { ClaudeClient } from '../../ai/claude-client.js';
import type { AppConfigType } from '../../config/schema.js';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/index.js';
import { toolRegistry } from '../../tools/index.js';
import { ConversationCompressor } from '../../ai/conversation-compression.js';
import { ConversationContextIntegration } from '../../context/conversation-context-integration.js';
import path from 'path';
import { useOperationStatus } from './useOperationStatus.js';

/**
 * Tool input parameters type
 */
type ToolInputParameters = Record<string, string | number | boolean | null | undefined>;

/**
 * Tool use interface from Claude API
 */
interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: ToolInputParameters;
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
 * Claude message content block interface
 */
interface MessageContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  [key: string]: unknown;
}

/**
 * Stream event types from Claude API
 */
interface StreamEvent {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_stop';
  content_block?: { type: string };
  delta?: { type: string; text?: string };
}

/**
 * Hook configuration options
 */
interface ClaudeOptions {
  /**
   * Whether to use advanced streaming features (thinking blocks, real-time updates)
   */
  enableAdvancedStreaming?: boolean;
  
  /**
   * Whether to use full conversation history vs single query
   */
  useConversationHistory?: boolean;
  
  /**
   * Whether to enable real tool execution vs mocked responses
   */
  enableRealToolExecution?: boolean;
  
  /**
   * Maximum retries for failed requests
   */
  maxRetries?: number;
  
  /**
   * Timeout for requests in milliseconds
   */
  requestTimeout?: number;
  
  /**
   * Whether to enable debug logging
   */
  enableDebugLogging?: boolean;
}

/**
 * Hook return interface
 */
interface ClaudeReturn {
  /**
   * Current streaming state
   */
  streamingState: StreamingState;
  
  /**
   * Submit a query to Claude
   */
  submitQuery: (query: string) => Promise<void>;
  
  /**
   * Initialization error if any
   */
  initError: string | null;
  
  /**
   * Pending history items (items being streamed)
   */
  pendingHistoryItems: HistoryItem[];
  
  /**
   * Clear pending items
   */
  clearPendingItems: () => void;
  
  /**
   * Current thought from Claude (for advanced streaming)
   */
  thought: string;
  
  /**
   * Currently streaming text
   */
  streamingText: string;
  
  /**
   * Current streaming item ID
   */
  streamingItemId: string | null;
  
  /**
   * Whether the client is initialized
   */
  isInitialized: boolean;
  
  /**
   * Retry last failed request
   */
  retryLastRequest: () => Promise<void>;
  
  /**
   * Cancel current streaming operation
   */
  cancelStreaming: () => void;
  
  /**
   * Operation tracking for detailed status display
   */
  operationTracker: ReturnType<typeof useOperationStatus>;
  
  /**
   * Context integration instance for advanced context management
   */
  contextIntegration: ConversationContextIntegration | null;
}

/**
 * Claude Hook
 * 
 * @param claudeClient - Claude API client instance
 * @param history - Conversation history
 * @param addItem - Function to add items to history
 * @param setShowHelp - Function to toggle help display
 * @param config - Application configuration
 * @param setDebugMessage - Function to set debug message
 * @param handleSlashCommand - Function to handle slash commands
 * @param refreshContextFiles - Function to refresh context files
 * @param options - Hook configuration options
 * @returns Object containing streaming state and handlers
 */
export function useClaude(
  claudeClient: ClaudeClient | null,
  history: HistoryItem[],
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
  setShowHelp: (show: boolean) => void,
  config: AppConfigType,
  setDebugMessage: (message: string) => void,
  handleSlashCommand: (input: string) => boolean,
  refreshContextFiles: () => void,
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

  // Streaming state
  const [streamingState, setStreamingState] = useState<StreamingState>(StreamingState.IDLE);
  
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
  
  // Request state
  const [lastQuery, setLastQuery] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // Context integration
  const [contextIntegration, setContextIntegration] = useState<ConversationContextIntegration | null>(null);
  
  // Refs
  const uniqueIdCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Operation tracking
  const operationTracker = useOperationStatus();
  
  // FIXED: Add context loading state to prevent redundant loads
  const contextLoadingRef = useRef<boolean>(false);
  const lastContextLoadRef = useRef<number>(0);
  const CONTEXT_LOAD_DEBOUNCE_MS = 2000; // 2 second debounce
  
  // Initialize conversation context integration
  useEffect(() => {
    const initializeContextIntegration = async () => {
      if (!useConversationHistory || !config) {
        return;
      }
      
      try {
        const integration = new ConversationContextIntegration(config.workingDirectory || process.cwd());
        await integration.initialize();
        setContextIntegration(integration);
        
        if (enableDebugLogging) {
          logger.debug('Context integration initialized successfully');
        }
      } catch (error) {
        logger.warn('Failed to initialize context integration:', error);
      }
    };
    
    initializeContextIntegration();
  }, [useConversationHistory, config, enableDebugLogging]);
  
  // Auto-capture context snapshots when conversation changes
  useEffect(() => {
    if (!contextIntegration || history.length === 0) {
      return;
    }
    
    const captureContextSnapshot = async () => {
      // FIXED: Prevent redundant context loading
      const now = Date.now();
      if (contextLoadingRef.current || (now - lastContextLoadRef.current) < CONTEXT_LOAD_DEBOUNCE_MS) {
        if (enableDebugLogging) {
          logger.debug('Skipping context snapshot - too recent or already loading');
        }
        return;
      }
      
      contextLoadingRef.current = true;
      lastContextLoadRef.current = now;
      
      try {
        await contextIntegration.createContextSnapshot();
        
        if (enableDebugLogging) {
          logger.debug(`Context snapshot captured for conversation with ${history.length} messages`);
        }
      } catch (error) {
        logger.warn('Failed to capture context snapshot:', error);
      } finally {
        contextLoadingRef.current = false;
      }
    };
    
    // Debounce snapshot capture to avoid excessive captures
    const timeoutId = setTimeout(captureContextSnapshot, 1000);
    return () => clearTimeout(timeoutId);
  }, [contextIntegration, history, enableDebugLogging]);
  
  // Generate unique ID
  const getUniqueId = useCallback(() => {
    uniqueIdCounterRef.current += 1;
    return `unified-${Date.now()}-${uniqueIdCounterRef.current}`;
  }, []);
  
  // Clear pending items
  const clearPendingItems = useCallback(() => {
    setPendingHistoryItems([]);
    setStreamingText('');
    setStreamingItemId(null);
    setThought('');
  }, []);
  
  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
    
    clearPendingItems();
    setStreamingState(StreamingState.IDLE);
    
    if (enableDebugLogging) {
      logger.debug('Streaming cancelled by user');
    }
  }, [clearPendingItems, enableDebugLogging]);
  
  // Check if client is initialized
  const isInitialized = useMemo(() => !!claudeClient, [claudeClient]);
  
  // Initialize client if needed
  useEffect(() => {
    if (!isInitialized && !initError) {
      setInitError('Claude AI client is not initialized');
    } else if (isInitialized && initError) {
      setInitError(null);
    }
  }, [isInitialized, initError]);

  // Build message history for Claude from UI history
  const buildClaudeMessages = useCallback(() => {
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
  
  // Extract tool use blocks from Claude message
  const extractToolUseBlocks = useCallback((content: MessageContentBlock[]): ToolUseBlock[] => {
    return content
      .filter(block => block.type === 'tool_use' && block.id && block.name && 'input' in block)
      .map(block => ({
        type: 'tool_use' as const,
        id: String(block.id),
        name: String(block.name),
        input: block.input as ToolInputParameters
      }));
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
      if (enableDebugLogging) {
        logger.debug(`Executing tool: ${toolUse.name}`, toolUse.input);
      }
      
      let result: ToolResult;
      
      if (enableRealToolExecution) {
        // Real tool execution using tool registry
        const toolUseForRegistry = {
          type: 'tool_use' as const,
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input
        };
        
        const toolResult = await toolRegistry.execute(toolUseForRegistry);
        result = toolResult;
      } else {
        // Mock tool execution for testing/development
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = {
          tool_use_id: toolUse.id,
          content: JSON.stringify({ 
            success: true, 
            message: `Executed ${toolUse.name} successfully`,
            timestamp: Date.now()
          }),
          is_error: false
        };
      }

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

      if (enableDebugLogging) {
        logger.error(`Tool execution failed: ${toolUse.name}`, error);
      }

      return errorResult;
    }
  }, [addItem, enableRealToolExecution, enableDebugLogging]);

  // Handle tool use requests from Claude
  const handleToolUses = useCallback(async (toolUses: ToolUseBlock[]): Promise<ToolResult[]> => {
    const results: ToolResult[] = [];
    
    // Execute tools sequentially to avoid conflicts
    for (const toolUse of toolUses) {
      const result = await executeTool(toolUse);
      results.push(result);
    }
    
    return results;
  }, [executeTool]);

  // Process streaming events from Claude (for advanced streaming)
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
          setPendingHistoryItems(prev => prev.map(item => 
            (item.id === pendingItem.id ? { ...item, text: updatedContent } : item)
          ));
          
          // Update streaming text
          setStreamingText(updatedContent);
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
        setStreamingState(StreamingState.IDLE);
        break;
    }
    
    return updatedContent;
  }, [addItem, clearPendingItems]);

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
      abortControllerRef.current = new AbortController();
      
      // Add user message to history
      const timestamp = Date.now();
      addItem(
        {
          type: MessageType.USER,
          text: query,
        },
        timestamp
      );
      
      // Capture context snapshot before processing (if context integration is available)
      if (contextIntegration) {
        try {
          await contextIntegration.createContextSnapshot();
          
          if (enableDebugLogging) {
            logger.debug('Context snapshot captured before processing user message');
          }
        } catch (error) {
          logger.warn('Failed to capture context snapshot before processing:', error);
        }
      }
      
      // Create pending assistant response
      const assistantItem: HistoryItem = {
        id: getUniqueId(),
        type: MessageType.ASSISTANT,
        text: '',
        timestamp: timestamp + 1,
      };
      
      setPendingHistoryItems([assistantItem]);
      setStreamingItemId(assistantItem.id);
      
      // Set streaming state and start operation tracking
      if (enableAdvancedStreaming) {
        setStreamingState(StreamingState.THINKING);
        setThought('Analyzing your request...');
      } else {
        setStreamingState(StreamingState.RESPONDING);
      }
      
      // Start operation tracking
      operationTracker.clearOperations();
      const queryOpId = operationTracker.startOperation('query_processing', '🧠 Processing your query...');
      
      // Set request timeout
      requestTimeoutRef.current = setTimeout(() => {
        cancelStreaming();
        addItem(
          {
            type: MessageType.ERROR,
            text: `Request timed out after ${requestTimeout / 1000} seconds`,
          },
          timestamp + 2
        );
        setStreamingState(StreamingState.ERROR);
      }, requestTimeout);
      
      try {
        // Load configuration
        const appConfig = await loadConfig();
        let systemPrompt = appConfig.ai?.systemPrompt || 'You are Claude, a helpful AI assistant.';
        
        // Load and inject project context into system prompt
        operationTracker.updateOperation(queryOpId, 'executing', '📁 Loading project context...');
        try {
          const { createContextSystem } = await import('../../context/context-system.js');
          const contextSystem = createContextSystem();
          const contextResult = await contextSystem.loadContext();
          
          if (contextResult.stats.totalFiles > 0) {
            // Build context section for system prompt
            let contextSection = '\n\n# PROJECT CONTEXT\n\n';
            contextSection += `You are working in the "${path.basename(process.cwd())}" project. `;
            contextSection += `Here is the relevant project context from ${contextResult.stats.totalFiles} files:\n\n`;
            
            // Count entries by type
            const globalFiles = contextResult.entries.filter(e => e.type === 'global');
            const projectFiles = contextResult.entries.filter(e => e.type === 'project');
            const currentFiles = contextResult.entries.filter(e => e.type === 'directory' && e.scope === '.');
            const subdirectoryFiles = contextResult.entries.filter(e => e.type === 'directory' && e.scope !== '.');
            
            // Add global context
            if (globalFiles.length > 0) {
              contextSection += '## Global Context\n\n';
              globalFiles.forEach(file => {
                contextSection += `### ${path.basename(file.path)}\n\n${file.content}\n\n`;
              });
            }
            
            // Add project context
            if (projectFiles.length > 0) {
              contextSection += '## Project Context\n\n';
              projectFiles.forEach(file => {
                contextSection += `### ${path.basename(file.path)} (${path.dirname(file.path)})\n\n${file.content}\n\n`;
              });
            }
            
            // Add current directory context
            if (currentFiles.length > 0) {
              contextSection += '## Current Directory Context\n\n';
              currentFiles.forEach(file => {
                contextSection += `### ${path.basename(file.path)}\n\n${file.content}\n\n`;
              });
            }
            
            // Add subdirectory context (limit to prevent overwhelming)
            if (subdirectoryFiles.length > 0) {
              contextSection += '## Subdirectory Context\n\n';
              subdirectoryFiles.slice(0, 5).forEach(file => {
                contextSection += `### ${path.basename(file.path)} (${path.dirname(file.path)})\n\n${file.content}\n\n`;
              });
              
              if (subdirectoryFiles.length > 5) {
                contextSection += `... and ${subdirectoryFiles.length - 5} more files.\n\n`;
              }
            }
            
            contextSection += '\nPlease use this context to provide more relevant and informed responses about the project, codebase, and development workflow.\n';
            
            // Append context to system prompt
            systemPrompt += contextSection;
            
            if (enableDebugLogging) {
              logger.debug(`Added project context to system prompt: ${contextResult.stats.totalFiles} files, ${contextResult.stats.totalSize} characters`);
            }
            
            operationTracker.updateOperation(queryOpId, 'executing', `📊 Loaded ${contextResult.stats.totalFiles} context files (${contextResult.stats.totalSize} chars)`);
          }
        } catch (contextError) {
          // Don't fail the query if context loading fails
          logger.warn('Failed to load project context for query:', contextError);
        }
        
        // Build message history
        let messageHistory = buildClaudeMessages();
        
        // Add conversation compression to prevent token limit issues
        if (useConversationHistory && claudeClient.getContentGenerator) {
          const compressor = new ConversationCompressor(claudeClient.getContentGenerator());
          
          // Convert message history to MessageParam format for compression
          const messageParams: MessageParam[] = messageHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          
          const fullHistory = [...messageParams, { role: 'user' as const, content: query }];
          
          // Check if compression is needed
          const needsCompression = await compressor.needsCompression(fullHistory);
          if (needsCompression) {
            operationTracker.updateOperation(queryOpId, 'executing', '🗜️ Compressing conversation to stay within token limits...');
            const compressedHistory = await compressor.autoCompress(fullHistory);
            
            // Convert back to our message format
            messageHistory = compressedHistory.slice(0, -1).map(msg => ({
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            }));
            
            if (enableDebugLogging) {
              logger.info('Conversation compressed to prevent token limit', {
                originalLength: fullHistory.length,
                compressedLength: compressedHistory.length
              });
            }
          }
        }
        
        // Prepare query input
        const queryInput = useConversationHistory 
          ? [...messageHistory, { role: 'user' as const, content: query }]
          : query;
        
        // Set debug message
        if (useConversationHistory) {
          setDebugMessage(`Sending query to Claude with ${messageHistory.length + 1} messages + project context`);
        } else {
          setDebugMessage(`Sending query to Claude with ${query.length} characters + project context`);
        }
        
        // Get available tools
        const availableTools = toolRegistry.getAll();
        
        // Update streaming state
        setStreamingState(StreamingState.RESPONDING);
        setThought('Generating response...');
        
        // Update operation status before querying Claude
        operationTracker.updateOperation(queryOpId, 'executing', '🤖 Querying Claude 4 Sonnet...');
        
        // Query Claude
        const response = await claudeClient.query(
          queryInput,
          {
            system: systemPrompt,
            temperature: appConfig.ai?.temperature || 0.7,
            maxTokens: appConfig.ai?.maxTokens || 4000,
            tools: enableRealToolExecution ? availableTools.map(tool => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.input_schema
            })) : undefined,
            signal: abortControllerRef.current.signal
          }
        );
        
        // Update operation status after successful query
        operationTracker.updateOperation(queryOpId, 'executing', '📝 Processing Claude response...');
        
        // Clear timeout
        if (requestTimeoutRef.current) {
          clearTimeout(requestTimeoutRef.current);
          requestTimeoutRef.current = null;
        }
        
        // Process response
        const contentArray = Array.isArray(response.message.content) 
          ? response.message.content 
          : [{ type: 'text', text: response.message.content }];
        
        const toolUses = extractToolUseBlocks(contentArray);
        
        if (toolUses.length > 0 && enableRealToolExecution) {
          // Handle tool execution
          setStreamingState(StreamingState.TOOL_EXECUTING);
          setThought('Executing tools...');
          
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
            // Add tool results as context
            ...toolResults.map(result => ({
              role: 'user' as const,
              content: `Tool result from ${result.tool_use_id}: ${result.content}`
            }))
          ];
          
          const finalResponse = await claudeClient.query(
            useConversationHistory ? finalMessageHistory : query,
            {
              system: systemPrompt,
              temperature: appConfig.ai?.temperature || 0.7,
              maxTokens: appConfig.ai?.maxTokens || 4000,
              signal: abortControllerRef.current.signal
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
          setPendingHistoryItems(prev => prev.map(item => 
            (item.id === assistantItem.id ? { ...item, text: finalResponseText } : item)
          ));
          
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
          setPendingHistoryItems(prev => prev.map(item => 
            (item.id === assistantItem.id ? { ...item, text: responseText } : item)
          ));
          
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
        
        // Capture context snapshot after assistant response (if context integration is available)
        if (contextIntegration) {
          try {
            await contextIntegration.createContextSnapshot();
            
            if (enableDebugLogging) {
              logger.debug('Context snapshot captured after assistant response');
            }
          } catch (error) {
            logger.warn('Failed to capture context snapshot after response:', error);
          }
        }
        
        // Clear streaming state
        clearPendingItems();
        setStreamingState(StreamingState.COMPLETE);
        
        // Complete operation tracking
        operationTracker.completeOperation(queryOpId, true, '✅ Response generated successfully');
        
        // Reset to idle after brief delay
        setTimeout(() => {
          setStreamingState(StreamingState.IDLE);
        }, 1000);
        
        if (enableDebugLogging) {
          logger.debug('Query completed successfully');
        }
        
      } catch (error) {
        // Clear timeout
        if (requestTimeoutRef.current) {
          clearTimeout(requestTimeoutRef.current);
          requestTimeoutRef.current = null;
        }
        
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
        setStreamingState(StreamingState.ERROR);
        
        // Reset to idle after delay
        setTimeout(() => {
          setStreamingState(StreamingState.IDLE);
        }, 3000);
      }
    },
    [
      handleSlashCommand,
      addItem,
      claudeClient,
      cancelStreaming,
      getUniqueId,
      enableAdvancedStreaming,
      requestTimeout,
      buildClaudeMessages,
      useConversationHistory,
      setDebugMessage,
      extractToolUseBlocks,
      enableRealToolExecution,
      handleToolUses,
      clearPendingItems,
      enableDebugLogging,
      contextIntegration,
      history
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
  }, [lastQuery, retryCount, maxRetries, addItem, enableDebugLogging, submitQuery]);
  
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