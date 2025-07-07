/**
 * Tests for useClaudeState hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useClaudeState } from '../useClaudeState.js';
import { StreamingState } from '../../../components/StreamingOrchestrator.js';

describe('useClaudeState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useClaudeState());

    expect(result.current.streamingState).toBe(StreamingState.IDLE);
    expect(result.current.initError).toBe(null);
    expect(result.current.thought).toBe('');
    expect(result.current.pendingHistoryItems).toEqual([]);
    expect(result.current.streamingText).toBe('');
    expect(result.current.streamingItemId).toBe(null);
    expect(result.current.lastQuery).toBe('');
    expect(result.current.retryCount).toBe(0);
    expect(result.current.contextIntegration).toBe(null);
  });

  it('should generate unique IDs', () => {
    const { result } = renderHook(() => useClaudeState());

    const id1 = result.current.getUniqueId();
    const id2 = result.current.getUniqueId();

    expect(id1).toMatch(/^claude-\d+-\d+$/);
    expect(id2).toMatch(/^claude-\d+-\d+$/);
    expect(id1).not.toBe(id2);
  });

  it('should clear pending items', () => {
    const { result } = renderHook(() => useClaudeState());

    // Set some state first
    act(() => {
      result.current.addPendingItem({
        id: 'test-1',
        type: 'assistant',
        text: 'Test message',
        timestamp: Date.now()
      });
      result.current.updateStreamingText('Some text');
      result.current.updateThought('Some thought');
    });

    expect(result.current.pendingHistoryItems).toHaveLength(1);
    expect(result.current.streamingText).toBe('Some text');
    expect(result.current.thought).toBe('Some thought');

    // Clear pending items
    act(() => {
      result.current.clearPendingItems();
    });

    expect(result.current.pendingHistoryItems).toEqual([]);
    expect(result.current.streamingText).toBe('');
    expect(result.current.thought).toBe('');
    expect(result.current.streamingItemId).toBe(null);
  });

  it('should update streaming state', () => {
    const { result } = renderHook(() => useClaudeState());

    act(() => {
      result.current.updateStreamingState(StreamingState.Responding);
    });

    expect(result.current.streamingState).toBe(StreamingState.Responding);
  });

  it('should update thought', () => {
    const { result } = renderHook(() => useClaudeState());

    act(() => {
      result.current.updateThought('New thought');
    });

    expect(result.current.thought).toBe('New thought');
  });

  it('should update streaming text', () => {
    const { result } = renderHook(() => useClaudeState());

    act(() => {
      result.current.updateStreamingText('Streaming content');
    });

    expect(result.current.streamingText).toBe('Streaming content');
  });

  it('should add pending items', () => {
    const { result } = renderHook(() => useClaudeState());

    const item = {
      id: 'test-1',
      type: 'assistant' as const,
      text: 'Test message',
      timestamp: Date.now()
    };

    act(() => {
      result.current.addPendingItem(item);
    });

    expect(result.current.pendingHistoryItems).toHaveLength(1);
    expect(result.current.pendingHistoryItems[0]).toEqual(item);
    expect(result.current.streamingItemId).toBe('test-1');
  });

  it('should update pending items', () => {
    const { result } = renderHook(() => useClaudeState());

    const item = {
      id: 'test-1',
      type: 'assistant' as const,
      text: 'Original text',
      timestamp: Date.now()
    };

    act(() => {
      result.current.addPendingItem(item);
    });

    act(() => {
      result.current.updatePendingItem('test-1', { text: 'Updated text' });
    });

    expect(result.current.pendingHistoryItems[0].text).toBe('Updated text');
  });

  it('should handle abort controller', () => {
    const { result } = renderHook(() => useClaudeState());
    const abortController = new AbortController();

    act(() => {
      result.current.setAbortController(abortController);
    });

    expect(result.current.abortControllerRef.current).toBe(abortController);
  });

  it('should handle request timeout', () => {
    const { result } = renderHook(() => useClaudeState());
    const timeout = setTimeout(() => {}, 1000);

    act(() => {
      result.current.setRequestTimeout(timeout);
    });

    expect(result.current.requestTimeoutRef.current).toBe(timeout);

    act(() => {
      result.current.clearRequestTimeout();
    });

    expect(result.current.requestTimeoutRef.current).toBe(null);
  });

  it('should cancel streaming', () => {
    const { result } = renderHook(() => useClaudeState());
    const abortController = new AbortController();
    const timeout = setTimeout(() => {}, 1000);

    // Set up state
    act(() => {
      result.current.setAbortController(abortController);
      result.current.setRequestTimeout(timeout);
      result.current.addPendingItem({
        id: 'test-1',
        type: 'assistant',
        text: 'Test',
        timestamp: Date.now()
      });
      result.current.updateStreamingState(StreamingState.RESPONDING);
    });

    // Cancel streaming
    act(() => {
      result.current.cancelStreaming();
    });

    expect(result.current.streamingState).toBe(StreamingState.IDLE);
    expect(result.current.pendingHistoryItems).toEqual([]);
    expect(result.current.abortControllerRef.current).toBe(null);
    expect(result.current.requestTimeoutRef.current).toBe(null);
  });
}); 