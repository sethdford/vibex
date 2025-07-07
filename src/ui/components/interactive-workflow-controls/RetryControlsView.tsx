/**
 * Retry Controls View - Clean Architecture like Gemini CLI
 * 
 * Display component for retry controls and history
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { WorkflowDefinition } from '../task-orchestrator/index.js';
import { RetryService } from './RetryService.js';

/**
 * Retry controls view props
 */
interface RetryControlsViewProps {
  workflow?: WorkflowDefinition;
  selectedTaskIndex: number;
  retryHistory: Map<string, number>;
  retryService: RetryService;
  compact?: boolean;
}

/**
 * Retry controls view component
 */
export const RetryControlsView: React.FC<RetryControlsViewProps> = ({
  workflow,
  selectedTaskIndex,
  retryHistory,
  retryService,
  compact = false,
}) => {
  const getCurrentTask = () => {
    if (!workflow || !workflow.tasks || selectedTaskIndex >= workflow.tasks.length) {
      return null;
    }
    return workflow.tasks[selectedTaskIndex];
  };

  const currentTask = getCurrentTask();
  const currentTaskId = currentTask?.id || `task-${selectedTaskIndex}`;
  const retryCount = retryHistory.get(currentTaskId) || 0;
  const hasRetries = retryHistory.size > 0;

  if (compact && !hasRetries) {
    return null;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {hasRetries && (
        <Box borderStyle="round" borderColor={Colors.Warning} paddingX={1}>
          <Text color={Colors.Warning} bold>
            🔄 Retry Status
          </Text>
          
          {currentTask && retryCount > 0 && (
            <Box marginLeft={2}>
              <Text color={Colors.Text}>
                Current: {retryCount} attempts
              </Text>
            </Box>
          )}
        </Box>
      )}

      {!compact && (
        <Box marginTop={1} paddingX={1}>
          <Text color={Colors.TextDim}>
            Retry Commands: R: Configure Retry
          </Text>
        </Box>
      )}

      {!compact && hasRetries && (
        <Box marginTop={1} paddingX={1}>
          <Text color={Colors.TextDim}>
            Total Tasks with Retries: {retryHistory.size}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default RetryControlsView; 