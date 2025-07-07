/**
 * Formatting Service
 * 
 * Handles all data formatting for tool execution display.
 * Provides consistent formatting for durations, parameters, results, and other data.
 */

import type { ToolCall, ToolResult } from '../../../ai/content-stream.js';
import type { ToolExecutionState, StateIconConfig } from './types.js';
import { Colors } from '../../colors.js';

/**
 * Formatting service factory
 */
export function createFormattingService() {
  
  /**
   * Format duration from milliseconds to human-readable string
   */
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  /**
   * Format tool parameters for display
   */
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

  /**
   * Format tool result for display
   */
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

  /**
   * Get execution state icon and color
   */
  const getExecutionStateIcon = (state: ToolExecutionState): StateIconConfig => {
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

  /**
   * Format streaming output for display
   */
  const formatStreamingOutput = (output: string, maxLines: number = 5): string[] => {
    return output.split('\n').slice(-maxLines);
  };

  /**
   * Format memory usage
   */
  const formatMemoryUsage = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  /**
   * Format CPU usage
   */
  const formatCpuUsage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  /**
   * Format success rate
   */
  const formatSuccessRate = (rate: number): string => {
    return `${Math.round(rate * 100)}%`;
  };

  return {
    formatDuration,
    formatToolParameters,
    formatToolResult,
    getExecutionStateIcon,
    formatStreamingOutput,
    formatMemoryUsage,
    formatCpuUsage,
    formatSuccessRate,
  };
} 