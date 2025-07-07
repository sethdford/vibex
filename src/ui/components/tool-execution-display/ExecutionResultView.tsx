/**
 * Execution Result View
 * 
 * Displays the result of a tool execution.
 * Shows output, errors, and execution status with proper formatting.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ToolExecutionEntry } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Execution result view props
 */
export interface ExecutionResultViewProps {
  execution: ToolExecutionEntry;
}

/**
 * Execution result view component
 */
export const ExecutionResultView: React.FC<ExecutionResultViewProps> = ({
  execution,
}) => {
  const formatter = createFormattingService();

  if (!execution.result || execution.state === 'executing') return null;

  const isError = execution.state === 'failed' || execution.result.error;

  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      <Box>
        <Text color={isError ? Colors.Error : Colors.Success} bold>
          {isError ? '❌ Error' : '✅ Result'}
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={isError ? Colors.Error : Colors.Text}>
          {formatter.formatToolResult(execution.result)}
        </Text>
      </Box>
      
      {execution.error && (
        <Box marginTop={1}>
          <Text color={Colors.Error}>
            Stack: {execution.error}
          </Text>
        </Box>
      )}
    </Box>
  );
}; 