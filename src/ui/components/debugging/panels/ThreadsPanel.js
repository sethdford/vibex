/**
 * Threads Panel Component
 * 
 * Panel for displaying and selecting debug threads.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../../colors.js';

/**
 * Threads Panel Component
 */
export const ThreadsPanel = ({
  threads,
  width,
  height,
  isFocused = false,
  onThreadSelect,
  onFocusChange
}) => {
  // State for selected thread
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState({});
  
  // Make sure selected index is valid
  useEffect(() => {
    if (selectedIndex >= threads.length && threads.length > 0) {
      setSelectedIndex(threads.length - 1);
    }
  }, [threads, selectedIndex]);
  
  // Focus handler
  useEffect(() => {
    if (isFocused && onFocusChange) {
      onFocusChange(true);
    }
  }, [isFocused, onFocusChange]);
  
  // Get the selected thread
  const selectedThread = threads[selectedIndex];
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Navigation keys
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(threads.length - 1, prev + 1));
    }
    
    // Toggle details
    if (key.return || input === ' ') {
      if (selectedThread) {
        setShowDetails(prev => ({
          ...prev,
          [selectedThread.id]: !prev[selectedThread.id]
        }));
      }
    }
    
    // Select thread
    if (input === 's' && selectedThread && onThreadSelect) {
      onThreadSelect(selectedThread);
    }
  }, { isActive: isFocused });
  
  // Format thread name with status
  const getThreadStatus = useCallback((thread) => {
    if (thread.stopped) {
      return { label: 'stopped', color: Colors.Warning };
    } else {
      return { label: 'running', color: Colors.Success };
    }
  }, []);
  
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
        <Text bold>Threads</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text>{threads.length} thread{threads.length === 1 ? '' : 's'}</Text>
        </Box>
      </Box>
      
      {/* Threads list */}
      <Box 
        flexDirection="column"
        width="100%"
        height={height - 2}
        paddingX={1}
        overflow="hidden"
      >
        {threads.length > 0 ? (
          threads.map((thread, index) => {
            const isSelected = index === selectedIndex;
            const isExpanded = showDetails[thread.id];
            const status = getThreadStatus(thread);
            
            return (
              <Box key={thread.id} flexDirection="column">
                <Text
                  backgroundColor={isSelected ? Colors.BackgroundSelected : undefined}
                  color={isSelected ? Colors.ForegroundSelected : undefined}
                  bold={isSelected}
                >
                  {thread.stopped ? '■ ' : '▶ '}
                  {thread.name}
                  <Text color={status.color}> ({status.label})</Text>
                  {thread.stopped && thread.frames.length > 0 && (
                    <Text dimColor>
                      {' '}at {getFileName(thread.frames[0].path)}:{thread.frames[0].line}
                    </Text>
                  )}
                  {isExpanded ? ' [-]' : ' [+]'}
                </Text>
                
                {isExpanded && thread.frames.length > 0 && (
                  <Box flexDirection="column" paddingLeft={2} marginTop={1}>
                    <Text bold>Call Stack:</Text>
                    {thread.frames.slice(0, 5).map((frame, i) => (
                      <Text key={`frame-${i}`} color={Colors.TextDim}>
                        {i === 0 ? '→ ' : '  '}
                        {frame.name} at {getFileName(frame.path)}:{frame.line}
                      </Text>
                    ))}
                    {thread.frames.length > 5 && (
                      <Text color={Colors.TextDim}>
                        ... {thread.frames.length - 5} more frame(s)
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            );
          })
        ) : (
          <Text color={Colors.TextDim}>No threads available.</Text>
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
          <Text color={Colors.AccentBlue}> ↵</Text> Show details
        </Text>
        
        <Text color={Colors.TextDim}>↑/↓: Navigate</Text>
      </Box>
    </Box>
  );
};

export default ThreadsPanel;