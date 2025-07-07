/**
 * Performance Monitor Types - Clean Architecture
 * 
 * Centralized type definitions for performance monitoring components
 * Following Gemini CLI's focused type organization
 */

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    requestsPerSecond: number;
    latency: number;
    errors: number;
  };
  system: {
    uptime: number;
    platform: string;
    nodeVersion: string;
    pid: number;
  };
}

/**
 * Performance alert interface
 */
export interface PerformanceAlert {
  id: string;
  type: 'memory' | 'cpu' | 'network' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
}

/**
 * Alert thresholds configuration
 */
export interface AlertThresholds {
  memory: {
    warning: number;
    critical: number;
  };
  cpu: {
    warning: number;
    critical: number;
  };
  network: {
    latencyWarning: number;
    latencyCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
  };
  heap: {
    warning: number;
    critical: number;
  };
}

/**
 * Performance monitor configuration
 */
export interface PerformanceMonitorConfig {
  updateInterval: number;
  maxHistoryLength: number;
  alertThresholds: AlertThresholds;
  enableMemoryTracking: boolean;
  enableCpuTracking: boolean;
  enableNetworkTracking: boolean;
  enableSystemTracking: boolean;
}

/**
 * Performance monitor callbacks
 */
export interface PerformanceMonitorCallbacks {
  onAlert?: (alert: PerformanceAlert) => void;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  onThresholdExceeded?: (type: string, value: number, threshold: number) => void;
}

/**
 * Performance monitor props
 */
export interface PerformanceMonitorProps {
  /**
   * Enable real-time monitoring
   */
  enabled?: boolean;
  
  /**
   * Update interval in milliseconds
   */
  updateInterval?: number;
  
  /**
   * Maximum history length
   */
  maxHistoryLength?: number;
  
  /**
   * Show detailed metrics
   */
  showDetails?: boolean;
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Show alerts
   */
  showAlerts?: boolean;
  
  /**
   * Alert callback
   */
  onAlert?: (alert: PerformanceAlert) => void;
  
  /**
   * Metrics callback
   */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * Metrics display mode
 */
export type MetricsDisplayMode = 'full' | 'compact' | 'minimal';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Performance data point for historical tracking
 */
export interface PerformanceDataPoint {
  timestamp: number;
  value: number;
  label: string;
}

/**
 * Performance trend analysis
 */
export interface PerformanceTrend {
  type: 'memory' | 'cpu' | 'network';
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // Change rate per minute
  confidence: number; // 0-1 confidence in trend
}

/**
 * System health status
 */
export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  memory: 'healthy' | 'warning' | 'critical';
  cpu: 'healthy' | 'warning' | 'critical';
  network: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100 health score
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  memory: {
    average: number;
    peak: number;
    minimum: number;
    current: number;
  };
  cpu: {
    average: number;
    peak: number;
    minimum: number;
    current: number;
  };
  uptime: number;
  alertCount: number;
  criticalAlerts: number;
}