/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect, beforeEach, afterEach, jest } from 'vitest';
import { TelemetryService, TelemetryEventType } from '../../src/telemetry/index.js';

describe('TelemetryService', () => {
  let telemetryService: TelemetryService;

  beforeEach(() => {
    // Create service with CLI_START tracking disabled for tests
    telemetryService = new TelemetryService({
      enabled: true,
      trackCliStart: false, // Disable CLI_START tracking in tests
      flushInterval: 60000, // Use longer interval for tests
      captureUnhandledRejections: false, // Disable global handlers in tests
      captureConsole: false // Disable console instrumentation in tests
    });
  });

  afterEach(() => {
    // Clean up the service after each test
    telemetryService.cleanup();
  });

  test('should initialize with default configuration', () => {
    expect(telemetryService.isEnabled()).toBe(true);
    expect(telemetryService.getBreadcrumbs()).toEqual([]);
    expect(telemetryService.getEvents()).toEqual([]);
  });

  test('should track events correctly', () => {
    telemetryService.trackEvent(TelemetryEventType.COMMAND_EXECUTE, {
      command: 'test',
      args: { input: 'value' }
    });

    const breadcrumbs = telemetryService.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].category).toBe('event');
    expect(breadcrumbs[0].message).toBe(TelemetryEventType.COMMAND_EXECUTE);
    expect(breadcrumbs[0].data).toEqual({
      command: 'test',
      args: { input: 'value' }
    });

    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message');
  });

  test('should sanitize sensitive arguments', () => {
    telemetryService.trackCommand('login', {
      username: 'testuser',
      apiKey: 'secret123',
      password: 'secret456',
      token: 'bearer_token',
      regularArg: 'normalValue'
    }, true);

    const breadcrumbs = telemetryService.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    
    // Check that sensitive fields are completely filtered out
    const args = breadcrumbs[0].data?.args as Record<string, unknown>;
    expect(args).toBeDefined();
    expect(args).not.toHaveProperty('apiKey');
    expect(args).not.toHaveProperty('password'); 
    expect(args).not.toHaveProperty('token');
    expect(args).toHaveProperty('username', 'testuser');
    expect(args).toHaveProperty('regularArg', 'normalValue');
  });

  test('should add breadcrumbs correctly', () => {
    telemetryService.addBreadcrumb({
      category: 'test',
      message: 'Test breadcrumb',
      level: 'info'
    });

    const breadcrumbs = telemetryService.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].category).toBe('test');
    expect(breadcrumbs[0].message).toBe('Test breadcrumb');
    expect(breadcrumbs[0].level).toBe('info');
    expect(breadcrumbs[0].timestamp).toBeGreaterThan(0);
  });

  test('should capture exceptions with stack trace processing', () => {
    const testError = new Error('Test error');
    const eventId = telemetryService.captureException(testError);

    expect(eventId).toBeDefined();
    
    const events = telemetryService.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    expect(events[0].exception?.type).toBe('Error');
    expect(events[0].exception?.value).toBe('Test error');
    
    // Check that stack trace is processed into frames
    if (Array.isArray(events[0].exception?.stacktrace)) {
      const frames = events[0].exception.stacktrace;
      expect(frames.length).toBeGreaterThan(0);
      // Each frame should have the expected structure
      frames.forEach(frame => {
        expect(frame).toHaveProperty('function');
        expect(frame).toHaveProperty('filename');
        expect(frame).toHaveProperty('lineno');
        expect(frame).toHaveProperty('colno');
        expect(frame).toHaveProperty('in_app');
      });
    }
  });

  test('should track metrics correctly', () => {
    telemetryService.trackMetric('test.metric', 42, 'ms', { tag: 'value' });

    const metrics = telemetryService.getMetrics();
    expect(metrics['test.metric']).toBeDefined();
    expect(metrics['test.metric'].value).toBe(42);
    expect(metrics['test.metric'].unit).toBe('ms');
    expect(metrics['test.metric'].tags).toEqual({ tag: 'value' });
    expect(metrics['test.metric'].aggregates.count).toBe(1);
    expect(metrics['test.metric'].aggregates.sum).toBe(42);
  });

  test('should track API calls', () => {
    telemetryService.trackApiCall('claude/messages', 1500, 200, 'claude-3-sonnet');

    const metrics = telemetryService.getMetrics();
    expect(metrics['api.claude/messages.duration']).toBeDefined();
    expect(metrics['api.claude/messages.duration'].value).toBe(1500);
    expect(metrics['api.claude/messages.status.200']).toBeDefined();
    expect(metrics['api.claude/messages.status.200'].value).toBe(1);

    const breadcrumbs = telemetryService.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].category).toBe('api');
    expect(breadcrumbs[0].data?.endpoint).toBe('claude/messages');
    expect(breadcrumbs[0].data?.status).toBe(200);
  });

  test('should handle disabled service', () => {
    const disabledService = new TelemetryService({ enabled: false });
    
    expect(disabledService.isEnabled()).toBe(false);
    
    // These should not throw or create events
    disabledService.trackEvent(TelemetryEventType.COMMAND_EXECUTE);
    disabledService.captureException(new Error('test'));
    disabledService.trackMetric('test', 1);
    
    expect(disabledService.getEvents()).toHaveLength(0);
    expect(disabledService.getBreadcrumbs()).toHaveLength(0);
    expect(Object.keys(disabledService.getMetrics())).toHaveLength(0);
    
    disabledService.cleanup();
  });

  test('should manage sessions', () => {
    const session = telemetryService.startSession('test-session');
    
    expect(session).toBeDefined();
    expect(session?.id).toBe('test-session');
    expect(session?.status).toBe('active');
    expect(session?.startTime).toBeGreaterThan(0);
    
    telemetryService.endSession('test-session', 'completed');
    
    // Session should be marked as completed
    expect(session?.status).toBe('completed');
    expect(session?.endTime).toBeGreaterThan(session!.startTime);
  });

  test('should limit breadcrumbs to maxBreadcrumbs', () => {
    const serviceWithLimit = new TelemetryService({ 
      enabled: true, 
      maxBreadcrumbs: 2,
      trackCliStart: false,
      captureUnhandledRejections: false,
      captureConsole: false
    });

    serviceWithLimit.addBreadcrumb({ category: 'test', message: '1', level: 'info' });
    serviceWithLimit.addBreadcrumb({ category: 'test', message: '2', level: 'info' });
    serviceWithLimit.addBreadcrumb({ category: 'test', message: '3', level: 'info' });

    const breadcrumbs = serviceWithLimit.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0].message).toBe('2'); // First one should be removed
    expect(breadcrumbs[1].message).toBe('3');
    
    serviceWithLimit.cleanup();
  });

  test('should clear data correctly', () => {
    telemetryService.trackEvent(TelemetryEventType.COMMAND_EXECUTE);
    telemetryService.addBreadcrumb({ category: 'test', message: 'test', level: 'info' });
    telemetryService.trackMetric('test', 1);

    expect(telemetryService.getEvents()).toHaveLength(1);
    expect(telemetryService.getBreadcrumbs()).toHaveLength(1);
    expect(Object.keys(telemetryService.getMetrics())).toHaveLength(1);

    telemetryService.clearData();

    expect(telemetryService.getEvents()).toHaveLength(0);
    expect(telemetryService.getBreadcrumbs()).toHaveLength(0);
    expect(Object.keys(telemetryService.getMetrics())).toHaveLength(0);
  });
}); 