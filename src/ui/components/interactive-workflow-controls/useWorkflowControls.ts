/**
 * useWorkflowControls Hook - Clean Architecture like Gemini CLI
 * 
 * Hook for managing workflow control state
 */

import { useState, useCallback } from 'react';
import { 
  WorkflowControlState, 
  DebugBreakpoint, 
  UseWorkflowControlsReturn,
  RetryConfiguration
} from './types.js';

/**
 * Hook for managing workflow control state
 */
export function useWorkflowControls(): UseWorkflowControlsReturn {
  const [controlState, setControlState] = useState<WorkflowControlState>('idle');
  const [breakpoints, setBreakpoints] = useState<DebugBreakpoint[]>([]);
  const [retryHistory, setRetryHistory] = useState<Map<string, number>>(new Map());

  const play = useCallback(() => {
    setControlState('running');
  }, []);

  const pause = useCallback(() => {
    setControlState('paused');
  }, []);

  const resume = useCallback(() => {
    setControlState('running');
  }, []);

  const cancel = useCallback(() => {
    setControlState('cancelling');
    // Simulate cleanup time
    setTimeout(() => setControlState('idle'), 1000);
  }, []);

  const abort = useCallback(() => {
    setControlState('idle');
  }, []);

  const reset = useCallback(() => {
    setControlState('idle');
    setBreakpoints([]);
    setRetryHistory(new Map());
  }, []);

  const addBreakpoint = useCallback((taskId: string, condition?: string): string => {
    const breakpoint: DebugBreakpoint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      condition,
      enabled: true,
      hitCount: 0,
      description: `Breakpoint on ${taskId}`,
    };

    setBreakpoints(prev => [...prev, breakpoint]);
    return breakpoint.id;
  }, []);

  const removeBreakpoint = useCallback((breakpointId: string) => {
    setBreakpoints(prev => prev.filter(bp => bp.id !== breakpointId));
  }, []);

  const toggleBreakpoint = useCallback((breakpointId: string) => {
    setBreakpoints(prev => prev.map(bp =>
      bp.id === breakpointId ? { ...bp, enabled: !bp.enabled } : bp
    ));
  }, []);

  const incrementRetryCount = useCallback((taskId: string) => {
    setRetryHistory(prev => {
      const newMap = new Map(prev);
      newMap.set(taskId, (newMap.get(taskId) || 0) + 1);
      return newMap;
    });
  }, []);

  const getRetryCount = useCallback((taskId: string) => {
    return retryHistory.get(taskId) || 0;
  }, [retryHistory]);

  return {
    controlState,
    breakpoints,
    retryHistory,
    play,
    pause,
    resume,
    cancel,
    abort,
    reset,
    addBreakpoint,
    removeBreakpoint,
    toggleBreakpoint,
    incrementRetryCount,
    getRetryCount,
    setControlState,
  };
} 