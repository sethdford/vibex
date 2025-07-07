/**
 * Search Box Component
 * 
 * Provides search input for filtering tools in the Tool Group Display.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../../colors.js';
import { SearchBoxProps } from './types.js';

/**
 * Search Box component
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  width,
  initialQuery = '',
  onSearch,
  isFocused = true,
  onFocusChange
}) => {
  // State for search query
  const [query, setQuery] = useState(initialQuery);
  // State for focus
  const [focused, setFocused] = useState(isFocused);
  // State for cursor position
  const [cursorPos, setCursorPos] = useState(initialQuery.length);
  
  // Handle input
  useInput((input, key) => {
    if (!focused) return;
    
    if (key.return) {
      // Submit search
      onSearch(query);
      return;
    }
    
    if (key.escape) {
      // Blur and reset
      setFocused(false);
      if (onFocusChange) onFocusChange(false);
      return;
    }
    
    if (key.backspace || key.delete) {
      // Handle backspace/delete
      if (cursorPos > 0) {
        const newQuery = query.slice(0, cursorPos - 1) + query.slice(cursorPos);
        setQuery(newQuery);
        setCursorPos(Math.max(0, cursorPos - 1));
        onSearch(newQuery);
      }
      return;
    }
    
    if (key.leftArrow) {
      // Move cursor left
      setCursorPos(Math.max(0, cursorPos - 1));
      return;
    }
    
    if (key.rightArrow) {
      // Move cursor right
      setCursorPos(Math.min(query.length, cursorPos + 1));
      return;
    }
    
    if (key.upArrow || key.downArrow || key.tab || key.ctrl || key.shift || key.meta) {
      // Ignore navigation keys
      return;
    }
    
    // Add character at cursor position
    const newQuery = query.slice(0, cursorPos) + input + query.slice(cursorPos);
    setQuery(newQuery);
    setCursorPos(cursorPos + input.length);
    onSearch(newQuery);
  }, { isActive: focused });
  
  // Handle focus change from props
  useEffect(() => {
    if (focused !== isFocused) {
      setFocused(isFocused);
    }
  }, [isFocused]);
  
  // Handle focus click
  const handleFocusClick = useCallback(() => {
    setFocused(true);
    if (onFocusChange) onFocusChange(true);
  }, [onFocusChange]);
  
  // Get display text with cursor
  const getDisplayText = () => {
    if (focused) {
      return (
        <>
          {query.slice(0, cursorPos)}
          <Text backgroundColor={Colors.Primary}>
            {cursorPos === query.length ? ' ' : query[cursorPos]}
          </Text>
          {query.slice(cursorPos + 1)}
        </>
      );
    }
    
    return query || <Text color={Colors.TextDim}>Search tools...</Text>;
  };
  
  return (
    <Box
      width={width}
      borderStyle="single"
      borderColor={focused ? Colors.Primary : Colors.Border}
      paddingX={1}
      onClick={handleFocusClick}
    >
      <Box marginRight={1}>
        <Text color={Colors.Primary}>🔍</Text>
      </Box>
      <Text>{getDisplayText()}</Text>
    </Box>
  );
};

export default SearchBox;