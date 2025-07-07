/**
 * Execution History View Component - Clean Architecture
 * 
 * Single Responsibility: Execution history display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ExecutionHistoryEntry } from './types.js';

/**
 * Execution history view props
 */
export interface ExecutionHistoryViewProps {
  executionHistory: ExecutionHistoryEntry[];
}

/**
 * Execution history view component
 */
export const ExecutionHistoryView: React.FC<ExecutionHistoryViewProps> = ({
  executionHistory,
}) => {
  if (executionHistory.length === 0) return null;
  
  const recentExecution = executionHistory[executionHistory.length - 1];

  return (
    <Box marginTop={1}>
      <Text color={Colors.TextDim}>
        Last Execution: 
      </Text>
      <Text color={recentExecution.success ? Colors.Success : Colors.Error}>
        {recentExecution.success ? '✓' : '✗'}
      </Text>
      <Box marginLeft={1}>
        <Text color={Colors.TextDim}>
          ({recentExecution.duration}ms)
        </Text>
      </Box>
      {recentExecution.errorMessage && (
        <Box marginLeft={1}>
          <Text color={Colors.Error}>
            - {recentExecution.errorMessage}
          </Text>
        </Box>
      )}
    </Box>
  );
}; 