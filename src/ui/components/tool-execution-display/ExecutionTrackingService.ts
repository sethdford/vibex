/**
 * Execution Tracking Service
 * 
 * Manages tool execution state, tracking, and lifecycle operations.
 * Provides centralized state management for tool execution tracking.
 */

import type { ToolCall, ToolResult } from '../../../ai/content-stream.js';
import type { ToolExecutionEntry, ExecutionTrackingOperations } from './types.js';

/**
 * Creates execution tracking service
 */
export function createExecutionTrackingService(): ExecutionTrackingOperations {
  let executions: ToolExecutionEntry[] = [];
  let listeners: Array<(executions: ToolExecutionEntry[]) => void> = [];

  const notifyListeners = () => {
    listeners.forEach(listener => listener([...executions]));
  };

  const addExecution = (toolCall: ToolCall): string => {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution: ToolExecutionEntry = {
      id,
      toolCall,
      state: 'pending',
      startTime: Date.now(),
    };
    
    executions = [execution, ...executions];
    notifyListeners();
    return id;
  };

  const updateExecution = (id: string, updates: Partial<ToolExecutionEntry>) => {
    executions = executions.map(exec => 
      exec.id === id ? { ...exec, ...updates } : exec
    );
    notifyListeners();
  };

  const startExecution = (id: string) => {
    updateExecution(id, {
      state: 'executing',
      startTime: Date.now(),
    });
  };

  const completeExecution = (id: string, result: ToolResult) => {
    const execution = executions.find(e => e.id === id);
    const endTime = Date.now();
    
    updateExecution(id, {
      state: result.error ? 'failed' : 'completed',
      result,
      endTime,
      duration: endTime - (execution?.startTime || endTime),
    });
  };

  const updateStreamingOutput = (id: string, output: string) => {
    updateExecution(id, {
      streamingOutput: output,
    });
  };

  const clearExecutions = () => {
    executions = [];
    notifyListeners();
  };

  const subscribe = (listener: (executions: ToolExecutionEntry[]) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  return {
    get executions() { return [...executions]; },
    addExecution,
    updateExecution,
    startExecution,
    completeExecution,
    updateStreamingOutput,
    clearExecutions,
    subscribe,
  } as ExecutionTrackingOperations & { subscribe: (listener: (executions: ToolExecutionEntry[]) => void) => () => void };
} 