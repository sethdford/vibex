/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { ConversationService } from '../services/conversation-service';
import { ServiceFactory } from '../services/service-factory';
import path from 'path';
import os from 'os';
import { Conversation, ConversationMessage } from '../core/interfaces/types';
import { TurnEvent } from '../core/domain/turn';
import chalk from 'chalk';

/**
 * Adapter for CLI interface to interact with the core services
 */
export class CliAdapter {
  private conversationService: ConversationService | null = null;
  private activeConversationId: string | null = null;
  
  constructor(
    private apiKey: string,
    private config: {
      baseDir?: string;
      defaultModel?: string;
    } = {}
  ) {}

  /**
   * Initialize the CLI adapter
   */
  async initialize(): Promise<void> {
    // Configure service factory
    ServiceFactory.getInstance().configure({
      baseDir: this.config.baseDir || path.join(os.homedir(), '.vibex')
    });
    
    // Initialize conversation service
    this.conversationService = await ServiceFactory.getInstance()
      .getConversationService(this.apiKey);
    
    // Create a new conversation if none active
    if (!this.activeConversationId) {
      const conversation = await this.conversationService.createConversation();
      this.activeConversationId = conversation.id;
    }
  }

  /**
   * Send a user message and get a response
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.conversationService || !this.activeConversationId) {
      throw new Error('CLI adapter not initialized');
    }
    
    const response = await this.conversationService.sendMessage(
      this.activeConversationId,
      message,
      { model: this.config.defaultModel }
    );
    
    return response.content;
  }

  /**
   * Send a user message and stream the response to a callback function
   */
  async sendStreamingMessage(
    message: string,
    callbacks: {
      onContent?: (content: string) => void;
      onToolCall?: (name: string, input: unknown) => void;
      onThought?: (thought: { subject: string, description?: string }) => void;
      onComplete?: (finalContent: string) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    if (!this.conversationService || !this.activeConversationId) {
      throw new Error('CLI adapter not initialized');
    }
    
    // Set up event handlers
    if (callbacks.onContent) {
      this.conversationService.on(TurnEvent.CONTENT, callbacks.onContent);
    }
    
    if (callbacks.onToolCall) {
      this.conversationService.on(TurnEvent.TOOL_CALL, (toolCall) => {
        callbacks.onToolCall!(toolCall.name, toolCall.input);
      });
    }
    
    if (callbacks.onThought) {
      this.conversationService.on(TurnEvent.THOUGHT, callbacks.onThought);
    }
    
    if (callbacks.onComplete) {
      this.conversationService.on(TurnEvent.COMPLETE, (result) => {
        callbacks.onComplete!(result.content);
      });
    }
    
    if (callbacks.onError) {
      this.conversationService.on(TurnEvent.ERROR, callbacks.onError);
    }
    
    try {
      await this.conversationService.sendMessageStream(
        this.activeConversationId,
        message,
        { model: this.config.defaultModel }
      );
    } finally {
      // Clean up event listeners
      this.conversationService.removeAllListeners(TurnEvent.CONTENT);
      this.conversationService.removeAllListeners(TurnEvent.TOOL_CALL);
      this.conversationService.removeAllListeners(TurnEvent.THOUGHT);
      this.conversationService.removeAllListeners(TurnEvent.COMPLETE);
      this.conversationService.removeAllListeners(TurnEvent.ERROR);
    }
  }

  /**
   * Handle a tool call result
   */
  async handleToolResult(toolCallId: string, result: unknown): Promise<void> {
    if (!this.conversationService) {
      throw new Error('CLI adapter not initialized');
    }
    
    await this.conversationService.handleToolCallResult({
      toolCallId,
      result
    });
  }

  /**
   * Start a new conversation
   */
  async startNewConversation(): Promise<string> {
    if (!this.conversationService) {
      throw new Error('CLI adapter not initialized');
    }
    
    const conversation = await this.conversationService.createConversation();
    this.activeConversationId = conversation.id;
    return conversation.id;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    limit = 10
  ): Promise<Array<{ id: string, summary: string, date: Date }>> {
    if (!this.conversationService) {
      throw new Error('CLI adapter not initialized');
    }
    
    const conversations = await this.conversationService.getRecentConversations(limit);
    
    return conversations.map(conv => ({
      id: conv.id,
      // Create a summary from the first user message or a default
      summary: this.summarizeConversation(conv),
      date: conv.updatedAt
    }));
  }

  /**
   * Switch to an existing conversation
   */
  async switchConversation(conversationId: string): Promise<boolean> {
    if (!this.conversationService) {
      throw new Error('CLI adapter not initialized');
    }
    
    const conversation = await this.conversationService.getConversation(conversationId);
    if (!conversation) {
      return false;
    }
    
    this.activeConversationId = conversationId;
    return true;
  }

  /**
   * Get the active conversation messages
   */
  async getActiveConversationMessages(): Promise<ConversationMessage[]> {
    if (!this.conversationService || !this.activeConversationId) {
      throw new Error('CLI adapter not initialized or no active conversation');
    }
    
    const conversation = await this.conversationService.getConversation(
      this.activeConversationId
    );
    
    if (!conversation) {
      throw new Error('Active conversation not found');
    }
    
    return conversation.messages;
  }

  /**
   * Format message for CLI display
   */
  formatMessage(message: ConversationMessage): string {
    let prefix = '';
    switch (message.role) {
      case 'user':
        prefix = chalk.green('You: ');
        break;
      case 'assistant':
        prefix = chalk.blue('AI: ');
        break;
      case 'system':
        prefix = chalk.yellow('System: ');
        break;
    }
    
    return `${prefix}${message.content}`;
  }

  /**
   * Create a summary of a conversation
   */
  private summarizeConversation(conversation: Conversation): string {
    // Find the first user message
    const firstUserMessage = conversation.messages.find(msg => msg.role === 'user');
    
    if (firstUserMessage) {
      // Truncate long messages
      let summary = firstUserMessage.content;
      if (summary.length > 50) {
        summary = summary.substring(0, 47) + '...';
      }
      return summary;
    }
    
    // Default if no user messages
    return `Conversation ${conversation.id.substring(0, 8)}`;
  }
}