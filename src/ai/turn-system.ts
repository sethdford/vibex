/**
 * Turn Management System
 * 
 * Comprehensive system for managing conversation turns, context windows,
 * and tool interactions across multiple providers.
 */

import { EventEmitter } from 'events';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { TurnManager, TurnEvent, TurnStatus, ToolCall, ToolResult } from './turn-manager.js';
import { ContentGenerator, ContentRequestConfig } from './content-generator.js';
import { MemoryManager, MemoryOptimizationStrategy } from './memory-manager.js';

import { logger } from '../utils/logger.js';

/**
 * Turn System Events
 */
export enum TurnSystemEvent {
  TURN_START = 'turn:start',
  TURN_CONTENT = 'turn:content',
  TURN_THINKING = 'turn:thinking',
  TURN_TOOL_CALL = 'turn:tool_call',
  TURN_TOOL_RESULT = 'turn:tool_result',
  TURN_COMPLETE = 'turn:complete',
  TURN_ERROR = 'turn:error',
  MEMORY_OPTIMIZED = 'memory:optimized',
  CONTEXT_UPDATED = 'context:updated',
  SESSION_RESET = 'session:reset',
  ABORT = 'abort',
}

/**
 * Turn System Configuration
 */
export interface TurnSystemConfig {
  /**
   * Maximum number of turns to keep in context
   */
  maxTurns?: number;
  
  /**
   * Maximum context utilization (0.0-1.0)
   */
  maxContextUtilization?: number;
  
  /**
   * Auto-optimize memory when reaching this threshold (0.0-1.0)
   */
  autoOptimizeThreshold?: number;
  
  /**
   * Default model
   */
  defaultModel?: string;
  
  /**
   * Default temperature
   */
  defaultTemperature?: number;
  
  /**
   * Default max tokens
   */
  defaultMaxTokens?: number;
  
  /**
   * Default system message
   */
  systemMessage?: string;
  
  /**
   * Auto-handle tool calls
   */
  autoHandleToolCalls?: boolean;
}

/**
 * Tool interface
 */
export interface Tool {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Turn options
 */
export interface TurnOptions {
  /**
   * Model to use for this turn
   */
  model?: string;
  
  /**
   * System message to use for this turn
   */
  systemMessage?: string;
  
  /**
   * Temperature to use for this turn
   */
  temperature?: number;
  
  /**
   * Max tokens to use for this turn
   */
  maxTokens?: number;
  
  /**
   * Available tools for this turn
   */
  tools?: Tool[];
  
  /**
   * Custom tool handler
   */
  toolHandler?: (toolCall: ToolCall) => Promise<any>;
  
  /**
   * Signal for cancellation
   */
  signal?: AbortSignal;
  
  /**
   * Force context optimization
   */
  forceOptimization?: boolean;
  
  /**
   * Memory optimization strategy
   */
  memoryStrategy?: MemoryOptimizationStrategy;
}

/**
 * Turn System - Comprehensive turn management system
 */
export class TurnSystem extends EventEmitter {
  private contentGenerator: ContentGenerator;
  private memoryManager: MemoryManager;
  private config: Required<TurnSystemConfig>;
  private messages: MessageParam[] = [];
  private activeTurn: TurnManager | null = null;
  private currentModel: string;
  private sessionId: string;
  
  constructor(
    contentGenerator: ContentGenerator,
    config: TurnSystemConfig = {}
  ) {
    super();
    this.contentGenerator = contentGenerator;
    this.memoryManager = new MemoryManager(contentGenerator);
    
    // Default configuration
    this.config = {
      maxTurns: 100,
      maxContextUtilization: 0.9,
      autoOptimizeThreshold: 0.8,
      defaultModel: contentGenerator.getDefaultModel(),
      defaultTemperature: 0,
      defaultMaxTokens: 2048,
      systemMessage: 'You are a helpful AI assistant.',
      autoHandleToolCalls: false,
      ...config
    };
    
    this.currentModel = this.config.defaultModel;
    this.sessionId = `turn-system-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    logger.debug('Turn System initialized', { sessionId: this.sessionId });
  }
  
  /**
   * Send a user message and get a response
   */
  public async sendMessage(
    message: string | MessageParam,
    options: TurnOptions = {}
  ): Promise<string> {
    try {
      const userMessage = typeof message === 'string'
        ? { role: 'user' as const, content: message }
        : message;
      
      // Check if we need to optimize context
      if (options.forceOptimization || await this.shouldOptimizeContext()) {
        await this.optimizeContext(options.memoryStrategy);
      }
      
      // Create a config for the content generator
      const config: ContentRequestConfig = {
        model: options.model || this.currentModel,
        systemPrompt: options.systemMessage || this.config.systemMessage,
        temperature: options.temperature !== undefined ? options.temperature : this.config.defaultTemperature,
        maxTokens: options.maxTokens || this.config.defaultMaxTokens,
        tools: options.tools as any,
      };
      
      // Create turn manager
      this.activeTurn = new TurnManager(
        this.contentGenerator,
        config,
        this.messages
      );
      
      // Forward events
      this.forwardTurnEvents(this.activeTurn);
      
      // Execute turn
      this.emit(TurnSystemEvent.TURN_START, { 
        model: config.model,
        sessionId: this.sessionId,
        userMessage
      });
      
      const result = await this.activeTurn.execute(userMessage, options.signal);
      
      // Update conversation history
      this.messages.push(userMessage);
      
      if (result.content) {
        this.messages.push({
          role: 'assistant' as const,
          content: result.content
        });
      }
      
      // Handle tool calls if any and auto-handling is enabled
      if (result.toolCalls && result.toolCalls.length > 0 && 
          this.config.autoHandleToolCalls && options.toolHandler) {
        await this.handleToolCalls(result.toolCalls, options.toolHandler);
      }
      
      this.emit(TurnSystemEvent.TURN_COMPLETE, {
        content: result.content,
        sessionId: this.sessionId,
        hasToolCalls: result.toolCalls && result.toolCalls.length > 0,
      });
      
      // Limit context size if needed
      this.enforceContextLimit();
      
      return result.content;
    } catch (error) {
      this.emit(TurnSystemEvent.TURN_ERROR, error);
      throw error;
    }
  }
  
  /**
   * Submit tool result for an active tool call
   */
  public async submitToolResult(
    toolResult: ToolResult, 
    options: TurnOptions = {}
  ): Promise<string> {
    if (!this.activeTurn || this.activeTurn.getStatus() !== TurnStatus.WAITING_FOR_TOOL) {
      throw new Error('No active turn with pending tool calls');
    }
    
    try {
      const result = await this.activeTurn.submitToolResult(toolResult, options.signal);
      
      // If we got content back, update the conversation
      if (result.content) {
        // Find the existing assistant message or create a new one
        const lastAssistantIndex = this.messages.findIndex(
          (msg, index) => msg.role === 'assistant' && index === this.messages.length - 1
        );
        
        if (lastAssistantIndex !== -1) {
          // Append to existing message
          const assistantMsg = this.messages[lastAssistantIndex];
          const currentContent = typeof assistantMsg.content === 'string' 
            ? assistantMsg.content 
            : JSON.stringify(assistantMsg.content);
            
          this.messages[lastAssistantIndex] = {
            ...assistantMsg,
            content: currentContent + result.content
          } as MessageParam;
        } else {
          // Create new message
          this.messages.push({
            role: 'assistant' as const,
            content: result.content
          });
        }
      }
      
      // Add tool result to conversation (as user message since MessageParam doesn't support tool role)
      this.messages.push({
        role: 'user' as const,
        content: `Tool result for ${toolResult.toolCallId}: ${JSON.stringify(toolResult.result)}`
      });
      
      // Handle additional tool calls if any and auto-handling is enabled
      if (result.toolCalls && result.toolCalls.length > 0 &&
          this.config.autoHandleToolCalls && options.toolHandler) {
        await this.handleToolCalls(result.toolCalls, options.toolHandler);
      }
      
      this.emit(TurnSystemEvent.TURN_COMPLETE, {
        content: result.content,
        sessionId: this.sessionId,
        hasToolCalls: result.toolCalls && result.toolCalls.length > 0,
      });
      
      return result.content;
    } catch (error) {
      this.emit(TurnSystemEvent.TURN_ERROR, error);
      throw error;
    }
  }
  
  /**
   * Get pending tool calls
   */
  public getPendingToolCalls(): ToolCall[] {
    if (!this.activeTurn) {
      return [];
    }
    
    return this.activeTurn.getPendingToolCalls();
  }
  
  /**
   * Check if there are pending tool calls
   */
  public hasPendingToolCalls(): boolean {
    if (!this.activeTurn) {
      return false;
    }
    
    return this.activeTurn.hasPendingToolCalls();
  }
  
  /**
   * Reset the conversation
   */
  public reset(): void {
    this.messages = [];
    this.activeTurn = null;
    this.sessionId = `turn-system-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    this.emit(TurnSystemEvent.SESSION_RESET, { 
      sessionId: this.sessionId 
    });
    
    logger.debug('Turn System reset', { sessionId: this.sessionId });
  }
  
  /**
   * Set system message
   */
  public setSystemMessage(message: string): void {
    this.config.systemMessage = message;
  }
  
  /**
   * Set the model
   */
  public setModel(model: string): void {
    if (!this.contentGenerator.isModelAvailable(model)) {
      throw new Error(`Model ${model} is not available`);
    }
    
    this.currentModel = model;
  }
  
  /**
   * Get conversation context
   */
  public getContext(): MessageParam[] {
    return [...this.messages];
  }
  
  /**
   * Set conversation context
   */
  public setContext(messages: MessageParam[]): void {
    this.messages = [...messages];
    this.emit(TurnSystemEvent.CONTEXT_UPDATED, {
      messageCount: messages.length,
      sessionId: this.sessionId
    });
  }
  
  /**
   * Get memory stats
   */
  public async getMemoryStats(): Promise<any> {
    return this.memoryManager.getMemoryStats(
      this.messages,
      this.currentModel
    );
  }
  
  /**
   * Check if context optimization is needed
   */
  private async shouldOptimizeContext(): Promise<boolean> {
    const stats = await this.memoryManager.getMemoryStats(
      this.messages,
      this.currentModel
    );
    
    return stats.compressionRecommended || 
           (stats.totalTokens > stats.contextSize * this.config.autoOptimizeThreshold);
  }
  
  /**
   * Optimize conversation context
   */
  private async optimizeContext(
    strategy?: MemoryOptimizationStrategy
  ): Promise<void> {
    try {
      const result = await this.memoryManager.optimizeMemory(
        this.messages,
        this.currentModel,
        strategy
      );
      
      this.emit(TurnSystemEvent.MEMORY_OPTIMIZED, {
        originalTokenCount: result.originalTokenCount,
        newTokenCount: result.newTokenCount,
        compressionRatio: result.compressionRatio,
        removedMessages: result.removedMessages,
        sessionId: this.sessionId
      });
      
      logger.info('Memory optimization complete', { 
        originalTokens: result.originalTokenCount,
        newTokens: result.newTokenCount,
        compressionRatio: result.compressionRatio.toFixed(2),
        removedMessages: result.removedMessages
      });
    } catch (error) {
      logger.error('Failed to optimize context', error);
    }
  }
  
  /**
   * Enforce context limit by removing older turns
   */
  private enforceContextLimit(): void {
    if (this.messages.length <= this.config.maxTurns * 2) {
      return;
    }
    
    // Keep only the last N turns (each turn is a user+assistant message pair)
    const totalToKeep = this.config.maxTurns * 2;
    
    // Keep last N messages since MessageParam doesn't support system role
    this.messages = this.messages.slice(-totalToKeep);
    
    logger.debug('Context limit enforced', { 
      keptMessages: this.messages.length,
      sessionId: this.sessionId
    });
  }
  
  /**
   * Handle tool calls using the provided handler
   */
  private async handleToolCalls(
    toolCalls: ToolCall[],
    handler: (toolCall: ToolCall) => Promise<any>
  ): Promise<void> {
    // Process each tool call sequentially
    for (const toolCall of toolCalls) {
      try {
        const result = await handler(toolCall);
        
        // Submit result back to turn manager
        await this.submitToolResult({
          toolCallId: toolCall.id,
          result: result
        });
      } catch (error) {
        logger.error('Tool call execution failed', { 
          toolName: toolCall.name,
          error
        });
        
        // Submit error as result
        await this.submitToolResult({
          toolCallId: toolCall.id,
          result: {},
          error: String(error)
        });
      }
    }
  }
  
  /**
   * Forward turn events to system events
   */
  private forwardTurnEvents(turnManager: TurnManager): void {
    turnManager.on(TurnEvent.START, (data) => {
      this.emit(TurnSystemEvent.TURN_START, {
        ...data,
        sessionId: this.sessionId
      });
    });
    
    turnManager.on(TurnEvent.CONTENT, (text) => {
      this.emit(TurnSystemEvent.TURN_CONTENT, text);
    });
    
    turnManager.on(TurnEvent.THINKING, (text) => {
      this.emit(TurnSystemEvent.TURN_THINKING, text);
    });
    
    turnManager.on(TurnEvent.TOOL_CALL, (toolCall) => {
      this.emit(TurnSystemEvent.TURN_TOOL_CALL, {
        ...toolCall,
        sessionId: this.sessionId
      });
    });
    
    turnManager.on(TurnEvent.TOOL_RESULT, (toolResult) => {
      this.emit(TurnSystemEvent.TURN_TOOL_RESULT, {
        ...toolResult,
        sessionId: this.sessionId
      });
    });
    
    turnManager.on(TurnEvent.ERROR, (error) => {
      this.emit(TurnSystemEvent.TURN_ERROR, {
        error,
        sessionId: this.sessionId
      });
    });
  }
}

/**
 * Create a turn system
 */
export function createTurnSystem(
  contentGenerator: ContentGenerator,
  config?: TurnSystemConfig
): TurnSystem {
  return new TurnSystem(contentGenerator, config);
}