/**
 * Memory System Types - Following Gemini CLI Architecture
 * 
 * Centralized type definitions for the memory system
 * Clean interfaces with proper documentation
 */

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
  readonly name: string;
  readonly value?: string;
}

/**
 * Memory content interface
 */
export interface MemoryContent {
  [key: string]: unknown;
}

/**
 * Memory Entry
 */
export interface MemoryEntry {
  /**
   * Unique ID
   */
  readonly id: string;
  
  /**
   * Memory creation timestamp
   */
  readonly createdAt: number;
  
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
  readonly type: MemoryStorageType;
  
  /**
   * Memory content
   */
  readonly content: MemoryContent;
  
  /**
   * Content type (json, string, message, etc.)
   */
  readonly contentType: string;
  
  /**
   * Optional expiry timestamp
   */
  readonly expiresAt?: number;
  
  /**
   * Optional tags for categorization
   */
  readonly tags?: MemoryTag[];
  
  /**
   * Optional importance score (0-100)
   */
  readonly importance?: number;
  
  /**
   * Optional embedding vector
   */
  readonly embedding?: number[];
}

/**
 * Memory events
 */
export enum MemoryEvent {
  STORE = 'memory-store',
  RETRIEVE = 'memory-retrieve',
  DELETE = 'memory-delete',
  OPTIMIZE = 'memory-optimize',
  ERROR = 'memory-error'
} 