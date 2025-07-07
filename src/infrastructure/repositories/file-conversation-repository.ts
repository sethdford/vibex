/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  Conversation,
  ConversationMessage,
  ConversationRepository
} from '../../core/interfaces/types';

/**
 * File-based implementation of the ConversationRepository interface
 */
export class FileConversationRepository implements ConversationRepository {
  private baseDir: string;
  
  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Error initializing conversation repository:', error);
      throw error;
    }
  }

  /**
   * Find a conversation by ID
   */
  async findById(id: string): Promise<Conversation | null> {
    const filePath = this.getFilePath(id);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return this.parseConversation(JSON.parse(data));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error(`Error retrieving conversation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Save a conversation
   */
  async save(conversation: Conversation): Promise<Conversation> {
    const filePath = this.getFilePath(conversation.id);
    
    try {
      // Ensure updatedAt is current
      conversation.updatedAt = new Date();
      
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf8');
      return conversation;
    } catch (error) {
      console.error(`Error saving conversation ${conversation.id}:`, error);
      throw error;
    }
  }

  /**
   * Find all conversations
   */
  async findAll(): Promise<Conversation[]> {
    try {
      const files = await fs.readdir(this.baseDir);
      const conversations: Conversation[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.baseDir, file);
          try {
            const data = await fs.readFile(filePath, 'utf8');
            const conversation = this.parseConversation(JSON.parse(data));
            conversations.push(conversation);
          } catch (error) {
            console.error(`Error reading conversation file ${file}:`, error);
          }
        }
      }
      
      return conversations;
    } catch (error) {
      console.error('Error finding all conversations:', error);
      throw error;
    }
  }

  /**
   * Find conversations by user ID
   */
  async findByUserId(userId: string): Promise<Conversation[]> {
    const conversations = await this.findAll();
    return conversations.filter(conv => 
      conv.metadata && conv.metadata.userId === userId
    );
  }

  /**
   * Delete a conversation
   */
  async delete(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      console.error(`Error deleting conversation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, message: ConversationMessage): Promise<ConversationMessage> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    // Add the message to the conversation
    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    
    // Save the updated conversation
    await this.save(conversation);
    
    return message;
  }

  /**
   * Find recent conversations
   */
  async findRecentConversations(limit = 10): Promise<Conversation[]> {
    const conversations = await this.findAll();
    
    // Sort conversations by updatedAt date (most recent first)
    return conversations
      .sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get the file path for a conversation ID
   */
  private getFilePath(id: string): string {
    return path.join(this.baseDir, `${id}.json`);
  }

  /**
   * Parse a conversation from JSON, ensuring dates are properly converted
   */
  private parseConversation(data: any): Conversation {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      messages: data.messages.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt)
      }))
    };
  }
}