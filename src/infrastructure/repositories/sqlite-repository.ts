/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * SQLite Repository Implementation
 * 
 * Provides SQLite-based persistence for VibeX entities
 * following clean architecture principles.
 */

// @ts-ignore - sqlite3 types may not be available
import { Database } from 'sqlite3';
import path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger.js';
import { 
  BaseEntity, 
  BaseRepository, 
  AbstractRepository, 
  QueryOptions, 
  RepositoryResult,
  DatabaseConnection,
  DatabaseTransaction,
  RepositoryFactory,
  Migration,
  SchemaManager
} from './base-repository.js';

/**
 * SQLite database connection implementation
 */
export class SQLiteConnection implements DatabaseConnection {
  private db: Database | null = null;
  private connected = false;
  
  constructor(private dbPath: string) {}
  
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, (err: Error | null) => {
        if (err) {
          logger.error('Failed to connect to SQLite database:', err);
          reject(err);
        } else {
          this.connected = true;
          logger.info(`Connected to SQLite database: ${this.dbPath}`);
          resolve();
        }
      });
    });
  }
  
  async disconnect(): Promise<void> {
    if (!this.db || !this.connected) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.db!.close((err: Error | null) => {
        if (err) {
          logger.error('Failed to disconnect from SQLite database:', err);
          reject(err);
        } else {
          this.connected = false;
          this.db = null;
          logger.info('Disconnected from SQLite database');
          resolve();
        }
      });
    });
  }
  
  isConnected(): boolean {
    return this.connected && this.db !== null;
  }
  
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db || !this.connected) {
      throw new Error('Database not connected');
    }
    
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          logger.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }
  
  async beginTransaction(): Promise<DatabaseTransaction> {
    if (!this.db || !this.connected) {
      throw new Error('Database not connected');
    }
    
    await this.query('BEGIN TRANSACTION');
    return new SQLiteTransaction(this);
  }
  
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    if (!this.db || !this.connected) {
      throw new Error('Database not connected');
    }
    
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(this: { lastID: number; changes: number }, err: Error | null) {
        if (err) {
          logger.error('SQLite run error:', err);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }
}

/**
 * SQLite transaction implementation
 */
export class SQLiteTransaction implements DatabaseTransaction {
  private committed = false;
  private rolledBack = false;
  
  constructor(private connection: SQLiteConnection) {}
  
  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }
    
    await this.connection.query('COMMIT');
    this.committed = true;
  }
  
  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }
    
    await this.connection.query('ROLLBACK');
    this.rolledBack = true;
  }
  
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }
    
    return this.connection.query<T>(sql, params);
  }
}

/**
 * SQLite repository implementation
 */
export class SQLiteRepository<T extends BaseEntity> extends AbstractRepository<T> {
  
  constructor(
    tableName: string,
    private connection: SQLiteConnection,
    private entityFields: string[]
  ) {
    super(tableName);
  }
  
  async findById(id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const rows = await this.connection.query<T>(sql, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return this.deserializeEntity(rows[0]);
  }
  
  async findAll(options: QueryOptions = {}): Promise<RepositoryResult<T>> {
    const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    let sql = `SELECT * FROM ${this.tableName}`;
    let params: any[] = [];
    
    // Add WHERE clause if filters are provided
    if (options.filters) {
      const filterClauses = Object.keys(options.filters).map(key => `${key} = ?`);
      sql += ` WHERE ${filterClauses.join(' AND ')}`;
      params = Object.values(options.filters);
    }
    
    // Add ORDER BY
    sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    
    // Add LIMIT and OFFSET
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const rows = await this.connection.query<T>(sql, params);
    
    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    let countParams: any[] = [];
    
    if (options.filters) {
      const filterClauses = Object.keys(options.filters).map(key => `${key} = ?`);
      countSql += ` WHERE ${filterClauses.join(' AND ')}`;
      countParams = Object.values(options.filters);
    }
    
    const countResult = await this.connection.query<{ count: number }>(countSql, countParams);
    const total = countResult[0]?.count || 0;
    
    return {
      items: rows.map(row => this.deserializeEntity(row)),
      total,
      hasMore: offset + rows.length < total
    };
  }
  
  async findBy(criteria: Partial<T>, options: QueryOptions = {}): Promise<RepositoryResult<T>> {
    return this.findAll({
      ...options,
      filters: { ...options.filters, ...criteria }
    });
  }
  
  async save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'> | T): Promise<T> {
    // Check if entity has an ID (update) or not (create)
    if ('id' in entity && entity.id) {
      return this.updateEntity(entity as T);
    } else {
      return this.createEntity(entity as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
    }
  }
  
  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    
    const updated = this.updateTimestamps({ ...existing, ...updates });
    return this.updateEntity(updated);
  }
  
  async delete(id: string): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.connection.run(sql, [id]);
    return result.changes > 0;
  }
  
  async exists(id: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const rows = await this.connection.query(sql, [id]);
    return rows.length > 0;
  }
  
  async count(criteria?: Partial<T>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    let params: any[] = [];
    
    if (criteria) {
      const filterClauses = Object.keys(criteria).map(key => `${key} = ?`);
      sql += ` WHERE ${filterClauses.join(' AND ')}`;
      params = Object.values(criteria);
    }
    
    const result = await this.connection.query<{ count: number }>(sql, params);
    return result[0]?.count || 0;
  }
  
  private async createEntity(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const newEntity = this.addTimestamps(entity);
    
    const fields = Object.keys(newEntity);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(newEntity);
    
    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    await this.connection.run(sql, values);
    
    return newEntity;
  }
  
  private async updateEntity(entity: T): Promise<T> {
    const updated = this.updateTimestamps(entity);
    
    const fields = Object.keys(updated).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updated as any)[field]);
    values.push(updated.id);
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await this.connection.run(sql, values);
    
    return updated;
  }
  
  private deserializeEntity(row: any): T {
    // Convert date strings back to Date objects
    if (row.createdAt && typeof row.createdAt === 'string') {
      row.createdAt = new Date(row.createdAt);
    }
    if (row.updatedAt && typeof row.updatedAt === 'string') {
      row.updatedAt = new Date(row.updatedAt);
    }
    
    return row as T;
  }
}

/**
 * SQLite repository factory
 */
export class SQLiteRepositoryFactory implements RepositoryFactory {
  private repositories = new Map<string, BaseRepository<any>>();
  
  constructor(private connection: SQLiteConnection) {}
  
  createRepository<T extends BaseEntity>(entityType: string): BaseRepository<T> {
    if (this.repositories.has(entityType)) {
      return this.repositories.get(entityType)!;
    }
    
    // Define entity fields based on entity type
    const entityFields = this.getEntityFields(entityType);
    const repository = new SQLiteRepository<T>(entityType, this.connection, entityFields);
    
    this.repositories.set(entityType, repository);
    return repository;
  }
  
  private getEntityFields(entityType: string): string[] {
    // Default fields for all entities
    const baseFields = ['id', 'createdAt', 'updatedAt'];
    
    // Add entity-specific fields based on type
    switch (entityType) {
      case 'conversations':
        return [...baseFields, 'title', 'messages', 'metadata'];
      case 'memories':
        return [...baseFields, 'content', 'type', 'importance', 'tags'];
      case 'tools':
        return [...baseFields, 'name', 'description', 'parameters', 'namespace'];
      case 'checkpoints':
        return [...baseFields, 'name', 'description', 'filePaths', 'gitCommitHash'];
      default:
        return baseFields;
    }
  }
}

/**
 * SQLite schema manager
 */
export class SQLiteSchemaManager implements SchemaManager {
  private migrations: Migration[] = [];
  
  constructor(private connection: SQLiteConnection) {}
  
  async initialize(): Promise<void> {
    await this.connection.connect();
    
    // Create migrations table if it doesn't exist
    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        version TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('Database schema manager initialized');
  }
  
  async migrate(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = this.migrations.filter(
      migration => !appliedMigrations.includes(migration.version)
    );
    
    for (const migration of pendingMigrations) {
      logger.info(`Applying migration: ${migration.version} - ${migration.description}`);
      
      const transaction = await this.connection.beginTransaction();
      try {
        await migration.up(this.connection);
        await this.connection.run(
          'INSERT INTO migrations (version, description) VALUES (?, ?)',
          [migration.version, migration.description]
        );
        await transaction.commit();
        
        logger.info(`Migration applied: ${migration.version}`);
      } catch (error) {
        await transaction.rollback();
        logger.error(`Migration failed: ${migration.version}`, error);
        throw error;
      }
    }
  }
  
  async rollback(steps = 1): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationsToRollback = appliedMigrations.slice(-steps);
    
    for (const version of migrationsToRollback.reverse()) {
      const migration = this.migrations.find(m => m.version === version);
      if (!migration) {
        throw new Error(`Migration not found: ${version}`);
      }
      
      logger.info(`Rolling back migration: ${version}`);
      
      const transaction = await this.connection.beginTransaction();
      try {
        await migration.down(this.connection);
        await this.connection.run('DELETE FROM migrations WHERE version = ?', [version]);
        await transaction.commit();
        
        logger.info(`Migration rolled back: ${version}`);
      } catch (error) {
        await transaction.rollback();
        logger.error(`Migration rollback failed: ${version}`, error);
        throw error;
      }
    }
  }
  
  async getStatus(): Promise<{ version: string; applied: boolean }[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    
    return this.migrations.map(migration => ({
      version: migration.version,
      applied: appliedMigrations.includes(migration.version)
    }));
  }
  
  addMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }
  
  private async getAppliedMigrations(): Promise<string[]> {
    const rows = await this.connection.query<{ version: string }>(
      'SELECT version FROM migrations ORDER BY version'
    );
    return rows.map(row => row.version);
  }
} 