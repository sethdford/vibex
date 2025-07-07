/**
 * System Metrics View Component - Clean Architecture
 * 
 * Single Responsibility: System metrics display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { PerformanceMetrics } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * System metrics view props
 */
export interface SystemMetricsViewProps {
  metrics: PerformanceMetrics;
  compact?: boolean;
  maxWidth?: number;
}

/**
 * System metrics view component
 */
export const SystemMetricsView: React.FC<SystemMetricsViewProps> = ({
  metrics,
  compact = false,
  maxWidth = 60,
}) => {
  const formatter = createFormattingService();
  
  if (compact) {
    return (
      <Box>
        <Text color={Colors.Text}>🖥️ System: </Text>
        <Text color={Colors.TextDim}>
          {formatter.formatSystemSummary(metrics)}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={maxWidth}>
      <Box>
        <Text color={Colors.Info} bold>🖥️ System Info</Text>
      </Box>
      
      <Box marginTop={1}>
        <Box width={20}>
          <Text color={Colors.Text}>Platform:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {metrics.system.platform}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Node Version:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {metrics.system.nodeVersion}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Process ID:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {metrics.system.pid}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Uptime:</Text>
        </Box>
        <Text color={Colors.Success}>
          {formatter.formatUptime(metrics.system.uptime)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Timestamp:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {formatter.formatDateTime(metrics.timestamp)}
        </Text>
      </Box>
    </Box>
  );
}; 