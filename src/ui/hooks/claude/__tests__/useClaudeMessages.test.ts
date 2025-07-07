/**
 * Tests for useClaudeMessages hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useClaudeMessages } from '../useClaudeMessages.js';
import { MessageType } from '../../../types.js';

// Mock conversation compressor
const mockCompressor = {
  needsCompression: vi.fn(),
  autoCompress: vi.fn()
};

vi.mock('../../../../ai/conversation-compression.js', () => ({
  ConversationCompressor: vi.fn(() => mockCompressor)
}));

describe('useClaudeMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockHistory = [
    {
      id: '1',
      type: MessageType.USER,
      text: 'Hello',
      timestamp: 1000
    },
    {
      id: '2',
      type: MessageType.ASSISTANT,
      text: 'Hi there!',
      timestamp: 2000
    },
    {
      id: '3',
      type: MessageType.INFO,
      text: 'System message',
      timestamp: 3000
    },
    {
      id: '4',
      type: MessageType.USER,
      text: 'How are you?',
      timestamp: 4000
    }
  ];

  it('should build Claude messages from history when conversation history is enabled', () => {
    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, true, false)
    );

    const messages = result.current.buildClaudeMessages();

    expect(messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'How are you?' }
    ]);
  });

  it('should return empty array when conversation history is disabled', () => {
    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, false, false)
    );

    const messages = result.current.buildClaudeMessages();

    expect(messages).toEqual([]);
  });

  it('should filter out non-conversation messages', () => {
    const historyWithMixedTypes = [
      ...mockHistory,
      {
        id: '5',
        type: MessageType.ERROR,
        text: 'Error message',
        timestamp: 5000
      },
      {
        id: '6',
        type: MessageType.TOOL_USE,
        text: 'Tool execution',
        timestamp: 6000
      }
    ];

    const { result } = renderHook(() => 
      useClaudeMessages(historyWithMixedTypes, true, false)
    );

    const messages = result.current.buildClaudeMessages();

    expect(messages).toHaveLength(3); // Only USER and ASSISTANT messages
    expect(messages.every(msg => ['user', 'assistant'].includes(msg.role))).toBe(true);
  });

  it('should compress conversation when needed', async () => {
    const mockClaudeClient = {
      getContentGenerator: vi.fn(() => ({}))
    };

    mockCompressor.needsCompression.mockResolvedValue(true);
    mockCompressor.autoCompress.mockResolvedValue([
      { role: 'user', content: 'Compressed user message' },
      { role: 'assistant', content: 'Compressed assistant message' },
      { role: 'user', content: 'New query' }
    ]);

    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, true, false)
    );

    const messageHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const compressedMessages = await result.current.compressConversationIfNeeded(
      mockClaudeClient as any,
      messageHistory,
      'New query'
    );

    expect(mockCompressor.needsCompression).toHaveBeenCalled();
    expect(mockCompressor.autoCompress).toHaveBeenCalled();
    expect(compressedMessages).toEqual([
      { role: 'user', content: 'Compressed user message' },
      { role: 'assistant', content: 'Compressed assistant message' }
    ]);
  });

  it('should not compress conversation when not needed', async () => {
    const mockClaudeClient = {
      getContentGenerator: vi.fn(() => ({}))
    };

    mockCompressor.needsCompression.mockResolvedValue(false);

    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, true, false)
    );

    const messageHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const compressedMessages = await result.current.compressConversationIfNeeded(
      mockClaudeClient as any,
      messageHistory,
      'New query'
    );

    expect(mockCompressor.needsCompression).toHaveBeenCalled();
    expect(mockCompressor.autoCompress).not.toHaveBeenCalled();
    expect(compressedMessages).toBe(messageHistory);
  });

  it('should handle compression errors gracefully', async () => {
    const mockClaudeClient = {
      getContentGenerator: vi.fn(() => ({}))
    };

    mockCompressor.needsCompression.mockRejectedValue(new Error('Compression failed'));

    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, true, false)
    );

    const messageHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const compressedMessages = await result.current.compressConversationIfNeeded(
      mockClaudeClient as any,
      messageHistory,
      'New query'
    );

    expect(compressedMessages).toBe(messageHistory);
  });

  it('should prepare query input with conversation history', () => {
    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, true, false)
    );

    const messageHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const queryInput = result.current.prepareQueryInput(messageHistory, 'New query');

    expect(queryInput).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'New query' }
    ]);
  });

  it('should prepare query input without conversation history', () => {
    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, false, false)
    );

    const messageHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const queryInput = result.current.prepareQueryInput(messageHistory, 'New query');

    expect(queryInput).toBe('New query');
  });

  it('should format debug message with conversation history', () => {
    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, true, false)
    );

    const messageHistory = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const debugMessage = result.current.formatDebugMessage(messageHistory, 'New query');

    expect(debugMessage).toBe('Sending query to Claude with 3 messages + project context');
  });

  it('should format debug message without conversation history', () => {
    const { result } = renderHook(() => 
      useClaudeMessages(mockHistory, false, false)
    );

    const query = 'New query';
    const debugMessage = result.current.formatDebugMessage([], query);

    expect(debugMessage).toBe(`Sending query to Claude with ${query.length} characters + project context`);
  });
}); 