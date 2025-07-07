/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Domain-Specific Repository Implementations
 * 
 * Provides specialized repository implementations for VibeX domain entities
 * with domain-specific query methods and business logic.
 */

import { SQLiteRepository, SQLiteConnection } from './sqlite-repository.js';
import { QueryOptions, RepositoryResult } from './base-repository.js';
import { 
  ConversationEntity, 
  MessageEntity, 
  ToolCallEntity, 
  MemoryEntity, 
  CheckpointEntity,
  ToolRegistrationEntity,
  SessionEntity,
  ConfigurationEntity
} from './entities.js';

/**
 * Conversation repository with domain-specific methods
 */
export class ConversationRepository extends SQLiteRepository<ConversationEntity> {
  constructor(connection: SQLiteConnection) {
    super('conversations', connection, [
      'id', 'title', 'status', 'metadata', 'messageCount', 'tokenCount', 
      'lastMessageAt', 'projectPath', 'tags', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find conversations by project path
   */
  async findByProject(projectPath: string, options: QueryOptions = {}): Promise<RepositoryResult<ConversationEntity>> {
    return this.findBy({ projectPath }, options);
  }

  /**
   * Find active conversations
   */
  async findActive(options: QueryOptions = {}): Promise<RepositoryResult<ConversationEntity>> {
    return this.findBy({ status: 'active' }, options);
  }

  /**
   * Find conversations by tags
   */
  async findByTags(tags: string[], options: QueryOptions = {}): Promise<RepositoryResult<ConversationEntity>> {
    const { limit = 50, offset = 0 } = options;
    
    // Create placeholders for tags
    const placeholders = tags.map(() => '?').join(',');
    const sql = `
      SELECT DISTINCT c.* FROM conversations c
      JOIN json_each(c.tags) je ON je.value IN (${placeholders})
      ORDER BY c.lastMessageAt DESC
      LIMIT ? OFFSET ?
    `;
    
    const rows = await (this as any).connection.query(sql, [...tags, limit, offset]);
    return {
      items: rows.map((row: any) => (this as any).deserializeEntity(row)),
      total: rows.length,
      hasMore: rows.length === limit
    };
  }

  /**
   * Update message count and last message timestamp
   */
  async updateMessageStats(id: string, messageCount: number, lastMessageAt: Date): Promise<void> {
    const sql = `UPDATE conversations SET messageCount = ?, lastMessageAt = ?, updatedAt = ? WHERE id = ?`;
    await (this as any).connection.run(sql, [messageCount, lastMessageAt.toISOString(), new Date().toISOString(), id]);
  }
}

/**
 * Message repository with domain-specific methods
 */
export class MessageRepository extends SQLiteRepository<MessageEntity> {
  constructor(connection: SQLiteConnection) {
    super('messages', connection, [
      'id', 'conversationId', 'role', 'content', 'contentType', 'metadata', 
      'tokenCount', 'toolCalls', 'parentMessageId', 'branchId', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find messages by conversation
   */
  async findByConversation(conversationId: string, options: QueryOptions = {}): Promise<RepositoryResult<MessageEntity>> {
    return this.findBy({ conversationId }, { 
      ...options, 
      sortBy: 'createdAt', 
      sortOrder: 'asc' 
    });
  }

  /**
   * Find messages in a conversation branch
   */
  async findByBranch(conversationId: string, branchId: string, options: QueryOptions = {}): Promise<RepositoryResult<MessageEntity>> {
    return this.findBy({ conversationId, branchId }, { 
      ...options, 
      sortBy: 'createdAt', 
      sortOrder: 'asc' 
    });
  }

  /**
   * Find the latest message in a conversation
   */
  async findLatestInConversation(conversationId: string): Promise<MessageEntity | null> {
    const result = await this.findBy({ conversationId }, { 
      limit: 1, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    });
    return result.items[0] || null;
  }

  /**
   * Search messages by content
   */
  async searchContent(query: string, options: QueryOptions = {}): Promise<RepositoryResult<MessageEntity>> {
    const { limit = 50, offset = 0 } = options;
    
    const sql = `
      SELECT * FROM messages 
      WHERE content LIKE ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `;
    
    const rows = await (this as any).connection.query(sql, [`%${query}%`, limit, offset]);
    return {
      items: rows.map((row: any) => (this as any).deserializeEntity(row)),
      total: rows.length,
      hasMore: rows.length === limit
    };
  }
}

/**
 * Tool call repository with domain-specific methods
 */
export class ToolCallRepository extends SQLiteRepository<ToolCallEntity> {
  constructor(connection: SQLiteConnection) {
    super('tool_calls', connection, [
      'id', 'messageId', 'toolName', 'input', 'output', 'status', 
      'startedAt', 'completedAt', 'error', 'metadata', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find tool calls by message
   */
  async findByMessage(messageId: string, options: QueryOptions = {}): Promise<RepositoryResult<ToolCallEntity>> {
    return this.findBy({ messageId }, options);
  }

  /**
   * Find tool calls by status
   */
  async findByStatus(status: ToolCallEntity['status'], options: QueryOptions = {}): Promise<RepositoryResult<ToolCallEntity>> {
    return this.findBy({ status }, options);
  }

  /**
   * Find tool calls by tool name
   */
  async findByTool(toolName: string, options: QueryOptions = {}): Promise<RepositoryResult<ToolCallEntity>> {
    return this.findBy({ toolName }, options);
  }

  /**
   * Update tool call status
   */
  async updateStatus(id: string, status: ToolCallEntity['status'], output?: string, error?: string): Promise<void> {
    const updates: Partial<ToolCallEntity> = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }
    
    if (output) updates.output = output;
    if (error) updates.error = error;
    
    await this.update(id, updates);
  }
}

/**
 * Memory repository with domain-specific methods
 */
export class MemoryRepository extends SQLiteRepository<MemoryEntity> {
  constructor(connection: SQLiteConnection) {
    super('memories', connection, [
      'id', 'content', 'type', 'importance', 'tags', 'source', 
      'projectPath', 'expiresAt', 'metadata', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find memories by type
   */
  async findByType(type: MemoryEntity['type'], options: QueryOptions = {}): Promise<RepositoryResult<MemoryEntity>> {
    return this.findBy({ type }, options);
  }

  /**
   * Find memories by project
   */
  async findByProject(projectPath: string, options: QueryOptions = {}): Promise<RepositoryResult<MemoryEntity>> {
    return this.findBy({ projectPath }, options);
  }

  /**
   * Find memories by importance threshold
   */
  async findByImportance(minImportance: number, options: QueryOptions = {}): Promise<RepositoryResult<MemoryEntity>> {
    const { limit = 50, offset = 0 } = options;
    
    const sql = `
      SELECT * FROM memories 
      WHERE importance >= ? AND (expiresAt IS NULL OR expiresAt > ?)
      ORDER BY importance DESC, createdAt DESC
      LIMIT ? OFFSET ?
    `;
    
    const rows = await (this as any).connection.query(sql, [
      minImportance, 
      new Date().toISOString(), 
      limit, 
      offset
    ]);
    
    return {
      items: rows.map((row: any) => (this as any).deserializeEntity(row)),
      total: rows.length,
      hasMore: rows.length === limit
    };
  }

  /**
   * Search memories by content
   */
  async searchContent(query: string, options: QueryOptions = {}): Promise<RepositoryResult<MemoryEntity>> {
    const { limit = 50, offset = 0 } = options;
    
    const sql = `
      SELECT * FROM memories 
      WHERE content LIKE ? AND (expiresAt IS NULL OR expiresAt > ?)
      ORDER BY importance DESC, createdAt DESC
      LIMIT ? OFFSET ?
    `;
    
    const rows = await (this as any).connection.query(sql, [
      `%${query}%`, 
      new Date().toISOString(), 
      limit, 
      offset
    ]);
    
    return {
      items: rows.map((row: any) => (this as any).deserializeEntity(row)),
      total: rows.length,
      hasMore: rows.length === limit
    };
  }

  /**
   * Clean up expired memories
   */
  async cleanupExpired(): Promise<number> {
    const sql = `DELETE FROM memories WHERE expiresAt IS NOT NULL AND expiresAt <= ?`;
    const result = await (this as any).connection.run(sql, [new Date().toISOString()]);
    return result.changes;
  }
}

/**
 * Checkpoint repository with domain-specific methods
 */
export class CheckpointRepository extends SQLiteRepository<CheckpointEntity> {
  constructor(connection: SQLiteConnection) {
    super('checkpoints', connection, [
      'id', 'name', 'description', 'conversationId', 'projectPath', 
      'gitCommitHash', 'fileChanges', 'metadata', 'restoredAt', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find checkpoints by project
   */
  async findByProject(projectPath: string, options: QueryOptions = {}): Promise<RepositoryResult<CheckpointEntity>> {
    return this.findBy({ projectPath }, { 
      ...options, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    });
  }

  /**
   * Find checkpoints by conversation
   */
  async findByConversation(conversationId: string, options: QueryOptions = {}): Promise<RepositoryResult<CheckpointEntity>> {
    return this.findBy({ conversationId }, { 
      ...options, 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    });
  }

  /**
   * Mark checkpoint as restored
   */
  async markRestored(id: string): Promise<void> {
    await this.update(id, { restoredAt: new Date() });
  }
}

/**
 * Tool registration repository with domain-specific methods
 */
export class ToolRegistrationRepository extends SQLiteRepository<ToolRegistrationEntity> {
  constructor(connection: SQLiteConnection) {
    super('tool_registrations', connection, [
      'id', 'name', 'namespace', 'description', 'version', 'schema', 
      'source', 'enabled', 'trustLevel', 'executionCount', 'lastExecutedAt', 
      'metadata', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find enabled tools
   */
  async findEnabled(options: QueryOptions = {}): Promise<RepositoryResult<ToolRegistrationEntity>> {
    return this.findBy({ enabled: true }, options);
  }

  /**
   * Find tools by namespace
   */
  async findByNamespace(namespace: string, options: QueryOptions = {}): Promise<RepositoryResult<ToolRegistrationEntity>> {
    return this.findBy({ namespace }, options);
  }

  /**
   * Find tool by name and namespace
   */
  async findByNameAndNamespace(name: string, namespace: string): Promise<ToolRegistrationEntity | null> {
    const result = await this.findBy({ name, namespace }, { limit: 1 });
    return result.items[0] || null;
  }

  /**
   * Update execution statistics
   */
  async updateExecutionStats(id: string): Promise<void> {
    const tool = await this.findById(id);
    if (tool) {
      await this.update(id, {
        executionCount: tool.executionCount + 1,
        lastExecutedAt: new Date()
      });
    }
  }

  /**
   * Update trust level
   */
  async updateTrustLevel(id: string, trustLevel: ToolRegistrationEntity['trustLevel']): Promise<void> {
    await this.update(id, { trustLevel });
  }
}

/**
 * Session repository with domain-specific methods
 */
export class SessionRepository extends SQLiteRepository<SessionEntity> {
  constructor(connection: SQLiteConnection) {
    super('sessions', connection, [
      'id', 'userId', 'projectPath', 'startedAt', 'endedAt', 
      'conversationIds', 'toolExecutions', 'tokenUsage', 'metadata', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find active sessions
   */
  async findActive(options: QueryOptions = {}): Promise<RepositoryResult<SessionEntity>> {
    const sql = `SELECT * FROM sessions WHERE endedAt IS NULL ORDER BY startedAt DESC LIMIT ? OFFSET ?`;
    const { limit = 50, offset = 0 } = options;
    
    const rows = await (this as any).connection.query(sql, [limit, offset]);
    return {
      items: rows.map((row: any) => (this as any).deserializeEntity(row)),
      total: rows.length,
      hasMore: rows.length === limit
    };
  }

  /**
   * End a session
   */
  async endSession(id: string): Promise<void> {
    await this.update(id, { endedAt: new Date() });
  }

  /**
   * Update token usage
   */
  async updateTokenUsage(id: string, tokenUsage: SessionEntity['tokenUsage']): Promise<void> {
    await this.update(id, { tokenUsage });
  }
}

/**
 * Configuration repository with domain-specific methods
 */
export class ConfigurationRepository extends SQLiteRepository<ConfigurationEntity> {
  constructor(connection: SQLiteConnection) {
    super('configurations', connection, [
      'id', 'key', 'value', 'type', 'scope', 'projectPath', 
      'encrypted', 'metadata', 'createdAt', 'updatedAt'
    ]);
  }

  /**
   * Find configuration by key and scope
   */
  async findByKey(key: string, scope: ConfigurationEntity['scope'] = 'global', projectPath?: string): Promise<ConfigurationEntity | null> {
    const criteria: Partial<ConfigurationEntity> = { key, scope };
    if (projectPath) criteria.projectPath = projectPath;
    
    const result = await this.findBy(criteria, { limit: 1 });
    return result.items[0] || null;
  }

  /**
   * Set configuration value
   */
  async setValue(
    key: string, 
    value: any, 
    scope: ConfigurationEntity['scope'] = 'global',
    projectPath?: string,
    type: ConfigurationEntity['type'] = 'user'
  ): Promise<ConfigurationEntity> {
    const existing = await this.findByKey(key, scope, projectPath);
    
    if (existing) {
      return await this.update(existing.id, { value }) as ConfigurationEntity;
    } else {
      return await this.save({
        key,
        value,
        type,
        scope,
        projectPath,
        encrypted: false,
        metadata: {}
      });
    }
  }

  /**
   * Get configuration value with default
   */
  async getValue<T = any>(
    key: string, 
    defaultValue: T, 
    scope: ConfigurationEntity['scope'] = 'global',
    projectPath?: string
  ): Promise<T> {
    const config = await this.findByKey(key, scope, projectPath);
    return config ? config.value : defaultValue;
  }
} 