/**
 * Unified Claude Hook Tests
 * 
 * Comprehensive test suite for the unified Claude hook that consolidates
 * functionality from both useClaudeStream and useClaude4Stream.
 */

import { renderHook, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useUnifiedClaude } from '../../../src/ui/hooks/useUnifiedClaude.js';
import { MessageType } from '../../../src/ui/types.js';
import { StreamingState } from '../../../src/ui/components/AdvancedStreamingDisplay.js';

// Mock the unified Claude client
const mockQuery = jest.fn();
const mockClient = {
  query: mockQuery
};

// Mock the tool registry
const mockExecute = jest.fn();
const mockGetAll = jest.fn();
jest.mock('../../../src/tools/index.js', () => ({
  toolRegistry: {
    execute: mockExecute,
    getAll: mockGetAll
  }
}));

// Mock the config loader
const mockLoadConfig = jest.fn();
jest.mock('../../../src/config/index.js', () => ({
  loadConfig: mockLoadConfig
}));

// Mock functions for hook params
const mockAddItem = jest.fn();
const mockSetShowHelp = jest.fn();
const mockSetDebugMessage = jest.fn();
const mockHandleSlashCommand = jest.fn();
const mockRefreshContextFiles = jest.fn();

// Mock config
const mockConfig = {
  ai: {
    systemPrompt: 'You are Claude, a helpful AI assistant.',
    temperature: 0.7,
    maxTokens: 4000
  }
};

describe('useUnifiedClaude Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetAll.mockReturnValue([]);
  });

  describe('Initialization', () => {
    it('initializes with idle state', () => {
      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      expect(result.current.streamingState).toBe(StreamingState.IDLE);
      expect(result.current.initError).toBeNull();
      expect(result.current.pendingHistoryItems).toEqual([]);
      expect(result.current.thought).toBe('');
      expect(result.current.streamingText).toBe('');
      expect(result.current.streamingItemId).toBeNull();
      expect(result.current.isInitialized).toBe(true);
    });

    it('sets init error when client is null', () => {
      const { result } = renderHook(() => useUnifiedClaude(
        null,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      expect(result.current.initError).toBe('Claude AI client is not initialized');
      expect(result.current.isInitialized).toBe(false);
    });

    it('accepts configuration options', () => {
      const options = {
        enableAdvancedStreaming: false,
        useConversationHistory: false,
        enableRealToolExecution: false,
        maxRetries: 5,
        requestTimeout: 60000,
        enableDebugLogging: true
      };

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        options
      ));

      expect(result.current.streamingState).toBe(StreamingState.IDLE);
      expect(result.current.isInitialized).toBe(true);
    });
  });

  describe('Slash Command Handling', () => {
    it('handles slash commands correctly', async () => {
      mockHandleSlashCommand.mockReturnValue(true);

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      await act(async () => {
        await result.current.submitQuery('/help');
      });

      expect(mockHandleSlashCommand).toHaveBeenCalledWith('/help');
      expect(mockAddItem).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('processes regular queries when slash command is not handled', async () => {
      mockHandleSlashCommand.mockReturnValue(false);
      mockQuery.mockResolvedValue({
        message: {
          content: [{ type: 'text', text: 'Response' }]
        },
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      await act(async () => {
        await result.current.submitQuery('/unknown-command');
      });

      expect(mockHandleSlashCommand).toHaveBeenCalledWith('/unknown-command');
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('Basic Query Handling', () => {
    it('handles simple query without tools', async () => {
      mockQuery.mockResolvedValue({
        message: {
          content: [{ type: 'text', text: 'This is a test response' }]
        },
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      await act(async () => {
        await result.current.submitQuery('Hello, Claude');
      });

      // Should add user message
      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.USER,
          text: 'Hello, Claude',
        },
        expect.any(Number)
      );

      // Should add assistant response
      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.ASSISTANT,
          text: 'This is a test response',
        },
        expect.any(Number)
      );

      // Should update debug message
      expect(mockSetDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining('Response: 100 in, 50 out')
      );

      // Should return to idle state
      expect(result.current.streamingState).toBe(StreamingState.COMPLETE);
    });

    it('handles conversation history correctly', async () => {
      const history = [
        {
          id: '1',
          type: MessageType.USER,
          text: 'Previous user message',
          timestamp: Date.now() - 1000
        },
        {
          id: '2',
          type: MessageType.ASSISTANT,
          text: 'Previous assistant response',
          timestamp: Date.now() - 500
        }
      ];

      mockQuery.mockResolvedValue({
        message: {
          content: [{ type: 'text', text: 'New response' }]
        },
        usage: { input_tokens: 150, output_tokens: 75 }
      });

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        history as any,
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { useConversationHistory: true }
      ));

      await act(async () => {
        await result.current.submitQuery('New message');
      });

      // Should include conversation history in query
      expect(mockQuery).toHaveBeenCalledWith(
        expect.arrayContaining([
          { role: 'user', content: 'Previous user message' },
          { role: 'assistant', content: 'Previous assistant response' },
          { role: 'user', content: 'New message' }
        ]),
        expect.any(Object)
      );
    });
  });

  describe('Advanced Streaming Features', () => {
    it('enables thinking state with advanced streaming', async () => {
      mockQuery.mockResolvedValue({
        message: {
          content: [{ type: 'text', text: 'Response with thinking' }]
        },
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { enableAdvancedStreaming: true }
      ));

      let thinkingStateObserved = false;
      
      await act(async () => {
        const promise = result.current.submitQuery('Test query');
        
        // Check if thinking state was set
        if (result.current.streamingState === StreamingState.THINKING) {
          thinkingStateObserved = true;
        }
        
        await promise;
      });

      expect(thinkingStateObserved || result.current.thought).toBeTruthy();
    });

    it('disables thinking state without advanced streaming', async () => {
      mockQuery.mockResolvedValue({
        message: {
          content: [{ type: 'text', text: 'Simple response' }]
        },
        usage: { input_tokens: 100, output_tokens: 50 }
      });

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { enableAdvancedStreaming: false }
      ));

      await act(async () => {
        await result.current.submitQuery('Test query');
      });

      // Should go directly to responding state
      expect(result.current.streamingState).toBe(StreamingState.COMPLETE);
    });
  });

  describe('Tool Execution', () => {
    it('handles tool execution with real tools enabled', async () => {
      const toolUseResponse = {
        message: {
          content: [
            { type: 'text', text: 'I need to use a tool.' },
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'test_tool',
              input: { param: 'value' }
            }
          ]
        },
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const finalResponse = {
        message: {
          content: [{ type: 'text', text: 'Tool execution complete.' }]
        },
        usage: { input_tokens: 150, output_tokens: 75 }
      };

      mockQuery
        .mockResolvedValueOnce(toolUseResponse)
        .mockResolvedValueOnce(finalResponse);

      mockExecute.mockResolvedValue({
        tool_use_id: 'tool_1',
        content: 'Tool result',
        is_error: false
      });

      mockGetAll.mockReturnValue([
        {
          name: 'test_tool',
          description: 'Test tool',
          input_schema: { type: 'object', properties: {} }
        }
      ]);

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { enableRealToolExecution: true }
      ));

      await act(async () => {
        await result.current.submitQuery('Use a tool');
      });

      // Should execute the tool
      expect(mockExecute).toHaveBeenCalledWith({
        type: 'tool_use',
        id: 'tool_1',
        name: 'test_tool',
        input: { param: 'value' }
      });

      // Should add tool use message
      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.TOOL_USE,
          text: 'Tool: test_tool',
          toolUse: {
            name: 'test_tool',
            input: { param: 'value' },
            id: 'tool_1'
          }
        },
        expect.any(Number)
      );

      // Should add tool result message
      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.TOOL_OUTPUT,
          text: 'Tool result',
          toolResult: {
            content: 'Tool result',
            isError: false,
            toolUseId: 'tool_1'
          }
        },
        expect.any(Number)
      );

      // Should make second query with tool results
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('handles tool execution errors gracefully', async () => {
      const toolUseResponse = {
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'failing_tool',
              input: {}
            }
          ]
        },
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      mockQuery.mockResolvedValue(toolUseResponse);
      mockExecute.mockRejectedValue(new Error('Tool execution failed'));

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { enableRealToolExecution: true }
      ));

      await act(async () => {
        await result.current.submitQuery('Use failing tool');
      });

      // Should add error result
      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.TOOL_OUTPUT,
          text: 'Tool execution failed',
          toolResult: {
            content: 'Tool execution failed',
            isError: true,
            toolUseId: 'tool_1'
          }
        },
        expect.any(Number)
      );
    });

    it('mocks tool execution when real tools disabled', async () => {
      const toolUseResponse = {
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'test_tool',
              input: { param: 'value' }
            }
          ]
        },
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      const finalResponse = {
        message: {
          content: [{ type: 'text', text: 'Mocked execution complete.' }]
        },
        usage: { input_tokens: 120, output_tokens: 60 }
      };

      mockQuery
        .mockResolvedValueOnce(toolUseResponse)
        .mockResolvedValueOnce(finalResponse);

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { enableRealToolExecution: false }
      ));

      await act(async () => {
        await result.current.submitQuery('Use a tool');
      });

      // Should not call real tool execution
      expect(mockExecute).not.toHaveBeenCalled();

      // Should add mocked tool result
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.TOOL_OUTPUT,
          text: expect.stringContaining('Executed test_tool successfully'),
          toolResult: expect.objectContaining({
            isError: false,
            toolUseId: 'tool_1'
          })
        }),
        expect.any(Number)
      );
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      await act(async () => {
        await result.current.submitQuery('Test query');
      });

      // Should add error message
      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.ERROR,
          text: expect.stringContaining('Error getting response from Claude: API error'),
        },
        expect.any(Number)
      );

      // Should set error state
      expect(result.current.streamingState).toBe(StreamingState.ERROR);
    });

    it('handles request timeout', async () => {
      // Mock a long-running request
      mockQuery.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          message: { content: [{ type: 'text', text: 'Late response' }] },
          usage: { input_tokens: 10, output_tokens: 5 }
        }), 100);
      }));

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { requestTimeout: 50 } // Very short timeout
      ));

      await act(async () => {
        await result.current.submitQuery('Test query');
      });

      // Should add timeout error
      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.ERROR,
          text: expect.stringContaining('Request timed out after'),
        },
        expect.any(Number)
      );
    });
  });

  describe('Retry Functionality', () => {
    it('provides retry functionality', async () => {
      mockQuery.mockRejectedValue(new Error('First attempt failed'));

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { maxRetries: 3 }
      ));

      // First attempt fails
      await act(async () => {
        await result.current.submitQuery('Test query');
      });

      expect(result.current.streamingState).toBe(StreamingState.ERROR);

      // Mock successful retry
      mockQuery.mockResolvedValue({
        message: {
          content: [{ type: 'text', text: 'Retry successful' }]
        },
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      // Retry should work
      await act(async () => {
        await result.current.retryLastRequest();
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('limits retry attempts', async () => {
      mockQuery.mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles,
        { maxRetries: 2 }
      ));

      // First attempt
      await act(async () => {
        await result.current.submitQuery('Test query');
      });

      // First retry
      await act(async () => {
        await result.current.retryLastRequest();
      });

      // Second retry
      await act(async () => {
        await result.current.retryLastRequest();
      });

      // Third retry should add max attempts error
      await act(async () => {
        await result.current.retryLastRequest();
      });

      expect(mockAddItem).toHaveBeenCalledWith(
        {
          type: MessageType.ERROR,
          text: 'Maximum retry attempts (2) exceeded',
        },
        expect.any(Number)
      );
    });
  });

  describe('Stream Cancellation', () => {
    it('provides cancellation functionality', () => {
      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      act(() => {
        result.current.cancelStreaming();
      });

      expect(result.current.streamingState).toBe(StreamingState.IDLE);
      expect(result.current.pendingHistoryItems).toEqual([]);
    });
  });

  describe('Pending Items Management', () => {
    it('manages pending history items during streaming', async () => {
      // Mock a slow response to test pending state
      let resolveQuery: (value: any) => void;
      const queryPromise = new Promise(resolve => {
        resolveQuery = resolve;
      });
      mockQuery.mockReturnValue(queryPromise);

      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      // Start query
      act(() => {
        result.current.submitQuery('Test query');
      });

      // Should have pending items
      expect(result.current.pendingHistoryItems).toHaveLength(1);
      expect(result.current.streamingItemId).toBeTruthy();

      // Resolve the query
      act(() => {
        resolveQuery!({
          message: {
            content: [{ type: 'text', text: 'Response' }]
          },
          usage: { input_tokens: 10, output_tokens: 5 }
        });
      });

      // Wait for promise resolution
      await act(async () => {
        await queryPromise;
      });

      // Pending items should be cleared
      expect(result.current.pendingHistoryItems).toHaveLength(0);
      expect(result.current.streamingItemId).toBeNull();
    });

    it('provides clear pending items functionality', () => {
      const { result } = renderHook(() => useUnifiedClaude(
        mockClient as any,
        [],
        mockAddItem,
        mockSetShowHelp,
        mockConfig as any,
        mockSetDebugMessage,
        mockHandleSlashCommand,
        mockRefreshContextFiles
      ));

      act(() => {
        result.current.clearPendingItems();
      });

      expect(result.current.pendingHistoryItems).toEqual([]);
    });
  });
}); 