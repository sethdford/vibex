/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Error Analyzer Tests
 * 
 * Tests for the error analysis and categorization system
 */

import { expect, jest, test, describe } from 'vitest';
import { analyzeError, getResolutionSteps } from './analyzer.js';
import { ErrorCategory, ErrorLevel } from './types.js';

describe('Error Analyzer', () => {
  describe('analyzeError function', () => {
    test('should categorize network errors correctly', () => {
      const networkError = new Error('Network connection failed');
      const result = analyzeError(networkError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.level).toBe(ErrorLevel.MAJOR);
      expect(result.message).toBe('Network connection failed');
      expect(result.resolution).toBeDefined();
    });
    
    test('should categorize rate limit errors correctly', () => {
      const rateLimitError = new Error('429 Too Many Requests: rate limit exceeded');
      const result = analyzeError(rateLimitError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.level).toBe(ErrorLevel.MAJOR);
      expect(result.message).toBe('429 Too Many Requests: rate limit exceeded');
      expect(result.resolution).toContain('rate limit');
    });
    
    test('should categorize authentication errors correctly', () => {
      const authError = new Error('401 Unauthorized: invalid API key provided');
      const result = analyzeError(authError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.level).toBe(ErrorLevel.MAJOR);
      expect(result.message).toBe('401 Unauthorized: invalid API key provided');
      expect(result.resolution).toContain('API key');
    });
    
    test('should categorize server errors correctly', () => {
      const serverError = new Error('500 Internal Server Error');
      const result = analyzeError(serverError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.SERVER);
      expect(result.level).toBe(ErrorLevel.MAJOR);
      expect(result.message).toBe('500 Internal Server Error');
      expect(result.resolution).toContain('server');
    });
    
    test('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timed out after 60000ms');
      const result = analyzeError(timeoutError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.level).toBe(ErrorLevel.MAJOR);
      expect(result.message).toBe('Request timed out after 60000ms');
      expect(result.resolution).toContain('timed out');
    });
    
    test('should categorize content filtering errors correctly', () => {
      const filterError = new Error('content was blocked due to content policy violations');
      const result = analyzeError(filterError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.API);
      expect(result.level).toBe(ErrorLevel.MAJOR);
      expect(result.message).toBe('content was blocked due to content policy violations');
      expect(result.resolution).toContain('content policy');
    });
    
    test('should handle complex error objects with nested details', () => {
      const complexError = {
        error: {
          message: 'Invalid request parameters',
          type: 'validation_error',
          code: 'invalid_param',
          param: 'model'
        },
        status: 400,
        statusCode: 400
      };
      
      const result = analyzeError(complexError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.details).toBeDefined();
      expect(result.details?.status).toBe(400);
    });
    
    test('should handle Anthropic-specific error patterns', () => {
      const anthropicError = {
        type: 'overloaded',
        detail: 'model is currently overloaded',
        status: 529
      };
      
      const result = analyzeError(anthropicError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.message).toContain('overloaded');
      expect(result.resolution).toContain('overloaded');
    });
    
    test('should default to UNKNOWN category for unrecognized errors', () => {
      const unknownError = new Error('Some completely unknown error type');
      const result = analyzeError(unknownError, 'API request');
      
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.level).toBe(ErrorLevel.MINOR);
      expect(result.message).toBe('Some completely unknown error type');
    });
    
    test('should handle non-error values gracefully', () => {
      // Test with non-Error primitive values
      const nullResult = analyzeError(null, 'API request');
      expect(nullResult.message).toBe('Error during API request');
      
      const stringResult = analyzeError('raw error string', 'API request');
      expect(stringResult.message).toBe('raw error string');
      
      const numberResult = analyzeError(404, 'API request');
      expect(numberResult.message).toBe('404');
    });
  });
  
  describe('getResolutionSteps function', () => {
    test('should return resolution steps for various categories', () => {
      expect(getResolutionSteps(ErrorCategory.AUTHENTICATION)).toBeInstanceOf(Array);
      expect(getResolutionSteps(ErrorCategory.RATE_LIMIT)).toBeInstanceOf(Array);
      expect(getResolutionSteps(ErrorCategory.NETWORK)).toBeInstanceOf(Array);
      expect(getResolutionSteps(ErrorCategory.SERVER)).toBeInstanceOf(Array);
      expect(getResolutionSteps(ErrorCategory.API)).toBeInstanceOf(Array);
    });
    
    test('should return default steps for unknown categories', () => {
      const steps = getResolutionSteps(ErrorCategory.UNKNOWN);
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
    });
  });
});