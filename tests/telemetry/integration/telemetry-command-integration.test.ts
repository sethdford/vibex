/**
 * Integration tests for telemetry with command system
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TelemetryService, TelemetryEventType } from '../../../src/telemetry/index.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock command execution timing
const mockTimeCommand = (duration: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
};

describe('Telemetry Command Integration', () => {
  let telemetryService: TelemetryService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    telemetryService = new TelemetryService({ 
      enabled: true,
      environment: 'test',
      clientId: 'test-client-id'
    });
    
    // Use fake timers for command timing tests
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('should track successful command execution', () => {
    const trackEventSpy = jest.spyOn(telemetryService, 'trackEvent');
    
    telemetryService.trackCommand('init', { force: true }, true, 150);
    
    expect(trackEventSpy).toHaveBeenCalledWith(
      TelemetryEventType.COMMAND_SUCCESS,
      expect.objectContaining({
        command: 'init',
        args: expect.objectContaining({
          force: true
        }),
        duration: 150
      })
    );
  });
  
  test('should track failed command execution', () => {
    const trackEventSpy = jest.spyOn(telemetryService, 'trackEvent');
    
    telemetryService.trackCommand('build', { watch: true }, false, 250);
    
    expect(trackEventSpy).toHaveBeenCalledWith(
      TelemetryEventType.COMMAND_ERROR,
      expect.objectContaining({
        command: 'build',
        args: expect.objectContaining({
          watch: true
        }),
        duration: 250
      })
    );
  });
  
  test('should not track sensitive commands like login/logout', () => {
    const trackEventSpy = jest.spyOn(telemetryService, 'trackEvent');
    
    telemetryService.trackCommand('login', { token: 'secret-token' }, true, 100);
    telemetryService.trackCommand('logout', {}, true, 50);
    
    expect(trackEventSpy).not.toHaveBeenCalled();
  });
  
  test('should sanitize sensitive arguments in command tracking', () => {
    const sanitizeArgsSpy = jest.spyOn(telemetryService as any, 'sanitizeArgs');
    
    const args = {
      apiKey: 'secret-key',
      token: 'auth-token',
      file: 'example.js',
      count: 5
    };
    
    telemetryService.trackCommand('api', args, true, 100);
    
    expect(sanitizeArgsSpy).toHaveBeenCalledWith(args);
    
    const sanitizedArgs = sanitizeArgsSpy.mock.results[0].value;
    // Sensitive fields should be removed
    expect(sanitizedArgs).not.toHaveProperty('apiKey');
    expect(sanitizedArgs).not.toHaveProperty('token');
    // Non-sensitive fields should remain
    expect(sanitizedArgs).toHaveProperty('file', 'example.js');
    expect(sanitizedArgs).toHaveProperty('count', 5);
  });
  
  test('should track metrics for command duration', async () => {
    const trackMetricSpy = jest.spyOn(telemetryService, 'trackMetric');
    
    // Mock a command execution that takes 100ms
    const startTime = Date.now();
    jest.setSystemTime(startTime);
    
    // Start tracking command
    telemetryService.trackCommand('test', {}, true, 100);
    
    // Advance time and check metrics
    jest.advanceTimersByTime(100);
    
    // Check that duration is tracked as a metric
    expect(trackMetricSpy).toHaveBeenCalled();
  });
  
  test('should create appropriate breadcrumbs for command execution', () => {
    const addBreadcrumbSpy = jest.spyOn(telemetryService, 'addBreadcrumb');
    
    // Execute a command
    telemetryService.trackCommand('deploy', { environment: 'production' }, true, 200);
    
    // Check breadcrumb was added
    expect(addBreadcrumbSpy).toHaveBeenCalledWith(expect.objectContaining({
      category: 'event',
      message: TelemetryEventType.COMMAND_SUCCESS,
      level: 'info',
      data: expect.objectContaining({
        command: 'deploy',
        duration: 200
      })
    }));
  });
  
  test('should track a sequence of commands', () => {
    const captureMessageSpy = jest.spyOn(telemetryService, 'captureMessage');
    
    // Simulate a sequence of commands
    telemetryService.trackCommand('init', {}, true, 100);
    telemetryService.trackCommand('build', { minify: true }, true, 500);
    telemetryService.trackCommand('deploy', { environment: 'staging' }, true, 300);
    
    // Check that all commands were captured
    expect(captureMessageSpy).toHaveBeenCalledTimes(3);
    expect(captureMessageSpy).toHaveBeenNthCalledWith(
      1, 
      expect.stringContaining(TelemetryEventType.COMMAND_SUCCESS)
    );
    expect(captureMessageSpy).toHaveBeenNthCalledWith(
      2, 
      expect.stringContaining(TelemetryEventType.COMMAND_SUCCESS)
    );
    expect(captureMessageSpy).toHaveBeenNthCalledWith(
      3, 
      expect.stringContaining(TelemetryEventType.COMMAND_SUCCESS)
    );
  });
});