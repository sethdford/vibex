/**
 * CPU Metrics View Component - Clean Architecture
 * 
 * Single Responsibility: CPU metrics display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ProgressSystem } from '../progress-system/index.js';
import type { PerformanceMetrics } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * CPU metrics view props
 */
export interface CpuMetricsViewProps {
  metrics: PerformanceMetrics;
  compact?: boolean;
  showProgress?: boolean;
  maxWidth?: number;
}

/**
 * CPU metrics view component
 */
export const CpuMetricsView: React.FC<CpuMetricsViewProps> = ({
  metrics,
  compact = false,
  showProgress = true,
  maxWidth = 60,
}) => {
  const formatter = createFormattingService();
  
  if (compact) {
    return (
      <Box>
        <Text color={Colors.Text}>⚡ CPU: </Text>
        <Text color={formatter.getMetricColor(metrics.cpu.usage, 70, 85)}>
          {formatter.formatCpuSummary(metrics)}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={maxWidth}>
      <Box>
        <Text color={Colors.Info} bold>⚡ CPU Usage</Text>
      </Box>
      
      <Box marginTop={1}>
        <Box width={20}>
          <Text color={Colors.Text}>Usage:</Text>
        </Box>
        <Text color={formatter.getMetricColor(metrics.cpu.usage, 70, 85)}>
          {formatter.formatPercentage(metrics.cpu.usage)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>Cores:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {metrics.cpu.cores}
        </Text>
      </Box>
      
            {showProgress && (
        <Box marginTop={1}>
          <ProgressSystem
            value={metrics.cpu.usage}
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
          <Text color={Colors.Text}>Load Average:</Text>
        </Box>
        <Text color={Colors.TextDim}>
          {formatter.formatLoadAverage(metrics.cpu.loadAverage)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>1m:</Text>
        </Box>
        <Text color={formatter.getMetricColor(metrics.cpu.loadAverage[0], 2, 4)}>
          {formatter.formatNumber(metrics.cpu.loadAverage[0], 2)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>5m:</Text>
        </Box>
        <Text color={formatter.getMetricColor(metrics.cpu.loadAverage[1], 2, 4)}>
          {formatter.formatNumber(metrics.cpu.loadAverage[1], 2)}
        </Text>
      </Box>
      
      <Box>
        <Box width={20}>
          <Text color={Colors.Text}>15m:</Text>
        </Box>
        <Text color={formatter.getMetricColor(metrics.cpu.loadAverage[2], 2, 4)}>
          {formatter.formatNumber(metrics.cpu.loadAverage[2], 2)}
        </Text>
      </Box>
    </Box>
  );
}; 