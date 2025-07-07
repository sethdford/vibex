/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Performance Monitoring System for VibeX
 * 
 * Provides comprehensive performance monitoring with metrics collection,
 * analysis, and alerting capabilities.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

/**
 * Performance metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  readonly name: string;
  readonly type: MetricType;
  readonly value: number;
  readonly timestamp: number;
  readonly tags?: Record<string, string>;
  readonly unit?: string;
}

/**
 * Timer result interface
 */
export interface TimerResult {
  readonly duration: number;
  readonly startTime: number;
  readonly endTime: number;
}

/**
 * Performance statistics interface
 */
export interface PerformanceStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly p95: number;
  readonly p99: number;
  readonly count: number;
  readonly sum: number;
}

/**
 * Alert threshold interface
 */
export interface AlertThreshold {
  readonly metricName: string;
  readonly threshold: number;
  readonly operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  readonly windowSize?: number; // Number of samples to consider
}

/**
 * Performance alert interface
 */
export interface PerformanceAlert {
  readonly metricName: string;
  readonly threshold: AlertThreshold;
  readonly currentValue: number;
  readonly timestamp: number;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Performance monitor interface
 */
export interface IPerformanceMonitor {
  counter(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  timer(name: string, tags?: Record<string, string>): () => TimerResult;
  time<T>(name: string, fn: () => T, tags?: Record<string, string>): T;
  timeAsync<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T>;
  getMetrics(name?: string): PerformanceMetric[];
  getStats(name: string): PerformanceStats | undefined;
  addThreshold(threshold: AlertThreshold): void;
  removeThreshold(metricName: string): void;
  getAlerts(): PerformanceAlert[];
  clearMetrics(name?: string): void;
  dispose(): void;
}

/**
 * Performance monitor implementation
 */
export class PerformanceMonitor extends EventEmitter implements IPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();
  private thresholds = new Map<string, AlertThreshold>();
  private alerts: PerformanceAlert[] = [];
  private maxMetricsPerName = 1000;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: { maxMetricsPerName?: number; cleanupInterval?: number } = {}) {
    super();
    this.maxMetricsPerName = options.maxMetricsPerName || 1000;
    
    // Start cleanup timer
    if (options.cleanupInterval && options.cleanupInterval > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, options.cleanupInterval);
    }
  }

  /**
   * Record a counter metric
   */
  counter(name: string, value = 1, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      type: MetricType.COUNTER,
      value,
      timestamp: Date.now(),
      tags,
      unit: 'count'
    };

    this.recordMetric(metric);
  }

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: Date.now(),
      tags
    };

    this.recordMetric(metric);
  }

  /**
   * Record a histogram metric
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: Date.now(),
      tags
    };

    this.recordMetric(metric);
  }

  /**
   * Create a timer for measuring durations
   */
  timer(name: string, tags?: Record<string, string>): () => TimerResult {
    const startTime = performance.now();
    
    return (): TimerResult => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric: PerformanceMetric = {
        name,
        type: MetricType.TIMER,
        value: duration,
        timestamp: Date.now(),
        tags,
        unit: 'ms'
      };

      this.recordMetric(metric);

      return {
        duration,
        startTime,
        endTime
      };
    };
  }

  /**
   * Time a synchronous function
   */
  time<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
    const endTimer = this.timer(name, tags);
    try {
      const result = fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Time an asynchronous function
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const endTimer = this.timer(name, tags);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Get metrics by name or all metrics
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }

    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  /**
   * Get statistical analysis for a metric
   */
  getStats(name: string): PerformanceStats | undefined {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return undefined;
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    const median = count % 2 === 0
      ? (values[count / 2 - 1] + values[count / 2]) / 2
      : values[Math.floor(count / 2)];

    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      min: values[0],
      max: values[count - 1],
      mean,
      median,
      p95: values[p95Index] || values[count - 1],
      p99: values[p99Index] || values[count - 1],
      count,
      sum
    };
  }

  /**
   * Add an alert threshold
   */
  addThreshold(threshold: AlertThreshold): void {
    this.thresholds.set(threshold.metricName, threshold);
    logger.debug('Performance threshold added', {
      metricName: threshold.metricName,
      threshold: threshold.threshold,
      operator: threshold.operator
    });
  }

  /**
   * Remove an alert threshold
   */
  removeThreshold(metricName: string): void {
    this.thresholds.delete(metricName);
    logger.debug('Performance threshold removed', { metricName });
  }

  /**
   * Get current alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear metrics for a specific name or all metrics
   */
  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
      logger.debug('Metrics cleared', { metricName: name });
    } else {
      this.metrics.clear();
      this.alerts = [];
      logger.debug('All metrics cleared');
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clearMetrics();
    this.removeAllListeners();
    logger.debug('Performance monitor disposed');
  }

  private recordMetric(metric: PerformanceMetric): void {
    // Store metric
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metrics = this.metrics.get(metric.name)!;
    metrics.push(metric);

    // Limit number of metrics per name
    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift(); // Remove oldest
    }

    // Check thresholds
    this.checkThresholds(metric);

    // Emit metric event
    this.emit('metric', metric);

    logger.debug('Performance metric recorded', {
      name: metric.name,
      type: metric.type,
      value: metric.value,
      tags: metric.tags
    });
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    const shouldAlert = this.evaluateThreshold(metric.value, threshold);
    if (shouldAlert) {
      const alert: PerformanceAlert = {
        metricName: metric.name,
        threshold,
        currentValue: metric.value,
        timestamp: metric.timestamp,
        severity: this.calculateSeverity(metric.value, threshold)
      };

      this.alerts.push(alert);
      this.emit('alert', alert);

      logger.warn('Performance alert triggered', {
        metricName: alert.metricName,
        currentValue: alert.currentValue,
        threshold: alert.threshold.threshold,
        severity: alert.severity
      });
    }
  }

  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.threshold;
      case 'gte': return value >= threshold.threshold;
      case 'lt': return value < threshold.threshold;
      case 'lte': return value <= threshold.threshold;
      case 'eq': return value === threshold.threshold;
      default: return false;
    }
  }

  private calculateSeverity(value: number, threshold: AlertThreshold): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = Math.abs(value - threshold.threshold) / threshold.threshold;
    
    if (ratio > 2) return 'critical';
    if (ratio > 1) return 'high';
    if (ratio > 0.5) return 'medium';
    return 'low';
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let totalRemoved = 0;

    for (const [name, metrics] of this.metrics.entries()) {
      const before = metrics.length;
      const filtered = metrics.filter(metric => now - metric.timestamp < maxAge);
      
      if (filtered.length !== before) {
        this.metrics.set(name, filtered);
        totalRemoved += before - filtered.length;
      }
    }

    // Clean up old alerts
    const alertsBefore = this.alerts.length;
    this.alerts = this.alerts.filter(alert => now - alert.timestamp < maxAge);
    totalRemoved += alertsBefore - this.alerts.length;

    if (totalRemoved > 0) {
      logger.debug('Performance monitor cleanup completed', {
        metricsRemoved: totalRemoved,
        remainingMetrics: Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0),
        remainingAlerts: this.alerts.length
      });
    }
  }
}

/**
 * System performance metrics collector
 */
export class SystemMetricsCollector {
  private monitor: IPerformanceMonitor;
  private collectionInterval?: NodeJS.Timeout;

  constructor(monitor: IPerformanceMonitor, intervalMs = 5000) {
    this.monitor = monitor;
    
    if (intervalMs > 0) {
      this.collectionInterval = setInterval(() => {
        this.collectSystemMetrics();
      }, intervalMs);
    }
  }

  collectSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.monitor.gauge('system.memory.heap_used', memUsage.heapUsed, { unit: 'bytes' });
      this.monitor.gauge('system.memory.heap_total', memUsage.heapTotal, { unit: 'bytes' });
      this.monitor.gauge('system.memory.external', memUsage.external, { unit: 'bytes' });
      this.monitor.gauge('system.memory.rss', memUsage.rss, { unit: 'bytes' });

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.monitor.gauge('system.cpu.user', cpuUsage.user, { unit: 'microseconds' });
      this.monitor.gauge('system.cpu.system', cpuUsage.system, { unit: 'microseconds' });

      // Event loop lag (simplified)
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        this.monitor.gauge('system.event_loop.lag', lag, { unit: 'ms' });
      });

      // Process uptime
      this.monitor.gauge('system.process.uptime', process.uptime(), { unit: 'seconds' });

    } catch (error) {
      logger.error('Failed to collect system metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  dispose(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
  }
}

/**
 * Performance monitor factory
 */
export class PerformanceMonitorFactory {
  static create(options?: { maxMetricsPerName?: number; cleanupInterval?: number }): PerformanceMonitor {
    return new PerformanceMonitor(options);
  }

  static createWithSystemMetrics(
    options?: { maxMetricsPerName?: number; cleanupInterval?: number; systemMetricsInterval?: number }
  ): { monitor: PerformanceMonitor; systemCollector: SystemMetricsCollector } {
    const monitor = new PerformanceMonitor(options);
    const systemCollector = new SystemMetricsCollector(monitor, options?.systemMetricsInterval);
    
    return { monitor, systemCollector };
  }

  static createDefault(): PerformanceMonitor {
    const monitor = new PerformanceMonitor({
      maxMetricsPerName: 1000,
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    });

    // Add default thresholds
    monitor.addThreshold({
      metricName: 'system.memory.heap_used',
      threshold: 500 * 1024 * 1024, // 500MB
      operator: 'gt'
    });

    monitor.addThreshold({
      metricName: 'system.event_loop.lag',
      threshold: 100, // 100ms
      operator: 'gt'
    });

    return monitor;
  }
} 