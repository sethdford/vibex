/**
 * Text Buffer Component
 * 
 * Provides a text input buffer with advanced editing capabilities.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';

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
  
  /**
   * Callback when text changes
   */
  onChange?: (text: string) => void;
  
  /**
   * Callback when Enter is pressed
   */
  onSubmit?: (text: string) => void;
  
  /**
   * Callback for special key handling
   */
  onSpecialKey?: (key: string, keyObj: any) => boolean;
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
   * Current lines array
   */
  lines: string[];
  
  /**
   * Current cursor position [row, col]
   */
  cursor: [number, number];
  
  /**
   * Set text content
   */
  setText: (newText: string) => void;
  
  /**
   * Insert text at cursor
   */
  insert: (text: string) => void;
  
  /**
   * Create new line
   */
  newline: () => void;
  
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
  const { initialText, viewport, isValidPath, onChange, onSubmit, onSpecialKey } = options;
  const [text, setText] = useState(initialText);
  const [cursorPos, setCursorPos] = useState(initialText.length);
  
  // Derive lines and cursor from text state
  const lines = text.split('\n');
  const cursor: [number, number] = (() => {
    let pos = 0;
    for (let row = 0; row < lines.length; row++) {
      if (pos + lines[row].length >= cursorPos) {
        return [row, cursorPos - pos];
      }
      pos += lines[row].length + 1; // +1 for newline
    }
    return [lines.length - 1, lines[lines.length - 1]?.length || 0];
  })();
  
  // Set text and move cursor to the end
  const setTextAndCursor = useCallback((newText: string) => {
    setText(newText);
    setCursorPos(newText.length);
    onChange?.(newText);
  }, [onChange]);
  
  // Handle input directly in the text buffer with ENHANCED NAVIGATION
  const handleInput = useCallback((input: string, key: { ctrl?: boolean; shift?: boolean; meta?: boolean; [keyName: string]: boolean | undefined }) => {
    // Handle special keys first
    if (key.return) {
      onSubmit?.(text);
      return;
    }
    
    // Allow custom handling of special keys
    if (onSpecialKey) {
      const handled = onSpecialKey(input, key);
      if (handled) return;
    }
    
    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        const newText = text.slice(0, cursorPos - 1) + text.slice(cursorPos);
        setText(newText);
        setCursorPos(cursorPos - 1);
        onChange?.(newText);
      }
    } else if (key.leftArrow) {
      if (key.ctrl) {
        // Ctrl+Left: Word left navigation
        const beforeCursor = text.slice(0, cursorPos);
        const wordBoundary = beforeCursor.search(/\s\S*$/);
        setCursorPos(wordBoundary > -1 ? wordBoundary + 1 : 0);
      } else {
        setCursorPos(Math.max(0, cursorPos - 1));
      }
    } else if (key.rightArrow) {
      if (key.ctrl) {
        // Ctrl+Right: Word right navigation
        const afterCursor = text.slice(cursorPos);
        const wordBoundary = afterCursor.search(/\s/);
        if (wordBoundary > -1) {
          const nextWordStart = afterCursor.slice(wordBoundary).search(/\S/);
          setCursorPos(cursorPos + wordBoundary + (nextWordStart > -1 ? nextWordStart : 0));
        } else {
          setCursorPos(text.length);
        }
      } else {
        setCursorPos(Math.min(text.length, cursorPos + 1));
      }
    } else if (key.home || (key.ctrl && input === 'a')) {
      setCursorPos(0);
    } else if (key.end || (key.ctrl && input === 'e')) {
      setCursorPos(text.length);
    } else if (key.ctrl && input === 'w') {
      // Ctrl+W: Delete word left (like bash)
      const beforeCursor = text.slice(0, cursorPos);
      const wordBoundary = beforeCursor.search(/\s\S*$/);
      const deleteFrom = wordBoundary > -1 ? wordBoundary + 1 : 0;
      const newText = text.slice(0, deleteFrom) + text.slice(cursorPos);
      setText(newText);
      setCursorPos(deleteFrom);
      onChange?.(newText);
    } else if (key.ctrl && input === 'u') {
      // Ctrl+U: Delete from cursor to beginning of line (like bash)
      const newText = text.slice(cursorPos);
      setText(newText);
      setCursorPos(0);
      onChange?.(newText);
    } else if (key.ctrl && input === 'k') {
      // Ctrl+K: Delete from cursor to end of line (like bash)
      const newText = text.slice(0, cursorPos);
      setText(newText);
      onChange?.(newText);
    } else if (input && !key.ctrl && !key.meta && input.length === 1) {
      // Regular character input
      const newText = text.slice(0, cursorPos) + input + text.slice(cursorPos);
      setText(newText);
      setCursorPos(cursorPos + 1);
      onChange?.(newText);
    }
  }, [text, cursorPos, onChange, onSubmit, onSpecialKey]);
  
  // Handle file path highlighting
  const renderText = useCallback((inputText: string) => {
    // Detect file paths and highlight them
    const parts: Array<{ text: string; isPath: boolean }> = [];
    const words = inputText.split(/(\s+)/);
    
    words.forEach(word => {
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
    // Use the input hook inside the component
    useInput(handleInput, { isActive: true });
    
    // Determine visible portion based on viewport
    const displayText = text;
    const beforeCursor = displayText.slice(0, cursorPos);
    const atCursor = displayText.charAt(cursorPos) || ' ';
    const afterCursor = displayText.slice(cursorPos + 1);
    
    return (
      <Box>
        {renderText(beforeCursor)}
        <Text backgroundColor={Colors.Primary} color={Colors.Background}>
          {atCursor}
        </Text>
        {renderText(afterCursor)}
      </Box>
    );
  }, [text, cursorPos, renderText, handleInput]);
  
  // Enhanced insert function
  const insert = useCallback((insertText: string) => {
    const newText = text.slice(0, cursorPos) + insertText + text.slice(cursorPos);
    setText(newText);
    setCursorPos(cursorPos + insertText.length);
    onChange?.(newText);
  }, [text, cursorPos, onChange]);
  
  // Enhanced newline function
  const newline = useCallback(() => {
    const newText = text.slice(0, cursorPos) + '\n' + text.slice(cursorPos);
    setText(newText);
    setCursorPos(cursorPos + 1);
    onChange?.(newText);
  }, [text, cursorPos, onChange]);

  return {
    text,
    lines,
    cursor,
    setText: setTextAndCursor,
    insert,
    newline,
    Component,
  };
}