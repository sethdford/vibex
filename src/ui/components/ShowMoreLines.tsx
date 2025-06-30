/**
 * Show More Lines Component
 * 
 * Displays an indicator when content is truncated due to height constraints.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';
import { useOverflow } from '../contexts/OverflowContext';

/**
 * Show more lines component props
 */
interface ShowMoreLinesProps {
  /**
   * Whether height is constrained
   */
  constrainHeight: boolean;
}

/**
 * Show more lines component
 * 
 * Displays a message when content is truncated due to terminal height constraints
 */
export const ShowMoreLines: React.FC<ShowMoreLinesProps> = ({ constrainHeight }) => {
  const { hasOverflow, hiddenLineCount } = useOverflow();
  
  // Don't show if no overflow, not constraining height, or no hidden lines
  if (!hasOverflow || !constrainHeight || hiddenLineCount <= 0) {
    return null;
  }
  
  return (
    <Box marginTop={1}>
      <Text color={Colors.TextDim}>
        {hiddenLineCount} more line{hiddenLineCount !== 1 ? 's' : ''} hidden. 
        Press <Text bold>Ctrl+S</Text> to show all.
      </Text>
    </Box>
  );
};