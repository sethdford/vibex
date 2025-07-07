/**
 * Metrics Service - Clean Architecture
 * 
 * Single Responsibility: Performance monitoring and metrics collection
 * Following Gemini CLI's focused service patterns
 */

import type { RealTimeMetrics, ConnectionStatus } from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  updateInterval: number;
  metricsInterval: number;
  enableMemoryTracking: boolean;
  enableThroughputTracking: boolean;
  maxHistorySize: number;
}

/**
 * Historical metrics entry
 */
export interface MetricsHistoryEntry {
  timestamp: number;
  metrics: RealTimeMetrics;
}

/**
 * Metrics Service
 * Focus: Performance monitoring, metrics collection, and analysis
 */
export class MetricsService {
  private metrics: RealTimeMetrics;
  private history: MetricsHistoryEntry[] = [];
  private config: MetricsConfig;
  private metricsTimer: NodeJS.Timeout | null = null;
  private updateCount: number = 0;
  private errorCount: number = 0;
  private throughputCounter: number = 0;
  private lastThroughputReset: number = Date.now();

  constructor(config: MetricsConfig) {
    this.config = config;
    this.metrics = this.createInitialMetrics();
    this.startMetricsCollection();
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): RealTimeMetrics {
    return { ...this.metrics };
  }

  /**
   * Update connection status and latency
   */
  updateConnection(status: ConnectionStatus, latency: number = 0): void {
    this.metrics.connectionStatus = status;
    this.metrics.updateLatency = latency;
    this.metrics.lastUpdate = Date.now();
    
    this.recordUpdate();
    
    logger.debug('Connection metrics updated', { status, latency });
  }

  /**
   * Record an update event
   */
  recordUpdate(): void {
    this.updateCount++;
    this.throughputCounter++;
    this.metrics.updateCount = this.updateCount;
    this.metrics.lastUpdate = Date.now();
    
    // Calculate throughput every second
    const now = Date.now();
    if (now - this.lastThroughputReset >= 1000) {
      this.metrics.throughput = this.throughputCounter;
      this.throughputCounter = 0;
      this.lastThroughputReset = now;
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++;
    this.metrics.errorCount = this.errorCount;
    this.metrics.lastUpdate = Date.now();
    
    this.recordUpdate();
    
    logger.debug('Error recorded in metrics', { totalErrors: this.errorCount });
  }

  /**
   * Update memory usage
   */
  updateMemoryUsage(): void {
    if (!this.config.enableMemoryTracking) return;

    try {
      const memUsage = process.memoryUsage();
      const memoryMB = memUsage.heapUsed / 1024 / 1024;
      
      this.metrics.memoryUsage = Math.round(memoryMB * 100) / 100;
      this.metrics.lastUpdate = Date.now();
      
      this.recordUpdate();
      
    } catch (error) {
      logger.error('Failed to update memory usage', { error });
      this.recordError();
    }
  }

  /**
   * Get metrics history
   */
  getHistory(): MetricsHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get metrics summary over time period
   */
    getMetricsSummary(timeWindowMs: number = 60000): {
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    avgThroughput: number;
    maxMemory: number;
    errorRate: number;
    uptime: number;
  } {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentEntries = this.history.filter(entry => entry.timestamp >= cutoffTime);
    
    if (recentEntries.length === 0) {
      return {
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        avgThroughput: 0,
        maxMemory: 0,
        errorRate: 0,
        uptime: 0
      };
    }

    const latencies = recentEntries.map(e => e.metrics.updateLatency);
    const throughputs = recentEntries.map(e => e.metrics.throughput);
    const memories = recentEntries.map(e => e.metrics.memoryUsage);
    const errors = recentEntries.map(e => e.metrics.errorCount);
    
    const connectedEntries = recentEntries.filter(e => e.metrics.connectionStatus === 'connected');
    const uptime = (connectedEntries.length / recentEntries.length) * 100;

    return {
      avgLatency: this.average(latencies),
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies),
      avgThroughput: this.average(throughputs),
      maxMemory: Math.max(...memories),
      errorRate: errors.length > 0 ? errors[errors.length - 1] - errors[0] : 0,
      uptime: Math.round(uptime * 100) / 100
    };
  }

  /**
   * Check if metrics indicate healthy performance
   */
    isPerformanceHealthy(): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check latency
    if (this.metrics.updateLatency > 500) {
      issues.push('High latency detected');
    }
    
    // Check connection
    if (this.metrics.connectionStatus !== 'connected') {
      issues.push('Connection issues detected');
    }
    
    // Check memory usage
    if (this.metrics.memoryUsage > 100) {
      issues.push('High memory usage detected');
    }
    
    // Check error rate
    const recentSummary = this.getMetricsSummary(30000); // Last 30 seconds
    if (recentSummary.errorRate > 5) {
      issues.push('High error rate detected');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = this.createInitialMetrics();
    this.history = [];
    this.updateCount = 0;
    this.errorCount = 0;
    this.throughputCounter = 0;
    this.lastThroughputReset = Date.now();
    
    logger.info('Metrics service reset');
  }

  /**
   * Export metrics data
   */
    exportMetrics(): {
    current: RealTimeMetrics;
    history: MetricsHistoryEntry[];
    summary: ReturnType<MetricsService['getMetricsSummary']>;
    health: ReturnType<MetricsService['isPerformanceHealthy']>;
  } {
    return {
      current: this.getCurrentMetrics(),
      history: this.getHistory(),
      summary: this.getMetricsSummary(),
      health: this.isPerformanceHealthy()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    logger.debug('Metrics service cleaned up');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create initial metrics
   */
  private createInitialMetrics(): RealTimeMetrics {
    return {
      updateLatency: 0,
      connectionStatus: 'disconnected',
      memoryUsage: 0,
      throughput: 0,
      lastUpdate: Date.now(),
      updateCount: 0,
      errorCount: 0
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    try {
      // Update memory usage
      this.updateMemoryUsage();
      
      // Add to history
      this.addToHistory();
      
    } catch (error) {
      logger.error('Error collecting metrics', { error });
      this.recordError();
    }
  }

  /**
   * Add current metrics to history
   */
  private addToHistory(): void {
    const entry: MetricsHistoryEntry = {
      timestamp: Date.now(),
      metrics: { ...this.metrics }
    };
    
    this.history.push(entry);
    
    // Keep only recent history
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * Calculate average of number array
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return Math.round((numbers.reduce((sum, n) => sum + n, 0) / numbers.length) * 100) / 100;
  }
}

/**
 * Factory function for creating metrics service
 */
export function createMetricsService(config: MetricsConfig): MetricsService {
  return new MetricsService(config);
} 