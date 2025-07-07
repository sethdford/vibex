/**
 * Data Storage Service - Clean Architecture
 * 
 * Single Responsibility: Metrics history and data storage management
 * Following Gemini CLI's focused service patterns
 */

import type { 
  PerformanceMetrics, 
  PerformanceDataPoint, 
  PerformanceTrend, 
  PerformanceStats 
} from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Data Storage Service
 * Focus: Metrics history, data storage, and trend analysis
 */
export class DataStorageService {
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistoryLength: number;

  constructor(maxHistoryLength: number = 60) {
    this.maxHistoryLength = maxHistoryLength;
  }

  /**
   * Add metrics to history
   */
  addMetrics(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);

    // Trim history if exceeding max length
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistoryLength);
    }

    logger.debug('Metrics added to history', {
      timestamp: metrics.timestamp,
      historyLength: this.metricsHistory.length,
    });
  }

  /**
   * Get metrics history
   */
  getHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1] 
      : null;
  }

  /**
   * Get metrics in time range
   */
  getMetricsInRange(startTime: number, endTime: number): PerformanceMetrics[] {
    return this.metricsHistory.filter(
      metrics => metrics.timestamp >= startTime && metrics.timestamp <= endTime
    );
  }

  /**
   * Get memory data points for visualization
   */
  getMemoryDataPoints(): PerformanceDataPoint[] {
    return this.metricsHistory.map(metrics => ({
      timestamp: metrics.timestamp,
      value: metrics.memory.percentage,
      label: `${metrics.memory.percentage.toFixed(1)}%`,
    }));
  }

  /**
   * Get CPU data points for visualization
   */
  getCpuDataPoints(): PerformanceDataPoint[] {
    return this.metricsHistory.map(metrics => ({
      timestamp: metrics.timestamp,
      value: metrics.cpu.usage,
      label: `${metrics.cpu.usage.toFixed(1)}%`,
    }));
  }

  /**
   * Get network latency data points
   */
  getNetworkLatencyDataPoints(): PerformanceDataPoint[] {
    return this.metricsHistory.map(metrics => ({
      timestamp: metrics.timestamp,
      value: metrics.network.latency,
      label: `${metrics.network.latency}ms`,
    }));
  }

  /**
   * Calculate performance statistics
   */
  calculateStats(): PerformanceStats {
    if (this.metricsHistory.length === 0) {
      return this.getEmptyStats();
    }

    const memoryValues = this.metricsHistory.map(m => m.memory.percentage);
    const cpuValues = this.metricsHistory.map(m => m.cpu.usage);
    const latest = this.getLatestMetrics()!;

    return {
      memory: {
        average: this.calculateAverage(memoryValues),
        peak: Math.max(...memoryValues),
        minimum: Math.min(...memoryValues),
        current: latest.memory.percentage,
      },
      cpu: {
        average: this.calculateAverage(cpuValues),
        peak: Math.max(...cpuValues),
        minimum: Math.min(...cpuValues),
        current: latest.cpu.usage,
      },
      uptime: latest.system.uptime,
      alertCount: 0, // Would be provided by AlertService
      criticalAlerts: 0, // Would be provided by AlertService
    };
  }

  /**
   * Analyze performance trends
   */
  analyzeTrends(): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];

    if (this.metricsHistory.length < 5) {
      return trends; // Need more data for trend analysis
    }

    // Analyze memory trend
    const memoryTrend = this.analyzeTrendForMetric(
      this.metricsHistory.map(m => m.memory.percentage),
      'memory'
    );
    if (memoryTrend) trends.push(memoryTrend);

    // Analyze CPU trend
    const cpuTrend = this.analyzeTrendForMetric(
      this.metricsHistory.map(m => m.cpu.usage),
      'cpu'
    );
    if (cpuTrend) trends.push(cpuTrend);

    // Analyze network trend (latency)
    const networkTrend = this.analyzeTrendForMetric(
      this.metricsHistory.map(m => m.network.latency),
      'network'
    );
    if (networkTrend) trends.push(networkTrend);

    return trends;
  }

  /**
   * Clear history
   */
  clearHistory(): number {
    const count = this.metricsHistory.length;
    this.metricsHistory = [];
    
    if (count > 0) {
      logger.debug('Metrics history cleared', { count });
    }
    
    return count;
  }

  /**
   * Update max history length
   */
  updateMaxHistoryLength(maxLength: number): void {
    this.maxHistoryLength = maxLength;

    // Trim existing history if needed
    if (this.metricsHistory.length > maxLength) {
      this.metricsHistory = this.metricsHistory.slice(-maxLength);
    }

    logger.debug('Max history length updated', { maxLength });
  }

  /**
   * Get history length
   */
  getHistoryLength(): number {
    return this.metricsHistory.length;
  }

  /**
   * Get max history length
   */
  getMaxHistoryLength(): number {
    return this.maxHistoryLength;
  }

  /**
   * Export metrics data
   */
  exportData(): {
    timestamp: number;
    maxHistoryLength: number;
    metrics: PerformanceMetrics[];
    stats: PerformanceStats;
    trends: PerformanceTrend[];
  } {
    return {
      timestamp: Date.now(),
      maxHistoryLength: this.maxHistoryLength,
      metrics: this.getHistory(),
      stats: this.calculateStats(),
      trends: this.analyzeTrends(),
    };
  }

  /**
   * Import metrics data
   */
  importData(data: { metrics: PerformanceMetrics[]; maxHistoryLength?: number }): void {
    if (data.maxHistoryLength) {
      this.maxHistoryLength = data.maxHistoryLength;
    }

    this.metricsHistory = data.metrics.slice(-this.maxHistoryLength);
    
    logger.info('Metrics data imported', {
      count: this.metricsHistory.length,
      maxLength: this.maxHistoryLength,
    });
  }

  // ============================================================================
  // Private Methods - Calculations
  // ============================================================================

  /**
   * Calculate average of values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  /**
   * Analyze trend for a specific metric
   */
  private analyzeTrendForMetric(
    values: number[],
    type: 'memory' | 'cpu' | 'network'
  ): PerformanceTrend | null {
    if (values.length < 5) return null;

    // Simple linear regression to determine trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine direction and confidence
    const direction = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    const confidence = Math.min(Math.abs(slope) / 10, 1); // Simple confidence calculation

    return {
      type,
      direction,
      rate: Math.abs(slope) * 60, // Rate per minute
      confidence,
    };
  }

  /**
   * Get empty statistics
   */
  private getEmptyStats(): PerformanceStats {
    return {
      memory: {
        average: 0,
        peak: 0,
        minimum: 0,
        current: 0,
      },
      cpu: {
        average: 0,
        peak: 0,
        minimum: 0,
        current: 0,
      },
      uptime: 0,
      alertCount: 0,
      criticalAlerts: 0,
    };
  }
}

/**
 * Factory function for creating data storage service
 */
export function createDataStorageService(maxHistoryLength: number = 60): DataStorageService {
  return new DataStorageService(maxHistoryLength);
} 