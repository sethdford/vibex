/**
 * Memory Retrieval Service - Following Gemini CLI Architecture
 * 
 * Single Responsibility: Handle memory search, filtering, and sorting operations
 * Clean service with focused interface and proper performance optimization
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { MemoryEntry, MemoryStorageType, MemoryTag } from '../types/memory.js';

/**
 * Retrieval configuration interface
 */
export interface RetrievalConfig {
  readonly defaultLimit: number;
  readonly maxLimit: number;
  readonly cacheSize: number;
  readonly enableCaching: boolean;
}

/**
 * Memory retrieval options
 */
export interface MemoryRetrievalOptions {
  readonly limit?: number;
  readonly sort?: 'importance' | 'recency' | 'relevance' | 'access';
  readonly tags?: string[];
  readonly type?: MemoryStorageType;
  readonly similarityThreshold?: number;
  readonly includeExpired?: boolean;
  readonly contentPattern?: string;
  readonly importanceRange?: [number, number];
  readonly dateRange?: [number, number];
}

/**
 * Search result interface
 */
export interface SearchResult {
  readonly entries: MemoryEntry[];
  readonly totalFound: number;
  readonly searchTime: number;
  readonly fromCache: boolean;
  readonly query: MemoryRetrievalOptions;
}

/**
 * Retrieval events
 */
export enum RetrievalEvent {
  SEARCH_START = 'search-start',
  SEARCH_COMPLETE = 'search-complete',
  CACHE_HIT = 'cache-hit',
  CACHE_MISS = 'cache-miss'
}

/**
 * Memory Retrieval Service
 * Handles all search, filtering, and sorting operations for memories
 */
export class MemoryRetrievalService extends EventEmitter {
  private readonly config: RetrievalConfig;
  private readonly searchCache = new Map<string, SearchResult>();
  
  constructor(config: RetrievalConfig) {
    super();
    this.config = config;
    
    logger.debug('MemoryRetrievalService initialized', { config });
  }
  
  /**
   * Search for memory entries with comprehensive filtering
   */
  public search(
    memories: Map<string, MemoryEntry>,
    options: MemoryRetrievalOptions = {}
  ): SearchResult {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(options);
    
    this.emit(RetrievalEvent.SEARCH_START, { options });
    
    // Check cache first
    if (this.config.enableCaching && this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      this.emit(RetrievalEvent.CACHE_HIT, { cacheKey });
      return { ...cached, fromCache: true };
    }
    
    this.emit(RetrievalEvent.CACHE_MISS, { cacheKey });
    
    // Perform search
    const allEntries = Array.from(memories.values());
    const filtered = this.applyFilters(allEntries, options);
    const sorted = this.applySorting(filtered, options.sort || 'importance');
    const limited = this.applyLimit(sorted, options.limit);
    
    const result: SearchResult = {
      entries: limited,
      totalFound: filtered.length,
      searchTime: Date.now() - startTime,
      fromCache: false,
      query: options
    };
    
    // Cache result if enabled
    if (this.config.enableCaching) {
      this.cacheResult(cacheKey, result);
    }
    
    this.emit(RetrievalEvent.SEARCH_COMPLETE, result);
    logger.debug('Memory search completed', {
      found: result.totalFound,
      returned: result.entries.length,
      searchTime: result.searchTime
    });
    
    return result;
  }
  
  /**
   * Retrieve a specific memory entry by key
   */
  public retrieve(
    memories: Map<string, MemoryEntry>,
    key: string,
    type: MemoryStorageType = MemoryStorageType.SESSION
  ): MemoryEntry | null {
    const id = this.generateId(key, type);
    const entry = memories.get(id);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      return null;
    }
    
    return entry;
  }
  
  /**
   * Search by tags with efficient filtering
   */
  public searchByTags(
    memories: Map<string, MemoryEntry>,
    tags: string[],
    options: MemoryRetrievalOptions = {}
  ): SearchResult {
    if (!tags.length) {
      return {
        entries: [],
        totalFound: 0,
        searchTime: 0,
        fromCache: false,
        query: { ...options, tags }
      };
    }
    
    return this.search(memories, { ...options, tags });
  }
  
  /**
   * Get entries by type with filtering
   */
  public getByType(
    memories: Map<string, MemoryEntry>,
    type: MemoryStorageType,
    options: MemoryRetrievalOptions = {}
  ): SearchResult {
    return this.search(memories, { ...options, type });
  }
  
  /**
   * Search by content pattern (text search)
   */
  public searchByContent(
    memories: Map<string, MemoryEntry>,
    pattern: string,
    options: MemoryRetrievalOptions = {}
  ): SearchResult {
    return this.search(memories, { ...options, contentPattern: pattern });
  }
  
  /**
   * Get recent entries
   */
  public getRecent(
    memories: Map<string, MemoryEntry>,
    limit: number = 10
  ): SearchResult {
    return this.search(memories, {
      limit,
      sort: 'recency',
      includeExpired: false
    });
  }
  
  /**
   * Get most important entries
   */
  public getMostImportant(
    memories: Map<string, MemoryEntry>,
    limit: number = 10
  ): SearchResult {
    return this.search(memories, {
      limit,
      sort: 'importance',
      includeExpired: false
    });
  }
  
  /**
   * Clear search cache
   */
  public clearCache(): void {
    this.searchCache.clear();
    logger.debug('Memory retrieval cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.searchCache.size,
      maxSize: this.config.cacheSize,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
  
  // Private helper methods
  
  private applyFilters(
    entries: MemoryEntry[],
    options: MemoryRetrievalOptions
  ): MemoryEntry[] {
    return entries.filter(entry => {
      // Type filter
      if (options.type && entry.type !== options.type) {
        return false;
      }
      
      // Expiry filter
      if (!options.includeExpired && entry.expiresAt && Date.now() > entry.expiresAt) {
        return false;
      }
      
      // Tags filter
      if (options.tags && options.tags.length > 0) {
        if (!entry.tags || entry.tags.length === 0) {
          return false;
        }
        
        const hasAllTags = options.tags.every(tag =>
          entry.tags!.some(entryTag => entryTag.name === tag)
        );
        
        if (!hasAllTags) {
          return false;
        }
      }
      
      // Content pattern filter
      if (options.contentPattern) {
        const contentText = this.extractTextFromContent(entry.content);
        if (!contentText.toLowerCase().includes(options.contentPattern.toLowerCase())) {
          return false;
        }
      }
      
      // Importance range filter
      if (options.importanceRange) {
        const importance = entry.importance || 0;
        const [min, max] = options.importanceRange;
        if (importance < min || importance > max) {
          return false;
        }
      }
      
      // Date range filter
      if (options.dateRange) {
        const [start, end] = options.dateRange;
        if (entry.createdAt < start || entry.createdAt > end) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  private applySorting(
    entries: MemoryEntry[],
    sortType: 'importance' | 'recency' | 'relevance' | 'access'
  ): MemoryEntry[] {
    const sorted = [...entries];
    
    switch (sortType) {
      case 'importance':
        return sorted.sort((a, b) => (b.importance || 0) - (a.importance || 0));
        
      case 'recency':
        return sorted.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
        
      case 'access':
        return sorted.sort((a, b) => b.accessCount - a.accessCount);
        
      case 'relevance':
        // TODO: Implement relevance scoring based on embeddings
        return sorted.sort((a, b) => (b.importance || 0) - (a.importance || 0));
        
      default:
        return sorted;
    }
  }
  
  private applyLimit(entries: MemoryEntry[], limit?: number): MemoryEntry[] {
    const effectiveLimit = Math.min(
      limit || this.config.defaultLimit,
      this.config.maxLimit
    );
    
    return entries.slice(0, effectiveLimit);
  }
  
  private generateCacheKey(options: MemoryRetrievalOptions): string {
    return JSON.stringify(options);
  }
  
  private cacheResult(key: string, result: SearchResult): void {
    // Implement LRU cache behavior
    if (this.searchCache.size >= this.config.cacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    
    this.searchCache.set(key, result);
  }
  
  private generateId(key: string, type: MemoryStorageType): string {
    return `${type}:${key}`;
  }
  
  private extractTextFromContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content);
    }
    
    return String(content);
  }
}

/**
 * Factory function for creating memory retrieval service
 */
export function createMemoryRetrievalService(config: RetrievalConfig): MemoryRetrievalService {
  return new MemoryRetrievalService(config);
}