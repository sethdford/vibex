/**
 * Execution Header View
 * 
 * Displays the header information for a tool execution entry.
 * Shows state, tool name, duration, and execution status.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ToolExecutionEntry } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Execution header view props
 */
export interface ExecutionHeaderViewProps {
  execution: ToolExecutionEntry;
}

/**
 * Execution header view component
 */
export const ExecutionHeaderView: React.FC<ExecutionHeaderViewProps> = ({
  execution,
}) => {
  const formatter = createFormattingService();
  const stateIcon = formatter.getExecutionStateIcon(execution.state);
  const duration = execution.duration || (execution.endTime ? execution.endTime - execution.startTime : Date.now() - execution.startTime);

  return (
    <Box>
      <Text color={stateIcon.color}>{stateIcon.icon}</Text>
      <Box marginLeft={1}>
        <Text color={Colors.Primary} bold>
          {String(execution.toolCall.tool)}
        </Text>
      </Box>
      <Box marginLeft={2}>
        <Text color={Colors.TextDim}>
          ({formatter.formatDuration(duration)})
        </Text>
      </Box>
      {execution.state === 'executing' && (
        <Box marginLeft={2}>
          <Text color={Colors.Info}>
            [RUNNING]
          </Text>
        </Box>
      )}
    </Box>
  );
}; 