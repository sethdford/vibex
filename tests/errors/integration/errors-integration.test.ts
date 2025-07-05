/**
 * Integration tests for error handling system
 */

import { jest } from '@jest/globals';
import { 
  UserError, 
  ErrorCategory, 
  NetworkError,
  AuthenticationError,
  formatErrorForDisplay,
  createUserError
} from '../../../src/errors/index.js';
import { analyzeError, getResolutionSteps } from '../../../src/errors/analyzer.js';
import { reportErrorToSentry } from '../../../src/errors/sentry.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Define ErrorLevel enum for tests
// This is needed since we can't directly access the enum from the types module
enum ErrorLevel {
  CRITICAL = 0,
  MAJOR = 1,
  MINOR = 2,
  INFORMATIONAL = 3,
}

describe('Error System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-end error flow', () => {
    test('should correctly process network errors through the system', () => {
      // Simulated network error
      const originalError = new Error('Connection refused');
      
      // Step 1: Analyze the error
      const analysis = analyzeError(originalError, 'API request');
      
      // Step 2: Create a UserError with the analysis
      const userError = createUserError(`API request failed: ${analysis.message}`, {
        category: analysis.category,
        level: analysis.level,
        resolution: analysis.resolution,
        cause: originalError
      });
      
      // Step 3: Format the error for display
      const formattedError = formatErrorForDisplay(userError);
      
      // Step 4: Report the error
      reportErrorToSentry(userError);
      
      // Verify the complete flow
      expect(analysis.category).toBe(ErrorCategory.NETWORK);
      expect(userError).toBeInstanceOf(UserError);
      expect(userError.category).toBe(ErrorCategory.NETWORK);
      expect(userError.cause).toBe(originalError);
      expect(formattedError).toContain('API request failed: Connection refused');
      expect(formattedError).toContain('To resolve this:');
      
      // Verify reporting
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', expect.any(Object));
    });
    
    test('should correctly process authentication errors through the system', () => {
      // Reset mocks to ensure clean state
      jest.clearAllMocks();
      
      // Simulated authentication error
      const originalError = new Error('401 Unauthorized: Invalid API key');
      
      // Step 1: Analyze the error
      const analysis = analyzeError(originalError, 'Authentication');
      
      // Step 2: Create a specialized error with the analysis
      const authError = new AuthenticationError(`Authentication failed: ${analysis.message}`, {
        level: analysis.level,
        resolution: analysis.resolution,
        cause: originalError
      });
      
      // Step 3: Format the error for display
      const formattedError = formatErrorForDisplay(authError);
      
      // Step 4: Report the error
      reportErrorToSentry(authError);
      
      // Verify the complete flow
      expect(analysis.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(authError).toBeInstanceOf(AuthenticationError);
      expect(authError).toBeInstanceOf(UserError);
      expect(authError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(formattedError).toContain('Authentication failed: 401 Unauthorized: Invalid API key');
      expect(formattedError).toContain('To resolve this:');
    });
    
    test('should handle unknown errors properly through the system', () => {
      // Unusual error type
      const unusualError = { 
        customErrorType: true, 
        reason: 'Something went wrong'
      };
      
      // Step 1: Analyze the error
      const analysis = analyzeError(unusualError, 'Unknown operation');
      
      // Step 2: Create a UserError with the analysis
      const userError = createUserError(`Operation failed`, {
        category: analysis.category,
        level: analysis.level,
        resolution: getResolutionSteps(analysis.category),
        cause: unusualError,
        details: analysis.details
      });
      
      // Step 3: Format the error for display
      const formattedError = formatErrorForDisplay(userError);
      
      // Verify the complete flow
      expect(analysis.category).toBe(ErrorCategory.UNKNOWN);
      expect(userError).toBeInstanceOf(UserError);
      expect(userError.cause).toBe(unusualError);
      expect(formattedError).toContain('Error: Operation failed');
    });
    
    test('should handle errors with resolution steps properly', () => {
      // Get resolution steps for a specific category
      const networkResolutionSteps = getResolutionSteps(ErrorCategory.NETWORK);
      
      // Create a NetworkError with these steps
      const networkError = new NetworkError('Connection timed out', {
        resolution: networkResolutionSteps
      });
      
      // Format the error
      const formatted = formatErrorForDisplay(networkError);
      
      // Verify resolution steps are included in the formatted message
      expect(formatted).toContain('Error: Connection timed out');
      expect(formatted).toContain('To resolve this:');
      
      // Each resolution step should be present with a bullet point
      networkResolutionSteps.forEach(step => {
        expect(formatted).toContain(`• ${step}`);
      });
    });
  });
  
  describe('Error transformation flow', () => {
    test('should transform API errors to user-friendly messages', () => {
      // Simulated API response error
      const apiError = {
        error: {
          message: 'Invalid API key',
          code: 'invalid_api_key'
        },
        status: 401
      };
      
      // Analyze and transform the error
      const analysis = analyzeError(apiError, 'API Request');
      
      // Create a user-friendly error
      const userError = createUserError('Authentication failed', {
        category: analysis.category,
        level: analysis.level,
        resolution: analysis.resolution,
        details: analysis.details
      });
      
      // Format the error for display
      const formatted = formatErrorForDisplay(userError);
      
      // Verify transformation
      expect(analysis.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(formatted).toContain('Error: Authentication failed');
      expect(formatted).toContain('To resolve this:');
    });
    
    test('should handle error hierarchies correctly', () => {
      // Create a chain of errors
      const rootCause = new Error('DNS resolution failed');
      const networkError = new NetworkError('Connection failed', { cause: rootCause });
      const applicationError = new UserError('Operation failed', { 
        cause: networkError, 
        category: ErrorCategory.APPLICATION,
        level: ErrorLevel.CRITICAL,
        resolution: 'Please try again later'
      });
      
      // Format the top-level error
      const formatted = formatErrorForDisplay(applicationError);
      
      // Verify error information
      expect(formatted).toContain('Error: Operation failed');
      expect(formatted).toContain('Please try again later');
      expect(applicationError.cause).toBe(networkError);
      expect(networkError.cause).toBe(rootCause);
      
      // Analyze the cause chain
      const analysis = analyzeError(applicationError.cause, 'Operation');
      expect(analysis.category).toBe(ErrorCategory.NETWORK);
    });
  });
});