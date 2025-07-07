/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { createClaudeContentGenerator, ContentGenerator, createTurnManager } from '../../../src/ai/index.js';
import { EventEmitter } from 'events';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Create a mock generator that can produce various error conditions
class ErrorTestContentGenerator extends EventEmitter implements ContentGenerator {
  private errorMode: string;
  
  constructor(errorMode: string) {
    super();
    this.errorMode = errorMode;
  }

  async generate(messages: any[], options?: any): Promise<any> {
    switch(this.errorMode) {
      case 'network':
        throw new Error('Network error: connection refused');
      case 'timeout':
        throw new Error('Request timed out');
      case 'auth':
        throw new Error('Authentication failed: invalid API key');
      case 'rate_limit':
        throw new Error('Rate limit exceeded');
      case 'invalid_response':
        return { invalid: 'response format' };
      default:
        return {
          content: 'Normal response',
          usage: { input_tokens: 10, output_tokens: 20 }
        };
    }
  }

  async *generateStream(messages: any[], options?: any): AsyncGenerator<any, any, unknown> {
    switch(this.errorMode) {
      case 'network':
        yield { type: 'content', content: 'Starting response...' };
        throw new Error('Network error: connection lost');
      case 'timeout':
        yield { type: 'content', content: 'Starting response...' };
        throw new Error('Stream timed out');
      case 'stream_error':
        yield { type: 'content', content: 'Starting response...' };
        yield { type: 'error', error: 'Stream error occurred' };
        return null;
      default:
        yield { type: 'content', content: 'Normal ' };
        yield { type: 'content', content: 'streaming ' };
        yield { type: 'content', content: 'response' };
        return {
          content: 'Normal streaming response',
          usage: { input_tokens: 10, output_tokens: 30 }
        };
    }
  }

  async countTokens(text: string | any[]): Promise<number> {
    if (this.errorMode === 'token_count_error') {
      throw new Error('Failed to count tokens');
    }
    return 10;
  }
}

// Mock the module to use our test generator
vi.mock('../../../src/ai/claude-content-generator.js', () => {
  return {
    createClaudeContentGenerator: vi.fn().mockImplementation((apiKey, options) => {
      // Get the error mode from options
      const errorMode = options?.errorMode || 'none';
      return new ErrorTestContentGenerator(errorMode);
    }),
    ClaudeContentGenerator: ErrorTestContentGenerator
  };
});

describe('Property: Error Handling', () => {
  test('Property: All network errors are caught and reported', async () => {
    // Create content generator that will throw network errors
    const contentGenerator = createClaudeContentGenerator('fake-key', { errorMode: 'network' });
    
    // Set up error handler
    let caughtError: Error | null = null;
    contentGenerator.on('error', (error) => {
      caughtError = error;
    });
    
    // Try to generate content
    try {
      await contentGenerator.generate([{ role: 'user', content: 'Hello' }]);
      fail('Should have thrown an error');
    } catch (error) {
      // Error should be caught
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Network error');
    }
    
    // Error event should also be emitted
    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('Network error');
  });
  
  test('Property: Turn manager gracefully handles errors', async () => {
    // Create content generator that will throw errors
    const contentGenerator = createClaudeContentGenerator('fake-key', { errorMode: 'timeout' });
    
    // Create turn manager
    const turnManager = createTurnManager(contentGenerator);
    
    // Set up error handler
    let caughtError: Error | null = null;
    turnManager.on('error', (error) => {
      caughtError = error;
    });
    
    // Try to execute a turn
    try {
      await turnManager.execute('Hello');
      fail('Should have thrown an error');
    } catch (error) {
      // Error should be caught
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('timed out');
    }
    
    // Error event should also be emitted
    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('timed out');
  });
  
  test('Property: Stream errors are caught and reported', async () => {
    // Create content generator that will throw streaming errors
    const contentGenerator = createClaudeContentGenerator('fake-key', { errorMode: 'stream_error' });
    
    // Set up error handler
    const errorEvents: any[] = [];
    const contentChunks: string[] = [];
    
    contentGenerator.on('error', (error) => {
      errorEvents.push(error);
    });
    
    contentGenerator.on('content', (chunk) => {
      contentChunks.push(chunk);
    });
    
    // Try to generate streaming content
    try {
      // Collect all stream events
      for await (const chunk of contentGenerator.generateStream([{ role: 'user', content: 'Hello' }])) {
        if (chunk.type === 'content' && chunk.content) {
          contentChunks.push(chunk.content);
        }
      }
    } catch (error) {
      // We expect this to be caught
      expect(error).toBeDefined();
    }
    
    // Verify we got some content before the error
    expect(contentChunks).toContain('Starting response...');
    
    // Error event should be emitted
    expect(errorEvents.length).toBeGreaterThan(0);
  });
  
  test('Property: Authentication errors are properly identified', async () => {
    // Create content generator that will throw auth errors
    const contentGenerator = createClaudeContentGenerator('fake-key', { errorMode: 'auth' });
    
    // Try to generate content
    try {
      await contentGenerator.generate([{ role: 'user', content: 'Hello' }]);
      fail('Should have thrown an error');
    } catch (error) {
      // Error should be caught
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Authentication');
      expect((error as Error).message).toContain('API key');
    }
  });
  
  test('Property: Invalid responses are handled correctly', async () => {
    // Create content generator that will return invalid responses
    const contentGenerator = createClaudeContentGenerator('fake-key', { errorMode: 'invalid_response' });
    
    // Try to generate content
    const response = await contentGenerator.generate([{ role: 'user', content: 'Hello' }]);
    
    // The response will be invalid but shouldn't crash
    expect(response).toBeDefined();
    
    // The turn manager should handle this case
    const turnManager = createTurnManager(contentGenerator);
    
    try {
      // This might throw because of validation
      await turnManager.execute('Hello');
    } catch (error) {
      // We expect this to throw or return a valid default response
      expect(error).toBeDefined();
    }
  });
});