/**
 * Console Summary Display
 * 
 * Displays a summary of console messages, such as errors and warnings.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

interface ConsoleSummaryDisplayProps {
  errorCount: number;
  warningCount?: number;
  onShowDetails?: () => void;
}

/**
 * Displays a summary of console messages, such as errors and warnings.
 */
export const ConsoleSummaryDisplay: React.FC<ConsoleSummaryDisplayProps> = ({
  errorCount,
  warningCount = 0,
  onShowDetails,
}) => {
  // Don't render if there's nothing to show
  if (errorCount === 0 && warningCount === 0) {
    return null;
  }

  // Icons
  const errorIcon = '✖'; // Heavy multiplication x
  const warningIcon = '⚠️'; // Warning sign

  // Keyboard shortcut hint
  const keyboardHint = onShowDetails 
    ? <Text color={Colors.Gray600}>(ctrl+o for details)</Text>
    : null;

  return (
    <Box flexDirection="column">
      {errorCount > 0 && (
        <Box>
          <Text color={Colors.AccentRed}>
            {errorIcon} {errorCount} error{errorCount > 1 ? 's' : ''} {keyboardHint}
          </Text>
        </Box>
      )}
      
      {warningCount > 0 && (
        <Box>
          <Text color={Colors.AccentYellow}>
            {warningIcon} {warningCount} warning{warningCount > 1 ? 's' : ''} {keyboardHint}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ConsoleSummaryDisplay;