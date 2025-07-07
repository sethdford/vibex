/**
 * Line Chart Visualization Component
 * 
 * Renders a line chart visualization for time-series data.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { AnyMetric, VisualizationOptions } from '../types';

/**
 * Props for LineChartVisualization
 */
interface LineChartVisualizationProps {
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
 * Series data point
 */
interface DataPoint {
  /**
   * Timestamp for the data point
   */
  timestamp: number;
  
  /**
   * Value for the data point
   */
  value: number;
}

/**
 * Line series data
 */
interface LineSeries {
  /**
   * Series name
   */
  name: string;
  
  /**
   * Series data points
   */
  data: DataPoint[];
  
  /**
   * Series color
   */
  color: string;
}

/**
 * Extract line series data from metrics
 * 
 * @param metrics Metrics to extract data from
 * @param options Visualization options
 * @returns Array of line series data
 */
const extractSeriesData = (metrics: AnyMetric | AnyMetric[], options?: VisualizationOptions): LineSeries[] => {
  const series: LineSeries[] = [];
  
  // Process single metric
  if (!Array.isArray(metrics)) {
    const history = metrics.history || [];
    
    // Create data points from history
    const data: DataPoint[] = history.map(entry => {
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
        timestamp: entry.timestamp,
        value
      };
    });
    
    // Add current value
    let currentValue: number;
    if (typeof metrics.value === 'number') {
      currentValue = metrics.value;
    } else if (Array.isArray(metrics.value)) {
      currentValue = metrics.value[0] || 0;
    } else if (typeof metrics.value === 'object') {
      currentValue = metrics.value.mean || 0;
    } else {
      currentValue = 0;
    }
    
    data.push({
      timestamp: metrics.timestamp,
      value: currentValue
    });
    
    series.push({
      name: metrics.name,
      data,
      color: options?.colors?.primary || 'blue'
    });
    
    return series;
  }
  
  // Process multiple metrics
  return metrics.map((metric, index) => {
    const history = metric.history || [];
    
    // Create data points from history
    const data: DataPoint[] = history.map(entry => {
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
        timestamp: entry.timestamp,
        value
      };
    });
    
    // Add current value
    let currentValue: number;
    if (typeof metric.value === 'number') {
      currentValue = metric.value;
    } else if (Array.isArray(metric.value)) {
      currentValue = metric.value[0] || 0;
    } else if (typeof metric.value === 'object') {
      currentValue = metric.value.mean || 0;
    } else {
      currentValue = 0;
    }
    
    data.push({
      timestamp: metric.timestamp,
      value: currentValue
    });
    
    // Assign color based on index
    const colors = [
      'blue', 'green', 'red', 'yellow', 'magenta', 'cyan'
    ];
    
    return {
      name: metric.name,
      data,
      color: colors[index % colors.length]
    };
  });
};

/**
 * LineChartVisualization component
 */
export const LineChartVisualization: React.FC<LineChartVisualizationProps> = ({
  metrics,
  width,
  height,
  options
}) => {
  // Extract series data from metrics
  const seriesData = useMemo(() => extractSeriesData(metrics, options), [metrics, options]);
  
  // Calculate chart dimensions
  const chartWidth = width - 10;
  const chartHeight = height - 4;
  
  // Find the min and max timestamps
  const allTimestamps = seriesData.flatMap(series => series.data.map(point => point.timestamp));
  const minTimestamp = Math.min(...allTimestamps);
  const maxTimestamp = Math.max(...allTimestamps);
  
  // Find the min and max values
  const allValues = seriesData.flatMap(series => series.data.map(point => point.value));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue || 1;
  
  // Create a 2D grid for the chart
  const grid: string[][] = Array(chartHeight)
    .fill(null)
    .map(() => Array(chartWidth).fill(' '));
  
  // Plot each series on the grid
  seriesData.forEach(series => {
    const points = series.data;
    const sortedPoints = [...points].sort((a, b) => a.timestamp - b.timestamp);
    
    // Plot each point
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const point1 = sortedPoints[i];
      const point2 = sortedPoints[i + 1];
      
      // Calculate grid coordinates
      const x1 = Math.floor(((point1.timestamp - minTimestamp) / (maxTimestamp - minTimestamp)) * (chartWidth - 1));
      const y1 = chartHeight - 1 - Math.floor(((point1.value - minValue) / valueRange) * (chartHeight - 1));
      
      const x2 = Math.floor(((point2.timestamp - minTimestamp) / (maxTimestamp - minTimestamp)) * (chartWidth - 1));
      const y2 = chartHeight - 1 - Math.floor(((point2.value - minValue) / valueRange) * (chartHeight - 1));
      
      // Draw line between points (simplified Bresenham's algorithm)
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const sx = x1 < x2 ? 1 : -1;
      const sy = y1 < y2 ? 1 : -1;
      let err = dx - dy;
      
      let x = x1;
      let y = y1;
      
      while (true) {
        if (x >= 0 && x < chartWidth && y >= 0 && y < chartHeight) {
          grid[y][x] = '•';
        }
        
        if (x === x2 && y === y2) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
      }
    }
  });
  
  // Generate chart rows from grid
  const chartRows = grid.map(row => row.join(''));
  
  // Create y-axis labels
  const yLabels = [
    maxValue.toFixed(1),
    ((maxValue + minValue) / 2).toFixed(1),
    minValue.toFixed(1)
  ];
  
  // Create time labels for x-axis
  const timeFormat = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
  const startTime = timeFormat.format(new Date(minTimestamp));
  const endTime = timeFormat.format(new Date(maxTimestamp));
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Title */}
      <Text bold>{options?.title || 'Line Chart'}</Text>
      
      {/* Chart area with y-axis labels */}
      <Box height={chartHeight}>
        {/* Y-axis labels */}
        <Box flexDirection="column" width={8}>
          <Text>{yLabels[0]}</Text>
          <Box flexGrow={1} />
          <Text>{yLabels[1]}</Text>
          <Box flexGrow={1} />
          <Text>{yLabels[2]}</Text>
        </Box>
        
        {/* Chart */}
        <Box flexDirection="column" flexGrow={1}>
          {chartRows.map((row, index) => (
            <Text key={index}>{row}</Text>
          ))}
        </Box>
      </Box>
      
      {/* X-axis labels */}
      <Box>
        <Box width={8} />
        <Text>{startTime}</Text>
        <Box flexGrow={1} />
        <Text>{endTime}</Text>
      </Box>
      
      {/* Legend */}
      {seriesData.length > 1 && (
        <Box>
          <Box width={8} />
          {seriesData.map((series, index) => (
            <Box key={index} marginRight={2}>
              <Text color={series.color}>• {series.name}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LineChartVisualization;