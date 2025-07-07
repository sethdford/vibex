/**
 * Memory Metrics View Component - Clean Architecture
 * 
 * Single Responsibility: Memory metrics display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ProgressSystem } from '../progress-system/index.js';
import type { PerformanceMetrics } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Memory metrics view props
 */
export interface MemoryMetricsViewProps {
  metrics: PerformanceMetrics;
  compact?: boolean;
  showProgress?: boolean;
  maxWidth?: number;
}

/**
 * Memory metrics view component
 */
export const MemoryMetricsView: React.FC<MemoryMetricsViewProps> = ({
  metrics,
  compact = false,
  showProgress = true,
  maxWidth = 60,
}) => {
  const formatter = createFormattingService();
  
  if (compact) {
    return (
      <Box>
        <Text color={Colors.Text}>💾 Memory: </Text>
        <Text color={formatter.getStatusColor(metrics.memory.percentage)}>
          {formatter.formatMemorySummary(metrics)}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={maxWidth}>
      <Box>
        <Text color={Colors.Info} bold>💾 Memory Usage</Text>
      </Box>
      
      <Box marginTop={1}>
        <Box width={20}>
          <Text color={Colors.Text}>Total:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {formatter.formatBytes(metrics.memory.total)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Used:</Text>
        </Box>
        <Text color={formatter.getStatusColor(metrics.memory.percentage)}>
          {formatter.formatBytes(metrics.memory.used)} ({formatter.formatPercentage(metrics.memory.percentage)})
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Free:</Text>
        </Box>
        <Text color={Colors.Success}>
          {formatter.formatBytes(metrics.memory.total - metrics.memory.used)}
        </Text>
      </Box>
      
            {showProgress && (
        <Box marginTop={1}>
          <ProgressSystem
            value={metrics.memory.percentage}
            mode="mini"
            size="small"
            theme="default"
            animationStyle="simple"
            showPercentage={true}
          />
        </Box>
      )}
      
      <Box marginTop={1}>
        <Box width={20}>
          <Text color={Colors.Text}>Heap Used:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {formatter.formatBytes(metrics.memory.heapUsed)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Heap Total:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {formatter.formatBytes(metrics.memory.heapTotal)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>RSS:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {formatter.formatBytes(metrics.memory.rss)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>External:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {formatter.formatBytes(metrics.memory.external)}
        </Text>
      </Box>
    </Box>
  );
}; 