/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Cache System for VibeX
 * 
 * Provides multiple caching strategies with TTL support,
 * eviction policies, and performance monitoring.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

/**
 * Cache entry interface
 */
export interface CacheEntry<T = any> {
  readonly key: string;
  readonly value: T;
  readonly timestamp: number;
  readonly ttl?: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
  readonly size: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly totalEntries: number;
  readonly totalSize: number;
  readonly averageEntrySize: number;
  readonly evictions: number;
}

/**
 * Cache eviction policy
 */
export enum EvictionPolicy {
  LRU = 'lru',        // Least Recently Used
  LFU = 'lfu',        // Least Frequently Used
  FIFO = 'fifo',      // First In, First Out
  TTL_ONLY = 'ttl'    // TTL-based only
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize?: number;           // Maximum number of entries
  maxMemory?: number;         // Maximum memory usage in bytes
  defaultTtl?: number;        // Default TTL in milliseconds
  evictionPolicy?: EvictionPolicy;
  cleanupInterval?: number;   // Cleanup interval in milliseconds
}

/**
 * Cache interface
 */
export interface ICache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  values<T>(): T[];
  entries<T>(): Array<[string, T]>;
  size(): number;
  getStats(): CacheStats;
  cleanup(): number;
}

/**
 * Base cache implementation
 */
export abstract class BaseCache extends EventEmitter implements ICache {
  protected cacheEntries = new Map<string, CacheEntry>();
  protected config: Required<CacheConfig>;
  protected stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig = {}) {
    super();
    this.config = {
      maxSize: config.maxSize || 1000,
      maxMemory: config.maxMemory || 100 * 1024 * 1024, // 100MB
      defaultTtl: config.defaultTtl || 0, // 0 = no TTL
      evictionPolicy: config.evictionPolicy || EvictionPolicy.LRU,
      cleanupInterval: config.cleanupInterval || 60000 // 1 minute
    };

    // Start cleanup timer
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  get<T>(key: string): T | undefined {
    const entry = this.cacheEntries.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.emit('miss', key);
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.cacheEntries.delete(key);
      this.stats.misses++;
      this.emit('expired', key, entry);
      return undefined;
    }

    // Update access information
    const updatedEntry: CacheEntry<T> = {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: Date.now()
    };
    this.cacheEntries.set(key, updatedEntry);

    this.stats.hits++;
    this.emit('hit', key, entry.value);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.defaultTtl;
    const size = this.calculateSize(value);

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      ttl: entryTtl > 0 ? entryTtl : undefined,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    // Check if we need to evict before adding
    this.ensureCapacity(size);

    const existed = this.cacheEntries.has(key);
    this.cacheEntries.set(key, entry);

    this.emit(existed ? 'update' : 'set', key, value, entry);
    
    logger.debug(`Cache entry ${existed ? 'updated' : 'set'}`, {
      key,
      size,
      ttl: entryTtl,
      totalEntries: this.cacheEntries.size
    });
  }

  has(key: string): boolean {
    const entry = this.cacheEntries.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cacheEntries.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const existed = this.cacheEntries.delete(key);
    if (existed) {
      this.emit('delete', key);
    }
    return existed;
  }

  clear(): void {
    const count = this.cacheEntries.size;
    this.cacheEntries.clear();
    this.emit('clear', count);
    
    logger.debug(`Cache cleared`, { entriesRemoved: count });
  }

  keys(): string[] {
    return Array.from(this.cacheEntries.keys());
  }

  values<T>(): T[] {
    return Array.from(this.cacheEntries.values()).map(entry => entry.value as T);
  }

  entries<T>(): Array<[string, T]> {
    return Array.from(this.cacheEntries.entries()).map(([key, entry]) => [key, entry.value as T]);
  }

  size(): number {
    return this.cacheEntries.size;
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    const totalSize = Array.from(this.cacheEntries.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const averageEntrySize = this.cacheEntries.size > 0 ? totalSize / this.cacheEntries.size : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalEntries: this.cacheEntries.size,
      totalSize,
      averageEntrySize,
      evictions: this.stats.evictions
    };
  }

  cleanup(): number {
    const before = this.cacheEntries.size;
    const now = Date.now();
    const expired: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cacheEntries) {
      if (this.isExpired(entry)) {
        expired.push(key);
      }
    }

    // Remove expired entries
    for (const key of expired) {
      this.cacheEntries.delete(key);
      this.emit('expired', key);
    }

    const removed = before - this.cacheEntries.size;
    if (removed > 0) {
      logger.debug(`Cache cleanup completed`, {
        entriesRemoved: removed,
        remainingEntries: this.cacheEntries.size
      });
    }

    return removed;
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
    this.removeAllListeners();
  }

  protected abstract ensureCapacity(newEntrySize: number): void;

  protected isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  protected calculateSize(value: any): number {
    if (typeof value === 'string') {
      return value.length * 2; // Rough estimate for UTF-16
    }
    if (typeof value === 'number') {
      return 8;
    }
    if (typeof value === 'boolean') {
      return 4;
    }
    if (value === null || value === undefined) {
      return 0;
    }
    
    // For objects, use JSON.stringify length as approximation
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default size for non-serializable objects
    }
  }

  protected evictEntries(targetSize: number): number {
    const entries = Array.from(this.cacheEntries.entries());
    let evicted = 0;
    let freedSize = 0;

    switch (this.config.evictionPolicy) {
      case EvictionPolicy.LRU:
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case EvictionPolicy.LFU:
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case EvictionPolicy.FIFO:
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
      default:
        // TTL_ONLY - don't proactively evict
        return 0;
    }

    for (const [key, entry] of entries) {
      if (freedSize >= targetSize) break;
      
      this.cacheEntries.delete(key);
      freedSize += entry.size;
      evicted++;
      this.stats.evictions++;
      this.emit('evict', key, entry);
    }

    if (evicted > 0) {
      logger.debug(`Cache eviction completed`, {
        policy: this.config.evictionPolicy,
        entriesEvicted: evicted,
        sizeFreed: freedSize
      });
    }

    return evicted;
  }
}

/**
 * LRU Cache implementation
 */
export class LRUCache extends BaseCache {
  constructor(config: CacheConfig = {}) {
    super({ ...config, evictionPolicy: EvictionPolicy.LRU });
  }

  protected ensureCapacity(newEntrySize: number): void {
    // Check size limit
    if (this.cacheEntries.size >= this.config.maxSize) {
      this.evictEntries(1);
    }

    // Check memory limit
    const currentSize = Array.from(this.cacheEntries.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    if (currentSize + newEntrySize > this.config.maxMemory) {
      const targetEvictionSize = (currentSize + newEntrySize) - this.config.maxMemory;
      this.evictEntries(targetEvictionSize);
    }
  }
}

/**
 * TTL Cache implementation
 */
export class TTLCache extends BaseCache {
  constructor(config: CacheConfig = {}) {
    super({ ...config, evictionPolicy: EvictionPolicy.TTL_ONLY });
  }

  protected ensureCapacity(newEntrySize: number): void {
    // First, cleanup expired entries
    this.cleanup();

    // Then check limits
    if (this.cacheEntries.size >= this.config.maxSize) {
      // Fall back to LRU for size limit
      this.evictEntries(1);
    }

    const currentSize = Array.from(this.cacheEntries.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    if (currentSize + newEntrySize > this.config.maxMemory) {
      const targetEvictionSize = (currentSize + newEntrySize) - this.config.maxMemory;
      this.evictEntries(targetEvictionSize);
    }
  }
}

/**
 * Multi-level cache system
 */
export class MultiLevelCache implements ICache {
  private levels: ICache[];
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(levels: ICache[]) {
    if (levels.length === 0) {
      throw new Error('At least one cache level is required');
    }
    this.levels = levels;
  }

  get<T>(key: string): T | undefined {
    for (let i = 0; i < this.levels.length; i++) {
      const value = this.levels[i].get<T>(key);
      if (value !== undefined) {
        this.stats.hits++;
        
        // Promote to higher levels
        for (let j = 0; j < i; j++) {
          this.levels[j].set(key, value);
        }
        
        return value;
      }
    }
    
    this.stats.misses++;
    return undefined;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    // Set in all levels
    for (const level of this.levels) {
      level.set(key, value, ttl);
    }
  }

  has(key: string): boolean {
    return this.levels.some(level => level.has(key));
  }

  delete(key: string): boolean {
    let deleted = false;
    for (const level of this.levels) {
      if (level.delete(key)) {
        deleted = true;
      }
    }
    return deleted;
  }

  clear(): void {
    for (const level of this.levels) {
      level.clear();
    }
  }

  keys(): string[] {
    const allKeys = new Set<string>();
    for (const level of this.levels) {
      for (const key of level.keys()) {
        allKeys.add(key);
      }
    }
    return Array.from(allKeys);
  }

  values<T>(): T[] {
    const seen = new Set<string>();
    const values: T[] = [];
    
    for (const level of this.levels) {
      for (const [key, value] of level.entries<T>()) {
        if (!seen.has(key)) {
          seen.add(key);
          values.push(value);
        }
      }
    }
    
    return values;
  }

  entries<T>(): Array<[string, T]> {
    const seen = new Set<string>();
    const entries: Array<[string, T]> = [];
    
    for (const level of this.levels) {
      for (const [key, value] of level.entries<T>()) {
        if (!seen.has(key)) {
          seen.add(key);
          entries.push([key, value]);
        }
      }
    }
    
    return entries;
  }

  size(): number {
    return this.keys().length;
  }

  getStats(): CacheStats {
    const levelStats = this.levels.map(level => level.getStats());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      totalEntries: this.size(),
      totalSize: levelStats.reduce((sum, stats) => sum + stats.totalSize, 0),
      averageEntrySize: levelStats.reduce((sum, stats) => sum + stats.averageEntrySize, 0) / levelStats.length,
      evictions: levelStats.reduce((sum, stats) => sum + stats.evictions, 0)
    };
  }

  cleanup(): number {
    let totalRemoved = 0;
    for (const level of this.levels) {
      totalRemoved += level.cleanup();
    }
    return totalRemoved;
  }
}

/**
 * Cache factory
 */
export class CacheFactory {
  static createLRU(config: CacheConfig = {}): LRUCache {
    return new LRUCache(config);
  }

  static createTTL(config: CacheConfig = {}): TTLCache {
    return new TTLCache(config);
  }

  static createMultiLevel(configs: CacheConfig[]): MultiLevelCache {
    const levels = configs.map(config => new LRUCache(config));
    return new MultiLevelCache(levels);
  }

  static createDefault(): LRUCache {
    return new LRUCache({
      maxSize: 1000,
      maxMemory: 50 * 1024 * 1024, // 50MB
      defaultTtl: 30 * 60 * 1000,   // 30 minutes
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    });
  }
} 