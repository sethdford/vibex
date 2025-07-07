/**
 * Performance Dashboard Components
 * 
 * Exports all performance dashboard components, hooks, and types.
 */

// Main components
export { default as PerformanceDashboard } from './PerformanceDashboard';
export { default as PerformancePanel } from './PerformancePanel';
export { default as PerformanceDashboardExample } from './PerformanceDashboardExample';

// Metrics collector
export { MetricsCollector } from './MetricsCollector';

// Hooks
export { default as usePerformanceMetrics } from './usePerformanceMetrics';

// Visualization components
export * from './visualizations';

// Types
export * from './types';