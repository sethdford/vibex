/**
 * Performance Dashboard Types
 * 
 * Type definitions for performance monitoring components.
 */

/**
 * Metric type enum for different performance metrics
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
  TIMER = 'timer'
}

/**
 * Metric category enum for grouping metrics
 */
export enum MetricCategory {
  SYSTEM = 'system',
  RUNTIME = 'runtime',
  APPLICATION = 'application',
  NETWORK = 'network',
  DATABASE = 'database',
  MEMORY = 'memory',
  CPU = 'cpu',
  CUSTOM = 'custom'
}

/**
 * Metric value types
 */
export type MetricValue = number | number[] | { [key: string]: number };

/**
 * Basic metric interface
 */
export interface Metric {
  /**
   * Unique metric identifier
   */
  id: string;
  
  /**
   * Display name for the metric
   */
  name: string;
  
  /**
   * Metric description
   */
  description?: string;
  
  /**
   * Metric type
   */
  type: MetricType;
  
  /**
   * Metric category
   */
  category: MetricCategory;
  
  /**
   * Current metric value
   */
  value: MetricValue;
  
  /**
   * Metric unit (e.g. ms, bytes, etc.)
   */
  unit?: string;
  
  /**
   * Timestamp when this metric was collected
   */
  timestamp: number;
  
  /**
   * Historical values for the metric
   */
  history?: Array<{
    value: MetricValue;
    timestamp: number;
  }>;
  
  /**
   * Warning threshold
   */
  warningThreshold?: number;
  
  /**
   * Critical threshold
   */
  criticalThreshold?: number;
  
  /**
   * Tags for filtering and grouping
   */
  tags?: string[];
  
  /**
   * Additional metadata
   */
  meta?: Record<string, any>;
}

/**
 * Counter metric for counting events
 */
export interface CounterMetric extends Metric {
  type: MetricType.COUNTER;
  value: number;
  
  /**
   * Total count since reset
   */
  total: number;
  
  /**
   * Rate of change (per second)
   */
  rate?: number;
}

/**
 * Gauge metric for current value measurements
 */
export interface GaugeMetric extends Metric {
  type: MetricType.GAUGE;
  value: number;
  
  /**
   * Minimum recorded value
   */
  min?: number;
  
  /**
   * Maximum recorded value
   */
  max?: number;
}

/**
 * Histogram metric for distribution measurements
 */
export interface HistogramMetric extends Metric {
  type: MetricType.HISTOGRAM;
  value: number[];
  
  /**
   * Bucket boundaries
   */
  buckets: number[];
  
  /**
   * Bucket counts
   */
  counts: number[];
  
  /**
   * Sum of all values
   */
  sum: number;
  
  /**
   * Count of values
   */
  count: number;
}

/**
 * Summary metric for statistical summaries
 */
export interface SummaryMetric extends Metric {
  type: MetricType.SUMMARY;
  value: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };
}

/**
 * Timer metric for duration measurements
 */
export interface TimerMetric extends Metric {
  type: MetricType.TIMER;
  value: number;
  
  /**
   * Count of measurements
   */
  count: number;
  
  /**
   * Mean duration
   */
  mean: number;
  
  /**
   * Percentiles (e.g. p50, p95, p99)
   */
  percentiles?: Record<string, number>;
}

/**
 * Union type of all metric types
 */
export type AnyMetric = CounterMetric | GaugeMetric | HistogramMetric | SummaryMetric | TimerMetric;

/**
 * Metric collection interface
 */
export interface MetricCollection {
  /**
   * Collection name
   */
  name: string;
  
  /**
   * Metrics in this collection
   */
  metrics: AnyMetric[];
  
  /**
   * Last update timestamp
   */
  updatedAt: number;
}

/**
 * Visualization type enum for metric displays
 */
export enum VisualizationType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  GAUGE = 'gauge',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  NUMBER = 'number',
  SPARKLINE = 'sparkline',
  HISTOGRAM = 'histogram',
  HEATMAP = 'heatmap'
}

/**
 * Color scheme for visualizations
 */
export interface ColorScheme {
  background: string;
  text: string;
  border: string;
  grid: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

/**
 * Visualization options
 */
export interface VisualizationOptions {
  /**
   * Type of visualization
   */
  type: VisualizationType;
  
  /**
   * Title for the visualization
   */
  title?: string;
  
  /**
   * Description for the visualization
   */
  description?: string;
  
  /**
   * Width of the visualization
   */
  width?: number;
  
  /**
   * Height of the visualization
   */
  height?: number;
  
  /**
   * Time range to display (in ms)
   */
  timeRange?: number;
  
  /**
   * Color scheme for the visualization
   */
  colors?: Partial<ColorScheme>;
  
  /**
   * Show legend
   */
  showLegend?: boolean;
  
  /**
   * Show axes
   */
  showAxes?: boolean;
  
  /**
   * Show grid
   */
  showGrid?: boolean;
  
  /**
   * Additional visualization options
   */
  [key: string]: any;
}

/**
 * Dashboard configuration interface
 */
export interface DashboardConfig {
  /**
   * Dashboard title
   */
  title: string;
  
  /**
   * Dashboard description
   */
  description?: string;
  
  /**
   * Layout definition for dashboard panels
   */
  layout: {
    /**
     * Panel ID
     */
    id: string;
    
    /**
     * X position (column)
     */
    x: number;
    
    /**
     * Y position (row)
     */
    y: number;
    
    /**
     * Width in columns
     */
    width: number;
    
    /**
     * Height in rows
     */
    height: number;
  }[];
  
  /**
   * Panel definitions
   */
  panels: {
    /**
     * Panel ID (matches layout ID)
     */
    id: string;
    
    /**
     * Panel title
     */
    title: string;
    
    /**
     * Metrics to display in this panel
     */
    metrics: string[];
    
    /**
     * Visualization options
     */
    visualization: VisualizationOptions;
  }[];
  
  /**
   * Refresh interval in ms
   */
  refreshInterval?: number;
  
  /**
   * Color scheme for the dashboard
   */
  colorScheme?: ColorScheme;
}

/**
 * System Performance Dashboard props
 */
export interface PerformanceDashboardProps {
  /**
   * Dashboard width
   */
  width: number;
  
  /**
   * Dashboard height
   */
  height: number;
  
  /**
   * Initial metrics
   */
  initialMetrics?: AnyMetric[];
  
  /**
   * Dashboard configuration
   */
  config?: DashboardConfig;
  
  /**
   * Whether real-time updates are enabled
   */
  realTime?: boolean;
  
  /**
   * Update interval in ms
   */
  updateInterval?: number;
  
  /**
   * Whether the dashboard is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback for focus change
   */
  onFocusChange?: (focused: boolean) => void;
  
  /**
   * Callback for metric selection
   */
  onMetricSelect?: (metric: AnyMetric) => void;
}