/**
 * Integration tests for telemetry with error system
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TelemetryService } from '../../../src/telemetry/index.js';
import * as ErrorTypes from '../../../src/errors/types.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Create custom error classes for testing
class TestNetworkError extends Error {
  category: ErrorTypes.ErrorCategory;
  
  constructor(message: string) {
    super(message);
    this.name = 'TestNetworkError';
    this.category = ErrorTypes.ErrorCategory.NETWORK;
  }
}

class TestAuthenticationError extends Error {
  category: ErrorTypes.ErrorCategory;
  
  constructor(message: string) {
    super(message);
    this.name = 'TestAuthenticationError';
    this.category = ErrorTypes.ErrorCategory.AUTH;
  }
}

describe('Telemetry Error Integration', () => {
  let telemetryService: TelemetryService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    telemetryService = new TelemetryService({ 
      enabled: true,
      environment: 'test',
      clientId: 'test-client-id',
      flushInterval: 10000
    });
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('should capture error with correct category from errors module', () => {
    const captureExceptionSpy = jest.spyOn(telemetryService, 'captureException');
    const networkError = new TestNetworkError('Failed to connect to API');
    
    telemetryService.trackError(networkError);
    
    expect(captureExceptionSpy).toHaveBeenCalledWith(networkError, expect.objectContaining({
      tags: expect.objectContaining({
        category: ErrorTypes.ErrorCategory.NETWORK
      })
    }));
  });
  
  test('should capture authentication error with correct category', () => {
    const captureExceptionSpy = jest.spyOn(telemetryService, 'captureException');
    const authError = new TestAuthenticationError('Invalid token');
    
    telemetryService.trackError(authError);
    
    expect(captureExceptionSpy).toHaveBeenCalledWith(authError, expect.objectContaining({
      tags: expect.objectContaining({
        category: ErrorTypes.ErrorCategory.AUTH
      })
    }));
  });
  
  test('should use UNKNOWN category for generic errors', () => {
    const captureExceptionSpy = jest.spyOn(telemetryService, 'captureException');
    const genericError = new Error('Something went wrong');
    
    telemetryService.trackError(genericError);
    
    expect(captureExceptionSpy).toHaveBeenCalledWith(genericError, expect.objectContaining({
      tags: expect.objectContaining({
        category: ErrorTypes.ErrorCategory.UNKNOWN
      })
    }));
  });
  
  test('should propagate error contexts to telemetry', () => {
    const captureExceptionSpy = jest.spyOn(telemetryService, 'captureException');
    const error = new TestNetworkError('Failed to connect to API');
    
    const context = {
      tags: {
        endpoint: '/api/data',
        method: 'GET'
      },
      extra: {
        request_id: '123456',
        user_id: 'user-789'
      }
    };
    
    telemetryService.trackError(error, context);
    
    expect(captureExceptionSpy).toHaveBeenCalledWith(error, expect.objectContaining({
      tags: expect.objectContaining({
        category: ErrorTypes.ErrorCategory.NETWORK,
        endpoint: '/api/data',
        method: 'GET'
      }),
      extra: expect.objectContaining({
        request_id: '123456',
        user_id: 'user-789'
      })
    }));
  });
  
  test('should track error breadcrumbs when tracking errors', () => {
    const addBreadcrumbSpy = jest.spyOn(telemetryService, 'addBreadcrumb');
    const networkError = new TestNetworkError('API timeout');
    
    // First track an API call (which would happen before the error)
    telemetryService.trackApiCall('/api/data', 5000, 408);
    
    // Then track the error
    telemetryService.trackError(networkError);
    
    // Verify the API call breadcrumb was added
    expect(addBreadcrumbSpy).toHaveBeenCalledWith(expect.objectContaining({
      category: 'api',
      message: 'API call to /api/data',
      level: 'error',
      data: expect.objectContaining({
        endpoint: '/api/data',
        status: 408
      })
    }));
    
    // Check that the breadcrumb was included in the captured exception
    const captureExceptionSpy = jest.spyOn(telemetryService, 'captureException');
    expect(captureExceptionSpy).toHaveBeenCalledWith(networkError, expect.any(Object));
  });
  
  test('should be able to find errors in event stream', () => {
    // Create and track multiple errors
    const networkError = new TestNetworkError('API timeout');
    const authError = new TestAuthenticationError('Invalid token');
    
    telemetryService.trackError(networkError);
    telemetryService.trackError(authError);
    telemetryService.trackCommand('test-command', {}, true, 100);
    
    // Get all events and filter to find errors
    const allEvents = telemetryService.getEvents();
    const errorEvents = allEvents.filter(event => event.type === 'error');
    
    // Verify we can find specific errors
    expect(errorEvents).toHaveLength(2);
    
    const networkErrorEvent = errorEvents.find(event => 
      event.exception?.value === 'API timeout'
    );
    const authErrorEvent = errorEvents.find(event => 
      event.exception?.value === 'Invalid token'
    );
    
    expect(networkErrorEvent).toBeDefined();
    expect(authErrorEvent).toBeDefined();
    
    if (networkErrorEvent) {
      expect(networkErrorEvent.tags?.category).toBe(ErrorTypes.ErrorCategory.NETWORK);
    }
    
    if (authErrorEvent) {
      expect(authErrorEvent.tags?.category).toBe(ErrorTypes.ErrorCategory.AUTH);
    }
  });
});