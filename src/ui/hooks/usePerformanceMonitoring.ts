/**
 * Performance Monitoring Hook
 * 
 * Tracks performance metrics for the application.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  frameRate: number;
  responseTime: number;
}

export interface PerformanceEntry {
  timestamp: number;
  metrics: PerformanceMetrics;
  component?: string;
  operation?: string;
}

export interface UsePerformanceMonitoringOptions {
  sampleInterval?: number;
  maxEntries?: number;
  trackComponents?: boolean;
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions = {}) {
  const {
    sampleInterval = 1000,
    maxEntries = 100,
    trackComponents = false
  } = options;

  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const renderStartTime = useRef<number>(0);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    intervalRef.current = setInterval(() => {
      const metrics: PerformanceMetrics = {
        renderTime: performance.now() - renderStartTime.current,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        cpuUsage: 0, // Would need actual CPU monitoring
        frameRate: 60, // Simplified
        responseTime: 0
      };

      const entry: PerformanceEntry = {
        timestamp: Date.now(),
        metrics
      };

      setEntries(prev => {
        const newEntries = [...prev, entry];
        return newEntries.slice(-maxEntries);
      });
    }, sampleInterval);
  }, [isMonitoring, sampleInterval, maxEntries]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isMonitoring]);

  // Clear entries
  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  // Track render start
  const trackRenderStart = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // Track render end
  const trackRenderEnd = useCallback((component?: string) => {
    if (!trackComponents) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    
    const entry: PerformanceEntry = {
      timestamp: Date.now(),
      component,
      metrics: {
        renderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        cpuUsage: 0,
        frameRate: 60,
        responseTime: 0
      }
    };

    setEntries(prev => {
      const newEntries = [...prev, entry];
      return newEntries.slice(-maxEntries);
    });
  }, [trackComponents, maxEntries]);

  // Get average metrics
  const getAverageMetrics = useCallback((): PerformanceMetrics | null => {
    if (entries.length === 0) return null;

    const totals = entries.reduce((acc, entry) => ({
      renderTime: acc.renderTime + entry.metrics.renderTime,
      memoryUsage: acc.memoryUsage + entry.metrics.memoryUsage,
      cpuUsage: acc.cpuUsage + entry.metrics.cpuUsage,
      frameRate: acc.frameRate + entry.metrics.frameRate,
      responseTime: acc.responseTime + entry.metrics.responseTime
    }), {
      renderTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      frameRate: 0,
      responseTime: 0
    });

    const count = entries.length;
    return {
      renderTime: totals.renderTime / count,
      memoryUsage: totals.memoryUsage / count,
      cpuUsage: totals.cpuUsage / count,
      frameRate: totals.frameRate / count,
      responseTime: totals.responseTime / count
    };
  }, [entries]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    entries,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearEntries,
    trackRenderStart,
    trackRenderEnd,
    getAverageMetrics
  };
} 