/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Core domain interfaces that define the primary abstractions
 * for the business logic of the application.
 * 
 * These interfaces are the entry point for clean architecture,
 * as they define the contract between the core domain and the
 * outer layers.
 */

/**
 * Represents a message in a conversation.
 */
export interface ConversationMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Represents a conversation with history and context.
 */
export interface Conversation {
  id: string;
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a structured thought from the AI.
 */
export interface Thought {
  subject: string;
  description?: string;
  category?: string;
  confidence?: number;
}

/**
 * Result of a tool call from the AI.
 */
export interface ToolCallResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

/**
 * A tool call request from the AI.
 */
export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

/**
 * Status of an AI turn.
 */
export enum TurnStatus {
  IDLE = 'idle',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_TOOL = 'waiting_for_tool',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Base interface for all events in the system.
 */
export interface BaseEvent {
  type: string;
  timestamp: Date;
  payload?: unknown;
}

/**
 * Repository interfaces for data access
 */

/**
 * Base repository interface for CRUD operations.
 */
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<boolean>;
}

/**
 * Repository for conversation data.
 */
export interface ConversationRepository extends Repository<Conversation> {
  findByUserId(userId: string): Promise<Conversation[]>;
  addMessage(conversationId: string, message: ConversationMessage): Promise<ConversationMessage>;
  findRecentConversations(limit: number): Promise<Conversation[]>;
}

/**
 * Service interfaces for business logic
 */

/**
 * Interface for content generation services.
 */
export interface ContentGenerator {
  generate(prompt: string, options?: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    usage: { inputTokens: number; outputTokens: number };
  }>;
  
  generateStream(prompt: string, options?: Record<string, unknown>): Promise<void>;
  
  countTokens(messages: ConversationMessage[]): Promise<{
    messageCount: number;
    tokenCount: number;
    tokensPerMessage: number[];
    contextLimit: number;
  }>;
  
  isModelAvailable(model: string): boolean;
  getDefaultModel(): string;
  getModelContextSize(model: string): number;
}

/**
 * Interface for memory services.
 */
export interface MemoryService {
  store(key: string, data: unknown): Promise<void>;
  retrieve<T>(key: string): Promise<T | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  listKeys(): Promise<string[]>;
}