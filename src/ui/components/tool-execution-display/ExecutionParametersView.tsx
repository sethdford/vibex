/**
 * Execution Parameters View
 * 
 * Displays the parameters for a tool execution entry.
 * Shows formatted tool parameters with proper truncation.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ToolExecutionEntry } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Execution parameters view props
 */
export interface ExecutionParametersViewProps {
  execution: ToolExecutionEntry;
  showDetails: boolean;
  compact: boolean;
}

/**
 * Execution parameters view component
 */
export const ExecutionParametersView: React.FC<ExecutionParametersViewProps> = ({
  execution,
  showDetails,
  compact,
}) => {
  const formatter = createFormattingService();

  if (!showDetails || compact) return null;

  return (
    <Box marginTop={1} marginLeft={2}>
      <Text color={Colors.TextDim}>
        Parameters: 
      </Text>
      <Box marginLeft={1}>
        <Text color={Colors.Text}>
          {formatter.formatToolParameters(execution.toolCall)}
        </Text>
      </Box>
    </Box>
  );
}; 