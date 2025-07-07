/**
 * History Item Display Component
 * 
 * Displays a single conversation history item (user message, assistant response, etc.)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import type { HistoryItem} from '../types.js';
import { MessageType } from '../types.js';
import { parseMarkdown } from '../utils/markdownUtilities.js';
import { MarkdownDisplay } from '../utils/MarkdownDisplay.js';
import { ToolMessage } from './ToolMessage.js';
import { ClipboardActions } from './ClipboardActions.js';
import { ImageDisplay } from './image/ImageDisplay.js';
import { isImageFile } from '../utils/imageUtils.js';
import { StreamingOrchestrator, StreamingMode, StreamingState } from './StreamingOrchestrator.js';

/**
 * App configuration interface
 */
export interface AppConfig {
  terminal?: {
    streamingSpeed?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Markdown image interface
 */
export interface MarkdownImage {
  src: string;
  alt?: string;
  title?: string;
}

/**
 * History item display props
 */
interface HistoryItemDisplayProps {
  /**
   * The history item to display
   */
  item: HistoryItem;
  
  /**
   * Whether the item is pending (currently being processed)
   */
  isPending: boolean;
  
  /**
   * Available terminal height for constrained rendering
   */
  availableTerminalHeight?: number;
  
  /**
   * Width of the terminal
   */
  terminalWidth: number;
  
  /**
   * App configuration
   */
  config: AppConfig;
  
  /**
   * Whether this component has focus
   */
  isFocused?: boolean;
}

/**
 * History item display component
 */
export const HistoryItemDisplay: React.FC<HistoryItemDisplayProps> = ({
  item,
  isPending,
  availableTerminalHeight,
  terminalWidth,
  config,
  isFocused = true,
}) => {
  // Check for image paths in the content
  const [isImage, setIsImage] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if the text content is an image path
    if (item.text && typeof item.text === 'string') {
      // Check if it looks like a file path and is an image
      if (
        (item.text.startsWith('/') || item.text.startsWith('./') || item.text.match(/^[A-Z]:\\/) || item.text.match(/^[A-Z]:\//))
        && isImageFile(item.text)
      ) {
        setIsImage(true);
        return;
      }
      
      // Reset if the content changes and is not an image
      setIsImage(false);
    }
  }, [item.text]);
  
  // Handle empty items - but allow pending items to render even with empty text
  if (!item?.text && !isPending) {
    return null;
  }
  
  // For pending items with empty text, show a minimal placeholder
  if (isPending && (!item?.text || item.text.trim() === '')) {
    return (
      <Box
        borderStyle="round"
        borderColor={Colors.TextDim}
        flexDirection="column"
        paddingX={1}
        paddingY={0}
        marginY={0}
        minHeight={3}
      >
        <Box marginBottom={0}>
          <Text color={Colors.Secondary} bold>
            Claude
          </Text>
          <Text color={Colors.TextDim}> (thinking...)</Text>
        </Box>
        
        <Box flexDirection="column" marginTop={1}>
          <Text color={Colors.TextDim}>
            Analyzing your request...
          </Text>
        </Box>
      </Box>
    );
  }
  
  const { type, text, toolUse, toolResult } = item;
  
  // Handle tool use and tool result messages
  if (type === MessageType.TOOL_USE && toolUse) {
    return (
      <ToolMessage 
        toolUse={toolUse}
        toolResult={toolResult}
        isFocused={isFocused}
      />
    );
  }
  
  // Format markdown content for assistant responses
  let content = text || ''; // Ensure content is never undefined
  let markdownImages: MarkdownImage[] = [];
  
  if (type === MessageType.ASSISTANT || type === MessageType.TOOL_OUTPUT) {
    const parsedMarkdown = parseMarkdown(content);
    markdownImages = parsedMarkdown.images;
    // Keep the raw content for the React-based renderer
    content = text || '';
  }
  
  // Determine border color based on message type
  let borderColor = Colors.TextDim;
  let labelColor = Colors.TextDim;
  let label = '';
  
  switch (type) {
    case MessageType.USER:
      borderColor = Colors.Primary;
      labelColor = Colors.Primary;
      label = 'You';
      break;
    case MessageType.ASSISTANT:
      borderColor = Colors.Secondary;
      labelColor = Colors.Secondary;
      label = 'Claude';
      break;
    case MessageType.TOOL_USE:
      borderColor = Colors.Info;
      labelColor = Colors.Info;
      label = 'Tool Use';
      break;
    case MessageType.TOOL_OUTPUT:
      borderColor = Colors.Success;
      labelColor = Colors.Success;
      label = 'Tool Output';
      break;
    case MessageType.ERROR:
      borderColor = Colors.Error;
      labelColor = Colors.Error;
      label = 'Error';
      break;
    case MessageType.INFO:
      borderColor = Colors.Info;
      labelColor = Colors.Info;
      label = 'Info';
      break;
    case MessageType.WARNING:
      borderColor = Colors.Warning;
      labelColor = Colors.Warning;
      label = 'Warning';
      break;
  }
  
  // Apply different styling for pending items
  if (isPending) {
    borderColor = Colors.TextDim;
  }
  
  // Determine if we should use streaming text
  const shouldStream = isPending && type === MessageType.ASSISTANT;
  const streamingSpeed = config?.terminal?.streamingSpeed || 40; // chars per second
  
  // Handle image display
  if (isImage && text && typeof text === 'string') {
    return (
      <Box
        borderStyle="round"
        borderColor={borderColor}
        flexDirection="column"
        paddingX={1}
        paddingY={0}
        marginY={1}
      >
        <Box marginBottom={1}>
          <Text color={labelColor} bold>
            {label}
          </Text>
        </Box>
        
        <ImageDisplay
          source={{ type: 'file', path: text }}
          maxWidth={terminalWidth - 4} // Account for borders and padding
          maxHeight={availableTerminalHeight ? availableTerminalHeight - 4 : 20}
          caption={`File: ${text}`}
        />
        
        <Box marginTop={1}>
          <ClipboardActions 
            content={text} 
            isFocused={isFocused}
            boxStyle={{ justifyContent: 'flex-start' }}
          />
        </Box>
      </Box>
    );
  }
  
  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      paddingX={1}
      paddingY={0}
      marginY={0}
      minHeight={content || isPending ? 3 : 1}
    >
      <Box marginBottom={0}>
        <Text color={labelColor} bold>
          {label}
        </Text>
        {isPending && (
          <Text color={Colors.TextDim}> {shouldStream ? "(streaming...)" : "(typing...)"}</Text>
        )}
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        <Box>
          {shouldStream ? (
            <StreamingOrchestrator
              mode={StreamingMode.BASIC}
              streamingState={shouldStream ? StreamingState.RESPONDING : StreamingState.IDLE}
              content={content}
              isStreaming={isPending}
              charsPerSecond={streamingSpeed}
              showCursor={true}
              preserveWhitespace={true}
              textColor={Colors.Text}
              terminalWidth={terminalWidth - 4}
            />
          ) : (
            (type === MessageType.ASSISTANT || type === MessageType.TOOL_OUTPUT) ? (
              content ? (
                <MarkdownDisplay 
                  markdown={content} 
                  maxWidth={terminalWidth - 4}
                  maxHeight={availableTerminalHeight ? Math.min(availableTerminalHeight - 4, 20) : 20}
                />
              ) : isPending ? (
                <Text color={Colors.TextDim}>
                  Waiting for response...
                </Text>
              ) : null
            ) : (
              content ? (
                <Text>
                  {content}
                </Text>
              ) : isPending ? (
                <Text color={Colors.TextDim}>
                  Processing...
                </Text>
              ) : null
            )
          )}
        </Box>
        
        {/* Markdown component now handles images */}
        
        {!isPending && content && (
          <Box marginTop={1}>
            <ClipboardActions 
              content={text || ''} 
              isFocused={isFocused}
              boxStyle={{ justifyContent: 'flex-start' }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};