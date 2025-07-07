# Performance Dashboard

A comprehensive, terminal-based performance monitoring system for Vibex. This component provides real-time visualization of system and application metrics with multiple visualization types and an extensible architecture.

## Features

- **Real-time Metrics Collection**: Automatically collects system and runtime metrics
- **Multiple Visualization Types**: Gauges, sparklines, bar charts, line charts, and more
- **Customizable Dashboard Layouts**: Flexible grid-based layout system
- **Custom Application Metrics**: Easy API for tracking application-specific metrics
- **Interactive Navigation**: Keyboard navigation between panels and metrics
- **Threshold-based Alerts**: Visual indicators for warning and critical thresholds
- **Historical Data**: Time-series tracking for trend analysis
- **Low Overhead**: Optimized collection and rendering for minimal performance impact

## Components

### Main Components

- `PerformanceDashboard`: Main dashboard component with panels and layout
- `PerformancePanel`: Single metric panel with visualization
- `MetricsCollector`: Core metrics collection and management

### Visualization Components

- `GaugeVisualization`: Displays numeric metrics as a gauge with thresholds
- `SparklineVisualization`: Compact time-series visualization with trend indicator
- `BarChartVisualization`: Displays multiple metrics or histogram data as bars
- `LineChartVisualization`: Time-series line chart for multiple metrics

### Custom Hooks

- `usePerformanceMetrics`: React hook for metrics collection and management

## Usage

### Basic Example

```tsx
import { 
  PerformanceDashboard, 
  VisualizationType, 
  MetricCategory 
} from './components/performance';

// Simple dashboard
const MyDashboard = () => (
  <PerformanceDashboard
    width={120}
    height={40}
    realTime={true}
    updateInterval={1000}
  />
);
```

### Custom Dashboard Configuration

```tsx
import { 
  PerformanceDashboard, 
  VisualizationType 
} from './components/performance';

// Custom dashboard config
const dashboardConfig = {
  title: 'My Application Dashboard',
  layout: [
    { id: 'cpu', x: 0, y: 0, width: 1, height: 1 },
    { id: 'memory', x: 1, y: 0, width: 1, height: 1 },
    { id: 'requests', x: 0, y: 1, width: 2, height: 1 }
  ],
  panels: [
    {
      id: 'cpu',
      title: 'CPU Usage',
      metrics: ['system.cpu.percentUsed'],
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
        warningThreshold: 80,
        criticalThreshold: 95
      }
    },
    {
      id: 'requests',
      title: 'Request Rate',
      metrics: ['app.requests.rate'],
      visualization: {
        type: VisualizationType.LINE_CHART,
        showAxes: true,
        showGrid: true
      }
    }
  ],
  refreshInterval: 1000
};

// Render dashboard with custom config
const MyCustomDashboard = () => (
  <PerformanceDashboard
    width={120}
    height={40}
    config={dashboardConfig}
    realTime={true}
  />
);
```

### Custom Application Metrics

```tsx
import { 
  usePerformanceMetrics, 
  PerformanceDashboard,
  MetricCategory 
} from './components/performance';

const MyMonitoredApp = () => {
  // Get performance metrics hook
  const metrics = usePerformanceMetrics();
  
  // Track a request
  const handleRequest = async (req) => {
    // Start request timer
    metrics.startTimer('api.request');
    
    try {
      // Process request
      const result = await processRequest(req);
      
      // Stop timer and record successful request
      metrics.stopTimer('api.request', 'API Request Time', {
        category: MetricCategory.APPLICATION,
        unit: 'ms',
        tags: ['api', 'request']
      });
      
      // Count successful requests
      metrics.createCounter('api.requests.success', 'Successful Requests', 1, {
        category: MetricCategory.APPLICATION,
        tags: ['api', 'success']
      });
      
      return result;
    } catch (error) {
      // Count errors
      metrics.createCounter('api.requests.error', 'Failed Requests', 1, {
        category: MetricCategory.APPLICATION,
        tags: ['api', 'error']
      });
      
      throw error;
    }
  };
  
  return (
    <>
      {/* Application UI */}
      <MyAppUI onRequest={handleRequest} />
      
      {/* Performance dashboard */}
      <PerformanceDashboard
        width={120}
        height={40}
        realTime={true}
      />
    </>
  );
};
```

## Metrics Collection

The `MetricsCollector` class and `usePerformanceMetrics` hook provide these metric types:

### Counter Metrics

Track discrete events that occur over time.

```typescript
// Create or increment counter
metrics.createCounter('app.requests.total', 'Total Requests', 1, {
  category: MetricCategory.APPLICATION,
  unit: 'requests',
  tags: ['api']
});
```

### Gauge Metrics

Track a value that can go up or down.

```typescript
// Record current connection count
metrics.createGauge('app.connections.current', 'Active Connections', 42, {
  category: MetricCategory.APPLICATION,
  unit: 'connections',
  tags: ['network']
});
```

### Timer Metrics

Measure duration of operations.

```typescript
// Start timing an operation
metrics.startTimer('app.database.query');

// ... later, stop the timer and record the duration
metrics.stopTimer('app.database.query', 'Database Query Time', {
  category: MetricCategory.DATABASE,
  unit: 'ms',
  tags: ['database', 'query']
});
```

### Histogram Metrics

Track distribution of values.

```typescript
// Record response sizes
metrics.updateHistogram('app.response.size', 'Response Size', 1024, {
  category: MetricCategory.APPLICATION,
  unit: 'bytes',
  tags: ['api', 'response'],
  buckets: [0, 1024, 10240, 102400, 1048576]
});
```

## Built-in System Metrics

The dashboard automatically collects these system metrics:

### CPU Metrics

- `system.cpu.user`: CPU time spent in user mode
- `system.cpu.system`: CPU time spent in system mode
- `system.cpu.load1`: 1-minute load average
- `system.cpu.load5`: 5-minute load average
- `system.cpu.load15`: 15-minute load average

### Memory Metrics

- `system.memory.total`: Total system memory
- `system.memory.free`: Free system memory
- `system.memory.used`: Used system memory
- `system.memory.percentUsed`: Percentage of memory used
- `system.memory.rss`: Resident set size of the process
- `system.memory.heapTotal`: Total heap memory allocated
- `system.memory.heapUsed`: Currently used heap memory
- `system.memory.external`: Memory used by C++ objects bound to JavaScript objects

### Runtime Metrics

- `runtime.uptime`: Process uptime in seconds
- `runtime.eventLoopLag`: Event loop lag in milliseconds

## Visualization Types

The dashboard supports the following visualization types:

### Gauge

Displays a value as a gauge with optional thresholds.

```typescript
{
  type: VisualizationType.GAUGE,
  warningThreshold: 70,
  criticalThreshold: 90,
  min: 0,
  max: 100
}
```

### Sparkline

Compact time-series visualization with trend indicator.

```typescript
{
  type: VisualizationType.SPARKLINE,
  precision: 1
}
```

### Bar Chart

Displays multiple metrics or histogram data as bars.

```typescript
{
  type: VisualizationType.BAR_CHART,
  showAxes: true,
  showGrid: true
}
```

### Line Chart

Time-series line chart for multiple metrics.

```typescript
{
  type: VisualizationType.LINE_CHART,
  showAxes: true,
  showGrid: true,
  showLegend: true,
  timeRange: 300000 // 5 minutes
}
```

## Integration with Other Components

The Performance Dashboard can be integrated with other Vibex components:

### Debugging Interface Integration

```tsx
import { DebuggingInterface } from '../debugging';
import { PerformanceDashboard } from '../performance';

const DebuggingWithPerformance = () => {
  // State for selected performance metric
  const [selectedMetric, setSelectedMetric] = useState(null);
  
  return (
    <Box flexDirection="column">
      {/* Performance dashboard */}
      <PerformanceDashboard
        width={100}
        height={30}
        onMetricSelect={setSelectedMetric}
      />
      
      {/* Debugging interface with performance context */}
      {selectedMetric && selectedMetric.category === 'application' && (
        <DebuggingInterface
          width={100}
          height={30}
          initialState={{
            ...debugState,
            performanceContext: selectedMetric
          }}
        />
      )}
    </Box>
  );
};
```

### Workflow Graph Integration

```tsx
import { WorkflowGraph, NodeType } from '../workflow';
import { PerformanceDashboard, usePerformanceMetrics } from '../performance';

const WorkflowWithPerformance = () => {
  // Get performance metrics
  const metrics = usePerformanceMetrics();
  
  // Workflow graph data
  const [workflowGraph, setWorkflowGraph] = useState(initialGraph);
  
  // Update workflow node status based on metrics
  useEffect(() => {
    // Get all application metrics
    const appMetrics = metrics.getMetricsByCategory('application');
    
    // Update workflow nodes based on metrics
    const updatedNodes = workflowGraph.nodes.map(node => {
      // Find related metric
      const nodeMetric = appMetrics.find(m => m.id.includes(node.id));
      
      if (!nodeMetric) return node;
      
      // Update node status based on metric
      let status;
      if (nodeMetric.type === 'counter' && nodeMetric.value > 0) {
        status = 'completed';
      } else if (nodeMetric.warningThreshold && nodeMetric.value > nodeMetric.warningThreshold) {
        status = 'warning';
      } else {
        status = 'running';
      }
      
      return { ...node, status };
    });
    
    setWorkflowGraph({ ...workflowGraph, nodes: updatedNodes });
  }, [metrics.metrics, workflowGraph.nodes]);
  
  return (
    <Box flexDirection="column">
      {/* Workflow visualization */}
      <WorkflowGraph
        graph={workflowGraph}
        width={100}
        height={30}
      />
      
      {/* Performance dashboard */}
      <PerformanceDashboard
        width={100}
        height={30}
      />
    </Box>
  );
};
```

## Advanced Configuration

### Custom Visualization Components

```tsx
import { PerformanceDashboard, AnyMetric, VisualizationOptions } from '../performance';

// Custom visualization component
const MyCustomVisualization = ({
  metric,
  width,
  height,
  options
}: {
  metric: AnyMetric;
  width: number;
  height: number;
  options?: VisualizationOptions;
}) => (
  <Box width={width} height={height}>
    <Text bold>{options?.title || metric.name}</Text>
    {/* Custom visualization logic */}
  </Box>
);

// Register custom visualization
const customConfig = {
  title: 'Custom Dashboard',
  layout: [
    { id: 'custom', x: 0, y: 0, width: 2, height: 1 }
  ],
  panels: [
    {
      id: 'custom',
      title: 'My Custom Panel',
      metrics: ['app.customMetric'],
      visualization: {
        type: 'custom', // Custom type
        renderer: MyCustomVisualization // Custom renderer
      }
    }
  ]
};

// Use custom config
const CustomDashboard = () => (
  <PerformanceDashboard
    width={100}
    height={30}
    config={customConfig}
  />
);
```

### Performance Optimizations

For large applications with many metrics, consider these optimizations:

```tsx
// Selective metrics collection
const metrics = usePerformanceMetrics({
  // Only collect what you need
  collectSystemMetrics: true,
  collectRuntimeMetrics: false,
  
  // Adjust collection interval for less CPU impact
  updateInterval: 2000,
  
  // Limit history length for memory usage
  historyLength: 50
});

// Selective metrics display
const optimizedConfig = {
  title: 'Optimized Dashboard',
  // Only show critical metrics
  panels: [
    // Essential panels here
  ],
  // Reduce update frequency
  refreshInterval: 2000
};

// Render with optimizations
const OptimizedDashboard = () => (
  <PerformanceDashboard
    width={100}
    height={30}
    config={optimizedConfig}
    
    // Only update when visible
    realTime={isVisible}
  />
);
```