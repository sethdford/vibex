/**
 * Memory Management System
 * 
 * Sophisticated memory management for AI conversations with persistent
 * storage, context optimization, and retrieval capabilities.
 */

import { EventEmitter } from 'events';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ContentGenerator, type MemoryStats } from './content-generator.js';
import { MemoryManager, MemoryOptimizationStrategy, type MemoryCompressionResult } from './memory-manager.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Memory Storage Types
 */
export enum MemoryStorageType {
  SESSION = 'session',
  USER = 'user',
  SYSTEM = 'system',
  GLOBAL = 'global',
  WORKSPACE = 'workspace',
  PROJECT = 'project',
}

/**
 * Memory Entry Tags
 */
export interface MemoryTag {
  name: string;
  value?: string;
}

/**
 * Memory Entry
 */
export interface MemoryEntry {
  /**
   * Unique ID
   */
  id: string;
  
  /**
   * Memory creation timestamp
   */
  createdAt: number;
  
  /**
   * Last access timestamp
   */
  lastAccessedAt: number;
  
  /**
   * Access count
   */
  accessCount: number;
  
  /**
   * Memory type
   */
  type: MemoryStorageType;
  
  /**
   * Memory content
   */
  content: MemoryContent;
  
  /**
   * Content type (json, string, message, etc.)
   */
  contentType: string;
  
  /**
   * Optional expiry timestamp
   */
  expiresAt?: number;
  
  /**
   * Optional tags for categorization
   */
  tags?: MemoryTag[];
  
  /**
   * Optional importance score (0-100)
   */
  importance?: number;
  
  /**
   * Optional embedding vector
   */
  embedding?: number[];
}

/**
 * Memory content interface
 */
export interface MemoryContent {
  [key: string]: unknown;
}

/**
 * Memory events
 */
export enum MemoryEvent {
  STORE = 'memory:store',
  RETRIEVE = 'memory:retrieve',
  UPDATE = 'memory:update',
  DELETE = 'memory:delete',
  OPTIMIZE = 'memory:optimize',
  EMBED = 'memory:embed',
  IMPORT = 'memory:import',
  EXPORT = 'memory:export',
  ERROR = 'memory:error',
  SUMMARIZE = 'memory:summarize',
  CONTEXT_UPDATED = 'memory:context_updated',
}

/**
 * Memory retrieval options
 */
export interface MemoryRetrievalOptions {
  /**
   * Maximum entries to retrieve
   */
  limit?: number;
  
  /**
   * Sort order
   */
  sort?: 'importance' | 'recency' | 'relevance' | 'access';
  
  /**
   * Filter by tags
   */
  tags?: string[];
  
  /**
   * Filter by type
   */
  type?: MemoryStorageType;
  
  /**
   * Similarity threshold for semantic search
   */
  similarityThreshold?: number;
  
  /**
   * Include expired entries
   */
  includeExpired?: boolean;
}

/**
 * Memory storage options
 */
export interface MemoryStorageOptions {
  /**
   * Memory storage directory
   */
  storageDir?: string;
  
  /**
   * Auto-save on changes
   */
  autoSave?: boolean;
  
  /**
   * Auto-load on startup
   */
  autoLoad?: boolean;
  
  /**
   * Encrypt memory (uses encryption key)
   */
  encrypt?: boolean;
  
  /**
   * Compression level (0-9)
   */
  compressionLevel?: number;
  
  /**
   * Max entries per type
   */
  maxEntries?: Record<MemoryStorageType, number>;
  
  /**
   * Auto-prune old entries
   */
  autoPrune?: boolean;
}

/**
 * Message interface
 */
export interface Message {
  [key: string]: unknown;
}

/**
 * Memory Management System
 */
export class MemorySystem extends EventEmitter {
  private readonly memoryManager: MemoryManager;
  private readonly contentGenerator: ContentGenerator;
  private memories: Map<string, MemoryEntry> = new Map();
  private readonly options: Required<MemoryStorageOptions>;
  private sessionContext: MessageParam[] = [];
  private readonly encryptionKey?: Buffer;
  private currentModel: string;
  
  constructor(
    contentGenerator: ContentGenerator,
    options: MemoryStorageOptions = {},
    encryptionKey?: string
  ) {
    super();
    
    this.contentGenerator = contentGenerator;
    this.memoryManager = new MemoryManager(contentGenerator);
    this.currentModel = contentGenerator.getDefaultModel();
    
    // Set default options
    this.options = {
      storageDir: path.join(process.cwd(), '.vibex', 'memory'),
      autoSave: true,
      autoLoad: true,
      encrypt: !!encryptionKey,
      compressionLevel: 6,
      maxEntries: {
        [MemoryStorageType.SESSION]: 100,
        [MemoryStorageType.USER]: 50,
        [MemoryStorageType.SYSTEM]: 20,
        [MemoryStorageType.GLOBAL]: 10,
        [MemoryStorageType.WORKSPACE]: 100,
        [MemoryStorageType.PROJECT]: 50,
      },
      autoPrune: true,
      ...options
    };
    
    // Set encryption key if provided
    if (encryptionKey && this.options.encrypt) {
      this.encryptionKey = Buffer.from(
        crypto.createHash('sha256').update(encryptionKey).digest()
      );
    }
    
    // Initialize memory storage
    this.initialize();
  }
  
  /**
   * Store a memory entry
   */
  public async store(
    key: string,
    content: MemoryContent,
    type: MemoryStorageType = MemoryStorageType.SESSION,
    tags: MemoryTag[] = [],
    importance: number = 50,
    ttl?: number
  ): Promise<MemoryEntry> {
    const id = this.generateId(key, type);
    const now = Date.now();
    
    // Check if entry already exists
    const existingEntry = this.memories.get(id);
    
    const entry: MemoryEntry = {
      id,
      createdAt: existingEntry?.createdAt || now,
      lastAccessedAt: now,
      accessCount: existingEntry ? existingEntry.accessCount + 1 : 1,
      type,
      content,
      contentType: this.getContentType(content),
      tags,
      importance,
      ...(ttl && { expiresAt: now + ttl })
    };
    
    // Store the memory
    this.memories.set(id, entry);
    
    // Generate embedding if it's a text-based content
    if (this.isTextContent(content)) {
      try {
        const text = this.getTextFromContent(content);
        const embeddings = await this.generateEmbeddings([text]);
        if (embeddings.length > 0) {
          entry.embedding = embeddings[0];
        }
      } catch (error) {
        logger.warn('Failed to generate embeddings for memory', { key, error });
      }
    }
    
    // Auto-save if enabled
    if (this.options.autoSave) {
      await this.save();
    }
    
    // Enforce memory limits and prune if needed
    if (this.options.autoPrune) {
      await this.pruneMemories(type);
    }
    
    this.emit(MemoryEvent.STORE, { key, type });
    
    return entry;
  }
  
  /**
   * Retrieve a memory entry
   */
  public retrieve(key: string, type: MemoryStorageType = MemoryStorageType.SESSION): MemoryEntry | undefined {
    const id = this.generateId(key, type);
    const entry = this.memories.get(id);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key, type);
      return undefined;
    }
    
    // Update access metrics
    entry.lastAccessedAt = Date.now();
    entry.accessCount += 1;
    
    this.emit(MemoryEvent.RETRIEVE, { key, type });
    
    return entry;
  }
  
  /**
   * Retrieve memory content directly
   */
  public get(key: string, type: MemoryStorageType = MemoryStorageType.SESSION): unknown {
    const entry = this.retrieve(key, type);
    return entry ? entry.content : undefined;
  }
  
  /**
   * Delete a memory entry
   */
  public async delete(key: string, type: MemoryStorageType = MemoryStorageType.SESSION): Promise<boolean> {
    const id = this.generateId(key, type);
    const deleted = this.memories.delete(id);
    
    if (deleted && this.options.autoSave) {
      await this.save();
    }
    
    if (deleted) {
      this.emit(MemoryEvent.DELETE, { key, type });
    }
    
    return deleted;
  }
  
  /**
   * Update a memory entry
   */
  public async update(
    key: string,
    content: MemoryContent,
    type: MemoryStorageType = MemoryStorageType.SESSION,
    updateOptions: { tags?: MemoryTag[]; importance?: number; ttl?: number } = {}
  ): Promise<MemoryEntry | undefined> {
    const id = this.generateId(key, type);
    const entry = this.memories.get(id);
    
    if (!entry) {
      return undefined;
    }
    
    // Update fields
    entry.content = content;
    entry.contentType = this.getContentType(content);
    entry.lastAccessedAt = Date.now();
    
    if (updateOptions.tags !== undefined) {
      entry.tags = updateOptions.tags;
    }
    
    if (updateOptions.importance !== undefined) {
      entry.importance = updateOptions.importance;
    }
    
    if (updateOptions.ttl !== undefined) {
      entry.expiresAt = Date.now() + updateOptions.ttl;
    }
    
    // Update embedding if it's text-based content
    if (this.isTextContent(content)) {
      try {
        const text = this.getTextFromContent(content);
        const embeddings = await this.generateEmbeddings([text]);
        if (embeddings.length > 0) {
          entry.embedding = embeddings[0];
        }
      } catch (error) {
        logger.warn('Failed to generate embeddings for memory', { key, error });
      }
    }
    
    // Save if auto-save is enabled
    if (this.options.autoSave) {
      await this.save();
    }
    
    this.emit(MemoryEvent.UPDATE, { key, type });
    
    return entry;
  }
  
  /**
   * Search for memory entries by text similarity
   */
  public async searchSimilar(
    text: string,
    options: MemoryRetrievalOptions = {}
  ): Promise<MemoryEntry[]> {
    try {
      // Generate embedding for query
      const queryEmbeddings = await this.generateEmbeddings([text]);
      
      if (!queryEmbeddings.length) {
        logger.warn('Failed to generate embeddings for search query');
        return [];
      }
      
      const queryEmbedding = queryEmbeddings[0];
      const similarityThreshold = options.similarityThreshold ?? 0.7;
      
      // Find memories with embeddings
      const memoriesWithEmbeddings = Array.from(this.memories.values())
        .filter(entry => {
          // Apply filters
          if (options.type && entry.type !== options.type) return false;
          if (!options.includeExpired && entry.expiresAt && Date.now() > entry.expiresAt) return false;
          if (options.tags && options.tags.length && 
              (!entry.tags || !entry.tags.length || !options.tags.every(tag => 
                entry.tags!.some(entryTag => entryTag.name === tag)
              ))) return false;
          
          // Must have embedding
          return !!entry.embedding;
        });
      
      // Calculate similarities and sort
      const memoriesWithSimilarity = memoriesWithEmbeddings.map(entry => ({
        entry,
        similarity: this.cosineSimilarity(queryEmbedding, entry.embedding!)
      }))
      .filter(item => item.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity);
      
      // Apply limit
      const limit = options.limit || 10;
      const results = memoriesWithSimilarity
        .slice(0, limit)
        .map(item => item.entry);
      
      return results;
    } catch (error) {
      logger.error('Error searching memories by similarity', error);
      return [];
    }
  }
  
  /**
   * Search for memory entries by tag
   */
  public searchByTags(
    tags: string[],
    options: MemoryRetrievalOptions = {}
  ): MemoryEntry[] {
    if (!tags.length) return [];
    
    const matches = Array.from(this.memories.values())
      .filter(entry => {
        // Apply filters
        if (options.type && entry.type !== options.type) return false;
        if (!options.includeExpired && entry.expiresAt && Date.now() > entry.expiresAt) return false;
        
        // Check if entry has all the required tags
        return entry.tags && entry.tags.length > 0 && tags.every(tag => 
          entry.tags!.some(entryTag => entryTag.name === tag)
        );
      });
    
    // Sort entries
    const sorted = this.sortEntries(matches, options.sort || 'importance');
    
    // Apply limit
    const limit = options.limit || 10;
    return sorted.slice(0, limit);
  }
  
  /**
   * Get all memories of a specific type
   */
  public getByType(
    type: MemoryStorageType,
    options: MemoryRetrievalOptions = {}
  ): MemoryEntry[] {
    const matches = Array.from(this.memories.values())
      .filter(entry => {
        // Apply filters
        if (entry.type !== type) return false;
        if (!options.includeExpired && entry.expiresAt && Date.now() > entry.expiresAt) return false;
        if (options.tags && options.tags.length && 
            (!entry.tags || !entry.tags.length || !options.tags.every(tag => 
              entry.tags!.some(entryTag => entryTag.name === tag)
            ))) return false;
        
        return true;
      });
    
    // Sort entries
    const sorted = this.sortEntries(matches, options.sort || 'importance');
    
    // Apply limit
    const limit = options.limit || 100;
    return sorted.slice(0, limit);
  }
  
  /**
   * Get memory usage statistics
   */
  public async getStats(): Promise<{
    countByType: Record<MemoryStorageType, number>;
    totalEntries: number;
    totalSizeBytes: number;
    contextMemoryStats: MemoryStats;
  }> {
    // Count entries by type
    const countByType = Object.values(MemoryStorageType).reduce(
      (acc, type) => ({
        ...acc,
        [type]: Array.from(this.memories.values()).filter(entry => entry.type === type).length
      }),
      {} as Record<MemoryStorageType, number>
    );
    
    // Get session context memory stats
    const contextMemoryStats = await this.memoryManager.getMemoryStats(
      this.sessionContext,
      this.currentModel
    );
    
    // Estimate total size
    const memoriesJson = JSON.stringify(Array.from(this.memories.entries()));
    const totalSizeBytes = Buffer.byteLength(memoriesJson, 'utf8');
    
    return {
      countByType,
      totalEntries: this.memories.size,
      totalSizeBytes,
      contextMemoryStats
    };
  }
  
  /**
   * Save memories to disk
   */
  public async save(filePath?: string): Promise<void> {
    const savePath = filePath || path.join(this.options.storageDir, 'memories.json');
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      
      // Prepare data for serialization
      const data = Array.from(this.memories.entries());
      
      // Encrypt if needed
      let serialized: string;
      
      if (this.options.encrypt && this.encryptionKey) {
        serialized = this.encrypt(JSON.stringify(data));
      } else {
        serialized = JSON.stringify(data);
      }
      
      // Write to file
      await fs.writeFile(savePath, serialized, 'utf8');
      
      logger.debug('Memory saved successfully', { path: savePath });
    } catch (error) {
      logger.error('Failed to save memory', error);
      this.emit(MemoryEvent.ERROR, {
        operation: 'save',
        error
      });
    }
  }
  
  /**
   * Load memories from disk
   */
  public async load(filePath?: string): Promise<boolean> {
    const loadPath = filePath || path.join(this.options.storageDir, 'memories.json');
    
    try {
      // Check if file exists
      try {
        await fs.access(loadPath);
      } catch (_e) {
        logger.debug('Memory file not found, starting with empty memory', { path: loadPath });
        return false;
      }
      
      // Read file
      const fileContent = await fs.readFile(loadPath, 'utf8');
      
      // Decrypt if needed
      let parsed: [string, MemoryEntry][];
      
      if (this.options.encrypt && this.encryptionKey) {
        const decrypted = this.decrypt(fileContent);
        parsed = JSON.parse(decrypted);
      } else {
        parsed = JSON.parse(fileContent);
      }
      
      // Restore memories
      this.memories = new Map(parsed);
      
      logger.debug('Memory loaded successfully', { 
        path: loadPath,
        entries: this.memories.size
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to load memory', error);
      this.emit(MemoryEvent.ERROR, {
        operation: 'load',
        error
      });
      
      return false;
    }
  }
  
  /**
   * Clear all memories
   */
  public clear(): void {
    this.memories.clear();
    logger.debug('Memory cleared');
  }
  
  /**
   * Set session context for conversation
   */
  public setContext(messages: MessageParam[]): void {
    this.sessionContext = [...messages];
    this.emit(MemoryEvent.CONTEXT_UPDATED, {
      messageCount: messages.length
    });
  }
  
  /**
   * Get current session context
   */
  public getContext(): MessageParam[] {
    return [...this.sessionContext];
  }
  
  /**
   * Optimize session context
   */
  public async optimizeContext(
    strategy: MemoryOptimizationStrategy = MemoryOptimizationStrategy.SUMMARIZE,
    force: boolean = false
  ): Promise<MemoryCompressionResult | null> {
    try {
      // Check if optimization is needed
      const needsOptimization = force || await this.memoryManager.isCompressionNeeded(
        this.sessionContext,
        this.currentModel
      );
      
      if (!needsOptimization) {
        return null;
      }
      
      // Optimize the context
      const result = await this.memoryManager.optimizeMemory(
        this.sessionContext,
        this.currentModel,
        strategy
      );
      
      this.emit(MemoryEvent.OPTIMIZE, {
        strategy,
        originalTokens: result.originalTokenCount,
        newTokens: result.newTokenCount,
        compressionRatio: result.compressionRatio
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to optimize context', error);
      this.emit(MemoryEvent.ERROR, {
        operation: 'optimize',
        error
      });
      
      return null;
    }
  }
  
  /**
   * Summarize a set of memory entries into a single memory
   */
  public async summarizeMemories(
    keys: string[],
    type: MemoryStorageType = MemoryStorageType.SESSION,
    targetKey: string = 'summary'
  ): Promise<MemoryEntry | undefined> {
    try {
      // Get all entries
      const entries = keys.map(key => this.retrieve(key, type)).filter(Boolean) as MemoryEntry[];
      
      if (entries.length === 0) {
        return undefined;
      }
      
      // Extract content
      const contents = entries.map(entry => {
        const content = entry.content;
        return this.getTextFromContent(content);
      });
      
      // Generate summary prompt
      const summaryPrompt: MessageParam[] = [
        {
          role: 'user',
          content: `Please summarize the following information concisely while preserving key facts, concepts, and details:
          
${contents.join('\n\n')}`
        }
      ];
      
      // Generate summary
      const response = await this.contentGenerator.generate(
        summaryPrompt,
        { model: this.currentModel }
      );
      
      const summaryText = response.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('');
      
      if (!summaryText) {
        return undefined;
      }
      
      // Calculate average importance
      const avgImportance = Math.round(
        entries.reduce((sum, entry) => sum + (entry.importance || 50), 0) / entries.length
      );
      
      // Merge tags
      const mergedTags: MemoryTag[] = [];
      entries.forEach(entry => {
        entry.tags?.forEach(tag => {
          if (!mergedTags.some(t => t.name === tag.name)) {
            mergedTags.push(tag);
          }
        });
      });
      
      // Add summary tag
      mergedTags.push({ name: 'summary' });
      
      // Store summary as new memory
      const summary = await this.store(
        targetKey,
        { text: summaryText },
        type,
        mergedTags,
        avgImportance
      );
      
      this.emit(MemoryEvent.SUMMARIZE, {
        sourceCount: entries.length,
        targetKey,
        type
      });
      
      return summary;
    } catch (error) {
      logger.error('Failed to summarize memories', error);
      this.emit(MemoryEvent.ERROR, {
        operation: 'summarize',
        error
      });
      
      return undefined;
    }
  }
  
  /**
   * Set the current model for embedding and summarization
   */
  public setModel(model: string): void {
    if (this.contentGenerator.isModelAvailable(model)) {
      this.currentModel = model;
    }
  }
  
  /**
   * Initialize the memory system
   */
  private async initialize(): Promise<void> {
    if (this.options.autoLoad) {
      await this.load();
    }
    
    logger.debug('Memory System initialized');
  }
  
  /**
   * Generate embeddings for text
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    
    try {
      // This is a simplified approach - in a real implementation
      // we would call an embedding API
      
      // For now, we'll return dummy embeddings
      return texts.map(text => {
        const hash = crypto.createHash('sha256').update(text).digest();
        // Generate a 384-dimensional embedding
        const embedding = new Array(384).fill(0);
        for (let i = 0; i < hash.length; i++) {
          embedding[i % 384] = hash[i] / 255;
        }
        return embedding;
      });
    } catch (error) {
      logger.error('Failed to generate embeddings', error);
      return [];
    }
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Sort memory entries by specified criterion
   */
  private sortEntries(entries: MemoryEntry[], sortBy: string): MemoryEntry[] {
    switch (sortBy) {
      case 'importance':
        return [...entries].sort((a, b) => (b.importance || 0) - (a.importance || 0));
      
      case 'recency':
        return [...entries].sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
      
      case 'access':
        return [...entries].sort((a, b) => b.accessCount - a.accessCount);
      
      default:
        return entries;
    }
  }
  
  /**
   * Prune memories based on limits
   */
  private async pruneMemories(type: MemoryStorageType): Promise<void> {
    const maxAllowed = this.options.maxEntries[type];
    const entriesOfType = Array.from(this.memories.values())
      .filter(entry => entry.type === type);
    
    if (entriesOfType.length <= maxAllowed) {
      return;
    }
    
    // Sort by importance and recency
    const sorted = entriesOfType.sort((a, b) => {
      // Primary sort by importance
      const importanceDiff = (b.importance || 0) - (a.importance || 0);
      if (importanceDiff !== 0) return importanceDiff;
      
      // Secondary sort by recency
      return b.lastAccessedAt - a.lastAccessedAt;
    });
    
    // Remove excess entries
    const toRemove = sorted.slice(maxAllowed);
    for (const entry of toRemove) {
      this.memories.delete(entry.id);
    }
    
    logger.debug(`Pruned ${toRemove.length} memories of type ${type}`);
  }
  
  /**
   * Generate a unique ID for a memory key
   */
  private generateId(key: string, type: MemoryStorageType): string {
    return `${type}:${key}`;
  }
  
  /**
   * Get content type from content
   */
  private getContentType(content: MemoryContent): string {
    if (typeof content === 'string') {
      return 'string';
    }
    
    if (Array.isArray(content)) {
      if (content.every(item => item.role && item.content)) {
        return 'message';
      }
      return 'array';
    }
    
    if (typeof content === 'object') {
      return 'json';
    }
    
    return typeof content;
  }
  
  /**
   * Check if content is text-based
   */
  private isTextContent(content: MemoryContent): boolean {
    const type = this.getContentType(content);
    return ['string', 'message', 'json'].includes(type);
  }
  
  /**
   * Extract text from content for embedding
   */
  private getTextFromContent(content: MemoryContent): string {
    const type = this.getContentType(content);
    
    switch (type) {
      case 'string':
        return typeof content === 'string' ? content : (content.text as string) || String(content);
      
      case 'message':
        return Array.isArray(content) ? content.map((msg: Message) => {
          const role = msg.role || 'unknown';
          const msgContent = typeof msg.content === 'string' 
            ? msg.content 
            : JSON.stringify(msg.content);
          return `${role}: ${msgContent}`;
        }).join('\n') : String(content);
      
      case 'json':
        return JSON.stringify(content, null, 2);
      
      default:
        return String(content);
    }
  }
  
  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Decrypt data
   */
  private decrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not set');
    }
    
    const parts = data.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

/**
 * Create a memory system
 */
export function createMemorySystem(
  contentGenerator: ContentGenerator,
  options?: MemoryStorageOptions,
  encryptionKey?: string
): MemorySystem {
  return new MemorySystem(contentGenerator, options, encryptionKey);
}