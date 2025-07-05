/**
 * Enhanced Telemetry Tests
 * 
 * Tests for the enhanced telemetry system with distributed tracing
 * and resource monitoring capabilities.
 */

import { jest } from '@jest/globals';
import { enhancedTelemetry, EnhancedTelemetrySystem, SpanStatus } from './enhanced-telemetry.js';
import { telemetry } from './index.js';

// Mock dependencies
jest.mock('./index.js', () => ({
  telemetry: {
    isEnabled: jest.fn().mockReturnValue(true),
    trackMetric: jest.fn(),
    addBreadcrumb: jest.fn(),
    trackEvent: jest.fn(),
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

describe('EnhancedTelemetrySystem', () => {
  describe('startSpan', () => {
    it('should create a span with correct properties', () => {
      const span = enhancedTelemetry.startSpan('test-span', undefined, { test: true });
      
      expect(span).toBeDefined();
      expect(span.name).toBe('test-span');
      expect(span.traceId).toBeDefined();
      expect(span.spanId).toBeDefined();
      expect(span.attributes).toBeDefined();
      expect(span.attributes!.test).toBe(true);
      expect(telemetry.addBreadcrumb).toHaveBeenCalled();
    });

    it('should use parent context for traceId when provided', () => {
      const parentSpan = enhancedTelemetry.startSpan('parent-span');
      const childSpan = enhancedTelemetry.startSpan('child-span', parentSpan);
      
      expect(childSpan.traceId).toBe(parentSpan.traceId);
      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
    });

    it('should return a dummy span when telemetry is disabled', () => {
      (telemetry.isEnabled as jest.Mock).mockReturnValueOnce(false);
      const span = enhancedTelemetry.startSpan('disabled-span');
      
      expect(span.traceId).toBe('00000000000000000000000000000000');
      expect(span.spanId).toBe('0000000000000000');
      expect(telemetry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('endSpan', () => {
    it('should track metrics and remove span from active spans', () => {
      const span = enhancedTelemetry.startSpan('test-span');
      enhancedTelemetry.endSpan(span);
      
      expect(telemetry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        category: 'span',
        message: `Ended span: test-span`,
      }));
      expect(telemetry.trackMetric).toHaveBeenCalledWith(
        `span.test-span.duration`,
        expect.any(Number),
        'ms',
        expect.anything()
      );
    });

    it('should handle error status correctly', () => {
      const span = enhancedTelemetry.startSpan('error-span');
      enhancedTelemetry.endSpan(span, SpanStatus.ERROR, { errorType: 'test-error' });
      
      expect(telemetry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        level: 'error',
        data: expect.objectContaining({
          status: SpanStatus.ERROR,
          errorType: 'test-error'
        })
      }));
    });
  });

  describe('markPerformance', () => {
    it('should mark performance events', () => {
      enhancedTelemetry.markPerformance('test-marker');
      
      expect(telemetry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        category: 'performance',
        message: `Performance marker: test-marker`,
      }));
    });
  });

  describe('measurePerformance', () => {
    it('should measure time between markers', () => {
      enhancedTelemetry.markPerformance('start-marker');
      enhancedTelemetry.markPerformance('end-marker');
      
      const duration = enhancedTelemetry.measurePerformance('start-marker', 'end-marker', 'test-measure');
      
      expect(duration).toBeGreaterThan(0);
      expect(telemetry.trackMetric).toHaveBeenCalledWith(
        'performance.test-measure',
        expect.any(Number),
        'ms'
      );
    });

    it('should return 0 if markers do not exist', () => {
      const duration = enhancedTelemetry.measurePerformance('non-existent-start', 'non-existent-end');
      expect(duration).toBe(0);
    });
  });

  describe('trackRequest', () => {
    it('should track network requests', () => {
      enhancedTelemetry.trackRequest({
        url: 'https://api.example.com/v1/chat',
        method: 'POST',
        statusCode: 200,
        duration: 150,
      });
      
      expect(telemetry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        category: 'network',
        message: 'POST https://api.example.com/v1/chat 200',
        level: 'info',
      }));
      
      expect(telemetry.trackMetric).toHaveBeenCalledWith(
        'network.request.duration',
        150,
        'ms',
        expect.anything()
      );
    });

    it('should mark errors correctly', () => {
      enhancedTelemetry.trackRequest({
        url: 'https://api.example.com/v1/chat',
        method: 'POST',
        statusCode: 500,
        error: 'Internal Server Error',
        duration: 250,
      });
      
      expect(telemetry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        level: 'error',
      }));
    });
  });
});