/**
 * Execution Summary View
 * 
 * Displays summary statistics for all tool executions.
 * Shows total counts, success rates, and performance metrics.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ToolExecutionEntry } from './types.js';
import { createStatisticsService } from './StatisticsService.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Execution summary view props
 */
export interface ExecutionSummaryViewProps {
  executions: ToolExecutionEntry[];
  compact: boolean;
  showMetrics: boolean;
}

/**
 * Execution summary view component
 */
export const ExecutionSummaryView: React.FC<ExecutionSummaryViewProps> = ({
  executions,
  compact,
  showMetrics,
}) => {
  const statisticsService = createStatisticsService();
  const formatter = createFormattingService();

  if (compact || !showMetrics) return null;

  const stats = statisticsService.calculateStatistics(executions);

  return (
    <Box flexDirection="column" marginBottom={2} borderStyle="single" borderColor="green">
      <Box>
        <Text color={Colors.Success} bold>📈 Tool Execution Summary</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.Text}>Total: </Text>
        <Text color={Colors.Info}>{stats.total}</Text>
        
        <Box marginLeft={4}>
          <Text color={Colors.Text}>Running: </Text>
          <Text color={Colors.Warning}>{stats.executing}</Text>
        </Box>
        
        <Box marginLeft={4}>
          <Text color={Colors.Text}>Success: </Text>
          <Text color={Colors.Success}>{stats.completed}</Text>
        </Box>
        
        <Box marginLeft={4}>
          <Text color={Colors.Text}>Failed: </Text>
          <Text color={Colors.Error}>{stats.failed}</Text>
        </Box>
      </Box>
      
      <Box>
        <Text color={Colors.Text}>Avg Duration: </Text>
        <Text color={Colors.Info}>{formatter.formatDuration(stats.avgDuration)}</Text>
        
        <Box marginLeft={4}>
          <Text color={Colors.Text}>Success Rate: </Text>
          <Text color={stats.total > 0 ? (stats.successRate > 0.8 ? Colors.Success : Colors.Warning) : Colors.TextDim}>
            {formatter.formatSuccessRate(stats.successRate)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}; 