/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Database Migrations
 * 
 * Defines the database schema evolution for VibeX.
 * Each migration represents a version of the database schema.
 */

import { Migration, DatabaseConnection } from './base-repository.js';

/**
 * Initial schema migration - creates basic tables
 */
export const migration_001_initial_schema: Migration = {
  version: '001_initial_schema',
  description: 'Create initial database schema',
  
  async up(connection: DatabaseConnection): Promise<void> {
    // Conversations table
    await connection.query(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        messages TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Memories table
    await connection.query(`
      CREATE TABLE memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'general',
        importance INTEGER NOT NULL DEFAULT 1,
        tags TEXT NOT NULL DEFAULT '[]',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tools table
    await connection.query(`
      CREATE TABLE tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        parameters TEXT NOT NULL DEFAULT '{}',
        namespace TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Checkpoints table
    await connection.query(`
      CREATE TABLE checkpoints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        file_paths TEXT NOT NULL DEFAULT '[]',
        git_commit_hash TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  },
  
  async down(connection: DatabaseConnection): Promise<void> {
    await connection.query('DROP TABLE IF EXISTS checkpoints');
    await connection.query('DROP TABLE IF EXISTS tools');
    await connection.query('DROP TABLE IF EXISTS memories');
    await connection.query('DROP TABLE IF EXISTS conversations');
  }
};

/**
 * Add indexes for performance
 */
export const migration_002_add_indexes: Migration = {
  version: '002_add_indexes',
  description: 'Add database indexes for performance',
  
  async up(connection: DatabaseConnection): Promise<void> {
    // Conversations indexes
    await connection.query('CREATE INDEX idx_conversations_created_at ON conversations(created_at)');
    await connection.query('CREATE INDEX idx_conversations_updated_at ON conversations(updated_at)');
    
    // Memories indexes
    await connection.query('CREATE INDEX idx_memories_type ON memories(type)');
    await connection.query('CREATE INDEX idx_memories_importance ON memories(importance)');
    await connection.query('CREATE INDEX idx_memories_created_at ON memories(created_at)');
    
    // Tools indexes
    await connection.query('CREATE INDEX idx_tools_name ON tools(name)');
    await connection.query('CREATE INDEX idx_tools_namespace ON tools(namespace)');
    
    // Checkpoints indexes
    await connection.query('CREATE INDEX idx_checkpoints_name ON checkpoints(name)');
    await connection.query('CREATE INDEX idx_checkpoints_created_at ON checkpoints(created_at)');
  },
  
  async down(connection: DatabaseConnection): Promise<void> {
    await connection.query('DROP INDEX IF EXISTS idx_checkpoints_created_at');
    await connection.query('DROP INDEX IF EXISTS idx_checkpoints_name');
    await connection.query('DROP INDEX IF EXISTS idx_tools_namespace');
    await connection.query('DROP INDEX IF EXISTS idx_tools_name');
    await connection.query('DROP INDEX IF EXISTS idx_memories_created_at');
    await connection.query('DROP INDEX IF EXISTS idx_memories_importance');
    await connection.query('DROP INDEX IF EXISTS idx_memories_type');
    await connection.query('DROP INDEX IF EXISTS idx_conversations_updated_at');
    await connection.query('DROP INDEX IF EXISTS idx_conversations_created_at');
  }
};

/**
 * Add full-text search capabilities
 */
export const migration_003_add_fts: Migration = {
  version: '003_add_fts',
  description: 'Add full-text search capabilities',
  
  async up(connection: DatabaseConnection): Promise<void> {
    // Create FTS tables for searchable content
    await connection.query(`
      CREATE VIRTUAL TABLE conversations_fts USING fts5(
        id UNINDEXED,
        title,
        messages,
        content='conversations',
        content_rowid='rowid'
      )
    `);
    
    await connection.query(`
      CREATE VIRTUAL TABLE memories_fts USING fts5(
        id UNINDEXED,
        content,
        tags,
        content='memories',
        content_rowid='rowid'
      )
    `);
    
    // Create triggers to keep FTS tables in sync
    await connection.query(`
      CREATE TRIGGER conversations_fts_insert AFTER INSERT ON conversations
      BEGIN
        INSERT INTO conversations_fts(id, title, messages) 
        VALUES (NEW.id, NEW.title, NEW.messages);
      END
    `);
    
    await connection.query(`
      CREATE TRIGGER conversations_fts_update AFTER UPDATE ON conversations
      BEGIN
        UPDATE conversations_fts 
        SET title = NEW.title, messages = NEW.messages 
        WHERE id = NEW.id;
      END
    `);
    
    await connection.query(`
      CREATE TRIGGER conversations_fts_delete AFTER DELETE ON conversations
      BEGIN
        DELETE FROM conversations_fts WHERE id = OLD.id;
      END
    `);
    
    await connection.query(`
      CREATE TRIGGER memories_fts_insert AFTER INSERT ON memories
      BEGIN
        INSERT INTO memories_fts(id, content, tags) 
        VALUES (NEW.id, NEW.content, NEW.tags);
      END
    `);
    
    await connection.query(`
      CREATE TRIGGER memories_fts_update AFTER UPDATE ON memories
      BEGIN
        UPDATE memories_fts 
        SET content = NEW.content, tags = NEW.tags 
        WHERE id = NEW.id;
      END
    `);
    
    await connection.query(`
      CREATE TRIGGER memories_fts_delete AFTER DELETE ON memories
      BEGIN
        DELETE FROM memories_fts WHERE id = OLD.id;
      END
    `);
  },
  
  async down(connection: DatabaseConnection): Promise<void> {
    await connection.query('DROP TRIGGER IF EXISTS memories_fts_delete');
    await connection.query('DROP TRIGGER IF EXISTS memories_fts_update');
    await connection.query('DROP TRIGGER IF EXISTS memories_fts_insert');
    await connection.query('DROP TRIGGER IF EXISTS conversations_fts_delete');
    await connection.query('DROP TRIGGER IF EXISTS conversations_fts_update');
    await connection.query('DROP TRIGGER IF EXISTS conversations_fts_insert');
    await connection.query('DROP TABLE IF EXISTS memories_fts');
    await connection.query('DROP TABLE IF EXISTS conversations_fts');
  }
};

/**
 * Create all migrations in order
 */
export function createMigrations(): Migration[] {
  return [
    migration_001_initial_schema,
    migration_002_add_indexes,
    migration_003_add_fts
  ];
}

/**
 * All migrations in order
 */
export const allMigrations: Migration[] = [
  migration_001_initial_schema,
  migration_002_add_indexes,
  migration_003_add_fts
]; 