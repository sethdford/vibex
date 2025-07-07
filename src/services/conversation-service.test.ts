/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tests for the ConversationService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConversationService } from './conversation-service';
import { EventEmitter } from 'events';
import { 
  Conversation,
  ConversationMessage,
  ConversationRepository,
  ContentGenerator,
  TurnStatus
} from '../core/interfaces/types';
import { TurnEvent } from '../core/domain/turn';

// Mock implementation of ContentGenerator
class MockContentGenerator extends EventEmitter implements ContentGenerator {
  generate = vi.fn();
  generateStream = vi.fn();
  countTokens = vi.fn();
  isModelAvailable = vi.fn();
  getDefaultModel = vi.fn();
  getModelContextSize = vi.fn();
}

// Mock implementation of ConversationRepository
class MockConversationRepository implements ConversationRepository {
  conversations: Map<string, Conversation> = new Map();
  
  findById = vi.fn(async (id: string) => {
    return this.conversations.get(id) || null;
  });
  
  save = vi.fn(async (conversation: Conversation) => {
    this.conversations.set(conversation.id, { ...conversation });
    return conversation;
  });
  
  findAll = vi.fn(async () => {
    return Array.from(this.conversations.values());
  });
  
  delete = vi.fn(async (id: string) => {
    return this.conversations.delete(id);
  });
  
  addMessage = vi.fn(async (conversationId: string, message: ConversationMessage) => {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    conversation.messages.push({ ...message });
    conversation.updatedAt = new Date();
    return message;
  });
  
  findByUserId = vi.fn();
  findRecentConversations = vi.fn();
}

describe('ConversationService', () => {
  let service: ConversationService;
  let repository: MockConversationRepository;
  let contentGenerator: MockContentGenerator;
  
  beforeEach(() => {
    repository = new MockConversationRepository();
    contentGenerator = new MockContentGenerator();
    service = new ConversationService(repository, contentGenerator);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation()', () => {
    it('should create a new conversation without initial message', async () => {
      const conversation = await service.createConversation();
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.messages).toHaveLength(0);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });
    
    it('should create a new conversation with initial message', async () => {
      const initialMessage = 'Hello, AI!';
      const conversation = await service.createConversation(initialMessage);
      
      expect(conversation).toBeDefined();
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].content).toBe(initialMessage);
      expect(conversation.messages[0].role).toBe('user');
      expect(repository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConversation()', () => {
    it('should retrieve a conversation by ID', async () => {
      const conversation = await service.createConversation();
      const retrieved = await service.getConversation(conversation.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(conversation.id);
      expect(repository.findById).toHaveBeenCalledWith(conversation.id);
    });
    
    it('should return null for non-existent conversation', async () => {
      repository.findById.mockResolvedValueOnce(null);
      const retrieved = await service.getConversation('non-existent-id');
      
      expect(retrieved).toBeNull();
      expect(repository.findById).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('deleteConversation()', () => {
    it('should delete a conversation by ID', async () => {
      const conversation = await service.createConversation();
      repository.delete.mockResolvedValueOnce(true);
      
      const deleted = await service.deleteConversation(conversation.id);
      
      expect(deleted).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith(conversation.id);
    });
  });

  describe('sendMessage()', () => {
    it('should add user message and generate response', async () => {
      // Create a conversation first
      const conversation = await service.createConversation();
      
      // Mock the generate method to return a response
      const mockResponse = {
        content: [{ type: 'text', text: 'AI response' }],
        usage: { inputTokens: 10, outputTokens: 5 }
      };
      contentGenerator.generate.mockResolvedValueOnce(mockResponse);
      
      // Send a message
      const response = await service.sendMessage(
        conversation.id, 
        'User message'
      );
      
      // Verify the response
      expect(response).toBeDefined();
      expect(response.content).toBe('AI response');
      expect(response.role).toBe('assistant');
      
      // Verify repository calls
      expect(repository.addMessage).toHaveBeenCalledTimes(2); // User message + AI response
    });
  });

  describe('sendMessageStream()', () => {
    it('should stream response and emit events', async () => {
      // Create a conversation
      const conversation = await service.createConversation();
      
      // Set up event listeners for testing
      const startEvent = vi.fn();
      const contentEvent = vi.fn();
      const completeEvent = vi.fn();
      
      service.on(TurnEvent.START, startEvent);
      service.on(TurnEvent.CONTENT, contentEvent);
      service.on(TurnEvent.COMPLETE, completeEvent);
      
      // Mock streaming behavior
      contentGenerator.generateStream.mockImplementation(async () => {
        // Simulate content streaming
        contentGenerator.emit('content', 'Hello');
        contentGenerator.emit('content', ' world');
        // No errors or tool calls in this test
      });
      
      // Send a streaming message
      await service.sendMessageStream(conversation.id, 'User message');
      
      // Verify events were emitted correctly
      expect(startEvent).toHaveBeenCalledTimes(1);
      expect(contentEvent).toHaveBeenCalledTimes(2);
      expect(contentEvent).toHaveBeenCalledWith('Hello');
      expect(contentEvent).toHaveBeenCalledWith(' world');
      expect(completeEvent).toHaveBeenCalledTimes(1);
      
      // Verify the assistant message was saved
      expect(repository.addMessage).toHaveBeenCalledTimes(2); // User message + AI response
      
      // The second call to addMessage should be for the assistant message
      const assistantMessageCall = repository.addMessage.mock.calls[1];
      expect(assistantMessageCall[1].role).toBe('assistant');
      expect(assistantMessageCall[1].content).toBe('Hello world');
    });
    
    it('should handle tool calls correctly', async () => {
      // Create a conversation
      const conversation = await service.createConversation();
      
      // Set up event listeners for testing
      const toolCallEvent = vi.fn();
      const toolResultEvent = vi.fn();
      
      service.on(TurnEvent.TOOL_CALL, toolCallEvent);
      service.on(TurnEvent.TOOL_RESULT, toolResultEvent);
      
      // Mock streaming behavior with tool calls
      contentGenerator.generateStream.mockImplementation(async () => {
        // Simulate content and tool call
        contentGenerator.emit('content', 'I will search for that');
        contentGenerator.emit('tool-call', {
          id: 'tool-1',
          name: 'search',
          input: { query: 'test query' }
        });
      });
      
      // Send a streaming message
      await service.sendMessageStream(conversation.id, 'Search for something');
      
      // Verify tool call event was emitted
      expect(toolCallEvent).toHaveBeenCalledTimes(1);
      expect(toolCallEvent).toHaveBeenCalledWith({
        id: 'tool-1',
        name: 'search',
        input: { query: 'test query' }
      });
      
      // Simulate handling the tool call result
      await service.handleToolCallResult({
        toolCallId: 'tool-1',
        result: { items: ['result1', 'result2'] }
      });
      
      // Verify tool result event was emitted
      expect(toolResultEvent).toHaveBeenCalledTimes(1);
      expect(toolResultEvent).toHaveBeenCalledWith({
        toolCallId: 'tool-1',
        result: { items: ['result1', 'result2'] }
      });
    });
    
    it('should handle errors during streaming', async () => {
      // Create a conversation
      const conversation = await service.createConversation();
      
      // Set up event listeners for testing
      const errorEvent = vi.fn();
      service.on(TurnEvent.ERROR, errorEvent);
      
      // Mock streaming behavior with error
      const testError = new Error('Test error');
      contentGenerator.generateStream.mockImplementation(() => {
        // Only emit the error event, don't throw
        contentGenerator.emit('error', testError);
        // Return a resolved promise to avoid test failures
        return Promise.resolve();
      });
      
      // Send a streaming message
      await service.sendMessageStream(conversation.id, 'User message');
      
      // Verify error event was emitted
      expect(errorEvent).toHaveBeenCalled();
      expect(errorEvent.mock.calls[0][0]).toBe(testError);
    });
  });
});