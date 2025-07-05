/**
 * Tool Execution Display Component
 * 
 * Real-time tool execution display with streaming input/output and execution metrics.
 * 
 * SUCCESS CRITERIA:
 * - Tool calls visible immediately
 * - Output streams in real-time
 * - Execution time tracking with precision
 * - Input/output syntax highlighting
 * - Error handling with stack traces
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import type { ToolCall, ToolResult } from '../../ai/content-stream.js';

/**
 * Tool execution state
 */
export type ToolExecutionState = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

/**
 * Tool execution entry
 */
export interface ToolExecutionEntry {
  id: string;
  toolCall: ToolCall;
  result?: ToolResult;
  state: ToolExecutionState;
  startTime: number;
  endTime?: number;
  duration?: number;
  streamingOutput?: string;
  error?: string;
  metadata?: {
    memoryUsed?: number;
    cpuUsed?: number;
    networkRequests?: number;
    cacheHits?: number;
  };
}

/**
 * Tool execution display props
 */
export interface ToolExecutionDisplayProps {
  /**
   * Tool execution entries
   */
  executions: ToolExecutionEntry[];
  
  /**
   * Maximum number of entries to display
   */
  maxEntries?: number;
  
  /**
   * Show completed executions
   */
  showCompleted?: boolean;
  
  /**
   * Show execution details
   */
  showDetails?: boolean;
  
  /**
   * Enable streaming output display
   */
  enableStreaming?: boolean;
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Show performance metrics
   */
  showMetrics?: boolean;
  
  /**
   * Enable syntax highlighting
   */
  enableSyntaxHighlighting?: boolean;
  
  /**
   * Auto-scroll to latest execution
   */
  autoScroll?: boolean;
}

/**
 * Tool execution display component
 */
export const ToolExecutionDisplay: React.FC<ToolExecutionDisplayProps> = ({
  executions,
  maxEntries = 10,
  showCompleted = true,
  showDetails = true,
  enableStreaming = true,
  compact = false,
  maxWidth = 100,
  showMetrics = true,
  enableSyntaxHighlighting = true,
  autoScroll = true,
}) => {
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
  
  // Get execution state icon and color
  const getExecutionStateIcon = (state: ToolExecutionState) => {
    switch (state) {
      case 'pending':
        return { icon: '⏳', color: Colors.Warning };
      case 'executing':
        return { icon: '⚡', color: Colors.Info };
      case 'completed':
        return { icon: '✅', color: Colors.Success };
      case 'failed':
        return { icon: '❌', color: Colors.Error };
      case 'cancelled':
        return { icon: '⏹️', color: Colors.TextDim };
      default:
        return { icon: '❓', color: Colors.TextDim };
    }
  };
  
  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };
  
  // Format tool parameters for display
  const formatToolParameters = (toolCall: ToolCall): string => {
    try {
      const params = typeof toolCall.parameters === 'string' 
        ? JSON.parse(toolCall.parameters) 
        : toolCall.parameters;
      
      if (!params || Object.keys(params).length === 0) {
        return 'No parameters';
      }
      
      // Format key parameters for display
      const keyParams = Object.entries(params)
        .slice(0, 3) // Show first 3 parameters
        .map(([key, value]) => {
          const valueStr = typeof value === 'string' && value.length > 30
            ? `${value.substring(0, 30)}...`
            : String(value);
          return `${key}: ${valueStr}`;
        })
        .join(', ');
      
      const hasMore = Object.keys(params).length > 3;
      return hasMore ? `${keyParams}...` : keyParams;
    } catch {
      return 'Invalid parameters';
    }
  };
  
  // Format tool result for display
  const formatToolResult = (result: ToolResult): string => {
    if (result.error) {
      return `Error: ${result.error}`;
    }
    
    if (result.output) {
      const output = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
      return output.length > 100 ? `${output.substring(0, 100)}...` : output;
    }
    
    return 'No output';
  };
  
  // Render execution entry header
  const renderExecutionHeader = (execution: ToolExecutionEntry): React.ReactNode => {
    const stateIcon = getExecutionStateIcon(execution.state);
    const duration = execution.duration || (execution.endTime ? execution.endTime - execution.startTime : Date.now() - execution.startTime);
    
    return (
      <Box>
        <Text color={stateIcon.color}>{stateIcon.icon}</Text>
        <Box marginLeft={1}>
          <Text color={Colors.Primary} bold>
            {String(execution.toolCall.tool)}
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            ({formatDuration(duration)})
          </Text>
        </Box>
        {execution.state === 'executing' && (
          <Box marginLeft={2}>
            <Text color={Colors.Info}>
              [RUNNING]
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render execution parameters
  const renderExecutionParameters = (execution: ToolExecutionEntry): React.ReactNode => {
    if (!showDetails || compact) return null;
    
    return (
      <Box marginTop={1} marginLeft={2}>
        <Text color={Colors.TextDim}>
          Parameters: 
        </Text>
        <Box marginLeft={1}>
          <Text color={Colors.Text}>
            {formatToolParameters(execution.toolCall)}
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Render streaming output
  const renderStreamingOutput = (execution: ToolExecutionEntry): React.ReactNode => {
    if (!enableStreaming || !execution.streamingOutput) return null;
    
    const output = execution.streamingOutput;
    const lines = output.split('\n').slice(-5); // Show last 5 lines
    
    return (
      <Box flexDirection="column" marginTop={1} marginLeft={2} borderStyle="single" borderColor="gray">
        <Box>
          <Text color={Colors.Info} bold>📺 Live Output</Text>
        </Box>
        
        {lines.map((line, index) => (
          <Box key={index} marginTop={index === 0 ? 1 : 0}>
            <Text color={Colors.Text}>
              {line || ' '}
            </Text>
          </Box>
        ))}
        
        {execution.state === 'executing' && (
          <Box marginTop={1}>
            <Text color={Colors.Info}>
              ▶ Streaming...
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render execution result
  const renderExecutionResult = (execution: ToolExecutionEntry): React.ReactNode => {
    if (!execution.result || execution.state === 'executing') return null;
    
    const isError = execution.state === 'failed' || execution.result.error;
    
    return (
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        <Box>
          <Text color={isError ? Colors.Error : Colors.Success} bold>
            {isError ? '❌ Error' : '✅ Result'}
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={isError ? Colors.Error : Colors.Text}>
            {formatToolResult(execution.result)}
          </Text>
        </Box>
        
        {execution.error && (
          <Box marginTop={1}>
            <Text color={Colors.Error}>
              Stack: {execution.error}
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render execution metrics
  const renderExecutionMetrics = (execution: ToolExecutionEntry): React.ReactNode => {
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
              <Text color={Colors.Info}>{memoryUsed.toFixed(1)}MB</Text>
            </Box>
          )}
          
          {cpuUsed && (
            <Box marginLeft={4}>
              <Text color={Colors.Text}>CPU: </Text>
              <Text color={Colors.Info}>{cpuUsed.toFixed(1)}%</Text>
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
  
  // Render single execution entry
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
        {renderExecutionHeader(execution)}
        
        {/* Details (if expanded or not compact) */}
        {(isExpanded || (!compact && showDetails)) && (
          <Box flexDirection="column">
            {renderExecutionParameters(execution)}
            {renderStreamingOutput(execution)}
            {renderExecutionResult(execution)}
            {renderExecutionMetrics(execution)}
          </Box>
        )}
      </Box>
    );
  };
  
  // Render summary statistics
  const renderSummary = (): React.ReactNode => {
    if (compact || !showMetrics) return null;
    
    const stats = {
      total: executions.length,
      executing: executions.filter(e => e.state === 'executing').length,
      completed: executions.filter(e => e.state === 'completed').length,
      failed: executions.filter(e => e.state === 'failed').length,
      avgDuration: executions.filter(e => e.duration).reduce((acc, e) => acc + (e.duration || 0), 0) / executions.filter(e => e.duration).length || 0,
    };
    
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
          <Text color={Colors.Info}>{formatDuration(stats.avgDuration)}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Success Rate: </Text>
            <Text color={stats.total > 0 ? (stats.completed / stats.total > 0.8 ? Colors.Success : Colors.Warning) : Colors.TextDim}>
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </Text>
          </Box>
        </Box>
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
      {renderSummary()}
      
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

/**
 * Hook for managing tool execution tracking
 */
export function useToolExecutionTracking() {
  const [executions, setExecutions] = useState<ToolExecutionEntry[]>([]);
  
  const addExecution = (toolCall: ToolCall): string => {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution: ToolExecutionEntry = {
      id,
      toolCall,
      state: 'pending',
      startTime: Date.now(),
    };
    
    setExecutions(prev => [execution, ...prev]);
    return id;
  };
  
  const updateExecution = (id: string, updates: Partial<ToolExecutionEntry>) => {
    setExecutions(prev => prev.map(exec => 
      exec.id === id ? { ...exec, ...updates } : exec
    ));
  };
  
  const startExecution = (id: string) => {
    updateExecution(id, {
      state: 'executing',
      startTime: Date.now(),
    });
  };
  
  const completeExecution = (id: string, result: ToolResult) => {
    const endTime = Date.now();
    updateExecution(id, {
      state: result.error ? 'failed' : 'completed',
      result,
      endTime,
      duration: endTime - (executions.find(e => e.id === id)?.startTime || endTime),
    });
  };
  
  const updateStreamingOutput = (id: string, output: string) => {
    updateExecution(id, {
      streamingOutput: output,
    });
  };
  
  const clearExecutions = () => {
    setExecutions([]);
  };
  
  return {
    executions,
    addExecution,
    updateExecution,
    startExecution,
    completeExecution,
    updateStreamingOutput,
    clearExecutions,
  };
}

export default ToolExecutionDisplay; 