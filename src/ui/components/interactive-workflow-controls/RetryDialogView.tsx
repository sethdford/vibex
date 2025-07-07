/**
 * Retry Dialog View - Clean Architecture like Gemini CLI
 * 
 * Display component for retry configuration dialog
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { TaskDefinition } from '../task-orchestrator/index.js';
import { RetryConfiguration } from './types.js';
import { RetryService } from './RetryService.js';

/**
 * Retry dialog view props
 */
interface RetryDialogViewProps {
  task?: TaskDefinition;
  retryConfig: Partial<RetryConfiguration>;
  defaultRetryConfig: RetryConfiguration;
  retryService: RetryService;
  onRetry: () => void;
  onCancel: () => void;
  onConfigChange: (config: Partial<RetryConfiguration>) => void;
}

/**
 * Retry dialog view component
 */
export const RetryDialogView: React.FC<RetryDialogViewProps> = ({
  task,
  retryConfig,
  defaultRetryConfig,
  retryService,
  onRetry,
  onCancel,
  onConfigChange,
}) => {
  const finalConfig = retryService.getRetryConfig(retryConfig);
  const configSummary = retryService.getConfigSummary(retryConfig);
  const validation = retryService.validateConfig(retryConfig);

  return (
    <Box flexDirection="column" marginBottom={1} borderStyle="double" borderColor="yellow">
      <Box paddingX={1}>
        <Text color={Colors.Warning} bold>
          🔄 Configure Retry
        </Text>
      </Box>
      
      <Box marginTop={1} paddingX={1}>
        <Text color={Colors.Text}>
          Task: 
        </Text>
        <Box marginLeft={1}>
          <Text color={Colors.Info}>
            {task?.name || 'Unknown'}
          </Text>
        </Box>
      </Box>
      
      <Box marginTop={1} paddingX={1} flexDirection="column">
        <Text color={Colors.Text}>Configuration:</Text>
        
        <Box marginLeft={2} marginTop={1}>
          <Text color={Colors.TextDim}>
            Max Attempts: {configSummary.maxAttempts}
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            Initial Delay: {configSummary.initialDelay}
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            Max Delay: {configSummary.maxDelay}
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            Backoff: x{configSummary.backoffMultiplier}
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            Est. Total Time: {configSummary.totalEstimatedTime}
          </Text>
        </Box>
      </Box>

      {/* Retry conditions */}
      <Box marginTop={1} paddingX={1}>
        <Text color={Colors.Text}>Retry Conditions:</Text>
        <Box marginLeft={2} marginTop={1}>
          {configSummary.retryConditions.map((condition, index) => (
            <Box key={condition}>
              <Text color={Colors.TextDim}>
                • {formatRetryCondition(condition)}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Validation errors */}
      {!validation.valid && (
        <Box marginTop={1} paddingX={1}>
          <Text color={Colors.Error}>Validation Errors:</Text>
          <Box marginLeft={2} marginTop={1}>
            {validation.errors.map((error, index) => (
              <Box key={index}>
                <Text color={Colors.Error}>
                  • {error}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      
      <Box marginTop={1} paddingX={1}>
        <Text color={validation.valid ? Colors.Success : Colors.TextDim} bold>
          Enter
        </Text>
        <Text color={Colors.TextDim}> to retry, </Text>
        <Text color={Colors.Error} bold>Esc</Text>
        <Text color={Colors.TextDim}> to cancel</Text>
      </Box>
    </Box>
  );
};

/**
 * Format retry condition for display
 */
function formatRetryCondition(condition: string): string {
  switch (condition) {
    case 'network_error':
      return 'Network Errors';
    case 'timeout':
      return 'Timeouts';
    case 'rate_limit':
      return 'Rate Limits';
    case 'temporary_failure':
      return 'Temporary Failures';
    default:
      return condition;
  }
}

export default RetryDialogView; 