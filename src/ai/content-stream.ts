/**
 * Content Streaming System
 * 
 * Advanced streaming utilities for AI content with support for
 * buffering, throttling, and error recovery.
 */

import { EventEmitter } from 'events';
import { ContentEvent } from '../infrastructure/content-generator.js';
import { TurnEvent } from '../core/turn/turn-manager.js';
import { logger } from '../utils/logger.js';

/**
 * Stream event types
 */
export enum StreamEventType {
  START = 'stream:start',
  CONTENT = 'stream:content',
  THINKING = 'stream:thinking',
  TOOL_CALL = 'stream:tool_call',
  TOOL_RESULT = 'stream:tool_result',
  COMPLETE = 'stream:complete',
  ERROR = 'stream:error',
  CANCEL = 'stream:cancel',
  BUFFERING = 'stream:buffering',
  RESUMED = 'stream:resumed',
}

/**
 * Stream configuration options
 */
export interface StreamOptions {
  /**
   * Buffer size in characters
   */
  bufferSize?: number;
  
  /**
   * Throttle rate in ms
   */
  throttleRate?: number;
  
  /**
   * Auto-retry on transient errors
   */
  autoRetry?: boolean;
  
  /**
   * Maximum retry attempts
   */
  maxRetries?: number;
  
  /**
   * Enable performance monitoring
   */
  monitorPerformance?: boolean;
}

/**
 * Stream performance metrics
 */
export interface StreamMetrics {
  startTime: number;
  endTime?: number;
  totalChars: number;
  totalChunks: number;
  averageChunkSize: number;
  charsPerSecond: number;
  latency: number;
  retryCount: number;
  bufferFullCount: number;
}

/**
 * Tool result interface
 */
export interface ToolResult {
  [key: string]: unknown;
}

/**
 * Tool call interface
 */
export interface ToolCall {
  [key: string]: unknown;
}

/**
 * Content Stream Manager
 * 
 * Manages streaming of AI-generated content with advanced features
 */
export class ContentStreamManager extends EventEmitter {
  private buffer: string[] = [];
  private metrics: StreamMetrics;
  private options: Required<StreamOptions>;
  private isStreaming: boolean = false;
  private isPaused: boolean = false;
  private retryCount: number = 0;
  private bufferFullCount: number = 0;
  private contentBuffer: string = '';
  private thinkingBuffer: string = '';
  private streamStartTime: number = 0;
  private lastChunkTime: number = 0;
  private throttleTimeout: NodeJS.Timeout | null = null;
  
  constructor(options: StreamOptions = {}) {
    super();
    
    // Default options
    this.options = {
      bufferSize: 1000,
      throttleRate: 10,
      autoRetry: true,
      maxRetries: 3,
      monitorPerformance: true,
      ...options
    };
    
    // Initialize metrics
    this.metrics = {
      startTime: 0,
      totalChars: 0,
      totalChunks: 0,
      averageChunkSize: 0,
      charsPerSecond: 0,
      latency: 0,
      retryCount: 0,
      bufferFullCount: 0
    };
    
    logger.debug('Content Stream Manager initialized', { options: this.options });
  }
  
  /**
   * Start streaming content
   */
  public start(): void {
    if (this.isStreaming) {
      return;
    }
    
    this.isStreaming = true;
    this.isPaused = false;
    this.buffer = [];
    this.contentBuffer = '';
    this.thinkingBuffer = '';
    this.retryCount = 0;
    this.bufferFullCount = 0;
    this.streamStartTime = Date.now();
    this.lastChunkTime = Date.now();
    
    this.metrics = {
      startTime: this.streamStartTime,
      totalChars: 0,
      totalChunks: 0,
      averageChunkSize: 0,
      charsPerSecond: 0,
      latency: 0,
      retryCount: 0,
      bufferFullCount: 0
    };
    
    this.emit(StreamEventType.START, { 
      timestamp: this.streamStartTime,
    });
    
    logger.debug('Content stream started');
  }
  
  /**
   * Add content to the stream
   */
  public addContent(text: string): void {
    if (!this.isStreaming || this.isPaused) {
      return;
    }
    
    // Update metrics
    this.metrics.totalChunks++;
    this.metrics.totalChars += text.length;
    this.lastChunkTime = Date.now();
    
    // Add to buffer
    this.buffer.push(text);
    this.contentBuffer += text;
    
    // Check if buffer is full
    if (this.buffer.length > this.options.bufferSize) {
      this.bufferFullCount++;
      this.metrics.bufferFullCount = this.bufferFullCount;
      this.emit(StreamEventType.BUFFERING);
      this.pause();
      
      // Auto-resume after some time
      setTimeout(() => {
        this.resume();
      }, 50);
    }
    
    // Process the buffer with throttling
    this.processBufferThrottled();
  }
  
  /**
   * Add thinking content
   */
  public addThinking(text: string): void {
    if (!this.isStreaming) {
      return;
    }
    
    this.thinkingBuffer += text;
    this.emit(StreamEventType.THINKING, text);
  }
  
  /**
   * Add a tool call
   */
  public addToolCall(toolCall: ToolCall): void {
    if (!this.isStreaming) {
      return;
    }
    
    this.emit(StreamEventType.TOOL_CALL, toolCall);
  }
  
  /**
   * Add a tool result
   */
  public addToolResult(toolResult: ToolResult): void {
    if (!this.isStreaming) {
      return;
    }
    
    this.emit(StreamEventType.TOOL_RESULT, toolResult);
  }
  
  /**
   * Handle an error in the stream
   */
  public handleError(error: unknown): void {
    if (!this.isStreaming) {
      return;
    }
    
    logger.error('Content stream error', error);
    
    if (this.options.autoRetry && this.retryCount < this.options.maxRetries) {
      this.retryCount++;
      this.metrics.retryCount = this.retryCount;
      
      logger.debug(`Retrying content stream (${this.retryCount}/${this.options.maxRetries})`);
      
      // Emit error but continue
      this.emit(StreamEventType.ERROR, {
        error,
        willRetry: true,
        retryCount: this.retryCount,
        maxRetries: this.options.maxRetries
      });
    } else {
      // Terminal error
      this.emit(StreamEventType.ERROR, {
        error,
        willRetry: false
      });
      
      this.complete(error);
    }
  }
  
  /**
   * Complete the stream
   */
  public complete(error?: unknown): void {
    if (!this.isStreaming) {
      return;
    }
    
    // Process any remaining buffered content
    this.processBuffer();
    
    // Update metrics
    const endTime = Date.now();
    this.metrics.endTime = endTime;
    const durationSec = (endTime - this.streamStartTime) / 1000;
    
    if (durationSec > 0) {
      this.metrics.charsPerSecond = this.metrics.totalChars / durationSec;
      this.metrics.averageChunkSize = this.metrics.totalChars / Math.max(1, this.metrics.totalChunks);
      this.metrics.latency = (endTime - this.lastChunkTime);
    }
    
    // Clear throttle timeout if any
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
      this.throttleTimeout = null;
    }
    
    this.isStreaming = false;
    this.isPaused = false;
    
    // Emit complete event with metrics
    this.emit(StreamEventType.COMPLETE, {
      metrics: this.metrics,
      contentLength: this.contentBuffer.length,
      thinkingLength: this.thinkingBuffer.length,
      error: error || null
    });
    
    logger.debug('Content stream completed', { metrics: this.metrics });
  }
  
  /**
   * Cancel the stream
   */
  public cancel(reason?: string): void {
    if (!this.isStreaming) {
      return;
    }
    
    this.emit(StreamEventType.CANCEL, { reason });
    this.complete(new Error(`Stream cancelled: ${reason || 'User requested'}`));
    
    logger.debug('Content stream cancelled', { reason });
  }
  
  /**
   * Pause streaming
   */
  public pause(): void {
    if (this.isStreaming && !this.isPaused) {
      this.isPaused = true;
      logger.debug('Content stream paused');
    }
  }
  
  /**
   * Resume streaming
   */
  public resume(): void {
    if (this.isStreaming && this.isPaused) {
      this.isPaused = false;
      this.emit(StreamEventType.RESUMED);
      this.processBuffer();
      logger.debug('Content stream resumed');
    }
  }
  
  /**
   * Get current metrics
   */
  public getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Process the buffer with throttling
   */
  private processBufferThrottled(): void {
    if (this.throttleTimeout) {
      return;
    }
    
    this.throttleTimeout = setTimeout(() => {
      this.throttleTimeout = null;
      this.processBuffer();
    }, this.options.throttleRate);
  }
  
  /**
   * Process the buffer
   */
  private processBuffer(): void {
    if (this.isPaused || this.buffer.length === 0) {
      return;
    }
    
    // Get all content from buffer
    const content = this.buffer.join('');
    this.buffer = [];
    
    // Emit content event
    if (content) {
      this.emit(StreamEventType.CONTENT, content);
    }
  }
}

/**
 * Create a content stream manager from a turn manager
 * 
 * Connects the turn events to the stream manager
 */
export function createContentStream(
  emitter: EventEmitter,
  options?: StreamOptions
): ContentStreamManager {
  const streamManager = new ContentStreamManager(options);
  
  // Set up event handling
  emitter.on(TurnEvent.START, () => {
    streamManager.start();
  });
  
  emitter.on(TurnEvent.CONTENT, (text: string) => {
    streamManager.addContent(text);
  });
  
  emitter.on(TurnEvent.THINKING, (text: string) => {
    streamManager.addThinking(text);
  });
  
  emitter.on(TurnEvent.TOOL_CALL, (toolCall: ToolCall) => {
    streamManager.addToolCall(toolCall);
  });
  
  emitter.on(TurnEvent.TOOL_RESULT, (toolResult: ToolResult) => {
    streamManager.addToolResult(toolResult);
  });
  
  emitter.on(TurnEvent.COMPLETE, () => {
    streamManager.complete();
  });
  
  emitter.on(TurnEvent.ERROR, (error: unknown) => {
    streamManager.handleError(error);
  });
  
  emitter.on(ContentEvent.START, () => {
    streamManager.start();
  });
  
  emitter.on(ContentEvent.CONTENT, (text: string) => {
    streamManager.addContent(text);
  });
  
  emitter.on(ContentEvent.THINKING, (text: string) => {
    streamManager.addThinking(text);
  });
  
  emitter.on(ContentEvent.TOOL_CALL, (toolCall: ToolCall) => {
    streamManager.addToolCall(toolCall);
  });
  
  emitter.on(ContentEvent.TOOL_RESULT, (toolResult: ToolResult) => {
    streamManager.addToolResult(toolResult);
  });
  
  emitter.on(ContentEvent.END, () => {
    streamManager.complete();
  });
  
  emitter.on(ContentEvent.ERROR, (error: unknown) => {
    streamManager.handleError(error);
  });
  
  return streamManager;
}