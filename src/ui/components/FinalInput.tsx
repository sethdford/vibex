/**
 * Final Input Component - Bulletproof against duplication
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';

interface FinalInputProps {
  onSubmit: (text: string) => void;
  maxWidth?: number;
}

// Global state to prevent multiple instances
let globalInputState = {
  isActive: false,
  instanceId: 0
};

export const FinalInput: React.FC<FinalInputProps> = ({ onSubmit, maxWidth }) => {
  const [input, setInput] = useState('');
  const instanceId = useRef(++globalInputState.instanceId);
  const [isThisInstanceActive, setIsThisInstanceActive] = useState(false);

  // Calculate responsive width
  const terminalWidth = process.stdout.columns || 80;
  const calculatedMaxWidth = maxWidth || Math.min(70, Math.floor(terminalWidth * 0.85));

  // Only the first instance becomes active
  useEffect(() => {
    if (!globalInputState.isActive) {
      globalInputState.isActive = true;
      setIsThisInstanceActive(true);
      
      // Cleanup when component unmounts
      return () => {
        globalInputState.isActive = false;
      };
    }
  }, []);

  useInput(useCallback((inputChar, key) => {
    // Only process input if this is the active instance
    if (!isThisInstanceActive) return;

    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    if (inputChar && !key.ctrl && !key.meta) {
      setInput(prev => prev + inputChar);
    }
  }, [input, onSubmit, isThisInstanceActive]));

  // Only render if this is the active instance
  if (!isThisInstanceActive) {
    return null;
  }

  // Truncate display text if too long
  const displayText = input || 'Type your message...';
  const maxDisplayLength = calculatedMaxWidth - 10; // Account for prompt and cursor
  const truncatedText = displayText.length > maxDisplayLength 
    ? '...' + displayText.slice(-(maxDisplayLength - 3))
    : displayText;

  return (
    <Box 
      borderStyle="round" 
      borderColor={Colors.AccentBlue} 
      paddingX={1}
      width={calculatedMaxWidth}
    >
      <Text color={Colors.AccentPurple}>{'> '}</Text>
      <Text color={Colors.Text}>
        {truncatedText}{input.length > 0 ? '[█]' : ''}
      </Text>
    </Box>
  );
}; 