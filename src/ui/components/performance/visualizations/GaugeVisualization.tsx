/**
 * Gauge Visualization Component
 * 
 * Renders a gauge visualization for numeric metrics.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { AnyMetric, GaugeMetric, VisualizationOptions } from '../types';

/**
 * Props for GaugeVisualization
 */
interface GaugeVisualizationProps {
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

/**
 * Get normalized value as percentage (0-100)
 * 
 * @param metric Metric to normalize
 * @param options Visualization options
 * @returns Normalized percentage
 */
const getNormalizedValue = (metric: AnyMetric, options?: VisualizationOptions): number => {
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
  
  // Get min and max from options or metric
  const min = options?.min ?? (metric as GaugeMetric).min ?? 0;
  const max = options?.max ?? (metric as GaugeMetric).max ?? 100;
  
  // Normalize to 0-100
  return ((value - min) / (max - min)) * 100;
};

/**
 * Get color based on value and thresholds
 * 
 * @param percentage Normalized percentage (0-100)
 * @param metric Metric with possible thresholds
 * @param options Visualization options
 * @returns Color string
 */
const getColor = (percentage: number, metric: AnyMetric, options?: VisualizationOptions): string => {
  // Get thresholds
  const warningThreshold = options?.warningThreshold ?? metric.warningThreshold ?? 70;
  const criticalThreshold = options?.criticalThreshold ?? metric.criticalThreshold ?? 90;
  
  if (percentage >= criticalThreshold) {
    return options?.colors?.danger || 'red';
  } else if (percentage >= warningThreshold) {
    return options?.colors?.warning || 'yellow';
  } else {
    return options?.colors?.success || 'green';
  }
};

/**
 * GaugeVisualization component
 */
export const GaugeVisualization: React.FC<GaugeVisualizationProps> = ({
  metric,
  width,
  height,
  options
}) => {
  // Calculate normalized percentage
  const percentage = useMemo(() => getNormalizedValue(metric, options), [metric, options]);
  
  // Calculate color based on thresholds
  const color = useMemo(() => getColor(percentage, metric, options), [percentage, metric, options]);
  
  // Calculate gauge characters
  const gaugeWidth = Math.max(width - 10, 10);
  const filledChars = Math.round((percentage / 100) * gaugeWidth);
  const emptyChars = gaugeWidth - filledChars;
  
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
      
      {/* Gauge visualization */}
      <Box>
        <Text>
          {'['}<Text color={color}>{'\u2588'.repeat(filledChars)}</Text>{'\u2591'.repeat(emptyChars)}{']'}
        </Text>
      </Box>
      
      {/* Percentage */}
      <Box>
        <Box flexGrow={1} />
        <Text color={color}>{percentage.toFixed(0)}%</Text>
      </Box>
    </Box>
  );
};

export default GaugeVisualization;