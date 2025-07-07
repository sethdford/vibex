/**
 * Memory Services - Following Gemini CLI Architecture
 * 
 * Centralized exports for all memory services
 * Clean factory functions for easy integration
 */

// Service exports
export { MemoryStorageService, type StorageConfig, type StorageResult, StorageEvent } from '../memory-storage.js';
export { MemoryRetrievalService, type RetrievalConfig, type MemoryRetrievalOptions, type SearchResult, RetrievalEvent } from '../memory-retrieval.js';
export { MemoryPruningService, type PruningConfig, type PruningResult, PruningEvent } from '../memory-pruning.js';
export { MemoryOrchestrator, type MemorySystemConfig, type MemoryOperationResult, type MemoryStats, createMemoryOrchestrator } from '../memory-orchestrator.js';

// Type exports

export { MemoryStorageType, MemoryEvent, type MemoryEntry, type MemoryTag, type MemoryContent } from '../../types/memory.js';

import { MemoryOrchestrator, type MemorySystemConfig, createMemoryOrchestrator } from '../memory-orchestrator.js';
import { MemoryStorageType } from '../../types/memory.js';

/**
 * Default memory system configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemorySystemConfig = {
  storage: {
    storageDir: '.vibex/memory',
    autoSave: true,
    encrypt: false,
    compressionLevel: 6,
    backupCount: 3
  },
  retrieval: {
    defaultLimit: 10,
    maxLimit: 100,
    cacheSize: 50,
    enableCaching: true
  },
  pruning: {
    maxEntries: {
      [MemoryStorageType.SESSION]: 100,
      [MemoryStorageType.USER]: 50,
      [MemoryStorageType.SYSTEM]: 20,
      [MemoryStorageType.GLOBAL]: 10,
      [MemoryStorageType.WORKSPACE]: 100,
      [MemoryStorageType.PROJECT]: 50
    },
    autoPrune: true,
    pruneInterval: 5 * 60 * 1000, // 5 minutes
    expiryCheckInterval: 1 * 60 * 1000, // 1 minute
    importanceThreshold: 10,
    accessThreshold: 1,
    ageThreshold: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  autoSave: true,
  autoPrune: true
};

/**
 * Create a complete memory system with all services
 */
export function createMemoryServices(
  config: Partial<MemorySystemConfig> = {},
  encryptionKey?: string
): MemoryOrchestrator {
  const fullConfig: MemorySystemConfig = {
    ...DEFAULT_MEMORY_CONFIG,
    ...config,
    storage: { ...DEFAULT_MEMORY_CONFIG.storage, ...config.storage },
    retrieval: { ...DEFAULT_MEMORY_CONFIG.retrieval, ...config.retrieval },
    pruning: { ...DEFAULT_MEMORY_CONFIG.pruning, ...config.pruning }
  };
  
  return createMemoryOrchestrator(fullConfig, encryptionKey);
}

/**
 * Create memory system with custom storage directory
 */
export function createMemoryServicesForProject(
  projectPath: string,
  encryptionKey?: string
): MemoryOrchestrator {
  const config: Partial<MemorySystemConfig> = {
    storage: {
      ...DEFAULT_MEMORY_CONFIG.storage,
      storageDir: `${projectPath}/.vibex/memory`
    }
  };
  
  return createMemoryServices(config, encryptionKey);
}

/**
 * Create lightweight memory system for testing
 */
export function createTestMemoryServices(): MemoryOrchestrator {
  const config: Partial<MemorySystemConfig> = {
    storage: {
      ...DEFAULT_MEMORY_CONFIG.storage,
      autoSave: false,
      encrypt: false,
      backupCount: 0
    },
    pruning: {
      ...DEFAULT_MEMORY_CONFIG.pruning,
      autoPrune: false
    },
    autoSave: false,
    autoPrune: false
  };
  
  return createMemoryServices(config);
} 