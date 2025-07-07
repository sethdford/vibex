/**
 * Controls Hint View Component - Clean Architecture
 * 
 * Single Responsibility: Keyboard controls hint display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

/**
 * Controls hint view props
 */
export interface ControlsHintViewProps {
  isFocused: boolean;
  helpText?: string;
}

/**
 * Controls hint view component
 */
export const ControlsHintView: React.FC<ControlsHintViewProps> = ({
  isFocused,
  helpText = 'Real-Time Controls: M: Metrics • A: Auto-Execute • X: Execute • H: History • Ctrl+R: Refresh',
}) => {
  if (!isFocused) return null;

  return (
    <Box marginTop={1}>
      <Text color={Colors.TextDim}>
        {helpText}
      </Text>
    </Box>
  );
}; 