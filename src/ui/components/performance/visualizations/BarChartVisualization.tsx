/**
 * Bar Chart Visualization Component
 * 
 * Renders a bar chart visualization for multiple metrics or histogram data.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { AnyMetric, HistogramMetric, VisualizationOptions } from '../types';

/**
 * Props for BarChartVisualization
 */
interface BarChartVisualizationProps {
  /**
   * Metrics to visualize (single metric or array)
   */
  metrics: AnyMetric | AnyMetric[];
  
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

/**
 * Data point for bar chart
 */
interface BarData {
  /**
   * Label for the data point
   */
  label: string;
  
  /**
   * Value for the data point
   */
  value: number;
  
  /**
   * Color for the bar
   */
  color?: string;
}

/**
 * Extract bar data from metrics
 * 
 * @param metrics Metrics to extract data from
 * @param options Visualization options
 * @returns Array of bar data
 */
const extractBarData = (metrics: AnyMetric | AnyMetric[], options?: VisualizationOptions): BarData[] => {
  // If it's a single histogram metric, use its buckets
  if (!Array.isArray(metrics) && metrics.type === 'histogram') {
    const histogramMetric = metrics as HistogramMetric;
    return histogramMetric.buckets.map((bucket, index) => ({
      label: bucket.toString(),
      value: histogramMetric.counts[index] || 0,
      color: options?.colors?.primary || 'blue'
    }));
  }
  
  // If it's an array of metrics, use their values
  if (Array.isArray(metrics)) {
    return metrics.map(metric => {
      let value: number;
      if (typeof metric.value === 'number') {
        value = metric.value;
      } else if (Array.isArray(metric.value)) {
        value = metric.value[0] || 0;
      } else if (typeof metric.value === 'object') {
        value = metric.value.mean || 0;
      } else {
        value = 0;
      }
      
      return {
        label: metric.name,
        value,
        color: options?.colors?.primary || 'blue'
      };
    });
  }
  
  // Default case: extract from history
  const history = metrics.history || [];
  return history.slice(-10).map((entry, index) => {
    let value: number;
    if (typeof entry.value === 'number') {
      value = entry.value;
    } else if (Array.isArray(entry.value)) {
      value = entry.value[0] || 0;
    } else if (typeof entry.value === 'object') {
      value = entry.value.mean || 0;
    } else {
      value = 0;
    }
    
    return {
      label: new Date(entry.timestamp).toLocaleTimeString(),
      value,
      color: options?.colors?.primary || 'blue'
    };
  });
};

/**
 * BarChartVisualization component
 */
export const BarChartVisualization: React.FC<BarChartVisualizationProps> = ({
  metrics,
  width,
  height,
  options
}) => {
  // Extract bar data from metrics
  const barData = useMemo(() => extractBarData(metrics, options), [metrics, options]);
  
  // Calculate chart dimensions
  const chartWidth = width - 10;
  const chartHeight = height - 3;
  
  // Calculate the max value for scaling
  const maxValue = Math.max(...barData.map(bar => bar.value));
  
  // Calculate bar width and padding
  const numBars = barData.length;
  const barWidth = Math.max(1, Math.floor(chartWidth / numBars) - 1);
  
  // Generate the bars
  const bars = barData.map((bar, index) => {
    // Calculate bar height
    const barHeight = maxValue > 0 
      ? Math.max(1, Math.floor((bar.value / maxValue) * chartHeight)) 
      : 1;
    
    // Create bar with blocks
    const barBlocks = Array(barHeight).fill('█').join('');
    
    return (
      <Box
        key={index}
        flexDirection="column"
        alignItems="center"
        width={barWidth + 1}
      >
        {/* Bar */}
        <Box flexDirection="column" alignItems="center" height={chartHeight}>
          <Box flexGrow={1} />
          <Text color={bar.color}>{barBlocks}</Text>
        </Box>
        
        {/* Label */}
        <Text dimColor>{bar.label.substring(0, barWidth)}</Text>
      </Box>
    );
  });
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Title */}
      <Text bold>{options?.title || 'Bar Chart'}</Text>
      
      {/* Chart area */}
      <Box height={chartHeight} alignItems="flex-end">
        {bars}
      </Box>
    </Box>
  );
};

export default BarChartVisualization;