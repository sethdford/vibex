/**
 * Performance Monitoring System
 * 
 * Specialized system for tracking application performance metrics,
 * bottlenecks, and optimization opportunities.
 */

import { enhancedTelemetry, PerformanceMarker, SpanStatus } from './enhanced-telemetry.js';
import { telemetry } from './index.js';
import { logger } from '../utils/logger.js';

/**
 * Performance metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
}

/**
 * Performance scope types
 */
export enum PerformanceScope {
  SYSTEM = 'system',
  AI = 'ai',
  UI = 'ui',
  TOOLS = 'tools',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  MEMORY = 'memory',
}

/**
 * Custom performance marker with timing information
 */
export interface CustomPerformanceMarker {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes?: Record<string, unknown>;
}

/**
 * Component performance profile
 */
export interface ComponentProfile {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
}

/**
 * Performance profile
 */
export interface PerformanceProfile {
  startupTime?: number;
  commandExecutionTimes: Record<string, number[]>;
  aiRequestTimes: Record<string, number[]>;
  networkRequestTimes: Record<string, number[]>;
  toolExecutionTimes: Record<string, number[]>;
  componentRenderTimes: Record<string, ComponentProfile>;
}

/**
 * Performance bottleneck
 */
export interface PerformanceBottleneck {
  scope: PerformanceScope;
  name: string;
  averageTime: number;
  percentile95: number;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  /**
   * Whether to enable performance monitoring
   */
  enabled?: boolean;
  
  /**
   * Whether to track UI component rendering
   */
  trackComponentRendering?: boolean;
  
  /**
   * Whether to track function calls
   */
  trackFunctionCalls?: boolean;
  
  /**
   * Slow threshold in milliseconds
   */
  slowThresholdMs?: number;
  
  /**
   * Performance logging level
   */
  performanceLogLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  /**
   * Automatic bottleneck detection
   */
  automaticBottleneckDetection?: boolean;
  
  /**
   * Bottleneck detection interval in milliseconds
   */
  bottleneckDetectionIntervalMs?: number;
}

/**
 * Performance Monitoring System
 */
export class PerformanceMonitoringSystem {
  private customMarkers: Map<string, CustomPerformanceMarker> = new Map();
  private profile: PerformanceProfile = {
    commandExecutionTimes: {},
    aiRequestTimes: {},
    networkRequestTimes: {},
    toolExecutionTimes: {},
    componentRenderTimes: {},
  };
  private config: Required<PerformanceMonitoringConfig>;
  private bottleneckDetectionInterval?: NodeJS.Timeout;
  
  constructor(config: PerformanceMonitoringConfig = {}) {
    // Default configuration
    this.config = {
      enabled: telemetry.isEnabled(),
      trackComponentRendering: true,
      trackFunctionCalls: true,
      slowThresholdMs: 500,
      performanceLogLevel: 'debug',
      automaticBottleneckDetection: true,
      bottleneckDetectionIntervalMs: 300000, // 5 minutes
      ...config,
    };
    
    if (this.config.enabled) {
      this.initialize();
    } else {
      logger.debug('Performance monitoring system is disabled.');
    }
  }
  
  /**
   * Initialize the performance monitoring system
   */
  private initialize(): void {
    logger.debug('Initializing performance monitoring system');
    
    // Track CLI startup time
    this.trackStartupTime();
    
    // Start bottleneck detection
    if (this.config.automaticBottleneckDetection) {
      this.startBottleneckDetection();
    }
    
    // Set up additional performance tracking
    this.setupEventListeners();
    
    logger.debug('Performance monitoring system initialized');
  }
  
  /**
   * Track function execution time
   */
  public trackFunction<T extends (...args: readonly unknown[]) => unknown>(
    fn: T,
    name: string,
    scope: PerformanceScope
  ): T {
    if (!this.config.enabled || !this.config.trackFunctionCalls) {
      return fn;
    }
    
    return ((...args: readonly unknown[]) => {
      const spanContext = enhancedTelemetry.startSpan(name, undefined, {
        scope,
        function: name,
      });
      
      const startTime = performance.now();
      try {
        const result = fn(...args);
        
        // Handle promise results
        if (result instanceof Promise) {
          return result
            .then(value => {
              this.recordFunctionExecution(name, scope, startTime);
              enhancedTelemetry.endSpan(spanContext, SpanStatus.OK);
              return value;
            })
            .catch(error => {
              this.recordFunctionExecution(name, scope, startTime);
              enhancedTelemetry.endSpan(spanContext, SpanStatus.ERROR, {
                error: error?.message || 'Unknown error',
              });
              throw error;
            });
        }
        
        // Handle synchronous results
        this.recordFunctionExecution(name, scope, startTime);
        enhancedTelemetry.endSpan(spanContext, SpanStatus.OK);
        return result;
      } catch (error) {
        this.recordFunctionExecution(name, scope, startTime);
        enhancedTelemetry.endSpan(spanContext, SpanStatus.ERROR, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    }) as T;
  }
  
  /**
   * Start tracking a custom performance marker
   */
  public startMarker(name: string, attributes?: Record<string, unknown>): string {
    if (!this.config.enabled) {
      return name;
    }
    
    const markerId = `${name}_${Date.now()}`;
    this.customMarkers.set(markerId, {
      name,
      startTime: performance.now(),
      attributes,
    });
    
    return markerId;
  }
  
  /**
   * End a custom performance marker and record metrics
   */
  public endMarker(markerId: string): number {
    if (!this.config.enabled) {
      return 0;
    }
    
    const marker = this.customMarkers.get(markerId);
    if (!marker) {
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - marker.startTime;
    
    marker.endTime = endTime;
    marker.duration = duration;
    
    // Track metric
    telemetry.trackMetric(`custom.${marker.name}.duration`, duration, 'ms');
    
    // Log slow operations
    if (duration > this.config.slowThresholdMs) {
      logger[this.config.performanceLogLevel](`Slow operation detected: ${marker.name}`, {
        duration,
        attributes: marker.attributes,
      });
    }
    
    return duration;
  }
  
  /**
   * Track UI component rendering
   */
  public trackComponentRender(
    componentName: string,
    renderTime: number
  ): void {
    if (!this.config.enabled || !this.config.trackComponentRendering) {
      return;
    }
    
    // Get or create component profile
    if (!this.profile.componentRenderTimes[componentName]) {
      this.profile.componentRenderTimes[componentName] = {
        name: componentName,
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
      };
    }
    
    const profile = this.profile.componentRenderTimes[componentName];
    
    // Update profile
    profile.renderCount++;
    profile.totalRenderTime += renderTime;
    profile.averageRenderTime = profile.totalRenderTime / profile.renderCount;
    profile.lastRenderTime = renderTime;
    
    // Track metric
    telemetry.trackMetric(`ui.component.${componentName}.render_time`, renderTime, 'ms');
    
    // Log slow renders
    if (renderTime > this.config.slowThresholdMs) {
      logger[this.config.performanceLogLevel](`Slow component render: ${componentName}`, {
        renderTime,
        averageRenderTime: profile.averageRenderTime,
        renderCount: profile.renderCount,
      });
    }
  }
  
  /**
   * Detect performance bottlenecks
   */
  public detectBottlenecks(): PerformanceBottleneck[] {
    if (!this.config.enabled) {
      return [];
    }
    
    const bottlenecks: PerformanceBottleneck[] = [];
    
    // Check command execution times
    for (const [command, times] of Object.entries(this.profile.commandExecutionTimes)) {
      if (times.length < 5) continue; // Need enough samples
      
      const stats = this.calculateStatistics(times);
      if (stats.average > this.config.slowThresholdMs) {
        bottlenecks.push({
          scope: PerformanceScope.SYSTEM,
          name: `Command: ${command}`,
          averageTime: stats.average,
          percentile95: stats.percentile95,
          impact: stats.average > 2000 ? 'high' : 'medium',
          recommendation: 'Consider optimizing command execution',
        });
      }
    }
    
    // Check AI request times
    for (const [model, times] of Object.entries(this.profile.aiRequestTimes)) {
      if (times.length < 3) continue; // Need enough samples
      
      const stats = this.calculateStatistics(times);
      if (stats.average > 2000) { // AI requests are naturally slower
        bottlenecks.push({
          scope: PerformanceScope.AI,
          name: `AI Model: ${model}`,
          averageTime: stats.average,
          percentile95: stats.percentile95,
          impact: stats.average > 5000 ? 'high' : 'medium',
          recommendation: 'Consider using a faster model or caching results',
        });
      }
    }
    
    // Check tool execution times
    for (const [tool, times] of Object.entries(this.profile.toolExecutionTimes)) {
      if (times.length < 5) continue; // Need enough samples
      
      const stats = this.calculateStatistics(times);
      if (stats.average > this.config.slowThresholdMs) {
        bottlenecks.push({
          scope: PerformanceScope.TOOLS,
          name: `Tool: ${tool}`,
          averageTime: stats.average,
          percentile95: stats.percentile95,
          impact: stats.average > 1000 ? 'high' : 'medium',
          recommendation: 'Consider optimizing tool execution',
        });
      }
    }
    
    // Check component render times
    for (const [component, profile] of Object.entries(this.profile.componentRenderTimes)) {
      if (profile.renderCount < 10) continue; // Need enough samples
      
      if (profile.averageRenderTime > this.config.slowThresholdMs / 2) {
        bottlenecks.push({
          scope: PerformanceScope.UI,
          name: `Component: ${component}`,
          averageTime: profile.averageRenderTime,
          percentile95: 0, // Not tracked for components
          impact: profile.averageRenderTime > this.config.slowThresholdMs ? 'high' : 'medium',
          recommendation: 'Consider optimizing component rendering',
        });
      }
    }
    
    return bottlenecks;
  }
  
  /**
   * Get performance profile
   */
  public getProfile(): PerformanceProfile {
    return { ...this.profile };
  }
  
  /**
   * Get component render statistics
   */
  public getComponentStatistics(componentName: string): ComponentProfile | undefined {
    return this.profile.componentRenderTimes[componentName];
  }
  
  /**
   * Track startup time
   */
  private trackStartupTime(): void {
    // Use the CLI_START and CLI_READY markers
    enhancedTelemetry.markPerformance(PerformanceMarker.CLI_START);
    
    // Track ready event
    process.nextTick(() => {
      enhancedTelemetry.markPerformance(PerformanceMarker.CLI_READY);
      const startupTime = enhancedTelemetry.measurePerformance(
        PerformanceMarker.CLI_START,
        PerformanceMarker.CLI_READY,
        'cli_startup'
      );
      
      this.profile.startupTime = startupTime;
      logger.debug(`CLI startup time: ${startupTime.toFixed(2)}ms`);
    });
  }
  
  /**
   * Start bottleneck detection
   */
  private startBottleneckDetection(): void {
    this.bottleneckDetectionInterval = setInterval(() => {
      const bottlenecks = this.detectBottlenecks();
      
      if (bottlenecks.length > 0) {
        logger[this.config.performanceLogLevel]('Performance bottlenecks detected', {
          bottlenecks,
          count: bottlenecks.length,
        });
      }
    }, this.config.bottleneckDetectionIntervalMs);
    
    // Make sure the interval doesn't prevent Node from exiting
    if (this.bottleneckDetectionInterval.unref) {
      this.bottleneckDetectionInterval.unref();
    }
  }
  
  /**
   * Set up event listeners for performance tracking
   */
  private setupEventListeners(): void {
    // To be integrated with the application's event system
  }
  
  /**
   * Record function execution time
   */
  private recordFunctionExecution(
    name: string,
    scope: PerformanceScope,
    startTime: number
  ): void {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Track in appropriate category
    switch (scope) {
      case PerformanceScope.AI:
        if (!this.profile.aiRequestTimes[name]) {
          this.profile.aiRequestTimes[name] = [];
        }
        this.profile.aiRequestTimes[name].push(duration);
        break;
        
      case PerformanceScope.TOOLS:
        if (!this.profile.toolExecutionTimes[name]) {
          this.profile.toolExecutionTimes[name] = [];
        }
        this.profile.toolExecutionTimes[name].push(duration);
        break;
        
      case PerformanceScope.SYSTEM:
        if (!this.profile.commandExecutionTimes[name]) {
          this.profile.commandExecutionTimes[name] = [];
        }
        this.profile.commandExecutionTimes[name].push(duration);
        break;
        
      case PerformanceScope.NETWORK:
        if (!this.profile.networkRequestTimes[name]) {
          this.profile.networkRequestTimes[name] = [];
        }
        this.profile.networkRequestTimes[name].push(duration);
        break;
    }
    
    // Log slow functions
    if (duration > this.config.slowThresholdMs) {
      logger[this.config.performanceLogLevel](`Slow function detected: ${name}`, {
        scope,
        duration,
      });
    }
  }
  
  /**
   * Calculate statistics for a set of times
   */
  private calculateStatistics(times: number[]): {
    min: number;
    max: number;
    average: number;
    percentile95: number;
    median: number;
  } {
    if (times.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        percentile95: 0,
        median: 0,
      };
    }
    
    // Sort times
    const sorted = [...times].sort((a, b) => a - b);
    
    // Calculate statistics
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const percentile95Index = Math.floor(sorted.length * 0.95);
    const percentile95 = sorted[percentile95Index];
    
    return {
      min,
      max,
      average,
      percentile95,
      median,
    };
  }
}

/**
 * Singleton instance of the performance monitoring system
 */
export const performanceMonitoring = new PerformanceMonitoringSystem();