/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

export enum StreamingState {
  IDLE = 'idle',
  THINKING = 'thinking',
  RESPONDING = 'responding',
  TOOL_EXECUTING = 'tool_executing',
  ERROR = 'error',
  COMPLETE = 'complete'
}

export enum MessageType {
  USER = 'user',
  ASSISTANT = 'assistant',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  TOOL_USE = 'tool_use',
  TOOL_OUTPUT = 'tool_output',
  SYSTEM = 'system'
}

export interface HistoryItem {
  id: string;
  type: MessageType;
  text: string;
  timestamp: number;
  toolUse?: {
    name: string;
    input: Record<string, any>;
    id: string;
  };
  toolResult?: {
    content: string;
    isError: boolean;
    toolUseId: string;
  };
}

export interface SessionStats {
  startTime: number;
  messageCount: number;
  currentResponse: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
