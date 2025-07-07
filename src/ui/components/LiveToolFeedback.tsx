/**
 * Live Tool Feedback Component
 * 
 * Provides real-time feedback during tool execution with Claude Code-style
 * status updates, progress indicators, and organized display.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { ProgressSystem } from './progress-system/index.js';

/**
 * Tool operation types
 */
export type ToolOperation = 
  | 'read_file'
  | 'write_file' 
  | 'edit_file'
  | 'execute_command'
  | 'web_fetch'
  | 'analyze_code'
  | 'search_files'
  | 'create_directory'
  | 'delete_file'
  | 'list_directory'
  | 'read_many_files'
  | 'glob';

/**
 * Live feedback callbacks interface
 */
export interface LiveFeedbackCallbacks {
  onStart?: (operation: string, target?: string, message?: string) => string;
  onProgress?: (id: string, updates: Partial<Omit<LiveFeedbackData, 'id' | 'startTime'>>) => void;
  onComplete?: (id: string, result: { success: boolean; error?: string; [key: string]: any }) => void;
}

/**
 * Live feedback data
 */
export interface LiveFeedbackData {
  /**
   * Operation ID
   */
  id: string;
  
  /**
   * Tool operation type
   */
  operation: ToolOperation;
  
  /**
   * Target file/resource
   */
  target?: string;
  
  /**
   * Current status
   */
  status: 'starting' | 'processing' | 'completing' | 'completed' | 'error';
  
  /**
   * Status message
   */
  message?: string;
  
  /**
   * Progress details
   */
  progress?: {
    current: number;
    total: number;
    unit?: string;
  };
  
  /**
   * Result summary
   */
  result?: {
    success: boolean;
    linesAdded?: number;
    linesRemoved?: number;
    linesModified?: number;
    filesAffected?: number;
    outputSize?: number;
    error?: string;
  };
  
  /**
   * Start time
   */
  startTime: number;
  
  /**
   * End time
   */
  endTime?: number;
}

/**
 * Props for live tool feedback
 */
interface LiveToolFeedbackProps {
  /**
   * Current feedback data
   */
  feedback?: LiveFeedbackData;
  
  /**
   * Whether to show detailed progress
   */
  showProgress?: boolean;
  
  /**
   * Whether to auto-hide after completion
   */
  autoHide?: boolean;
  
  /**
   * Auto-hide delay in milliseconds
   */
  autoHideDelay?: number;
  
  /**
   * Maximum width
   */
  maxWidth?: number;
}

/**
 * Live tool feedback component
 */
export const LiveToolFeedback: React.FC<LiveToolFeedbackProps> = ({
  feedback,
  showProgress = true,
  autoHide = false,
  autoHideDelay = 3000,
  maxWidth = 80,
}) => {
  const [visible, setVisible] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Show/hide based on feedback presence
  useEffect(() => {
    if (feedback) {
      setVisible(true);
      
      // Clear any existing hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // Set auto-hide timeout for completed operations
      if (autoHide && (feedback.status === 'completed' || feedback.status === 'error')) {
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false);
        }, autoHideDelay);
      }
    } else {
      setVisible(false);
    }
    
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [feedback, autoHide, autoHideDelay]);
  
  // Animation for processing states
  useEffect(() => {
    if (!feedback || feedback.status === 'completed' || feedback.status === 'error') {
      return;
    }
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 4);
    }, 200);
    
    return () => clearInterval(interval);
  }, [feedback?.status]);
  
  if (!visible || !feedback) {
    return null;
  }
  
  // Get operation display info
  const getOperationInfo = () => {
    const operationMap: Record<ToolOperation, { icon: string; label: string; color: string }> = {
      read_file: { icon: '📖', label: 'Read', color: Colors.Info },
      write_file: { icon: '📝', label: 'Write', color: Colors.Success },
      edit_file: { icon: '✏️', label: 'Edit', color: Colors.Warning },
      execute_command: { icon: '⚡', label: 'Execute', color: Colors.AccentBlue },
      web_fetch: { icon: '🌐', label: 'Fetch', color: Colors.AccentPurple },
      analyze_code: { icon: '🔍', label: 'Analyze', color: Colors.AccentGreen },
      search_files: { icon: '🔎', label: 'Search', color: Colors.AccentYellow },
      create_directory: { icon: '📁', label: 'Create Dir', color: Colors.Info },
      delete_file: { icon: '🗑️', label: 'Delete', color: Colors.Error },
      list_directory: { icon: '📂', label: 'List Dir', color: Colors.Info },
      read_many_files: { icon: '📚', label: 'Read Many', color: Colors.Info },
      glob: { icon: '🔍', label: 'Glob', color: Colors.AccentYellow },
    };
    
    return operationMap[feedback.operation] || { 
      icon: '⚙️', 
      label: feedback.operation, 
      color: Colors.TextDim 
    };
  };
  
  // Get status indicator
  const getStatusIndicator = () => {
    const dots = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
    
    switch (feedback.status) {
      case 'starting':
        return { icon: '○', color: Colors.TextDim };
      case 'processing':
        return { icon: dots[animationFrame % dots.length], color: Colors.Info };
      case 'completing':
        return { icon: '⟳', color: Colors.Warning };
      case 'completed':
        return { icon: '✓', color: Colors.Success };
      case 'error':
        return { icon: '✗', color: Colors.Error };
      default:
        return { icon: '○', color: Colors.TextDim };
    }
  };
  
  // Calculate elapsed time
  const getElapsedTime = () => {
    const elapsed = (feedback.endTime || Date.now()) - feedback.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const ms = elapsed % 1000;
    
    if (seconds < 1) {return `${ms}ms`;}
    if (seconds < 60) {return `${seconds}.${Math.floor(ms / 100)}s`;}
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // Format result summary
  const formatResult = () => {
    if (!feedback.result) {return null;}
    
    const { result } = feedback;
    const parts: string[] = [];
    
    if (result.linesAdded) {parts.push(`+${result.linesAdded} lines`);}
    if (result.linesRemoved) {parts.push(`-${result.linesRemoved} lines`);}
    if (result.linesModified) {parts.push(`~${result.linesModified} lines`);}
    if (result.filesAffected) {parts.push(`${result.filesAffected} files`);}
    if (result.outputSize) {parts.push(`${formatBytes(result.outputSize)}`);}
    
    return parts.length > 0 ? parts.join(', ') : null;
  };
  
  const operationInfo = getOperationInfo();
  const statusIndicator = getStatusIndicator();
  const resultSummary = formatResult();
  
  return (
    <Box flexDirection="column" marginY={1}>
      {/* Main status line */}
      <Box>
        {/* Status indicator */}
        <Box marginRight={1}>
          <Text color={statusIndicator.color}>
            {statusIndicator.icon}
          </Text>
        </Box>
        
        {/* Operation type */}
        <Box marginRight={1}>
          <Text color={operationInfo.color} bold>
            {operationInfo.label}
          </Text>
        </Box>
        
        {/* Target */}
        {feedback.target && (
          <Box marginRight={1}>
            <Text color={Colors.Primary}>
              ({feedback.target})
            </Text>
          </Box>
        )}
        
        {/* Status message */}
        {feedback.message && (
          <Box marginRight={1}>
            <Text color={Colors.TextDim}>
              - {feedback.message}
            </Text>
          </Box>
        )}
        
        {/* Elapsed time */}
        <Box marginLeft={1}>
          <Text color={Colors.TextDim}>
            {getElapsedTime()}
          </Text>
        </Box>
      </Box>
      
      {/* Progress bar */}
      {showProgress && feedback.progress && feedback.status === 'processing' && (
        <Box marginTop={1} marginLeft={3}>
          <ProgressSystem
            mode="indeterminate"
            active={true}
            width={Math.min(40, maxWidth - 10)}
            label=""
            message={`${feedback.progress.current}/${feedback.progress.total} ${feedback.progress.unit || 'items'}`}
            animationStyle="slide"
          />
        </Box>
      )}
      
      {/* Result summary */}
      {resultSummary && (feedback.status === 'completed' || feedback.status === 'error') && (
        <Box marginTop={1} marginLeft={3}>
          <Text color={feedback.status === 'completed' ? Colors.Success : Colors.Error}>
            {feedback.status === 'completed' ? '✓' : '✗'} {resultSummary}
          </Text>
        </Box>
      )}
      
      {/* Error details */}
      {feedback.result?.error && feedback.status === 'error' && (
        <Box marginTop={1} marginLeft={3}>
          <Text color={Colors.Error}>
            Error: {feedback.result.error}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for managing live tool feedback
 */
export function useLiveToolFeedback() {
  const [currentFeedback, setCurrentFeedback] = useState<LiveFeedbackData | undefined>();
  const [feedbackHistory, setFeedbackHistory] = useState<LiveFeedbackData[]>([]);
  
  const startFeedback = (
    id: string,
    operation: ToolOperation,
    target?: string,
    message?: string
  ): LiveFeedbackData => {
    const feedback: LiveFeedbackData = {
      id,
      operation,
      target,
      status: 'starting',
      message,
      startTime: Date.now(),
    };
    
    setCurrentFeedback(feedback);
    return feedback;
  };
  
  const updateFeedback = (
    id: string,
    updates: Partial<Omit<LiveFeedbackData, 'id' | 'startTime'>>
  ) => {
    setCurrentFeedback(prev => {
      if (!prev || prev.id !== id) {return prev;}
      return { ...prev, ...updates };
    });
  };
  
  const completeFeedback = (
    id: string,
    result: LiveFeedbackData['result']
  ) => {
    const endTime = Date.now();
    
    setCurrentFeedback(prev => {
      if (!prev || prev.id !== id) {return prev;}
      
      const completed: LiveFeedbackData = {
        ...prev,
        status: result?.success ? 'completed' : 'error',
        result,
        endTime,
      };
      
      // Add to history
      setFeedbackHistory(history => [...history.slice(-9), completed]);
      
      return completed;
    });
  };
  
  const clearFeedback = () => {
    setCurrentFeedback(undefined);
  };
  
  const getFeedbackHistory = () => feedbackHistory;
  
  return {
    currentFeedback,
    feedbackHistory,
    startFeedback,
    updateFeedback,
    completeFeedback,
    clearFeedback,
    getFeedbackHistory,
  };
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
} 