/**
 * Context Cache Service - Clean Architecture like Gemini CLI
 * 
 * Single Responsibility: Context caching and memory management
 * - Cache management with TTL
 * - Memory system integration
 * - Performance optimization
 */

import { logger } from '../utils/logger.js';
import { MemoryOrchestrator, MemoryStorageType, createMemoryServices } from './memory-services/index.js';
import type { ContextMergeResult } from './context-merge-service.js';

/**
 * Cache entry
 */
interface CacheEntry {
  result: ContextMergeResult;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttlMs: number;
  maxEntries: number;
  enableMemoryStorage: boolean;
  memoryImportance: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  entries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttlMs: 60000, // 1 minute
  maxEntries: 100,
  enableMemoryStorage: true,
  memoryImportance: 90
};

/**
 * Context Cache Service
 * 
 * Focused responsibility: Efficient context caching and memory management
 */
export class ContextCacheService {
  private readonly config: CacheConfig;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly memorySystem?: MemoryOrchestrator;
  private totalRequests = 0;
  private totalHits = 0;

  constructor(
    config: Partial<CacheConfig> = {},
    memorySystem?: MemoryOrchestrator
  ) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.memorySystem = memorySystem;
  }

  /**
   * Get cached result
   */
  public get(cacheKey: string): ContextMergeResult | null {
    this.totalRequests++;
    
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.totalHits++;

    return entry.result;
  }

  /**
   * Set cache entry
   */
  public async set(cacheKey: string, result: ContextMergeResult): Promise<void> {
    // Evict old entries if at capacity
    this.evictIfNeeded();

    // Create cache entry
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(cacheKey, entry);

    // Store in memory system if enabled
    if (this.config.enableMemoryStorage && this.memorySystem) {
      await this.storeInMemory(cacheKey, result);
    }

    logger.debug(`Context cached: ${cacheKey} (${result.stats.totalFiles} files)`);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    logger.debug('Context cache cleared');
  }

  /**
   * Clear cache entries for specific paths
   */
  public clearForPaths(paths: string[]): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      // Check if cache key relates to any of the affected paths
      if (paths.some(path => key.includes(path))) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleared ${keysToDelete.length} cache entries for path changes`);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    if (this.cache.size === 0) {
      return {
        entries: 0,
        totalSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
        hitRate: this.totalRequests > 0 ? this.totalHits / this.totalRequests : 0,
        totalRequests: this.totalRequests,
        totalHits: this.totalHits
      };
    }

    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.result.content.length;
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    return {
      entries: this.cache.size,
      totalSize,
      oldestEntry,
      newestEntry,
      hitRate: this.totalRequests > 0 ? this.totalHits / this.totalRequests : 0,
      totalRequests: this.totalRequests,
      totalHits: this.totalHits
    };
  }

  /**
   * Generate cache key
   */
  public generateCacheKey(currentDir: string, configHash?: string): string {
    const timestamp = Math.floor(Date.now() / this.config.ttlMs);
    const hash = configHash || 'default';
    return `context:${currentDir}:${hash}:${timestamp}`;
  }

  /**
   * Evict entries if needed
   */
  private evictIfNeeded(): void {
    if (this.cache.size < this.config.maxEntries) {
      return;
    }

    // Find least recently used entry
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`Evicted cache entry: ${oldestKey}`);
    }
  }

  /**
   * Store result in memory system
   */
  private async storeInMemory(cacheKey: string, result: ContextMergeResult): Promise<void> {
    if (!this.memorySystem) return;
    
    try {
      await this.memorySystem.store(
        `context_cache_${cacheKey}`,
        {
          content: result.content,
          variables: result.variables,
          stats: result.stats,
          timestamp: Date.now()
        },
        MemoryStorageType.SESSION
      );
    } catch (error) {
      logger.warn('Failed to store context in memory system', error);
    }
  }

  /**
   * Validate cache integrity
   */
  public validateCache(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    const now = Date.now();
    let expiredEntries = 0;

    for (const [key, entry] of this.cache) {
      // Check for expired entries
      if (now - entry.timestamp > this.config.ttlMs) {
        expiredEntries++;
      }

      // Validate entry structure
      if (!entry.result || !entry.result.content) {
        result.isValid = false;
        result.errors.push(`Invalid cache entry: ${key}`);
      }
    }

    if (expiredEntries > 0) {
      result.warnings.push(`${expiredEntries} expired entries found`);
    }

    if (this.cache.size > this.config.maxEntries * 1.1) {
      result.warnings.push('Cache size exceeds maximum by 10%');
    }

    return result;
  }

  /**
   * Clean expired entries
   */
  public cleanExpired(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.ttlMs) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned ${keysToDelete.length} expired cache entries`);
    }

    return keysToDelete.length;
  }

  /**
   * Get configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }
}

/**
 * Create context cache service
 */
export function createContextCacheService(
  config?: Partial<CacheConfig>,
  memorySystem?: MemoryOrchestrator
): ContextCacheService {
  return new ContextCacheService(config, memorySystem);
} 