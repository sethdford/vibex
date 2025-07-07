
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TelemetryService, TelemetryEventType } from './index.js';

describe('TelemetryService', () => {
  let telemetryService: TelemetryService;

  beforeEach(() => {
    // Create service with CLI_START tracking disabled for tests
    telemetryService = new TelemetryService({ 
      enabled: true,
      trackCliStart: false, // Disable CLI_START tracking in tests
      flushInterval: 0 // Disable automatic flushing in tests
    });
  });

  afterEach(() => {
    // Clean up after each test
    telemetryService.cleanup();
  });

  it('should initialize with default config', () => {
    expect(telemetryService.isEnabled()).toBe(true);
    expect(telemetryService.getEvents()).toHaveLength(0); // No CLI_START event
    expect(telemetryService.getBreadcrumbs()).toHaveLength(0);
  });

  it('should track events', () => {
    telemetryService.trackEvent(TelemetryEventType.COMMAND_SUCCESS, { command: 'test' });
    
    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message');
    expect(events[0].level).toBe('info');
  });

  it('should add breadcrumbs', () => {
    telemetryService.addBreadcrumb({
      category: 'test',
      message: 'Test breadcrumb',
      level: 'info'
    });

    const breadcrumbs = telemetryService.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].message).toBe('Test breadcrumb');
  });

  it('should sanitize sensitive arguments', () => {
    // Test with login command - should now track and sanitize
    telemetryService.trackCommand('login', { 
      username: 'testuser', 
      apiKey: 'secret123',
      password: 'password123'
    }, true);
    
    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    
    // Check that sensitive fields are removed
    const args = events[0].message ? JSON.parse(events[0].message.split(': ')[1]).args : {};
    expect(args.username).toBe('testuser'); // Non-sensitive field should remain
    expect(args.apiKey).toBeUndefined(); // Sensitive field should be removed
    expect(args.password).toBeUndefined(); // Sensitive field should be removed
  });

  it('should handle errors properly', () => {
    const testError = new Error('Test error');
    const eventId = telemetryService.captureException(testError);
    
    expect(eventId).toBeDefined();
    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    expect(events[0].exception?.value).toBe('Test error');
  });

  it('should process stack traces correctly', () => {
    const testError = new Error('Test error with stack');
    // Create a more realistic stack trace
    testError.stack = `Error: Test error with stack
    at testFunction (/path/to/file.js:10:5)
    at anotherFunction (/path/to/other.js:20:10)`;
    
    telemetryService.captureException(testError);
    
    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    
    const stackFrames = events[0].exception?.stacktrace;
    expect(Array.isArray(stackFrames)).toBe(true);
    if (Array.isArray(stackFrames)) {
      expect(stackFrames.length).toBeGreaterThan(0);
      expect(stackFrames[0]).toMatchObject({
        function: expect.any(String),
        filename: expect.any(String),
        lineno: expect.any(Number),
        colno: expect.any(Number),
        in_app: expect.any(Boolean)
      });
    }
  });

  it('should track metrics', () => {
    telemetryService.trackMetric('test.metric', 42, 'count');
    
    const metrics = telemetryService.getMetrics();
    expect(metrics['test.metric']).toBeDefined();
    expect(metrics['test.metric'].value).toBe(42);
    expect(metrics['test.metric'].unit).toBe('count');
  });

  it('should clear data when requested', () => {
    // Add some data
    telemetryService.trackEvent(TelemetryEventType.COMMAND_SUCCESS, { command: 'test' });
    telemetryService.addBreadcrumb({ category: 'test', message: 'test', level: 'info' });
    telemetryService.trackMetric('test', 1);
    
    // Verify data exists
    expect(telemetryService.getEvents()).toHaveLength(1);
    expect(telemetryService.getBreadcrumbs()).toHaveLength(2); // trackEvent adds 1, addBreadcrumb adds 1
    expect(Object.keys(telemetryService.getMetrics())).toHaveLength(1);
    
    // Clear data
    telemetryService.clearData();
    
    // Verify data is cleared
    expect(telemetryService.getEvents()).toHaveLength(0);
    expect(telemetryService.getBreadcrumbs()).toHaveLength(0);
    expect(Object.keys(telemetryService.getMetrics())).toHaveLength(0);
  });
});
