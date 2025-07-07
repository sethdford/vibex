/**
 * Performance View Component - Clean Architecture like Gemini CLI
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

interface PerformanceViewProps {
  performanceProfile: any;
  workflow: any;
  executionSteps: any[];
  config: any;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  performanceProfile,
}) => {
  return (
    <Box flexDirection="column">
      <Text color={Colors.Primary} bold>📊 Performance Profile</Text>
      <Text color={Colors.TextDim}>Performance data will be displayed here</Text>
    </Box>
  );
}; 