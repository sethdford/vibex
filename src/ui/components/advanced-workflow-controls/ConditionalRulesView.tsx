/**
 * Conditional Rules View Component - Clean Architecture like Gemini CLI
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

interface ConditionalRulesViewProps {
  conditionalRules: any;
  workflow: any;
  selectedTaskIndex: number;
  onAddRule: any;
  onRemoveRule: any;
  config: any;
}

export const ConditionalRulesView: React.FC<ConditionalRulesViewProps> = ({
  conditionalRules,
}) => {
  return (
    <Box flexDirection="column">
      <Text color={Colors.Primary} bold>⚡ Conditional Rules</Text>
      <Text color={Colors.TextDim}>Rules: {conditionalRules.size}</Text>
    </Box>
  );
}; 