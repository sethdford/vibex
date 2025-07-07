/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import os from 'os';
import { ConversationService } from './conversation-service';
import { FileMemoryService } from './memory-service';
import { FileConversationRepository } from '../infrastructure/repositories/file-conversation-repository';
import { ClaudeApiClient } from '../infrastructure/apis/claude-api';
import { MemoryService, ConversationRepository, ContentGenerator } from '../core/interfaces/types';

/**
 * Factory for creating services with proper dependency injection
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();
  
  // Default base directory for storage
  private baseDir = path.join(os.homedir(), '.vibex');
  
  // Singleton pattern
  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Configure the service factory
   */
  configure(config: { baseDir?: string }): void {
    if (config.baseDir) {
      this.baseDir = config.baseDir;
    }
    
    // Clear any existing services to ensure they're recreated with new config
    this.services.clear();
  }

  /**
   * Get the memory service instance
   */
  async getMemoryService(): Promise<MemoryService> {
    if (!this.services.has('memoryService')) {
      const memoryService = new FileMemoryService(
        path.join(this.baseDir, 'memory')
      );
      await memoryService.initialize();
      this.services.set('memoryService', memoryService);
    }
    
    return this.services.get('memoryService');
  }

  /**
   * Get the conversation repository instance
   */
  async getConversationRepository(): Promise<ConversationRepository> {
    if (!this.services.has('conversationRepository')) {
      const repository = new FileConversationRepository(
        path.join(this.baseDir, 'conversations')
      );
      await repository.initialize();
      this.services.set('conversationRepository', repository);
    }
    
    return this.services.get('conversationRepository');
  }

  /**
   * Get the content generator instance
   */
  getContentGenerator(apiKey: string): ContentGenerator {
    if (!this.services.has('contentGenerator')) {
      const generator = new ClaudeApiClient(apiKey);
      this.services.set('contentGenerator', generator);
    }
    
    return this.services.get('contentGenerator');
  }

  /**
   * Get the conversation service instance
   */
  async getConversationService(apiKey: string): Promise<ConversationService> {
    if (!this.services.has('conversationService')) {
      const repository = await this.getConversationRepository();
      const contentGenerator = this.getContentGenerator(apiKey);
      
      const service = new ConversationService(repository, contentGenerator);
      this.services.set('conversationService', service);
    }
    
    return this.services.get('conversationService');
  }
}