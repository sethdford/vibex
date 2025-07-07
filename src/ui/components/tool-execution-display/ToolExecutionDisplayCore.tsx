/**
 * Tool Execution Display Core
 * 
 * Main orchestrator component for tool execution display.
 * Coordinates all view components and manages display state.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ToolExecutionDisplayProps, ToolExecutionEntry } from './types.js';
import { DEFAULT_TOOL_EXECUTION_CONFIG } from './types.js';

// View components
import { ExecutionHeaderView } from './ExecutionHeaderView.js';
import { ExecutionParametersView } from './ExecutionParametersView.js';
import { StreamingOutputView } from './StreamingOutputView.js';
import { ExecutionResultView } from './ExecutionResultView.js';
import { ExecutionMetricsView } from './ExecutionMetricsView.js';
import { ExecutionSummaryView } from './ExecutionSummaryView.js';

/**
 * Tool execution display core component
 */
export const ToolExecutionDisplayCore: React.FC<ToolExecutionDisplayProps> = (props) => {
  // Merge props with defaults
  const config = { ...DEFAULT_TOOL_EXECUTION_CONFIG, ...props };
  const {
    executions,
    maxEntries,
    showCompleted,
    showDetails,
    enableStreaming,
    compact,
    maxWidth,
    showMetrics,
    autoScroll,
  } = config;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Filter and sort executions
  const displayExecutions = useMemo(() => {
    let filtered = [...executions];
    
    if (!showCompleted) {
      filtered = filtered.filter(exec => exec.state !== 'completed');
    }
    
    // Sort by start time (newest first)
    filtered.sort((a, b) => b.startTime - a.startTime);
    
    // Limit entries
    return filtered.slice(0, maxEntries);
  }, [executions, showCompleted, maxEntries]);

  // Auto-scroll to latest execution
  useEffect(() => {
    if (autoScroll && displayExecutions.length > 0) {
      setSelectedIndex(0);
    }
  }, [displayExecutions.length, autoScroll]);

  /**
   * Render single execution entry
   */
  const renderExecutionEntry = (execution: ToolExecutionEntry, index: number): React.ReactNode => {
    const isExpanded = expandedEntries.has(execution.id);
    const isSelected = index === selectedIndex;

    return (
      <Box 
        key={execution.id} 
        flexDirection="column" 
        marginBottom={1}
        borderStyle={isSelected ? "single" : undefined}
        borderColor={isSelected ? "blue" : undefined}
      >
        {/* Header */}
        <ExecutionHeaderView execution={execution} />
        
        {/* Details (if expanded or not compact) */}
        {(isExpanded || (!compact && showDetails)) && (
          <Box flexDirection="column">
            <ExecutionParametersView 
              execution={execution} 
              showDetails={showDetails}
              compact={compact}
            />
            <StreamingOutputView 
              execution={execution} 
              enableStreaming={enableStreaming}
            />
            <ExecutionResultView execution={execution} />
            <ExecutionMetricsView 
              execution={execution} 
              showMetrics={showMetrics}
            />
          </Box>
        )}
      </Box>
    );
  };

  // Main render
  if (displayExecutions.length === 0) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            No tool executions to display
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Summary */}
      <ExecutionSummaryView 
        executions={executions}
        compact={compact}
        showMetrics={showMetrics}
      />
      
      {/* Tool executions */}
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={Colors.Primary} bold>
            🔧 Tool Executions ({displayExecutions.length})
          </Text>
        </Box>
        
        {displayExecutions.map((execution, index) => 
          renderExecutionEntry(execution, index)
        )}
      </Box>
      
      {/* Controls hint */}
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Real-time tool execution tracking • Streaming output • Performance metrics
        </Text>
      </Box>
    </Box>
  );
}; 