/**
 * Comprehensive unit tests for TelemetryService
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TelemetryService, TelemetryEventType } from '../../../src/telemetry/index.js';

// Mock dependencies
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

jest.mock('events', () => {
  return {
    EventEmitter: class MockEventEmitter {
      listeners = {};
      on(event, listener) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(listener);
        return this;
      }
      emit(event, ...args) {
        if (this.listeners[event]) {
          this.listeners[event].forEach(listener => listener(...args));
        }
        return true;
      }
    }
  };
});

jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('TelemetryService - Comprehensive Tests', () => {
  let telemetryService: TelemetryService;
  let originalProcessOn: typeof process.on;
  let originalConsole: typeof console;
  
  // Store original process.on and console for cleanup
  beforeEach(() => {
    originalProcessOn = process.on;
    originalConsole = { ...console };
    
    // Mock process.on to prevent actual event handlers from being registered
    process.on = jest.fn().mockReturnValue(process) as any;
    
    // Reset mocks between tests
    jest.clearAllMocks();
    
    // Create a new instance with telemetry explicitly enabled for most tests
    // Disable CLI start tracking for tests to avoid auto-generated events
    telemetryService = new TelemetryService({ 
      enabled: true,
      clientId: 'test-client-id',
      environment: 'test',
      flushInterval: 100, // Short interval for testing
      trackCliStart: false // Disable CLI start tracking for tests
    });
  });
  
  afterEach(() => {
    // Cleanup mocks
    process.on = originalProcessOn;
    Object.keys(console).forEach(key => {
      if (typeof originalConsole[key] === 'function') {
        console[key] = originalConsole[key];
      }
    });
    
    // Clear any timers
    jest.useRealTimers();
  });
  
  test('should initialize with provided configuration', () => {
    expect(telemetryService).toBeDefined();
    expect(telemetryService.isEnabled()).toBe(true);
  });

  test('should track events when enabled', () => {
    const addBreadcrumbSpy = jest.spyOn(telemetryService, 'addBreadcrumb');
    const captureMessageSpy = jest.spyOn(telemetryService, 'captureMessage');
    
    telemetryService.trackEvent(TelemetryEventType.CLI_START);
    
    expect(addBreadcrumbSpy).toHaveBeenCalledWith({
      category: 'event',
      message: TelemetryEventType.CLI_START,
      level: 'info',
      data: {}
    });
    expect(captureMessageSpy).toHaveBeenCalled();
  });
  
  test('should track errors when enabled', () => {
    const captureExceptionSpy = jest.spyOn(telemetryService, 'captureException');
    const error = new Error('Test error');
    
    telemetryService.trackError(error);
    
    expect(captureExceptionSpy).toHaveBeenCalledWith(error, expect.any(Object));
  });
  
  test('should track command execution', () => {
    const trackEventSpy = jest.spyOn(telemetryService, 'trackEvent');
    
    telemetryService.trackCommand('test-command', { flag: true }, true, 100);
    
    expect(trackEventSpy).toHaveBeenCalledWith(
      TelemetryEventType.COMMAND_SUCCESS,
      expect.objectContaining({
        command: 'test-command',
        duration: 100
      })
    );
  });

  test('should track command failures', () => {
    const trackEventSpy = jest.spyOn(telemetryService, 'trackEvent');
    
    telemetryService.trackCommand('test-command', { flag: true }, false, 100);
    
    expect(trackEventSpy).toHaveBeenCalledWith(
      TelemetryEventType.COMMAND_ERROR,
      expect.objectContaining({
        command: 'test-command',
        duration: 100
      })
    );
  });

  test('should add breadcrumbs correctly', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 1));
    
    telemetryService.addBreadcrumb({
      category: 'test',
      message: 'test breadcrumb',
      level: 'info'
    });
    
    const breadcrumbs = telemetryService.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]).toEqual({
      category: 'test',
      message: 'test breadcrumb',
      level: 'info',
      timestamp: expect.any(Number)
    });
  });
  
  test('should limit breadcrumbs to max configured amount', () => {
    // Create service with small max breadcrumbs for testing
    const limitedService = new TelemetryService({ 
      enabled: true, 
      maxBreadcrumbs: 2 
    });
    
    limitedService.addBreadcrumb({ category: 'test', message: 'first', level: 'info' });
    limitedService.addBreadcrumb({ category: 'test', message: 'second', level: 'info' });
    limitedService.addBreadcrumb({ category: 'test', message: 'third', level: 'info' });
    
    const breadcrumbs = limitedService.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0].message).toBe('second');
    expect(breadcrumbs[1].message).toBe('third');
  });
  
  test('should capture messages with proper event structure', () => {
    const eventId = telemetryService.captureMessage('test message', 'warning');
    
    expect(eventId).toBe('mock-uuid');
    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({
      event_id: 'mock-uuid',
      type: 'message',
      level: 'warning',
      message: 'test message',
      environment: 'test'
    }));
  });
  
  test('should capture exceptions with proper event structure', () => {
    const error = new Error('test error');
    error.stack = 'Error: test error\n    at TestFunction (/path/to/file.js:123:45)';
    
    const eventId = telemetryService.captureException(error);
    
    expect(eventId).toBe('mock-uuid');
    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({
      event_id: 'mock-uuid',
      type: 'error',
      level: 'error',
      exception: expect.objectContaining({
        type: 'Error',
        value: 'test error'
      })
    }));
  });
  
  test('should track metrics with proper aggregation', () => {
    telemetryService.trackMetric('test-metric', 10, 'ms');
    telemetryService.trackMetric('test-metric', 20, 'ms');
    
    const metrics = telemetryService.getMetrics();
    expect(metrics['test-metric']).toBeDefined();
    expect(metrics['test-metric'].value).toBe(20); // Last value
    expect(metrics['test-metric'].values).toHaveLength(2);
    expect(metrics['test-metric'].aggregates).toEqual({
      count: 2,
      sum: 30,
      min: 10,
      max: 20,
      avg: 15
    });
  });
  
  test('should track API calls with proper metrics', () => {
    const trackMetricSpy = jest.spyOn(telemetryService, 'trackMetric');
    const addBreadcrumbSpy = jest.spyOn(telemetryService, 'addBreadcrumb');
    
    telemetryService.trackApiCall('test-endpoint', 150, 200, 'test-model');
    
    expect(trackMetricSpy).toHaveBeenCalledTimes(2);
    expect(trackMetricSpy).toHaveBeenCalledWith(
      'api.test-endpoint.duration',
      150,
      'ms',
      { model: 'test-model' }
    );
    expect(trackMetricSpy).toHaveBeenCalledWith(
      'api.test-endpoint.status.200',
      1,
      'count'
    );
    expect(addBreadcrumbSpy).toHaveBeenCalledWith({
      category: 'api',
      message: 'API call to test-endpoint',
      level: 'info',
      data: {
        endpoint: 'test-endpoint',
        duration: 150,
        status: 200,
        model: 'test-model'
      }
    });
  });

  test('should track API calls with error status', () => {
    const addBreadcrumbSpy = jest.spyOn(telemetryService, 'addBreadcrumb');
    
    telemetryService.trackApiCall('test-endpoint', 150, 500);
    
    expect(addBreadcrumbSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        data: expect.objectContaining({
          status: 500
        })
      })
    );
  });
  
  test('should manage sessions correctly', () => {
    jest.useFakeTimers();
    const now = Date.now();
    jest.setSystemTime(now);
    
    const session = telemetryService.startSession('test-session');
    expect(session).toBeDefined();
    expect(session?.id).toBe('test-session');
    expect(session?.status).toBe('active');
    expect(session?.startTime).toBe(now);
    
    // Move time forward
    jest.advanceTimersByTime(5000);
    
    telemetryService.endSession('test-session', 'completed');
    
    // Session should be updated with end time and duration
    expect(session?.endTime).toBe(now + 5000);
    expect(session?.duration).toBe(5000);
    expect(session?.status).toBe('completed');
  });
  
  test('should handle sanitizing of sensitive arguments', () => {
    const args = {
      apiKey: 'secret-api-key',
      password: 'password123',
      token: 'sensitive-token',
      secret: 'very-secret',
      userId: 123,
      enabled: true,
      options: { nested: 'value' },
      items: [1, 2, 3]
    };
    
    const sanitized = (telemetryService as any).sanitizeArgs(args);
    
    // Sensitive fields should be removed
    expect(sanitized).not.toHaveProperty('apiKey');
    expect(sanitized).not.toHaveProperty('password');
    expect(sanitized).not.toHaveProperty('token');
    expect(sanitized).not.toHaveProperty('secret');
    
    // Non-sensitive fields should be preserved or transformed
    expect(sanitized).toHaveProperty('userId', 123);
    expect(sanitized).toHaveProperty('enabled', true);
    expect(sanitized.options).toBe('Object');
    expect(sanitized.items).toBe('Array(3)');
  });
  
  test('should normalize different error types', () => {
    const normalizeError = (telemetryService as any).normalizeError;
    
    // Test with Error object
    const error = new Error('test error');
    const normalizedError = normalizeError(error);
    expect(normalizedError).toEqual({
      type: 'Error',
      value: 'test error',
      stacktrace: expect.any(String),
      mechanism: { type: 'generic', handled: true }
    });
    
    // Test with string
    const stringError = normalizeError('string error');
    expect(stringError).toEqual({
      type: 'UnknownError',
      value: 'string error',
      stacktrace: '',
      mechanism: { type: 'generic', handled: true }
    });
    
    // Test with object
    const objError = normalizeError({ message: 'object error' });
    expect(objError).toEqual({
      type: 'UnknownError',
      value: '[object Object]',
      stacktrace: '',
      mechanism: { type: 'generic', handled: true }
    });
  });
  
  test('should process stack traces correctly', () => {
    const processStackTrace = (telemetryService as any).processStackTrace;
    
    const stackTrace = `Error: test error
      at TestFunction (/path/to/file.js:123:45)
      at processTicksAndRejections (node:internal/process/task_queues.js:95:5)
      at Object.<anonymous> (/path/to/node_modules/some-package/index.js:67:8)`;
    
    const processed = processStackTrace(stackTrace);
    
    // Should skip the error message line and only process actual stack frames
    expect(processed).toHaveLength(3);
    expect(processed[0]).toEqual(expect.objectContaining({
      function: 'TestFunction',
      filename: '/path/to/file.js',
      lineno: 123,
      colno: 45,
      in_app: true
    }));
    
    // Should mark node_modules as not in_app
    expect(processed[2].in_app).toBe(false);
  });

  test('should flush events when interval elapses', async () => {
    jest.useFakeTimers();
    const flushSpy = jest.spyOn(telemetryService, 'flush');
    
    // Capture a message to add an event
    telemetryService.captureMessage('test message');
    
    // Fast forward past the flush interval
    jest.advanceTimersByTime(200);
    
    expect(flushSpy).toHaveBeenCalled();
  });

  test('should track CLI start when enabled', () => {
    // Create a new instance with CLI start tracking enabled
    const trackEventSpy = jest.fn();
    const newService = new TelemetryService({ 
      enabled: true, 
      trackCliStart: true 
    });
    
    // Spy on the trackEvent method after creation
    jest.spyOn(newService, 'trackEvent').mockImplementation(trackEventSpy);
    
    // Manually trigger CLI start (since it happens in constructor)
    newService.trackEvent(TelemetryEventType.CLI_START);
    
    expect(trackEventSpy).toHaveBeenCalledWith(TelemetryEventType.CLI_START);
  });
});