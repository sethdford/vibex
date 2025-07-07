/**
 * File Cache Service
 * 
 * Single Responsibility: Handle file content caching with TTL and memory management
 * Following Gemini CLI's clean architecture patterns
 */

import { logger } from '../utils/logger.js';

export interface FileCacheConfig {
  enabled?: boolean;
  maxSize?: number; // Maximum cache size in bytes
  ttl?: number; // Time to live in milliseconds
  maxEntries?: number; // Maximum number of cache entries
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export interface CacheEntry {
  content: string;
  size: number;
  created: number;
  accessed: number;
  expires: number;
  hits: number;
}

export interface CacheStats {
  enabled: boolean;
  totalEntries: number;
  totalSize: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export interface CacheResult<T = string> {
  hit: boolean;
  data?: T;
  entry?: CacheEntry;
}

/**
 * File Cache Service - Clean Architecture
 * Focus: File content caching with smart memory management
 */
export class FileCacheService {
  private config: Required<FileCacheConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private totalSize: number = 0;
  private totalHits: number = 0;
  private totalMisses: number = 0;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: FileCacheConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxSize: config.maxSize || 100 * 1024 * 1024, // 100MB
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes
      maxEntries: config.maxEntries || 1000,
      cleanupInterval: config.cleanupInterval || 60 * 1000 // 1 minute
    };

    if (this.config.enabled) {
      this.startCleanupTimer();
    }

    logger.debug('File cache service initialized', {
      enabled: this.config.enabled,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl
    });
  }

  /**
   * Get cached content
   */
  get(filePath: string): CacheResult {
    if (!this.config.enabled) {
      return { hit: false };
    }

    const entry = this.cache.get(filePath);
    
    if (!entry) {
      this.totalMisses++;
      return { hit: false };
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(filePath);
      this.totalMisses++;
      return { hit: false };
    }

    // Update access time and hit count
    entry.accessed = Date.now();
    entry.hits++;
    this.totalHits++;

    logger.debug(`Cache hit for: ${filePath}`, {
      hits: entry.hits,
      age: Date.now() - entry.created
    });

    return {
      hit: true,
      data: entry.content,
      entry: { ...entry }
    };
  }

  /**
   * Set cached content
   */
  set(filePath: string, content: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const contentSize = Buffer.byteLength(content, 'utf8');
    
    // Check if content is too large
    if (contentSize > this.config.maxSize * 0.5) {
      logger.debug(`Content too large for cache: ${filePath}`, {
        size: contentSize,
        maxAllowed: this.config.maxSize * 0.5
      });
      return false;
    }

    // Remove existing entry if present
    if (this.cache.has(filePath)) {
      this.delete(filePath);
    }

    // Ensure we have space
    this.ensureSpace(contentSize);

    // Create cache entry
    const now = Date.now();
    const entry: CacheEntry = {
      content,
      size: contentSize,
      created: now,
      accessed: now,
      expires: now + this.config.ttl,
      hits: 0
    };

    this.cache.set(filePath, entry);
    this.totalSize += contentSize;

    logger.debug(`Cached content: ${filePath}`, {
      size: contentSize,
      totalEntries: this.cache.size,
      totalSize: this.totalSize
    });

    return true;
  }

  /**
   * Delete cached entry
   */
  delete(filePath: string): boolean {
    const entry = this.cache.get(filePath);
    
    if (entry) {
      this.cache.delete(filePath);
      this.totalSize -= entry.size;
      
      logger.debug(`Removed from cache: ${filePath}`, {
        size: entry.size,
        totalEntries: this.cache.size
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Check if file is cached
   */
  has(filePath: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(filePath);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const entriesCleared = this.cache.size;
    const sizeCleared = this.totalSize;
    
    this.cache.clear();
    this.totalSize = 0;
    
    logger.debug('Cache cleared', {
      entriesCleared,
      sizeCleared
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.totalHits + this.totalMisses;
    
    return {
      enabled: this.config.enabled,
      totalEntries: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.config.maxSize,
      hitRate: totalRequests > 0 ? this.totalHits / totalRequests : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.created)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.created)) : undefined
    };
  }

  /**
   * Get cache entries sorted by criteria
   */
  getEntries(sortBy: 'created' | 'accessed' | 'hits' | 'size' = 'accessed'): Array<{
    path: string;
    entry: CacheEntry;
  }> {
    const entries = Array.from(this.cache.entries()).map(([path, entry]) => ({
      path,
      entry: { ...entry }
    }));

    entries.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return b.entry.created - a.entry.created;
        case 'accessed':
          return b.entry.accessed - a.entry.accessed;
        case 'hits':
          return b.entry.hits - a.entry.hits;
        case 'size':
          return b.entry.size - a.entry.size;
        default:
          return 0;
      }
    });

    return entries;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const [filePath, entry] of this.cache.entries()) {
      if (pattern.test(filePath)) {
        this.cache.delete(filePath);
        this.totalSize -= entry.size;
        invalidated++;
      }
    }

    if (invalidated > 0) {
      logger.debug(`Invalidated cache entries by pattern`, {
        pattern: pattern.toString(),
        invalidated
      });
    }

    return invalidated;
  }

  /**
   * Preload content into cache
   */
  preload(filePath: string, content: string): boolean {
    return this.set(filePath, content);
  }

  /**
   * Warm up cache with multiple entries
   */
  warmUp(entries: Array<{ path: string; content: string }>): number {
    let loaded = 0;
    
    for (const entry of entries) {
      if (this.set(entry.path, entry.content)) {
        loaded++;
      }
    }

    logger.debug(`Cache warm-up completed`, {
      attempted: entries.length,
      loaded
    });

    return loaded;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<FileCacheConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    // Handle enabling/disabling
    if (oldConfig.enabled !== this.config.enabled) {
      if (this.config.enabled) {
        this.startCleanupTimer();
      } else {
        this.stopCleanupTimer();
        this.clear();
      }
    }

    // Handle cleanup interval changes
    if (oldConfig.cleanupInterval !== this.config.cleanupInterval) {
      this.restartCleanupTimer();
    }

    // Handle size limit changes
    if (oldConfig.maxSize !== this.config.maxSize && this.totalSize > this.config.maxSize) {
      this.enforceMemoryLimit();
    }

    logger.debug('Cache configuration updated', {
      oldConfig,
      newConfig: this.config
    });
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
    
    logger.debug('File cache service destroyed');
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expires;
  }

  /**
   * Ensure we have space for new content
   */
  private ensureSpace(requiredSize: number): void {
    // Check entry limit
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed(1);
    }

    // Check size limit
    while (this.totalSize + requiredSize > this.config.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed(1);
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(count: number): void {
    const entries = this.getEntries('accessed');
    const toEvict = entries.slice(-count);

    for (const { path } of toEvict) {
      this.delete(path);
    }

    if (toEvict.length > 0) {
      logger.debug(`Evicted LRU entries`, {
        count: toEvict.length,
        paths: toEvict.map(e => e.path)
      });
    }
  }

  /**
   * Enforce memory limit by evicting entries
   */
  private enforceMemoryLimit(): void {
    while (this.totalSize > this.config.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed(1);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [filePath, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(filePath);
        this.totalSize -= entry.size;
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Cleaned up expired cache entries`, {
        expiredCount,
        remainingEntries: this.cache.size
      });
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Restart cleanup timer
   */
  private restartCleanupTimer(): void {
    this.stopCleanupTimer();
    if (this.config.enabled) {
      this.startCleanupTimer();
    }
  }
}

// Factory function for creating file cache service
export function createFileCacheService(config?: FileCacheConfig): FileCacheService {
  return new FileCacheService(config);
} 