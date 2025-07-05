/**
 * Tool Statistics Display Component
 * 
 * Displays statistics about tool usage and performance.
 * Shows execution counts, success rates, and average execution times.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Statistics for a single tool
 */
export interface ToolStats {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool namespace
   */
  namespace?: string;
  
  /**
   * Number of executions
   */
  executionCount: number;
  
  /**
   * Number of successful executions
   */
  successCount: number;
  
  /**
   * Total execution time in milliseconds
   */
  totalExecutionTimeMs: number;
  
  /**
   * Average execution time in milliseconds
   */
  averageExecutionTimeMs: number;
  
  /**
   * Success rate (0-1)
   */
  successRate: number;
  
  /**
   * Last used timestamp
   */
  lastUsed?: number;
}

interface ToolStatsDisplayProps {
  /**
   * Tool statistics to display
   */
  tools: ToolStats[];
  
  /**
   * Whether the component should be visible
   */
  visible: boolean;
  
  /**
   * Maximum number of tools to display
   */
  maxTools?: number;
  
  /**
   * Sort method for tools
   */
  sortBy?: 'usage' | 'name' | 'time' | 'success';
  
  /**
   * Display format (compact or detailed)
   */
  displayMode?: 'compact' | 'detailed';
  
  /**
   * Width constraint for display
   */
  maxWidth?: number;
}

/**
 * Component to display tool usage statistics
 */
export const ToolStatsDisplay: React.FC<ToolStatsDisplayProps> = ({ 
  tools, 
  visible,
  maxTools = 5,
  sortBy = 'usage',
  displayMode = 'detailed',
  maxWidth
}) => {
  if (!visible || tools.length === 0) {
    return null;
  }

  // Sort tools based on the specified criteria
  const sortedTools = [...tools].sort((a, b) => {
    switch(sortBy) {
      case 'usage':
        return b.executionCount - a.executionCount;
      case 'name':
        const fullNameA = a.namespace ? `${a.namespace}.${a.name}` : a.name;
        const fullNameB = b.namespace ? `${b.namespace}.${b.name}` : b.name;
        return fullNameA.localeCompare(fullNameB);
      case 'time':
        return b.averageExecutionTimeMs - a.averageExecutionTimeMs;
      case 'success':
        return b.successRate - a.successRate;
      default:
        return b.executionCount - a.executionCount;
    }
  }).slice(0, maxTools > 0 ? maxTools : tools.length);

  // Format duration in ms to a readable string
  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  // Format success rate color
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.9) return Colors.Success;
    if (rate >= 0.75) return Colors.Info;
    if (rate >= 0.5) return Colors.Warning;
    return Colors.Error;
  };

  // Render compact mode (single line summary)
  if (displayMode === 'compact') {
    const totalExecutions = tools.reduce((sum, tool) => sum + tool.executionCount, 0);
    const successfulExecutions = tools.reduce((sum, tool) => sum + tool.successCount, 0);
    const overallSuccessRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
    
    return (
      <Box>
        <Text>Tools: </Text>
        <Text bold>{totalExecutions}</Text>
        <Text> executions | </Text>
        <Text color={getSuccessRateColor(overallSuccessRate)}>
          {(overallSuccessRate * 100).toFixed(0)}% success
        </Text>
      </Box>
    );
  }

  // Render detailed mode (table of tools)
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={Colors.Gray600} padding={1}>
      <Box marginBottom={1}>
        <Text bold>Tool Usage Statistics</Text>
      </Box>
      
      <Box>
        <Box width={maxWidth ? `${Math.floor(maxWidth * 0.5)}%` : "50%"}>
          <Text color={Colors.TextDim}>Tool</Text>
        </Box>
        <Box width="15%">
          <Text color={Colors.TextDim}>Count</Text>
        </Box>
        <Box width="15%">
          <Text color={Colors.TextDim}>Success</Text>
        </Box>
        <Box width="20%">
          <Text color={Colors.TextDim}>Avg. Time</Text>
        </Box>
      </Box>
      
      <Box height={1}>
        <Text>─────────────────────────────────────────────</Text>
      </Box>
      
      {sortedTools.map((tool, index) => {
        // Format tool name with namespace
        const toolName = tool.namespace ? `${tool.namespace}.${tool.name}` : tool.name;
        
        return (
          <Box key={`tool-${index}`}>
            <Box width={maxWidth ? `${Math.floor(maxWidth * 0.5)}%` : "50%"}>
              <Text>{toolName}</Text>
            </Box>
            <Box width="15%">
              <Text>{tool.executionCount}</Text>
            </Box>
            <Box width="15%">
              <Text color={getSuccessRateColor(tool.successRate)}>
                {(tool.successRate * 100).toFixed(0)}%
              </Text>
            </Box>
            <Box width="20%">
              <Text>{formatDuration(tool.averageExecutionTimeMs)}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ToolStatsDisplay;