/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Domain Entity Definitions
 * 
 * Defines the entity types used throughout VibeX for persistence.
 */

import { BaseEntity } from './base-repository.js';

/**
 * Conversation entity
 */
export interface ConversationEntity extends BaseEntity {
  title: string;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, any>;
  messageCount: number;
  tokenCount: number;
  lastMessageAt: Date;
  projectPath?: string;
  tags: string[];
}

/**
 * Message entity
 */
export interface MessageEntity extends BaseEntity {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentType: 'text' | 'tool_use' | 'tool_result';
  metadata: Record<string, any>;
  tokenCount: number;
  toolCalls?: ToolCallEntity[];
  parentMessageId?: string;
  branchId?: string;
}

/**
 * Tool call entity
 */
export interface ToolCallEntity extends BaseEntity {
  messageId: string;
  toolName: string;
  input: Record<string, any>;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, any>;
}

/**
 * Memory entity
 */
export interface MemoryEntity extends BaseEntity {
  content: string;
  type: 'context' | 'preference' | 'fact' | 'instruction';
  importance: number;
  tags: string[];
  source: 'user' | 'system' | 'inferred';
  projectPath?: string;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

/**
 * Checkpoint entity
 */
export interface CheckpointEntity extends BaseEntity {
  name: string;
  description?: string;
  conversationId?: string;
  projectPath: string;
  gitCommitHash?: string;
  fileChanges: Array<{
    path: string;
    action: 'created' | 'modified' | 'deleted';
    size: number;
  }>;
  metadata: Record<string, any>;
  restoredAt?: Date;
}

/**
 * Tool registration entity
 */
export interface ToolRegistrationEntity extends BaseEntity {
  name: string;
  namespace: string;
  description: string;
  version: string;
  schema: Record<string, any>;
  source: 'builtin' | 'plugin' | 'mcp' | 'external';
  enabled: boolean;
  trustLevel: 'trusted' | 'confirm_once' | 'confirm_always' | 'denied';
  executionCount: number;
  lastExecutedAt?: Date;
  metadata: Record<string, any>;
}

/**
 * Session entity
 */
export interface SessionEntity extends BaseEntity {
  userId?: string;
  projectPath?: string;
  startedAt: Date;
  endedAt?: Date;
  conversationIds: string[];
  toolExecutions: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  metadata: Record<string, any>;
}

/**
 * Configuration entity
 */
export interface ConfigurationEntity extends BaseEntity {
  key: string;
  value: any;
  type: 'user' | 'project' | 'system';
  scope: 'global' | 'project' | 'session';
  projectPath?: string;
  encrypted: boolean;
  metadata: Record<string, any>;
}

/**
 * Entity type registry
 */
export const ENTITY_TYPES = {
  CONVERSATION: 'conversation',
  MESSAGE: 'message',
  TOOL_CALL: 'tool_call',
  MEMORY: 'memory',
  CHECKPOINT: 'checkpoint',
  TOOL_REGISTRATION: 'tool_registration',
  SESSION: 'session',
  CONFIGURATION: 'configuration'
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

/**
 * Entity type mapping
 */
export type EntityTypeMap = {
  [ENTITY_TYPES.CONVERSATION]: ConversationEntity;
  [ENTITY_TYPES.MESSAGE]: MessageEntity;
  [ENTITY_TYPES.TOOL_CALL]: ToolCallEntity;
  [ENTITY_TYPES.MEMORY]: MemoryEntity;
  [ENTITY_TYPES.CHECKPOINT]: CheckpointEntity;
  [ENTITY_TYPES.TOOL_REGISTRATION]: ToolRegistrationEntity;
  [ENTITY_TYPES.SESSION]: SessionEntity;
  [ENTITY_TYPES.CONFIGURATION]: ConfigurationEntity;
}; 