/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tests for the CliAdapter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CliAdapter } from './cli-adapter';
import { ServiceFactory } from '../services/service-factory';
import { ConversationService } from '../services/conversation-service';
import { EventEmitter } from 'events';
import { TurnEvent } from '../core/domain/turn';

// Mock the ServiceFactory
vi.mock('../services/service-factory', () => {
  const mockInstance = {
    configure: vi.fn(),
    getConversationService: vi.fn(),
    getConversationRepository: vi.fn(),
    getMemoryService: vi.fn(),
    getContentGenerator: vi.fn(),
  };
  
  return {
    ServiceFactory: {
      getInstance: vi.fn(() => mockInstance)
    }
  };
});

// Mock the ConversationService
class MockConversationService extends EventEmitter {
  createConversation = vi.fn();
  getConversation = vi.fn();
  getRecentConversations = vi.fn();
  sendMessage = vi.fn();
  sendMessageStream = vi.fn();
  handleToolCallResult = vi.fn();
  deleteConversation = vi.fn();
}

describe('CliAdapter', () => {
  let adapter: CliAdapter;
  let mockConversationService: MockConversationService;
  
  beforeEach(() => {
    // Create a fresh mock service
    mockConversationService = new MockConversationService();
    
    // Setup mock conversation service to be returned by factory
    const mockServiceFactory = ServiceFactory.getInstance();
    (mockServiceFactory.getConversationService as any).mockResolvedValue(mockConversationService);
    
    // Create adapter with test API key
    adapter = new CliAdapter('test-api-key', {
      baseDir: '/tmp/test-vibex'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize()', () => {
    it('should configure the service factory and create a conversation service', async () => {
      // Setup mock for createConversation
      const mockConversation = {
        id: 'new-conversation-id',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockConversationService.createConversation.mockResolvedValue(mockConversation);
      
      // Initialize adapter
      await adapter.initialize();
      
      // Verify service factory was configured
      const mockServiceFactory = ServiceFactory.getInstance();
      expect(mockServiceFactory.configure).toHaveBeenCalledWith({
        baseDir: '/tmp/test-vibex'
      });
      
      // Verify conversation service was retrieved
      expect(mockServiceFactory.getConversationService).toHaveBeenCalledWith('test-api-key');
      
      // Verify a new conversation was created
      expect(mockConversationService.createConversation).toHaveBeenCalled();
    });
  });

  describe('sendMessage()', () => {
    it('should send a message and return the response', async () => {
      // Setup mocks
      const mockConversation = {
        id: 'conversation-id',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockConversationService.createConversation.mockResolvedValue(mockConversation);
      
      const mockResponse = {
        id: 'response-id',
        content: 'AI response',
        role: 'assistant',
        createdAt: new Date()
      };
      mockConversationService.sendMessage.mockResolvedValue(mockResponse);
      
      // Initialize and send message
      await adapter.initialize();
      const response = await adapter.sendMessage('Hello, AI!');
      
      // Verify correct parameters were used
      expect(mockConversationService.sendMessage).toHaveBeenCalledWith(
        'conversation-id',
        'Hello, AI!',
        expect.objectContaining({})
      );
      
      // Verify response
      expect(response).toBe('AI response');
    });
    
    it('should throw error if not initialized', async () => {
      await expect(adapter.sendMessage('Hello')).rejects.toThrow('CLI adapter not initialized');
    });
  });

  describe('sendStreamingMessage()', () => {
    it('should setup event listeners and call sendMessageStream', async () => {
      // Setup mocks
      const mockConversation = {
        id: 'conversation-id',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockConversationService.createConversation.mockResolvedValue(mockConversation);
      
      // Initialize adapter
      await adapter.initialize();
      
      // Create callback mocks
      const callbacks = {
        onContent: vi.fn(),
        onToolCall: vi.fn(),
        onThought: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn()
      };
      
      // Call sendStreamingMessage
      const streamPromise = adapter.sendStreamingMessage('Hello, AI!', callbacks);
      
      // Emit some events to test handlers
      mockConversationService.emit(TurnEvent.CONTENT, 'Hello');
      mockConversationService.emit(TurnEvent.TOOL_CALL, {
        id: 'tool-1',
        name: 'search',
        input: { query: 'test' }
      });
      mockConversationService.emit(TurnEvent.THOUGHT, {
        subject: 'Thinking',
        description: 'About the response'
      });
      mockConversationService.emit(TurnEvent.COMPLETE, {
        content: 'Final response',
        toolCalls: [],
        messages: [],
        status: 'completed'
      });
      
      // Complete the sendMessageStream call
      (mockConversationService.sendMessageStream as any).mockResolvedValue(undefined);
      
      // Wait for streaming to complete
      await streamPromise;
      
      // Verify correct method was called
      expect(mockConversationService.sendMessageStream).toHaveBeenCalledWith(
        'conversation-id',
        'Hello, AI!',
        expect.objectContaining({})
      );
      
      // Verify callbacks were triggered
      expect(callbacks.onContent).toHaveBeenCalledWith('Hello');
      expect(callbacks.onToolCall).toHaveBeenCalledWith('search', { query: 'test' });
      expect(callbacks.onThought).toHaveBeenCalledWith({
        subject: 'Thinking',
        description: 'About the response'
      });
      expect(callbacks.onComplete).toHaveBeenCalledWith('Final response');
    });
    
    it('should handle errors during streaming', async () => {
      // Setup mocks
      const mockConversation = {
        id: 'conversation-id',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockConversationService.createConversation.mockResolvedValue(mockConversation);
      
      // Initialize adapter
      await adapter.initialize();
      
      // Create callback mock for error
      const onError = vi.fn();
      
      // Make sendMessageStream throw an error
      const testError = new Error('Test streaming error');
      (mockConversationService.sendMessageStream as any).mockRejectedValue(testError);
      
      // Call sendStreamingMessage and expect it to reject
      await expect(adapter.sendStreamingMessage('Hello', { onError })).rejects.toThrow('Test streaming error');
    });
  });

  describe('getConversationHistory()', () => {
    it('should return formatted conversation history', async () => {
      // Setup mocks
      const mockConversation = {
        id: 'current-conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockConversationService.createConversation.mockResolvedValue(mockConversation);
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const mockHistory = [
        {
          id: 'conv-1',
          messages: [
            { id: 'msg-1', content: 'First user message', role: 'user', createdAt: pastDate }
          ],
          createdAt: pastDate,
          updatedAt: pastDate
        },
        {
          id: 'conv-2',
          messages: [
            { id: 'msg-2', content: 'A very long message that should be truncated in the summary', role: 'user', createdAt: pastDate }
          ],
          createdAt: pastDate,
          updatedAt: pastDate
        },
        {
          id: 'conv-3',
          messages: [], // Empty conversation
          createdAt: pastDate,
          updatedAt: pastDate
        }
      ];
      
      mockConversationService.getRecentConversations.mockResolvedValue(mockHistory);
      
      // Initialize adapter
      await adapter.initialize();
      
      // Get conversation history
      const history = await adapter.getConversationHistory();
      
      // Verify getRecentConversations was called
      expect(mockConversationService.getRecentConversations).toHaveBeenCalledWith(10);
      
      // Verify history format
      expect(history).toHaveLength(3);
      expect(history[0].id).toBe('conv-1');
      expect(history[0].summary).toBe('First user message');
      expect(history[1].summary).toBe('A very long message that should be truncated in the...');
      expect(history[2].summary).toMatch(/^Conversation conv-3/);
    });
  });

  describe('formatMessage()', () => {
    it('should format messages with correct prefixes', () => {
      const userMessage = {
        id: 'msg-1',
        content: 'Hello',
        role: 'user' as const,
        createdAt: new Date()
      };
      
      const assistantMessage = {
        id: 'msg-2',
        content: 'Hi there',
        role: 'assistant' as const,
        createdAt: new Date()
      };
      
      const systemMessage = {
        id: 'msg-3',
        content: 'System notification',
        role: 'system' as const,
        createdAt: new Date()
      };
      
      // Initialize adapter
      adapter = new CliAdapter('test-api-key');
      
      // Format messages
      const formattedUser = adapter.formatMessage(userMessage);
      const formattedAssistant = adapter.formatMessage(assistantMessage);
      const formattedSystem = adapter.formatMessage(systemMessage);
      
      // We can't check the exact chalk colors in the test,
      // but we can verify the content is included
      expect(formattedUser).toContain('You: Hello');
      expect(formattedAssistant).toContain('AI: Hi there');
      expect(formattedSystem).toContain('System: System notification');
    });
  });
});
