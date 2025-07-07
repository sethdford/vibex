/**
 * Performance Dashboard Component
 * 
 * Main component for visualizing system and application performance metrics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { 
  AnyMetric, 
  DashboardConfig, 
  PerformanceDashboardProps, 
  MetricCategory 
} from './types';
import { PerformancePanel } from './PerformancePanel';
import { MetricsCollector } from './MetricsCollector';

/**
 * Default dashboard config
 */
const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  title: 'Performance Dashboard',
  description: 'System and application performance metrics',
  layout: [
    { id: 'cpu', x: 0, y: 0, width: 1, height: 1 },
    { id: 'memory', x: 1, y: 0, width: 1, height: 1 },
    { id: 'eventLoop', x: 0, y: 1, width: 1, height: 1 },
    { id: 'uptime', x: 1, y: 1, width: 1, height: 1 },
    { id: 'memoryHistory', x: 0, y: 2, width: 2, height: 1 }
  ],
  panels: [
    {
      id: 'cpu',
      title: 'CPU Usage',
      metrics: ['system.cpu.percentUsed'],
      visualization: {
        type: 'gauge',
        warningThreshold: 70,
        criticalThreshold: 90,
        showAxes: true,
        showGrid: true
      }
    },
    {
      id: 'memory',
      title: 'Memory Usage',
      metrics: ['system.memory.percentUsed'],
      visualization: {
        type: 'gauge',
        warningThreshold: 80,
        criticalThreshold: 95,
        showAxes: true,
        showGrid: true
      }
    },
    {
      id: 'eventLoop',
      title: 'Event Loop Lag',
      metrics: ['runtime.eventLoopLag'],
      visualization: {
        type: 'sparkline',
        showGrid: true
      }
    },
    {
      id: 'uptime',
      title: 'System Uptime',
      metrics: ['runtime.uptime'],
      visualization: {
        type: 'number',
        precision: 0,
        unit: 's'
      }
    },
    {
      id: 'memoryHistory',
      title: 'Memory History',
      metrics: ['system.memory.heapUsed', 'system.memory.rss'],
      visualization: {
        type: 'line_chart',
        showAxes: true,
        showGrid: true,
        showLegend: true
      }
    }
  ],
  refreshInterval: 1000
};

/**
 * PerformanceDashboard component
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  width,
  height,
  initialMetrics,
  config: userConfig,
  realTime = true,
  updateInterval = 1000,
  isFocused = true,
  onFocusChange,
  onMetricSelect
}) => {
  // Merge user config with default config
  const config = userConfig ? {
    ...DEFAULT_DASHBOARD_CONFIG,
    ...userConfig,
    panels: userConfig.panels || DEFAULT_DASHBOARD_CONFIG.panels
  } : DEFAULT_DASHBOARD_CONFIG;
  
  // State for focus and metrics
  const [focused, setFocused] = useState<boolean>(isFocused);
  const [selectedPanelIndex, setSelectedPanelIndex] = useState<number>(0);
  const [metrics, setMetrics] = useState<AnyMetric[]>(initialMetrics || []);
  
  // Create metrics collector
  const [metricsCollector] = useState<MetricsCollector>(() => 
    new MetricsCollector({ systemMetricsInterval: updateInterval })
  );
  
  // Calculate panel dimensions based on grid
  const calculatePanelDimensions = (
    panelLayout: { x: number, y: number, width: number, height: number }
  ) => {
    // Find max grid dimensions
    const maxGridX = Math.max(...config.layout.map(item => item.x + item.width));
    const maxGridY = Math.max(...config.layout.map(item => item.y + item.height));
    
    // Calculate cell size
    const cellWidth = Math.floor(width / maxGridX);
    const cellHeight = Math.floor(height / maxGridY);
    
    // Calculate panel dimensions
    return {
      left: panelLayout.x * cellWidth,
      top: panelLayout.y * cellHeight,
      width: panelLayout.width * cellWidth,
      height: panelLayout.height * cellHeight
    };
  };
  
  // Update metrics periodically
  useEffect(() => {
    if (!realTime) return;
    
    const updateMetrics = () => {
      const allMetrics = metricsCollector.getAllMetrics();
      setMetrics([...allMetrics]);
    };
    
    // Initial update
    updateMetrics();
    
    // Setup interval for updates
    const intervalId = setInterval(updateMetrics, updateInterval);
    
    return () => {
      clearInterval(intervalId);
      metricsCollector.dispose();
    };
  }, [realTime, updateInterval, metricsCollector]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!focused) return;
    
    // Navigate between panels
    if (key.tab) {
      setSelectedPanelIndex(prev => (prev + 1) % config.panels.length);
    }
    
    // Toggle focus
    if (key.escape) {
      setFocused(false);
      if (onFocusChange) {
        onFocusChange(false);
      }
    }
    
    // Select panel with number keys
    const num = Number(input);
    if (!isNaN(num) && num >= 1 && num <= config.panels.length) {
      setSelectedPanelIndex(num - 1);
    }
  });
  
  // Find metrics by ID
  const findMetricsByIds = useCallback((ids: string[]): AnyMetric[] => {
    return ids.map(id => {
      const metric = metrics.find(m => m.id === id);
      return metric || {
        id,
        name: id,
        type: 'gauge',
        category: MetricCategory.CUSTOM,
        value: 0,
        timestamp: Date.now()
      };
    });
  }, [metrics]);
  
  // Handle panel click
  const handlePanelClick = useCallback((index: number) => {
    setSelectedPanelIndex(index);
    
    const panelConfig = config.panels[index];
    const panelMetrics = findMetricsByIds(panelConfig.metrics);
    
    if (onMetricSelect && panelMetrics.length > 0) {
      onMetricSelect(panelMetrics[0]);
    }
  }, [config.panels, findMetricsByIds, onMetricSelect]);
  
  return (
    <Box 
      width={width} 
      height={height} 
      flexDirection="column" 
      borderStyle={focused ? 'double' : 'single'}
      borderColor={focused ? 'blue' : 'gray'}
    >
      {/* Dashboard header */}
      <Box>
        <Text bold>{config.title}</Text>
        {focused && (
          <Text dimColor> (Use Tab to navigate, Esc to blur)</Text>
        )}
      </Box>
      
      {/* Dashboard panels */}
      <Box flexGrow={1} flexDirection="column" position="relative">
        {config.panels.map((panel, index) => {
          const layout = config.layout.find(l => l.id === panel.id);
          if (!layout) return null;
          
          const { left, top, width: panelWidth, height: panelHeight } = calculatePanelDimensions(layout);
          const panelMetrics = findMetricsByIds(panel.metrics);
          
          return (
            <Box 
              key={panel.id} 
              position="absolute" 
              left={left} 
              top={top}
              width={panelWidth} 
              height={panelHeight}
            >
              <PerformancePanel
                title={panel.title}
                metrics={panelMetrics.length === 1 ? panelMetrics[0] : panelMetrics}
                width={panelWidth}
                height={panelHeight}
                visualization={panel.visualization}
                isSelected={focused && index === selectedPanelIndex}
                onClick={() => handlePanelClick(index)}
              />
            </Box>
          );
        })}
      </Box>
      
      {/* Status bar */}
      <Box>
        <Text dimColor>
          {metrics.length} metrics • Last update: {new Date().toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
};

export default PerformanceDashboard;