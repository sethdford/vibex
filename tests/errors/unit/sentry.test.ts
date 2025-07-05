/**
 * Unit tests for Sentry error reporting module
 */

import { jest } from '@jest/globals';
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

describe('Sentry Error Reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reportErrorToSentry', () => {
    test('should log error message for Error objects', () => {
      const error = new Error('Test error');
      reportErrorToSentry(error);
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', 
        expect.objectContaining({ error: 'Test error' })
      );
    });
    
    test('should log string representation for non-Error objects', () => {
      reportErrorToSentry('String error');
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', 
        expect.objectContaining({ error: 'String error' })
      );
    });
    
    test('should include level in debug log if provided', () => {
      reportErrorToSentry(new Error('Level test'), { level: 'fatal' });
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', 
        expect.objectContaining({ level: 'fatal' })
      );
    });
    
    test('should include tags in debug log if provided', () => {
      const tags = { 
        module: 'auth', 
        environment: 'production'
      };
      
      reportErrorToSentry(new Error('Tags test'), { tags });
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', 
        expect.objectContaining({ tags })
      );
    });
    
    test('should sanitize user information in debug log', () => {
      const user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };
      
      reportErrorToSentry(new Error('User test'), { user });
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', 
        expect.objectContaining({ 
          user: {
            id: '***',
            username: '***',
            email: '***'
          }
        })
      );
    });
    
    test('should handle undefined user properties', () => {
      const user = {
        id: undefined,
        username: 'testuser',
        email: undefined
      };
      
      reportErrorToSentry(new Error('User test with undefined'), { user });
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', 
        expect.objectContaining({ 
          user: {
            id: undefined,
            username: '***',
            email: undefined
          }
        })
      );
    });
    
    test('should handle complex error objects', () => {
      const complexError = {
        message: 'Complex error',
        code: 'ERR_COMPLEX',
        details: {
          timestamp: Date.now(),
          requestId: 'req123'
        }
      };
      
      reportErrorToSentry(complexError);
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Would report error to Sentry:', 
        expect.objectContaining({ 
          error: expect.stringContaining('[object Object]') 
        })
      );
    });
  });
});