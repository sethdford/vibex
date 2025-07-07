/**
 * Variables Panel Component
 * 
 * Panel for displaying and editing variables in the debug state.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../../colors.js';
import { DebugVariableType } from '../types.js';

/**
 * Variables Panel Component
 */
export const VariablesPanel = ({
  variables,
  width,
  height,
  isFocused = false,
  onVariableEdit,
  onVariableToggle,
  onVariableSelect,
  onFocusChange
}) => {
  // State for selected variable and editing
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  
  // Filter variables based on search text
  const filteredVariables = searchText
    ? variables.filter(v => v.name.toLowerCase().includes(searchText.toLowerCase()))
    : variables;
  
  // Make sure selected index is valid
  useEffect(() => {
    if (selectedIndex >= filteredVariables.length && filteredVariables.length > 0) {
      setSelectedIndex(filteredVariables.length - 1);
    }
  }, [filteredVariables, selectedIndex]);
  
  // Focus handler
  useEffect(() => {
    if (isFocused && onFocusChange) {
      onFocusChange(true);
    }
  }, [isFocused, onFocusChange]);
  
  // Get the selected variable
  const selectedVariable = filteredVariables[selectedIndex];
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle search mode
    if (searchActive) {
      if (key.return) {
        setSearchActive(false);
      } else if (key.escape) {
        setSearchActive(false);
        setSearchText('');
      } else if (key.backspace) {
        setSearchText(prev => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && !key.shift && input && input.length === 1) {
        setSearchText(prev => prev + input);
      }
      return;
    }
    
    // Handle edit mode
    if (isEditing) {
      if (key.return) {
        setIsEditing(false);
        // Try to parse the value based on variable type
        if (selectedVariable && onVariableEdit) {
          let parsedValue = editValue;
          
          try {
            if (selectedVariable.type === DebugVariableType.NUMBER) {
              parsedValue = parseFloat(editValue);
              if (isNaN(parsedValue)) parsedValue = 0;
            } else if (selectedVariable.type === DebugVariableType.BOOLEAN) {
              parsedValue = editValue.toLowerCase() === 'true';
            }
          } catch (e) {
            // If parsing fails, use the original string
            console.error('Failed to parse value:', e);
          }
          
          onVariableEdit(selectedVariable, parsedValue);
        }
      } else if (key.escape) {
        setIsEditing(false);
      } else if (key.backspace) {
        setEditValue(prev => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input && input.length === 1) {
        setEditValue(prev => prev + input);
      }
      return;
    }
    
    // Navigation keys
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredVariables.length - 1, prev + 1));
    } 
    
    // Expand/collapse variables
    if (key.return || input === ' ') {
      if (selectedVariable && !selectedVariable.isPrimitive && onVariableToggle) {
        onVariableToggle(selectedVariable);
      }
    }
    
    // Enter edit mode
    if (input === 'e') {
      if (selectedVariable && selectedVariable.isPrimitive && selectedVariable.editable) {
        setIsEditing(true);
        setEditValue(String(selectedVariable.rawValue));
      }
    }
    
    // Search mode
    if (input === '/') {
      setSearchActive(true);
      setSearchText('');
    }
    
    // Select variable
    if (onVariableSelect && selectedVariable) {
      onVariableSelect(selectedVariable);
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
  
  // Render a variable in the list
  const renderVariable = useCallback((variable, index, depth = 0) => {
    const isSelected = index === selectedIndex;
    const typeDisplay = getVariableTypeDisplay(variable.type);
    const indent = ' '.repeat(depth * 2);
    
    // Render the variable row
    const variableRow = (
      <Box key={variable.path}>
        <Text
          backgroundColor={isSelected ? Colors.BackgroundSelected : undefined}
          color={isSelected ? Colors.ForegroundSelected : undefined}
          bold={isSelected}
        >
          {indent}
          {variable.isPrimitive ? '  ' : variable.expanded ? '▼ ' : '▶ '}
          <Text bold>{variable.name}</Text>
          {': '}
          <Text color={typeDisplay.color}>
            {isEditing && isSelected ? editValue : variable.value}
          </Text>
          <Text dimColor> {typeDisplay.label}</Text>
        </Text>
      </Box>
    );
    
    // If expanded and has children, render the children too
    if (variable.expanded && variable.children) {
      return [
        variableRow,
        ...variable.children.map((child, childIndex) => 
          renderVariable(child, index + childIndex + 1, depth + 1)
        )
      ];
    }
    
    return variableRow;
  }, [selectedIndex, isEditing, editValue, getVariableTypeDisplay]);
  
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
        <Text bold>Variables</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text>
            {searchActive ? (
              <Text bold>Search: <Text underline>{searchText}</Text></Text>
            ) : (
              `${filteredVariables.length} variable${filteredVariables.length === 1 ? '' : 's'}`
            )}
          </Text>
        </Box>
      </Box>
      
      {/* Variable list */}
      <Box 
        flexDirection="column"
        width="100%"
        height={height - 2}
        paddingX={1}
        overflow="hidden"
      >
        {filteredVariables.length > 0 ? (
          filteredVariables.map((variable, index) => renderVariable(variable, index))
        ) : (
          <Text color={Colors.TextDim}>No variables to display.</Text>
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
          {isEditing ? (
            <Text color={Colors.AccentGreen}>Editing: Enter to save, Esc to cancel</Text>
          ) : (
            searchActive ? (
              <Text color={Colors.AccentBlue}>Search: Enter to accept, Esc to cancel</Text>
            ) : (
              <Text>
                <Text color={Colors.AccentBlue}>E</Text>dit | 
                <Text color={Colors.AccentBlue}> ↵</Text> Toggle | 
                <Text color={Colors.AccentBlue}> /</Text> Search
              </Text>
            )
          )}
        </Text>
        
        <Text color={Colors.TextDim}>↑/↓: Navigate</Text>
      </Box>
    </Box>
  );
};

export default VariablesPanel;