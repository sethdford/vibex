/**
 * Error Handling Integration Tests
 * 
 * These tests verify the integration between different components of the error
 * handling system, ensuring they work together correctly.
 */

import { expect, jest, test, describe } from '@jest/globals';
import { analyzeError } from './analyzer.js';
import { createUserError } from './formatter.js';
import { UserError, ErrorCategory, ErrorLevel } from './types.js';

// Import the Client for integration testing with error system
import { UnifiedClaudeClient } from '../ai/unified-client.js';

// Mock the client implementation
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: class MockAnthropic {
      messages = {
        create: jest.fn()
      };
      
      constructor() {
        // Pre-configure mock responses
        this.messages.create.mockImplementation((options: any) => {
          if (options.model && options.model.includes('invalid-model')) {
            throw new Error('400 Bad Request: Model not found');
          } else if (options.model && options.model.includes('rate-limit')) {
            const error = new Error('429 Too Many Requests') as Error & { status?: number };
            error.status = 429;
            throw error;
          } else if (options.model && options.model.includes('server-error')) {
            const error = new Error('500 Internal Server Error') as Error & { status?: number };
            error.status = 500;
            throw error;
          } else if (options.model && options.model.includes('timeout')) {
            throw new Error('Request timed out after 60000ms');
          } else if (options.model && options.model.includes('auth-error')) {
            throw new Error('401 Unauthorized: Invalid API key');
          } else {
            // Success case
            return {
              id: 'msg_123',
              content: [{ type: 'text', text: 'Hello, world!' }],
              role: 'assistant',
              type: 'message',
              usage: { input_tokens: 10, output_tokens: 20 }
            };
          }
        });
      }
    }
  };
});

describe('Error handling integration', () => {
  // Mock config for client
  const mockConfig = {
    api: {
      baseUrl: 'https://api.anthropic.com',
      timeout: 60000
    },
    auth: {
      maxRetryAttempts: 2
    },
    ai: {
      model: 'claude-test',
      maxTokens: 1000,
      temperature: 0.7
    }
  };
  
  describe('Unified client with error handling', () => {
    test('handles API errors correctly', async () => {
      const client = new UnifiedClaudeClient({ 
        apiKey: 'test-key',
        config: mockConfig as any
      });
      
      try {
        await client.query('Test message', { model: 'invalid-model' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UserError);
        expect((error as UserError).category).toBe(ErrorCategory.VALIDATION);
      }
    });
    
    test('handles rate limit errors correctly', async () => {
      const client = new UnifiedClaudeClient({ 
        apiKey: 'test-key',
        config: mockConfig as any
      });
      
      try {
        await client.query('Test message', { model: 'rate-limit-model', retry: false });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UserError);
        expect((error as UserError).category).toBe(ErrorCategory.RATE_LIMIT);
        expect((error as UserError).resolution).toBeDefined();
      }
    });
    
    test('handles authentication errors correctly', async () => {
      const client = new UnifiedClaudeClient({ 
        apiKey: 'invalid-key',
        config: mockConfig as any
      });
      
      try {
        await client.query('Test message', { model: 'auth-error-model', retry: false });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UserError);
        expect((error as UserError).category).toBe(ErrorCategory.AUTHENTICATION);
      }
    });
    
    test('analyzes and categorizes different error types correctly', () => {
      // Test different error scenarios
      const errors = [
        { error: new Error('Network error: connection refused'), category: ErrorCategory.NETWORK },
        { error: new Error('429 Too Many Requests'), category: ErrorCategory.RATE_LIMIT },
        { error: new Error('401 Unauthorized'), category: ErrorCategory.AUTHENTICATION },
        { error: new Error('403 Forbidden'), category: ErrorCategory.AUTHORIZATION },
        { error: new Error('500 Server Error'), category: ErrorCategory.SERVER },
        { error: new Error('Request timed out'), category: ErrorCategory.TIMEOUT },
        { error: new Error('File not found'), category: ErrorCategory.FILE_NOT_FOUND },
        { error: new Error('Permission denied when accessing file'), category: ErrorCategory.FILE_ACCESS },
      ];
      
      for (const { error, category } of errors) {
        const analysis = analyzeError(error, 'Test operation');
        expect(analysis.category).toBe(category);
        expect(analysis.resolution).toBeDefined();
      }
    });
    
    test('error formatter creates proper UserError with analysis data', () => {
      const originalError = new Error('Service unavailable');
      const analysis = analyzeError(originalError, 'API request');
      
      const userError = createUserError(`API request failed: ${analysis.message}`, {
        category: analysis.category,
        level: analysis.level,
        resolution: analysis.resolution,
        cause: originalError
      });
      
      expect(userError).toBeInstanceOf(UserError);
      expect(userError.message).toContain('Service unavailable');
      expect(userError.resolution).toBeDefined();
      expect(userError.cause).toBe(originalError);
    });
  });
});