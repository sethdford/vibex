/**
 * Claude State Hook - Clean Architecture like Gemini CLI
 * 
 * Focused hook for managing Claude AI state
 */

import { useState, useCallback, useRef } from 'react';
import { StreamingState } from '../../types.js';
import type { HistoryItem } from '../../types.js';

/**
 * Hook for managing Claude state
 */
export function useClaudeState() {
  // Core state
  const [streamingState, setStreamingState] = useState<StreamingState>(StreamingState.IDLE);
  const [initError, setInitError] = useState<string | null>(null);
  const [thought, setThought] = useState<string>('');
  const [pendingHistoryItems, setPendingHistoryItems] = useState<HistoryItem[]>([]);
  const [streamingText, setStreamingText] = useState<string>('');
  const [streamingItemId, setStreamingItemId] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [contextIntegration, setContextIntegration] = useState<any>(null);

  // Refs for cleanup
  const uniqueIdCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique ID
  const getUniqueId = useCallback(() => {
    uniqueIdCounterRef.current += 1;
    return `claude-${Date.now()}-${uniqueIdCounterRef.current}`;
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
  }, [clearPendingItems]);

  // Update streaming state
  const updateStreamingState = useCallback((state: StreamingState) => {
    setStreamingState(state);
  }, []);

  // Update thought
  const updateThought = useCallback((newThought: string) => {
    setThought(newThought);
  }, []);

  // Update streaming text
  const updateStreamingText = useCallback((text: string) => {
    setStreamingText(text);
  }, []);

  // Add pending item
  const addPendingItem = useCallback((item: HistoryItem) => {
    setPendingHistoryItems(prev => [...prev, item]);
    setStreamingItemId(item.id || null);
  }, []);

  // Update pending item
  const updatePendingItem = useCallback((itemId: string, updates: Partial<HistoryItem>) => {
    setPendingHistoryItems(prev => prev.map(item => 
      (item.id === itemId ? { ...item, ...updates } : item)
    ));
  }, []);

  // Set abort controller
  const setAbortController = useCallback((controller: AbortController) => {
    abortControllerRef.current = controller;
  }, []);

  // Set request timeout
  const setRequestTimeout = useCallback((timeout: NodeJS.Timeout) => {
    requestTimeoutRef.current = timeout;
  }, []);

  // Clear request timeout
  const clearRequestTimeout = useCallback(() => {
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  }, []);

  return {
    // State
    streamingState,
    initError,
    thought,
    pendingHistoryItems,
    streamingText,
    streamingItemId,
    lastQuery,
    retryCount,
    contextIntegration,
    
    // Setters
    setInitError,
    setLastQuery,
    setRetryCount,
    setContextIntegration,
    
    // Actions
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
    
    // Refs
    abortControllerRef,
    requestTimeoutRef,
  };
}