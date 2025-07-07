/**
 * Claude Hook Types - Clean Architecture like Gemini CLI
 * 
 * Centralized type definitions for all Claude-related hooks
 */

import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { HistoryItem } from '../../types.js';
import type { AppConfig } from '../../../config/index.js';
import type { ClaudeClient } from '../../../ai/claude-client.js';

/**
 * Claude message format
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Tool use block from Claude response
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

/**
 * Tool result to be sent to Claude
 */
export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Message content block from Claude response
 */
export type MessageContentBlock = 
  | { type: 'text'; text: string }
  | ToolUseBlock;

/**
 * Stream event from Claude API
 */
export interface StreamEvent {
  type: 'content_block_delta' | 'content_block_stop' | 'message_stop';
  delta?: {
    type: 'text_delta';
    text: string;
  };
}

/**
 * Dependencies for the main Claude hook
 */
export interface ClaudeDependencies {
  claudeClient: ClaudeClient | null;
  history: HistoryItem[];
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void;
  config: AppConfig;
  setDebugMessage: (message: string) => void;
  handleSlashCommand: (command: string) => boolean;
}

/**
 * Options for the main Claude hook
 */
export interface ClaudeOptions {
  enableAdvancedStreaming?: boolean;
  useConversationHistory?: boolean;
  enableRealToolExecution?: boolean;
  maxRetries?: number;
  requestTimeout?: number;
  enableDebugLogging?: boolean;
}

/**
 * Return type of the main Claude hook
 */
export interface ClaudeReturn {
  streamingState: string;
  submitQuery: (query: string) => Promise<void>;
  initError: string | null;
  pendingHistoryItems: HistoryItem[];
  clearPendingItems: () => void;
  thought: string;
  streamingText: string;
  streamingItemId: string | null;
  isInitialized: boolean;
  retryLastRequest: () => Promise<void>;
  cancelStreaming: () => void;
  operationTracker: any;
  contextIntegration: any;
}