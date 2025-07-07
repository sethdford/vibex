/**
 * Performance Metrics Collector
 * 
 * Collects and manages performance metrics from various sources.
 */

import os from 'os';
import process from 'process';
import { 
  AnyMetric, 
  MetricType, 
  MetricCategory, 
  CounterMetric, 
  GaugeMetric, 
  TimerMetric,
  HistogramMetric
} from './types';

/**
 * Options for metrics collector
 */
export interface MetricsCollectorOptions {
  /**
   * History length to keep for metrics
   */
  historyLength?: number;
  
  /**
   * Collection interval for system metrics in ms
   */
  systemMetricsInterval?: number;
  
  /**
   * Whether to collect system metrics automatically
   */
  collectSystemMetrics?: boolean;
  
  /**
   * Whether to collect runtime metrics automatically
   */
  collectRuntimeMetrics?: boolean;
  
  /**
   * Tags to apply to all metrics
   */
  globalTags?: string[];
}

/**
 * Performance metrics collector class
 */
export class MetricsCollector {
  private metrics: Map<string, AnyMetric> = new Map();
  private timers: Map<string, number> = new Map();
  private histogramBuckets: Map<string, number[]> = new Map();
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  private options: Required<MetricsCollectorOptions>;
  
  /**
   * Default options for metrics collector
   */
  private static DEFAULT_OPTIONS: Required<MetricsCollectorOptions> = {
    historyLength: 100,
    systemMetricsInterval: 1000,
    collectSystemMetrics: true,
    collectRuntimeMetrics: true,
    globalTags: []
  };
  
  /**
   * Constructor
   * 
   * @param options Options for metrics collector
   */
  constructor(options?: MetricsCollectorOptions) {
    this.options = {
      ...MetricsCollector.DEFAULT_OPTIONS,
      ...options
    };
    
    // Start collecting metrics if enabled
    if (this.options.collectSystemMetrics) {
      this.startSystemMetricsCollection();
    }
    
    if (this.options.collectRuntimeMetrics) {
      this.startRuntimeMetricsCollection();
    }
  }
  
  /**
   * Create or update a counter metric
   * 
   * @param id Metric ID
   * @param name Display name
   * @param value Value to increment by (default: 1)
   * @param options Additional options
   * @returns The updated metric
   */
  createCounter(
    id: string,
    name: string,
    value: number = 1,
    options?: Partial<Omit<CounterMetric, 'id' | 'name' | 'value' | 'type' | 'timestamp' | 'history' | 'total'>>
  ): CounterMetric {
    const existing = this.metrics.get(id) as CounterMetric | undefined;
    const now = Date.now();
    
    if (existing && existing.type === MetricType.COUNTER) {
      // Update existing counter
      const newTotal = existing.total + value;
      const timeDiff = (now - existing.timestamp) / 1000; // seconds
      const rate = timeDiff > 0 ? value / timeDiff : 0;
      
      // Add to history
      const history = [...(existing.history || [])];
      if (history.length >= this.options.historyLength) {
        history.shift();
      }
      history.push({ value: existing.value, timestamp: existing.timestamp });
      
      const updated: CounterMetric = {
        ...existing,
        value,
        total: newTotal,
        rate,
        timestamp: now,
        history
      };
      
      this.metrics.set(id, updated);
      return updated;
    } else {
      // Create new counter
      const metric: CounterMetric = {
        id,
        name,
        type: MetricType.COUNTER,
        category: options?.category || MetricCategory.CUSTOM,
        value,
        total: value,
        rate: 0,
        timestamp: now,
        history: [],
        tags: [...(this.options.globalTags || []), ...(options?.tags || [])],
        ...options
      };
      
      this.metrics.set(id, metric);
      return metric;
    }
  }
  
  /**
   * Create or update a gauge metric
   * 
   * @param id Metric ID
   * @param name Display name
   * @param value Current value
   * @param options Additional options
   * @returns The updated metric
   */
  createGauge(
    id: string,
    name: string,
    value: number,
    options?: Partial<Omit<GaugeMetric, 'id' | 'name' | 'value' | 'type' | 'timestamp' | 'history'>>
  ): GaugeMetric {
    const existing = this.metrics.get(id) as GaugeMetric | undefined;
    const now = Date.now();
    
    if (existing && existing.type === MetricType.GAUGE) {
      // Update existing gauge
      // Add to history
      const history = [...(existing.history || [])];
      if (history.length >= this.options.historyLength) {
        history.shift();
      }
      history.push({ value: existing.value, timestamp: existing.timestamp });
      
      // Update min/max
      const min = existing.min !== undefined ? Math.min(existing.min, value) : value;
      const max = existing.max !== undefined ? Math.max(existing.max, value) : value;
      
      const updated: GaugeMetric = {
        ...existing,
        value,
        min,
        max,
        timestamp: now,
        history
      };
      
      this.metrics.set(id, updated);
      return updated;
    } else {
      // Create new gauge
      const metric: GaugeMetric = {
        id,
        name,
        type: MetricType.GAUGE,
        category: options?.category || MetricCategory.CUSTOM,
        value,
        min: value,
        max: value,
        timestamp: now,
        history: [],
        tags: [...(this.options.globalTags || []), ...(options?.tags || [])],
        ...options
      };
      
      this.metrics.set(id, metric);
      return metric;
    }
  }
  
  /**
   * Start a timer
   * 
   * @param id Timer ID
   * @returns Current timestamp
   */
  startTimer(id: string): number {
    const startTime = performance.now();
    this.timers.set(id, startTime);
    return startTime;
  }
  
  /**
   * Stop a timer and record the duration
   * 
   * @param id Timer ID
   * @param name Display name
   * @param options Additional options
   * @returns The timer metric, or undefined if timer wasn't started
   */
  stopTimer(
    id: string,
    name: string,
    options?: Partial<Omit<TimerMetric, 'id' | 'name' | 'value' | 'type' | 'timestamp' | 'history' | 'count' | 'mean'>>
  ): TimerMetric | undefined {
    const startTime = this.timers.get(id);
    if (startTime === undefined) {
      return undefined;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    this.timers.delete(id);
    
    const existing = this.metrics.get(id) as TimerMetric | undefined;
    const now = Date.now();
    
    if (existing && existing.type === MetricType.TIMER) {
      // Update existing timer
      // Add to history
      const history = [...(existing.history || [])];
      if (history.length >= this.options.historyLength) {
        history.shift();
      }
      history.push({ value: existing.value, timestamp: existing.timestamp });
      
      // Update count and mean
      const newCount = existing.count + 1;
      const newMean = ((existing.mean * existing.count) + duration) / newCount;
      
      // Calculate percentiles (simplified)
      const allDurations = history
        .map(h => h.value as number)
        .concat(duration)
        .sort((a, b) => a - b);
      
      const p50 = allDurations[Math.floor(allDurations.length * 0.5)];
      const p95 = allDurations[Math.floor(allDurations.length * 0.95)];
      const p99 = allDurations[Math.floor(allDurations.length * 0.99)];
      
      const updated: TimerMetric = {
        ...existing,
        value: duration,
        count: newCount,
        mean: newMean,
        timestamp: now,
        history,
        percentiles: {
          p50,
          p95,
          p99
        }
      };
      
      this.metrics.set(id, updated);
      return updated;
    } else {
      // Create new timer
      const metric: TimerMetric = {
        id,
        name,
        type: MetricType.TIMER,
        category: options?.category || MetricCategory.CUSTOM,
        value: duration,
        count: 1,
        mean: duration,
        timestamp: now,
        history: [],
        percentiles: {
          p50: duration,
          p95: duration,
          p99: duration
        },
        tags: [...(this.options.globalTags || []), ...(options?.tags || [])],
        ...options
      };
      
      this.metrics.set(id, metric);
      return metric;
    }
  }
  
  /**
   * Create or update a histogram
   * 
   * @param id Metric ID
   * @param name Display name
   * @param value Value to add to histogram
   * @param options Additional options
   * @returns The updated metric
   */
  updateHistogram(
    id: string,
    name: string,
    value: number,
    options?: Partial<Omit<HistogramMetric, 'id' | 'name' | 'value' | 'type' | 'timestamp' | 'history' | 'buckets' | 'counts' | 'sum' | 'count'>> & {
      buckets?: number[]
    }
  ): HistogramMetric {
    // Get or create bucket boundaries
    const buckets = options?.buckets || this.histogramBuckets.get(id);
    if (!buckets) {
      // Create default bucket boundaries if not provided
      const defaultBuckets = [
        0, 5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000
      ];
      this.histogramBuckets.set(id, defaultBuckets);
    } else if (options?.buckets) {
      this.histogramBuckets.set(id, options.buckets);
    }
    
    const bucketBoundaries = this.histogramBuckets.get(id)!;
    const existing = this.metrics.get(id) as HistogramMetric | undefined;
    const now = Date.now();
    
    if (existing && existing.type === MetricType.HISTOGRAM) {
      // Update existing histogram
      // Add to history
      const history = [...(existing.history || [])];
      if (history.length >= this.options.historyLength) {
        history.shift();
      }
      history.push({ value: existing.value, timestamp: existing.timestamp });
      
      // Create a copy of the counts array
      const counts = [...existing.counts];
      
      // Increment the appropriate bucket
      for (let i = 0; i < bucketBoundaries.length; i++) {
        if (value <= bucketBoundaries[i]) {
          counts[i]++;
          break;
        }
      }
      
      const updated: HistogramMetric = {
        ...existing,
        value: history.map(h => Array.isArray(h.value) ? h.value[0] : h.value as number).concat(value),
        buckets: bucketBoundaries,
        counts,
        sum: existing.sum + value,
        count: existing.count + 1,
        timestamp: now,
        history
      };
      
      this.metrics.set(id, updated);
      return updated;
    } else {
      // Create new histogram
      const counts = bucketBoundaries.map(() => 0);
      
      // Increment the appropriate bucket
      for (let i = 0; i < bucketBoundaries.length; i++) {
        if (value <= bucketBoundaries[i]) {
          counts[i] = 1;
          break;
        }
      }
      
      const metric: HistogramMetric = {
        id,
        name,
        type: MetricType.HISTOGRAM,
        category: options?.category || MetricCategory.CUSTOM,
        value: [value],
        buckets: bucketBoundaries,
        counts,
        sum: value,
        count: 1,
        timestamp: now,
        history: [],
        tags: [...(this.options.globalTags || []), ...(options?.tags || [])],
        ...options
      };
      
      this.metrics.set(id, metric);
      return metric;
    }
  }
  
  /**
   * Get a metric by ID
   * 
   * @param id Metric ID
   * @returns The metric or undefined if not found
   */
  getMetric(id: string): AnyMetric | undefined {
    return this.metrics.get(id);
  }
  
  /**
   * Get all metrics
   * 
   * @returns Array of all metrics
   */
  getAllMetrics(): AnyMetric[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * Get metrics by category
   * 
   * @param category Metric category
   * @returns Array of metrics in the category
   */
  getMetricsByCategory(category: MetricCategory): AnyMetric[] {
    return this.getAllMetrics().filter(metric => metric.category === category);
  }
  
  /**
   * Get metrics by tag
   * 
   * @param tag Tag to filter by
   * @returns Array of metrics with the tag
   */
  getMetricsByTag(tag: string): AnyMetric[] {
    return this.getAllMetrics().filter(metric => metric.tags?.includes(tag));
  }
  
  /**
   * Remove a metric
   * 
   * @param id Metric ID
   */
  removeMetric(id: string): void {
    this.metrics.delete(id);
    this.histogramBuckets.delete(id);
  }
  
  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
    this.histogramBuckets.clear();
  }
  
  /**
   * Start collecting system metrics
   */
  startSystemMetricsCollection(): void {
    if (this.collectionIntervals.has('system')) {
      return; // Already collecting
    }
    
    const collectSystemMetrics = () => {
      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.createGauge('system.cpu.user', 'CPU User', cpuUsage.user / 1000, {
        category: MetricCategory.CPU,
        unit: 'ms',
        tags: ['cpu', 'system']
      });
      this.createGauge('system.cpu.system', 'CPU System', cpuUsage.system / 1000, {
        category: MetricCategory.CPU,
        unit: 'ms',
        tags: ['cpu', 'system']
      });
      
      // Memory usage
      const memoryUsage = process.memoryUsage();
      this.createGauge('system.memory.rss', 'Memory RSS', memoryUsage.rss / (1024 * 1024), {
        category: MetricCategory.MEMORY,
        unit: 'MB',
        tags: ['memory', 'system']
      });
      this.createGauge('system.memory.heapTotal', 'Memory Heap Total', memoryUsage.heapTotal / (1024 * 1024), {
        category: MetricCategory.MEMORY,
        unit: 'MB',
        tags: ['memory', 'system', 'heap']
      });
      this.createGauge('system.memory.heapUsed', 'Memory Heap Used', memoryUsage.heapUsed / (1024 * 1024), {
        category: MetricCategory.MEMORY,
        unit: 'MB',
        tags: ['memory', 'system', 'heap']
      });
      this.createGauge('system.memory.external', 'Memory External', memoryUsage.external / (1024 * 1024), {
        category: MetricCategory.MEMORY,
        unit: 'MB',
        tags: ['memory', 'system']
      });
      
      // System memory
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      
      this.createGauge('system.memory.total', 'Total System Memory', totalMem / (1024 * 1024), {
        category: MetricCategory.MEMORY,
        unit: 'MB',
        tags: ['memory', 'system', 'os']
      });
      this.createGauge('system.memory.free', 'Free System Memory', freeMem / (1024 * 1024), {
        category: MetricCategory.MEMORY,
        unit: 'MB',
        tags: ['memory', 'system', 'os']
      });
      this.createGauge('system.memory.used', 'Used System Memory', usedMem / (1024 * 1024), {
        category: MetricCategory.MEMORY,
        unit: 'MB',
        tags: ['memory', 'system', 'os']
      });
      this.createGauge('system.memory.percentUsed', 'Memory Usage %', (usedMem / totalMem) * 100, {
        category: MetricCategory.MEMORY,
        unit: '%',
        tags: ['memory', 'system', 'os']
      });
      
      // CPU load
      const loadAvg = os.loadavg();
      this.createGauge('system.cpu.load1', 'CPU Load (1m)', loadAvg[0], {
        category: MetricCategory.CPU,
        tags: ['cpu', 'system', 'load']
      });
      this.createGauge('system.cpu.load5', 'CPU Load (5m)', loadAvg[1], {
        category: MetricCategory.CPU,
        tags: ['cpu', 'system', 'load']
      });
      this.createGauge('system.cpu.load15', 'CPU Load (15m)', loadAvg[2], {
        category: MetricCategory.CPU,
        tags: ['cpu', 'system', 'load']
      });
    };
    
    // Collect immediately then schedule interval
    collectSystemMetrics();
    const interval = setInterval(collectSystemMetrics, this.options.systemMetricsInterval);
    this.collectionIntervals.set('system', interval);
  }
  
  /**
   * Start collecting runtime metrics
   */
  startRuntimeMetricsCollection(): void {
    if (this.collectionIntervals.has('runtime')) {
      return; // Already collecting
    }
    
    const collectRuntimeMetrics = () => {
      // Uptime
      this.createGauge('runtime.uptime', 'Uptime', process.uptime(), {
        category: MetricCategory.RUNTIME,
        unit: 's',
        tags: ['runtime', 'system']
      });
      
      // Event loop lag (simplified)
      const start = Date.now();
      setTimeout(() => {
        const lag = Date.now() - start;
        this.createGauge('runtime.eventLoopLag', 'Event Loop Lag', lag - 1, { // Subtract 1ms for the timer itself
          category: MetricCategory.RUNTIME,
          unit: 'ms',
          tags: ['runtime', 'system', 'eventloop']
        });
      }, 1);
    };
    
    // Collect immediately then schedule interval
    collectRuntimeMetrics();
    const interval = setInterval(collectRuntimeMetrics, this.options.systemMetricsInterval);
    this.collectionIntervals.set('runtime', interval);
  }
  
  /**
   * Stop collecting system metrics
   */
  stopSystemMetricsCollection(): void {
    const interval = this.collectionIntervals.get('system');
    if (interval) {
      clearInterval(interval);
      this.collectionIntervals.delete('system');
    }
  }
  
  /**
   * Stop collecting runtime metrics
   */
  stopRuntimeMetricsCollection(): void {
    const interval = this.collectionIntervals.get('runtime');
    if (interval) {
      clearInterval(interval);
      this.collectionIntervals.delete('runtime');
    }
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    // Clear all intervals
    for (const interval of this.collectionIntervals.values()) {
      clearInterval(interval);
    }
    this.collectionIntervals.clear();
  }
}