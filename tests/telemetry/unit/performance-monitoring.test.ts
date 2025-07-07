/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for performance monitoring module
 */

import { describe, test, expect, jest, beforeEach } from 'vitest';
import { PerformanceMonitoringSystem, PerformanceScope } from '../../../src/telemetry/performance-monitoring.js';
import { telemetry } from '../../../src/telemetry/index.js';
import { enhancedTelemetry } from '../../../src/telemetry/enhanced-telemetry.js';

// Mock dependencies
vi.mock('../../../src/telemetry/index.js', () => ({
  telemetry: {
    isEnabled: vi.fn().mockReturnValue(false),
    trackMetric: vi.fn()
  }
}));

vi.mock('../../../src/telemetry/enhanced-telemetry.js', () => ({
  enhancedTelemetry: {
    startSpan: vi.fn().mockReturnValue({ 
      traceId: 'mock-trace-id', 
      spanId: 'mock-span-id', 
      name: 'mock-span' 
    }),
    endSpan: vi.fn(),
    markPerformance: vi.fn(),
    measurePerformance: vi.fn()
  },
  SpanStatus: {
    OK: 'ok',
    ERROR: 'error'
  },
  PerformanceMarker: {
    CLI_START: 'cli_start',
    CLI_READY: 'cli_ready',
    COMMAND_START: 'command_start',
    COMMAND_END: 'command_end'
  }
}));

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('PerformanceMonitoringSystem', () => {
  let performanceMonitoring: PerformanceMonitoringSystem;
  
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks();
    
    // Create a new instance with performance monitoring disabled
    performanceMonitoring = new PerformanceMonitoringSystem({ enabled: false });
  });
  
  test('should initialize with disabled configuration', () => {
    expect(performanceMonitoring).toBeDefined();
  });
  
  test('trackFunction should return original function when disabled', () => {
    const originalFn = vi.fn().mockReturnValue('result');
    const trackedFn = performanceMonitoring.trackFunction(originalFn, 'test-function', PerformanceScope.SYSTEM);
    
    const result = trackedFn('arg1', 'arg2');
    
    expect(result).toBe('result');
    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(enhancedTelemetry.startSpan).not.toHaveBeenCalled();
  });
  
  test('startMarker should return marker ID even when disabled', () => {
    const markerId = performanceMonitoring.startMarker('test-marker');
    expect(markerId).toBe('test-marker');
  });
  
  test('endMarker should return 0 when disabled', () => {
    const duration = performanceMonitoring.endMarker('test-marker');
    expect(duration).toBe(0);
    expect(telemetry.trackMetric).not.toHaveBeenCalled();
  });
  
  test('trackComponentRender should not track when disabled', () => {
    performanceMonitoring.trackComponentRender('TestComponent', 50);
    expect(telemetry.trackMetric).not.toHaveBeenCalled();
  });
  
  test('detectBottlenecks should return empty array when disabled', () => {
    const bottlenecks = performanceMonitoring.detectBottlenecks();
    expect(bottlenecks).toEqual([]);
  });
  
  test('getProfile should return empty profile when disabled', () => {
    const profile = performanceMonitoring.getProfile();
    expect(profile).toEqual({
      commandExecutionTimes: {},
      aiRequestTimes: {},
      networkRequestTimes: {},
      toolExecutionTimes: {},
      componentRenderTimes: {}
    });
  });
  
  describe('when performance monitoring is enabled', () => {
    beforeEach(() => {
      // Mock telemetry as enabled for these tests
      (telemetry.isEnabled as jest.Mock).mockReturnValue(true);
      
      // Create a new instance with performance monitoring enabled
      performanceMonitoring = new PerformanceMonitoringSystem({
        enabled: true,
        trackComponentRendering: true,
        trackFunctionCalls: true,
        slowThresholdMs: 100
      });
    });
    
    test('trackFunction should wrap function with performance tracking', () => {
      const originalFn = vi.fn().mockReturnValue('result');
      const trackedFn = performanceMonitoring.trackFunction(originalFn, 'test-function', PerformanceScope.SYSTEM);
      
      const result = trackedFn('arg1', 'arg2');
      
      expect(result).toBe('result');
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(enhancedTelemetry.startSpan).toHaveBeenCalled();
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });
    
    test('trackFunction should handle async functions', async () => {
      const originalAsyncFn = vi.fn().mockResolvedValue('async-result');
      const trackedAsyncFn = performanceMonitoring.trackFunction(originalAsyncFn, 'async-function', PerformanceScope.SYSTEM);
      
      const promise = trackedAsyncFn('arg1', 'arg2');
      expect(enhancedTelemetry.startSpan).toHaveBeenCalled();
      
      const result = await promise;
      expect(result).toBe('async-result');
      expect(originalAsyncFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });
    
    test('trackFunction should handle thrown errors', () => {
      const errorFn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const trackedErrorFn = performanceMonitoring.trackFunction(errorFn, 'error-function', PerformanceScope.SYSTEM);
      
      expect(() => trackedErrorFn()).toThrow('Test error');
      expect(errorFn).toHaveBeenCalled();
      expect(enhancedTelemetry.startSpan).toHaveBeenCalled();
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });
    
    test('trackFunction should handle rejected promises', async () => {
      const rejectedFn = vi.fn().mockRejectedValue(new Error('Async error'));
      const trackedRejectedFn = performanceMonitoring.trackFunction(rejectedFn, 'rejected-function', PerformanceScope.SYSTEM);
      
      await expect(trackedRejectedFn()).rejects.toThrow('Async error');
      expect(rejectedFn).toHaveBeenCalled();
      expect(enhancedTelemetry.startSpan).toHaveBeenCalled();
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });
    
    test('startMarker and endMarker should track duration', () => {
      // Mock performance.now to return controlled values
      const originalNow = performance.now;
      performance.now = vi.fn()
        .mockReturnValueOnce(1000) // For startMarker
        .mockReturnValueOnce(1200); // For endMarker (200ms later)
      
      const markerId = performanceMonitoring.startMarker('test-marker');
      const duration = performanceMonitoring.endMarker(markerId);
      
      expect(duration).toBe(200);
      expect(telemetry.trackMetric).toHaveBeenCalledWith('custom.test-marker.duration', 200, 'ms');
      
      // Restore original performance.now
      performance.now = originalNow;
    });
    
    test('trackComponentRender should record component rendering stats', () => {
      // Track component render multiple times
      performanceMonitoring.trackComponentRender('TestComponent', 30);
      performanceMonitoring.trackComponentRender('TestComponent', 40);
      performanceMonitoring.trackComponentRender('TestComponent', 50);
      
      expect(telemetry.trackMetric).toHaveBeenCalledTimes(3);
      
      const profile = performanceMonitoring.getProfile();
      const componentStats = profile.componentRenderTimes.TestComponent;
      
      expect(componentStats).toBeDefined();
      expect(componentStats.renderCount).toBe(3);
      expect(componentStats.totalRenderTime).toBe(120);
      expect(componentStats.averageRenderTime).toBe(40);
      expect(componentStats.lastRenderTime).toBe(50);
    });
  });
});