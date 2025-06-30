/**
 * Text Buffer Component
 * 
 * Provides a text input buffer with advanced editing capabilities.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors';

/**
 * Viewport configuration
 */
interface Viewport {
  /**
   * Height of the viewport
   */
  height: number;
  
  /**
   * Width of the viewport
   */
  width: number;
}

/**
 * Text buffer options
 */
interface TextBufferOptions {
  /**
   * Initial text content
   */
  initialText: string;
  
  /**
   * Viewport dimensions
   */
  viewport: Viewport;
  
  /**
   * Standard input
   */
  stdin: NodeJS.ReadStream;
  
  /**
   * Function to set raw mode
   */
  setRawMode: (enabled: boolean) => void;
  
  /**
   * Function to validate file paths
   */
  isValidPath: (path: string) => boolean;
}

/**
 * Text buffer interface
 */
export interface TextBuffer {
  /**
   * Current text content
   */
  text: string;
  
  /**
   * Set text content
   */
  setText: (newText: string) => void;
  
  /**
   * React component to render the buffer
   */
  Component: React.FC;
}

/**
 * Create a text buffer with editing capabilities
 * 
 * @param options - Buffer configuration options
 * @returns Text buffer object
 */
export function useTextBuffer(options: TextBufferOptions): TextBuffer {
  const { initialText, viewport, isValidPath } = options;
  const [text, setText] = useState(initialText);
  const [cursorPos, setCursorPos] = useState(initialText.length);
  
  // Set text and move cursor to the end
  const setTextAndCursor = useCallback((newText: string) => {
    setText(newText);
    setCursorPos(newText.length);
  }, []);
  
  // Handle file path highlighting
  const renderText = useCallback((inputText: string) => {
    // Detect file paths and highlight them
    const parts: { text: string; isPath: boolean }[] = [];
    const words = inputText.split(/(\s+)/);
    
    words.forEach((word) => {
      // Check if word looks like a file path
      if (word.includes('/') || word.includes('\\')) {
        const isPath = isValidPath(word);
        parts.push({ text: word, isPath });
      } else {
        parts.push({ text: word, isPath: false });
      }
    });
    
    // Render with appropriate colors
    return parts.map((part, index) => (
      <Text
        key={index}
        color={part.isPath ? Colors.Success : undefined}
      >
        {part.text}
      </Text>
    ));
  }, [isValidPath]);
  
  // Render the text buffer with cursor
  const Component = useCallback(() => {
    // Determine visible portion based on viewport
    const displayText = text;
    const beforeCursor = displayText.slice(0, cursorPos);
    const atCursor = displayText.charAt(cursorPos) || ' ';
    const afterCursor = displayText.slice(cursorPos + 1);
    
    return (
      <Box>
        {renderText(beforeCursor)}
        <Text backgroundColor={Colors.Primary} color={Colors.Text}>
          {atCursor}
        </Text>
        {renderText(afterCursor)}
      </Box>
    );
  }, [text, cursorPos, renderText]);
  
  return {
    text,
    setText: setTextAndCursor,
    Component,
  };
}