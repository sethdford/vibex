/**
 * Performance Dashboard Example
 * 
 * Example implementation of the Performance Dashboard with sample metrics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { 
  PerformanceDashboard, 
  usePerformanceMetrics,
  MetricType,
  MetricCategory,
  VisualizationType,
  AnyMetric,
  DashboardConfig
} from './index';

// Example dashboard props
interface PerformanceDashboardExampleProps {
  width?: number;
  height?: number;
}

/**
 * Sample dashboard configuration
 */
const SAMPLE_DASHBOARD_CONFIG: DashboardConfig = {
  title: 'Vibex Performance Dashboard',
  description: 'Real-time performance monitoring',
  layout: [
    { id: 'cpu', x: 0, y: 0, width: 1, height: 1 },
    { id: 'memory', x: 1, y: 0, width: 1, height: 1 },
    { id: 'heap', x: 0, y: 1, width: 1, height: 1 },
    { id: 'event_loop', x: 1, y: 1, width: 1, height: 1 },
    { id: 'memory_history', x: 0, y: 2, width: 2, height: 1 }
  ],
  panels: [
    {
      id: 'cpu',
      title: 'CPU Usage',
      metrics: ['system.cpu.load1'],
      visualization: {
        type: VisualizationType.GAUGE,
        warningThreshold: 70,
        criticalThreshold: 90
      }
    },
    {
      id: 'memory',
      title: 'Memory Usage',
      metrics: ['system.memory.percentUsed'],
      visualization: {
        type: VisualizationType.GAUGE,
        warningThreshold: 75,
        criticalThreshold: 90
      }
    },
    {
      id: 'heap',
      title: 'Heap Memory',
      metrics: ['system.memory.heapUsed'],
      visualization: {
        type: VisualizationType.SPARKLINE
      }
    },
    {
      id: 'event_loop',
      title: 'Event Loop Lag',
      metrics: ['runtime.eventLoopLag'],
      visualization: {
        type: VisualizationType.SPARKLINE
      }
    },
    {
      id: 'memory_history',
      title: 'Memory History',
      metrics: ['system.memory.heapUsed', 'system.memory.external'],
      visualization: {
        type: VisualizationType.LINE_CHART,
        showLegend: true
      }
    }
  ],
  refreshInterval: 1000
};

/**
 * Create some custom application metrics for demonstration
 * 
 * @param metrics Performance metrics hook
 */
const setupCustomMetrics = (metrics: ReturnType<typeof usePerformanceMetrics>) => {
  // Example request counter
  metrics.createCounter('app.requests.total', 'Total Requests', 0, {
    category: MetricCategory.APPLICATION,
    unit: 'requests',
    tags: ['api', 'requests']
  });
  
  // Example response time
  metrics.createGauge('app.response.time', 'Response Time', 0, {
    category: MetricCategory.APPLICATION,
    unit: 'ms',
    tags: ['api', 'performance']
  });
  
  // Example error counter
  metrics.createCounter('app.errors.total', 'Total Errors', 0, {
    category: MetricCategory.APPLICATION,
    unit: 'errors',
    tags: ['api', 'errors']
  });
  
  // Example cache hit ratio
  metrics.createGauge('app.cache.hitRatio', 'Cache Hit Ratio', 0, {
    category: MetricCategory.APPLICATION,
    unit: '%',
    tags: ['cache', 'performance']
  });
};

/**
 * Simulate application metrics changing
 * 
 * @param metrics Performance metrics hook
 */
const simulateApplicationActivity = (metrics: ReturnType<typeof usePerformanceMetrics>) => {
  // Simulate requests
  const requestCount = Math.floor(Math.random() * 10) + 1;
  metrics.createCounter('app.requests.total', 'Total Requests', requestCount, {
    category: MetricCategory.APPLICATION,
    unit: 'requests',
    tags: ['api', 'requests']
  });
  
  // Simulate response time
  const responseTime = Math.random() * 200 + 50;
  metrics.createGauge('app.response.time', 'Response Time', responseTime, {
    category: MetricCategory.APPLICATION,
    unit: 'ms',
    tags: ['api', 'performance']
  });
  
  // Simulate occasional errors
  if (Math.random() < 0.2) {
    metrics.createCounter('app.errors.total', 'Total Errors', 1, {
      category: MetricCategory.APPLICATION,
      unit: 'errors',
      tags: ['api', 'errors']
    });
  }
  
  // Simulate cache hit ratio
  const hitRatio = Math.random() * 30 + 70; // 70-100%
  metrics.createGauge('app.cache.hitRatio', 'Cache Hit Ratio', hitRatio, {
    category: MetricCategory.APPLICATION,
    unit: '%',
    tags: ['cache', 'performance']
  });
};

/**
 * Performance Dashboard Example Component
 */
export const PerformanceDashboardExample: React.FC<PerformanceDashboardExampleProps> = ({
  width = 120,
  height = 30
}) => {
  // Performance metrics hook
  const performanceMetrics = usePerformanceMetrics({
    realTime: true,
    updateInterval: 1000
  });
  
  // Selected metric state
  const [selectedMetric, setSelectedMetric] = useState<AnyMetric | undefined>(undefined);
  
  // Dashboard focus state
  const [dashboardFocused, setDashboardFocused] = useState<boolean>(true);
  
  // Setup custom metrics
  useEffect(() => {
    setupCustomMetrics(performanceMetrics);
    
    // Simulate application activity periodically
    const interval = setInterval(() => {
      simulateApplicationActivity(performanceMetrics);
    }, 2000);
    
    return () => {
      clearInterval(interval);
      performanceMetrics.dispose();
    };
  }, [performanceMetrics]);
  
  // Handle metric selection
  const handleMetricSelect = useCallback((metric: AnyMetric) => {
    setSelectedMetric(metric);
  }, []);
  
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>Performance Dashboard Example</Text>
      </Box>
      
      <Box flexDirection="column" height={height}>
        {/* Main dashboard */}
        <Box height={height - 5}>
          <PerformanceDashboard
            width={width}
            height={height - 5}
            config={SAMPLE_DASHBOARD_CONFIG}
            realTime={true}
            updateInterval={1000}
            isFocused={dashboardFocused}
            onFocusChange={setDashboardFocused}
            onMetricSelect={handleMetricSelect}
          />
        </Box>
        
        {/* Details panel for selected metric */}
        <Box height={5} borderStyle="single" borderColor="gray" flexDirection="column">
          {selectedMetric ? (
            <>
              <Box>
                <Text bold>Selected Metric: </Text>
                <Text>{selectedMetric.name} ({selectedMetric.id})</Text>
              </Box>
              <Box>
                <Text>Type: </Text>
                <Text>{selectedMetric.type}</Text>
                <Box marginLeft={2} />
                <Text>Category: </Text>
                <Text>{selectedMetric.category}</Text>
                <Box marginLeft={2} />
                <Text>Value: </Text>
                <Text>
                  {typeof selectedMetric.value === 'object' 
                    ? JSON.stringify(selectedMetric.value) 
                    : selectedMetric.value
                  }
                  {selectedMetric.unit ? ` ${selectedMetric.unit}` : ''}
                </Text>
              </Box>
              <Box>
                <Text>Tags: </Text>
                <Text>{selectedMetric.tags?.join(', ') || 'none'}</Text>
              </Box>
              {selectedMetric.description && (
                <Box>
                  <Text>Description: </Text>
                  <Text>{selectedMetric.description}</Text>
                </Box>
              )}
            </>
          ) : (
            <Box alignItems="center" justifyContent="center" height={5}>
              <Text dimColor>Select a metric panel to view details</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PerformanceDashboardExample;