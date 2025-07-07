/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Repository Integration Tests
 * 
 * Comprehensive tests for the new repository architecture including
 * database operations, migrations, and domain-specific functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { 
  RepositoryFactory, 
  getRepositoryFactory, 
  closeRepositoryFactory 
} from '../../../src/infrastructure/repositories/repository-factory.js';
import { 
  ConversationEntity, 
  MessageEntity, 
  ToolCallEntity, 
  MemoryEntity,
  CheckpointEntity,
  ToolRegistrationEntity,
  SessionEntity,
  ConfigurationEntity
} from '../../../src/infrastructure/repositories/entities.js';

describe('Repository Integration Tests', () => {
  let tempDir: string;
  let repositoryFactory: RepositoryFactory;
  let repositories: any;

  beforeEach(async () => {
    // Create temporary directory for test database
    tempDir = path.join(os.tmpdir(), `vibex-repo-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize repository factory with test database
    repositoryFactory = new RepositoryFactory({
      databasePath: path.join(tempDir, 'test.db'),
      enableMigrations: true,
      enableAutoBackup: false // Disable for tests
    });

    await repositoryFactory.initialize();
    repositories = repositoryFactory.getRepositories();
  });

  afterEach(async () => {
    // Cleanup
    await repositoryFactory.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Database Schema and Migrations', () => {
    it('should create all required tables', async () => {
      const connection = repositoryFactory.getConnection();
      
      // Check that all tables exist
      const tables = await connection.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const tableNames = tables.map((t: any) => t.name);
      
      expect(tableNames).toContain('conversations');
      expect(tableNames).toContain('messages');
      expect(tableNames).toContain('tool_calls');
      expect(tableNames).toContain('memories');
      expect(tableNames).toContain('checkpoints');
      expect(tableNames).toContain('tool_registrations');
      expect(tableNames).toContain('sessions');
      expect(tableNames).toContain('configurations');
    });

    it('should create indexes for performance', async () => {
      const connection = repositoryFactory.getConnection();
      
      // Check that indexes exist
      const indexes = await connection.query(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const indexNames = indexes.map((i: any) => i.name);
      
      expect(indexNames.length).toBeGreaterThan(0);
      expect(indexNames.some(name => name.includes('conversations'))).toBe(true);
      expect(indexNames.some(name => name.includes('memories'))).toBe(true);
    });

    it('should support full-text search', async () => {
      const connection = repositoryFactory.getConnection();
      
      // Check that FTS tables exist
      const ftsTables = await connection.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%_fts'
        ORDER BY name
      `);
      
      const ftsTableNames = ftsTables.map((t: any) => t.name);
      
      expect(ftsTableNames).toContain('conversations_fts');
      expect(ftsTableNames).toContain('memories_fts');
    });
  });

  describe('Conversation Repository', () => {
    it('should create and retrieve conversations', async () => {
      const conversation: Omit<ConversationEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        title: 'Test Conversation',
        status: 'active',
        metadata: { source: 'test' },
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        projectPath: '/test/project',
        tags: ['test', 'integration']
      };

      const saved = await repositories.conversations.save(conversation);
      
      expect(saved.id).toBeDefined();
      expect(saved.title).toBe(conversation.title);
      expect(saved.status).toBe(conversation.status);
      expect(saved.tags).toEqual(conversation.tags);

      const retrieved = await repositories.conversations.findById(saved.id);
      expect(retrieved).toEqual(saved);
    });

    it('should find conversations by project', async () => {
      const projectPath = '/test/project';
      
      // Create multiple conversations
      await repositories.conversations.save({
        title: 'Project Conv 1',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        projectPath,
        tags: []
      });

      await repositories.conversations.save({
        title: 'Project Conv 2',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        projectPath,
        tags: []
      });

      await repositories.conversations.save({
        title: 'Other Conv',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        projectPath: '/other/project',
        tags: []
      });

      const result = await repositories.conversations.findByProject(projectPath);
      
      expect(result.items).toHaveLength(2);
      expect(result.items.every((c: ConversationEntity) => c.projectPath === projectPath)).toBe(true);
    });

    it('should find conversations by tags', async () => {
      const testTag = 'important';
      
      // Create conversations with and without the tag
      await repositories.conversations.save({
        title: 'Tagged Conv 1',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        tags: [testTag, 'other']
      });

      await repositories.conversations.save({
        title: 'Tagged Conv 2',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        tags: [testTag]
      });

      await repositories.conversations.save({
        title: 'Untagged Conv',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        tags: ['other']
      });

      const result = await repositories.conversations.findByTags([testTag]);
      
      expect(result.items).toHaveLength(2);
      expect(result.items.every((c: ConversationEntity) => c.tags.includes(testTag))).toBe(true);
    });

    it('should update message statistics', async () => {
      const conversation = await repositories.conversations.save({
        title: 'Test Conv',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date('2024-01-01'),
        tags: []
      });

      const newMessageTime = new Date();
      await repositories.conversations.updateMessageStats(conversation.id, 5, newMessageTime);

      const updated = await repositories.conversations.findById(conversation.id);
      
      expect(updated!.messageCount).toBe(5);
      expect(updated!.lastMessageAt.getTime()).toBe(newMessageTime.getTime());
    });
  });

  describe('Message Repository', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await repositories.conversations.save({
        title: 'Test Conversation',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        tags: []
      });
      conversationId = conversation.id;
    });

    it('should create and retrieve messages', async () => {
      const message: Omit<MessageEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        conversationId,
        role: 'user',
        content: 'Hello, world!',
        contentType: 'text',
        metadata: {},
        tokenCount: 10,
        branchId: 'main'
      };

      const saved = await repositories.messages.save(message);
      
      expect(saved.id).toBeDefined();
      expect(saved.conversationId).toBe(conversationId);
      expect(saved.content).toBe(message.content);

      const retrieved = await repositories.messages.findById(saved.id);
      expect(retrieved).toEqual(saved);
    });

    it('should find messages by conversation', async () => {
      // Create multiple messages
      await repositories.messages.save({
        conversationId,
        role: 'user',
        content: 'Message 1',
        contentType: 'text',
        metadata: {},
        tokenCount: 10,
        branchId: 'main'
      });

      await repositories.messages.save({
        conversationId,
        role: 'assistant',
        content: 'Message 2',
        contentType: 'text',
        metadata: {},
        tokenCount: 15,
        branchId: 'main'
      });

      // Create message in different conversation
      const otherConversation = await repositories.conversations.save({
        title: 'Other Conversation',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        tags: []
      });

      await repositories.messages.save({
        conversationId: otherConversation.id,
        role: 'user',
        content: 'Other message',
        contentType: 'text',
        metadata: {},
        tokenCount: 5,
        branchId: 'main'
      });

      const result = await repositories.messages.findByConversation(conversationId);
      
      expect(result.items).toHaveLength(2);
      expect(result.items.every((m: MessageEntity) => m.conversationId === conversationId)).toBe(true);
    });

    it('should search messages by content', async () => {
      await repositories.messages.save({
        conversationId,
        role: 'user',
        content: 'How to implement authentication?',
        contentType: 'text',
        metadata: {},
        tokenCount: 10,
        branchId: 'main'
      });

      await repositories.messages.save({
        conversationId,
        role: 'assistant',
        content: 'You can use JWT tokens for authentication.',
        contentType: 'text',
        metadata: {},
        tokenCount: 15,
        branchId: 'main'
      });

      await repositories.messages.save({
        conversationId,
        role: 'user',
        content: 'What about database design?',
        contentType: 'text',
        metadata: {},
        tokenCount: 8,
        branchId: 'main'
      });

      const result = await repositories.messages.searchContent('authentication');
      
      expect(result.items).toHaveLength(2);
      expect(result.items.every((m: MessageEntity) => 
        m.content.toLowerCase().includes('authentication')
      )).toBe(true);
    });
  });

  describe('Memory Repository', () => {
    it('should create and retrieve memories', async () => {
      const memory: Omit<MemoryEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        content: 'User prefers TypeScript over JavaScript',
        type: 'preference',
        importance: 8,
        tags: ['typescript', 'preference'],
        source: 'user',
        projectPath: '/test/project',
        metadata: {}
      };

      const saved = await repositories.memories.save(memory);
      
      expect(saved.id).toBeDefined();
      expect(saved.content).toBe(memory.content);
      expect(saved.type).toBe(memory.type);
      expect(saved.importance).toBe(memory.importance);

      const retrieved = await repositories.memories.findById(saved.id);
      expect(retrieved).toEqual(saved);
    });

    it('should find memories by importance threshold', async () => {
      // Create memories with different importance levels
      await repositories.memories.save({
        content: 'High importance memory',
        type: 'fact',
        importance: 9,
        tags: [],
        source: 'system',
        metadata: {}
      });

      await repositories.memories.save({
        content: 'Medium importance memory',
        type: 'fact',
        importance: 5,
        tags: [],
        source: 'system',
        metadata: {}
      });

      await repositories.memories.save({
        content: 'Low importance memory',
        type: 'fact',
        importance: 2,
        tags: [],
        source: 'system',
        metadata: {}
      });

      const result = await repositories.memories.findByImportance(6);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].importance).toBe(9);
    });

    it('should search memories by content', async () => {
      await repositories.memories.save({
        content: 'User likes clean code architecture',
        type: 'preference',
        importance: 7,
        tags: ['architecture'],
        source: 'user',
        metadata: {}
      });

      await repositories.memories.save({
        content: 'Project uses React framework',
        type: 'fact',
        importance: 6,
        tags: ['react', 'framework'],
        source: 'system',
        metadata: {}
      });

      const result = await repositories.memories.searchContent('architecture');
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].content).toContain('architecture');
    });

    it('should clean up expired memories', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

      // Create expired memory
      await repositories.memories.save({
        content: 'Expired memory',
        type: 'fact',
        importance: 5,
        tags: [],
        source: 'system',
        expiresAt: pastDate,
        metadata: {}
      });

      // Create non-expired memory
      await repositories.memories.save({
        content: 'Valid memory',
        type: 'fact',
        importance: 5,
        tags: [],
        source: 'system',
        expiresAt: futureDate,
        metadata: {}
      });

      // Create memory without expiration
      await repositories.memories.save({
        content: 'Permanent memory',
        type: 'fact',
        importance: 5,
        tags: [],
        source: 'system',
        metadata: {}
      });

      const cleanedCount = await repositories.memories.cleanupExpired();
      
      expect(cleanedCount).toBe(1);

      // Verify only non-expired memories remain
      const remaining = await repositories.memories.findAll();
      expect(remaining.items).toHaveLength(2);
      expect(remaining.items.every((m: MemoryEntity) => 
        !m.expiresAt || m.expiresAt > new Date()
      )).toBe(true);
    });
  });

  describe('Tool Registration Repository', () => {
    it('should register and find tools', async () => {
      const tool: Omit<ToolRegistrationEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'test_tool',
        namespace: 'test',
        description: 'A test tool',
        version: '1.0.0',
        schema: { type: 'object', properties: {} },
        source: 'builtin',
        enabled: true,
        trustLevel: 'trusted',
        executionCount: 0,
        metadata: {}
      };

      const saved = await repositories.toolRegistrations.save(tool);
      
      expect(saved.id).toBeDefined();
      expect(saved.name).toBe(tool.name);
      expect(saved.namespace).toBe(tool.namespace);

      const found = await repositories.toolRegistrations.findByNameAndNamespace(
        tool.name, 
        tool.namespace
      );
      
      expect(found).toEqual(saved);
    });

    it('should update execution statistics', async () => {
      const tool = await repositories.toolRegistrations.save({
        name: 'counter_tool',
        namespace: 'test',
        description: 'A counter tool',
        version: '1.0.0',
        schema: { type: 'object', properties: {} },
        source: 'builtin',
        enabled: true,
        trustLevel: 'trusted',
        executionCount: 0,
        metadata: {}
      });

      await repositories.toolRegistrations.updateExecutionStats(tool.id);
      
      const updated = await repositories.toolRegistrations.findById(tool.id);
      
      expect(updated!.executionCount).toBe(1);
      expect(updated!.lastExecutedAt).toBeDefined();
      expect(updated!.lastExecutedAt!.getTime()).toBeCloseTo(Date.now(), -3); // Within 1 second
    });
  });

  describe('Configuration Repository', () => {
    it('should set and get configuration values', async () => {
      const key = 'test.setting';
      const value = { enabled: true, threshold: 10 };

      const config = await repositories.configurations.setValue(
        key, 
        value, 
        'global'
      );
      
      expect(config.key).toBe(key);
      expect(config.value).toEqual(value);
      expect(config.scope).toBe('global');

      const retrieved = await repositories.configurations.getValue(
        key, 
        null, 
        'global'
      );
      
      expect(retrieved).toEqual(value);
    });

    it('should return default value when config not found', async () => {
      const defaultValue = 'default';
      
      const value = await repositories.configurations.getValue(
        'nonexistent.key', 
        defaultValue
      );
      
      expect(value).toBe(defaultValue);
    });

    it('should update existing configuration', async () => {
      const key = 'update.test';
      const initialValue = 'initial';
      const updatedValue = 'updated';

      // Set initial value
      await repositories.configurations.setValue(key, initialValue);
      
      // Update value
      await repositories.configurations.setValue(key, updatedValue);
      
      const retrieved = await repositories.configurations.getValue(key, null);
      expect(retrieved).toBe(updatedValue);

      // Should only have one record
      const all = await repositories.configurations.findBy({ key });
      expect(all.items).toHaveLength(1);
    });
  });

  describe('Repository Factory', () => {
    it('should provide database statistics', async () => {
      // Add some test data
      await repositories.conversations.save({
        title: 'Test',
        status: 'active',
        metadata: {},
        messageCount: 0,
        tokenCount: 0,
        lastMessageAt: new Date(),
        tags: []
      });

      await repositories.memories.save({
        content: 'Test memory',
        type: 'fact',
        importance: 5,
        tags: [],
        source: 'system',
        metadata: {}
      });

      const stats = await repositoryFactory.getStatistics();
      
      expect(stats.conversations).toBe(1);
      expect(stats.memories).toBe(1);
      expect(stats.messages).toBe(0);
      expect(stats.databaseSize).toBeGreaterThan(0);
    });

    it('should create database backups', async () => {
      const backupPath = await repositoryFactory.createBackup();
      
      expect(backupPath).toBeDefined();
      expect(backupPath).toContain('_backup_');
      
      // Verify backup file exists
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });
  });

  describe('Global Repository Factory', () => {
    afterEach(async () => {
      await closeRepositoryFactory();
    });

    it('should provide global access to repositories', async () => {
      const factory = await getRepositoryFactory({
        databasePath: path.join(tempDir, 'global-test.db'),
        enableAutoBackup: false
      });
      
      expect(factory).toBeDefined();
      
      const repos = factory.getRepositories();
      expect(repos.conversations).toBeDefined();
      expect(repos.messages).toBeDefined();
      expect(repos.memories).toBeDefined();
    });
  });
}); 