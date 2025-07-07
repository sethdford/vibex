/**
 * Status View Component - Clean Architecture
 * 
 * Single Responsibility: Monitoring status display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { PerformanceMetrics, SystemHealth } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Status view props
 */
export interface StatusViewProps {
  isCollecting: boolean;
  enabled: boolean;
  updateInterval: number;
  historyLength: number;
  maxHistoryLength: number;
  lastUpdate?: number;
  health?: SystemHealth;
  compact?: boolean;
}

/**
 * Status view component
 */
export const StatusView: React.FC<StatusViewProps> = ({
  isCollecting,
  enabled,
  updateInterval,
  historyLength,
  maxHistoryLength,
  lastUpdate,
  health,
  compact = false,
}) => {
  const formatter = createFormattingService();
  
  const getStatusIcon = () => {
    if (!enabled) return '⏸️';
    if (isCollecting) return '🟢';
    return '🔴';
  };

  const getStatusText = () => {
    if (!enabled) return 'Disabled';
    if (isCollecting) return 'Monitoring';
    return 'Stopped';
  };

  const getStatusColor = () => {
    if (!enabled) return Colors.TextDim;
    if (isCollecting) return Colors.Success;
    return Colors.Error;
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return Colors.Success;
      case 'warning':
        return Colors.Warning;
      case 'critical':
        return Colors.Error;
      default:
        return Colors.TextDim;
    }
  };

  if (compact) {
    return (
      <Box>
        <Text color={getStatusColor()}>
          {getStatusIcon()} {getStatusText()}
        </Text>
        {health && (
          <Box marginLeft={2}>
            <Text color={getHealthColor(health.overall)}>
              Health: {health.overall} ({health.score}/100)
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={Colors.Info} bold>📊 Performance Monitor Status</Text>
      </Box>
      
      <Box marginTop={1}>
        <Box width={20}>
          <Text color={Colors.Text}>Status:</Text>
        </Box>
        <Text color={getStatusColor()}>
          {getStatusIcon()} {getStatusText()}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Update Interval:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {updateInterval}ms
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>History:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {historyLength} / {maxHistoryLength} entries
        </Text>
      </Box>
      
      {lastUpdate && (
        <Box>
          <Box width={20}>
            <Text color={Colors.Text}>Last Update:</Text>
          </Box>
          <Text color={Colors.TextDim}>
            {formatter.formatTimestamp(lastUpdate)}
          </Text>
        </Box>
      )}
      
      {health && (
        <>
          <Box marginTop={1}>
            <Box width={20}>
              <Text color={Colors.Text}>Overall Health:</Text>
            </Box>
            <Text color={getHealthColor(health.overall)}>
              {health.overall.toUpperCase()} ({health.score}/100)
            </Text>
          </Box>
          
          <Box>
            <Box width={20}>
              <Text color={Colors.Text}>Memory:</Text>
            </Box>
            <Text color={getHealthColor(health.memory)}>
              {health.memory}
            </Text>
          </Box>
          
          <Box>
            <Box width={20}>
              <Text color={Colors.Text}>CPU:</Text>
            </Box>
            <Text color={getHealthColor(health.cpu)}>
              {health.cpu}
            </Text>
          </Box>
          
          <Box>
            <Box width={20}>
              <Text color={Colors.Text}>Network:</Text>
            </Box>
            <Text color={getHealthColor(health.network)}>
              {health.network}
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}; 