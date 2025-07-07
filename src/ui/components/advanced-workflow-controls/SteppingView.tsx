/**
 * Stepping View Component - Clean Architecture like Gemini CLI
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

interface SteppingViewProps {
  workflow: any;
  isStepMode: boolean;
  currentStepIndex: number;
  executionSteps: any[];
  onExecuteNextStep: () => void;
  onToggleStepMode: () => void;
  config: any;
}

export const SteppingView: React.FC<SteppingViewProps> = ({
  isStepMode,
  currentStepIndex,
  executionSteps,
}) => {
  return (
    <Box flexDirection="column">
      <Text color={Colors.Primary} bold>👣 Step Debugging</Text>
      <Text color={isStepMode ? Colors.Success : Colors.TextDim}>
        {isStepMode ? 'ENABLED' : 'DISABLED'}
      </Text>
      <Text color={Colors.Text}>
        Current Step: {currentStepIndex + 1}
      </Text>
      <Text color={Colors.TextDim}>
        Steps Executed: {executionSteps.length}
      </Text>
    </Box>
  );
}; 