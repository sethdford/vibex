/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Base Repository Interfaces and Implementations
 * 
 * Provides foundational repository patterns for data persistence
 * following clean architecture principles.
 */

import { logger } from '../../utils/logger.js';

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query options for repository operations
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Repository result with pagination
 */
export interface RepositoryResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

/**
 * Base repository interface
 */
export interface BaseRepository<T extends BaseEntity> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;
  
  /**
   * Find all entities with optional query options
   */
  findAll(options?: QueryOptions): Promise<RepositoryResult<T>>;
  
  /**
   * Find entities by criteria
   */
  findBy(criteria: Partial<T>, options?: QueryOptions): Promise<RepositoryResult<T>>;
  
  /**
   * Save entity (create or update)
   */
  save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'> | T): Promise<T>;
  
  /**
   * Update entity by ID
   */
  update(id: string, updates: Partial<T>): Promise<T | null>;
  
  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;
  
  /**
   * Count entities
   */
  count(criteria?: Partial<T>): Promise<number>;
}

/**
 * Abstract base repository implementation
 */
export abstract class AbstractRepository<T extends BaseEntity> implements BaseRepository<T> {
  
  constructor(protected tableName: string) {}
  
  /**
   * Generate a new ID for entities
   */
  protected generateId(): string {
    return `${this.tableName}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Add timestamps to entity
   */
  protected addTimestamps(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    const now = new Date();
    return {
      ...entity,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    } as T;
  }
  
  /**
   * Update timestamps on entity
   */
  protected updateTimestamps(entity: T): T {
    return {
      ...entity,
      updatedAt: new Date()
    };
  }
  
  // Abstract methods to be implemented by concrete repositories
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<RepositoryResult<T>>;
  abstract findBy(criteria: Partial<T>, options?: QueryOptions): Promise<RepositoryResult<T>>;
  abstract save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'> | T): Promise<T>;
  abstract update(id: string, updates: Partial<T>): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(criteria?: Partial<T>): Promise<number>;
}

/**
 * Repository factory interface
 */
export interface RepositoryFactory {
  /**
   * Create a repository for a given entity type
   */
  createRepository<T extends BaseEntity>(entityType: string): BaseRepository<T>;
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  /**
   * Connect to database
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from database
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if connected
   */
  isConnected(): boolean;
  
  /**
   * Execute a query
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  
  /**
   * Start a transaction
   */
  beginTransaction(): Promise<DatabaseTransaction>;
}

/**
 * Database transaction interface
 */
export interface DatabaseTransaction {
  /**
   * Commit the transaction
   */
  commit(): Promise<void>;
  
  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;
  
  /**
   * Execute a query within the transaction
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
}

/**
 * Migration interface
 */
export interface Migration {
  /**
   * Migration version
   */
  version: string;
  
  /**
   * Migration description
   */
  description: string;
  
  /**
   * Apply the migration
   */
  up(connection: DatabaseConnection): Promise<void>;
  
  /**
   * Rollback the migration
   */
  down(connection: DatabaseConnection): Promise<void>;
}

/**
 * Database schema manager
 */
export interface SchemaManager {
  /**
   * Initialize the schema
   */
  initialize(): Promise<void>;
  
  /**
   * Run pending migrations
   */
  migrate(): Promise<void>;
  
  /**
   * Rollback migrations
   */
  rollback(steps?: number): Promise<void>;
  
  /**
   * Get migration status
   */
  getStatus(): Promise<{ version: string; applied: boolean }[]>;
} 