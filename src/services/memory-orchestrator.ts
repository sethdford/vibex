/**
 * Memory Orchestrator - Following Gemini CLI Architecture
 * 
 * Single Responsibility: Coordinate memory services without business logic
 * Clean service composition and event forwarding
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { MemoryStorageService, type StorageConfig, type StorageResult } from './memory-storage.js';
import { MemoryRetrievalService, type RetrievalConfig, type MemoryRetrievalOptions, type SearchResult } from './memory-retrieval.js';
import { MemoryPruningService, type PruningConfig, type PruningResult } from './memory-pruning.js';
import { MemoryEntry, MemoryStorageType, MemoryTag, MemoryContent, MemoryEvent } from '../types/memory.js';

/**
 * Memory system configuration
 */
export interface MemorySystemConfig {
  readonly storage: StorageConfig;
  readonly retrieval: RetrievalConfig;
  readonly pruning: PruningConfig;
  readonly autoSave: boolean;
  readonly autoPrune: boolean;
}

/**
 * Memory operation result
 */
export interface MemoryOperationResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly data?: unknown;
  readonly duration?: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  readonly totalEntries: number;
  readonly entriesByType: Record<MemoryStorageType, number>;
  readonly totalSizeBytes: number;
  readonly expiredEntries: number;
  readonly cacheStats: {
    size: number;
    hitRate: number;
  };
}

/**
 * Memory Orchestrator
 * Coordinates all memory services and provides unified API
 */
export class MemoryOrchestrator extends EventEmitter {
  private readonly config: MemorySystemConfig;
  private readonly storageService: MemoryStorageService;
  private readonly retrievalService: MemoryRetrievalService;
  private readonly pruningService: MemoryPruningService;
  private readonly memories = new Map<string, MemoryEntry>();
  private initialized = false;
  
  constructor(
    config: MemorySystemConfig,
    storageService: MemoryStorageService,
    retrievalService: MemoryRetrievalService,
    pruningService: MemoryPruningService,
    encryptionKey?: string
  ) {
    super();
    
    this.config = config;
    this.storageService = storageService;
    this.retrievalService = retrievalService;
    this.pruningService = pruningService;
    
    this.setupEventForwarding();
    this.setupAutoPruning();
    
    logger.debug('MemoryOrchestrator initialized');
  }
  
  /**
   * Initialize the memory system
   */
  public async initialize(): Promise<MemoryOperationResult> {
    const startTime = Date.now();
    
    try {
      // Load existing memories
      const loadResult = await this.storageService.load();
      
      if (loadResult.success && loadResult.memories) {
        this.memories.clear();
        for (const [id, entry] of loadResult.memories.entries()) {
          this.memories.set(id, entry);
        }
      }
      
      this.initialized = true;
      
      const result: MemoryOperationResult = {
        success: true,
        data: {
          entriesLoaded: this.memories.size,
          loadTime: loadResult.duration
        },
        duration: Date.now() - startTime
      };
      
      logger.info('Memory system initialized', result.data);
      return result;
    } catch (error) {
      const result: MemoryOperationResult = {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime
      };
      
      logger.error('Failed to initialize memory system', error);
      return result;
    }
  }
  
  /**
   * Store a memory entry
   */
  public async store(
    key: string,
    content: MemoryContent,
    type: MemoryStorageType = MemoryStorageType.SESSION,
    options: {
      tags?: MemoryTag[];
      importance?: number;
      ttl?: number;
    } = {}
  ): Promise<MemoryOperationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      const id = this.generateId(key, type);
      const now = Date.now();
      
      // Check if entry exists
      const existingEntry = this.memories.get(id);
      
      const entry: MemoryEntry = {
        id,
        createdAt: existingEntry?.createdAt || now,
        lastAccessedAt: now,
        accessCount: existingEntry ? existingEntry.accessCount + 1 : 1,
        type,
        content,
        contentType: this.getContentType(content),
        tags: options.tags || [],
        importance: options.importance || 50,
        ...(options.ttl && { expiresAt: now + options.ttl })
      };
      
      // Store in memory
      this.memories.set(id, entry);
      
      // Auto-save if enabled
      if (this.config.autoSave) {
        await this.storageService.save(this.memories);
      }
      
      // Auto-prune if enabled
      if (this.config.autoPrune) {
        this.pruningService.enforceTypeLimits(this.memories);
      }
      
      this.emit(MemoryEvent.STORE, { key, type });
      
      const result: MemoryOperationResult = {
        success: true,
        data: entry,
        duration: Date.now() - startTime
      };
      
      return result;
    } catch (error) {
      const result: MemoryOperationResult = {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime
      };
      
      logger.error('Failed to store memory', error);
      return result;
    }
  }
  
  /**
   * Retrieve a memory entry
   */
  public retrieve(
    key: string,
    type: MemoryStorageType = MemoryStorageType.SESSION
  ): MemoryEntry | null {
    this.ensureInitialized();
    
    const entry = this.retrievalService.retrieve(this.memories, key, type);
    
    if (entry) {
      // Update access metrics
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      
      this.emit(MemoryEvent.RETRIEVE, { key, type });
    }
    
    return entry;
  }
  
  /**
   * Get memory content directly
   */
  public get(
    key: string,
    type: MemoryStorageType = MemoryStorageType.SESSION
  ): unknown {
    const entry = this.retrieve(key, type);
    return entry ? entry.content : undefined;
  }
  
  /**
   * Search for memory entries
   */
  public search(options: MemoryRetrievalOptions = {}): SearchResult {
    this.ensureInitialized();
    return this.retrievalService.search(this.memories, options);
  }
  
  /**
   * Search by tags
   */
  public searchByTags(tags: string[], options: MemoryRetrievalOptions = {}): SearchResult {
    this.ensureInitialized();
    return this.retrievalService.searchByTags(this.memories, tags, options);
  }
  
  /**
   * Get entries by type
   */
  public getByType(
    type: MemoryStorageType,
    options: MemoryRetrievalOptions = {}
  ): SearchResult {
    this.ensureInitialized();
    return this.retrievalService.getByType(this.memories, type, options);
  }
  
  /**
   * Delete a memory entry
   */
  public async delete(
    key: string,
    type: MemoryStorageType = MemoryStorageType.SESSION
  ): Promise<MemoryOperationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const id = this.generateId(key, type);
    const deleted = this.memories.delete(id);
    
    if (deleted) {
      if (this.config.autoSave) {
        await this.storageService.save(this.memories);
      }
      
      this.emit(MemoryEvent.DELETE, { key, type });
    }
    
    return {
      success: deleted,
      data: { deleted },
      duration: Date.now() - startTime
    };
  }
  
  /**
   * Prune memories
   */
  public prune(): PruningResult {
    this.ensureInitialized();
    return this.pruningService.prune(this.memories);
  }
  
  /**
   * Save memories to disk
   */
  public async save(): Promise<StorageResult> {
    this.ensureInitialized();
    return this.storageService.save(this.memories);
  }
  
  /**
   * Clear all memories
   */
  public async clear(): Promise<MemoryOperationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const beforeCount = this.memories.size;
    
    this.memories.clear();
    
    if (this.config.autoSave) {
      await this.storageService.save(this.memories);
    }
    
    return {
      success: true,
      data: { cleared: beforeCount },
      duration: Date.now() - startTime
    };
  }
  
  /**
   * Get memory statistics
   */
  public async getStats(): Promise<MemoryStats> {
    this.ensureInitialized();
    
    const pruningStats = this.pruningService.getStats(this.memories);
    const cacheStats = this.retrievalService.getCacheStats();
    const storageStats = await this.storageService.getStorageStats();
    
    return {
      totalEntries: pruningStats.totalEntries,
      entriesByType: pruningStats.entriesByType,
      totalSizeBytes: storageStats.sizeBytes,
      expiredEntries: pruningStats.expiredEntries,
      cacheStats: {
        size: cacheStats.size,
        hitRate: cacheStats.hitRate
      }
    };
  }
  
  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.config.autoSave && this.memories.size > 0) {
      await this.storageService.save(this.memories);
    }
    
    this.pruningService.stop();
    this.removeAllListeners();
    
    logger.debug('Memory system shutdown complete');
  }
  
  // Private helper methods
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Memory system not initialized. Call initialize() first.');
    }
  }
  
  private setupEventForwarding(): void {
    // Forward storage events
    this.storageService.on('storage-error', (error) => {
      this.emit(MemoryEvent.ERROR, { source: 'storage', error });
    });
    
    // Forward pruning events
    this.pruningService.on('prune-complete', (result) => {
      logger.debug('Auto-pruning completed', result);
    });
    
    // Forward retrieval events
    this.retrievalService.on('search-complete', (result) => {
      logger.debug('Search completed', {
        found: result.totalFound,
        searchTime: result.searchTime
      });
    });
  }
  
  private setupAutoPruning(): void {
    if (!this.config.autoPrune) {
      return;
    }
    
    this.pruningService.on('auto-prune-trigger', () => {
      const result = this.pruningService.prune(this.memories);
      if (result.totalRemoved > 0 && this.config.autoSave) {
        this.storageService.save(this.memories);
      }
    });
    
    this.pruningService.on('auto-expiry-check', () => {
      this.pruningService.removeExpired(this.memories);
      if (this.config.autoSave) {
        this.storageService.save(this.memories);
      }
    });
  }
  
  private generateId(key: string, type: MemoryStorageType): string {
    return `${type}:${key}`;
  }
  
  private getContentType(content: MemoryContent): string {
    if (typeof content === 'string') {
      return 'string';
    }
    
    if (Array.isArray(content)) {
      return 'array';
    }
    
    if (content && typeof content === 'object') {
      return 'object';
    }
    
    return 'unknown';
  }
}

/**
 * Factory function for creating memory orchestrator
 */
export function createMemoryOrchestrator(
  config: MemorySystemConfig,
  encryptionKey?: string
): MemoryOrchestrator {
  const storageService = new MemoryStorageService(config.storage, encryptionKey);
  const retrievalService = new MemoryRetrievalService(config.retrieval);
  const pruningService = new MemoryPruningService(config.pruning);
  
  return new MemoryOrchestrator(
    config,
    storageService,
    retrievalService,
    pruningService,
    encryptionKey
  );
} 