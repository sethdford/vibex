/**
 * Session Context
 * 
 * This context manages session state for the UI, including conversation
 * history, statistics, and session-level data.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { HistoryItem, SessionStats } from '../types.js';
import { MessageType } from '../types.js';

/**
 * Interface for the session context value
 */
interface SessionContextValue {
  /**
   * Current conversation history
   */
  history: HistoryItem[];
  
  /**
   * Function to add a new history item
   */
  addItem: (item: Omit<HistoryItem, 'id'>, timestamp?: number) => void;
  
  /**
   * Function to clear all history items
   */
  clearItems: () => void;
  
  /**
   * Function to load history from storage
   */
  loadHistory: (items: HistoryItem[]) => void;
  
  /**
   * Session statistics
   */
  stats: SessionStats;
  
  /**
   * Function to update session statistics
   */
  updateStats: (updates: Partial<SessionStats>) => void;
}

/**
 * Create the session context with default values
 */
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Default statistics for a new session
 */
const defaultStats: SessionStats = {
  startTime: Date.now(),
  messageCount: 0,
  currentResponse: {
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    totalTokenCount: 0
  }
};

/**
 * Provider component for session context
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<SessionStats>(defaultStats);
  
  /**
   * Add a new item to the history
   */
  const addItem = useCallback((item: Omit<HistoryItem, 'id'>, timestamp: number = Date.now()) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp
    };
    
    setHistory(prev => [...prev, newItem]);
    
    // Update message count in stats
    setStats(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1
    }));
  }, []);
  
  /**
   * Clear all history items
   */
  const clearItems = useCallback(() => {
    setHistory([]);
    
    // Reset message count in stats
    setStats(prev => ({
      ...prev,
      messageCount: 0
    }));
  }, []);
  
  /**
   * Load history from storage or previous session
   */
  const loadHistory = useCallback((items: HistoryItem[]) => {
    setHistory(items);
    
    // Update message count in stats
    setStats(prev => ({
      ...prev,
      messageCount: items.length
    }));
  }, []);
  
  /**
   * Update session statistics
   */
  const updateStats = useCallback((updates: Partial<SessionStats>) => {
    setStats(prev => ({
      ...prev,
      ...updates,
      currentResponse: {
        ...prev.currentResponse,
        ...updates.currentResponse
      }
    }));
  }, []);
  
  const value = {
    history,
    addItem,
    clearItems,
    loadHistory,
    stats,
    updateStats
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Hook to use session context in components
 */
export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  
  return context;
};

/**
 * Hook to specifically use session history
 */
export const useHistory = (): {
  history: HistoryItem[];
  addItem: (item: Omit<HistoryItem, 'id'>, timestamp?: number) => void;
  clearItems: () => void;
  loadHistory: (items: HistoryItem[]) => void;
} => {
  const { history, addItem, clearItems, loadHistory } = useSession();
  return { history, addItem, clearItems, loadHistory };
};

/**
 * Hook to specifically use session stats
 */
export const useSessionStats = (): {
  stats: SessionStats;
  updateStats: (updates: Partial<SessionStats>) => void;
} => {
  const { stats, updateStats } = useSession();
  return { stats, updateStats };
};

/**
 * Utility function to add a system message
 */
export const addSystemMessage = (
  addItem: (item: Omit<HistoryItem, 'id'>, timestamp?: number) => void,
  text: string
): void => {
  addItem({
    type: MessageType.SYSTEM,
    text,
    timestamp: Date.now()
  });
};

/**
 * Utility function to add an error message
 */
export const addErrorMessage = (
  addItem: (item: Omit<HistoryItem, 'id'>, timestamp?: number) => void,
  text: string
): void => {
  addItem({
    type: MessageType.ERROR,
    text,
    timestamp: Date.now()
  });
};

/**
 * Utility function to add an info message
 */
export const addInfoMessage = (
  addItem: (item: Omit<HistoryItem, 'id'>, timestamp?: number) => void,
  text: string
): void => {
  addItem({
    type: MessageType.INFO,
    text,
    timestamp: Date.now()
  });
};

/**
 * Combined provider component for session state
 */
export const SessionStatsProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => (
    <SessionProvider>
      {children}
    </SessionProvider>
  );