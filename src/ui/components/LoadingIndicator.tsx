/**
 * Loading Indicator Component
 * 
 * Displays a loading spinner and status information while Claude is processing.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../colors';
import { StreamingState } from '../types';

/**
 * Loading indicator props
 */
interface LoadingIndicatorProps {
  /**
   * Current thought/reasoning from the model
   */
  thought?: string;
  
  /**
   * Current loading phrase to display
   */
  currentLoadingPhrase?: string;
  
  /**
   * Elapsed time in milliseconds
   */
  elapsedTime: number;
}

/**
 * Format milliseconds as a readable time string
 * 
 * @param ms - Milliseconds to format
 * @returns Formatted time string
 */
const formatElapsedTime = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  const remainingMs = ms % 1000;
  
  if (seconds < 60) {
    return `${seconds}.${Math.floor(remainingMs / 100)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Loading indicator component
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  thought,
  currentLoadingPhrase,
  elapsedTime,
}) => {
  // Don't render if no thought or loading phrase and no significant elapsed time
  if (!thought && !currentLoadingPhrase && elapsedTime < 500) {
    return null;
  }
  
  return (
    <Box flexDirection="column" marginY={1}>
      {(thought || currentLoadingPhrase) && (
        <Box>
          <Box marginRight={1}>
            <Text color={Colors.Primary}>
              <Spinner type="dots" />
            </Text>
          </Box>
          
          <Box flexDirection="column" flexGrow={1}>
            {currentLoadingPhrase && (
              <Text color={Colors.TextMuted}>
                {currentLoadingPhrase}
              </Text>
            )}
            
            {thought && (
              <Text color={Colors.TextDim}>
                {thought}
              </Text>
            )}
          </Box>
          
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              {formatElapsedTime(elapsedTime)}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};