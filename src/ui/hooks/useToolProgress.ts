/**
 * Tool Progress Hook
 * 
 * Provides a React hook for tracking and displaying progress of tool executions,
 * with support for multiple concurrent operations and detailed status updates.
 */

import { useState, useCallback } from 'react';
import { ToolProgressData } from '../components/tools/ToolProgressFeedback';
import { ToolCall } from '../../core/domain/tool/tool-interfaces';

export interface ToolProgressState {
  /**
   * Map of progress data by tool call ID
   */
  progressItems: Map<string, ToolProgressData>;
  
  /**
   * Map of tool calls by ID
   */
  toolCalls: Map<string, ToolCall>;
}

/**
 * Hook for managing tool progress
 */
export function useToolProgress() {
  // State for tracking progress of multiple tools
  const [state, setState] = useState<ToolProgressState>({
    progressItems: new Map(),
    toolCalls: new Map()
  });
  
  /**
   * Update progress for a specific tool call
   */
  const updateProgress = useCallback((
    callId: string, 
    progressData: Partial<ToolProgressData>
  ) => {
    setState(prev => {
      // Get existing progress data or create new
      const existing = prev.progressItems.get(callId) || {};
      
      // Create new map to trigger re-render
      const progressItems = new Map(prev.progressItems);
      progressItems.set(callId, {
        ...existing,
        ...progressData
      });
      
      return {
        ...prev,
        progressItems
      };
    });
  }, []);
  
  /**
   * Register a tool call for progress tracking
   */
  const registerToolCall = useCallback((toolCall: ToolCall) => {
    const callId = toolCall.request.callId;
    
    setState(prev => {
      // Create new maps to trigger re-render
      const toolCalls = new Map(prev.toolCalls);
      toolCalls.set(callId, toolCall);
      
      // Initialize progress data if not exists
      const progressItems = new Map(prev.progressItems);
      if (!progressItems.has(callId)) {
        progressItems.set(callId, {
          status: toolCall.status,
          message: getDefaultMessage(toolCall.status)
        });
      }
      
      return {
        toolCalls,
        progressItems
      };
    });
    
    // Return a function to handle progress updates
    return (progressUpdate: Partial<ToolProgressData>) => {
      updateProgress(callId, progressUpdate);
    };
  }, [updateProgress]);
  
  /**
   * Update a tool call status
   */
  const updateToolCall = useCallback((toolCall: ToolCall) => {
    const callId = toolCall.request.callId;
    
    setState(prev => {
      // Create new maps to trigger re-render
      const toolCalls = new Map(prev.toolCalls);
      toolCalls.set(callId, toolCall);
      
      // Update progress with new status
      const progressItems = new Map(prev.progressItems);
      const existing = progressItems.get(callId) || {};
      progressItems.set(callId, {
        ...existing,
        status: toolCall.status,
        message: existing.message || getDefaultMessage(toolCall.status)
      });
      
      return {
        toolCalls,
        progressItems
      };
    });
  }, []);
  
  /**
   * Clear progress for a tool call
   */
  const clearProgress = useCallback((callId: string) => {
    setState(prev => {
      // Create new maps to trigger re-render
      const progressItems = new Map(prev.progressItems);
      progressItems.delete(callId);
      
      const toolCalls = new Map(prev.toolCalls);
      toolCalls.delete(callId);
      
      return {
        progressItems,
        toolCalls
      };
    });
  }, []);
  
  /**
   * Clear all progress data
   */
  const clearAllProgress = useCallback(() => {
    setState({
      progressItems: new Map(),
      toolCalls: new Map()
    });
  }, []);
  
  return {
    progressItems: state.progressItems,
    toolCalls: state.toolCalls,
    registerToolCall,
    updateProgress,
    updateToolCall,
    clearProgress,
    clearAllProgress
  };
}

/**
 * Get default message based on status
 */
function getDefaultMessage(status: string): string {
  switch (status) {
    case 'validating':
      return 'Validating parameters...';
    case 'awaiting_approval':
      return 'Waiting for approval...';
    case 'scheduled':
      return 'Scheduled for execution...';
    case 'executing':
      return 'Executing...';
    case 'completed':
      return 'Completed successfully';
    case 'error':
      return 'Failed with error';
    default:
      return '';
  }
}

export default useToolProgress;