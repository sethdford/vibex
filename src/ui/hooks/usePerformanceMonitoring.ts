/**
 * Performance Monitoring Hook
 * 
 * Custom React hook for performance monitoring integration with real-time metrics,
 * alert management, and performance analytics.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PerformanceMetrics, PerformanceAlert } from '../components/PerformanceMonitor.js';
import { logger } from '../../utils/logger.js';

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  /**
   * Enable monitoring
   */
  enabled: boolean;
  
  /**
   * Update interval in milliseconds
   */
  updateInterval: number;
  
  /**
   * Maximum history length
   */
  maxHistoryLength: number;
  
  /**
   * Alert thresholds
   */
  thresholds: {
    memory: { warning: number; critical: number };
    cpu: { warning: number; critical: number };
  };
  
  /**
   * Enable alerts
   */
  enableAlerts: boolean;
  
  /**
   * Enable performance analytics
   */
  enableAnalytics: boolean;
}

/**
 * Performance analytics data
 */
export interface PerformanceAnalytics {
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  averageCpuUsage: number;
  peakCpuUsage: number;
  totalAlerts: number;
  criticalAlerts: number;
  uptimeHours: number;
  performanceScore: number;
  trends: {
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    cpuTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

/**
 * Performance monitoring hook return type
 */
export interface UsePerformanceMonitoringReturn {
  /**
   * Current metrics
   */
  currentMetrics: PerformanceMetrics | null;
  
  /**
   * Metrics history
   */
  metricsHistory: PerformanceMetrics[];
  
  /**
   * Active alerts
   */
  alerts: PerformanceAlert[];
  
  /**
   * Performance analytics
   */
  analytics: PerformanceAnalytics | null;
  
  /**
   * Monitoring status
   */
  isMonitoring: boolean;
  
  /**
   * Collection status
   */
  isCollecting: boolean;
  
  /**
   * Configuration
   */
  config: PerformanceMonitoringConfig;
  
  /**
   * Start monitoring
   */
  startMonitoring: () => void;
  
  /**
   * Stop monitoring
   */
  stopMonitoring: () => void;
  
  /**
   * Update configuration
   */
  updateConfig: (updates: Partial<PerformanceMonitoringConfig>) => void;
  
  /**
   * Clear history
   */
  clearHistory: () => void;
  
  /**
   * Acknowledge alert
   */
  acknowledgeAlert: (alertId: string) => void;
  
  /**
   * Clear all alerts
   */
  clearAlerts: () => void;
  
  /**
   * Export metrics data
   */
  exportMetrics: () => string;
  
  /**
   * Get performance summary
   */
  getPerformanceSummary: () => {
    status: 'excellent' | 'good' | 'warning' | 'critical';
    score: number;
    recommendations: string[];
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PerformanceMonitoringConfig = {
  enabled: true,
  updateInterval: 1000,
  maxHistoryLength: 300, // 5 minutes at 1 second intervals
  thresholds: {
    memory: { warning: 70, critical: 90 },
    cpu: { warning: 70, critical: 90 },
  },
  enableAlerts: true,
  enableAnalytics: true,
};

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitoring(
  initialConfig: Partial<PerformanceMonitoringConfig> = {}
): UsePerformanceMonitoringReturn {
  const [config, setConfig] = useState<PerformanceMonitoringConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // Collect performance metrics
  const collectMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    const timestamp = Date.now();
    
    // Memory metrics
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // CPU metrics
    const cpus = require('os').cpus();
    const loadAverage = require('os').loadavg();
    
    // System metrics
    const uptime = require('os').uptime();
    const platform = require('os').platform();
    const nodeVersion = process.version;
    const pid = process.pid;
    
    const metrics: PerformanceMetrics = {
      timestamp,
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      cpu: {
        usage: Math.min((loadAverage[0] / cpus.length) * 100, 100),
        loadAverage,
        cores: cpus.length,
      },
      network: {
        bytesReceived: 0,
        bytesSent: 0,
        requestsPerSecond: 0,
        latency: 0,
        errors: 0,
      },
      system: {
        uptime,
        platform,
        nodeVersion,
        pid,
      },
    };
    
    return metrics;
  }, []);
  
  // Check for alerts
  const checkAlerts = useCallback((metrics: PerformanceMetrics) => {
    if (!config.enableAlerts) return;
    
    const newAlerts: PerformanceAlert[] = [];
    
    // Memory alerts
    if (metrics.memory.percentage > config.thresholds.memory.critical) {
      newAlerts.push({
        id: `memory-critical-${Date.now()}`,
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${metrics.memory.percentage.toFixed(1)}%`,
        value: metrics.memory.percentage,
        threshold: config.thresholds.memory.critical,
        timestamp: metrics.timestamp,
        acknowledged: false,
      });
    } else if (metrics.memory.percentage > config.thresholds.memory.warning) {
      newAlerts.push({
        id: `memory-warning-${Date.now()}`,
        type: 'memory',
        severity: 'medium',
        message: `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`,
        value: metrics.memory.percentage,
        threshold: config.thresholds.memory.warning,
        timestamp: metrics.timestamp,
        acknowledged: false,
      });
    }
    
    // CPU alerts
    if (metrics.cpu.usage > config.thresholds.cpu.critical) {
      newAlerts.push({
        id: `cpu-critical-${Date.now()}`,
        type: 'cpu',
        severity: 'critical',
        message: `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        value: metrics.cpu.usage,
        threshold: config.thresholds.cpu.critical,
        timestamp: metrics.timestamp,
        acknowledged: false,
      });
    } else if (metrics.cpu.usage > config.thresholds.cpu.warning) {
      newAlerts.push({
        id: `cpu-warning-${Date.now()}`,
        type: 'cpu',
        severity: 'medium',
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        value: metrics.cpu.usage,
        threshold: config.thresholds.cpu.warning,
        timestamp: metrics.timestamp,
        acknowledged: false,
      });
    }
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
      logger.warn('Performance alerts generated', { alertCount: newAlerts.length });
    }
  }, [config.enableAlerts, config.thresholds]);
  
  // Calculate analytics
  const calculateAnalytics = useCallback((): PerformanceAnalytics | null => {
    if (!config.enableAnalytics || metricsHistory.length === 0) return null;
    
    const memoryValues = metricsHistory.map(m => m.memory.percentage);
    const cpuValues = metricsHistory.map(m => m.cpu.usage);
    
    const averageMemoryUsage = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    const peakMemoryUsage = Math.max(...memoryValues);
    const averageCpuUsage = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    const peakCpuUsage = Math.max(...cpuValues);
    
    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    
    const uptimeHours = (Date.now() - startTimeRef.current) / (1000 * 60 * 60);
    
    // Calculate performance score (0-100)
    const memoryScore = Math.max(0, 100 - averageMemoryUsage);
    const cpuScore = Math.max(0, 100 - averageCpuUsage);
    const alertPenalty = Math.min(50, criticalAlerts * 10);
    const performanceScore = Math.max(0, (memoryScore + cpuScore) / 2 - alertPenalty);
    
    // Calculate trends
    const recentMemory = memoryValues.slice(-10);
    const earlyMemory = memoryValues.slice(0, 10);
    const memoryTrend = recentMemory.reduce((a, b) => a + b, 0) / recentMemory.length >
                       earlyMemory.reduce((a, b) => a + b, 0) / earlyMemory.length + 5
                       ? 'increasing' : 'decreasing';
    
    const recentCpu = cpuValues.slice(-10);
    const earlyCpu = cpuValues.slice(0, 10);
    const cpuTrend = recentCpu.reduce((a, b) => a + b, 0) / recentCpu.length >
                     earlyCpu.reduce((a, b) => a + b, 0) / earlyCpu.length + 5
                     ? 'increasing' : 'decreasing';
    
    return {
      averageMemoryUsage,
      peakMemoryUsage,
      averageCpuUsage,
      peakCpuUsage,
      totalAlerts,
      criticalAlerts,
      uptimeHours,
      performanceScore,
      trends: {
        memoryTrend: memoryTrend as 'increasing' | 'decreasing',
        cpuTrend: cpuTrend as 'increasing' | 'decreasing',
      },
    };
  }, [config.enableAnalytics, metricsHistory, alerts]);
  
  // Update metrics
  const updateMetrics = useCallback(async () => {
    if (!config.enabled) return;
    
    try {
      setIsCollecting(true);
      const metrics = await collectMetrics();
      
      setCurrentMetrics(metrics);
      setMetricsHistory(prev => [metrics, ...prev].slice(0, config.maxHistoryLength));
      
      checkAlerts(metrics);
    } catch (error) {
      logger.error('Failed to collect performance metrics', { error });
    } finally {
      setIsCollecting(false);
    }
  }, [config.enabled, config.maxHistoryLength, collectMetrics, checkAlerts]);
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    startTimeRef.current = Date.now();
    
    // Initial collection
    updateMetrics();
    
    // Set up interval
    intervalRef.current = setInterval(updateMetrics, config.updateInterval);
    
    logger.info('Performance monitoring started', { 
      updateInterval: config.updateInterval,
      maxHistoryLength: config.maxHistoryLength 
    });
  }, [isMonitoring, updateMetrics, config.updateInterval, config.maxHistoryLength]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    logger.info('Performance monitoring stopped');
  }, [isMonitoring]);
  
  // Update configuration
  const updateConfig = useCallback((updates: Partial<PerformanceMonitoringConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    
    // Restart monitoring if interval changed
    if (updates.updateInterval && isMonitoring) {
      stopMonitoring();
      setTimeout(startMonitoring, 100);
    }
  }, [isMonitoring, startMonitoring, stopMonitoring]);
  
  // Clear history
  const clearHistory = useCallback(() => {
    setMetricsHistory([]);
    logger.info('Performance metrics history cleared');
  }, []);
  
  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);
  
  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    logger.info('Performance alerts cleared');
  }, []);
  
  // Export metrics
  const exportMetrics = useCallback(() => {
    const exportData = {
      timestamp: Date.now(),
      config,
      currentMetrics,
      metricsHistory,
      alerts,
      analytics: calculateAnalytics(),
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [config, currentMetrics, metricsHistory, alerts, calculateAnalytics]);
  
  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const analytics = calculateAnalytics();
    
    if (!analytics) {
      return {
        status: 'good' as const,
        score: 100,
        recommendations: ['Start monitoring to get performance insights'],
      };
    }
    
    const { performanceScore, criticalAlerts, averageMemoryUsage, averageCpuUsage } = analytics;
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (averageMemoryUsage > 80) {
      recommendations.push('Consider optimizing memory usage or increasing available memory');
    }
    
    if (averageCpuUsage > 80) {
      recommendations.push('High CPU usage detected - consider optimizing algorithms or scaling');
    }
    
    if (criticalAlerts > 0) {
      recommendations.push(`Address ${criticalAlerts} critical performance alerts`);
    }
    
    if (analytics.trends.memoryTrend === 'increasing') {
      recommendations.push('Memory usage is trending upward - monitor for potential leaks');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal - no immediate action required');
    }
    
    // Determine status
    let status: 'excellent' | 'good' | 'warning' | 'critical';
    
    if (performanceScore >= 90) {
      status = 'excellent';
    } else if (performanceScore >= 70) {
      status = 'good';
    } else if (performanceScore >= 50) {
      status = 'warning';
    } else {
      status = 'critical';
    }
    
    return {
      status,
      score: Math.round(performanceScore),
      recommendations,
    };
  }, [calculateAnalytics]);
  
  // Auto-start monitoring if enabled
  useEffect(() => {
    if (config.enabled && !isMonitoring) {
      startMonitoring();
    } else if (!config.enabled && isMonitoring) {
      stopMonitoring();
    }
  }, [config.enabled, isMonitoring, startMonitoring, stopMonitoring]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    currentMetrics,
    metricsHistory,
    alerts,
    analytics: calculateAnalytics(),
    isMonitoring,
    isCollecting,
    config,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    clearHistory,
    acknowledgeAlert,
    clearAlerts,
    exportMetrics,
    getPerformanceSummary,
  };
} 