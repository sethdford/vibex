/**
 * Telemetry Utilities
 * 
 * Helper functions and utilities for telemetry collection, anonymization,
 * and integration with application components.
 */

import { telemetry, TelemetryEventType } from './index.js';
import { enhancedTelemetry, SpanStatus } from './enhanced-telemetry.js';
import { performanceMonitoring, PerformanceScope } from './performance-monitoring.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';

/**
 * Anonymize a file path for telemetry purposes
 * 
 * @example
 * anonymizePath("/Users/johndoe/project/src/file.ts")
 * // Returns anonymized path with user directory replaced
 */
export function anonymizePath(filePath: string): string {
  if (!filePath) return '';
  
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir && filePath.startsWith(homeDir)) {
    return filePath.replace(homeDir, '/Users/****');
  }
  
  const parsedPath = path.parse(filePath);
  return path.join(parsedPath.dir, parsedPath.base);
}

/**
 * Hash sensitive data for telemetry purposes
 */
export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Create a telemetry-wrapped function that tracks execution
 * 
 * @example
 * const wrappedFunction = wrapFunctionWithTelemetry(
 *   myFunction,
 *   "processData",
 *   PerformanceScope.SYSTEM
 * );
 */
export function wrapFunctionWithTelemetry<T extends (...args: readonly unknown[]) => unknown>(
  fn: T,
  name: string,
  scope: PerformanceScope
): T {
  return performanceMonitoring.trackFunction(fn, name, scope);
}

/**
 * Track an async operation with proper error handling
 * 
 * @example
 * const result = await trackAsyncOperation(
 *   () => fetchData(),
 *   "fetchUserData",
 *   PerformanceScope.NETWORK
 * );
 */
export async function trackAsyncOperation<T>(
  operation: () => Promise<T>,
  name: string,
  scope: PerformanceScope
): Promise<T> {
  const spanContext = enhancedTelemetry.startSpan(name, undefined, { scope });
  const markerId = performanceMonitoring.startMarker(name);
  
  try {
    const result = await operation();
    enhancedTelemetry.endSpan(spanContext, SpanStatus.OK);
    performanceMonitoring.endMarker(markerId);
    return result;
  } catch (error) {
    enhancedTelemetry.endSpan(spanContext, SpanStatus.ERROR, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    performanceMonitoring.endMarker(markerId);
    throw error;
  }
}

/**
 * Track React component rendering
 */
export function trackComponentRender(
  componentName: string,
  renderTime: number
): void {
  performanceMonitoring.trackComponentRender(componentName, renderTime);
}

/**
 * Create a tracing ID for distributed operations
 */
export function createTracingId(): string {
  return uuidv4().replace(/-/g, '');
}

/**
 * Sanitize an object for telemetry by removing sensitive fields
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  sensitiveKeys: string[] = ['password', 'token', 'secret', 'key', 'apiKey', 'auth'],
  maxDepth: number = 3
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip sensitive keys
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      result[key] = '***REDACTED***';
      continue;
    }
    
    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, sensitiveKeys, maxDepth - 1);
      continue;
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        result[key] = [];
      } else if (typeof value[0] === 'object' && value[0] !== null) {
        // Array of objects
        result[key] = value.map(item => 
          typeof item === 'object' && item !== null
            ? sanitizeObject(item, sensitiveKeys, maxDepth - 1)
            : item
        );
      } else {
        // Array of primitives
        result[key] = `Array(${value.length})`;
      }
      continue;
    }
    
    // Handle primitive values
    if (typeof value === 'string' && value.length > 100) {
      result[key] = `${value.substring(0, 100)}...`;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Format execution time for logging
 */
export function formatExecutionTime(timeMs: number): string {
  if (timeMs < 1) {
    return '< 1ms';
  } else if (timeMs < 1000) {
    return `${Math.round(timeMs)}ms`;
  } else {
    return `${(timeMs / 1000).toFixed(2)}s`;
  }
}

/**
 * Create system metadata for telemetry
 */
export function getSystemMetadata(): Record<string, unknown> {
  return {
    platform: process.platform,
    nodeVersion: process.version,
    cpuCount: require('os').cpus().length,
    memoryTotal: Math.round(require('os').totalmem() / (1024 * 1024)), // MB
    memoryFree: Math.round(require('os').freemem() / (1024 * 1024)), // MB
    hostname: hashSensitiveData(require('os').hostname()),
  };
}

/**
 * Track an AI request for telemetry
 */
export function trackAIRequest(
  model: string,
  prompt: string,
  options: Record<string, unknown> = {}
): string {
  const requestId = uuidv4();
  
  telemetry.trackEvent(TelemetryEventType.AI_REQUEST, {
    requestId,
    model,
    promptLength: prompt.length,
    ...sanitizeObject(options),
  });
  
  return requestId;
}

/**
 * Track an AI response for telemetry
 */
export function trackAIResponse(
  requestId: string,
  model: string,
  responseLength: number,
  durationMs: number,
  tokenCount?: number
): void {
  telemetry.trackEvent(TelemetryEventType.AI_RESPONSE, {
    requestId,
    model,
    responseLength,
    durationMs,
    tokensGenerated: tokenCount,
    tokensPerSecond: tokenCount ? (tokenCount / (durationMs / 1000)) : undefined,
  });
}

/**
 * Detect common performance issues
 */
export function detectPerformanceIssues(): void {
  const resourceStats = enhancedTelemetry.getResourceStats();
  const memoryUsage = resourceStats.memoryUsage;
  
  if (memoryUsage) {
    const memoryUsageMB = memoryUsage.rss / (1024 * 1024);
    const heapUsageMB = memoryUsage.heapUsed / (1024 * 1024);
    
    if (memoryUsageMB > 500) {
      telemetry.addBreadcrumb({
        category: 'performance',
        message: `High memory usage detected: ${Math.round(memoryUsageMB)}MB`,
        level: memoryUsageMB > 800 ? 'error' : 'warning',
        data: { memoryUsageMB, heapUsageMB },
      });
    }
  }
  
  // Detect bottlenecks
  const bottlenecks = performanceMonitoring.detectBottlenecks();
  if (bottlenecks.length > 0) {
    const highImpactBottlenecks = bottlenecks.filter(b => b.impact === 'high');
    
    if (highImpactBottlenecks.length > 0) {
      telemetry.addBreadcrumb({
        category: 'performance',
        message: `Performance bottlenecks detected: ${highImpactBottlenecks.length} high impact issues`,
        level: 'warning',
        data: { 
          bottleneckCount: bottlenecks.length,
          highImpactCount: highImpactBottlenecks.length,
        },
      });
    }
  }
}