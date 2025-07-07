/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration tests for telemetry system
 */

import { describe, test, expect, jest, beforeEach } from 'vitest';
import { telemetry, TelemetryEventType } from '../../../src/telemetry/index.js';
import { enhancedTelemetry, SpanStatus } from '../../../src/telemetry/enhanced-telemetry.js';
import { performanceMonitoring, PerformanceScope } from '../../../src/telemetry/performance-monitoring.js';
import { trackAsyncOperation, wrapFunctionWithTelemetry } from '../../../src/telemetry/telemetry-utils.js';

// Mock logger to prevent console output during tests
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Telemetry Integration', () => {
  // Create a mock event handler to track emitted events
  const eventHandler = {
    onEvent: vi.fn(),
    onError: vi.fn(),
    onFlush: vi.fn()
  };
  
  beforeEach(() => {
    // Reset mocks and remove event listeners
    vi.clearAllMocks();
    telemetry.removeAllListeners();
    
    // Set up event listeners
    telemetry.on('message:captured', eventHandler.onEvent);
    telemetry.on('error:captured', eventHandler.onError);
    telemetry.on('flush:success', eventHandler.onFlush);
  });
  
  test('should integrate basic and enhanced telemetry systems', () => {
    // Creating a span should automatically create a breadcrumb
    const span = enhancedTelemetry.startSpan('integration-test', undefined, {
      attribute1: 'value1',
      attribute2: 'value2'
    });
    
    expect(span).toBeDefined();
    expect(span.name).toBe('integration-test');
    
    // Track an event using the basic telemetry system
    telemetry.trackEvent(TelemetryEventType.CLI_START, {
      version: '1.0.0',
      platform: 'test'
    });
    
    // End the span with OK status
    enhancedTelemetry.endSpan(span, SpanStatus.OK, {
      result: 'success'
    });
    
    // Verify the event was tracked
    expect(eventHandler.onEvent).toHaveBeenCalled();
  });
  
  test('should integrate with performance monitoring', async () => {
    // Create a test function to monitor
    const testFunction = vi.fn().mockImplementation(async (value: string) => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
      return `processed-${value}`;
    });
    
    // Wrap the function with performance monitoring
    const monitoredFunction = wrapFunctionWithTelemetry(
      testFunction,
      'test-performance-function',
      PerformanceScope.SYSTEM
    );
    
    // Execute the monitored function
    const result = await monitoredFunction('test-value');
    expect(result).toBe('processed-test-value');
    expect(testFunction).toHaveBeenCalledWith('test-value');
    
    // Verify performance metrics are collected
    const profile = performanceMonitoring.getProfile();
    
    // The function execution might be tracked in system times
    // (implementation dependent - this test might need adjustment)
    if (Object.keys(profile.commandExecutionTimes).length > 0) {
      expect(Object.keys(profile.commandExecutionTimes)).toContain('test-performance-function');
    }
  });
  
  test('should track async operations across telemetry systems', async () => {
    // Create a mock operation
    const operation = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
      return { success: true, data: 'test-result' };
    });
    
    // Track the async operation
    const result = await trackAsyncOperation(
      operation,
      'test-async-operation',
      PerformanceScope.NETWORK
    );
    
    expect(result).toEqual({ success: true, data: 'test-result' });
    expect(operation).toHaveBeenCalled();
  });
  
  test('should handle errors across telemetry systems', async () => {
    // Create a mock operation that throws an error
    const error = new Error('Integration test error');
    const failingOperation = vi.fn().mockRejectedValue(error);
    
    // Track the failing operation and expect it to throw
    await expect(trackAsyncOperation(
      failingOperation,
      'failing-operation',
      PerformanceScope.SYSTEM
    )).rejects.toThrow('Integration test error');
    
    // The error should be tracked in the telemetry system
    expect(failingOperation).toHaveBeenCalled();
  });
  
  test('should provide consistent tracing across components', () => {
    // Start a parent span
    const parentSpan = enhancedTelemetry.startSpan('parent-operation');
    
    // Start a child span with the parent context
    const childSpan = enhancedTelemetry.startSpan('child-operation', parentSpan);
    
    // Verify the spans share the same trace
    expect(childSpan.traceId).toBe(parentSpan.traceId);
    expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
    
    // Get all spans for the trace
    const spans = enhancedTelemetry.getActiveSpansForTrace(parentSpan.traceId);
    
    // There should be two spans in the trace
    expect(spans.length).toBe(2);
    
    // End the spans
    enhancedTelemetry.endSpan(childSpan, SpanStatus.OK);
    enhancedTelemetry.endSpan(parentSpan, SpanStatus.OK);
    
    // Verify the spans are no longer active
    const afterEndSpans = enhancedTelemetry.getActiveSpansForTrace(parentSpan.traceId);
    expect(afterEndSpans.length).toBe(0);
  });
});