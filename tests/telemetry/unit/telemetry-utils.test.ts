/**
 * Unit tests for telemetry utilities
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import * as telemetryUtils from '../../../src/telemetry/telemetry-utils.js';
import { telemetry } from '../../../src/telemetry/index.js';
import { enhancedTelemetry } from '../../../src/telemetry/enhanced-telemetry.js';
import { performanceMonitoring, PerformanceScope } from '../../../src/telemetry/performance-monitoring.js';

// Mock dependencies
jest.mock('../../../src/telemetry/index.js', () => ({
  telemetry: {
    trackEvent: jest.fn(),
    addBreadcrumb: jest.fn()
  },
  TelemetryEventType: {
    AI_REQUEST: 'ai_request',
    AI_RESPONSE: 'ai_response'
  }
}));

jest.mock('../../../src/telemetry/enhanced-telemetry.js', () => ({
  enhancedTelemetry: {
    startSpan: jest.fn().mockReturnValue({ 
      traceId: 'mock-trace-id', 
      spanId: 'mock-span-id', 
      name: 'mock-span' 
    }),
    endSpan: jest.fn(),
    getResourceStats: jest.fn().mockReturnValue({
      memoryUsage: {
        rss: 200 * 1024 * 1024, // 200MB
        heapUsed: 100 * 1024 * 1024 // 100MB
      }
    })
  },
  SpanStatus: {
    OK: 'ok',
    ERROR: 'error'
  }
}));

jest.mock('../../../src/telemetry/performance-monitoring.js', () => ({
  performanceMonitoring: {
    trackFunction: jest.fn().mockImplementation((fn) => fn),
    startMarker: jest.fn().mockReturnValue('mock-marker-id'),
    endMarker: jest.fn(),
    trackComponentRender: jest.fn(),
    detectBottlenecks: jest.fn().mockReturnValue([])
  },
  PerformanceScope: {
    SYSTEM: 'system',
    NETWORK: 'network'
  }
}));

// Mock process.env for testing
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('telemetry-utils', () => {
  beforeEach(() => {
    // Reset all mocks between tests
    jest.clearAllMocks();
  });
  
  test('anonymizePath should handle empty path', () => {
    expect(telemetryUtils.anonymizePath('')).toBe('');
  });
  
  test('anonymizePath should anonymize home directory', () => {
    // Set up a mock home directory
    process.env.HOME = '/Users/testuser';
    
    const result = telemetryUtils.anonymizePath('/Users/testuser/project/src/file.ts');
    expect(result).toBe('/Users/****/project/src/file.ts');
  });
  
  test('hashSensitiveData should consistently hash the same data', () => {
    const hash1 = telemetryUtils.hashSensitiveData('sensitive-data');
    const hash2 = telemetryUtils.hashSensitiveData('sensitive-data');
    const hash3 = telemetryUtils.hashSensitiveData('different-data');
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(16);
  });
  
  test('wrapFunctionWithTelemetry should use performanceMonitoring', () => {
    const fn = jest.fn();
    
    telemetryUtils.wrapFunctionWithTelemetry(fn, 'test-function', PerformanceScope.SYSTEM);
    
    expect(performanceMonitoring.trackFunction).toHaveBeenCalledWith(
      fn, 
      'test-function', 
      PerformanceScope.SYSTEM
    );
  });
  
  test('trackAsyncOperation should track operation with span', async () => {
    const operation = jest.fn().mockResolvedValue('result');
    
    const result = await telemetryUtils.trackAsyncOperation(
      operation,
      'test-operation',
      PerformanceScope.NETWORK
    );
    
    expect(result).toBe('result');
    expect(enhancedTelemetry.startSpan).toHaveBeenCalledWith(
      'test-operation', 
      undefined, 
      { scope: PerformanceScope.NETWORK }
    );
    expect(performanceMonitoring.startMarker).toHaveBeenCalledWith('test-operation');
    expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    expect(performanceMonitoring.endMarker).toHaveBeenCalled();
  });
  
  test('trackAsyncOperation should handle errors', async () => {
    const error = new Error('Test error');
    const operation = jest.fn().mockRejectedValue(error);
    
    await expect(telemetryUtils.trackAsyncOperation(
      operation,
      'error-operation',
      PerformanceScope.NETWORK
    )).rejects.toThrow('Test error');
    
    expect(enhancedTelemetry.startSpan).toHaveBeenCalled();
    expect(enhancedTelemetry.endSpan).toHaveBeenCalled();
    expect(performanceMonitoring.endMarker).toHaveBeenCalled();
  });
  
  test('trackComponentRender should delegate to performanceMonitoring', () => {
    telemetryUtils.trackComponentRender('TestComponent', 50);
    
    expect(performanceMonitoring.trackComponentRender).toHaveBeenCalledWith('TestComponent', 50);
  });
  
  test('createTracingId should return a valid ID', () => {
    const tracingId = telemetryUtils.createTracingId();
    expect(tracingId).toMatch(/^[0-9a-f]{32}$/); // 32 hex characters
  });
  
  test('sanitizeObject should remove sensitive fields', () => {
    const input = {
      username: 'testuser',
      password: 'secret',
      apiKey: 'confidential',
      address: {
        street: '123 Main St',
        secretCode: '12345'
      },
      items: ['item1', 'item2']
    };
    
    const result = telemetryUtils.sanitizeObject(input);
    
    expect(result).toHaveProperty('username', 'testuser');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('apiKey');
    expect(result).toHaveProperty('address');
    expect(result.address).not.toHaveProperty('secretCode');
    expect(result.address).toHaveProperty('street', '123 Main St');
    expect(result).toHaveProperty('items', 'Array(2)');
  });
  
  test('sanitizeObject should truncate long strings', () => {
    const longString = 'a'.repeat(200);
    const input = { description: longString };
    
    const result = telemetryUtils.sanitizeObject(input);
    
    expect(result.description.length).toBeLessThan(longString.length);
    expect(result.description).toMatch(/a{100}\.{3}/); // 100 'a's followed by '...'
  });
  
  test('formatExecutionTime should format time correctly', () => {
    expect(telemetryUtils.formatExecutionTime(0.5)).toBe('< 1ms');
    expect(telemetryUtils.formatExecutionTime(42)).toBe('42ms');
    expect(telemetryUtils.formatExecutionTime(1500)).toBe('1.50s');
  });
  
  test('getSystemMetadata should return system info', () => {
    const metadata = telemetryUtils.getSystemMetadata();
    
    expect(metadata).toHaveProperty('platform');
    expect(metadata).toHaveProperty('nodeVersion');
    expect(metadata).toHaveProperty('cpuCount');
    expect(metadata).toHaveProperty('memoryTotal');
    expect(metadata).toHaveProperty('memoryFree');
    expect(metadata).toHaveProperty('hostname');
  });
  
  test('trackAIRequest should track request event', () => {
    const requestId = telemetryUtils.trackAIRequest('gpt-4', 'test prompt', {
      max_tokens: 100,
      temperature: 0.7
    });
    
    expect(requestId).toBeDefined();
    expect(telemetry.trackEvent).toHaveBeenCalled();
    const eventArgs = (telemetry.trackEvent as jest.Mock).mock.calls[0][1];
    
    expect(eventArgs).toHaveProperty('requestId', requestId);
    expect(eventArgs).toHaveProperty('model', 'gpt-4');
    expect(eventArgs).toHaveProperty('promptLength', 11);
    expect(eventArgs).toHaveProperty('max_tokens', 100);
    expect(eventArgs).toHaveProperty('temperature', 0.7);
  });
  
  test('trackAIResponse should track response event', () => {
    telemetryUtils.trackAIResponse(
      'test-request-id',
      'gpt-4',
      500,
      1200,
      150
    );
    
    expect(telemetry.trackEvent).toHaveBeenCalled();
    const eventArgs = (telemetry.trackEvent as jest.Mock).mock.calls[0][1];
    
    expect(eventArgs).toHaveProperty('requestId', 'test-request-id');
    expect(eventArgs).toHaveProperty('model', 'gpt-4');
    expect(eventArgs).toHaveProperty('responseLength', 500);
    expect(eventArgs).toHaveProperty('durationMs', 1200);
    expect(eventArgs).toHaveProperty('tokensGenerated', 150);
    expect(eventArgs).toHaveProperty('tokensPerSecond', 125); // 150 / (1200/1000)
  });
  
  test('detectPerformanceIssues should add breadcrumb for high memory usage', () => {
    // Mocked memory usage in enhanced-telemetry is 200MB
    telemetryUtils.detectPerformanceIssues();
    
    expect(enhancedTelemetry.getResourceStats).toHaveBeenCalled();
    expect(telemetry.addBreadcrumb).toHaveBeenCalled();
    expect(performanceMonitoring.detectBottlenecks).toHaveBeenCalled();
  });
});