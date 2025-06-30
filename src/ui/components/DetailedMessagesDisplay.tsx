/**
 * Detailed Messages Display Component
 * 
 * Displays detailed console messages in a scrollable container.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';

/**
 * Console message type
 */
export interface ConsoleMessage {
  /**
   * Message type (log, error, info, etc.)
   */
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  
  /**
   * Message text
   */
  text: string;
  
  /**
   * Timestamp of the message
   */
  timestamp: number;
}

/**
 * Detailed messages display props
 */
interface DetailedMessagesDisplayProps {
  /**
   * Array of console messages to display
   */
  messages: ConsoleMessage[];
  
  /**
   * Maximum height of the display
   */
  maxHeight?: number;
  
  /**
   * Width of the display
   */
  width: number;
}

/**
 * Format timestamp to readable string
 * 
 * @param timestamp - Unix timestamp
 * @returns Formatted time string (HH:MM:SS)
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Get color for message type
 * 
 * @param type - Message type
 * @returns Color from the Colors object
 */
const getColorForType = (type: ConsoleMessage['type']): string => {
  switch (type) {
    case 'error':
      return Colors.Error;
    case 'warn':
      return Colors.Warning;
    case 'info':
      return Colors.Info;
    case 'debug':
      return Colors.TextDim;
    default:
      return Colors.Text;
  }
};

/**
 * Get icon for message type
 * 
 * @param type - Message type
 * @returns Icon character for the message type
 */
const getIconForType = (type: ConsoleMessage['type']): string => {
  switch (type) {
    case 'error':
      return '✗';
    case 'warn':
      return '⚠';
    case 'info':
      return 'ℹ';
    case 'debug':
      return '⋯';
    default:
      return '·';
  }
};

/**
 * Detailed messages display component
 */
export const DetailedMessagesDisplay: React.FC<DetailedMessagesDisplayProps> = ({
  messages,
  maxHeight,
  width,
}) => {
  if (messages.length === 0) {
    return null;
  }

  // Sort messages by timestamp (newest first)
  const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
  
  // Limit messages by maxHeight if provided
  const displayMessages = maxHeight
    ? sortedMessages.slice(0, maxHeight)
    : sortedMessages;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={Colors.TextDim}
      paddingX={1}
      width={width}
      marginTop={1}
    >
      <Box marginBottom={1}>
        <Text bold>Console Messages ({messages.length})</Text>
      </Box>
      
      {displayMessages.map((message, index) => {
        const messageColor = getColorForType(message.type);
        const icon = getIconForType(message.type);
        
        return (
          <Box key={index} marginBottom={1}>
            <Box width={10} marginRight={1}>
              <Text color={Colors.TextDim}>
                {formatTime(message.timestamp)}
              </Text>
            </Box>
            
            <Box width={2} marginRight={1}>
              <Text color={messageColor}>
                {icon}
              </Text>
            </Box>
            
            <Box flexGrow={1}>
              <Text color={messageColor}>
                {message.text}
              </Text>
            </Box>
          </Box>
        );
      })}
      
      {maxHeight && messages.length > maxHeight && (
        <Box>
          <Text color={Colors.TextDim}>
            {messages.length - maxHeight} more messages hidden. Press Ctrl+S to show all.
          </Text>
        </Box>
      )}
    </Box>
  );
};