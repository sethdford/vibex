/**
 * Tool Usage Statistics Component
 * 
 * Displays detailed statistics about tool usage including execution counts,
 * success rates, performance metrics, and historical trends. Supports both
 * compact and detailed views with sorting and filtering options.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Tool execution record
 */
export interface ToolExecution {
  /**
   * Tool name
   */
  toolName: string;
  
  /**
   * Tool namespace/category
   */
  namespace?: string;
  
  /**
   * When the tool was executed
   */
  timestamp: number;
  
  /**
   * Whether the execution was successful
   */
  success: boolean;
  
  /**
   * Execution duration in milliseconds
   */
  durationMs: number;
  
  /**
   * Error message if execution failed
   */
  error?: string;
}

/**
 * Aggregated tool usage metrics
 */
export interface ToolUsage {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool namespace
   */
  namespace?: string;
  
  /**
   * Number of tool invocations
   */
  invocations: number;
  
  /**
   * Number of successful executions
   */
  successes: number;
  
  /**
   * Number of failed executions
   */
  failures: number;
  
  /**
   * Average latency in milliseconds
   */
  avgLatency: number;
  
  /**
   * Last time the tool was used
   */
  lastUsed?: Date;
  
  /**
   * Success rate (0-1)
   */
  successRate?: number;
  
  /**
   * Recent executions of this tool
   */
  recentExecutions?: ToolExecution[];
}

interface ToolUsageStatsProps {
  /**
   * List of tool usage metrics
   */
  tools: ToolUsage[];
  
  /**
   * Use compact display mode
   */
  compact?: boolean;
  
  /**
   * How to sort the tools
   */
  sortBy?: 'name' | 'usage' | 'latency' | 'success';
  
  /**
   * Maximum number of tools to display
   */
  maxCount?: number;
  
  /**
   * Show raw execution history
   */
  showExecutionHistory?: boolean;
  
  /**
   * Auto-refresh interval in milliseconds
   */
  refreshInterval?: number;
  
  /**
   * Whether the component should auto-refresh
   */
  autoRefresh?: boolean;
  
  /**
   * Maximum width for component
   */
  maxWidth?: number;
  
  /**
   * Called when a tool is selected
   */
  onToolSelect?: (toolName: string) => void;
  
  /**
   * Whether to show only tools with failures
   */
  showOnlyFailed?: boolean;
}

/**
 * Enhanced component for displaying tool usage statistics with multiple views
 */
export const ToolUsageStats: React.FC<ToolUsageStatsProps> = ({
  tools,
  compact = false,
  sortBy = 'usage',
  maxCount = 5,
  showExecutionHistory = false,
  refreshInterval = 5000,
  autoRefresh = false,
  maxWidth = 80,
  onToolSelect,
  showOnlyFailed = false
}) => {
  // State for expanded tool and refresh counter
  const [expandedTool, setExpandedTool] = React.useState<string | null>(null);
  const [refreshCount, setRefreshCount] = React.useState<number>(0);
  
  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setRefreshCount(prev => prev + 1);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);
  
  // Calculate success rates for tools
  const toolsWithRates = React.useMemo(() => {
    return tools.map(tool => ({
      ...tool,
      successRate: tool.invocations > 0 ? tool.successes / tool.invocations : 0
    }));
  }, [tools, refreshCount]);
  if (!tools || tools.length === 0) {
    return null;
  }

  // Filter tools if showing only failed
  const filteredTools = showOnlyFailed 
    ? toolsWithRates.filter(tool => tool.failures > 0)
    : toolsWithRates;
  
  // Sort tools according to sortBy parameter
  const sortedTools = [...filteredTools].sort((a, b) => {
    if (sortBy === 'name') {
      const aName = a.namespace ? `${a.namespace}.${a.name}` : a.name;
      const bName = b.namespace ? `${b.namespace}.${b.name}` : b.name;
      return aName.localeCompare(bName);
    } else if (sortBy === 'latency') {
      return b.avgLatency - a.avgLatency;
    } else if (sortBy === 'success') {
      return (b.successRate || 0) - (a.successRate || 0);
    } else {
      // Default: sort by usage count
      return b.invocations - a.invocations;
    }
  });

  // Limit the number of tools shown
  const toolsToShow = sortedTools.slice(0, maxCount);
  
  // Handle tool expansion toggle
  const toggleExpandTool = (toolName: string) => {
    if (onToolSelect) {
      onToolSelect(toolName);
    }
    setExpandedTool(prev => prev === toolName ? null : toolName);
  };

  // Format success rate with color
  const formatSuccessRate = (rate: number) => {
    const percentage = Math.round(rate * 100);
    const color = 
      percentage >= 95 ? Colors.Success :
      percentage >= 80 ? Colors.Info :
      percentage >= 60 ? Colors.Warning :
      Colors.Error;
    
    return <Text color={color}>{percentage}%</Text>;
  };
  
  // Format duration in ms
  const formatDuration = (ms: number) => {
    if (ms < 1) return '0ms';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  if (compact) {
    // Compact view: just tool names and counts
    return (
      <Box flexDirection="row" marginBottom={1} width={maxWidth}>
        <Text color={Colors.TextDim}>Tools: </Text>
        {toolsToShow.map((tool, index) => {
          const displayName = tool.namespace ? `${tool.namespace}.${tool.name}` : tool.name;
          return (
            <Text key={tool.name}>
              {index > 0 ? ', ' : ''}
              <Text color={Colors.Primary}>{displayName}</Text>
              <Text color={Colors.TextDim}> ({tool.invocations})</Text>
              <Text color={tool.failures > 0 ? Colors.Error : Colors.Success}>
                {tool.failures > 0 ? ` ✗${tool.failures}` : ' ✓'}
              </Text>
            </Text>
          );
        })}
        {sortedTools.length > maxCount && (
          <Text color={Colors.TextDim}> +{sortedTools.length - maxCount} more</Text>
        )}
      </Box>
    );
  }

  // Full view: detailed stats table with expandable details
  return (
    <Box 
      flexDirection="column" 
      marginY={1} 
      width={maxWidth}
      borderStyle="round"
      borderColor={Colors.Gray600}
      padding={1}
    >
      {/* Header with summary stats */}
      <Box marginBottom={1}>
        <Text bold>Tool Usage Statistics</Text>
        <Box flexGrow={1} />
        <Text color={Colors.TextDim}>
          {toolsToShow.length}/{sortedTools.length} tools | 
          {sortedTools.reduce((sum, t) => sum + t.invocations, 0)} calls | 
          Sort: {sortBy}
        </Text>
      </Box>
      
      {/* Sort controls */}
      <Box marginBottom={1}>
        <Text color={Colors.TextDim}>Sort by: </Text>
        <Box marginRight={2}>
          <Text color={sortBy === 'usage' ? Colors.Primary : Colors.TextDim}>
            [Usage]
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={sortBy === 'name' ? Colors.Primary : Colors.TextDim}>
            [Name]
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={sortBy === 'success' ? Colors.Primary : Colors.TextDim}>
            [Success]
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={sortBy === 'latency' ? Colors.Primary : Colors.TextDim}>
            [Latency]
          </Text>
        </Box>
        <Box flexGrow={1} />
        <Text color={Colors.TextDim}>Click tool name to expand</Text>
      </Box>
      
      {/* Table header */}
      <Box>
        <Box width={25}>
          <Text color={Colors.TextDim} bold>Tool</Text>
        </Box>
        <Box width={10}>
          <Text color={Colors.TextDim} bold>Calls</Text>
        </Box>
        <Box width={10}>
          <Text color={Colors.TextDim} bold>Success</Text>
        </Box>
        <Box width={15}>
          <Text color={Colors.TextDim} bold>Avg Latency</Text>
        </Box>
        <Box width={15}>
          <Text color={Colors.TextDim} bold>Last Used</Text>
        </Box>
      </Box>
      
      {/* Tool rows with expandable details */}
      {toolsToShow.map(tool => {
        const displayName = tool.namespace ? `${tool.namespace}.${tool.name}` : tool.name;
        const isExpanded = expandedTool === tool.name;
        
        return (
          <Box key={tool.name} flexDirection="column" marginY={1}>
            {/* Main tool row */}
            <Box>
              <Box width={25}>
                <Text 
                  color={isExpanded ? Colors.Primary : Colors.Info}
                  bold={isExpanded}
                  underline
                >
                  {isExpanded ? '▼ ' : '▶ '}{displayName}
                </Text>
              </Box>
              <Box width={10}>
                <Text>{tool.invocations}</Text>
              </Box>
              <Box width={10}>
                {formatSuccessRate(tool.successRate || 0)}
              </Box>
              <Box width={15}>
                <Text>{formatDuration(tool.avgLatency)}</Text>
              </Box>
              <Box width={15}>
                <Text color={Colors.TextDim}>
                  {tool.lastUsed ? tool.lastUsed.toLocaleTimeString() : 'N/A'}
                </Text>
              </Box>
            </Box>
            
            {/* Expanded details */}
            {isExpanded && (
              <Box flexDirection="column" marginLeft={2} marginTop={1}>
                {/* Success/failure counts */}
                <Box>
                  <Text color={Colors.Success}>✓ {tool.successes} successful</Text>
                  <Text> | </Text>
                  <Text color={tool.failures > 0 ? Colors.Error : Colors.TextDim}>
                    {tool.failures > 0 ? `✗ ${tool.failures} failed` : 'No failures'}
                  </Text>
                </Box>
                
                {/* Recent executions if available */}
                {showExecutionHistory && tool.recentExecutions && tool.recentExecutions.length > 0 && (
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={Colors.TextDim} underline>Recent executions:</Text>
                    {tool.recentExecutions.map((exec, idx) => (
                      <Box key={idx} marginLeft={2} marginY={1}>
                        <Box width={15}>
                          <Text color={Colors.TextDim}>
                            {new Date(exec.timestamp).toLocaleTimeString()}
                          </Text>
                        </Box>
                        <Box width={10}>
                          <Text color={exec.success ? Colors.Success : Colors.Error}>
                            {exec.success ? '✓' : '✗'}
                          </Text>
                        </Box>
                        <Box width={15}>
                          <Text>{formatDuration(exec.durationMs)}</Text>
                        </Box>
                        {exec.error && (
                          <Text color={Colors.Error}>Error: {exec.error}</Text>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );
      })}

      {/* Footer with info about additional tools */}
      {sortedTools.length > maxCount && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            + {sortedTools.length - maxCount} more tools not shown
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ToolUsageStats;