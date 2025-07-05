/**
 * Unit tests for enhanced telemetry module
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { EnhancedTelemetrySystem, SpanStatus } from '../../../src/telemetry/enhanced-telemetry.js';
import { telemetry } from '../../../src/telemetry/index.js';

// Mock dependencies
jest.mock('../../../src/telemetry/index.js', () => ({
  telemetry: {
    isEnabled: jest.fn().mockReturnValue(false),
    addBreadcrumb: jest.fn(),
    trackMetric: jest.fn()
  }
}));

jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('EnhancedTelemetrySystem', () => {
  let enhancedTelemetry: EnhancedTelemetrySystem;
  
  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
    
    // Create a new instance with telemetry disabled for testing
    enhancedTelemetry = new EnhancedTelemetrySystem({
      enableTracing: false,
      enableOpenTelemetry: false,
      enablePerformanceMonitoring: false,
      enableResourceMonitoring: false
    });
  });
  
  test('should initialize with disabled configuration', () => {
    expect(enhancedTelemetry).toBeDefined();
  });
  
  test('startSpan should return dummy span when disabled', () => {
    const span = enhancedTelemetry.startSpan('test-span');
    
    expect(span).toBeDefined();
    expect(span.traceId).toBe('00000000000000000000000000000000');
    expect(span.name).toBe('test-span');
    expect(telemetry.addBreadcrumb).not.toHaveBeenCalled();
  });
  
  test('endSpan should not track metrics when disabled', () => {
    const span = enhancedTelemetry.startSpan('test-span');
    enhancedTelemetry.endSpan(span, SpanStatus.OK);
    
    expect(telemetry.addBreadcrumb).not.toHaveBeenCalled();
    expect(telemetry.trackMetric).not.toHaveBeenCalled();
  });
  
  test('getActiveSpansForTrace should return empty array when disabled', () => {
    const spans = enhancedTelemetry.getActiveSpansForTrace('test-trace-id');
    expect(spans).toEqual([]);
  });
  
  test('markPerformance should not track when disabled', () => {
    enhancedTelemetry.markPerformance('test-marker');
    expect(telemetry.addBreadcrumb).not.toHaveBeenCalled();
  });
  
  test('measurePerformance should return 0 when disabled', () => {
    const duration = enhancedTelemetry.measurePerformance('start', 'end');
    expect(duration).toBe(0);
    expect(telemetry.trackMetric).not.toHaveBeenCalled();
  });
  
  test('trackRequest should not track when disabled', () => {
    enhancedTelemetry.trackRequest({
      url: 'https://example.com/api',
      method: 'GET'
    });
    
    expect(telemetry.addBreadcrumb).not.toHaveBeenCalled();
    expect(telemetry.trackMetric).not.toHaveBeenCalled();
  });
  
  test('getResourceStats should return empty object when disabled', () => {
    const stats = enhancedTelemetry.getResourceStats();
    expect(stats).toEqual({});
  });
  
  describe('when telemetry is enabled', () => {
    beforeEach(() => {
      // Mock telemetry as enabled for these tests
      (telemetry.isEnabled as jest.Mock).mockReturnValue(true);
      
      enhancedTelemetry = new EnhancedTelemetrySystem({
        enableTracing: true,
        enableOpenTelemetry: false, // Keep this disabled as it's not crucial for tests
        enablePerformanceMonitoring: true,
        enableResourceMonitoring: false // Disable to avoid timing issues in tests
      });
    });
    
    test('startSpan should create a real span when enabled', () => {
      const span = enhancedTelemetry.startSpan('test-span', undefined, { test: 'attribute' });
      
      expect(span).toBeDefined();
      expect(span.traceId).not.toBe('00000000000000000000000000000000');
      expect(span.name).toBe('test-span');
      expect(span.attributes).toHaveProperty('test', 'attribute');
      expect(telemetry.addBreadcrumb).toHaveBeenCalled();
    });
    
    test('spans should be linked to their trace', () => {
      const span1 = enhancedTelemetry.startSpan('span-1');
      const span2 = enhancedTelemetry.startSpan('span-2', span1);
      
      // Spans should share the same trace ID
      expect(span2.traceId).toBe(span1.traceId);
      expect(span2.parentSpanId).toBe(span1.spanId);
      
      const activeSpans = enhancedTelemetry.getActiveSpansForTrace(span1.traceId);
      expect(activeSpans.length).toBe(2);
    });
    
    test('endSpan should remove span from active spans', () => {
      const span = enhancedTelemetry.startSpan('test-span');
      
      enhancedTelemetry.endSpan(span, SpanStatus.OK);
      
      const activeSpans = enhancedTelemetry.getActiveSpansForTrace(span.traceId);
      expect(activeSpans.length).toBe(0);
      expect(telemetry.trackMetric).toHaveBeenCalled();
    });
  });
});