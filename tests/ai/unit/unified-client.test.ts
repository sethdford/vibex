/**
 * Unified Claude Client Tests
 * 
 * Tests for the UnifiedClaudeClient class, focusing on API interaction and retry mechanisms
 */

import { expect, jest, test, describe, beforeEach } from '@jest/globals';
import { UnifiedClaudeClient, createUnifiedClient } from '../../src/ai/unified-client.js';
import { EventEmitter } from 'events';

// Mock the Anthropic client
const mockCreateFn = jest.fn();
const mockClient = {
  messages: {
    create: mockCreateFn
  }
};

// Mock the retry module
jest.mock('../../src/utils/retry.js', () => {
  return {
    retry: jest.fn().mockImplementation(async (fn) => fn()),
  };
});

// Import the mocked retry function
import { retry } from '../../src/utils/retry.js';

describe('UnifiedClaudeClient', () => {
  let client: UnifiedClaudeClient;
  let mockConfig: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock config
    mockConfig = {
      api: {
        baseUrl: 'https://test-api.anthropic.com',
        timeout: 30000,
      },
      auth: {
        maxRetryAttempts: 3
      },
      ai: {
        model: 'claude-3-test-model',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: 'You are a test assistant'
      }
    };
    
    // Create the client with mocked internals
    client = createUnifiedClient('test-api-key', mockConfig);
    
    // Replace the Anthropic client with our mock
    (client as any).client = mockClient;
  });
  
  describe('queryStream method', () => {
    let mockStream: EventEmitter;
    let streamEvents: any[] = [];
    
    beforeEach(() => {
      // Create a mock stream that extends EventEmitter
      mockStream = new EventEmitter();
      
      // Make it iterable with for-await-of
      mockStream[Symbol.asyncIterator] = function() {
        return {
          events: streamEvents,
          eventIndex: 0,
          async next() {
            if (this.eventIndex < this.events.length) {
              return { 
                done: false, 
                value: this.events[this.eventIndex++] 
              };
            }
            return { done: true };
          }
        };
      };
      
      // Mock the create method to return our controllable stream
      mockCreateFn.mockReturnValue(mockStream);
    });
    
    test('should stream responses successfully', async () => {
      // Set up test events
      streamEvents = [
        { type: 'message_start', message: { id: '123', content: [], role: 'assistant', stop_reason: null, type: 'message' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' }, index: 0 },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ', ' }, index: 0 },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world!' }, index: 0 },
        { type: 'message_stop' }
      ];
      
      // Set up event listeners
      const onStart = jest.fn();
      const onText = jest.fn();
      const onEnd = jest.fn();
      
      client.on('start', onStart);
      client.on('content', onText);
      client.on('end', onEnd);
      
      // Call queryStream
      await client.queryStream('Test prompt');
      
      // Verify correct API call
      expect(mockCreateFn).toHaveBeenCalledWith({
        model: 'claude-3-test-model',
        messages: [{ role: 'user', content: 'Test prompt' }],
        system: 'You are a test assistant',
        max_tokens: 2000,
        temperature: 0.7,
        stream: true
      });
      
      // Verify events fired correctly
      expect(onStart).toHaveBeenCalledWith({ model: 'claude-3-test-model' });
      expect(onText).toHaveBeenCalledTimes(3);
      expect(onText).toHaveBeenCalledWith('Hello');
      expect(onText).toHaveBeenCalledWith(', ');
      expect(onText).toHaveBeenCalledWith('world!');
      expect(onEnd).toHaveBeenCalledTimes(1);
    });
    
    test('should use retry mechanism for transient errors', async () => {
      // Setup mock retry to simulate success after retry
      (retry as jest.Mock).mockImplementationOnce(async (fn) => {
        // First call fails, second succeeds
        if ((retry as jest.Mock).mock.calls.length === 1) {
          throw new Error('Network error');
        }
        return mockStream;
      });
      
      // Set up test events
      streamEvents = [
        { type: 'message_start', message: { id: '123', content: [], role: 'assistant' } },
        { type: 'message_stop' }
      ];
      
      // Set up event listeners
      const onRetry = jest.fn();
      client.on('retry', onRetry);
      
      // Should throw on first attempt
      await expect(client.queryStream('Test prompt')).rejects.toThrow();
      
      // Retry should have been called
      expect(retry).toHaveBeenCalled();
      
      // Reset mock and try again - this time it should succeed
      (retry as jest.Mock).mockImplementationOnce(async (fn) => fn());
      await client.queryStream('Test prompt');
      
      // Verify API was called twice
      expect(mockCreateFn).toHaveBeenCalledTimes(2);
    });
    
    test('should emit error events', async () => {
      // Make the stream throw an error
      mockCreateFn.mockImplementationOnce(() => {
        throw new Error('API rate limit exceeded');
      });
      
      // Set up event listeners
      const onError = jest.fn();
      client.on('error', onError);
      
      // Call should throw
      await expect(client.queryStream('Test prompt')).rejects.toThrow();
      
      // Error handler should be called
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('API rate limit exceeded')
        })
      );
    });
    
    test('should respect retry options from parameters', async () => {
      // Call queryStream with custom retry options
      await client.queryStream('Test prompt', {
        retry: {
          maxRetries: 5,
          initialDelayMs: 100
        }
      });
      
      // Check that retry was called with merged options
      expect(retry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          maxRetries: 5,
          initialDelayMs: 100,
          maxDelayMs: 15000, // Default value
        })
      );
    });
    
    test('should skip retry if retry parameter is false', async () => {
      // Call queryStream with retry disabled
      await client.queryStream('Test prompt', {
        retry: false
      });
      
      // Check that retry was not used
      expect(retry).not.toHaveBeenCalled();
      expect(mockCreateFn).toHaveBeenCalledTimes(1);
    });
  });
});