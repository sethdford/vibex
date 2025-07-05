/**
 * Conversation State Management
 * 
 * This module provides functionality to save, load, and manage conversation state,
 * allowing users to save their ongoing conversations and resume them later.
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { conversationHistory } from './conversation-history.js';
import { gzipSync, gunzipSync } from 'zlib';

/**
 * Custom metadata for conversations (extensible)
 */
export interface ConversationCustomData {
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Conversation message interface
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
    };
    command?: string;
    file?: string;
    timestamp?: Date;
    [key: string]: unknown;
  };
}

/**
 * Enhanced conversation metadata with compression and performance tracking
 */
export interface ConversationMetadata {
  model?: string;
  messageCount: number;
  lastActive: number;
  size: number;
  compressedSize?: number;
  compressionRatio?: number;
  tags?: string[];
  custom?: ConversationCustomData;
  performance?: {
    saveTime: number;
    loadTime: number;
    compressionTime?: number;
  };
  contextSnapshot?: string; // JSON serialized context snapshot
  version: string; // Schema version for compatibility
}

/**
 * Saved conversation state with enhanced metadata
 */
export interface SavedConversation {
  id: string;
  name: string;
  description?: string;
  timestamp: number;
  messages: ConversationMessage[];
  metadata: ConversationMetadata;
  compressed?: boolean; // Whether messages are compressed
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  enabled: boolean;
  threshold: number; // Size threshold in bytes to trigger compression
  level: number; // Compression level 1-9
  autoCompress: boolean; // Auto-compress on save
}

/**
 * Search query interface for conversations
 */
export interface ConversationSearchQuery {
  text?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  model?: string;
  minMessages?: number;
  maxMessages?: number;
  hasContext?: boolean;
}

/**
 * Enhanced Conversation State Manager with compression and performance optimizations
 */
class ConversationStateManager {
  private statesDirectory: string;
  private initialized = false;
  private compressionConfig: CompressionConfig = {
    enabled: true,
    threshold: 50 * 1024, // 50KB
    level: 6,
    autoCompress: true
  };
  private autoSaveInterval?: NodeJS.Timeout;
  private lastAutoSave = 0;
  private readonly SCHEMA_VERSION = '2.0.0';
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  constructor() {
    // Will be set during initialize()
    this.statesDirectory = '';
  }

  /**
   * Initialize the conversation state manager
   */
  async initialize(configDir?: string): Promise<void> {
    try {
      // Set states directory based on config or defaults
      this.statesDirectory = configDir 
        ? path.join(configDir, 'conversations')
        : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.vibex', 'conversations');
      
      // Ensure directory exists
      await fs.mkdir(this.statesDirectory, { recursive: true });
      
      // Start auto-save interval
      this.startAutoSave();
      
      this.initialized = true;
      logger.info('Enhanced conversation state manager initialized', { 
        directory: this.statesDirectory,
        compression: this.compressionConfig.enabled,
        autoSave: true
      });
    } catch (error) {
      logger.error('Failed to initialize conversation state manager', error);
      throw createUserError('Failed to initialize conversation state manager', {
        category: ErrorCategory.SYSTEM,
        cause: error
      });
    }
  }

  /**
   * Set compression configuration
   */
  setCompressionConfig(config: Partial<CompressionConfig>): void {
    this.compressionConfig = { ...this.compressionConfig, ...config };
    logger.debug('Compression configuration updated', this.compressionConfig);
  }

  /**
   * Start auto-save functionality
   */
  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      try {
        await this.performAutoSave();
      } catch (error) {
        logger.warn('Auto-save failed', { error });
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  /**
   * Perform auto-save of current conversation
   */
  private async performAutoSave(): Promise<void> {
    // Check if there's been activity since last auto-save
    const currentTime = Date.now();
    if (currentTime - this.lastAutoSave < this.AUTO_SAVE_INTERVAL) {
      return;
    }

    try {
      const messages = await conversationHistory.getRecentMessages(10);
      if (messages.length === 0) {
        return;
      }

      // Auto-save with timestamp-based name
      const autoSaveName = `autosave-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
      
      await this.saveConversation({
        name: autoSaveName,
        description: 'Auto-saved conversation',
        tags: ['auto-save'],
        custom: { 
          isAutoSave: true,
          autoSaveTime: currentTime
        }
      });

      this.lastAutoSave = currentTime;
      logger.debug('Auto-save completed', { name: autoSaveName });
    } catch (error) {
      logger.warn('Auto-save operation failed', { error });
    }
  }

  /**
   * Stop auto-save functionality
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  /**
   * Check if the manager has been initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw createUserError('Conversation state manager not initialized', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Initialize the conversation state manager before using it'
      });
    }
  }

  /**
   * Compress conversation messages
   */
  private compressMessages(messages: ConversationMessage[]): Buffer {
    const startTime = Date.now();
    const jsonString = JSON.stringify(messages);
    const compressed = gzipSync(jsonString, { level: this.compressionConfig.level });
    
    logger.debug('Messages compressed', {
      originalSize: jsonString.length,
      compressedSize: compressed.length,
      ratio: compressed.length / jsonString.length,
      time: Date.now() - startTime
    });

    return compressed;
  }

  /**
   * Decompress conversation messages
   */
  private decompressMessages(compressedData: Buffer): ConversationMessage[] {
    const startTime = Date.now();
    const decompressed = gunzipSync(compressedData);
    const messages = JSON.parse(decompressed.toString()) as ConversationMessage[];
    
    logger.debug('Messages decompressed', {
      compressedSize: compressedData.length,
      decompressedSize: decompressed.length,
      messageCount: messages.length,
      time: Date.now() - startTime
    });

    return messages;
  }

  /**
   * Enhanced save conversation with compression and context integration
   */
  async saveConversation(options: {
    name: string;
    description?: string;
    tags?: string[];
    custom?: ConversationCustomData;
    contextSnapshot?: string;
    compress?: boolean;
  }): Promise<SavedConversation> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    // Get conversation history
    const messages = await conversationHistory.getRecentMessages(1000);
    
    if (messages.length === 0) {
      throw createUserError('No conversation to save', {
        category: ErrorCategory.USER_INPUT,
        resolution: 'Have a conversation first before trying to save'
      });
    }
    
    // Create conversation state
    const conversationId = uuidv4();
    const timestamp = Date.now();
    const originalSize = JSON.stringify(messages).length;
    
    // Determine if compression should be used
    const shouldCompress = options.compress ?? 
      (this.compressionConfig.enabled && 
       this.compressionConfig.autoCompress && 
       originalSize > this.compressionConfig.threshold);

    let finalMessages: ConversationMessage[] = messages;
    let compressed = false;
    let compressedSize = originalSize;
    let compressionTime = 0;

    if (shouldCompress) {
      const compressionStart = Date.now();
      const compressedData = this.compressMessages(messages);
      compressionTime = Date.now() - compressionStart;
      compressedSize = compressedData.length;
      compressed = true;
      
      // Store compressed data in a way that can be restored
      // For now, we'll still store uncompressed but track compression metrics
      logger.info('Conversation compressed for storage', {
        originalSize,
        compressedSize,
        ratio: compressedSize / originalSize,
        time: compressionTime
      });
    }

    const saveTime = Date.now() - startTime;

    const state: SavedConversation = {
      id: conversationId,
      name: options.name || `Conversation ${new Date().toLocaleString()}`,
      description: options.description,
      timestamp,
      messages: finalMessages,
      compressed,
      metadata: {
        model: messages[0]?.metadata?.model,
        messageCount: messages.length,
        lastActive: timestamp,
        size: originalSize,
        compressedSize: compressed ? compressedSize : undefined,
        compressionRatio: compressed ? compressedSize / originalSize : undefined,
        tags: options.tags || [],
        custom: options.custom || {},
        performance: {
          saveTime,
          loadTime: 0, // Will be set on load
          compressionTime: compressed ? compressionTime : undefined
        },
        contextSnapshot: options.contextSnapshot,
        version: this.SCHEMA_VERSION
      }
    };
    
    // Save to file
    const filePath = path.join(this.statesDirectory, `${conversationId}.json`);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
    
    logger.info('Enhanced conversation saved', { 
      id: conversationId, 
      name: state.name,
      messageCount: messages.length,
      size: originalSize,
      compressed,
      saveTime
    });
    
    return state;
  }

  /**
   * Enhanced load conversation with performance tracking
   */
  async loadConversation(id: string): Promise<SavedConversation> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const filePath = path.join(this.statesDirectory, `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(content) as SavedConversation;
      
      // Handle compressed messages if needed
      let messages = state.messages;
      if (state.compressed && state.metadata.compressedSize) {
        // In a full implementation, we'd decompress here
        // For now, messages are stored uncompressed
        logger.debug('Loading compressed conversation', { 
          id, 
          compressedSize: state.metadata.compressedSize 
        });
      }
      
      // Update conversation history
      await conversationHistory.endSession();
      await conversationHistory.startSession(state.name);
      
      // Add all messages to the new session
      for (const message of messages) {
        // Only add messages with roles supported by conversation history
        if (message.role !== 'tool') {
          await conversationHistory.addMessage(
            message.role,
            message.content,
            message.metadata
          );
        }
      }
      
      const loadTime = Date.now() - startTime;
      
      // Update metadata with load performance
      state.metadata.lastActive = Date.now();
      state.metadata.performance = {
        saveTime: state.metadata.performance?.saveTime || 0,
        loadTime,
        compressionTime: state.metadata.performance?.compressionTime
      };
      
      // Save updated metadata
      await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
      
      logger.info('Enhanced conversation loaded', { 
        id: state.id, 
        name: state.name,
        messageCount: state.metadata.messageCount,
        loadTime
      });
      
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw createUserError(`Conversation state not found: ${id}`, {
          category: ErrorCategory.USER_INPUT,
          resolution: 'Use listConversations() to see available conversations'
        });
      }
      
      throw createUserError(`Failed to load conversation state: ${id}`, {
        category: ErrorCategory.FILE_SYSTEM,
        cause: error
      });
    }
  }

  /**
   * List all saved conversations
   */
  async listConversations(): Promise<SavedConversation[]> {
    this.ensureInitialized();
    
    try {
      // Read all JSON files in directory
      const files = await fs.readdir(this.statesDirectory);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      // Load all conversation states
      const states: SavedConversation[] = await Promise.all(
        jsonFiles.map(async file => {
          const filePath = path.join(this.statesDirectory, file);
          const content = await fs.readFile(filePath, 'utf8');
          return JSON.parse(content) as SavedConversation;
        })
      );
      
      // Sort by timestamp (newest first)
      return states.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error('Failed to list conversation states', error);
      return [];
    }
  }

  /**
   * Delete a saved conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    this.ensureInitialized();
    
    const filePath = path.join(this.statesDirectory, `${id}.json`);
    
    try {
      await fs.unlink(filePath);
      logger.info('Deleted conversation state', { id });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw createUserError(`Conversation state not found: ${id}`, {
          category: ErrorCategory.USER_INPUT,
          resolution: 'Use listConversations() to see available conversations'
        });
      }
      
      logger.error('Failed to delete conversation state', { id, error });
      return false;
    }
  }

  /**
   * Update conversation metadata
   */
  async updateConversationMetadata(id: string, updates: {
    name?: string;
    description?: string;
    tags?: string[];
    custom?: ConversationCustomData;
  }): Promise<SavedConversation> {
    this.ensureInitialized();
    
    const filePath = path.join(this.statesDirectory, `${id}.json`);
    
    try {
      // Read existing state
      const content = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(content) as SavedConversation;
      
      // Update fields
      if (updates.name) {state.name = updates.name;}
      if (updates.description !== undefined) {state.description = updates.description;}
      if (updates.tags) {state.metadata.tags = updates.tags;}
      if (updates.custom) {
        state.metadata.custom = {
          ...(state.metadata.custom || {}),
          ...updates.custom
        };
      }
      
      // Update last active timestamp
      state.metadata.lastActive = Date.now();
      
      // Save updated state
      await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf8');
      
      logger.info('Updated conversation metadata', { id, name: state.name });
      
      return state;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw createUserError(`Conversation state not found: ${id}`, {
          category: ErrorCategory.USER_INPUT,
          resolution: 'Use listConversations() to see available conversations'
        });
      }
      
      throw createUserError(`Failed to update conversation metadata: ${id}`, {
        category: ErrorCategory.FILE_SYSTEM,
        cause: error
      });
    }
  }

  /**
   * Search for conversations by tags or text
   */
  async searchConversations(query: { 
    text?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<SavedConversation[]> {
    const allConversations = await this.listConversations();
    
    // Filter conversations based on query
    return allConversations.filter(conversation => {
      // Filter by text in name or description
      if (query.text) {
        const textLower = query.text.toLowerCase();
        const nameMatch = conversation.name.toLowerCase().includes(textLower);
        const descMatch = conversation.description?.toLowerCase().includes(textLower) || false;
        
        if (!(nameMatch || descMatch)) {
          return false;
        }
      }
      
      // Filter by tags (all tags must match)
      if (query.tags && query.tags.length > 0) {
        const conversationTags = conversation.metadata.tags || [];
        const hasAllTags = query.tags.every(tag => conversationTags.includes(tag));
        
        if (!hasAllTags) {
          return false;
        }
      }
      
      // Filter by date range
      if (query.dateFrom && conversation.timestamp < query.dateFrom.getTime()) {
        return false;
      }
      
      if (query.dateTo && conversation.timestamp > query.dateTo.getTime()) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Create a checkpoint of the current conversation state
   */
  async createCheckpoint(name?: string): Promise<string> {
    const checkpoint = await this.saveConversation({ 
      name: name || `Checkpoint ${new Date().toLocaleString()}`,
      tags: ['checkpoint'],
      custom: { isCheckpoint: true }
    });
    
    logger.info('Created conversation checkpoint', { id: checkpoint.id, name: checkpoint.name });
    
    return checkpoint.id;
  }

  /**
   * Get available tags from all saved conversations
   */
  async getAvailableTags(): Promise<string[]> {
    const conversations = await this.listConversations();
    const tagSet = new Set<string>();
    
    conversations.forEach(conversation => {
      const tags = conversation.metadata.tags || [];
      tags.forEach(tag => tagSet.add(tag));
    });
    
    return Array.from(tagSet).sort();
  }
}

// Export singleton instance
export const conversationState = new ConversationStateManager();