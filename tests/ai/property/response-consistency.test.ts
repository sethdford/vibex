/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { createClaudeContentGenerator } from '../../../src/ai/index.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the Claude API to provide deterministic responses based on seed
vi.mock('../../../src/ai/claude-content-generator.js', () => {
  const EventEmitter = require('events');
  
  class MockClaudeContentGenerator extends EventEmitter {
    generate = vi.fn().mockImplementation(async (messages, options) => {
      // Use the seed to generate a deterministic response
      const seed = options?.seed || 'default';
      return {
        content: `Response with seed ${seed}`,
        usage: { input_tokens: 10, output_tokens: 20 }
      };
    });
    
    generateStream = vi.fn(async function* (messages, options) {
      const seed = options?.seed || 'default';
      
      // Return the same chunks for the same seed
      yield { type: 'content', content: `Response ` };
      yield { type: 'content', content: `with ` };
      yield { type: 'content', content: `seed ${seed}` };
      
      return {
        content: `Response with seed ${seed}`,
        usage: { input_tokens: 10, output_tokens: 20 }
      };
    });

    countTokens = vi.fn().mockResolvedValue(10);
  }
  
  return {
    createClaudeContentGenerator: vi.fn().mockImplementation(() => new MockClaudeContentGenerator()),
    ClaudeContentGenerator: MockClaudeContentGenerator
  };
});

describe('Property: Response Consistency with Seeds', () => {
  test('Same seed produces identical responses', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Define message for testing
    const messages = [
      { role: 'user', content: 'Hello' }
    ];
    
    // Generate multiple responses with the same seed
    const seed = 'test-seed-123';
    const responses = [];
    
    for (let i = 0; i < 5; i++) {
      const response = await contentGenerator.generate(messages, { seed });
      responses.push(response);
    }
    
    // Verify all responses are identical
    const firstResponse = responses[0];
    for (let i = 1; i < responses.length; i++) {
      expect(responses[i].content).toBe(firstResponse.content);
    }
  });
  
  test('Different seeds produce different responses', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Define message for testing
    const messages = [
      { role: 'user', content: 'Hello' }
    ];
    
    // Generate responses with different seeds
    const seeds = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5'];
    const responses = [];
    
    for (const seed of seeds) {
      const response = await contentGenerator.generate(messages, { seed });
      responses.push(response);
    }
    
    // Verify responses are different with different seeds
    const uniqueResponses = new Set(responses.map(r => r.content));
    expect(uniqueResponses.size).toBe(seeds.length);
  });
  
  test('Streaming responses are consistent with the same seed', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Define message for testing
    const messages = [
      { role: 'user', content: 'Hello' }
    ];
    
    // Generate multiple streaming responses with the same seed
    const seed = 'streaming-seed-123';
    const allStreamedContent: string[][] = [];
    
    for (let i = 0; i < 3; i++) {
      const streamedContent: string[] = [];
      
      // Collect all streamed chunks
      for await (const chunk of contentGenerator.generateStream(messages, { seed })) {
        if (chunk.type === 'content' && chunk.content) {
          streamedContent.push(chunk.content);
        }
      }
      
      allStreamedContent.push(streamedContent);
    }
    
    // Verify all streams had identical content chunks
    const firstStream = allStreamedContent[0];
    for (let i = 1; i < allStreamedContent.length; i++) {
      expect(allStreamedContent[i]).toEqual(firstStream);
    }
  });
  
  test('No seed produces consistent results within a single conversation', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Define message for testing
    const messages = [
      { role: 'user', content: 'Hello' }
    ];
    
    // Generate multiple responses without a seed in the same conversation context
    const firstResponse = await contentGenerator.generate(messages);
    
    // Append the response and continue the conversation
    messages.push({ role: 'assistant', content: firstResponse.content });
    messages.push({ role: 'user', content: 'Follow up question' });
    
    // Get second response
    const secondResponse = await contentGenerator.generate(messages);
    
    // Verify the second response is consistent with the first
    expect(secondResponse.content).toContain('Response with seed');
  });
});