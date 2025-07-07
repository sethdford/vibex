/**
 * Call Stack Panel Component
 * 
 * Panel for displaying the call stack during debugging.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../../colors.js';

/**
 * Call Stack Panel Component
 */
export const CallStackPanel = ({
  callstack,
  width,
  height,
  isFocused = false,
  onFrameSelect,
  onFocusChange
}) => {
  // State for selected frame
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState({});
  
  // Make sure selected index is valid
  useEffect(() => {
    if (selectedIndex >= callstack.length && callstack.length > 0) {
      setSelectedIndex(callstack.length - 1);
    }
  }, [callstack, selectedIndex]);
  
  // Focus handler
  useEffect(() => {
    if (isFocused && onFocusChange) {
      onFocusChange(true);
    }
  }, [isFocused, onFocusChange]);
  
  // Get the selected frame
  const selectedFrame = callstack[selectedIndex];
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Navigation keys
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(callstack.length - 1, prev + 1));
    }
    
    // Toggle expanded state
    if (key.return || input === ' ') {
      if (selectedFrame) {
        setExpanded(prev => ({
          ...prev,
          [selectedFrame.id]: !prev[selectedFrame.id]
        }));
      }
    }
    
    // Select frame for debugging
    if (input === 's' && selectedFrame && onFrameSelect) {
      onFrameSelect(selectedFrame);
    }
  }, { isActive: isFocused });
  
  // Get file name from path
  const getFileName = useCallback((path) => {
    if (!path) return 'Unknown';
    const parts = path.split('/');
    return parts[parts.length - 1];
  }, []);
  
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
        <Text bold>Call Stack</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text>{callstack.length} frame{callstack.length === 1 ? '' : 's'}</Text>
        </Box>
      </Box>
      
      {/* Call stack list */}
      <Box 
        flexDirection="column"
        width="100%"
        height={height - 2}
        paddingX={1}
        overflow="hidden"
      >
        {callstack.length > 0 ? (
          callstack.map((frame, index) => {
            const isSelected = index === selectedIndex;
            const isExpanded = expanded[frame.id];
            const isCurrent = frame.isCurrent;
            
            return (
              <Box key={frame.id} flexDirection="column">
                <Text
                  backgroundColor={isSelected ? Colors.BackgroundSelected : undefined}
                  color={
                    isSelected ? Colors.ForegroundSelected : 
                    isCurrent ? Colors.Primary : undefined
                  }
                  bold={isSelected || isCurrent}
                >
                  {isCurrent ? '→ ' : '  '}
                  {frame.name}
                  <Text dimColor={!(isSelected || isCurrent)}> at {getFileName(frame.path)}:{frame.line}:{frame.column}</Text>
                </Text>
                
                {isExpanded && frame.context && (
                  <Box 
                    flexDirection="column" 
                    paddingLeft={2}
                    marginY={1}
                  >
                    {frame.context.map((line, i) => (
                      <Text 
                        key={`context-${i}`}
                        color={Colors.TextDim}
                        backgroundColor={i === 3 ? Colors.BackgroundHighlight : undefined}
                      >
                        {line}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })
        ) : (
          <Text color={Colors.TextDim}>No call stack available.</Text>
        )}
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
          <Text color={Colors.AccentBlue}>S</Text>elect | 
          <Text color={Colors.AccentBlue}> ↵</Text> Show code
        </Text>
        
        <Text color={Colors.TextDim}>↑/↓: Navigate</Text>
      </Box>
    </Box>
  );
};

export default CallStackPanel;