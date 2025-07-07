/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * AI Module Tests
 * 
 * Tests for the main AI module that uses the integrated architecture
 */

import { jest } from 'vitest';
import { initAI, getAIClient, resetAIClient, getEnhancedClient } from '../../src/ai/index.js';
import { UnifiedClaudeClient } from '../../src/ai/unified-client.js';
import type { QueryOptions, AIResponse } from '../../src/ai/unified-client.js';

// Mock the unified client
vi.mock('../../src/ai/unified-client.js', () => {
  const EventEmitter = require('events');
  
  class MockUnifiedClient extends EventEmitter {
    query = jest.fn<(input: string | any[], options?: QueryOptions) => Promise<AIResponse>>().mockResolvedValue({
      message: { content: 'Test response' }
    });
    queryStream = jest.fn<(prompt: string, options?: QueryOptions) => Promise<void>>().mockResolvedValue(undefined);
    isAvailable = vi.fn().mockReturnValue(true);
    getModel = vi.fn().mockReturnValue('claude-3-7-sonnet');
    setModel = vi.fn();
    submitToolResult = jest.fn<(toolCallId: string, result: any) => Promise<void>>().mockResolvedValue(undefined);
    clearConversation = vi.fn();
    getConversation = vi.fn().mockReturnValue([]);
    setConversation = vi.fn();
    getMemoryStats = jest.fn<() => Promise<any>>().mockResolvedValue({});
  }
  
  return {
    UnifiedClaudeClient: MockUnifiedClient,
    createUnifiedClient: vi.fn().mockImplementation(() => new MockUnifiedClient()),
  };
});

// Mock auth manager
vi.mock('../../src/auth/index.js', () => ({
  authManager: {
    getToken: vi.fn().mockReturnValue({ accessToken: 'mock-token' }),
  },
}));

// Mock config
vi.mock('../../src/config/index.js', () => ({
  loadConfig: jest.fn<() => Promise<any>>().mockResolvedValue({
    ai: { model: 'claude-3-7-sonnet' }
  }),
}));

describe('AI Module', () => {
  beforeEach(() => {
    // Reset AI client by calling the exported function directly
    vi.spyOn(require('../../src/ai/index.js'), 'resetAIClient').mockImplementation(() => {
      (require('../../src/ai/index.js') as any).aiClient = null;
    });
    require('../../src/ai/index.js').resetAIClient();
    process.env.ANTHROPIC_API_KEY = 'mock-env-api-key';
  });
  
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.clearAllMocks();
  });
  
  describe('initAI', () => {
    it('should initialize using the unified client', async () => {
      const client = await initAI();
      
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(UnifiedClaudeClient);
      
      // Should use environment API key
      expect(require('../../src/ai/unified-client.js').createUnifiedClient)
        .toHaveBeenCalledWith('mock-env-api-key', expect.anything());
    });
    
    it('should use auth manager token if environment key is not available', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      const client = await initAI();
      
      expect(client).toBeDefined();
      expect(require('../../src/ai/unified-client.js').createUnifiedClient)
        .toHaveBeenCalledWith('mock-token', expect.anything());
    });
    
    it('should throw error if no API key is available', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      require('../../src/auth/index.js').authManager.getToken.mockReturnValueOnce(null);
      
      await expect(initAI()).rejects.toThrow('Anthropic API key is not configured');
    });
    
    it('should return the same instance on multiple calls', async () => {
      const client1 = await initAI();
      const client2 = await initAI();
      
      expect(client1).toBe(client2);
      expect(require('../../src/ai/unified-client.js').createUnifiedClient).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('getAIClient', () => {
    it('should return null if client is not initialized', () => {
      const client = getAIClient();
      expect(client).toBeNull();
    });
    
    it('should return the initialized client', async () => {
      await initAI();
      const client = getAIClient();
      
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(UnifiedClaudeClient);
    });
  });
  
  describe('getEnhancedClient', () => {
    it('should return the client with advanced capabilities', async () => {
      await initAI();
      const client = getEnhancedClient();
      
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(UnifiedClaudeClient);
      
      // Should be the same instance as the regular client
      expect(client).toBe(getAIClient());
    });
  });
});