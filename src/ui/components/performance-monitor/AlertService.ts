/**
 * Alert Service - Clean Architecture
 * 
 * Single Responsibility: Performance alerts and threshold management
 * Following Gemini CLI's focused service patterns
 */

import type { 
  PerformanceMetrics, 
  PerformanceAlert, 
  AlertThresholds, 
  AlertSeverity 
} from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Alert Service
 * Focus: Alert generation, management, and threshold monitoring
 */
export class AlertService {
  private alerts: PerformanceAlert[] = [];
  private thresholds: AlertThresholds;
  private alertIdCounter: number = 1;
  private maxAlerts: number = 100;

  constructor(thresholds: AlertThresholds, maxAlerts: number = 100) {
    this.thresholds = thresholds;
    this.maxAlerts = maxAlerts;
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  checkMetrics(metrics: PerformanceMetrics): PerformanceAlert[] {
    const newAlerts: PerformanceAlert[] = [];

    // Check memory alerts
    if (this.shouldCheckMemory(metrics)) {
      const memoryAlerts = this.checkMemoryThresholds(metrics);
      newAlerts.push(...memoryAlerts);
    }

    // Check CPU alerts
    if (this.shouldCheckCpu(metrics)) {
      const cpuAlerts = this.checkCpuThresholds(metrics);
      newAlerts.push(...cpuAlerts);
    }

    // Check network alerts
    if (this.shouldCheckNetwork(metrics)) {
      const networkAlerts = this.checkNetworkThresholds(metrics);
      newAlerts.push(...networkAlerts);
    }

    // Check heap alerts
    if (this.shouldCheckHeap(metrics)) {
      const heapAlerts = this.checkHeapThresholds(metrics);
      newAlerts.push(...heapAlerts);
    }

    // Add new alerts to collection
    newAlerts.forEach(alert => this.addAlert(alert));

    if (newAlerts.length > 0) {
      logger.warn('Performance alerts generated', { 
        count: newAlerts.length,
        alerts: newAlerts.map(a => ({ type: a.type, severity: a.severity, message: a.message }))
      });
    }

    return newAlerts;
  }

  /**
   * Get all alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: PerformanceAlert['type']): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.debug('Alert acknowledged', { alertId, type: alert.type });
      return true;
    }
    return false;
  }

  /**
   * Acknowledge all alerts
   */
  acknowledgeAllAlerts(): number {
    const unacknowledged = this.getUnacknowledgedAlerts();
    unacknowledged.forEach(alert => {
      alert.acknowledged = true;
    });
    
    logger.debug('All alerts acknowledged', { count: unacknowledged.length });
    return unacknowledged.length;
  }

  /**
   * Clear acknowledged alerts
   */
  clearAcknowledgedAlerts(): number {
    const initialCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => !alert.acknowledged);
    const clearedCount = initialCount - this.alerts.length;
    
    if (clearedCount > 0) {
      logger.debug('Acknowledged alerts cleared', { count: clearedCount });
    }
    
    return clearedCount;
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): number {
    const count = this.alerts.length;
    this.alerts = [];
    
    if (count > 0) {
      logger.debug('All alerts cleared', { count });
    }
    
    return count;
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.debug('Alert thresholds updated', { thresholds });
  }

  /**
   * Get current thresholds
   */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    unacknowledged: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<PerformanceAlert['type'], number>;
  } {
    const bySeverity: Record<AlertSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byType: Record<PerformanceAlert['type'], number> = {
      memory: 0,
      cpu: 0,
      network: 0,
      system: 0,
    };

    this.alerts.forEach(alert => {
      bySeverity[alert.severity]++;
      byType[alert.type]++;
    });

    return {
      total: this.alerts.length,
      unacknowledged: this.getUnacknowledgedAlerts().length,
      bySeverity,
      byType,
    };
  }

  // ============================================================================
  // Private Methods - Threshold Checking
  // ============================================================================

  /**
   * Check memory thresholds
   */
  private checkMemoryThresholds(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const memoryPercentage = metrics.memory.percentage;

    if (memoryPercentage >= this.thresholds.memory.critical) {
      alerts.push(this.createAlert(
        'memory',
        'critical',
        `Critical memory usage: ${memoryPercentage.toFixed(1)}%`,
        memoryPercentage,
        this.thresholds.memory.critical
      ));
    } else if (memoryPercentage >= this.thresholds.memory.warning) {
      alerts.push(this.createAlert(
        'memory',
        'high',
        `High memory usage: ${memoryPercentage.toFixed(1)}%`,
        memoryPercentage,
        this.thresholds.memory.warning
      ));
    }

    return alerts;
  }

  /**
   * Check CPU thresholds
   */
  private checkCpuThresholds(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const cpuUsage = metrics.cpu.usage;

    if (cpuUsage >= this.thresholds.cpu.critical) {
      alerts.push(this.createAlert(
        'cpu',
        'critical',
        `Critical CPU usage: ${cpuUsage.toFixed(1)}%`,
        cpuUsage,
        this.thresholds.cpu.critical
      ));
    } else if (cpuUsage >= this.thresholds.cpu.warning) {
      alerts.push(this.createAlert(
        'cpu',
        'high',
        `High CPU usage: ${cpuUsage.toFixed(1)}%`,
        cpuUsage,
        this.thresholds.cpu.warning
      ));
    }

    return alerts;
  }

  /**
   * Check network thresholds
   */
  private checkNetworkThresholds(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const latency = metrics.network.latency;
    const errors = metrics.network.errors;

    // Check latency
    if (latency >= this.thresholds.network.latencyCritical) {
      alerts.push(this.createAlert(
        'network',
        'critical',
        `Critical network latency: ${latency}ms`,
        latency,
        this.thresholds.network.latencyCritical
      ));
    } else if (latency >= this.thresholds.network.latencyWarning) {
      alerts.push(this.createAlert(
        'network',
        'medium',
        `High network latency: ${latency}ms`,
        latency,
        this.thresholds.network.latencyWarning
      ));
    }

    // Check error rate
    if (errors >= this.thresholds.network.errorRateCritical) {
      alerts.push(this.createAlert(
        'network',
        'critical',
        `Critical network error rate: ${errors} errors`,
        errors,
        this.thresholds.network.errorRateCritical
      ));
    } else if (errors >= this.thresholds.network.errorRateWarning) {
      alerts.push(this.createAlert(
        'network',
        'medium',
        `High network error rate: ${errors} errors`,
        errors,
        this.thresholds.network.errorRateWarning
      ));
    }

    return alerts;
  }

  /**
   * Check heap thresholds
   */
  private checkHeapThresholds(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const heapPercentage = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;

    if (heapPercentage >= this.thresholds.heap.critical) {
      alerts.push(this.createAlert(
        'memory',
        'critical',
        `Critical heap usage: ${heapPercentage.toFixed(1)}%`,
        heapPercentage,
        this.thresholds.heap.critical
      ));
    } else if (heapPercentage >= this.thresholds.heap.warning) {
      alerts.push(this.createAlert(
        'memory',
        'high',
        `High heap usage: ${heapPercentage.toFixed(1)}%`,
        heapPercentage,
        this.thresholds.heap.warning
      ));
    }

    return alerts;
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  /**
   * Create alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: AlertSeverity,
    message: string,
    value: number,
    threshold: number
  ): PerformanceAlert {
    return {
      id: `alert-${this.alertIdCounter++}`,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: Date.now(),
      acknowledged: false,
    };
  }

  /**
   * Add alert to collection
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Trim alerts if exceeding max
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
  }

  /**
   * Check if should monitor memory
   */
  private shouldCheckMemory(metrics: PerformanceMetrics): boolean {
    return metrics.memory.total > 0;
  }

  /**
   * Check if should monitor CPU
   */
  private shouldCheckCpu(metrics: PerformanceMetrics): boolean {
    return metrics.cpu.cores > 0;
  }

  /**
   * Check if should monitor network
   */
  private shouldCheckNetwork(metrics: PerformanceMetrics): boolean {
    return true; // Always check network if enabled
  }

  /**
   * Check if should monitor heap
   */
  private shouldCheckHeap(metrics: PerformanceMetrics): boolean {
    return metrics.memory.heapTotal > 0;
  }
}

/**
 * Factory function for creating alert service
 */
export function createAlertService(
  thresholds: AlertThresholds,
  maxAlerts: number = 100
): AlertService {
  return new AlertService(thresholds, maxAlerts);
} 