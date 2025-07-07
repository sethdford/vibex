/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Repository Factory
 * 
 * Provides a centralized factory for creating and managing domain repositories
 * with proper dependency injection and lifecycle management.
 */

import path from 'path';
import { logger } from '../../utils/logger.js';
import { SQLiteConnection, SQLiteSchemaManager } from './sqlite-repository.js';
import { createMigrations } from './migrations.js';
import {
  ConversationRepository,
  MessageRepository,
  ToolCallRepository,
  MemoryRepository,
  CheckpointRepository,
  ToolRegistrationRepository,
  SessionRepository,
  ConfigurationRepository
} from './domain-repositories.js';

/**
 * Repository collection interface
 */
export interface RepositoryCollection {
  conversations: ConversationRepository;
  messages: MessageRepository;
  toolCalls: ToolCallRepository;
  memories: MemoryRepository;
  checkpoints: CheckpointRepository;
  toolRegistrations: ToolRegistrationRepository;
  sessions: SessionRepository;
  configurations: ConfigurationRepository;
}

/**
 * Repository factory configuration
 */
export interface RepositoryFactoryConfig {
  databasePath?: string;
  enableMigrations?: boolean;
  enableAutoBackup?: boolean;
  backupInterval?: number; // minutes
  maxBackups?: number;
}

/**
 * Repository factory for creating and managing domain repositories
 */
export class RepositoryFactory {
  private connection: SQLiteConnection | null = null;
  private schemaManager: SQLiteSchemaManager | null = null;
  private repositories: RepositoryCollection | null = null;
  private initialized = false;
  private backupTimer: NodeJS.Timeout | null = null;
  
  constructor(private config: RepositoryFactoryConfig = {}) {
    // Set default configuration
    this.config = {
      databasePath: path.join(process.cwd(), '.vibex', 'data', 'vibex.db'),
      enableMigrations: true,
      enableAutoBackup: true,
      backupInterval: 30, // 30 minutes
      maxBackups: 10,
      ...config
    };
  }

  /**
   * Initialize the repository factory
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create connection
      this.connection = new SQLiteConnection(this.config.databasePath!);
      await this.connection.connect();

      // Initialize schema manager
      this.schemaManager = new SQLiteSchemaManager(this.connection);
      await this.schemaManager.initialize();

      // Run migrations if enabled
      if (this.config.enableMigrations) {
        const migrations = createMigrations();
        for (const migration of migrations) {
          this.schemaManager.addMigration(migration);
        }
        await this.schemaManager.migrate();
      }

      // Create repositories
      this.repositories = {
        conversations: new ConversationRepository(this.connection),
        messages: new MessageRepository(this.connection),
        toolCalls: new ToolCallRepository(this.connection),
        memories: new MemoryRepository(this.connection),
        checkpoints: new CheckpointRepository(this.connection),
        toolRegistrations: new ToolRegistrationRepository(this.connection),
        sessions: new SessionRepository(this.connection),
        configurations: new ConfigurationRepository(this.connection)
      };

      // Setup auto-backup if enabled
      if (this.config.enableAutoBackup) {
        this.setupAutoBackup();
      }

      this.initialized = true;
      logger.info('Repository factory initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize repository factory:', error);
      throw error;
    }
  }

  /**
   * Get the repository collection
   */
  getRepositories(): RepositoryCollection {
    if (!this.initialized || !this.repositories) {
      throw new Error('Repository factory not initialized. Call initialize() first.');
    }
    return this.repositories;
  }

  /**
   * Get a specific repository
   */
  getRepository<K extends keyof RepositoryCollection>(name: K): RepositoryCollection[K] {
    const repositories = this.getRepositories();
    return repositories[name];
  }

  /**
   * Get the database connection
   */
  getConnection(): SQLiteConnection {
    if (!this.connection) {
      throw new Error('Repository factory not initialized. Call initialize() first.');
    }
    return this.connection;
  }

  /**
   * Get the schema manager
   */
  getSchemaManager(): SQLiteSchemaManager {
    if (!this.schemaManager) {
      throw new Error('Repository factory not initialized. Call initialize() first.');
    }
    return this.schemaManager;
  }

  /**
   * Create a backup of the database
   */
  async createBackup(): Promise<string> {
    if (!this.connection) {
      throw new Error('Repository factory not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = this.config.databasePath!.replace('.db', `_backup_${timestamp}.db`);

    try {
      // Use SQLite backup API
      const sql = `VACUUM INTO '${backupPath}'`;
      await this.connection.query(sql);
      
      logger.info(`Database backup created: ${backupPath}`);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return backupPath;
    } catch (error) {
      logger.error('Failed to create database backup:', error);
      throw error;
    }
  }

  /**
   * Clean up expired memories across all repositories
   */
  async cleanupExpiredData(): Promise<void> {
    if (!this.repositories) {
      throw new Error('Repository factory not initialized');
    }

    try {
      const expiredCount = await this.repositories.memories.cleanupExpired();
      if (expiredCount > 0) {
        logger.info(`Cleaned up ${expiredCount} expired memories`);
      }
    } catch (error) {
      logger.error('Failed to cleanup expired data:', error);
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    conversations: number;
    messages: number;
    toolCalls: number;
    memories: number;
    checkpoints: number;
    toolRegistrations: number;
    sessions: number;
    configurations: number;
    databaseSize: number;
  }> {
    if (!this.repositories || !this.connection) {
      throw new Error('Repository factory not initialized');
    }

    try {
      const [
        conversations,
        messages,
        toolCalls,
        memories,
        checkpoints,
        toolRegistrations,
        sessions,
        configurations
      ] = await Promise.all([
        this.repositories.conversations.count(),
        this.repositories.messages.count(),
        this.repositories.toolCalls.count(),
        this.repositories.memories.count(),
        this.repositories.checkpoints.count(),
        this.repositories.toolRegistrations.count(),
        this.repositories.sessions.count(),
        this.repositories.configurations.count()
      ]);

      // Get database file size
      const fs = await import('fs/promises');
      const stats = await fs.stat(this.config.databasePath!);

      return {
        conversations,
        messages,
        toolCalls,
        memories,
        checkpoints,
        toolRegistrations,
        sessions,
        configurations,
        databaseSize: stats.size
      };
    } catch (error) {
      logger.error('Failed to get database statistics:', error);
      throw error;
    }
  }

  /**
   * Close the repository factory and cleanup resources
   */
  async close(): Promise<void> {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }

    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }

    this.repositories = null;
    this.schemaManager = null;
    this.initialized = false;
    
    logger.info('Repository factory closed');
  }

  /**
   * Setup automatic backup timer
   */
  private setupAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    const intervalMs = this.config.backupInterval! * 60 * 1000; // Convert to milliseconds
    
    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup();
        await this.cleanupExpiredData();
      } catch (error) {
        logger.error('Auto-backup failed:', error);
      }
    }, intervalMs);

    logger.info(`Auto-backup enabled with ${this.config.backupInterval} minute interval`);
  }

  /**
   * Clean up old backup files
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dbDir = path.dirname(this.config.databasePath!);
      const files = await fs.readdir(dbDir);
      
      // Find backup files
      const backupFiles = files
        .filter(file => file.includes('_backup_') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(dbDir, file),
          stat: null as any
        }));

      // Get file stats
      for (const backup of backupFiles) {
        try {
          backup.stat = await fs.stat(backup.path);
        } catch (error) {
          // File might have been deleted, skip it
        }
      }

      // Sort by creation time (newest first) and remove old ones
      const validBackups = backupFiles
        .filter(backup => backup.stat)
        .sort((a, b) => b.stat.ctime.getTime() - a.stat.ctime.getTime());

      if (validBackups.length > this.config.maxBackups!) {
        const toDelete = validBackups.slice(this.config.maxBackups!);
        
        for (const backup of toDelete) {
          try {
            await fs.unlink(backup.path);
            logger.debug(`Deleted old backup: ${backup.name}`);
          } catch (error) {
            logger.warn(`Failed to delete old backup ${backup.name}:`, error);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old backups:', error);
    }
  }
}

/**
 * Global repository factory instance
 */
let globalRepositoryFactory: RepositoryFactory | null = null;

/**
 * Get or create the global repository factory
 */
export async function getRepositoryFactory(config?: RepositoryFactoryConfig): Promise<RepositoryFactory> {
  if (!globalRepositoryFactory) {
    globalRepositoryFactory = new RepositoryFactory(config);
    await globalRepositoryFactory.initialize();
  }
  return globalRepositoryFactory;
}

/**
 * Get repositories from the global factory
 */
export async function getRepositories(): Promise<RepositoryCollection> {
  const factory = await getRepositoryFactory();
  return factory.getRepositories();
}

/**
 * Close the global repository factory
 */
export async function closeRepositoryFactory(): Promise<void> {
  if (globalRepositoryFactory) {
    await globalRepositoryFactory.close();
    globalRepositoryFactory = null;
  }
} 