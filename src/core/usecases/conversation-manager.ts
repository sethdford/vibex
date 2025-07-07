/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { Conversation, ConversationMessage, ConversationRepository } from '../interfaces/types';
import { ContentGenerator } from '../interfaces/types';

/**
 * Use case for managing conversations
 */
export class ConversationManager {
  constructor(
    private repository: ConversationRepository,
    private contentGenerator: ContentGenerator
  ) {}

  /**
   * Create a new conversation
   */
  async createConversation(initialMessage?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: this.generateId(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (initialMessage) {
      const message: ConversationMessage = {
        id: this.generateId(),
        content: initialMessage,
        role: 'user',
        createdAt: new Date()
      };
      conversation.messages.push(message);
    }

    return await this.repository.save(conversation);
  }

  /**
   * Add a user message to the conversation
   */
  async addUserMessage(
    conversationId: string, 
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationMessage> {
    const message: ConversationMessage = {
      id: this.generateId(),
      content,
      role: 'user',
      createdAt: new Date(),
      metadata
    };

    return await this.repository.addMessage(conversationId, message);
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return await this.repository.findById(id);
  }

  /**
   * Get recent conversations
   */
  async getRecentConversations(limit = 10): Promise<Conversation[]> {
    return await this.repository.findRecentConversations(limit);
  }

  /**
   * Generate a response for the conversation
   */
  async generateResponse(
    conversationId: string,
    options?: Record<string, unknown>
  ): Promise<ConversationMessage> {
    // Get the conversation
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Generate content
    const result = await this.contentGenerator.generate(
      conversation.messages.map(m => m.content).join('\n'),
      options
    );

    // Create assistant message
    const content = result.content.map(c => c.text).join('');
    const message: ConversationMessage = {
      id: this.generateId(),
      content,
      role: 'assistant',
      createdAt: new Date(),
      metadata: {
        usage: result.usage
      }
    };

    // Add to conversation
    return await this.repository.addMessage(conversationId, message);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}