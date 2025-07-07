/**
 * Performance Panel Component
 * 
 * Renders a single performance metric panel with visualization.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { 
  AnyMetric, 
  VisualizationType, 
  VisualizationOptions 
} from './types';
import {
  GaugeVisualization,
  SparklineVisualization,
  BarChartVisualization,
  LineChartVisualization
} from './visualizations';

/**
 * Props for PerformancePanel
 */
interface PerformancePanelProps {
  /**
   * Title for the panel
   */
  title: string;
  
  /**
   * Metrics to display (single metric or array)
   */
  metrics: AnyMetric | AnyMetric[];
  
  /**
   * Width of the panel
   */
  width: number;
  
  /**
   * Height of the panel
   */
  height: number;
  
  /**
   * Visualization options
   */
  visualization: VisualizationOptions;
  
  /**
   * Whether the panel is selected
   */
  isSelected?: boolean;
  
  /**
   * Callback when panel is clicked
   */
  onClick?: () => void;
}

/**
 * PerformancePanel component
 */
export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  title,
  metrics,
  width,
  height,
  visualization,
  isSelected = false,
  onClick
}) => {
  // Visualization component based on type
  const renderVisualization = () => {
    // Adjust dimensions for inner visualization
    const innerWidth = width - 2;
    const innerHeight = height - 2;
    
    // Include title in visualization options
    const options = {
      ...visualization,
      title: title || visualization.title
    };
    
    switch (visualization.type) {
      case VisualizationType.GAUGE:
        return (
          <GaugeVisualization
            metric={Array.isArray(metrics) ? metrics[0] : metrics}
            width={innerWidth}
            height={innerHeight}
            options={options}
          />
        );
      case VisualizationType.SPARKLINE:
        return (
          <SparklineVisualization
            metric={Array.isArray(metrics) ? metrics[0] : metrics}
            width={innerWidth}
            height={innerHeight}
            options={options}
          />
        );
      case VisualizationType.BAR_CHART:
        return (
          <BarChartVisualization
            metrics={metrics}
            width={innerWidth}
            height={innerHeight}
            options={options}
          />
        );
      case VisualizationType.LINE_CHART:
        return (
          <LineChartVisualization
            metrics={metrics}
            width={innerWidth}
            height={innerHeight}
            options={options}
          />
        );
      default:
        return (
          <Box width={innerWidth} height={innerHeight} alignItems="center" justifyContent="center">
            <Text>Unsupported visualization type</Text>
          </Box>
        );
    }
  };
  
  return (
    <Box
      width={width}
      height={height}
      borderStyle={isSelected ? 'double' : 'single'}
      borderColor={isSelected ? 'blue' : 'gray'}
      flexDirection="column"
      onClick={onClick}
    >
      {renderVisualization()}
    </Box>
  );
};

export default PerformancePanel;