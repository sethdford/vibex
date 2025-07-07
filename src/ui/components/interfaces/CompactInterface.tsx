/**
 * Compact Interface Component - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: High-density display with minimal spacing
 * Extracted from ModernInterface.tsx monolith
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { PerformanceMetrics, ContextInfo, InterfaceTheme } from '../types/interface-types.js';
import { HistoryItem, MessageType } from '../../types.js';

/**
 * Compact interface props
 */
export interface CompactInterfaceProps {
  terminalWidth: number;
  terminalHeight: number;
  history: HistoryItem[];
  input: string;
  isProcessing: boolean;
  streamingText?: string;
  model: string;
  metrics?: PerformanceMetrics;
  context?: ContextInfo;
  theme?: InterfaceTheme;
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
}

/**
 * Get message icon for different message types
 */
const getMessageIcon = (type: MessageType): string => {
  switch (type) {
    case MessageType.USER: return '❯';
    case MessageType.ASSISTANT: return '🤖';
    case MessageType.SYSTEM: return 'ℹ';
    case MessageType.ERROR: return '❌';
    case MessageType.TOOL_USE: return '🔧';
    case MessageType.TOOL_OUTPUT: return '⚙️';
    default: return '•';
  }
};

/**
 * Get message color for different message types
 */
const getMessageColor = (type: MessageType, theme: InterfaceTheme): string => {
  switch (type) {
    case MessageType.USER: return theme.primary;
    case MessageType.ASSISTANT: return theme.success;
    case MessageType.SYSTEM: return theme.accent;
    case MessageType.ERROR: return theme.error;
    case MessageType.TOOL_USE: return theme.warning;
    case MessageType.TOOL_OUTPUT: return theme.warning;
    default: return theme.text;
  }
};

/**
 * Truncate text for density
 */
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Compact message component
 */
const CompactMessage: React.FC<{
  message: HistoryItem;
  isLast: boolean;
  maxWidth: number;
  theme: InterfaceTheme;
}> = ({ message, isLast, maxWidth, theme }) => {
  const maxTextLength = maxWidth - 15;
  const displayText = truncateText(message.text, maxTextLength);
  
  return (
    <Box>
      {/* Timestamp (compact) */}
      <Box width={6}>
        <Text color={theme.muted}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </Box>
      
      {/* Icon */}
      <Box width={2} marginLeft={1}>
        <Text color={getMessageColor(message.type, theme)}>
          {getMessageIcon(message.type)}
        </Text>
      </Box>
      
      {/* Message content */}
      <Box flexGrow={1} marginLeft={1}>
        <Text color={getMessageColor(message.type, theme)}>
          {displayText}
        </Text>
        
        {/* Show expansion hint for truncated messages */}
        {message.text.length > maxTextLength && (
          <Text color={theme.muted}> [Ctrl+E to expand]</Text>
        )}
      </Box>
    </Box>
  );
};

/**
 * Ultra-compact status bar with all key information
 */
const CompactStatusBar: React.FC<{
  model: string;
  metrics?: PerformanceMetrics;
  context?: ContextInfo;
  terminalWidth: number;
  theme: InterfaceTheme;
}> = ({ model, metrics, context, terminalWidth, theme }) => {
  // Format metrics compactly
  const formatMetrics = (): string => {
    if (!metrics) return '';
    const { tokensUsed, responseTime, memoryUsage } = metrics;
    return `${tokensUsed}t ${responseTime}ms ${Math.round(memoryUsage)}MB`;
  };
  
  // Format context compactly
  const formatContext = (): string => {
    if (!context) return '';
    const { filesLoaded, projectName, gitBranch } = context;
    return `${projectName}${gitBranch ? `@${gitBranch}` : ''} (${filesLoaded}f)`;
  };
  
  const metricsText = formatMetrics();
  const contextText = formatContext();
  
  return (
    <Box justifyContent="space-between" width="100%">
      {/* Left: Model and context */}
      <Box>
        <Text color={theme.primary}>{model}</Text>
        {contextText && (
          <>
            <Text color={theme.muted}> • </Text>
            <Text color={theme.accent}>{contextText}</Text>
          </>
        )}
      </Box>
      
      {/* Right: Metrics */}
      {metricsText && (
        <Text color={theme.muted}>{metricsText}</Text>
      )}
    </Box>
  );
};

/**
 * Compact input area with inline status
 */
const CompactInput: React.FC<{
  input: string;
  isProcessing: boolean;
  streamingText?: string;
  terminalWidth: number;
  theme: InterfaceTheme;
}> = ({ input, isProcessing, streamingText, terminalWidth, theme }) => {
  const maxInputWidth = terminalWidth - 10;
  
  return (
    <Box>
      {/* Prompt */}
      <Text color={theme.primary}>❯ </Text>
      
      {/* Input or streaming text */}
      <Box width={maxInputWidth}>
        {isProcessing ? (
          <Text color={theme.warning}>
            {streamingText || 'Processing...'}
            <Text color={theme.primary}>▋</Text>
          </Text>
        ) : (
          <Text>{input}</Text>
        )}
      </Box>
      
      {/* Processing indicator */}
      {isProcessing && (
        <Box marginLeft={1}>
          <Text color={theme.warning}>⏳</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Compact interface component - focused on high-density display only
 */
export const CompactInterface: React.FC<CompactInterfaceProps> = ({
  terminalWidth,
  terminalHeight,
  history,
  input,
  isProcessing,
  streamingText,
  model,
  metrics,
  context,
  theme = {
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    accent: Colors.AccentBlue,
    background: Colors.Background,
    text: Colors.Text,
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    muted: Colors.TextMuted,
    error: Colors.Error,
    success: Colors.Success,
    warning: Colors.Warning
  },
  onSubmit,
  onCancel,
}) => {
  // Calculate available space for messages
  const headerHeight = 1;
  const statusHeight = 1;
  const inputHeight = 1;
  const helpHeight = 1;
  const availableHeight = terminalHeight - headerHeight - statusHeight - inputHeight - helpHeight;
  
  // Get messages to display (most recent first, fit in available space)
  const displayMessages = history.slice(-availableHeight);
  
  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Ultra-compact header */}
      <Box>
        <Text color={theme.primary} bold>VIBEX</Text>
        <Text color={theme.muted}> • AI Development CLI</Text>
      </Box>
      
      {/* Message history (compact) */}
      <Box flexDirection="column" flexGrow={1}>
        {displayMessages.map((message, index) => (
          <CompactMessage
            key={message.id}
            message={message}
            isLast={index === displayMessages.length - 1}
            maxWidth={terminalWidth}
            theme={theme}
          />
        ))}
        
        {/* Show overflow indicator */}
        {history.length > availableHeight && (
          <Text color={theme.muted}>
            ↑ {history.length - availableHeight} more messages (Ctrl+S to show all)
          </Text>
        )}
      </Box>
      
      {/* Compact input */}
      <CompactInput
        input={input}
        isProcessing={isProcessing}
        streamingText={streamingText}
        terminalWidth={terminalWidth}
        theme={theme}
      />
      
      {/* Status bar */}
      <CompactStatusBar
        model={model}
        metrics={metrics}
        context={context}
        terminalWidth={terminalWidth}
        theme={theme}
      />
      
      {/* Minimal help */}
      <Text color={theme.muted}>
        Ctrl+E expand • Ctrl+S show all • Ctrl+X exit • /help commands
      </Text>
    </Box>
  );
};

export default CompactInterface; 