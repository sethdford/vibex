/**
 * Turn Manager Tests
 * 
 * Tests for the conversation turn management system
 */

import { jest } from '@jest/globals';
import { TurnManager, TurnEvent, TurnStatus, createTurnManager } from '../../src/ai/turn-manager.js';
import { ContentGenerator, ContentEvent, ContentRequestConfig } from '../../src/ai/content-generator.js';
import { EventEmitter } from 'events';

// Mock ContentGenerator
class MockContentGenerator extends EventEmitter implements ContentGenerator {
  public generate = jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Test response' }],
    usage: { inputTokens: 10, outputTokens: 20 }
  });
  
  public generateStream = jest.fn().mockImplementation(() => {
    // Simulate streaming events
    setTimeout(() => this.emit(ContentEvent.CONTENT, 'Hello'), 10);
    setTimeout(() => this.emit(ContentEvent.CONTENT, ' world'), 20);
    setTimeout(() => this.emit(ContentEvent.CONTENT, '!'), 30);
    return Promise.resolve();
  });
  
  public countTokens = jest.fn().mockResolvedValue({ 
    messageCount: 2, 
    tokenCount: 50,
    tokensPerMessage: [20, 30],
    contextLimit: 4000
  });
  
  public isModelAvailable = jest.fn().mockReturnValue(true);
  public getDefaultModel = jest.fn().mockReturnValue('claude-3-7-sonnet');
  public getModelContextSize = jest.fn().mockReturnValue(4000);
}

// Mock ContentGenerator with tool calls
class MockToolContentGenerator extends MockContentGenerator {
  public generateStream = jest.fn().mockImplementation(() => {
    // Simulate content and tool calls
    setTimeout(() => this.emit(ContentEvent.CONTENT, 'I need to use a tool'), 10);
    setTimeout(() => this.emit(ContentEvent.TOOL_CALL, {
      id: 'tool-123',
      name: 'search',
      input: { query: 'test query' }
    }), 20);
    return Promise.resolve();
  });
}

describe('TurnManager', () => {
  let contentGenerator: MockContentGenerator;
  let turnManager: TurnManager;
  let config: ContentRequestConfig;
  
  beforeEach(() => {
    contentGenerator = new MockContentGenerator();
    config = {
      model: 'claude-3-7-sonnet',
      systemPrompt: 'You are a helpful assistant',
      temperature: 0.7,
      maxTokens: 1000,
    };
    turnManager = createTurnManager(contentGenerator, config);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('execute', () => {
    it('should handle a simple conversation turn', async () => {
      const startHandler = jest.fn();
      const contentHandler = jest.fn();
      const completeHandler = jest.fn();
      
      turnManager.on(TurnEvent.START, startHandler);
      turnManager.on(TurnEvent.CONTENT, contentHandler);
      turnManager.on(TurnEvent.COMPLETE, completeHandler);
      
      const result = await turnManager.execute('Hello');
      
      expect(startHandler).toHaveBeenCalled();
      expect(contentHandler).toHaveBeenCalledWith('Hello');
      expect(contentHandler).toHaveBeenCalledWith(' world');
      expect(contentHandler).toHaveBeenCalledWith('!');
      expect(completeHandler).toHaveBeenCalled();
      
      expect(result.content).toBe('Hello world!');
      expect(result.toolCalls).toEqual([]);
      expect(turnManager.getStatus()).toBe(TurnStatus.COMPLETED);
    });
    
    it('should throw error if turn is already in progress', async () => {
      // Mock the status
      (turnManager as any).status = TurnStatus.IN_PROGRESS;
      
      await expect(turnManager.execute('Hello')).rejects.toThrow('Turn is already in progress');
    });
  });
  
  describe('tool calls', () => {
    let toolContentGenerator: MockToolContentGenerator;
    let toolTurnManager: TurnManager;
    
    beforeEach(() => {
      toolContentGenerator = new MockToolContentGenerator();
      toolTurnManager = createTurnManager(toolContentGenerator, config);
    });
    
    it('should handle tool calls correctly', async () => {
      const toolCallHandler = jest.fn();
      toolTurnManager.on(TurnEvent.TOOL_CALL, toolCallHandler);
      
      const result = await toolTurnManager.execute('Use a tool');
      
      expect(toolCallHandler).toHaveBeenCalledWith(expect.objectContaining({
        id: 'tool-123',
        name: 'search',
        input: { query: 'test query' }
      }));
      
      expect(result.content).toBe('I need to use a tool');
      expect(result.toolCalls).toEqual([{
        id: 'tool-123',
        name: 'search',
        input: { query: 'test query' }
      }]);
      
      expect(toolTurnManager.getStatus()).toBe(TurnStatus.WAITING_FOR_TOOL);
      expect(toolTurnManager.hasPendingToolCalls()).toBe(true);
    });
    
    it('should handle tool results', async () => {
      // First execute to get tool calls
      await toolTurnManager.execute('Use a tool');
      
      // Mock second stream response
      toolContentGenerator.generateStream = jest.fn().mockImplementation(() => {
        setTimeout(() => toolContentGenerator.emit(ContentEvent.CONTENT, 'Tool result received!'), 10);
        return Promise.resolve();
      });
      
      const toolResultHandler = jest.fn();
      toolTurnManager.on(TurnEvent.TOOL_RESULT, toolResultHandler);
      
      const result = await toolTurnManager.submitToolResult({
        toolCallId: 'tool-123',
        result: { answer: 'Search results' }
      });
      
      expect(toolResultHandler).toHaveBeenCalledWith(expect.objectContaining({
        toolCallId: 'tool-123',
        result: { answer: 'Search results' }
      }));
      
      expect(result.content).toBe('Tool result received!');
      expect(result.toolCalls).toEqual([]);
      expect(toolTurnManager.getStatus()).toBe(TurnStatus.COMPLETED);
      expect(toolTurnManager.hasPendingToolCalls()).toBe(false);
      
      // Check that the messages were updated correctly
      const messages = toolTurnManager.getMessages();
      expect(messages).toHaveLength(3); // User message, tool result, assistant response
    });
  });
  
  describe('state management', () => {
    it('should track messages correctly', async () => {
      await turnManager.execute('Hello');
      
      const messages = turnManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual(expect.objectContaining({ role: 'user', content: 'Hello' }));
      expect(messages[1]).toEqual(expect.objectContaining({ role: 'assistant', content: 'Hello world!' }));
    });
    
    it('should reset state correctly', async () => {
      await turnManager.execute('Hello');
      expect(turnManager.getMessages()).toHaveLength(2);
      
      turnManager.reset();
      expect(turnManager.getMessages()).toHaveLength(0);
      expect(turnManager.getStatus()).toBe(TurnStatus.IDLE);
    });
  });
});