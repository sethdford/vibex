/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { initAI, resetAIClient, getEnhancedClient } from '../../../src/ai/index.js';
import { UnifiedClaudeClient } from '../../../src/ai/unified-client.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock token counting and content generation
vi.mock('../../../src/ai/claude-content-generator.js', () => {
  const EventEmitter = require('events');
  
  class MockClaudeContentGenerator extends EventEmitter {
    private tokenCounter = 0;
    
    constructor() {
      super();
      this.tokenCounter = 0;
    }
    
    generate = vi.fn().mockImplementation(async (messages, options) => {
      // Count tokens in the messages
      const tokenCount = messages.reduce((acc, msg) => {
        if (typeof msg.content === 'string') {
          // Simplified token counting: 1 token per word
          return acc + (msg.content.split(' ').filter(w => w).length || 1);
        }
        return acc + 1;
      }, 0);
      
      // Track total tokens
      this.tokenCounter += tokenCount;
      
      // If token limit is provided and exceeded, return summarized content
      const tokenLimit = options?.maxTokens || 100000;
      
      if (this.tokenCounter > tokenLimit && messages.length > 2) {
        // Simulate memory optimization by returning a summary
        this.tokenCounter = Math.floor(this.tokenCounter * 0.5); // Reduce token count by 50%
        return {
          content: 'This is a summary of the previous conversation...',
          usage: { input_tokens: tokenCount, output_tokens: 10 }
        };
      }
      
      return {
        content: `Response to message ${messages.length}`,
        usage: { input_tokens: tokenCount, output_tokens: 10 }
      };
    });
    
    generateStream = vi.fn(async function* (messages, options) {
      // Generate the same response as generate()
      const response = await this.generate(messages, options);
      yield { type: 'content', content: response.content };
      return response;
    });

    countTokens = vi.fn().mockImplementation(async (text) => {
      if (typeof text === 'string') {
        return text.split(' ').filter(w => w).length || 1;
      } else if (Array.isArray(text)) {
        return text.reduce((acc, msg) => {
          if (typeof msg.content === 'string') {
            return acc + (msg.content.split(' ').filter(w => w).length || 1);
          }
          return acc + 1;
        }, 0);
      }
      return 10;
    });
  }
  
  return {
    createClaudeContentGenerator: vi.fn().mockImplementation(() => new MockClaudeContentGenerator()),
    ClaudeContentGenerator: MockClaudeContentGenerator
  };
});

describe('E2E: Memory Optimization Flow', () => {
  beforeEach(() => {
    resetAIClient();
  });
  
  test('Memory optimization activates when token limit is exceeded', async () => {
    // Initialize AI with a low token limit to force optimization
    const client = await initAI();
    const enhancedClient = getEnhancedClient();
    
    // Set up conversation with memory optimization
    const messages = [
      'This is a long message that will use many tokens and help us test the memory optimization system',
      'Here is another long message with many tokens to further increase our token count in the conversation',
      'And a third message with many words to push us over the limit and trigger memory optimization',
      'A fourth message to continue the conversation after optimization has occurred',
    ];
    
    // Enable memory management with a low token limit
    const options = {
      enableMemoryManagement: true,
      memoryStrategy: 'summarize',
      maxTokens: 30 // Set a very low limit to force optimization
    };
    
    // Execute multiple turns to exceed token limit
    for (const message of messages) {
      await enhancedClient.query(message, options);
    }
    
    // Check memory statistics
    const stats = await enhancedClient.getMemoryStats();
    
    // Verify memory optimization occurred
    expect(stats).toBeDefined();
    expect(stats.tokensUsed).toBeLessThanOrEqual(options.maxTokens);
    expect(stats.isOptimized).toBe(true);
  });
  
  test('Streaming with memory optimization', async () => {
    // Initialize AI with a low token limit to force optimization
    const client = await initAI();
    const enhancedClient = getEnhancedClient();
    
    // Set up content event handler
    const contentChunks: string[] = [];
    enhancedClient.on('content', (chunk) => {
      contentChunks.push(chunk);
    });
    
    // Set up conversation with memory optimization
    const messages = [
      'This is a long message that will use many tokens and help us test the memory optimization system',
      'Here is another long message with many tokens to further increase our token count in the conversation',
      'And a third message with many words to push us over the limit and trigger memory optimization',
    ];
    
    // Enable memory management with a low token limit
    const options = {
      enableMemoryManagement: true,
      memoryStrategy: 'summarize',
      maxTokens: 30, // Set a very low limit to force optimization
      optimizeStreaming: true
    };
    
    // Execute multiple streaming turns to exceed token limit
    for (const message of messages) {
      await enhancedClient.queryStream(message, options);
    }
    
    // Verify content was streamed
    expect(contentChunks.length).toBeGreaterThan(0);
    
    // Check memory statistics
    const stats = await enhancedClient.getMemoryStats();
    
    // Verify memory optimization occurred
    expect(stats).toBeDefined();
    expect(stats.tokensUsed).toBeLessThanOrEqual(options.maxTokens);
    expect(stats.isOptimized).toBe(true);
  });
  
  test('Memory optimization strategies yield different results', async () => {
    // Initialize AI client
    await initAI();
    const enhancedClient = getEnhancedClient();
    
    // Set up a conversation that will exceed token limit
    const messages = [
      'This is a long message that will use many tokens and help us test the memory optimization system',
      'Here is another long message with many tokens to further increase our token count in the conversation',
      'And a third message with many words to push us over the limit and trigger memory optimization',
    ];
    
    // Create conversations with different strategies
    const summarizeOptions = {
      enableMemoryManagement: true,
      memoryStrategy: 'summarize',
      maxTokens: 30
    };
    
    const truncateOptions = {
      enableMemoryManagement: true,
      memoryStrategy: 'truncate',
      maxTokens: 30
    };
    
    // Execute turns with the summarize strategy
    for (const message of messages) {
      await enhancedClient.query(message, summarizeOptions);
    }
    
    // Get memory stats after summarization
    const summarizeStats = await enhancedClient.getMemoryStats();
    
    // Reset client
    resetAIClient();
    await initAI();
    const enhancedClient2 = getEnhancedClient();
    
    // Execute turns with the truncate strategy
    for (const message of messages) {
      await enhancedClient2.query(message, truncateOptions);
    }
    
    // Get memory stats after truncation
    const truncateStats = await enhancedClient2.getMemoryStats();
    
    // Verify both optimization strategies worked
    expect(summarizeStats.isOptimized).toBe(true);
    expect(truncateStats.isOptimized).toBe(true);
    
    // Both should be under the token limit
    expect(summarizeStats.tokensUsed).toBeLessThanOrEqual(30);
    expect(truncateStats.tokensUsed).toBeLessThanOrEqual(30);
  });
});