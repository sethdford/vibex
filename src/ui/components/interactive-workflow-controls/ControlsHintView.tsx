/**
 * Controls Hint View - Clean Architecture like Gemini CLI
 * 
 * Display component for interactive controls hints
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

/**
 * Controls hint view props
 */
interface ControlsHintViewProps {
  contextualHelp: string;
}

/**
 * Controls hint view component
 */
export const ControlsHintView: React.FC<ControlsHintViewProps> = ({
  contextualHelp,
}) => {
  return (
    <Box marginTop={1}>
      <Text color={Colors.TextDim}>
        {contextualHelp}
      </Text>
    </Box>
  );
};

export default ControlsHintView; 