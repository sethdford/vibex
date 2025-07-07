/**
 * Watches Panel Component
 * 
 * Panel for managing watch expressions in the debug interface.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../../colors.js';
import { DebugVariableType } from '../types.js';

/**
 * Watches Panel Component
 */
export const WatchesPanel = ({
  watches,
  width,
  height,
  isFocused = false,
  onWatchAdd,
  onWatchRemove,
  onWatchUpdate,
  onWatchSelect,
  onFocusChange
}) => {
  // State for selected watch and editing
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAddingWatch, setIsAddingWatch] = useState(false);
  const [isEditingWatch, setIsEditingWatch] = useState(false);
  const [editExpression, setEditExpression] = useState('');
  
  // Make sure selected index is valid
  useEffect(() => {
    if (selectedIndex >= watches.length && watches.length > 0) {
      setSelectedIndex(watches.length - 1);
    }
  }, [watches, selectedIndex]);
  
  // Focus handler
  useEffect(() => {
    if (isFocused && onFocusChange) {
      onFocusChange(true);
    }
  }, [isFocused, onFocusChange]);
  
  // Get the selected watch
  const selectedWatch = watches[selectedIndex];
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle adding watch mode
    if (isAddingWatch) {
      if (key.return) {
        // Try to add the watch expression
        if (editExpression && onWatchAdd) {
          onWatchAdd(editExpression);
        }
        
        // Reset state
        setIsAddingWatch(false);
        setEditExpression('');
      } else if (key.escape) {
        setIsAddingWatch(false);
        setEditExpression('');
      } else if (key.backspace) {
        setEditExpression(prev => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input && input.length === 1) {
        setEditExpression(prev => prev + input);
      }
      return;
    }
    
    // Handle editing watch mode
    if (isEditingWatch) {
      if (key.return) {
        // Update the watch expression
        if (selectedWatch && onWatchUpdate) {
          onWatchUpdate(selectedWatch.id, { expression: editExpression });
        }
        
        // Reset state
        setIsEditingWatch(false);
        setEditExpression('');
      } else if (key.escape) {
        setIsEditingWatch(false);
        setEditExpression('');
      } else if (key.backspace) {
        setEditExpression(prev => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input && input.length === 1) {
        setEditExpression(prev => prev + input);
      }
      return;
    }
    
    // Navigation keys
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(watches.length - 1, prev + 1));
    }
    
    // Add new watch
    if (input === 'a') {
      setIsAddingWatch(true);
      setEditExpression('');
    }
    
    // Edit watch
    if (input === 'e' && selectedWatch) {
      setIsEditingWatch(true);
      setEditExpression(selectedWatch.expression);
    }
    
    // Toggle enabled state
    if (input === 't' && selectedWatch && onWatchUpdate) {
      onWatchUpdate(selectedWatch.id, { enabled: !selectedWatch.enabled });
    }
    
    // Delete watch
    if ((input === 'd' || key.delete) && selectedWatch && onWatchRemove) {
      onWatchRemove(selectedWatch.id);
    }
    
    // Refresh watch (re-evaluate)
    if (input === 'r' && selectedWatch && onWatchUpdate) {
      // This is a mock refresh - in a real implementation, it would re-evaluate the expression
      onWatchUpdate(selectedWatch.id, { timestamp: new Date() });
    }
    
    // Select watch
    if (key.return && selectedWatch && onWatchSelect) {
      onWatchSelect(selectedWatch);
    }
  }, { isActive: isFocused });
  
  // Get variable type display
  const getVariableTypeDisplay = useCallback((type) => {
    switch (type) {
      case DebugVariableType.STRING:
        return { label: 'string', color: Colors.AccentOrange };
      case DebugVariableType.NUMBER:
        return { label: 'number', color: Colors.AccentCyan };
      case DebugVariableType.BOOLEAN:
        return { label: 'boolean', color: Colors.AccentPurple };
      case DebugVariableType.OBJECT:
        return { label: 'object', color: Colors.AccentBlue };
      case DebugVariableType.ARRAY:
        return { label: 'array', color: Colors.AccentBlue };
      case DebugVariableType.NULL:
        return { label: 'null', color: Colors.AccentRed };
      case DebugVariableType.UNDEFINED:
        return { label: 'undefined', color: Colors.AccentRed };
      case DebugVariableType.FUNCTION:
        return { label: 'function', color: Colors.AccentGreen };
      case DebugVariableType.SYMBOL:
        return { label: 'symbol', color: Colors.AccentYellow };
      case DebugVariableType.BIGINT:
        return { label: 'bigint', color: Colors.AccentCyan };
      default:
        return { label: 'unknown', color: Colors.TextDim };
    }
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
        <Text bold>Watches</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text>{watches.length} watch{watches.length === 1 ? '' : 'es'}</Text>
        </Box>
      </Box>
      
      {/* Watches list or edit forms */}
      <Box 
        flexDirection="column"
        width="100%"
        height={height - 2}
        paddingX={1}
        overflow="hidden"
      >
        {isAddingWatch ? (
          <Box flexDirection="column">
            <Text bold color={Colors.AccentBlue}>Add Watch Expression</Text>
            <Box marginY={1}>
              <Text bold>Expression: </Text>
              <Text underline>{editExpression}</Text>
            </Box>
            <Text color={Colors.TextDim} marginTop={1}>
              Press Enter to add, Escape to cancel
            </Text>
          </Box>
        ) : isEditingWatch ? (
          <Box flexDirection="column">
            <Text bold color={Colors.AccentBlue}>Edit Watch Expression</Text>
            <Box marginY={1}>
              <Text bold>Expression: </Text>
              <Text underline>{editExpression}</Text>
            </Box>
            <Text color={Colors.TextDim} marginTop={1}>
              Press Enter to save, Escape to cancel
            </Text>
          </Box>
        ) : watches.length > 0 ? (
          watches.map((watch, index) => {
            const isSelected = index === selectedIndex;
            const typeDisplay = getVariableTypeDisplay(watch.type);
            
            return (
              <Box key={watch.id} flexDirection="column">
                <Text
                  backgroundColor={isSelected ? Colors.BackgroundSelected : undefined}
                  color={isSelected ? Colors.ForegroundSelected : undefined}
                  bold={isSelected}
                >
                  {watch.enabled ? '● ' : '○ '}
                  <Text>{watch.expression}</Text>
                </Text>
                
                <Box paddingLeft={2}>
                  {watch.error ? (
                    <Text color={Colors.Error}>{watch.error}</Text>
                  ) : (
                    <Text>
                      <Text color={typeDisplay.color}>{watch.value}</Text>
                      {watch.showType && (
                        <Text dimColor> {typeDisplay.label}</Text>
                      )}
                      <Text color={Colors.TextDim}>
                        {' '}(last updated: {watch.timestamp.toLocaleTimeString()})
                      </Text>
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })
        ) : (
          <Text color={Colors.TextDim}>No watch expressions. Press 'a' to add one.</Text>
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
          {!isAddingWatch && !isEditingWatch && (
            <Text>
              <Text color={Colors.AccentBlue}>A</Text>dd | 
              <Text color={Colors.AccentBlue}> E</Text>dit | 
              <Text color={Colors.AccentBlue}> D</Text>elete | 
              <Text color={Colors.AccentBlue}> T</Text>oggle | 
              <Text color={Colors.AccentBlue}> R</Text>efresh
            </Text>
          )}
        </Text>
        
        <Text color={Colors.TextDim}>↑/↓: Navigate</Text>
      </Box>
    </Box>
  );
};

export default WatchesPanel;