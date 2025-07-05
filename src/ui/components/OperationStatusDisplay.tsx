/**
 * Operation Status Display Component
 * 
 * Displays operation statuses in a Gemini CLI-style format with status indicators
 * and detailed information about what VibeX is actually doing.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../colors.js';
import { OperationStatus } from '../hooks/useOperationStatus.js';

interface OperationStatusDisplayProps {
  operation: OperationStatus;
  showDetails?: boolean;
}

/**
 * Status indicator component similar to Gemini CLI's tool status
 */
const StatusIndicator: React.FC<{ status: OperationStatus['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Text color={Colors.AccentBlue}>○</Text>;
    case 'executing':
      return <Text color={Colors.AccentGreen}><Spinner type="dots" /></Text>;
    case 'success':
      return <Text color={Colors.AccentGreen}>✔</Text>;
    case 'error':
      return <Text color={Colors.AccentRed} bold>✗</Text>;
    default:
      return <Text color={Colors.TextMuted}>?</Text>;
  }
};

/**
 * Format operation duration
 */
const formatDuration = (startTime: number, endTime?: number): string => {
  const duration = (endTime || Date.now()) - startTime;
  
  if (duration < 1000) {
    return `${duration}ms`;
  }
  
  const seconds = Math.floor(duration / 1000);
  const remainingMs = duration % 1000;
  
  if (seconds < 60) {
    return `${seconds}.${Math.floor(remainingMs / 100)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Operation status display component
 */
export const OperationStatusDisplay: React.FC<OperationStatusDisplayProps> = ({
  operation,
  showDetails = false,
}) => {
  const duration = formatDuration(operation.startTime, operation.endTime);
  
  return (
    <Box flexDirection="column" paddingY={0}>
      <Box flexDirection="row" alignItems="center">
        <Box minWidth={3}>
          <StatusIndicator status={operation.status} />
        </Box>
        
        <Box marginLeft={1}>
          <Text color={Colors.Primary} bold>
            {operation.name}
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text color={Colors.TextMuted}>
            {operation.description}
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            {duration}
          </Text>
        </Box>
      </Box>
      
      {showDetails && operation.details && (
        <Box paddingLeft={4} marginTop={0}>
          <Text color={Colors.TextMuted}>
            {operation.details}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Multiple operations display component
 */
interface OperationListDisplayProps {
  operations: OperationStatus[];
  maxVisible?: number;
}

export const OperationListDisplay: React.FC<OperationListDisplayProps> = ({
  operations,
  maxVisible = 5,
}) => {
  if (operations.length === 0) {
    return null;
  }
  
  // Show the most recent operations
  const visibleOperations = operations.slice(-maxVisible);
  
  return (
    <Box flexDirection="column" marginY={0}>
      {visibleOperations.map((operation) => (
        <OperationStatusDisplay
          key={operation.id}
          operation={operation}
          showDetails={operation.status === 'error'}
        />
      ))}
    </Box>
  );
}; 