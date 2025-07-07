/**
 * Ultra Minimal Input - Single instance only
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';

interface UltraMinimalInputProps {
  onSubmit: (text: string) => void;
}

// Global singleton to prevent multiple instances
let globalInputInstance: React.ComponentType<UltraMinimalInputProps> | null = null;

export const UltraMinimalInput: React.FC<UltraMinimalInputProps> = ({ onSubmit }) => {
  const [input, setInput] = useState('');

  useInput(useCallback((inputChar, key) => {
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
  }, [input, onSubmit]));

  return (
    <Box borderStyle="round" borderColor={Colors.AccentBlue} paddingX={1}>
      <Text color={Colors.AccentPurple}>{'> '}</Text>
      <Text color={Colors.Text}>
        {input || 'Type your message...'}{input.length > 0 ? '[█]' : ''}
      </Text>
    </Box>
  );
};

// Singleton wrapper
export const SingletonInput: React.FC<UltraMinimalInputProps> = (props) => {
  if (!globalInputInstance) {
    globalInputInstance = UltraMinimalInput;
  }
  const Component = globalInputInstance;
  return <Component {...props} />;
}; 