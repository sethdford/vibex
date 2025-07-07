/**
 * Metrics Collection Service - Clean Architecture
 * 
 * Single Responsibility: System metrics collection and monitoring
 * Following Gemini CLI's focused service patterns
 */

import os from 'os';
import type { PerformanceMetrics, PerformanceMonitorConfig } from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Metrics Collection Service
 * Focus: System metrics gathering and data collection
 */
export class MetricsCollectionService {
  private config: PerformanceMonitorConfig;
  private collectionTimer: NodeJS.Timeout | null = null;
  private isCollecting: boolean = false;
  private networkStats = {
    bytesReceived: 0,
    bytesSent: 0,
    requestCount: 0,
    lastRequestTime: Date.now(),
  };

  constructor(config: PerformanceMonitorConfig) {
    this.config = config;
  }

  /**
   * Start metrics collection
   */
  startCollection(callback: (metrics: PerformanceMetrics) => void): void {
    if (this.isCollecting) {
      logger.warn('Metrics collection already started');
      return;
    }

    this.isCollecting = true;
    
    logger.info('Starting performance metrics collection', {
      interval: this.config.updateInterval,
      enableMemory: this.config.enableMemoryTracking,
      enableCpu: this.config.enableCpuTracking,
    });

    this.collectionTimer = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        callback(metrics);
      } catch (error) {
        logger.error('Error collecting metrics', { error });
      }
    }, this.config.updateInterval);
  }

  /**
   * Stop metrics collection
   */
  stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }

    logger.info('Performance metrics collection stopped');
  }

  /**
   * Collect current metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const timestamp = Date.now();
    
    const metrics: PerformanceMetrics = {
      timestamp,
      memory: this.config.enableMemoryTracking ? this.collectMemoryMetrics() : this.getEmptyMemoryMetrics(),
      cpu: this.config.enableCpuTracking ? this.collectCpuMetrics() : this.getEmptyCpuMetrics(),
      network: this.config.enableNetworkTracking ? this.collectNetworkMetrics() : this.getEmptyNetworkMetrics(),
      system: this.config.enableSystemTracking ? this.collectSystemMetrics() : this.getEmptySystemMetrics(),
    };

    logger.debug('Metrics collected', {
      timestamp,
      memoryUsage: metrics.memory.percentage,
      cpuUsage: metrics.cpu.usage,
    });

    return metrics;
  }

  /**
   * Check if currently collecting
   */
  isCurrentlyCollecting(): boolean {
    return this.isCollecting;
  }

  /**
   * Update network statistics
   */
  updateNetworkStats(bytesReceived: number, bytesSent: number): void {
    this.networkStats.bytesReceived += bytesReceived;
    this.networkStats.bytesSent += bytesSent;
    this.networkStats.requestCount++;
    this.networkStats.lastRequestTime = Date.now();
  }

  /**
   * Reset network statistics
   */
  resetNetworkStats(): void {
    this.networkStats = {
      bytesReceived: 0,
      bytesSent: 0,
      requestCount: 0,
      lastRequestTime: Date.now(),
    };
  }

  /**
   * Get configuration
   */
  getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...updates };
    
    logger.debug('Metrics collection config updated', { updates });
  }

  // ============================================================================
  // Private Methods - Metrics Collection
  // ============================================================================

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      return {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      };
    } catch (error) {
      logger.error('Error collecting memory metrics', { error });
      return this.getEmptyMemoryMetrics();
    }
  }

  /**
   * Collect CPU metrics
   */
  private collectCpuMetrics() {
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();
      
      // Calculate CPU usage from load average
      const usage = Math.min((loadAverage[0] / cpus.length) * 100, 100);

      return {
        usage: Math.round(usage * 100) / 100,
        loadAverage,
        cores: cpus.length,
      };
    } catch (error) {
      logger.error('Error collecting CPU metrics', { error });
      return this.getEmptyCpuMetrics();
    }
  }

  /**
   * Collect network metrics
   */
  private collectNetworkMetrics() {
    try {
      const now = Date.now();
      const timeDiff = (now - this.networkStats.lastRequestTime) / 1000; // seconds
      const requestsPerSecond = timeDiff > 0 ? this.networkStats.requestCount / timeDiff : 0;

      return {
        bytesReceived: this.networkStats.bytesReceived,
        bytesSent: this.networkStats.bytesSent,
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        latency: 0, // Would need external measurement
        errors: 0, // Would need error tracking
      };
    } catch (error) {
      logger.error('Error collecting network metrics', { error });
      return this.getEmptyNetworkMetrics();
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics() {
    try {
      return {
        uptime: os.uptime(),
        platform: os.platform(),
        nodeVersion: process.version,
        pid: process.pid,
      };
    } catch (error) {
      logger.error('Error collecting system metrics', { error });
      return this.getEmptySystemMetrics();
    }
  }

  // ============================================================================
  // Private Methods - Empty Metrics
  // ============================================================================

  private getEmptyMemoryMetrics() {
    return {
      used: 0,
      total: 0,
      percentage: 0,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };
  }

  private getEmptyCpuMetrics() {
    return {
      usage: 0,
      loadAverage: [0, 0, 0],
      cores: 0,
    };
  }

  private getEmptyNetworkMetrics() {
    return {
      bytesReceived: 0,
      bytesSent: 0,
      requestsPerSecond: 0,
      latency: 0,
      errors: 0,
    };
  }

  private getEmptySystemMetrics() {
    return {
      uptime: 0,
      platform: 'unknown',
      nodeVersion: 'unknown',
      pid: 0,
    };
  }
}

/**
 * Default performance monitor configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceMonitorConfig = {
  updateInterval: 1000,
  maxHistoryLength: 60,
  alertThresholds: {
    memory: {
      warning: 80,
      critical: 90,
    },
    cpu: {
      warning: 70,
      critical: 85,
    },
    network: {
      latencyWarning: 1000,
      latencyCritical: 5000,
      errorRateWarning: 5,
      errorRateCritical: 10,
    },
    heap: {
      warning: 80,
      critical: 90,
    },
  },
  enableMemoryTracking: true,
  enableCpuTracking: true,
  enableNetworkTracking: true,
  enableSystemTracking: true,
};

/**
 * Factory function for creating metrics collection service
 */
export function createMetricsCollectionService(
  config: Partial<PerformanceMonitorConfig> = {}
): MetricsCollectionService {
  const fullConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  return new MetricsCollectionService(fullConfig);
} 