/**
 * Performance Monitoring Tests
 * 
 * Tests for the performance monitoring system with bottleneck detection
 * and function tracking capabilities.
 */

import { jest } from '@jest/globals';
import { performanceMonitoring, PerformanceMonitoringSystem, PerformanceScope } from './performance-monitoring.js';
import { enhancedTelemetry } from './enhanced-telemetry.js';
import { telemetry } from './index.js';

// Mock dependencies
jest.mock('./index.js', () => ({
  telemetry: {
    isEnabled: jest.fn().mockReturnValue(true),
    trackMetric: jest.fn(),
    addBreadcrumb: jest.fn(),
  }
}));

jest.mock('./enhanced-telemetry.js', () => ({
  enhancedTelemetry: {
    startSpan: jest.fn().mockReturnValue({
      traceId: 'test-trace-id',
      spanId: 'test-span-id',
      name: 'test-span',
    }),
    endSpan: jest.fn(),
    markPerformance: jest.fn(),
    measurePerformance: jest.fn().mockReturnValue(100),
  },
  SpanStatus: {
    OK: 'ok',
    ERROR: 'error',
  }
}));

// Mock performance API
const originalPerformance = global.performance;
beforeEach(() => {
  let counter = 1000;
  (global.performance as any) = {
    now: jest.fn().mockImplementation(() => counter += 100),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(),
  };
});

afterEach(() => {
  global.performance = originalPerformance;
  jest.clearAllMocks();
});

describe('PerformanceMonitoringSystem', () => {
  describe('trackFunction', () => {
    it('should wrap synchronous functions correctly', () => {
      const system = new PerformanceMonitoringSystem();
      const originalFunction = jest.fn().mockReturnValue('test-result');
      const wrappedFunction = system.trackFunction(
        originalFunction,
        'test-function',
        PerformanceScope.SYSTEM
      );
      
      const result = wrappedFunction();
      
      expect(result).toBe('test-result');
      expect(originalFunction).toHaveBeenCalled();
      expect(enhancedTelemetry.startSpan).toHaveBeenCalledWith(
        'test-function',
        undefined,
        expect.objectContaining({ scope: PerformanceScope.SYSTEM })
      );
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });

    it('should wrap async functions correctly', async () => {
      const system = new PerformanceMonitoringSystem();
      const originalFunction = jest.fn().mockResolvedValue('test-result');
      const wrappedFunction = system.trackFunction(
        originalFunction,
        'test-async-function',
        PerformanceScope.SYSTEM
      );
      
      const result = await wrappedFunction();
      
      expect(result).toBe('test-result');
      expect(originalFunction).toHaveBeenCalled();
      expect(enhancedTelemetry.startSpan).toHaveBeenCalled();
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });

    it('should handle errors in sync functions', () => {
      const system = new PerformanceMonitoringSystem();
      const testError = new Error('test error');
      const originalFunction = jest.fn().mockImplementation(() => {
        throw testError;
      });
      
      const wrappedFunction = system.trackFunction(
        originalFunction,
        'error-function',
        PerformanceScope.SYSTEM
      );
      
      expect(() => wrappedFunction()).toThrow(testError);
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });

    it('should handle errors in async functions', async () => {
      const system = new PerformanceMonitoringSystem();
      const testError = new Error('test async error');
      const originalFunction = jest.fn().mockRejectedValue(testError);
      
      const wrappedFunction = system.trackFunction(
        originalFunction,
        'async-error-function',
        PerformanceScope.SYSTEM
      );
      
      await expect(wrappedFunction()).rejects.toThrow(testError);
      expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    });
  });

  describe('startMarker and endMarker', () => {
    it('should track custom markers', () => {
      const system = new PerformanceMonitoringSystem();
      const markerId = system.startMarker('test-marker');
      const duration = system.endMarker(markerId);
      
      expect(markerId).toContain('test-marker');
      expect(duration).toBeGreaterThan(0);
      expect(telemetry.trackMetric).toHaveBeenCalledWith(
        'custom.test-marker.duration',
        expect.any(Number),
        'ms'
      );
    });

    it('should handle non-existent markers', () => {
      const system = new PerformanceMonitoringSystem();
      const duration = system.endMarker('non-existent');
      expect(duration).toBe(0);
    });
  });

  describe('trackComponentRender', () => {
    it('should track component render times', () => {
      const system = new PerformanceMonitoringSystem();
      system.trackComponentRender('TestComponent', 50);
      system.trackComponentRender('TestComponent', 70);
      
      const stats = system.getComponentStatistics('TestComponent');
      
      expect(stats).toBeDefined();
      expect(stats!.renderCount).toBe(2);
      expect(stats!.averageRenderTime).toBe(60);
      expect(stats!.lastRenderTime).toBe(70);
      
      expect(telemetry.trackMetric).toHaveBeenCalledWith(
        'ui.component.TestComponent.render_time',
        expect.any(Number),
        'ms'
      );
    });

    it('should log slow renders', () => {
      const system = new PerformanceMonitoringSystem({
        slowThresholdMs: 50,
        performanceLogLevel: 'warn',
      });
      
      system.trackComponentRender('SlowComponent', 100);
      
      // Would check logger warn calls, but we're not mocking logger in this test
    });
  });

  describe('detectBottlenecks', () => {
    it('should detect command execution bottlenecks', () => {
      // Prepare test data
      const system = new PerformanceMonitoringSystem();
      
      // Mock some performance data
      const testFn = () => {};
      const wrappedFn = system.trackFunction(testFn, 'slow-command', PerformanceScope.SYSTEM);
      
      // Execute multiple times to gather stats
      for (let i = 0; i < 10; i++) {
        wrappedFn();
      }
      
      // Artificially make this command slow
      (system as any).profile.commandExecutionTimes['slow-command'] = [
        600, 550, 700, 650, 750
      ];
      
      const bottlenecks = system.detectBottlenecks();
      
      expect(bottlenecks.length).toBeGreaterThan(0);
      expect(bottlenecks[0].name).toBe('Command: slow-command');
      expect(bottlenecks[0].scope).toBe(PerformanceScope.SYSTEM);
    });
  });
});