/**
 * Claude Stream Hook Tests
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useClaudeStream } from './useClaudeStream';
import { MessageType, StreamingState } from '../types';

// Mock the Claude client
const mockQuery = jest.fn();
const mockClient = {
  query: mockQuery
};

// Mock functions for hook params
const mockAddItem = jest.fn();
const mockSetShowHelp = jest.fn();
const mockSetDebugMessage = jest.fn();
const mockHandleSlashCommand = jest.fn();
const mockRefreshContextFiles = jest.fn();

describe('useClaudeStream Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useClaudeStream(
      mockClient as any,
      [],
      mockAddItem,
      mockSetShowHelp,
      {},
      mockSetDebugMessage,
      mockHandleSlashCommand,
      mockRefreshContextFiles
    ));

    expect(result.current.streamingState).toBe(StreamingState.Idle);
    expect(result.current.initError).toBeNull();
    expect(result.current.pendingHistoryItems).toEqual([]);
    expect(result.current.thought).toBe('');
  });

  it('sets init error when client is null', () => {
    const { result } = renderHook(() => useClaudeStream(
      null,
      [],
      mockAddItem,
      mockSetShowHelp,
      {},
      mockSetDebugMessage,
      mockHandleSlashCommand,
      mockRefreshContextFiles
    ));

    expect(result.current.initError).toBe('Claude AI client is not initialized');
  });

  it('handles slash commands correctly', async () => {
    mockHandleSlashCommand.mockReturnValue(true);

    const { result } = renderHook(() => useClaudeStream(
      mockClient as any,
      [],
      mockAddItem,
      mockSetShowHelp,
      {},
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

  it('handles query to Claude', async () => {
    // Mock the Claude client response
    mockQuery.mockResolvedValue({
      message: {
        content: [
          {
            type: 'text',
            text: 'This is a test response'
          }
        ]
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50
      },
      metrics: {
        cost: 0.000125
      }
    });

    const { result } = renderHook(() => useClaudeStream(
      mockClient as any,
      [],
      mockAddItem,
      mockSetShowHelp,
      {},
      mockSetDebugMessage,
      mockHandleSlashCommand,
      mockRefreshContextFiles
    ));

    await act(async () => {
      await result.current.submitQuery('Hello, Claude');
    });

    // Should add user message to history
    expect(mockAddItem).toHaveBeenCalledWith(
      {
        type: MessageType.USER,
        text: 'Hello, Claude',
      },
      expect.any(Number)
    );

    // Should query the Claude client
    expect(mockQuery).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'Hello, Claude'
        })
      ]),
      expect.any(Object)
    );

    // Should add assistant response to history
    expect(mockAddItem).toHaveBeenCalledWith(
      {
        type: MessageType.ASSISTANT,
        text: 'This is a test response',
      },
      expect.any(Number)
    );

    // Should update debug message with token usage
    expect(mockSetDebugMessage).toHaveBeenCalledWith(
      expect.stringContaining('Response: 100 in, 50 out')
    );
  });

  it('handles error during query', async () => {
    // Mock the Claude client error
    mockQuery.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useClaudeStream(
      mockClient as any,
      [],
      mockAddItem,
      mockSetShowHelp,
      {},
      mockSetDebugMessage,
      mockHandleSlashCommand,
      mockRefreshContextFiles
    ));

    await act(async () => {
      await result.current.submitQuery('Hello, Claude');
    });

    // Should add user message to history
    expect(mockAddItem).toHaveBeenCalledWith(
      {
        type: MessageType.USER,
        text: 'Hello, Claude',
      },
      expect.any(Number)
    );

    // Should add error message to history
    expect(mockAddItem).toHaveBeenCalledWith(
      {
        type: MessageType.ERROR,
        text: expect.stringContaining('Error getting response from Claude: API error'),
      },
      expect.any(Number)
    );

    // Should set error state
    expect(result.current.streamingState).toBe(StreamingState.Error);
  });
});