/**
 * Performance Monitor - Clean Architecture Exports
 * 
 * Centralized exports for all performance monitor components and services
 * Following Gemini CLI's clean import/export patterns
 */

// Main Component
export { PerformanceMonitorCore as PerformanceMonitor } from './PerformanceMonitorCore.js';

// Services
export { MetricsCollectionService, createMetricsCollectionService, DEFAULT_PERFORMANCE_CONFIG } from './MetricsCollectionService.js';
export { AlertService, createAlertService } from './AlertService.js';
export { DataStorageService, createDataStorageService } from './DataStorageService.js';
export { FormattingService, createFormattingService } from './FormattingService.js';

// View Components
export { MemoryMetricsView } from './MemoryMetricsView.js';
export { CpuMetricsView } from './CpuMetricsView.js';
export { AlertsView } from './AlertsView.js';
export { SystemMetricsView } from './SystemMetricsView.js';
export { StatusView } from './StatusView.js';

// Types
export type {
  PerformanceMetrics,
  PerformanceAlert,
  AlertThresholds,
  PerformanceMonitorConfig,
  PerformanceMonitorCallbacks,
  PerformanceMonitorProps,
  MetricsDisplayMode,
  AlertSeverity,
  PerformanceDataPoint,
  PerformanceTrend,
  SystemHealth,
  PerformanceStats
} from './types.js';

// Re-export for convenience
export { DEFAULT_PERFORMANCE_CONFIG as DefaultConfig } from './MetricsCollectionService.js'; 