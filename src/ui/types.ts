/**
 * UI Type Definitions
 * 
 * Core types for the terminal UI system.
 */

/**
 * Streaming state enum for tracking the current state of the AI response
 */
export enum StreamingState {
  /**
   * Idle state, waiting for user input
   */
  Idle = 'idle',
  
  /**
   * AI is generating a response
   */
  Responding = 'responding',
  
  /**
   * Waiting for user confirmation (e.g., for tool use)
   */
  WaitingForConfirmation = 'waiting_for_confirmation',
  
  /**
   * An error occurred during streaming
   */
  Error = 'error'
}

/**
 * Message type enum for different kinds of messages in the conversation
 */
export enum MessageType {
  /**
   * User message
   */
  USER = 'user',
  
  /**
   * AI assistant message
   */
  ASSISTANT = 'assistant',
  
  /**
   * System message
   */
  SYSTEM = 'system',
  
  /**
   * Tool use request from the AI
   */
  TOOL_USE = 'tool_use',
  
  /**
   * Tool execution output
   */
  TOOL_OUTPUT = 'tool_output',
  
  /**
   * Error message
   */
  ERROR = 'error',
  
  /**
   * Warning message
   */
  WARNING = 'warning',
  
  /**
   * Informational message
   */
  INFO = 'info'
}

/**
 * Tool input parameters type
 */
export type ToolInputParameters = Record<string, string | number | boolean | null | undefined>;

/**
 * Tool use information
 */
export interface ToolUse {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool input parameters
   */
  input: ToolInputParameters;
  
  /**
   * Tool ID
   */
  id: string;
}

/**
 * Tool result information
 */
export interface ToolResultInfo {
  /**
   * Result content
   */
  content: string;
  
  /**
   * Whether the result is an error
   */
  isError: boolean;
  
  /**
   * Related tool use ID
   */
  toolUseId: string;
}

/**
 * History item interface for conversation items
 */
export interface HistoryItem {
  /**
   * Unique ID
   */
  id: string;
  
  /**
   * Message type
   */
  type: MessageType;
  
  /**
   * Message content
   */
  text: string;
  
  /**
   * Timestamp
   */
  timestamp: number;
  
  /**
   * Tool use information (for tool use messages)
   */
  toolUse?: ToolUse;
  
  /**
   * Tool result information (for tool result messages)
   */
  toolResult?: ToolResultInfo;
}

/**
 * Session statistics interface
 */
export interface SessionStats {
  /**
   * Start time of the session
   */
  startTime: number;
  
  /**
   * Total message count
   */
  messageCount: number;
  
  /**
   * Current response statistics
   */
  currentResponse: {
    /**
     * Prompt token count
     */
    promptTokenCount: number;
    
    /**
     * Candidates token count
     */
    candidatesTokenCount: number;
    
    /**
     * Total token count
     */
    totalTokenCount: number;
  };
}

/**
 * Theme interface
 */
export interface Theme {
  /**
   * Theme name
   */
  name: string;
  
  /**
   * Theme colors
   */
  colors: Record<string, string>;
}