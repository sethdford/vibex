/**
 * Execution Metrics View
 * 
 * Displays performance metrics for a tool execution.
 * Shows memory usage, CPU usage, network requests, and cache hits.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ToolExecutionEntry } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Execution metrics view props
 */
export interface ExecutionMetricsViewProps {
  execution: ToolExecutionEntry;
  showMetrics: boolean;
}

/**
 * Execution metrics view component
 */
export const ExecutionMetricsView: React.FC<ExecutionMetricsViewProps> = ({
  execution,
  showMetrics,
}) => {
  const formatter = createFormattingService();

  if (!showMetrics || !execution.metadata) return null;

  const { memoryUsed, cpuUsed, networkRequests, cacheHits } = execution.metadata;

  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2} borderStyle="single" borderColor="blue">
      <Box>
        <Text color={Colors.Info} bold>📊 Metrics</Text>
      </Box>
      
      <Box marginTop={1}>
        {memoryUsed && (
          <Box>
            <Text color={Colors.Text}>Memory: </Text>
            <Text color={Colors.Info}>{formatter.formatMemoryUsage(memoryUsed)}</Text>
          </Box>
        )}
        
        {cpuUsed && (
          <Box marginLeft={4}>
            <Text color={Colors.Text}>CPU: </Text>
            <Text color={Colors.Info}>{formatter.formatCpuUsage(cpuUsed)}</Text>
          </Box>
        )}
      </Box>
      
      <Box>
        {networkRequests && (
          <Box>
            <Text color={Colors.Text}>Network: </Text>
            <Text color={Colors.Info}>{networkRequests}</Text>
          </Box>
        )}
        
        {cacheHits && (
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Cache: </Text>
            <Text color={Colors.Success}>{cacheHits} hits</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}; 