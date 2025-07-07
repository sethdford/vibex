/**
 * Memory Pruning Service - Following Gemini CLI Architecture
 * 
 * Single Responsibility: Handle memory cleanup, expiration, and limit enforcement
 * Clean service with focused interface and proper resource management
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { MemoryEntry, MemoryStorageType } from '../types/memory.js';

/**
 * Pruning configuration interface
 */
export interface PruningConfig {
  readonly maxEntries: Record<MemoryStorageType, number>;
  readonly autoPrune: boolean;
  readonly pruneInterval: number; // milliseconds
  readonly expiryCheckInterval: number; // milliseconds
  readonly importanceThreshold: number; // 0-100
  readonly accessThreshold: number; // minimum access count to keep
  readonly ageThreshold: number; // milliseconds
}

/**
 * Pruning operation result
 */
export interface PruningResult {
  readonly totalRemoved: number;
  readonly removedByType: Record<MemoryStorageType, number>;
  readonly removedByReason: {
    expired: number;
    overLimit: number;
    lowImportance: number;
    lowAccess: number;
    tooOld: number;
  };
  readonly duration: number;
  readonly beforeCount: number;
  readonly afterCount: number;
}

/**
 * Pruning strategy interface
 */
export interface PruningStrategy {
  readonly name: string;
  readonly description: string;
  readonly execute: (entries: MemoryEntry[]) => MemoryEntry[];
}

/**
 * Pruning events
 */
export enum PruningEvent {
  PRUNE_START = 'prune-start',
  PRUNE_COMPLETE = 'prune-complete',
  EXPIRY_CHECK = 'expiry-check',
  LIMIT_EXCEEDED = 'limit-exceeded'
}

/**
 * Memory Pruning Service
 * Handles all cleanup, expiration, and limit enforcement for memories
 */
export class MemoryPruningService extends EventEmitter {
  private readonly config: PruningConfig;
  private pruneTimer?: NodeJS.Timeout;
  private expiryTimer?: NodeJS.Timeout;
  private readonly strategies = new Map<string, PruningStrategy>();
  
  constructor(config: PruningConfig) {
    super();
    this.config = config;
    
    this.initializeStrategies();
    this.startAutoPruning();
    
    logger.debug('MemoryPruningService initialized', { config });
  }
  
  /**
   * Perform comprehensive memory pruning
   */
  public prune(memories: Map<string, MemoryEntry>): PruningResult {
    const startTime = Date.now();
    const beforeCount = memories.size;
    
    this.emit(PruningEvent.PRUNE_START, { count: beforeCount });
    
    const mutableResult = {
      totalRemoved: 0,
      removedByType: this.initializeTypeCounters(),
      removedByReason: {
        expired: 0,
        overLimit: 0,
        lowImportance: 0,
        lowAccess: 0,
        tooOld: 0
      },
      duration: 0,
      beforeCount,
      afterCount: 0
    };
    
    // Step 1: Remove expired entries
    mutableResult.removedByReason.expired = this.removeExpired(memories, mutableResult.removedByType);
    
    // Step 2: Remove entries that exceed type limits
    mutableResult.removedByReason.overLimit = this.enforceTypeLimits(memories, mutableResult.removedByType);
    
    // Step 3: Remove low importance entries if still over limits
    mutableResult.removedByReason.lowImportance = this.removeLowImportance(memories, mutableResult.removedByType);
    
    // Step 4: Remove rarely accessed entries
    mutableResult.removedByReason.lowAccess = this.removeLowAccess(memories, mutableResult.removedByType);
    
    // Step 5: Remove very old entries
    mutableResult.removedByReason.tooOld = this.removeOldEntries(memories, mutableResult.removedByType);
    
    // Calculate totals
    mutableResult.totalRemoved = Object.values(mutableResult.removedByReason).reduce((sum, count) => sum + count, 0);
    mutableResult.afterCount = memories.size;
    mutableResult.duration = Date.now() - startTime;
    
    this.emit(PruningEvent.PRUNE_COMPLETE, mutableResult);
    
    if (mutableResult.totalRemoved > 0) {
      logger.info('Memory pruning completed', {
        removed: mutableResult.totalRemoved,
        before: mutableResult.beforeCount,
        after: mutableResult.afterCount,
        duration: mutableResult.duration
      });
    }
    
    return mutableResult;
  }
  
  /**
   * Remove only expired entries
   */
  public removeExpired(
    memories: Map<string, MemoryEntry>,
    typeCounters?: Record<MemoryStorageType, number>
  ): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [id, entry] of memories.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        memories.delete(id);
        removed++;
        
        if (typeCounters) {
          typeCounters[entry.type]++;
        }
      }
    }
    
    if (removed > 0) {
      this.emit(PruningEvent.EXPIRY_CHECK, { removed });
      logger.debug(`Removed ${removed} expired memory entries`);
    }
    
    return removed;
  }
  
  /**
   * Enforce memory limits per type
   */
  public enforceTypeLimits(
    memories: Map<string, MemoryEntry>,
    typeCounters?: Record<MemoryStorageType, number>
  ): number {
    let totalRemoved = 0;
    
    for (const type of Object.values(MemoryStorageType)) {
      const maxAllowed = this.config.maxEntries[type];
      const entriesOfType = Array.from(memories.values()).filter(entry => entry.type === type);
      
      if (entriesOfType.length <= maxAllowed) {
        continue;
      }
      
      this.emit(PruningEvent.LIMIT_EXCEEDED, {
        type,
        current: entriesOfType.length,
        max: maxAllowed
      });
      
      // Sort by importance and recency (keep the best)
      const sorted = entriesOfType.sort((a, b) => {
        const importanceDiff = (b.importance || 0) - (a.importance || 0);
        if (importanceDiff !== 0) return importanceDiff;
        return b.lastAccessedAt - a.lastAccessedAt;
      });
      
      // Remove excess entries
      const toRemove = sorted.slice(maxAllowed);
      for (const entry of toRemove) {
        memories.delete(entry.id);
        totalRemoved++;
        
        if (typeCounters) {
          typeCounters[entry.type]++;
        }
      }
      
      logger.debug(`Pruned ${toRemove.length} entries of type ${type} (limit: ${maxAllowed})`);
    }
    
    return totalRemoved;
  }
  
  /**
   * Apply custom pruning strategy
   */
  public applyStrategy(
    memories: Map<string, MemoryEntry>,
    strategyName: string
  ): number {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown pruning strategy: ${strategyName}`);
    }
    
    const entries = Array.from(memories.values());
    const kept = strategy.execute(entries);
    const removed = entries.length - kept.length;
    
    // Update memories map
    memories.clear();
    for (const entry of kept) {
      memories.set(entry.id, entry);
    }
    
    logger.debug(`Applied strategy '${strategyName}', removed ${removed} entries`);
    return removed;
  }
  
  /**
   * Get pruning statistics
   */
  public getStats(memories: Map<string, MemoryEntry>): {
    totalEntries: number;
    entriesByType: Record<MemoryStorageType, number>;
    expiredEntries: number;
    overLimitTypes: string[];
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(memories.values());
    const now = Date.now();
    
    const entriesByType = this.initializeTypeCounters();
    let expiredEntries = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    
    for (const entry of entries) {
      entriesByType[entry.type]++;
      
      if (entry.expiresAt && now > entry.expiresAt) {
        expiredEntries++;
      }
      
      if (entry.createdAt < oldestTimestamp) {
        oldestTimestamp = entry.createdAt;
      }
      
      if (entry.createdAt > newestTimestamp) {
        newestTimestamp = entry.createdAt;
      }
    }
    
    const overLimitTypes = Object.entries(this.config.maxEntries)
      .filter(([type, limit]) => entriesByType[type as MemoryStorageType] > limit)
      .map(([type]) => type);
    
    return {
      totalEntries: entries.length,
      entriesByType,
      expiredEntries,
      overLimitTypes,
      oldestEntry: oldestTimestamp !== Infinity ? new Date(oldestTimestamp) : undefined,
      newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp) : undefined
    };
  }
  
  /**
   * Stop auto-pruning
   */
  public stop(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = undefined;
    }
    
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
      this.expiryTimer = undefined;
    }
    
    logger.debug('Memory pruning service stopped');
  }
  
  // Private helper methods
  
  private initializeStrategies(): void {
    // Importance-based strategy
    this.strategies.set('importance', {
      name: 'importance',
      description: 'Remove entries with lowest importance scores',
      execute: (entries) => entries
        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
        .filter((_, index) => index < Math.floor(entries.length * 0.8))
    });
    
    // Access-based strategy
    this.strategies.set('access', {
      name: 'access',
      description: 'Remove least accessed entries',
      execute: (entries) => entries
        .sort((a, b) => b.accessCount - a.accessCount)
        .filter((_, index) => index < Math.floor(entries.length * 0.8))
    });
    
    // Age-based strategy
    this.strategies.set('age', {
      name: 'age',
      description: 'Remove oldest entries',
      execute: (entries) => entries
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((_, index) => index < Math.floor(entries.length * 0.8))
    });
  }
  
  private startAutoPruning(): void {
    if (!this.config.autoPrune) {
      return;
    }
    
    // Start periodic pruning
    this.pruneTimer = setInterval(() => {
      this.emit('auto-prune-trigger');
    }, this.config.pruneInterval);
    
    // Start expiry checking
    this.expiryTimer = setInterval(() => {
      this.emit('auto-expiry-check');
    }, this.config.expiryCheckInterval);
  }
  
  private removeLowImportance(
    memories: Map<string, MemoryEntry>,
    typeCounters: Record<MemoryStorageType, number>
  ): number {
    let removed = 0;
    
    for (const [id, entry] of memories.entries()) {
      if ((entry.importance || 0) < this.config.importanceThreshold) {
        memories.delete(id);
        typeCounters[entry.type]++;
        removed++;
      }
    }
    
    return removed;
  }
  
  private removeLowAccess(
    memories: Map<string, MemoryEntry>,
    typeCounters: Record<MemoryStorageType, number>
  ): number {
    let removed = 0;
    
    for (const [id, entry] of memories.entries()) {
      if (entry.accessCount < this.config.accessThreshold) {
        memories.delete(id);
        typeCounters[entry.type]++;
        removed++;
      }
    }
    
    return removed;
  }
  
  private removeOldEntries(
    memories: Map<string, MemoryEntry>,
    typeCounters: Record<MemoryStorageType, number>
  ): number {
    const cutoffTime = Date.now() - this.config.ageThreshold;
    let removed = 0;
    
    for (const [id, entry] of memories.entries()) {
      if (entry.createdAt < cutoffTime) {
        memories.delete(id);
        typeCounters[entry.type]++;
        removed++;
      }
    }
    
    return removed;
  }
  
  private initializeTypeCounters(): Record<MemoryStorageType, number> {
    return Object.values(MemoryStorageType).reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<MemoryStorageType, number>
    );
  }
}

/**
 * Factory function for creating memory pruning service
 */
export function createMemoryPruningService(config: PruningConfig): MemoryPruningService {
  return new MemoryPruningService(config);
}