/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * AI Architecture Integration Test
 * 
 * End-to-end test for the enhanced architecture showing how all
 * the components work together in a real-world scenario.
 */

import { jest } from 'vitest';
import { EventEmitter } from 'events';
import { createClaudeContentGenerator } from '../../src/ai/claude-content-generator.js';
import { createTurnManager, TurnEvent } from '../../src/ai/turn-manager.js';
import { createContentStream } from '../../src/ai/content-stream.js';
import { createMemoryManager, MemoryOptimizationStrategy } from '../../src/ai/memory-manager.js';
import { UnifiedClaudeClient } from '../../src/ai/unified-client.js';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// Mock content generator
vi.mock('../../src/ai/claude-content-generator.js', () => {
  const EventEmitter = require('events');
  const { ContentEvent } = require('../../src/ai/content-generator.js');
  
  class MockContentGenerator extends EventEmitter {
    generate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Test response' }],
      usage: { inputTokens: 10, outputTokens: 20 }
    });
    
    generateStream = vi.fn().mockImplementation(() => {
      // Simulate streaming
      setTimeout(() => this.emit(ContentEvent.CONTENT, 'Hello'), 10);
      setTimeout(() => this.emit(ContentEvent.CONTENT, ' world'), 20);
      setTimeout(() => this.emit(ContentEvent.THINKING, 'I am thinking...'), 15);
      return Promise.resolve();
    });
    
    countTokens = vi.fn().mockResolvedValue({
      messageCount: 2,
      tokenCount: 50,
      tokensPerMessage: [20, 30],
      contextLimit: 4000
    });
    
    isModelAvailable = vi.fn().mockReturnValue(true);
    getDefaultModel = vi.fn().mockReturnValue('claude-3-7-sonnet');
    getModelContextSize = vi.fn().mockReturnValue(4000);
  }
  
  return {
    createClaudeContentGenerator: vi.fn().mockImplementation(() => new MockContentGenerator()),
  };
});

// Mock config
const mockConfig = {
  ai: {
    model: 'claude-3-7-sonnet',
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    maxTokens: 1000,
  }
} as any;

describe('AI Architecture Integration', () => {
  describe('Components working together', () => {
    it('shows how content generator, turn manager, and streaming work together', async () => {
      // Create component instances
      const contentGenerator = createClaudeContentGenerator('mock-api-key', mockConfig);
      const turnManager = createTurnManager(contentGenerator, {
        model: 'claude-3-7-sonnet',
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
      });
      
      // Set up event handlers
      const contentHandler = vi.fn();
      const thinkingHandler = vi.fn();
      const completeHandler = vi.fn();
      
      turnManager.on(TurnEvent.CONTENT, contentHandler);
      turnManager.on(TurnEvent.THINKING, thinkingHandler);
      turnManager.on(TurnEvent.COMPLETE, completeHandler);
      
      // Execute turn
      const result = await turnManager.execute('Hello Claude');
      
      // Check events were emitted
      expect(contentHandler).toHaveBeenCalledWith('Hello');
      expect(contentHandler).toHaveBeenCalledWith(' world');
      expect(thinkingHandler).toHaveBeenCalledWith('I am thinking...');
      expect(completeHandler).toHaveBeenCalled();
      
      // Check result
      expect(result.content).toBe('Hello world');
    });
    
    it('shows how memory manager works with content generation', async () => {
      // Create component instances
      const contentGenerator = createClaudeContentGenerator('mock-api-key', mockConfig);
      const memoryManager = createMemoryManager(contentGenerator);
      
      // Create long conversation
      const conversation: MessageParam[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there! How can I help you today?' },
        { role: 'user', content: 'Tell me about AI' },
        { role: 'assistant', content: 'AI or Artificial Intelligence refers to...' }
      ];
      
      // Mock the countTokens method to indicate we need optimization
      (contentGenerator.countTokens as jest.Mock).mockResolvedValueOnce({
        messageCount: 4,
        tokenCount: 500,
        tokensPerMessage: [50, 150, 100, 200],
        contextLimit: 600
      });
      
      // Mock compress method
      (contentGenerator.generate as jest.Mock).mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Summarized conversation about AI' }],
        usage: { inputTokens: 50, outputTokens: 20 }
      });
      
      // Check if we need optimization
      const needsOptimization = await memoryManager.isCompressionNeeded(conversation, 'claude-3-7-sonnet');
      expect(needsOptimization).toBe(true);
      
      // Optimize memory
      const result = await memoryManager.optimizeMemory(
        conversation,
        'claude-3-7-sonnet',
        MemoryOptimizationStrategy.SUMMARIZE
      );
      
      expect(result.originalTokenCount).toBe(500);
      expect(contentGenerator.generate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ role: 'system' })]),
        expect.anything()
      );
    });
    
    it('shows how all components integrate in the client', async () => {
      // Create unified client
      const client = new UnifiedClaudeClient({ apiKey: 'mock-api-key', config: mockConfig });
      
      // Set up event handlers
      const contentHandler = vi.fn();
      const startHandler = vi.fn();
      const endHandler = vi.fn();
      
      client.on('content', contentHandler);
      client.on('start', startHandler);
      client.on('end', endHandler);
      
      // Use v1 query interface
      const response = await client.query('Hello');
      
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      
      // Use streaming interface
      await client.queryStream('Hello world');
      
      expect(contentHandler).toHaveBeenCalled();
      
      // Check conversation management
      const conversation = client.getConversation();
      expect(conversation).toBeDefined();
      
      // Clear conversation
      client.clearConversation();
      expect(client.getConversation()).toEqual([]);
      
      // Check memory stats
      const stats = await client.getMemoryStats();
      expect(stats).toBeDefined();
    });
  });
});