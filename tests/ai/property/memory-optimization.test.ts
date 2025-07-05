import { createMemoryManager, MemoryOptimizationStrategy } from '../../../src/ai/index.js';
import { Message } from '../../../src/utils/types.js';

// Mock the content generator
jest.mock('../../../src/ai/claude-content-generator.js', () => {
  const EventEmitter = require('events');
  
  class MockContentGenerator extends EventEmitter {
    countTokens = jest.fn().mockImplementation((text) => {
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
    
    generate = jest.fn().mockImplementation(async (messages) => {
      // For summarization, return a summary that's 50% of the original length
      const originalContent = messages.filter(msg => msg.role === 'user')[0].content as string;
      const words = originalContent.split(' ').filter(word => word.length > 0);
      const summarizedWords = words.slice(0, Math.ceil(words.length / 2));
      
      return {
        content: summarizedWords.join(' ') + ' (summarized)',
        usage: { input_tokens: words.length, output_tokens: summarizedWords.length }
      };
    });
  }
  
  return {
    createClaudeContentGenerator: jest.fn().mockImplementation(() => new MockContentGenerator()),
    ClaudeContentGenerator: MockContentGenerator
  };
});

describe('Property: Memory Optimization', () => {
  // Generate conversation of various lengths
  function generateConversation(messageCount: number, wordsPerMessage: number): Message[] {
    const conversation: Message[] = [];
    
    for (let i = 0; i < messageCount; i++) {
      const role = i % 2 === 0 ? 'user' : 'assistant';
      const words = Array(wordsPerMessage).fill('word').map((word, index) => `${word}${index}`);
      
      conversation.push({
        role: role as 'user' | 'assistant',
        content: words.join(' ')
      });
    }
    
    return conversation;
  }
  
  test('Property: Memory optimization always reduces token count', async () => {
    // Create test cases with different conversation lengths
    const testCases = [
      { messageCount: 5, wordsPerMessage: 10 },
      { messageCount: 10, wordsPerMessage: 20 },
      { messageCount: 20, wordsPerMessage: 5 },
    ];
    
    for (const { messageCount, wordsPerMessage } of testCases) {
      // Generate a conversation
      const conversation = generateConversation(messageCount, wordsPerMessage);
      
      // Create memory manager
      const memoryManager = createMemoryManager();
      
      // Get token count before optimization
      const tokensBefore = await memoryManager.countTokens(conversation);
      
      // Optimize memory with summarization strategy
      const optimizedConversation = await memoryManager.optimizeMemory(
        conversation,
        'claude-3-sonnet-20240229',
        MemoryOptimizationStrategy.SUMMARIZE
      );
      
      // Get token count after optimization
      const tokensAfter = await memoryManager.countTokens(optimizedConversation);
      
      // Verify the property: optimization always reduces tokens
      expect(tokensAfter).toBeLessThan(tokensBefore);
    }
  });
  
  test('Property: Memory stats correctly reports percentage used', async () => {
    // Create memory manager
    const memoryManager = createMemoryManager();
    
    // Test with different context sizes and token counts
    const testCases = [
      { messageCount: 5, wordsPerMessage: 100, maxTokens: 1000 }, // 50% usage
      { messageCount: 10, wordsPerMessage: 50, maxTokens: 1000 }, // 50% usage
      { messageCount: 2, wordsPerMessage: 250, maxTokens: 1000 }, // 50% usage
    ];
    
    for (const { messageCount, wordsPerMessage, maxTokens } of testCases) {
      // Generate a conversation
      const conversation = generateConversation(messageCount, wordsPerMessage);
      
      // Get memory stats
      const stats = await memoryManager.getMemoryStats(conversation, 'claude-3-sonnet-20240229', maxTokens);
      
      // Calculate expected token usage
      const expectedTokens = messageCount * wordsPerMessage;
      const expectedPercentage = (expectedTokens / maxTokens) * 100;
      
      // Verify the property: stats correctly reports percentage
      expect(stats.tokensUsed).toBe(expectedTokens);
      expect(stats.maxTokens).toBe(maxTokens);
      expect(stats.percentUsed).toBeCloseTo(expectedPercentage, 1); // Allow small rounding differences
    }
  });
  
  test('Property: Optimization strategy respects token limit', async () => {
    // Create memory manager
    const memoryManager = createMemoryManager();
    
    // Test different token limits
    const testCases = [
      { messageCount: 20, wordsPerMessage: 50, tokenLimit: 500 },
      { messageCount: 10, wordsPerMessage: 100, tokenLimit: 500 },
      { messageCount: 5, wordsPerMessage: 200, tokenLimit: 500 },
    ];
    
    for (const { messageCount, wordsPerMessage, tokenLimit } of testCases) {
      // Generate a conversation that exceeds token limit
      const conversation = generateConversation(messageCount, wordsPerMessage);
      
      // Optimize memory with token limit
      const optimizedConversation = await memoryManager.optimizeMemory(
        conversation,
        'claude-3-sonnet-20240229',
        MemoryOptimizationStrategy.SUMMARIZE,
        tokenLimit
      );
      
      // Get token count after optimization
      const tokensAfter = await memoryManager.countTokens(optimizedConversation);
      
      // Verify the property: optimization respects token limit
      expect(tokensAfter).toBeLessThanOrEqual(tokenLimit);
    }
  });
});