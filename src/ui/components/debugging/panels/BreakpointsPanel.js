/**
 * Breakpoints Panel Component
 * 
 * Panel for managing breakpoints in the debug interface.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../../colors.js';

/**
 * Breakpoints Panel Component
 */
export const BreakpointsPanel = ({
  breakpoints,
  width,
  height,
  isFocused = false,
  onBreakpointAdd,
  onBreakpointRemove,
  onBreakpointUpdate,
  onBreakpointSelect,
  onFocusChange
}) => {
  // State for selected breakpoint and editing
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAddingBreakpoint, setIsAddingBreakpoint] = useState(false);
  const [isEditingCondition, setIsEditingCondition] = useState(false);
  const [newBreakpointPath, setNewBreakpointPath] = useState('');
  const [newBreakpointLine, setNewBreakpointLine] = useState('');
  const [editCondition, setEditCondition] = useState('');
  
  // Make sure selected index is valid
  useEffect(() => {
    if (selectedIndex >= breakpoints.length && breakpoints.length > 0) {
      setSelectedIndex(breakpoints.length - 1);
    }
  }, [breakpoints, selectedIndex]);
  
  // Focus handler
  useEffect(() => {
    if (isFocused && onFocusChange) {
      onFocusChange(true);
    }
  }, [isFocused, onFocusChange]);
  
  // Get the selected breakpoint
  const selectedBreakpoint = breakpoints[selectedIndex];
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle adding breakpoint mode
    if (isAddingBreakpoint) {
      if (key.return) {
        // Try to add the breakpoint
        if (newBreakpointPath && newBreakpointLine && onBreakpointAdd) {
          const line = parseInt(newBreakpointLine, 10);
          if (!isNaN(line)) {
            onBreakpointAdd(newBreakpointPath, line);
          }
        }
        
        // Reset state
        setIsAddingBreakpoint(false);
        setNewBreakpointPath('');
        setNewBreakpointLine('');
      } else if (key.escape) {
        setIsAddingBreakpoint(false);
        setNewBreakpointPath('');
        setNewBreakpointLine('');
      } else if (key.backspace) {
        if (newBreakpointLine) {
          setNewBreakpointLine(prev => prev.slice(0, -1));
        } else if (newBreakpointPath) {
          setNewBreakpointPath(prev => prev.slice(0, -1));
        }
      } else if (key.tab) {
        if (!newBreakpointLine) {
          // Move focus to line input
          setNewBreakpointLine('');
        }
      } else if (!key.ctrl && !key.meta && input && input.length === 1) {
        // Add to path or line depending on current focus
        if (newBreakpointLine !== undefined) {
          // Only allow numbers for line
          if (/^\d$/.test(input)) {
            setNewBreakpointLine(prev => prev + input);
          }
        } else {
          setNewBreakpointPath(prev => prev + input);
        }
      }
      return;
    }
    
    // Handle editing condition mode
    if (isEditingCondition) {
      if (key.return) {
        // Update the breakpoint condition
        if (selectedBreakpoint && onBreakpointUpdate) {
          onBreakpointUpdate(selectedBreakpoint.id, { 
            condition: editCondition || null 
          });
        }
        
        // Reset state
        setIsEditingCondition(false);
        setEditCondition('');
      } else if (key.escape) {
        setIsEditingCondition(false);
        setEditCondition('');
      } else if (key.backspace) {
        setEditCondition(prev => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input && input.length === 1) {
        setEditCondition(prev => prev + input);
      }
      return;
    }
    
    // Navigation keys
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(breakpoints.length - 1, prev + 1));
    }
    
    // Toggle breakpoint enabled state
    if (input === 'e' && selectedBreakpoint && onBreakpointUpdate) {
      onBreakpointUpdate(selectedBreakpoint.id, { 
        enabled: !selectedBreakpoint.enabled 
      });
    }
    
    // Edit breakpoint condition
    if (input === 'c' && selectedBreakpoint) {
      setIsEditingCondition(true);
      setEditCondition(selectedBreakpoint.condition || '');
    }
    
    // Add new breakpoint
    if (input === 'a') {
      setIsAddingBreakpoint(true);
      setNewBreakpointPath('');
      setNewBreakpointLine('');
    }
    
    // Delete breakpoint
    if ((input === 'd' || key.delete) && selectedBreakpoint && onBreakpointRemove) {
      onBreakpointRemove(selectedBreakpoint.id);
    }
    
    // Select breakpoint
    if ((key.return || input === 's') && selectedBreakpoint && onBreakpointSelect) {
      onBreakpointSelect(selectedBreakpoint);
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
        <Text bold>Breakpoints</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text>{breakpoints.length} breakpoint{breakpoints.length === 1 ? '' : 's'}</Text>
        </Box>
      </Box>
      
      {/* Breakpoints list or edit forms */}
      <Box 
        flexDirection="column"
        width="100%"
        height={height - 2}
        paddingX={1}
        overflow="hidden"
      >
        {isAddingBreakpoint ? (
          <Box flexDirection="column">
            <Text bold color={Colors.AccentBlue}>Add Breakpoint</Text>
            <Box marginY={1}>
              <Text bold>Path: </Text>
              <Text underline>{newBreakpointPath}</Text>
            </Box>
            <Box>
              <Text bold>Line: </Text>
              <Text underline>{newBreakpointLine}</Text>
            </Box>
            <Text color={Colors.TextDim} marginTop={1}>
              Press Enter to add, Escape to cancel
            </Text>
          </Box>
        ) : isEditingCondition ? (
          <Box flexDirection="column">
            <Text bold color={Colors.AccentBlue}>Edit Condition</Text>
            <Box marginY={1}>
              <Text bold>Breakpoint: </Text>
              <Text>
                {selectedBreakpoint ? `${getFileName(selectedBreakpoint.path)}:${selectedBreakpoint.line}` : ''}
              </Text>
            </Box>
            <Box>
              <Text bold>Condition: </Text>
              <Text underline>{editCondition}</Text>
            </Box>
            <Text color={Colors.TextDim} marginTop={1}>
              Press Enter to save, Escape to cancel
            </Text>
          </Box>
        ) : breakpoints.length > 0 ? (
          breakpoints.map((breakpoint, index) => {
            const isSelected = index === selectedIndex;
            
            return (
              <Box key={breakpoint.id}>
                <Text
                  backgroundColor={isSelected ? Colors.BackgroundSelected : undefined}
                  color={isSelected ? Colors.ForegroundSelected : undefined}
                  bold={isSelected}
                >
                  {breakpoint.enabled ? '● ' : '○ '}
                  {getFileName(breakpoint.path)}:{breakpoint.line}
                  {breakpoint.condition && (
                    <Text dimColor={isSelected}>
                      {' '}[when {breakpoint.condition}]
                    </Text>
                  )}
                  {breakpoint.hitCount > 0 && (
                    <Text color={Colors.AccentOrange}>
                      {' '}(hit {breakpoint.hitCount} time{breakpoint.hitCount === 1 ? '' : 's'})
                    </Text>
                  )}
                </Text>
              </Box>
            );
          })
        ) : (
          <Text color={Colors.TextDim}>No breakpoints set. Press 'a' to add one.</Text>
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
          {!isAddingBreakpoint && !isEditingCondition && (
            <Text>
              <Text color={Colors.AccentBlue}>A</Text>dd | 
              <Text color={Colors.AccentBlue}> D</Text>elete | 
              <Text color={Colors.AccentBlue}> E</Text>nable/Disable | 
              <Text color={Colors.AccentBlue}> C</Text>ondition
            </Text>
          )}
        </Text>
        
        <Text color={Colors.TextDim}>↑/↓: Navigate</Text>
      </Box>
    </Box>
  );
};

export default BreakpointsPanel;