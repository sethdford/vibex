/**
 * Tool Execution Tracking Hook
 * 
 * React hook for managing tool execution tracking state.
 * Provides a clean interface for tracking tool executions in React components.
 */

import { useState, useCallback } from 'react';
import type { ToolCall, ToolResult } from '../../../ai/content-stream.js';
import type { ToolExecutionEntry, ExecutionTrackingOperations } from './types.js';

/**
 * Hook for managing tool execution tracking
 */
export function useToolExecutionTracking(): ExecutionTrackingOperations {
  const [executions, setExecutions] = useState<ToolExecutionEntry[]>([]);

  const addExecution = useCallback((toolCall: ToolCall): string => {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution: ToolExecutionEntry = {
      id,
      toolCall,
      state: 'pending',
      startTime: Date.now(),
    };
    
    setExecutions(prev => [execution, ...prev]);
    return id;
  }, []);

  const updateExecution = useCallback((id: string, updates: Partial<ToolExecutionEntry>) => {
    setExecutions(prev => prev.map(exec => 
      exec.id === id ? { ...exec, ...updates } : exec
    ));
  }, []);

  const startExecution = useCallback((id: string) => {
    updateExecution(id, {
      state: 'executing',
      startTime: Date.now(),
    });
  }, [updateExecution]);

  const completeExecution = useCallback((id: string, result: ToolResult) => {
    setExecutions(prev => {
      const execution = prev.find(e => e.id === id);
      const endTime = Date.now();
      
      return prev.map(exec => 
        exec.id === id ? {
          ...exec,
          state: result.error ? 'failed' : 'completed',
          result,
          endTime,
          duration: endTime - (execution?.startTime || endTime),
        } : exec
      );
    });
  }, []);

  const updateStreamingOutput = useCallback((id: string, output: string) => {
    updateExecution(id, {
      streamingOutput: output,
    });
  }, [updateExecution]);

  const clearExecutions = useCallback(() => {
    setExecutions([]);
  }, []);

  return {
    executions,
    addExecution,
    updateExecution,
    startExecution,
    completeExecution,
    updateStreamingOutput,
    clearExecutions,
  };
} 