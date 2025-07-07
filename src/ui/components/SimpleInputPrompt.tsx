/**
 * Simple Input Prompt - Minimal terminal-like input
 * No over-engineering, just works like a basic terminal
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';

export interface SimpleInputPromptProps {
  onSubmit: (text: string) => void;
  onClear: () => void;
  isActive: boolean;
  prompt?: string;
  placeholder?: string;
}

export const SimpleInputPrompt: React.FC<SimpleInputPromptProps> = ({
  onSubmit,
  onClear,
  isActive,
  prompt = '> ',
  placeholder = 'Type your message...'
}) => {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleSubmit = useCallback(() => {
    if (input.trim()) {
      onSubmit(input.trim());
      setInput('');
      setCursorPosition(0);
    }
  }, [input, onSubmit]);

  const handleClear = useCallback(() => {
    setInput('');
    setCursorPosition(0);
    onClear();
  }, [onClear]);

  useInput(useCallback((inputChar, key) => {
    if (!isActive) return;

    if (key.return) {
      handleSubmit();
      return;
    }

    if (key.ctrl && inputChar === 'l') {
      handleClear();
      return;
    }

    if (key.ctrl && inputChar === 'a') {
      setCursorPosition(0);
      return;
    }

    if (key.ctrl && inputChar === 'e') {
      setCursorPosition(input.length);
      return;
    }

    if (key.leftArrow) {
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPosition(Math.min(input.length, cursorPosition + 1));
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
        setInput(newInput);
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }

    // Regular character input
    if (inputChar && !key.ctrl && !key.meta) {
      const newInput = input.slice(0, cursorPosition) + inputChar + input.slice(cursorPosition);
      setInput(newInput);
      setCursorPosition(cursorPosition + 1);
    }
  }, [isActive, input, cursorPosition, handleSubmit, handleClear]));

  // Create display text with cursor
  const displayText = input || placeholder;
  const showPlaceholder = input.length === 0;
  
  // Add cursor visualization
  let displayWithCursor = '';
  if (showPlaceholder) {
    displayWithCursor = placeholder;
  } else {
    for (let i = 0; i < displayText.length; i++) {
      if (i === cursorPosition) {
        displayWithCursor += `[${displayText[i] || ' '}]`;
      } else {
        displayWithCursor += displayText[i];
      }
    }
    // Cursor at end
    if (cursorPosition >= displayText.length) {
      displayWithCursor += '[█]';
    }
  }

  return (
    <Box borderStyle="round" borderColor={Colors.AccentBlue} paddingX={1}>
      <Text color={Colors.AccentPurple}>{prompt}</Text>
      <Text color={showPlaceholder ? Colors.TextDim : Colors.Text}>
        {displayWithCursor}
      </Text>
    </Box>
  );
}; 