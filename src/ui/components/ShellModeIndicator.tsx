/**
 * Shell Mode Indicator
 * 
 * Displays an indicator when shell mode is active, with instructions on how to exit
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

interface ShellModeIndicatorProps {
  /**
   * Whether shell mode is active
   */
  active: boolean;

  /**
   * Custom key to exit shell mode
   */
  exitKey?: string;
}

/**
 * Displays an indicator when shell mode is active
 */
export const ShellModeIndicator: React.FC<ShellModeIndicatorProps> = ({ 
  active,
  exitKey = 'esc'
}) => {
  if (!active) {
    return null;
  }

  return (
    <Box>
      <Text color={Colors.Warning} bold>
        shell mode enabled
        <Text color={Colors.TextDim}> ({exitKey} to disable)</Text>
      </Text>
    </Box>
  );
};

export default ShellModeIndicator;