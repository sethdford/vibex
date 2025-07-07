/**
 * Claude Hooks - Clean Architecture like Gemini CLI
 * 
 * Centralized exports for Claude AI integration hooks
 */

// Main hook
export { useClaudeCore as useClaude } from './useClaudeCore.js';

// Focused hooks (for advanced usage)
export { useClaudeState } from './useClaudeState.js';
export { useClaudeTools } from './useClaudeTools.js';
export { useClaudeContext } from './useClaudeContext.js';
export { useClaudeMessages } from './useClaudeMessages.js';
export { useClaudeStream } from './useClaudeStream.js';

// Types
export type {
  ClaudeOptions,
  ClaudeReturn,
  ClaudeDependencies,
  ClaudeState,
  ClaudeMessage,
  ToolUseBlock,
  ToolResult,
  MessageContentBlock,
  StreamEvent,
  ToolInputParameters,
} from './types.js'; 