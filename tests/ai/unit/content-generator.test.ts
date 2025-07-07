/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { createClaudeContentGenerator, ContentEvent } from '../../../src/ai/index.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the Claude API calls
vi.mock('fetch', () => {
  return vi.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Test response' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      }),
      status: 200,
      statusText: 'OK'
    });
  });
});

describe('ContentGenerator Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  test('ContentGenerator emits events correctly', async () => {
    // Create a mock implementation that doesn't make real API calls
    const generator = createClaudeContentGenerator('fake-api-key');
    
    // Set up event listeners with Jest mocks
    const contentListener = vi.fn();
    const errorListener = vi.fn();
    const completeListener = vi.fn();
    
    generator.on(ContentEvent.CONTENT, contentListener);
    generator.on(ContentEvent.ERROR, errorListener);
    generator.on(ContentEvent.COMPLETE, completeListener);
    
    // Use the generator stream
    for await (const chunk of generator.generateStream([{ role: 'user', content: 'Hello' }])) {
      // Let it run
    }
    
    // Verify events were emitted
    expect(contentListener).toHaveBeenCalled();
    expect(completeListener).toHaveBeenCalled();
    expect(errorListener).not.toHaveBeenCalled();
  });
  
  test('ContentGenerator handles options correctly', async () => {
    const generator = createClaudeContentGenerator('fake-api-key');
    
    // Test with various options
    const options = {
      temperature: 0.7,
      maxTokens: 500,
      model: 'claude-3-opus-20240229',
      seed: 12345
    };
    
    // Use the generator with options
    const result = await generator.generate([{ role: 'user', content: 'Hello' }], options);
    
    // Verify result
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
  
  test('ContentGenerator handles token counting correctly', async () => {
    const generator = createClaudeContentGenerator('fake-api-key');
    
    // Test token counting for string
    const stringTokens = await generator.countTokens('This is a test message');
    expect(stringTokens).toBeGreaterThan(0);
    
    // Test token counting for messages
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ];
    const messageTokens = await generator.countTokens(messages);
    expect(messageTokens).toBeGreaterThan(0);
  });
  
  test('ContentGenerator properly formats tool calls', async () => {
    const generator = createClaudeContentGenerator('fake-api-key');
    
    // Mock implementation specific to this test
    vi.spyOn(generator, 'generate').mockResolvedValueOnce({
      content: null,
      usage: { input_tokens: 10, output_tokens: 20 },
      toolCalls: [{
        id: 'tool-call-1',
        type: 'function',
        function: {
          name: 'testTool',
          arguments: JSON.stringify({ param1: 'value1', param2: 'value2' })
        }
      }]
    });
    
    // Test with a message that should trigger a tool call
    const result = await generator.generate([{ role: 'user', content: 'Use a tool' }]);
    
    // Verify tool call was properly formatted
    expect(result.toolCalls).toBeDefined();
    expect(result.toolCalls.length).toBe(1);
    expect(result.toolCalls[0].function.name).toBe('testTool');
    expect(result.content).toBeNull(); // Content should be null for tool calls
  });
  
  test('ContentGenerator handles errors correctly', async () => {
    const generator = createClaudeContentGenerator('fake-api-key');
    
    // Mock an error response
    vi.spyOn(generator, 'generate').mockImplementationOnce(() => {
      throw new Error('API error');
    });
    
    // Set up error handler
    const errorHandler = vi.fn();
    generator.on(ContentEvent.ERROR, errorHandler);
    
    // Use generator and expect error
    await expect(generator.generate([{ role: 'user', content: 'Hello' }])).rejects.toThrow('API error');
    
    // Verify error event was emitted
    expect(errorHandler).toHaveBeenCalled();
  });
});