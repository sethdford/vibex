/**
 * usePerformanceMetrics Hook
 * 
 * Custom hook for collecting and monitoring performance metrics.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MetricsCollector } from './MetricsCollector';
import { AnyMetric, MetricType, MetricCategory, VisualizationType } from './types';

/**
 * Options for usePerformanceMetrics hook
 */
interface UsePerformanceMetricsOptions {
  /**
   * Whether to enable real-time updates
   */
  realTime?: boolean;
  
  /**
   * Update interval in milliseconds
   */
  updateInterval?: number;
  
  /**
   * Whether to collect system metrics
   */
  collectSystemMetrics?: boolean;
  
  /**
   * Whether to collect runtime metrics
   */
  collectRuntimeMetrics?: boolean;
  
  /**
   * Initial metrics to include
   */
  initialMetrics?: AnyMetric[];
  
  /**
   * History length for metrics
   */
  historyLength?: number;
}

/**
 * Return type for usePerformanceMetrics hook
 */
interface UsePerformanceMetricsResult {
  /**
   * All available metrics
   */
  metrics: AnyMetric[];
  
  /**
   * Get a metric by ID
   */
  getMetric: (id: string) => AnyMetric | undefined;
  
  /**
   * Get metrics by category
   */
  getMetricsByCategory: (category: MetricCategory) => AnyMetric[];
  
  /**
   * Get metrics by tag
   */
  getMetricsByTag: (tag: string) => AnyMetric[];
  
  /**
   * Create or update a counter metric
   */
  createCounter: (
    id: string,
    name: string,
    value?: number,
    options?: any
  ) => void;
  
  /**
   * Create or update a gauge metric
   */
  createGauge: (
    id: string,
    name: string,
    value: number,
    options?: any
  ) => void;
  
  /**
   * Start a timer
   */
  startTimer: (id: string) => void;
  
  /**
   * Stop a timer and record the duration
   */
  stopTimer: (id: string, name: string, options?: any) => void;
  
  /**
   * Update a histogram with a value
   */
  updateHistogram: (
    id: string,
    name: string,
    value: number,
    options?: any
  ) => void;
  
  /**
   * Start real-time updates
   */
  startUpdates: () => void;
  
  /**
   * Stop real-time updates
   */
  stopUpdates: () => void;
  
  /**
   * Manually trigger an update
   */
  updateMetrics: () => void;
  
  /**
   * Clear all metrics
   */
  clearMetrics: () => void;
  
  /**
   * Whether real-time updates are active
   */
  isUpdating: boolean;
  
  /**
   * Last update timestamp
   */
  lastUpdate: number;
  
  /**
   * Clean up resources
   */
  dispose: () => void;
}

/**
 * Custom hook for performance metrics
 * 
 * @param options Hook options
 * @returns Performance metrics methods and data
 */
export const usePerformanceMetrics = (
  options: UsePerformanceMetricsOptions = {}
): UsePerformanceMetricsResult => {
  // Extract options with defaults
  const {
    realTime = true,
    updateInterval = 1000,
    collectSystemMetrics = true,
    collectRuntimeMetrics = true,
    initialMetrics = [],
    historyLength = 100
  } = options;
  
  // State for metrics and update status
  const [metrics, setMetrics] = useState<AnyMetric[]>(initialMetrics);
  const [isUpdating, setIsUpdating] = useState<boolean>(realTime);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  
  // Create metrics collector
  const collectorRef = useRef<MetricsCollector | null>(null);
  if (!collectorRef.current) {
    collectorRef.current = new MetricsCollector({
      historyLength,
      systemMetricsInterval: updateInterval,
      collectSystemMetrics,
      collectRuntimeMetrics
    });
  }
  const collector = collectorRef.current;
  
  // Interval reference for updates
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update metrics function
  const updateMetrics = useCallback(() => {
    const allMetrics = collector.getAllMetrics();
    setMetrics([...allMetrics]);
    setLastUpdate(Date.now());
  }, [collector]);
  
  // Start real-time updates
  const startUpdates = useCallback(() => {
    if (intervalRef.current) return;
    
    // Update immediately
    updateMetrics();
    
    // Setup interval for updates
    intervalRef.current = setInterval(updateMetrics, updateInterval);
    setIsUpdating(true);
  }, [updateMetrics, updateInterval]);
  
  // Stop real-time updates
  const stopUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsUpdating(false);
  }, []);
  
  // Initialize updates on mount
  useEffect(() => {
    if (realTime) {
      startUpdates();
    }
    
    // Clean up on unmount
    return () => {
      stopUpdates();
      collector.dispose();
    };
  }, [realTime, startUpdates, stopUpdates, collector]);
  
  // Create counter wrapper
  const createCounter = useCallback((
    id: string,
    name: string,
    value: number = 1,
    options?: any
  ) => {
    collector.createCounter(id, name, value, options);
    updateMetrics();
  }, [collector, updateMetrics]);
  
  // Create gauge wrapper
  const createGauge = useCallback((
    id: string,
    name: string,
    value: number,
    options?: any
  ) => {
    collector.createGauge(id, name, value, options);
    updateMetrics();
  }, [collector, updateMetrics]);
  
  // Start timer wrapper
  const startTimer = useCallback((id: string) => {
    collector.startTimer(id);
  }, [collector]);
  
  // Stop timer wrapper
  const stopTimer = useCallback((
    id: string,
    name: string,
    options?: any
  ) => {
    collector.stopTimer(id, name, options);
    updateMetrics();
  }, [collector, updateMetrics]);
  
  // Update histogram wrapper
  const updateHistogram = useCallback((
    id: string,
    name: string,
    value: number,
    options?: any
  ) => {
    collector.updateHistogram(id, name, value, options);
    updateMetrics();
  }, [collector, updateMetrics]);
  
  // Get metric by ID wrapper
  const getMetric = useCallback((id: string): AnyMetric | undefined => {
    return collector.getMetric(id);
  }, [collector]);
  
  // Get metrics by category wrapper
  const getMetricsByCategory = useCallback((category: MetricCategory): AnyMetric[] => {
    return collector.getMetricsByCategory(category);
  }, [collector]);
  
  // Get metrics by tag wrapper
  const getMetricsByTag = useCallback((tag: string): AnyMetric[] => {
    return collector.getMetricsByTag(tag);
  }, [collector]);
  
  // Clear metrics wrapper
  const clearMetrics = useCallback(() => {
    collector.clearMetrics();
    updateMetrics();
  }, [collector, updateMetrics]);
  
  // Dispose wrapper
  const dispose = useCallback(() => {
    stopUpdates();
    collector.dispose();
  }, [collector, stopUpdates]);
  
  return {
    metrics,
    getMetric,
    getMetricsByCategory,
    getMetricsByTag,
    createCounter,
    createGauge,
    startTimer,
    stopTimer,
    updateHistogram,
    startUpdates,
    stopUpdates,
    updateMetrics,
    clearMetrics,
    isUpdating,
    lastUpdate,
    dispose
  };
};

export default usePerformanceMetrics;