/**
 * Progress Indicator Component
 * 
 * Visual indicator for operation progress with percentage and optional message.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Progress indicator props
 */
export interface ProgressIndicatorProps {
  /**
   * Progress percentage (0-100)
   */
  percent: number;
  
  /**
   * Bar width in characters
   */
  width?: number;
  
  /**
   * Optional progress message
   */
  message?: string;
  
  /**
   * Bar color when in progress
   */
  color?: string;
  
  /**
   * Bar color when complete
   */
  completeColor?: string;
}

/**
 * Progress indicator component
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  percent,
  width = 40,
  message,
  color = Colors.Info,
  completeColor = Colors.Success,
}) => {
  // Normalize percent
  const normalizedPercent = Math.max(0, Math.min(100, percent));
  
  // Calculate filled and empty segments
  const filledWidth = Math.floor((normalizedPercent / 100) * width);
  const emptyWidth = width - filledWidth;
  
  // Determine bar color
  const barColor = normalizedPercent === 100 ? completeColor : color;
  
  return (
    <Box flexDirection="column">
      <Box>
        {/* Progress bar */}
        <Box>
          <Text color={barColor}>{'[' + '='.repeat(filledWidth)}</Text>
          <Text color={Colors.TextDim}>{' '.repeat(emptyWidth) + ']'}</Text>
        </Box>
        
        {/* Percentage */}
        <Box marginLeft={1}>
          <Text color={barColor}>
            {normalizedPercent.toFixed(0)}%
          </Text>
        </Box>
      </Box>
      
      {/* Progress message */}
      {message && (
        <Box marginTop={0}>
          <Text color={Colors.TextDim}>
            {message}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ProgressIndicator;