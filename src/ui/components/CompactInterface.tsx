/**
 * Compact Interface Component
 * 
 * High-density interface that maximizes information display while maintaining usability.
 * Addresses density issues compared to Claude Code and other competitive interfaces.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import type { HistoryItem } from '../types.js';
import { MessageType } from '../types.js';

export interface CompactInterfaceProps {
  /**
   * Terminal dimensions
   */
  terminalWidth: number;
  terminalHeight: number;
  
  /**
   * Conversation history
   */
  history: HistoryItem[];
  
  /**
   * Current input text
   */
  input: string;
  
  /**
   * Whether currently processing
   */
  isProcessing: boolean;
  
  /**
   * Current streaming text
   */
  streamingText?: string;
  
  /**
   * Model information
   */
  model: string;
  
  /**
   * Performance metrics
   */
  metrics?: {
    tokensUsed: number;
    responseTime: number;
    memoryUsage: number;
  };
  
  /**
   * Context information
   */
  context?: {
    filesLoaded: number;
    projectName: string;
    gitBranch?: string;
  };
  
  /**
   * Event handlers
   */
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
}

/**
 * Compact message display with minimal spacing
 */
const CompactMessage: React.FC<{
  message: HistoryItem;
  isLast: boolean;
  maxWidth: number;
}> = ({ message, isLast, maxWidth }) => {
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
  
  const getMessageColor = (type: MessageType): string => {
    switch (type) {
      case MessageType.USER: return Colors.Primary;
      case MessageType.ASSISTANT: return Colors.Success;
      case MessageType.SYSTEM: return Colors.Info;
      case MessageType.ERROR: return Colors.Error;
      case MessageType.TOOL_USE: return Colors.Warning;
      case MessageType.TOOL_OUTPUT: return Colors.Warning;
      default: return Colors.Text;
    }
  };
  
  // Truncate long messages for density
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  };
  
  const maxTextLength = maxWidth - 15; // Account for icon, timestamp, etc.
  const displayText = truncateText(message.text, maxTextLength);
  
  return (
    <Box>
      {/* Timestamp (compact) */}
      <Box width={6}>
        <Text color={Colors.TextDim}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </Box>
      
      {/* Icon */}
      <Box width={2} marginLeft={1}>
        <Text color={getMessageColor(message.type)}>
          {getMessageIcon(message.type)}
        </Text>
      </Box>
      
      {/* Message content */}
      <Box flexGrow={1} marginLeft={1}>
        <Text color={getMessageColor(message.type)}>
          {displayText}
        </Text>
        
        {/* Show expansion hint for truncated messages */}
        {message.text.length > maxTextLength && (
          <Text color={Colors.TextDim}> [Ctrl+E to expand]</Text>
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
  metrics?: CompactInterfaceProps['metrics'];
  context?: CompactInterfaceProps['context'];
  terminalWidth: number;
}> = ({ model, metrics, context, terminalWidth }) => {
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
        <Text color={Colors.Primary}>{model}</Text>
        {contextText && (
          <>
            <Text color={Colors.TextDim}> • </Text>
            <Text color={Colors.Info}>{contextText}</Text>
          </>
        )}
      </Box>
      
      {/* Right: Metrics */}
      {metricsText && (
        <Text color={Colors.TextDim}>{metricsText}</Text>
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
}> = ({ input, isProcessing, streamingText, terminalWidth }) => {
  const maxInputWidth = terminalWidth - 10; // Account for prompt and processing indicator
  
  return (
    <Box>
      {/* Prompt */}
      <Text color={Colors.Primary}>❯ </Text>
      
      {/* Input or streaming text */}
      <Box width={maxInputWidth}>
        {isProcessing ? (
          <Text color={Colors.Warning}>
            {streamingText || 'Processing...'}
            <Text color={Colors.Primary}>▋</Text>
          </Text>
        ) : (
          <Text>{input}</Text>
        )}
      </Box>
      
      {/* Processing indicator */}
      {isProcessing && (
        <Box marginLeft={1}>
          <Text color={Colors.Warning}>⏳</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Main compact interface component
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
  onSubmit,
  onCancel
}) => {
  const [showExpanded, setShowExpanded] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(-1);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.ctrl && input === 'e') {
      setShowExpanded(!showExpanded);
    } else if (key.ctrl && input === 'c') {
      onCancel?.();
    } else if (key.upArrow) {
      setSelectedMessageIndex(Math.max(0, selectedMessageIndex - 1));
    } else if (key.downArrow) {
      setSelectedMessageIndex(Math.min(history.length - 1, selectedMessageIndex + 1));
    }
  });
  
  // Calculate available space for messages
  const headerHeight = 1; // Compact header
  const statusHeight = 1; // Status bar
  const inputHeight = 1; // Input area
  const helpHeight = 1; // Help text
  const availableHeight = terminalHeight - headerHeight - statusHeight - inputHeight - helpHeight;
  
  // Get messages to display (most recent first, fit in available space)
  const displayMessages = history.slice(-availableHeight);
  
  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Ultra-compact header */}
      <Box>
        <Text color={Colors.Primary} bold>VIBEX</Text>
        <Text color={Colors.TextDim}> • AI Development CLI</Text>
      </Box>
      
      {/* Message history (compact) */}
      <Box flexDirection="column" flexGrow={1}>
        {displayMessages.map((message, index) => (
          <CompactMessage
            key={message.id}
            message={message}
            isLast={index === displayMessages.length - 1}
            maxWidth={terminalWidth}
          />
        ))}
        
        {/* Show overflow indicator */}
        {history.length > availableHeight && (
          <Text color={Colors.TextDim}>
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
      />
      
      {/* Status bar */}
      <CompactStatusBar
        model={model}
        metrics={metrics}
        context={context}
        terminalWidth={terminalWidth}
      />
      
      {/* Minimal help */}
      <Text color={Colors.TextDim}>
        Ctrl+E expand • Ctrl+S show all • Ctrl+C exit • /help commands
      </Text>
    </Box>
  );
};

export default CompactInterface; 