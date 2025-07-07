/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Event System for VibeX
 * 
 * Provides a typed event system with middleware support,
 * event filtering, and performance monitoring.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

/**
 * Base event interface
 */
export interface BaseEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly id: string;
  readonly source?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Event listener interface
 */
export interface EventListener<T extends BaseEvent = BaseEvent> {
  (event: T): void | Promise<void>;
}

/**
 * Event middleware interface
 */
export interface EventMiddleware {
  name: string;
  priority: number;
  handle<T extends BaseEvent>(
    event: T,
    next: (event: T) => Promise<void>
  ): Promise<void>;
}

/**
 * Event filter interface
 */
export interface EventFilter<T extends BaseEvent = BaseEvent> {
  (event: T): boolean;
}

/**
 * Event subscription interface
 */
export interface EventSubscription {
  readonly id: string;
  readonly eventType: string;
  readonly listener: EventListener;
  readonly filter?: EventFilter;
  readonly once: boolean;
  unsubscribe(): void;
}

/**
 * Event system statistics
 */
export interface EventStats {
  readonly totalEvents: number;
  readonly eventsByType: Record<string, number>;
  readonly averageProcessingTime: number;
  readonly errorCount: number;
  readonly activeSubscriptions: number;
}

/**
 * Event system interface
 */
export interface IEventSystem {
  emit<T extends BaseEvent>(event: T): Promise<void>;
  on<T extends BaseEvent>(
    eventType: string,
    listener: EventListener<T>,
    filter?: EventFilter<T>
  ): EventSubscription;
  once<T extends BaseEvent>(
    eventType: string,
    listener: EventListener<T>,
    filter?: EventFilter<T>
  ): EventSubscription;
  off(subscription: EventSubscription): void;
  offAll(eventType?: string): void;
  addMiddleware(middleware: EventMiddleware): void;
  removeMiddleware(middlewareName: string): void;
  getStats(): EventStats;
  dispose(): void;
}

/**
 * Event system implementation
 */
export class EventSystem implements IEventSystem {
  private subscriptions = new Map<string, EventSubscription[]>();
  private middleware: EventMiddleware[] = [];
  private stats = {
    totalEvents: 0,
    eventsByType: {} as Record<string, number>,
    processingTimes: [] as number[],
    errorCount: 0
  };
  private eventEmitter = new EventEmitter();

  constructor() {
    this.eventEmitter.setMaxListeners(1000); // Allow many listeners
  }

  /**
   * Emit an event through the middleware chain
   */
  async emit<T extends BaseEvent>(event: T): Promise<void> {
    const startTime = performance.now();

    try {
      // Add default metadata
      const enrichedEvent = {
        ...event,
        timestamp: event.timestamp || Date.now(),
        id: event.id || this.generateEventId()
      };

      // Process through middleware chain
      await this.processMiddleware(enrichedEvent);

      // Update statistics
      this.updateStats(enrichedEvent, performance.now() - startTime);

      logger.debug(`Event emitted`, {
        type: enrichedEvent.type,
        id: enrichedEvent.id,
        processingTime: performance.now() - startTime
      });

    } catch (error) {
      this.stats.errorCount++;
      logger.error(`Event processing failed`, {
        type: event.type,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  on<T extends BaseEvent>(
    eventType: string,
    listener: EventListener<T>,
    filter?: EventFilter<T>
  ): EventSubscription {
    return this.createSubscription(eventType, listener, filter, false);
  }

  /**
   * Subscribe to events (once only)
   */
  once<T extends BaseEvent>(
    eventType: string,
    listener: EventListener<T>,
    filter?: EventFilter<T>
  ): EventSubscription {
    return this.createSubscription(eventType, listener, filter, true);
  }

  /**
   * Unsubscribe from events
   */
  off(subscription: EventSubscription): void {
    const subscriptions = this.subscriptions.get(subscription.eventType);
    if (subscriptions) {
      const index = subscriptions.findIndex(s => s.id === subscription.id);
      if (index >= 0) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(subscription.eventType);
        }
      }
    }

    logger.debug(`Event subscription removed`, {
      id: subscription.id,
      eventType: subscription.eventType
    });
  }

  /**
   * Remove all subscriptions for an event type
   */
  offAll(eventType?: string): void {
    if (eventType) {
      this.subscriptions.delete(eventType);
      logger.debug(`All subscriptions removed for event type`, { eventType });
    } else {
      this.subscriptions.clear();
      logger.debug('All event subscriptions removed');
    }
  }

  /**
   * Add middleware to the processing chain
   */
  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
    this.middleware.sort((a, b) => b.priority - a.priority); // Higher priority first

    logger.debug(`Event middleware added`, {
      name: middleware.name,
      priority: middleware.priority
    });
  }

  /**
   * Remove middleware from the processing chain
   */
  removeMiddleware(middlewareName: string): void {
    const index = this.middleware.findIndex(m => m.name === middlewareName);
    if (index >= 0) {
      this.middleware.splice(index, 1);
      logger.debug(`Event middleware removed`, { name: middlewareName });
    }
  }

  /**
   * Get event system statistics
   */
  getStats(): EventStats {
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .reduce((total, subs) => total + subs.length, 0);

    const averageProcessingTime = this.stats.processingTimes.length > 0
      ? this.stats.processingTimes.reduce((sum, time) => sum + time, 0) / this.stats.processingTimes.length
      : 0;

    return {
      totalEvents: this.stats.totalEvents,
      eventsByType: { ...this.stats.eventsByType },
      averageProcessingTime,
      errorCount: this.stats.errorCount,
      activeSubscriptions
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.subscriptions.clear();
    this.middleware = [];
    this.eventEmitter.removeAllListeners();
    
    logger.debug('Event system disposed');
  }

  private createSubscription<T extends BaseEvent>(
    eventType: string,
    listener: EventListener<T>,
    filter?: EventFilter<T>,
    once = false
  ): EventSubscription {
    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      listener: listener as EventListener,
      filter: filter as EventFilter,
      once,
      unsubscribe: () => this.off(subscription)
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    this.subscriptions.get(eventType)!.push(subscription);

    logger.debug(`Event subscription created`, {
      id: subscription.id,
      eventType,
      once
    });

    return subscription;
  }

  private async processMiddleware<T extends BaseEvent>(event: T): Promise<void> {
    let currentIndex = 0;

    const next = async (processedEvent: T): Promise<void> => {
      if (currentIndex >= this.middleware.length) {
        // End of middleware chain, notify listeners
        await this.notifyListeners(processedEvent);
        return;
      }

      const middleware = this.middleware[currentIndex++];
      await middleware.handle(processedEvent, next);
    };

    await next(event);
  }

  private async notifyListeners<T extends BaseEvent>(event: T): Promise<void> {
    const subscriptions = this.subscriptions.get(event.type) || [];
    const toRemove: EventSubscription[] = [];

    for (const subscription of subscriptions) {
      try {
        // Apply filter if present
        if (subscription.filter && !subscription.filter(event)) {
          continue;
        }

        // Call listener
        await subscription.listener(event);

        // Mark for removal if once-only
        if (subscription.once) {
          toRemove.push(subscription);
        }

      } catch (error) {
        this.stats.errorCount++;
        logger.error(`Event listener failed`, {
          subscriptionId: subscription.id,
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Remove once-only subscriptions
    for (const subscription of toRemove) {
      this.off(subscription);
    }
  }

  private updateStats<T extends BaseEvent>(event: T, processingTime: number): void {
    this.stats.totalEvents++;
    this.stats.eventsByType[event.type] = (this.stats.eventsByType[event.type] || 0) + 1;
    
    // Keep only last 100 processing times for average calculation
    this.stats.processingTimes.push(processingTime);
    if (this.stats.processingTimes.length > 100) {
      this.stats.processingTimes.shift();
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Common VibeX events
 */
export namespace VibeXEvents {
  export interface ToolExecuted extends BaseEvent {
    type: 'tool.executed';
    toolName: string;
    duration: number;
    success: boolean;
    error?: string;
  }

  export interface ConversationStarted extends BaseEvent {
    type: 'conversation.started';
    conversationId: string;
    userId?: string;
  }

  export interface ConversationEnded extends BaseEvent {
    type: 'conversation.ended';
    conversationId: string;
    duration: number;
    messageCount: number;
  }

  export interface ConfigChanged extends BaseEvent {
    type: 'config.changed';
    key: string;
    oldValue: any;
    newValue: any;
  }

  export interface ErrorOccurred extends BaseEvent {
    type: 'error.occurred';
    error: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
  }

  export interface PerformanceMetric extends BaseEvent {
    type: 'performance.metric';
    metricName: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
  }
}

/**
 * Built-in middleware
 */
export class LoggingMiddleware implements EventMiddleware {
  name = 'logging';
  priority = 1000;

  constructor(private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'debug') {}

  async handle<T extends BaseEvent>(
    event: T,
    next: (event: T) => Promise<void>
  ): Promise<void> {
    logger[this.logLevel](`Processing event`, {
      type: event.type,
      id: event.id,
      timestamp: event.timestamp
    });

    await next(event);
  }
}

export class ValidationMiddleware implements EventMiddleware {
  name = 'validation';
  priority = 2000;

  async handle<T extends BaseEvent>(
    event: T,
    next: (event: T) => Promise<void>
  ): Promise<void> {
    // Validate required fields
    if (!event.type) {
      throw new Error('Event type is required');
    }

    if (!event.timestamp) {
      (event as any).timestamp = Date.now();
    }

    if (!event.id) {
      (event as any).id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    await next(event);
  }
}

export class PerformanceMiddleware implements EventMiddleware {
  name = 'performance';
  priority = 500;

  async handle<T extends BaseEvent>(
    event: T,
    next: (event: T) => Promise<void>
  ): Promise<void> {
    const startTime = performance.now();
    
    await next(event);
    
    const duration = performance.now() - startTime;
    
    // Emit performance metric if processing took too long
    if (duration > 100) { // 100ms threshold
      logger.warn(`Slow event processing detected`, {
        type: event.type,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  }
}

/**
 * Event system factory
 */
export class EventSystemFactory {
  static create(): EventSystem {
    const eventSystem = new EventSystem();
    
    // Add default middleware
    eventSystem.addMiddleware(new ValidationMiddleware());
    eventSystem.addMiddleware(new PerformanceMiddleware());
    eventSystem.addMiddleware(new LoggingMiddleware());
    
    return eventSystem;
  }

  static createMinimal(): EventSystem {
    return new EventSystem();
  }
} 