/**
 * Sparkline Visualization Component
 * 
 * Renders a simple sparkline for time-series data.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { AnyMetric, VisualizationOptions } from '../types';

/**
 * Props for SparklineVisualization
 */
interface SparklineVisualizationProps {
  /**
   * Metric to visualize
   */
  metric: AnyMetric;
  
  /**
   * Width of the visualization
   */
  width: number;
  
  /**
   * Height of the visualization
   */
  height: number;
  
  /**
   * Visualization options
   */
  options?: VisualizationOptions;
}

// Unicode block characters for sparkline visualization
const SPARKLINE_CHARS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * Generate sparkline data from metric history
 * 
 * @param metric Metric with history
 * @param width Width of the sparkline
 * @param options Visualization options
 * @returns Array of normalized values (0-8) for sparkline
 */
const generateSparklineData = (metric: AnyMetric, width: number, options?: VisualizationOptions): number[] => {
  // Use history data if available
  const history = metric.history || [];
  
  // Extract values from history
  const values: number[] = [];
  for (const entry of history) {
    if (typeof entry.value === 'number') {
      values.push(entry.value);
    } else if (Array.isArray(entry.value)) {
      values.push(entry.value[0] || 0);
    } else if (typeof entry.value === 'object') {
      values.push(entry.value.mean || 0);
    }
  }
  
  // Add current value
  if (typeof metric.value === 'number') {
    values.push(metric.value);
  } else if (Array.isArray(metric.value)) {
    values.push(metric.value[0] || 0);
  } else if (typeof metric.value === 'object') {
    values.push(metric.value.mean || 0);
  }
  
  // If not enough data, pad with zeros
  if (values.length < width) {
    values.unshift(...Array(width - values.length).fill(0));
  }
  
  // If too much data, take the most recent
  if (values.length > width) {
    values.splice(0, values.length - width);
  }
  
  // Normalize values to 0-8 range for sparkline
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  return values.map(value => {
    const normalized = (value - min) / range;
    return Math.round(normalized * 8);
  });
};

/**
 * Get the trend direction and percentage change
 * 
 * @param data Sparkline data
 * @returns Object with trend and percentage
 */
const getTrend = (data: number[]): { direction: 'up' | 'down' | 'flat', percentage: number } => {
  if (data.length < 2) {
    return { direction: 'flat', percentage: 0 };
  }
  
  const first = data[0];
  const last = data[data.length - 1];
  
  if (first === last) {
    return { direction: 'flat', percentage: 0 };
  }
  
  const percentage = ((last - first) / first) * 100;
  
  return {
    direction: last > first ? 'up' : 'down',
    percentage: Math.abs(percentage)
  };
};

/**
 * SparklineVisualization component
 */
export const SparklineVisualization: React.FC<SparklineVisualizationProps> = ({
  metric,
  width,
  height,
  options
}) => {
  // Generate sparkline data
  const sparklineWidth = Math.max(width - 10, 10);
  const sparklineData = useMemo(() => 
    generateSparklineData(metric, sparklineWidth, options),
    [metric, sparklineWidth, options]
  );
  
  // Get trend information
  const trend = useMemo(() => getTrend(sparklineData), [sparklineData]);
  
  // Format the value
  const formattedValue = useMemo(() => {
    let value: number;
    
    // Extract value based on metric type
    if (typeof metric.value === 'number') {
      value = metric.value;
    } else if (Array.isArray(metric.value)) {
      value = metric.value[0] || 0;
    } else if (typeof metric.value === 'object') {
      value = metric.value.mean || 0;
    } else {
      value = 0;
    }
    
    // Format with precision
    const precision = options?.precision ?? 1;
    return value.toFixed(precision);
  }, [metric.value, options]);
  
  // Create sparkline text
  const sparkline = sparklineData.map(val => SPARKLINE_CHARS[val]).join('');
  
  // Determine trend color and symbol
  const trendColor = trend.direction === 'up' ? 'green' : trend.direction === 'down' ? 'red' : 'gray';
  const trendSymbol = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Title and value */}
      <Box>
        <Text bold>{options?.title || metric.name}</Text>
        <Box flexGrow={1} />
        <Text>
          {formattedValue} {metric.unit}
        </Text>
      </Box>
      
      {/* Sparkline visualization */}
      <Box>
        <Text>{sparkline}</Text>
      </Box>
      
      {/* Trend indicator */}
      <Box>
        <Box flexGrow={1} />
        <Text color={trendColor}>
          {trendSymbol} {trend.percentage.toFixed(1)}%
        </Text>
      </Box>
    </Box>
  );
};

export default SparklineVisualization;