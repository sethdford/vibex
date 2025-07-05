/**
 * Enhanced Telemetry System
 * 
 * Advanced telemetry capabilities with distributed tracing,
 * OpenTelemetry integration, and real-time monitoring.
 */

import { EventEmitter } from 'events';
import { telemetry, TelemetryEventType } from './index.js';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

/**
 * Span context for distributed tracing
 */
export interface SpanContext {
  /**
   * Trace ID (unique across entire trace)
   */
  traceId: string;
  
  /**
   * Span ID (unique within a trace)
   */
  spanId: string;
  
  /**
   * Parent span ID
   */
  parentSpanId?: string;
  
  /**
   * Operation name
   */
  name: string;
  
  /**
   * Additional context attributes
   */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Span status types
 */
export enum SpanStatus {
  OK = 'ok',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

/**
 * SpanStatus as string type for compatibility with addBreadcrumb
 */
export type SpanStatusString = 'ok' | 'error' | 'cancelled';

/**
 * Performance trace markers
 */
export enum PerformanceMarker {
  CLI_START = 'cli_start',
  CLI_READY = 'cli_ready',
  COMMAND_START = 'command_start',
  COMMAND_END = 'command_end',
  AI_REQUEST_START = 'ai_request_start',
  AI_REQUEST_END = 'ai_request_end',
  UI_RENDER_START = 'ui_render_start',
  UI_RENDER_END = 'ui_render_end',
  TOOL_EXECUTION_START = 'tool_execution_start',
  TOOL_EXECUTION_END = 'tool_execution_end',
}

/**
 * Resource usage statistics
 */
export interface ResourceStats {
  cpuUsage?: {
    user: number;
    system: number;
  };
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  processUptime?: number;
}

/**
 * Request tracking data
 */
export interface RequestData {
  url: string;
  method: string;
  statusCode?: number;
  contentLength?: number;
  duration?: number;
  retries?: number;
  error?: string;
  context?: Record<string, unknown>;
}

/**
 * Enhanced telemetry configuration
 */
export interface EnhancedTelemetryConfig {
  /**
   * Enable distributed tracing
   */
  enableTracing?: boolean;
  
  /**
   * Enable OpenTelemetry integration
   */
  enableOpenTelemetry?: boolean;
  
  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring?: boolean;
  
  /**
   * Enable resource monitoring
   */
  enableResourceMonitoring?: boolean;
  
  /**
   * Resource monitoring interval in milliseconds
   */
  resourceMonitoringInterval?: number;
  
  /**
   * Export traces to OpenTelemetry collector
   */
  otelExporter?: {
    url: string;
    headers?: Record<string, string>;
  };
  
  /**
   * Sample rate for traces (0-1)
   */
  traceSampleRate?: number;
}

/**
 * Enhanced Telemetry System
 */
export class EnhancedTelemetrySystem extends EventEmitter {
  private activeSpans: Map<string, SpanContext> = new Map();
  private performanceMarkers: Map<string, number> = new Map();
  private resourceStats: ResourceStats = {};
  private resourceMonitoringInterval?: NodeJS.Timeout;
  private config: Required<EnhancedTelemetryConfig>;
  private traceIdToSpanIds: Map<string, Set<string>> = new Map();
  
  constructor(config: EnhancedTelemetryConfig = {}) {
    super();
    
    // Default configuration
    this.config = {
      enableTracing: true,
      enableOpenTelemetry: false,
      enablePerformanceMonitoring: true,
      enableResourceMonitoring: true,
      resourceMonitoringInterval: 60000, // 1 minute
      traceSampleRate: 0.1,
      otelExporter: {
        url: 'http://localhost:4318/v1/traces',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      ...config,
    };
    
    this.initialize();
  }
  
  /**
   * Initialize enhanced telemetry
   */
  private initialize(): void {
    if (!telemetry.isEnabled()) {
      logger.debug('Enhanced telemetry disabled because base telemetry is disabled');
      return;
    }
    
    logger.debug('Initializing enhanced telemetry system');
    
    // Start performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.markPerformance(PerformanceMarker.CLI_START);
    }
    
    // Start resource monitoring
    if (this.config.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }
    
    // Initialize OpenTelemetry integration
    if (this.config.enableOpenTelemetry) {
      this.initializeOpenTelemetry();
    }
    
    logger.debug('Enhanced telemetry system initialized');
  }
  
  /**
   * Start a new span for distributed tracing
   */
  public startSpan(
    name: string,
    parentContext?: SpanContext,
    attributes?: Record<string, string | number | boolean>
  ): SpanContext {
    if (!telemetry.isEnabled() || !this.config.enableTracing) {
      // Return a dummy span that doesn't actually track anything
      return {
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
        name,
        attributes,
      };
    }
    
    // Generate a new trace ID or use parent's
    const traceId = parentContext?.traceId || uuidv4().replace(/-/g, '');
    
    // Generate a new span ID
    const spanId = uuidv4().replace(/-/g, '').substring(0, 16);
    
    // Create span context
    const span: SpanContext = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      name,
      attributes: {
        'telemetry.sdk': 'vibex.enhanced',
        'telemetry.version': '1.0.0',
        ...(attributes || {}),
      },
    };
    
    // Store the span
    this.activeSpans.set(spanId, span);
    
    // Associate span with trace for fast lookup
    if (!this.traceIdToSpanIds.has(traceId)) {
      this.traceIdToSpanIds.set(traceId, new Set());
    }
    this.traceIdToSpanIds.get(traceId)?.add(spanId);
    
    // Add breadcrumb
    telemetry.addBreadcrumb({
      category: 'span',
      message: `Started span: ${name}`,
      level: 'info',
      data: {
        traceId,
        spanId,
        parentSpanId: parentContext?.spanId,
        name,
      },
    });
    
    // Mark span start time
    this.markPerformance(`span_start:${spanId}`);
    
    return span;
  }
  
  /**
   * End a span and record its duration
   */
  public endSpan(
    span: SpanContext,
    status: SpanStatus = SpanStatus.OK,
    attributes?: Record<string, string | number | boolean>
  ): void {
    if (!telemetry.isEnabled() || !this.config.enableTracing) {
      return;
    }
    
    // Calculate duration
    const startTime = this.getPerformanceMark(`span_start:${span.spanId}`);
    const endTime = performance.now();
    const duration = startTime ? endTime - startTime : 0;
    
    // Remove the span from active spans
    this.activeSpans.delete(span.spanId);
    
    // Add breadcrumb
    telemetry.addBreadcrumb({
      category: 'span',
      message: `Ended span: ${span.name}`,
      level: status === SpanStatus.ERROR ? 'error' : 'info',
      data: {
        traceId: span.traceId,
        spanId: span.spanId,
        name: span.name,
        status: status === SpanStatus.ERROR ? 500 : status === SpanStatus.CANCELLED ? 499 : 200,
        duration,
        ...attributes,
      },
    });
    
    // Track metric
    telemetry.trackMetric(`span.${span.name}.duration`, duration, 'ms', {
      status: String(status),
      ...span.attributes,
    });
    
    // Clear performance marker
    this.performanceMarkers.delete(`span_start:${span.spanId}`);
    
    // Export the span to OpenTelemetry if enabled
    if (this.config.enableOpenTelemetry) {
      this.exportSpanToOtel(span, status, duration, attributes);
    }
  }
  
  /**
   * Get all active spans for a trace
   */
  public getActiveSpansForTrace(traceId: string): SpanContext[] {
    if (!telemetry.isEnabled() || !this.config.enableTracing) {
      return [];
    }
    
    const spanIds = this.traceIdToSpanIds.get(traceId) || new Set();
    const spans: SpanContext[] = [];
    
    for (const spanId of spanIds) {
      const span = this.activeSpans.get(spanId);
      if (span) {
        spans.push(span);
      }
    }
    
    return spans;
  }
  
  /**
   * Mark a performance event
   */
  public markPerformance(marker: string | PerformanceMarker): void {
    if (!telemetry.isEnabled() || !this.config.enablePerformanceMonitoring) {
      return;
    }
    
    const timestamp = performance.now();
    this.performanceMarkers.set(marker, timestamp);
    
    // Add breadcrumb
    telemetry.addBreadcrumb({
      category: 'performance',
      message: `Performance marker: ${marker}`,
      level: 'info',
      data: { marker, timestamp },
    });
  }
  
  /**
   * Measure time between two performance markers
   */
  public measurePerformance(
    start: string | PerformanceMarker,
    end: string | PerformanceMarker,
    name?: string
  ): number {
    if (!telemetry.isEnabled() || !this.config.enablePerformanceMonitoring) {
      return 0;
    }
    
    const startTime = this.performanceMarkers.get(start);
    const endTime = this.performanceMarkers.get(end);
    
    if (!startTime || !endTime) {
      return 0;
    }
    
    const duration = endTime - startTime;
    
    // Track metric
    if (name) {
      telemetry.trackMetric(`performance.${name}`, duration, 'ms');
    }
    
    return duration;
  }
  
  /**
   * Track network request
   */
  public trackRequest(request: RequestData): void {
    if (!telemetry.isEnabled()) {
      return;
    }
    
    // Add breadcrumb
    telemetry.addBreadcrumb({
      category: 'network',
      message: `${request.method} ${request.url} ${request.statusCode || ''}`,
      level: (request.statusCode && request.statusCode >= 400) || request.error ? 'error' : 'info',
      data: { ...request },
    });
    
    // Track metrics
    if (request.duration !== undefined) {
      telemetry.trackMetric(`network.request.duration`, request.duration, 'ms', {
        url: new URL(request.url).hostname,
        method: request.method,
        status: request.statusCode?.toString() || 'unknown',
      });
    }
    
    if (request.statusCode) {
      telemetry.trackMetric(`network.request.status.${request.statusCode}`, 1, 'count');
    }
    
    if (request.retries) {
      telemetry.trackMetric(`network.request.retries`, request.retries, 'count');
    }
    
    // Track as telemetry event
    if (request.url.includes('/v1/chat') || request.url.includes('/messages')) {
      const isSuccess = !request.error && (!request.statusCode || request.statusCode < 400);
      telemetry.trackEvent(
        isSuccess ? TelemetryEventType.AI_RESPONSE : TelemetryEventType.AI_ERROR,
        {
          endpoint: new URL(request.url).pathname,
          status: request.statusCode,
          duration: request.duration,
          error: request.error,
        }
      );
    }
  }
  
  /**
   * Get current resource usage statistics
   */
  public getResourceStats(): ResourceStats {
    if (!telemetry.isEnabled() || !this.config.enableResourceMonitoring) {
      return {};
    }
    
    return { ...this.resourceStats };
  }
  
  /**
   * Start resource usage monitoring
   */
  private startResourceMonitoring(): void {
    this.updateResourceStats();
    
    this.resourceMonitoringInterval = setInterval(
      () => this.updateResourceStats(),
      this.config.resourceMonitoringInterval
    );
    
    // Make sure the interval doesn't prevent Node from exiting
    if (this.resourceMonitoringInterval.unref) {
      this.resourceMonitoringInterval.unref();
    }
  }
  
  /**
   * Stop resource monitoring
   */
  public stopResourceMonitoring(): void {
    if (this.resourceMonitoringInterval) {
      clearInterval(this.resourceMonitoringInterval);
      this.resourceMonitoringInterval = undefined;
    }
  }
  
  /**
   * Update resource usage statistics
   */
  private updateResourceStats(): void {
    if (!telemetry.isEnabled() || !this.config.enableResourceMonitoring) {
      return;
    }
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const processUptime = process.uptime();
      
      this.resourceStats = {
        cpuUsage,
        memoryUsage,
        processUptime,
      };
      
      // Track metrics
      telemetry.trackMetric('system.memory.rss', memoryUsage.rss, 'bytes');
      telemetry.trackMetric('system.memory.heapUsed', memoryUsage.heapUsed, 'bytes');
      telemetry.trackMetric('system.memory.heapTotal', memoryUsage.heapTotal, 'bytes');
      telemetry.trackMetric('system.cpu.user', cpuUsage.user, 'microseconds');
      telemetry.trackMetric('system.cpu.system', cpuUsage.system, 'microseconds');
    } catch (error) {
      logger.debug('Failed to update resource stats', error);
    }
  }
  
  /**
   * Get a performance mark timestamp
   */
  private getPerformanceMark(marker: string): number | undefined {
    return this.performanceMarkers.get(marker);
  }
  
  /**
   * Initialize OpenTelemetry integration
   */
  private initializeOpenTelemetry(): void {
    // Stub implementation - would normally set up OpenTelemetry SDK here
    logger.debug('OpenTelemetry integration initialized');
  }
  
  /**
   * Export a span to OpenTelemetry collector
   */
  private exportSpanToOtel(
    span: SpanContext,
    status: SpanStatus,
    duration: number,
    _attributes?: Record<string, string | number | boolean>
  ): void {
    // Stub implementation - would normally export to OpenTelemetry collector
    logger.debug(`Would export span to OpenTelemetry: ${span.name}`, {
      traceId: span.traceId,
      spanId: span.spanId,
      duration,
      status,
    });
  }
}

/**
 * Create a singleton instance of the enhanced telemetry system
 */
export const enhancedTelemetry = new EnhancedTelemetrySystem();