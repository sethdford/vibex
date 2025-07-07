/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Message Queue Transport Layer
 * 
 * Provides asynchronous message-based communication
 * for decoupled system components.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

/**
 * Message interface
 */
export interface Message<T = any> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
  delay?: number;
  metadata?: Record<string, any>;
}

/**
 * Message handler function
 */
export type MessageHandler<T = any> = (message: Message<T>) => Promise<void> | void;

/**
 * Message queue interface
 */
export interface MessageQueue {
  publish<T>(type: string, payload: T, options?: MessageOptions): Promise<void>;
  subscribe<T>(type: string, handler: MessageHandler<T>): void;
  unsubscribe(type: string, handler?: MessageHandler): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  clear(): Promise<void>;
  getQueueSize(): number;
  getProcessingCount(): number;
}

/**
 * Message publishing options
 */
export interface MessageOptions {
  priority?: number;
  delay?: number;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxConcurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
  defaultPriority?: number;
  processingTimeout?: number;
}

/**
 * In-memory message queue implementation
 */
export class InMemoryMessageQueue implements MessageQueue {
  private queue: Message[] = [];
  private handlers = new Map<string, Set<MessageHandler>>();
  private processing = new Set<string>();
  private isRunning = false;
  private processingLoop: NodeJS.Timeout | null = null;
  private eventEmitter = new EventEmitter();

  constructor(private config: QueueConfig = {}) {
    this.config = {
      maxConcurrency: 5,
      maxRetries: 3,
      retryDelay: 1000,
      defaultPriority: 0,
      processingTimeout: 30000,
      ...config
    };
  }

  async publish<T>(type: string, payload: T, options: MessageOptions = {}): Promise<void> {
    const message: Message<T> = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
      priority: options.priority ?? this.config.defaultPriority!,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.maxRetries!,
      delay: options.delay,
      metadata: options.metadata
    };

    // Add delay if specified
    if (message.delay && message.delay > 0) {
      setTimeout(() => {
        this.addToQueue(message);
      }, message.delay);
    } else {
      this.addToQueue(message);
    }

    logger.debug(`Message published to queue`, {
      messageId: message.id,
      type: message.type,
      priority: message.priority,
      delay: message.delay
    });
  }

  subscribe<T>(type: string, handler: MessageHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);

    logger.debug(`Handler subscribed to message type`, { type });
  }

  unsubscribe(type: string, handler?: MessageHandler): void {
    if (!this.handlers.has(type)) {
      return;
    }

    if (handler) {
      this.handlers.get(type)!.delete(handler);
    } else {
      this.handlers.delete(type);
    }

    logger.debug(`Handler unsubscribed from message type`, { type });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.processingLoop = setInterval(() => {
      this.processMessages();
    }, 100);

    logger.info('Message queue started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.processingLoop) {
      clearInterval(this.processingLoop);
      this.processingLoop = null;
    }

    // Wait for current processing to complete
    while (this.processing.size > 0) {
      await this.sleep(100);
    }

    logger.info('Message queue stopped');
  }

  async clear(): Promise<void> {
    this.queue = [];
    this.processing.clear();
    logger.info('Message queue cleared');
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getProcessingCount(): number {
    return this.processing.size;
  }

  private addToQueue(message: Message): void {
    // Insert message in priority order (higher priority first)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if ((this.queue[i].priority ?? 0) < (message.priority ?? 0)) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);
    this.eventEmitter.emit('messageAdded', message);
  }

  private async processMessages(): Promise<void> {
    if (!this.isRunning || this.processing.size >= this.config.maxConcurrency!) {
      return;
    }

    const message = this.queue.shift();
    if (!message) {
      return;
    }

    this.processing.add(message.id);

    try {
      await this.processMessage(message);
    } catch (error) {
      await this.handleMessageError(message, error);
    } finally {
      this.processing.delete(message.id);
    }
  }

  private async processMessage(message: Message): Promise<void> {
    const handlers = this.handlers.get(message.type);
    if (!handlers || handlers.size === 0) {
      logger.warn(`No handlers for message type`, { type: message.type });
      return;
    }

    // Create timeout promise
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Message processing timeout after ${this.config.processingTimeout}ms`));
      }, this.config.processingTimeout);
    });

    // Process message with all handlers
    const processingPromises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(message);
      } catch (error) {
        logger.error(`Handler failed for message`, {
          messageId: message.id,
          type: message.type,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    });

    // Race between processing and timeout
    await Promise.race([
      Promise.all(processingPromises),
      timeoutPromise
    ]);

    logger.debug(`Message processed successfully`, {
      messageId: message.id,
      type: message.type,
      handlerCount: handlers.size
    });
  }

  private async handleMessageError(message: Message, error: any): Promise<void> {
    const retryCount = (message.retryCount ?? 0) + 1;
    const maxRetries = message.maxRetries ?? this.config.maxRetries!;

    logger.error(`Message processing failed`, {
      messageId: message.id,
      type: message.type,
      retryCount,
      maxRetries,
      error: error instanceof Error ? error.message : String(error)
    });

    if (retryCount <= maxRetries) {
      // Retry the message
      const retryMessage = {
        ...message,
        retryCount,
        delay: this.config.retryDelay! * Math.pow(2, retryCount - 1) // Exponential backoff
      };

      setTimeout(() => {
        this.addToQueue(retryMessage);
      }, retryMessage.delay);

      logger.info(`Message scheduled for retry`, {
        messageId: message.id,
        retryCount,
        delay: retryMessage.delay
      });
    } else {
      // Move to dead letter queue or log failure
      this.eventEmitter.emit('messageFailed', message, error);
      logger.error(`Message failed permanently after ${maxRetries} retries`, {
        messageId: message.id,
        type: message.type
      });
    }
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Event emitter methods for monitoring
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}

/**
 * Persistent message queue using file system
 */
export class FileSystemMessageQueue extends InMemoryMessageQueue {
  private queueFile: string;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(queueFile: string, config: QueueConfig = {}) {
    super(config);
    this.queueFile = queueFile;
  }

  async start(): Promise<void> {
    await this.loadQueue();
    await super.start();
    
    // Save queue periodically
    this.saveTimer = setInterval(() => {
      this.saveQueue();
    }, 5000);
  }

  async stop(): Promise<void> {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    
    await this.saveQueue();
    await super.stop();
  }

  private async loadQueue(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.queueFile, 'utf-8');
      const savedQueue = JSON.parse(data);
      
      // Restore queue state
      (this as any).queue = savedQueue.messages || [];
      
      logger.info(`Loaded ${(this as any).queue.length} messages from persistent queue`);
    } catch (error) {
      // File doesn't exist or is corrupted, start with empty queue
      logger.debug('No persistent queue file found, starting with empty queue');
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const queueData = {
        messages: (this as any).queue,
        timestamp: Date.now()
      };
      
      await fs.writeFile(this.queueFile, JSON.stringify(queueData, null, 2));
    } catch (error) {
      logger.error('Failed to save queue to file', {
        file: this.queueFile,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * Message queue factory
 */
export class MessageQueueFactory {
  private static instances = new Map<string, MessageQueue>();

  static createInMemoryQueue(name: string, config?: QueueConfig): MessageQueue {
    if (!this.instances.has(name)) {
      this.instances.set(name, new InMemoryMessageQueue(config));
    }
    return this.instances.get(name)!;
  }

  static createFileSystemQueue(name: string, queueFile: string, config?: QueueConfig): MessageQueue {
    if (!this.instances.has(name)) {
      this.instances.set(name, new FileSystemMessageQueue(queueFile, config));
    }
    return this.instances.get(name)!;
  }

  static getQueue(name: string): MessageQueue | undefined {
    return this.instances.get(name);
  }

  static async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.instances.values()).map(queue => queue.stop());
    await Promise.all(stopPromises);
    this.instances.clear();
  }
}

/**
 * Common message types for VibeX
 */
export const MessageTypes = {
  // Tool execution
  TOOL_EXECUTE: 'tool.execute',
  TOOL_RESULT: 'tool.result',
  TOOL_ERROR: 'tool.error',

  // AI processing
  AI_REQUEST: 'ai.request',
  AI_RESPONSE: 'ai.response',
  AI_STREAM_CHUNK: 'ai.stream.chunk',
  AI_STREAM_END: 'ai.stream.end',

  // File operations
  FILE_CHANGED: 'file.changed',
  FILE_CREATED: 'file.created',
  FILE_DELETED: 'file.deleted',

  // System events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',

  // User interactions
  USER_INPUT: 'user.input',
  USER_COMMAND: 'user.command',
  USER_FEEDBACK: 'user.feedback'
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes]; 