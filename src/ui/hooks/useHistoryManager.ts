/**
 * History Manager Hook
 * 
 * Manages conversation history, including persistence and loading.
 */

import { useState, useCallback } from 'react';
import { HistoryItem } from '../types';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../../utils/logger.js';

// Default history file location
const DEFAULT_HISTORY_PATH = path.join(
  os.homedir(),
  '.claude-code',
  'history.json'
);

/**
 * Hook for managing conversation history
 * 
 * @returns Object containing history state and methods
 */
export function useHistory() {
  // History items state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Add an item to history
  const addItem = useCallback((item: Partial<HistoryItem>, timestamp: number = Date.now()) => {
    const newItem: HistoryItem = {
      ...item,
      id: `${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
    } as HistoryItem;
    
    setHistory((prev) => [...prev, newItem]);
    
    // Optionally save history to disk
    // This could be debounced to avoid frequent disk writes
  }, []);
  
  // Clear all history items
  const clearItems = useCallback(() => {
    setHistory([]);
  }, []);
  
  // Load history from file
  const loadHistory = useCallback(async (filePath: string = DEFAULT_HISTORY_PATH) => {
    try {
      // Check if history file exists
      if (!fs.existsSync(filePath)) {
        return;
      }
      
      // Read and parse history file
      const historyData = await fs.promises.readFile(filePath, 'utf-8');
      const parsedHistory = JSON.parse(historyData) as HistoryItem[];
      
      // Validate and set history
      if (Array.isArray(parsedHistory)) {
        setHistory(parsedHistory);
      }
    } catch (error) {
      logger.error('Failed to load history:', error);
    }
  }, []);
  
  // Save history to file
  const saveHistory = useCallback(async (filePath: string = DEFAULT_HISTORY_PATH) => {
    try {
      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }
      
      // Write history to file
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(history, null, 2),
        'utf-8'
      );
    } catch (error) {
      logger.error('Failed to save history:', error);
    }
  }, [history]);
  
  return {
    history,
    addItem,
    clearItems,
    loadHistory,
    saveHistory,
  };
}