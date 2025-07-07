/**
 * Streaming Orchestrator Component
 * 
 * Orchestrates different streaming components based on mode
 * Replaces the monolithic AdvancedStreamingDisplay with focused components
 * Following Gemini CLI patterns - composition over inheritance
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../colors.js';

// Focused streaming components
import { BasicStreamingText } from './shared/BasicStreamingText.js';
import { MarkdownStreamingDisplay } from './messages/MarkdownStreamingDisplay.js';
import { InteractiveStreamingDisplay } from './messages/InteractiveStreamingDisplay.js';

// Types
import {
  StreamingMode,
  StreamingState,
  type StreamingTheme,
  type LiveThinkingBlock,
  type StreamingResponse,
  type ToolExecutionEntry
} from './shared/streaming-types.js';

// New tool execution display
import { ToolExecutionDisplay } from './tool-execution-display/index.js';

/**
 * Streaming orchestrator props - simplified from original monolithic interface
 */
export interface StreamingOrchestratorProps {
  /** Streaming mode determines which component to use */
  mode: StreamingMode;
  /** Current streaming state */
  streamingState: StreamingState;
  /** Text content to display */
  content: string;
  /** Whether content is actively streaming */
  isStreaming: boolean;
  /** Typewriter effect speed (characters per second) */
  charsPerSecond?: number;
  /** Whether to show cursor during streaming */
  showCursor?: boolean;
  /** Whether to preserve whitespace */
  preserveWhitespace?: boolean;
  /** Custom color for text */
  textColor?: string;
  /** Enable syntax highlighting for code blocks */
  enableSyntaxHighlighting?: boolean;
  /** Show loading indicator */
  showLoadingIndicator?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Current thought/reasoning (for interactive mode) */
  thought?: string;
  /** Live thinking blocks (for interactive mode) */
  thinkingBlocks?: LiveThinkingBlock[];
  /** Current streaming response (for interactive mode) */
  currentResponse?: StreamingResponse;
  /** Tool execution entries (for tool mode) */
  toolExecutions?: ToolExecutionEntry[];
  /** Terminal dimensions */
  terminalWidth?: number;
  terminalHeight?: number;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Whether to show thinking blocks */
  showThinking?: boolean;
  /** Maximum number of tool entries to display */
  maxToolEntries?: number;
  /** Theme colors */
  theme?: StreamingTheme;
  /** Callback when streaming completes */
  onComplete?: () => void;
  /** Callback for thinking block interactions */
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
  /** Callback for response interactions */
  onResponseInteraction?: (responseId: string, action: 'copy' | 'regenerate' | 'continue') => void;
  /** Callback for tool interactions */
  onToolInteraction?: (toolId: string, action: 'cancel' | 'retry' | 'view_details') => void;
}

/**
 * Streaming orchestrator - composes focused streaming components
 * Follows Gemini CLI principle: orchestration not implementation
 */
export const StreamingOrchestrator: React.FC<StreamingOrchestratorProps> = (props) => {
  const {
    mode,
    streamingState,
    content,
    isStreaming,
    charsPerSecond = 40,
    showCursor = true,
    preserveWhitespace = true,
    textColor,
    enableSyntaxHighlighting = true,
    showLoadingIndicator = true,
    loadingMessage = 'Processing...',
    thought,
    thinkingBlocks = [],
    currentResponse,
    toolExecutions = [],
    terminalWidth = 100,
    terminalHeight = 30,
    showMetrics = true,
    showThinking = true,
    maxToolEntries = 10,
    theme = {
      thinking: Colors.AccentPurple,
      response: Colors.Text,
      accent: Colors.AccentBlue,
      muted: Colors.TextMuted,
      error: Colors.Error,
      success: Colors.Success,
      warning: Colors.Warning
    },
    onComplete,
    onThinkingInteraction,
    onResponseInteraction,
    onToolInteraction
  } = props;

  // Render appropriate component based on mode
  switch (mode) {
    case StreamingMode.BASIC:
      return (
        <BasicStreamingText
          content={content}
          isStreaming={isStreaming}
          charsPerSecond={charsPerSecond}
          showCursor={showCursor}
          preserveWhitespace={preserveWhitespace}
          textColor={textColor}
          showLoadingIndicator={showLoadingIndicator}
          loadingMessage={loadingMessage}
          theme={theme}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
          showMetrics={showMetrics}
          onComplete={onComplete}
        />
      );

    case StreamingMode.MARKDOWN:
      return (
        <MarkdownStreamingDisplay
          content={content}
          isStreaming={isStreaming}
          charsPerSecond={charsPerSecond}
          showCursor={showCursor}
          enableSyntaxHighlighting={enableSyntaxHighlighting}
          showLoadingIndicator={showLoadingIndicator}
          loadingMessage={loadingMessage}
          theme={theme}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
          showMetrics={showMetrics}
          onComplete={onComplete}
        />
      );

    case StreamingMode.INTERACTIVE:
      return (
        <InteractiveStreamingDisplay
          streamingState={streamingState}
          thinkingBlocks={thinkingBlocks}
          currentResponse={currentResponse}
          showThinking={showThinking}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
          theme={theme}
          showMetrics={showMetrics}
          onThinkingInteraction={onThinkingInteraction}
          onResponseInteraction={onResponseInteraction}
        />
      );

    case StreamingMode.TOOL_EXECUTION:
      return (
        <ToolExecutionDisplay
          executions={toolExecutions}
          maxEntries={maxToolEntries}
          showMetrics={showMetrics}
        />
      );

    case StreamingMode.LOADING:
      return (
        <Box>
          <Spinner type="dots" />
          <Box marginLeft={1}>
            <Text color={theme.accent}>{loadingMessage}</Text>
            {thought && <Text color={theme.muted}> • {thought}</Text>}
          </Box>
        </Box>
      );

    default:
      // Fallback to basic mode
      return (
        <BasicStreamingText
          content={content}
          isStreaming={isStreaming}
          charsPerSecond={charsPerSecond}
          showCursor={showCursor}
          preserveWhitespace={preserveWhitespace}
          textColor={textColor}
          showLoadingIndicator={showLoadingIndicator}
          loadingMessage={loadingMessage}
          theme={theme}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
          showMetrics={showMetrics}
          onComplete={onComplete}
        />
      );
  }
};

export default StreamingOrchestrator;

// Re-export everything for backward compatibility
export * from './shared/streaming-types.js';
export { BasicStreamingText } from './shared/BasicStreamingText.js';
export { MarkdownStreamingDisplay } from './messages/MarkdownStreamingDisplay.js';
export { InteractiveStreamingDisplay } from './messages/InteractiveStreamingDisplay.js';
export { ToolExecutionDisplay } from './tool-execution-display/index.js'; 