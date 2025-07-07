/**
 * Progress Tracking Hook - Clean Architecture
 * 
 * Single Responsibility: Progress state management
 * Following Gemini CLI's focused hook patterns
 */

import { useState, useCallback } from 'react';
import type { ProgressHistoryEntry, UseProgressTrackingReturn } from './types.js';

export function useProgressTracking(initialValue: number = 0): UseProgressTrackingReturn {
  const [value, setValue] = useState(initialValue);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressHistoryEntry[]>([]);

  const updateProgress = useCallback((newValue: number) => {
    if (startTime === null) {
      setStartTime(Date.now());
    }
    setValue(newValue);
    setProgressHistory(prev => [...prev, { value: newValue, timestamp: Date.now() }]);
  }, [startTime]);

  const resetProgress = useCallback(() => {
    setValue(0);
    setStartTime(null);
    setProgressHistory([]);
  }, []);

  const getVelocity = useCallback(() => {
    if (progressHistory.length < 2) return 0;
    const lastTwo = progressHistory.slice(-2);
    const timeDiff = (lastTwo[1].timestamp - lastTwo[0].timestamp) / 1000;
    if (timeDiff === 0) return 0;
    return (lastTwo[1].value - lastTwo[0].value) / timeDiff;
  }, [progressHistory]);

  const getETA = useCallback(() => {
    if (value === 0 || !startTime) return 0;
    const velocity = getVelocity();
    if (velocity <= 0) return Infinity;
    const remaining = 100 - value;
    return remaining / velocity;
  }, [value, startTime, getVelocity]);

  return {
    value,
    startTime,
    progressHistory,
    updateProgress,
    resetProgress,
    getVelocity,
    getETA
  };
} 