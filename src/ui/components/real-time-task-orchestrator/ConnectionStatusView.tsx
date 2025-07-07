/**
 * Connection Status View Component - Clean Architecture
 * 
 * Single Responsibility: Connection status display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ConnectionStatus } from './types.js';

/**
 * Connection status view props
 */
export interface ConnectionStatusViewProps {
  connectionStatus: ConnectionStatus;
  updateLatency: number;
}

/**
 * Connection status view component
 */
export const ConnectionStatusView: React.FC<ConnectionStatusViewProps> = ({
  connectionStatus,
  updateLatency,
}) => {
  const statusColor = connectionStatus === 'connected' 
    ? Colors.Success 
    : connectionStatus === 'reconnecting' 
      ? Colors.Warning 
      : Colors.Error;
  
  const statusIcon = connectionStatus === 'connected' 
    ? '🟢' 
    : connectionStatus === 'reconnecting' 
      ? '🟡' 
      : '🔴';

  return (
    <Box marginBottom={1}>
      <Text color={statusColor}>
        {statusIcon} {connectionStatus.toUpperCase()}
      </Text>
      
      {updateLatency > 0 && (
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            ({updateLatency.toFixed(1)}ms latency)
          </Text>
        </Box>
      )}
      
      <Box marginLeft={4}>
        <Text color={Colors.TextDim}>Real-Time Task Orchestrator</Text>
      </Box>
    </Box>
  );
}; 