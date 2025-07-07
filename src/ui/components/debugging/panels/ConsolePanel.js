/**
 * Console Panel Component
 * 
 * Panel for displaying and interacting with the debug console.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../../colors.js';

/**
 * Console Panel Component
 */
export const ConsolePanel = ({
  messages,
  width,
  height,
  isFocused = false,
  onClear,
  onCommand,
  onFocusChange
}) => {
  // State for console input
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Refs
  const filteredMessagesRef = useRef(messages);
  
  // Update filtered messages
  useEffect(() => {
    filteredMessagesRef.current = messages;
  }, [messages]);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    setScrollOffset(0);
  }, [messages.length]);
  
  // Focus handler
  useEffect(() => {
    if (isFocused && onFocusChange) {
      onFocusChange(true);
    }
  }, [isFocused, onFocusChange]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle command submission
    if (key.return) {
      if (onCommand && input.trim()) {
        onCommand(input.trim());
        
        // Add to history and clear input
        setHistory(prev => [...prev, input.trim()].slice(-50)); // Keep last 50 commands
        setInput('');
        setHistoryIndex(-1);
      }
    } 
    // Handle backspace
    else if (key.backspace) {
      setInput(prev => prev.slice(0, -1));
    } 
    // Handle history navigation
    else if (key.upArrow && history.length > 0) {
      const newIndex = Math.min(history.length - 1, historyIndex + 1);
      setHistoryIndex(newIndex);
      setInput(history[history.length - 1 - newIndex] || '');
    } 
    else if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
    // Handle scrolling with page keys
    else if (key.pageUp) {
      setScrollOffset(prev => Math.min(prev + Math.floor((height - 3) / 2), messages.length - 1));
    }
    else if (key.pageDown) {
      setScrollOffset(prev => Math.max(0, prev - Math.floor((height - 3) / 2)));
    }
    // Handle clear console command
    else if (key.ctrl && (input === 'l' || input === 'L')) {
      if (onClear) {
        onClear();
      }
    }
    // Handle regular input
    else if (!key.ctrl && !key.meta && input && input.length === 1) {
      setInput(prev => prev + input);
    }
  }, { isActive: isFocused });
  
  // Get color for message type
  const getMessageColor = useCallback((type) => {
    switch (type) {
      case 'error':
        return Colors.Error;
      case 'warn':
        return Colors.Warning;
      case 'info':
        return Colors.Primary;
      case 'command':
        return Colors.AccentBlue;
      case 'result':
        return Colors.AccentGreen;
      case 'debug':
        return Colors.AccentPurple;
      default:
        return undefined;
    }
  }, []);
  
  // Format timestamp
  const formatTimestamp = useCallback((date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);
  
  // Calculate visible messages based on scroll
  const visibleMessages = messages.slice(
    Math.max(0, messages.length - (height - 3) - scrollOffset),
    messages.length - scrollOffset
  );
  
  return (
    <Box 
      flexDirection="column" 
      width={width} 
      height={height}
      borderColor={isFocused ? Colors.Primary : Colors.Border}
    >
      {/* Panel header */}
      <Box 
        width="100%"
        height={1}
        backgroundColor={isFocused ? Colors.Primary : Colors.BackgroundAlt}
        paddingX={1}
      >
        <Text bold>Console</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text>
            {scrollOffset > 0 ? 
              `Scrolled (${scrollOffset} lines up)` : 
              `${messages.length} message${messages.length === 1 ? '' : 's'}`
            }
          </Text>
        </Box>
      </Box>
      
      {/* Console messages */}
      <Box 
        flexDirection="column"
        width="100%"
        height={height - 3}
        paddingX={1}
        overflow="hidden"
      >
        {visibleMessages.length > 0 ? (
          visibleMessages.map((message, index) => {
            const color = getMessageColor(message.type);
            
            return (
              <Box key={message.id} flexDirection="column" marginBottom={0}>
                <Box>
                  {/* Timestamp */}
                  <Text color={Colors.TextDim}>
                    [{formatTimestamp(message.timestamp)}]
                  </Text>
                  
                  {/* Message type */}
                  <Text color={color} bold>
                    {' '}[{message.type}]{' '}
                  </Text>
                  
                  {/* Message content */}
                  <Text color={color}>
                    {message.text}
                  </Text>
                </Box>
                
                {/* Source location if available */}
                {message.source && (
                  <Text color={Colors.TextDim} paddingLeft={2}>
                    at {message.source.path}:{message.source.line}
                  </Text>
                )}
              </Box>
            );
          })
        ) : (
          <Text color={Colors.TextDim}>Console is empty.</Text>
        )}
      </Box>
      
      {/* Command input */}
      <Box 
        width="100%"
        height={1}
        backgroundColor={Colors.BackgroundSelected}
        paddingX={1}
      >
        <Text bold color={Colors.Primary}>{'> '}</Text>
        <Text>{input}</Text>
        {isFocused && <Text>▊</Text>}
      </Box>
      
      {/* Panel footer */}
      <Box 
        width="100%"
        height={1}
        backgroundColor={Colors.BackgroundAlt}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text>
          <Text color={Colors.AccentBlue}>Enter</Text> to execute | 
          <Text color={Colors.AccentBlue}> Ctrl+L</Text> to clear | 
          <Text color={Colors.AccentBlue}> PgUp/PgDn</Text> to scroll
        </Text>
        
        <Text color={Colors.TextDim}>↑/↓: History</Text>
      </Box>
    </Box>
  );
};

export default ConsolePanel;