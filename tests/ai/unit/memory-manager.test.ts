/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { createMemoryManager, MemoryOptimizationStrategy } from '../../../src/ai/index.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the ContentGenerator for token counting
vi.mock('../../../src/ai/claude-content-generator.js', () => {
  const EventEmitter = require('events');
  
  class MockContentGenerator extends EventEmitter {
    countTokens = vi.fn().mockImplementation((text) => {
      // Simple mock implementation: 1 token per word
      if (typeof text === 'string') {
        return Promise.resolve(text.split(' ').filter(word => word.length > 0).length);
      } else if (Array.isArray(text)) {
        // If it's an array of messages, count tokens in all content fields
        const totalTokens = text.reduce((acc, msg) => {
          if (msg.content && typeof msg.content === 'string') {
            return acc + msg.content.split(' ').filter(word => word.length > 0).length;
          }
          return acc;
        }, 0);
        return Promise.resolve(totalTokens);
      }
      return Promise.resolve(0);
    });
    
    generate = vi.fn().mockImplementation(async (messages) => {
      // For summarization, return a summary that's 50% of the original length
      const originalContent = messages[0].content as string;
      const words = originalContent.split(' ').filter(word => word.length > 0);
      const summarizedWords = words.slice(0, Math.ceil(words.length / 2));
      
      return {
        content: summarizedWords.join(' ') + ' (summarized)',
        usage: { input_tokens: words.length, output_tokens: summarizedWords.length }
      };
    });
  }
  
  return {
    createClaudeContentGenerator: vi.fn().mockImplementation(() => new MockContentGenerator()),
    ClaudeContentGenerator: MockContentGenerator
  };
});

describe('MemoryManager Unit Tests', () => {
  // Helper function to create conversation messages
  function createConversationMessages(userMessages: string[]) {
    const messages = [];
    for (let i = 0; i < userMessages.length; i++) {
      // Add user message
      messages.push({ role: 'user' as const, content: userMessages[i] });
      
      // Add assistant response
      if (i < userMessages.length - 1) {
        messages.push({ role: 'assistant' as const, content: `Response to: ${userMessages[i]}` });
      }
    }
    return messages;
  }
  
  test('MemoryManager correctly counts tokens', async () => {
    const memoryManager = createMemoryManager();
    
    // Test with string
    const stringTokens = await memoryManager.countTokens('This is a test message with multiple words');
    expect(stringTokens).toBe(8); // 8 words = 8 tokens in our mock
    
    // Test with messages
    const messages = createConversationMessages([
      'Hello there',
      'How are you today'
    ]);
    const messageTokens = await memoryManager.countTokens(messages);
    
    // Expected tokens:
    // "Hello there" = 2 tokens
    // "Response to: Hello there" = 4 tokens
    // "How are you today" = 4 tokens
    expect(messageTokens).toBe(10);
  });
  
  test('MemoryManager detects when optimization is needed', async () => {
    const memoryManager = createMemoryManager();
    
    // Create a conversation just under the limit
    const shortConversation = createConversationMessages([
      'Brief message one',
      'Brief message two'
    ]);
    
    // Create a conversation over the limit
    const longConversation = createConversationMessages([
      'This is a very long message with many words to exceed the token limit that we will set',
      'Here is another long message with enough words to push us over the token limit',
      'And a third message to ensure we are well over the limit for testing'
    ]);
    
    // Test with a limit higher than short conversation
    const needsOptShort = await memoryManager.isCompressionNeeded(
      shortConversation,
      'claude-3-sonnet-20240229',
      100 // Token limit much higher than our short conversation
    );
    expect(needsOptShort).toBe(false);
    
    // Test with a limit lower than long conversation
    const needsOptLong = await memoryManager.isCompressionNeeded(
      longConversation,
      'claude-3-sonnet-20240229',
      20 // Token limit lower than our long conversation
    );
    expect(needsOptLong).toBe(true);
  });
  
  test('MemoryManager optimizes with summarize strategy', async () => {
    const memoryManager = createMemoryManager();
    
    // Create a conversation with substantial content
    const conversation = createConversationMessages([
      'This is the first message in our conversation that will later be summarized',
      'This is the second message with additional content to make it substantial',
      'This is the third and final message to complete our test conversation'
    ]);
    
    // Count tokens before optimization
    const tokensBefore = await memoryManager.countTokens(conversation);
    
    // Optimize memory with summarize strategy
    const optimizedConversation = await memoryManager.optimizeMemory(
      conversation,
      'claude-3-sonnet-20240229',
      MemoryOptimizationStrategy.SUMMARIZE,
      20 // Token limit lower than conversation
    );
    
    // Count tokens after optimization
    const tokensAfter = await memoryManager.countTokens(optimizedConversation);
    
    // Verify optimization occurred
    expect(tokensAfter).toBeLessThan(tokensBefore);
    
    // Check for summary indicator in the content
    const hasSummary = optimizedConversation.some(msg => 
      typeof msg.content === 'string' && msg.content.includes('(summarized)')
    );
    expect(hasSummary).toBe(true);
  });
  
  test('MemoryManager optimizes with truncate strategy', async () => {
    const memoryManager = createMemoryManager();
    
    // Create a conversation with substantial content
    const conversation = createConversationMessages([
      'This is the first message in our conversation',
      'This is the second message with additional content',
      'This is the third message that should be kept',
      'This is the fourth message that should be kept',
      'This is the fifth and final message that should definitely be kept'
    ]);
    
    // Count tokens before optimization
    const tokensBefore = await memoryManager.countTokens(conversation);
    
    // Optimize memory with truncate strategy
    const optimizedConversation = await memoryManager.optimizeMemory(
      conversation,
      'claude-3-sonnet-20240229',
      MemoryOptimizationStrategy.TRUNCATE,
      20 // Token limit lower than conversation
    );
    
    // Count tokens after optimization
    const tokensAfter = await memoryManager.countTokens(optimizedConversation);
    
    // Verify optimization occurred
    expect(tokensAfter).toBeLessThan(tokensBefore);
    expect(optimizedConversation.length).toBeLessThan(conversation.length);
    
    // The most recent messages should be preserved
    const lastOriginalMessage = conversation[conversation.length - 1].content;
    const lastOptimizedMessage = optimizedConversation[optimizedConversation.length - 1].content;
    expect(lastOptimizedMessage).toBe(lastOriginalMessage);
  });
  
  test('MemoryManager provides accurate memory stats', async () => {
    const memoryManager = createMemoryManager();
    
    // Create a conversation
    const conversation = createConversationMessages([
      'This is a message with five tokens',
      'This is another message with six tokens'
    ]);
    
    // Define max tokens for the model
    const maxTokens = 100;
    
    // Get memory stats
    const stats = await memoryManager.getMemoryStats(
      conversation,
      'claude-3-sonnet-20240229',
      maxTokens
    );
    
    // Expected tokens:
    // "This is a message with five tokens" = 7 tokens
    // "Response to: This is a message with five tokens" = 9 tokens
    // "This is another message with six tokens" = 8 tokens
    // Total: 24 tokens
    const expectedTokens = 24;
    const expectedPercentage = (expectedTokens / maxTokens) * 100;
    
    // Verify stats
    expect(stats.tokensUsed).toBe(expectedTokens);
    expect(stats.maxTokens).toBe(maxTokens);
    expect(stats.percentUsed).toBeCloseTo(expectedPercentage, 1);
    expect(stats.isOptimized).toBe(false);
  });
});