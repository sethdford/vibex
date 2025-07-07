/**
 * Metrics View Component - Clean Architecture
 * 
 * Single Responsibility: Performance metrics display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { RealTimeMetrics } from './types.js';

/**
 * Metrics view props
 */
export interface MetricsViewProps {
  metrics: RealTimeMetrics;
  showMetrics: boolean;
  enableMetrics: boolean;
}

/**
 * Metrics view component
 */
export const MetricsView: React.FC<MetricsViewProps> = ({
  metrics,
  showMetrics,
  enableMetrics,
}) => {
  if (!showMetrics || !enableMetrics) return null;

  return (
    <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray">
      <Box>
        <Text color={Colors.Info} bold>📊 Real-Time Metrics</Text>
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>(Press 'M' to toggle)</Text>
        </Box>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.Text}>Connection: </Text>
        <Text color={metrics.connectionStatus === 'connected' ? Colors.Success : Colors.Error}>
          {metrics.connectionStatus.toUpperCase()}
        </Text>
      </Box>
      
      <Box>
        <Text color={Colors.Text}>Latency: </Text>
        <Text color={metrics.updateLatency < 100 ? Colors.Success : Colors.Warning}>
          {metrics.updateLatency.toFixed(1)}ms
        </Text>
      </Box>
      
      <Box>
        <Text color={Colors.Text}>Memory: </Text>
        <Text color={Colors.Info}>
          {metrics.memoryUsage.toFixed(1)}MB
        </Text>
      </Box>
      
      <Box>
        <Text color={Colors.Text}>Throughput: </Text>
        <Text color={Colors.Info}>
          {metrics.throughput.toFixed(1)} updates/sec
        </Text>
      </Box>
      
      <Box>
        <Text color={Colors.Text}>Last Update: </Text>
        <Text color={Colors.TextDim}>
          {new Date(metrics.lastUpdate).toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
}; 