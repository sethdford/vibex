/**
 * Integrated AI Tests
 *
 * Testing the AI module components working together to improve overall coverage
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { UnifiedClaudeClient, createUnifiedClient } from '../../src/ai/unified-client.js';
import { TurnManager, TurnEvent, TurnStatus, createTurnManager } from '../../src/ai/turn-manager.js';
import { ContentGenerator, ContentEvent, ContentRequestConfig } from '../../src/ai/content-generator.js';
import { MemoryManager, MemoryOptimizationStrategy } from '../../src/ai/memory-manager.js';
import { ContentStreamManager, StreamEventType } from '../../src/ai/content-stream.js';

// Mock dependencies
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Create mock Content Generator for comprehensive testing
class MockContentGenerator extends EventEmitter implements ContentGenerator {
  constructor() {
    super();
  }
  
  public generate = jest.fn().mockResolvedValue({
    content: "This is a test response",
    usage: { inputTokens: 10, outputTokens: 15 }
  });
  
  public generateStream = jest.fn().mockImplementation(() => {
    // Simulate content streaming
    setTimeout(() => this.emit(ContentEvent.CONTENT, 'Hello'), 10);
    setTimeout(() => this.emit(ContentEvent.CONTENT, ' world!'), 20);
    setTimeout(() => this.emit(ContentEvent.THINKING, 'Thinking about response...'), 5);
    return Promise.resolve();
  });
  
  public countTokens = jest.fn().mockResolvedValue({
    messageCount: 3,
    tokenCount: 50,
    tokensPerMessage: [10, 20, 20],
    contextLimit: 4000
  });
  
  public isModelAvailable = jest.fn().mockReturnValue(true);
  public getDefaultModel = jest.fn().mockReturnValue('claude-3-sonnet');
  public getModelContextSize = jest.fn().mockReturnValue(4000);
}

// Create mock for Memory Manager
class MockMemoryManager extends EventEmitter implements MemoryManager {
  constructor() {
    super();
  }
  
  public isCompressionNeeded = jest.fn().mockResolvedValue(false);
  public optimizeMemory = jest.fn().mockResolvedValue({
    originalTokenCount: 1000,
    newTokenCount: 500,
    compressionRatio: 0.5,
    removedMessages: 2
  });
  public getMemoryStats = jest.fn().mockResolvedValue({
    currentTokens: 500,
    maxTokens: 4000,
    utilizationPercentage: 12.5
  });
}

// Create mock for Content Stream
class MockContentStream extends EventEmitter implements ContentStreamManager {
  constructor(turnManager: TurnManager) {
    super();
    
    // Forward events from turn manager with transformation
    turnManager.on(TurnEvent.CONTENT, (text: string) => {
      this.emit(StreamEventType.CONTENT, text);
    });
    
    turnManager.on(TurnEvent.COMPLETE, () => {
      this.emit(StreamEventType.COMPLETE);
    });
    
    turnManager.on(TurnEvent.ERROR, (error: unknown) => {
      this.emit(StreamEventType.ERROR, error);
    });
    
    turnManager.on(TurnEvent.TOOL_CALL, (toolCall) => {
      this.emit(StreamEventType.TOOL_CALL, toolCall);
    });
  }
}

// Mock module factories
jest.mock('../../src/ai/claude-content-generator.js', () => ({
  createClaudeContentGenerator: jest.fn().mockImplementation(() => new MockContentGenerator()),
  ClaudeContentGenerator: jest.requireActual('events').EventEmitter
}));

jest.mock('../../src/ai/memory-manager.js', () => ({
  createMemoryManager: jest.fn().mockImplementation(() => new MockMemoryManager()),
  MemoryOptimizationStrategy: {
    SUMMARIZE: 'summarize',
    PRUNE: 'prune',
    COMPRESS: 'compress'
  }
}));

jest.mock('../../src/ai/content-stream.js', () => {
  return {
    createContentStream: jest.fn().mockImplementation((turnManager) => new MockContentStream(turnManager)),
    StreamEventType: {
      CONTENT: 'content',
      COMPLETE: 'complete',
      ERROR: 'error',
      TOOL_CALL: 'tool_call'
    }
  };
});

describe('Integrated AI System', () => {
  let unifiedClient: UnifiedClaudeClient;
  let mockConfig: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock config
    mockConfig = {
      api: {
        baseUrl: 'https://api.anthropic.com',
        timeout: 30000
      },
      auth: {
        maxRetryAttempts: 3
      },
      ai: {
        model: 'claude-3-sonnet',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful assistant.'
      }
    };
    
    // Create client with mocked internals
    unifiedClient = createUnifiedClient('test-api-key', mockConfig);
  });
  
  describe('Advanced Unified Client Features', () => {
    test('should handle model switching', () => {
      // Initial model should be from config
      expect(unifiedClient.getModel()).toBe('claude-3-sonnet');
      
      // Set a new model
      unifiedClient.setModel('claude-3-haiku');
      expect(unifiedClient.getModel()).toBe('claude-3-haiku');
      
      // Should throw for invalid model
      const contentGenerator = (unifiedClient as any).contentGenerator;
      contentGenerator.isModelAvailable.mockReturnValueOnce(false);
      
      expect(() => unifiedClient.setModel('invalid-model')).toThrow();
    });
    
    test('should manage conversation history', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      // Set conversation
      unifiedClient.setConversation(messages);
      
      // Get conversation - should be a copy
      const retrievedMessages = unifiedClient.getConversation();
      expect(retrievedMessages).toEqual(messages);
      expect(retrievedMessages).not.toBe(messages); // Should be a copy
      
      // Clear conversation
      unifiedClient.clearConversation();
      expect(unifiedClient.getConversation()).toEqual([]);
    });
    
    test('should retrieve memory statistics', async () => {
      const stats = await unifiedClient.getMemoryStats();
      expect(stats).toBeDefined();
      expect(stats.currentTokens).toBe(500);
      expect(stats.maxTokens).toBe(4000);
    });
    
    test('should handle query with message array input', async () => {
      const messages = [
        { role: 'user', content: 'What is the weather?' },
        { role: 'assistant', content: 'I cannot check the weather.' },
        { role: 'user', content: 'Thanks anyway.' }
      ];
      
      const response = await unifiedClient.query(messages);
      
      expect(response).toBeDefined();
      expect(response.message.content).toBe("This is a test response");
      expect(response.usage).toBeDefined();
    });
    
    test('should use memory optimization when needed', async () => {
      // Override mock to indicate compression needed
      const memoryManager = (unifiedClient as any).memoryManager;
      memoryManager.isCompressionNeeded.mockResolvedValueOnce(true);
      
      // Execute query with memory optimization
      await unifiedClient.query('Tell me a long story', {
        enableMemoryManagement: true,
        memoryStrategy: MemoryOptimizationStrategy.SUMMARIZE
      });
      
      // Check that memory optimization was performed
      expect(memoryManager.isCompressionNeeded).toHaveBeenCalled();
      expect(memoryManager.optimizeMemory).toHaveBeenCalled();
      expect(memoryManager.optimizeMemory.mock.calls[0][2]).toBe(MemoryOptimizationStrategy.SUMMARIZE);
    });
    
    test('should handle memory optimization errors gracefully', async () => {
      // Override mock to indicate compression needed and throw error
      const memoryManager = (unifiedClient as any).memoryManager;
      memoryManager.isCompressionNeeded.mockResolvedValueOnce(true);
      memoryManager.optimizeMemory.mockRejectedValueOnce(new Error('Memory optimization failed'));
      
      // Should not fail the query
      await unifiedClient.query('Tell me a story', {
        enableMemoryManagement: true
      });
      
      // Original query should still proceed
      const contentGenerator = (unifiedClient as any).contentGenerator;
      expect(contentGenerator.generate).toHaveBeenCalled();
    });
    
    test('should handle tool result submission', async () => {
      // Setup a turn manager with tool calls
      const contentGenerator = (unifiedClient as any).contentGenerator;
      const turnManager = new TurnManager(contentGenerator, {
        model: 'claude-3-sonnet',
        systemPrompt: 'You are helpful.'
      });
      
      // Mock the turn manager methods
      turnManager.hasPendingToolCalls = jest.fn().mockReturnValue(true);
      turnManager.submitToolResult = jest.fn().mockResolvedValue({
        content: 'Tool result processed',
        toolCalls: []
      });
      
      // Set the turn manager
      (unifiedClient as any).turnManager = turnManager;
      
      // Submit tool result
      await unifiedClient.submitToolResult('tool-123', { result: 'Test result' });
      
      // Verify
      expect(turnManager.submitToolResult).toHaveBeenCalledWith({
        toolCallId: 'tool-123',
        result: { result: 'Test result' },
        error: undefined
      }, undefined);
    });
    
    test('should throw when submitting tool result with no active turn', async () => {
      // No turn manager set
      (unifiedClient as any).turnManager = null;
      
      await expect(unifiedClient.submitToolResult('tool-123', {}))
        .rejects.toThrow('No active turn with pending tool calls');
    });
    
    test('should throw when submitting tool result with no pending calls', async () => {
      // Setup a turn manager with no tool calls
      const contentGenerator = (unifiedClient as any).contentGenerator;
      const turnManager = new TurnManager(contentGenerator, {
        model: 'claude-3-sonnet',
        systemPrompt: 'You are helpful.'
      });
      
      // Mock no pending tool calls
      turnManager.hasPendingToolCalls = jest.fn().mockReturnValue(false);
      
      // Set the turn manager
      (unifiedClient as any).turnManager = turnManager;
      
      await expect(unifiedClient.submitToolResult('tool-123', {}))
        .rejects.toThrow('No active turn with pending tool calls');
    });
  });
  
  describe('TurnManager Advanced Features', () => {
    let contentGenerator: MockContentGenerator;
    let turnManager: TurnManager;
    
    beforeEach(() => {
      contentGenerator = new MockContentGenerator();
      turnManager = createTurnManager(contentGenerator, {
        model: 'claude-3-sonnet',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 1000
      });
    });
    
    test('should handle thinking events', async () => {
      const thinkingHandler = jest.fn();
      turnManager.on(TurnEvent.THINKING, thinkingHandler);
      
      await turnManager.execute('Hello AI!');
      
      expect(thinkingHandler).toHaveBeenCalledWith('Thinking about response...');
    });
    
    test('should format user message from string or object', async () => {
      // Execute with string
      await turnManager.execute('Hello string');
      
      // Execute with message object
      await turnManager.execute({ role: 'user', content: 'Hello object' });
      
      // Check both messages were added
      const messages = turnManager.getMessages();
      expect(messages).toHaveLength(4); // 2 user messages + 2 assistant responses
      expect(messages[0]).toEqual({ role: 'user', content: 'Hello string' });
      expect(messages[2]).toEqual({ role: 'user', content: 'Hello object' });
    });
    
    test('should throw when tool result has invalid tool ID', async () => {
      // Setup tool call
      (turnManager as any).status = TurnStatus.WAITING_FOR_TOOL;
      (turnManager as any).pendingToolCalls = [{ id: 'valid-tool-id', name: 'test-tool' }];
      
      await expect(turnManager.submitToolResult({
        toolCallId: 'invalid-tool-id',
        result: {}
      })).rejects.toThrow('No pending tool call found with ID');
    });
    
    test('should reset turn state', () => {
      // Setup some state
      (turnManager as any).status = TurnStatus.COMPLETED;
      (turnManager as any).content = 'Some content';
      (turnManager as any).thinking = 'Some thinking';
      (turnManager as any).pendingToolCalls = [{ id: 'tool-1' }];
      (turnManager as any).completedToolCalls = [{ toolCallId: 'tool-0' }];
      (turnManager as any).messages = [{ role: 'user', content: 'Hello' }];
      
      // Reset
      turnManager.reset();
      
      // Verify all state is cleared
      expect(turnManager.getStatus()).toBe(TurnStatus.IDLE);
      expect((turnManager as any).content).toBe('');
      expect((turnManager as any).thinking).toBe('');
      expect((turnManager as any).pendingToolCalls).toEqual([]);
      expect((turnManager as any).completedToolCalls).toEqual([]);
      expect(turnManager.getMessages()).toEqual([]);
    });
    
    test('should handle aborted requests', async () => {
      // Create abort controller
      const controller = new AbortController();
      
      // Mock the generateStream to throw AbortError when signal is detected
      contentGenerator.generateStream = jest.fn().mockImplementation((messages, config) => {
        if (config.abortSignal && config.abortSignal.aborted) {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          throw error;
        }
        return Promise.resolve();
      });
      
      // Abort immediately
      controller.abort();
      
      // Execute with abort signal
      await expect(turnManager.execute('Hello', controller.signal))
        .rejects.toThrow('Request aborted');
      
      // Status should be failed
      expect(turnManager.getStatus()).toBe(TurnStatus.FAILED);
    });
    
    test('should get pending and completed tool calls', async () => {
      // Set up some tool calls
      const pendingToolCalls = [
        { id: 'tool-1', name: 'search', input: { query: 'test' } },
        { id: 'tool-2', name: 'calculator', input: { expression: '1+1' } }
      ];
      const completedToolCalls = [
        { toolCallId: 'tool-0', result: { answer: 42 } }
      ];
      
      (turnManager as any).pendingToolCalls = pendingToolCalls;
      (turnManager as any).completedToolCalls = completedToolCalls;
      
      // Get tool calls
      const pending = turnManager.getPendingToolCalls();
      const completed = turnManager.getCompletedToolCalls();
      
      // Should return copies
      expect(pending).toEqual(pendingToolCalls);
      expect(pending).not.toBe(pendingToolCalls);
      expect(completed).toEqual(completedToolCalls);
      expect(completed).not.toBe(completedToolCalls);
    });
    
    test('should handle tool call event properly', () => {
      // Setup
      const toolCallHandler = jest.fn();
      turnManager.on(TurnEvent.TOOL_CALL, toolCallHandler);
      
      // Simulate tool call event from content generator
      const toolCall = {
        id: 'tool-123',
        name: 'search',
        input: { query: 'test' }
      };
      
      contentGenerator.emit(ContentEvent.TOOL_CALL, toolCall);
      
      // Verify
      expect(toolCallHandler).toHaveBeenCalledWith(toolCall);
      expect(turnManager.getPendingToolCalls()).toContainEqual(toolCall);
    });
    
    test('should filter out invalid tool calls', () => {
      // Invalid tool call with missing properties
      const invalidToolCall = { 
        someProperty: 'value' 
      };
      
      contentGenerator.emit(ContentEvent.TOOL_CALL, invalidToolCall);
      
      // Should not be added to pending tool calls
      expect(turnManager.getPendingToolCalls()).toHaveLength(0);
    });
  });
});