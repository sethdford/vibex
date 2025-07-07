/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { initAI, resetAIClient } from '../../../src/ai/index.js';
import { UnifiedClaudeClient } from '../../../src/ai/unified-client.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the API calls
vi.mock('../../../src/ai/claude-content-generator.js', () => {
  const EventEmitter = require('events');
  
  class MockClaudeContentGenerator extends EventEmitter {
    generate = vi.fn().mockResolvedValue({
      content: 'Test response',
      usage: { input_tokens: 10, output_tokens: 20 }
    });
    
    generateStream = vi.fn(async function* () {
      yield { type: 'content', content: 'Test ' };
      yield { type: 'content', content: 'response' };
      return {
        content: 'Test response',
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

describe('E2E: Complete Query Flow', () => {
  beforeEach(() => {
    resetAIClient();
  });
  
  test('Basic query flow from initialization to response', async () => {
    // Initialize the AI client
    const client = await initAI();
    
    // Verify client was initialized properly
    expect(client).toBeInstanceOf(UnifiedClaudeClient);
    
    // Perform a query
    const response = await client.query('Hello, AI!');
    
    // Verify response
    expect(response).toBeDefined();
    expect(response.message).toBeDefined();
    expect(response.message.content).toBe('Test response');
  });
  
  test('Streaming query flow from initialization to completion', async () => {
    // Initialize the AI client
    const client = await initAI();
    
    // Set up content event handler
    const contentChunks: string[] = [];
    client.on('content', (chunk) => {
      contentChunks.push(chunk);
    });
    
    // Perform a streaming query
    const response = await client.queryStream('Hello, AI!');
    
    // Verify response
    expect(response).toBeDefined();
    expect(response.message).toBeDefined();
    expect(response.message.content).toBe('Test response');
    
    // Verify content was streamed
    expect(contentChunks).toEqual(['Test ', 'response']);
  });
});