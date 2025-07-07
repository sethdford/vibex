/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { EventEmitter } from 'events';
import { 
  Conversation, 
  ConversationMessage, 
  ConversationRepository, 
  ContentGenerator,
  ToolCall,
  ToolCallResult,
  Thought
} from '../core/interfaces/types';
import { Turn, TurnEvent, TurnResult } from '../core/domain/turn';
import { ConversationManager } from '../core/usecases/conversation-manager';

/**
 * Service responsible for managing conversations and orchestrating
 * the interaction between the domain layer and infrastructure
 */
export class ConversationService extends EventEmitter {
  private turn: Turn = new Turn();
  private conversationManager: ConversationManager;

  constructor(
    private repository: ConversationRepository,
    private contentGenerator: ContentGenerator
  ) {
    super();
    this.conversationManager = new ConversationManager(repository, contentGenerator);
  }

  /**
   * Create a new conversation
   */
  async createConversation(initialMessage?: string): Promise<Conversation> {
    return await this.conversationManager.createConversation(initialMessage);
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return await this.conversationManager.getConversation(id);
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(limit = 10): Promise<Conversation[]> {
    return await this.conversationManager.getRecentConversations(limit);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    return await this.conversationManager.deleteConversation(id);
  }

  /**
   * Send a message and get a response in a non-streaming manner
   */
  async sendMessage(
    conversationId: string,
    content: string,
    options?: Record<string, unknown>
  ): Promise<ConversationMessage> {
    // Add user message
    await this.conversationManager.addUserMessage(conversationId, content);
    
    // Generate response
    return await this.conversationManager.generateResponse(conversationId, options);
  }

  /**
   * Send a message and stream the response
   */
  async sendMessageStream(
    conversationId: string,
    content: string,
    options?: Record<string, unknown>
  ): Promise<void> {
    const conversation = await this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Add user message
    const userMessage = await this.conversationManager.addUserMessage(conversationId, content);
    
    // Start turn with conversation history
    this.turn.start([...conversation.messages, userMessage]);
    this.emit(TurnEvent.START, { conversationId });
    
    try {
      // Generate streaming response
      await this.contentGenerator.generateStream(
        conversation.messages.map(m => m.content).join('\n'),
        options
      );
      
      // Create and save the final assistant message if turn completed successfully
      if (this.turn.getStatus() !== 'error') {
        const assistantMessage: ConversationMessage = {
          id: this.generateId(),
          content: this.turn.getContent(),
          role: 'assistant',
          createdAt: new Date()
        };
        
        await this.repository.addMessage(conversationId, assistantMessage);
        this.turn.complete(assistantMessage);
        
        this.emit(TurnEvent.COMPLETE, this.turn.getResult());
      }
    } catch (error) {
      this.turn.fail(error as Error);
      this.emit(TurnEvent.ERROR, error);
    }
  }

  /**
   * Handle a tool call result
   */
  async handleToolCallResult(toolCallResult: ToolCallResult): Promise<void> {
    this.turn.addToolResult(toolCallResult);
    this.emit(TurnEvent.TOOL_RESULT, toolCallResult);
    
    // If no more pending tool calls, mark as completed
    if (!this.turn.hasPendingToolCalls()) {
      const result = this.turn.getResult();
      this.emit(TurnEvent.COMPLETE, result);
    }
  }

  

  /**
   * Handle a content chunk
   */
  private handleContentChunk(content: string): void {
    this.turn.addContent(content);
    this.emit(TurnEvent.CONTENT, content);
  }

  /**
   * Handle a tool call
   */
  private handleToolCall(toolCall: ToolCall): void {
    this.turn.addToolCall(toolCall);
    this.emit(TurnEvent.TOOL_CALL, toolCall);
  }

  /**
   * Handle a thought
   */
  private handleThought(thought: Thought): void {
    this.turn.setThought(thought);
    this.emit(TurnEvent.THOUGHT, thought);
  }

  /**
   * Handle an error
   */
  private handleError(error: Error): void {
    this.turn.fail(error);
    this.emit(TurnEvent.ERROR, error);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}