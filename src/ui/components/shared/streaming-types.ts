/**
 * Shared Streaming Types
 * 
 * Centralized type definitions for streaming components
 * Following Gemini CLI patterns - single responsibility, clean interfaces
 */

import type { ToolCall, ToolResult } from '../../../ai/content-stream.js';

/**
 * Streaming mode determines the display style and features
 */
export enum StreamingMode {
  BASIC = 'basic',           // Simple typewriter effect
  MARKDOWN = 'markdown',     // Markdown with syntax highlighting
  INTERACTIVE = 'interactive', // Claude-style with thinking blocks
  TOOL_EXECUTION = 'tool_execution', // Tool execution display
  LOADING = 'loading'        // Simple loading indicator
}

/**
 * Streaming state
 */
export enum StreamingState {
  IDLE = 'idle',
  THINKING = 'thinking',
  RESPONDING = 'responding',
  TOOL_EXECUTING = 'tool_executing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Thinking phase for interactive mode
 */
export enum ThinkingPhase {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  REASONING = 'reasoning',
  VERIFICATION = 'verification',
  SYNTHESIS = 'synthesis'
}

/**
 * Live thinking block for interactive mode
 */
export interface LiveThinkingBlock {
  id: string;
  phase: ThinkingPhase;
  content: string;
  startTime: number;
  endTime?: number;
  isExpanded: boolean;
  metadata?: {
    tokens?: number;
    confidence?: number;
    [key: string]: unknown;
  };
}

/**
 * Tool execution entry for tool mode
 */
export interface ToolExecutionEntry {
  id: string;
  toolCall: ToolCall;
  state: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  result?: ToolResult;
  error?: string;
  streamingOutput?: string;
}

/**
 * Streaming response interface
 */
export interface StreamingResponse {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    latency?: number;
    quality_score?: number;
  };
}

/**
 * Theme colors for streaming components
 */
export interface StreamingTheme {
  thinking: string;
  response: string;
  accent: string;
  muted: string;
  error: string;
  success: string;
  warning: string;
}

/**
 * Base streaming component props
 */
export interface BaseStreamingProps {
  terminalWidth?: number;
  terminalHeight?: number;
  theme?: StreamingTheme;
  showMetrics?: boolean;
} 