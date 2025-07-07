/**
 * Tool Execution Display - Type Definitions
 * 
 * Centralized type definitions for the tool execution display system.
 * Supports real-time tool execution tracking with streaming and metrics.
 */

import type { ToolCall, ToolResult } from '../../../ai/content-stream.js';

/**
 * Tool execution state
 */
export type ToolExecutionState = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

/**
 * Tool execution entry
 */
export interface ToolExecutionEntry {
  id: string;
  toolCall: ToolCall;
  result?: ToolResult;
  state: ToolExecutionState;
  startTime: number;
  endTime?: number;
  duration?: number;
  streamingOutput?: string;
  error?: string;
  metadata?: {
    memoryUsed?: number;
    cpuUsed?: number;
    networkRequests?: number;
    cacheHits?: number;
  };
}

/**
 * Tool execution display configuration
 */
export interface ToolExecutionDisplayConfig {
  maxEntries: number;
  showCompleted: boolean;
  showDetails: boolean;
  enableStreaming: boolean;
  compact: boolean;
  maxWidth: number;
  showMetrics: boolean;
  enableSyntaxHighlighting: boolean;
  autoScroll: boolean;
}

/**
 * Tool execution display props
 */
export interface ToolExecutionDisplayProps extends Partial<ToolExecutionDisplayConfig> {
  executions: ToolExecutionEntry[];
}

/**
 * Execution statistics
 */
export interface ExecutionStatistics {
  total: number;
  executing: number;
  completed: number;
  failed: number;
  avgDuration: number;
  successRate: number;
}

/**
 * State icon configuration
 */
export interface StateIconConfig {
  icon: string;
  color: string;
}

/**
 * Execution tracking operations
 */
export interface ExecutionTrackingOperations {
  executions: ToolExecutionEntry[];
  addExecution: (toolCall: ToolCall) => string;
  updateExecution: (id: string, updates: Partial<ToolExecutionEntry>) => void;
  startExecution: (id: string) => void;
  completeExecution: (id: string, result: ToolResult) => void;
  updateStreamingOutput: (id: string, output: string) => void;
  clearExecutions: () => void;
}

/**
 * Default configuration
 */
export const DEFAULT_TOOL_EXECUTION_CONFIG: ToolExecutionDisplayConfig = {
  maxEntries: 10,
  showCompleted: true,
  showDetails: true,
  enableStreaming: true,
  compact: false,
  maxWidth: 100,
  showMetrics: true,
  enableSyntaxHighlighting: true,
  autoScroll: true,
}; 