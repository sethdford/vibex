/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for error formatter module
 */

import { jest } from 'vitest';
import { 
  createUserError, 
  formatErrorForDisplay, 
  ensureUserError, 
  getErrorCategoryName, 
  getErrorLevelName, 
  getErrorDetails 
} from '../../../src/errors/formatter.js';
import { UserError, ErrorCategory, ErrorLevel } from '../../../src/errors/types.js';

// Mock dependencies
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../src/utils/formatting.js', () => ({
  getErrorDetails: vi.fn().mockImplementation(() => 'Formatted error details'),
  wordWrap: vi.fn().mockImplementation((text) => text),
  indent: vi.fn().mockImplementation((text) => text)
}));

describe('Error Formatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserError', () => {
    test('should create a UserError with default options', () => {
      const error = createUserError('Test error');
      
      expect(error).toBeInstanceOf(UserError);
      expect(error.message).toBe('Test error');
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.level).toBe(ErrorLevel.MINOR);
      
      // Verify logging
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.warn).toHaveBeenCalledWith('User error: Test error', expect.any(Object));
    });
    
    test('should create a UserError with custom options', () => {
      const options = {
        category: ErrorCategory.NETWORK,
        level: ErrorLevel.MAJOR,
        resolution: 'Check your network connection',
        details: { statusCode: 404 },
        code: 'ERR_NETWORK'
      };
      
      const error = createUserError('Network error', options);
      
      expect(error).toBeInstanceOf(UserError);
      expect(error.message).toBe('Network error');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.level).toBe(ErrorLevel.MAJOR);
      expect(error.resolution).toBe('Check your network connection');
      expect(error.details).toEqual({ statusCode: 404 });
      expect(error.code).toBe('ERR_NETWORK');
    });
    
    test('should create a UserError with cause', () => {
      const cause = new Error('Original error');
      const error = createUserError('Wrapped error', { cause });
      
      expect(error).toBeInstanceOf(UserError);
      expect(error.message).toBe('Wrapped error');
      expect(error.cause).toBe(cause);
    });
  });
  
  describe('formatErrorForDisplay', () => {
    test('should format UserError properly', () => {
      const userError = new UserError('User error message', {
        category: ErrorCategory.AUTHENTICATION,
        resolution: ['Check your API key', 'Verify your credentials']
      });
      
      const formatted = formatErrorForDisplay(userError);
      
      expect(formatted).toContain('Error: User error message');
      expect(formatted).toContain('To resolve this:');
      expect(formatted).toContain('• Check your API key');
      expect(formatted).toContain('• Verify your credentials');
    });
    
    test('should format UserError with details', () => {
      const userError = new UserError('Error with details', {
        details: {
          statusCode: 401,
          timestamp: '2023-01-01'
        }
      });
      
      const formatted = formatErrorForDisplay(userError);
      
      expect(formatted).toContain('Error: Error with details');
      expect(formatted).toContain('Details:');
      expect(formatted).toContain('statusCode: 401');
      expect(formatted).toContain('timestamp: 2023-01-01');
    });
    
    test('should format standard Error properly', () => {
      const standardError = new Error('Standard error message');
      const formatted = formatErrorForDisplay(standardError);
      
      expect(formatted).toContain('System error: Standard error message');
    });
    
    test('should include stack trace when DEBUG is true', () => {
      const originalEnv = process.env.DEBUG;
      process.env.DEBUG = 'true';
      
      const error = new Error('Debug error');
      error.stack = 'Mock stack trace';
      
      const formatted = formatErrorForDisplay(error);
      
      expect(formatted).toContain('System error: Debug error');
      expect(formatted).toContain('Stack trace:');
      expect(formatted).toContain('Mock stack trace');
      
      // Restore original env
      process.env.DEBUG = originalEnv;
    });
    
    test('should handle non-Error objects', () => {
      const result1 = formatErrorForDisplay('String error');
      expect(result1).toContain('Unknown error: String error');
      
      const result2 = formatErrorForDisplay(404);
      expect(result2).toContain('Unknown error: 404');
      
      const result3 = formatErrorForDisplay({ message: 'Object with message' });
      expect(result3).toContain('Unknown error: [object Object]');
    });
  });
  
  describe('ensureUserError', () => {
    test('should return the error if already a UserError', () => {
      const userError = new UserError('Already a user error');
      const result = ensureUserError(userError);
      
      expect(result).toBe(userError);
    });
    
    test('should convert Error to UserError', () => {
      const error = new Error('Standard error');
      const result = ensureUserError(error);
      
      expect(result).toBeInstanceOf(UserError);
      expect(result.message).toBe('Standard error');
      expect(result.cause).toBe(error);
    });
    
    test('should convert string to UserError', () => {
      const result = ensureUserError('String error message');
      
      expect(result).toBeInstanceOf(UserError);
      expect(result.message).toBe('String error message');
    });
    
    test('should use default message for non-string/error inputs', () => {
      const result = ensureUserError(null, 'Default message');
      
      expect(result).toBeInstanceOf(UserError);
      expect(result.message).toBe('Default message');
    });
    
    test('should pass options to created UserError', () => {
      const options = {
        category: ErrorCategory.NETWORK,
        level: ErrorLevel.MAJOR
      };
      
      const result = ensureUserError('Error with options', 'Default', options);
      
      expect(result).toBeInstanceOf(UserError);
      expect(result.message).toBe('Error with options');
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.level).toBe(ErrorLevel.MAJOR);
    });
  });
  
  describe('getErrorCategoryName', () => {
    test('should return correct category names', () => {
      expect(getErrorCategoryName(ErrorCategory.AUTHENTICATION)).toBe('AUTHENTICATION');
      expect(getErrorCategoryName(ErrorCategory.NETWORK)).toBe('NETWORK');
      expect(getErrorCategoryName(ErrorCategory.FILE_SYSTEM)).toBe('FILE_SYSTEM');
    });
    
    test('should handle invalid categories', () => {
      // @ts-ignore - Testing with invalid value
      expect(getErrorCategoryName(999)).toBe('Unknown');
    });
  });
  
  describe('getErrorLevelName', () => {
    test('should return correct level names', () => {
      expect(getErrorLevelName(ErrorLevel.CRITICAL)).toBe('CRITICAL');
      expect(getErrorLevelName(ErrorLevel.MAJOR)).toBe('MAJOR');
      expect(getErrorLevelName(ErrorLevel.MINOR)).toBe('MINOR');
      expect(getErrorLevelName(ErrorLevel.INFORMATIONAL)).toBe('INFORMATIONAL');
    });
    
    test('should handle invalid levels', () => {
      // @ts-ignore - Testing with invalid value
      expect(getErrorLevelName(999)).toBe('Unknown');
    });
  });
  
  describe('getErrorDetails', () => {
    test('should return formatted UserError details', () => {
      const userError = new UserError('User error details test');
      const result = getErrorDetails(userError);
      
      expect(result).toContain('Error: User error details test');
    });
    
    test('should return formatted standard Error details', () => {
      const error = new Error('Standard error details test');
      const result = getErrorDetails(error);
      
      expect(result).toContain('System error: Standard error details test');
    });
    
    test('should handle non-error values', () => {
      const result = getErrorDetails('String value');
      expect(result).toBe('String value');
    });
  });
});