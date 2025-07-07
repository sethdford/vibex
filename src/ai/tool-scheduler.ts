/**
 * Tool Scheduler System
 * 
 * Advanced system for scheduling, executing, and managing tool calls
 * with dependency resolution, concurrency control, and error handling.
 */

import { EventEmitter } from 'events';
import { ToolCall } from '../core/turn/turn-manager.js';
import { logger } from '../utils/logger.js';

/**
 * Tool scheduler events
 */
export enum ToolSchedulerEvent {
  SCHEDULED = 'scheduled',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted',
  ALL_COMPLETED = 'all_completed',
  DEPENDENCIES_MET = 'dependencies_met',
  DEPENDENCIES_FAILED = 'dependencies_failed',
  RATE_LIMITED = 'rate_limited',
  RETRYING = 'retrying',
  STATS_UPDATED = 'stats_updated',
}

/**
 * Tool execution status
 */
export enum ToolExecutionStatus {
  PENDING = 'pending',
  WAITING = 'waiting',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted',
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
  error?: string;
  status: ToolExecutionStatus;
  executionTime?: number;
  startTime?: number;
  endTime?: number;
  retryCount?: number;
}

/**
 * Enhanced tool call with dependencies and scheduling info
 */
export interface ScheduledToolCall extends ToolCall {
  id: string;
  /**
   * Tool call priority (higher numbers are higher priority)
   */
  priority?: number;
  
  /**
   * Tools this call depends on
   */
  dependencies?: string[];
  
  /**
   * Maximum retry attempts
   */
  maxRetries?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelayMs?: number;
  
  /**
   * Timeout in milliseconds
   */
  timeoutMs?: number;
}

/**
 * Tool execution statistics
 */
export interface ToolExecutionStats {
  totalScheduled: number;
  completed: number;
  failed: number;
  aborted: number;
  pending: number;
  waiting: number;
  running: number;
  averageExecutionTimeMs: number;
  totalExecutionTimeMs: number;
  fastestExecutionTimeMs: number;
  slowestExecutionTimeMs: number;
  successRate: number;
}

/**
 * Tool handler function type
 */
export type ToolHandlerFn = (toolCall: ScheduledToolCall) => Promise<unknown>;

/**
 * Tool scheduler configuration
 */
export interface ToolSchedulerConfig {
  /**
   * Maximum concurrent tool executions
   */
  maxConcurrent?: number;
  
  /**
   * Default number of retry attempts
   */
  defaultRetryAttempts?: number;
  
  /**
   * Default retry delay in milliseconds
   */
  defaultRetryDelayMs?: number;
  
  /**
   * Default execution timeout in milliseconds
   */
  defaultTimeoutMs?: number;
  
  /**
   * Auto-abort on dependency failures
   */
  abortOnDependencyFailure?: boolean;
  
  /**
   * Auto-run dependencies
   */
  autoRunDependencies?: boolean;
}

/**
 * Tool Scheduler - Advanced tool scheduling and execution system
 */
export class ToolScheduler extends EventEmitter {
  private config: Required<ToolSchedulerConfig>;
  private toolHandler: ToolHandlerFn;
  private toolCalls: Map<string, ScheduledToolCall> = new Map();
  private results: Map<string, ToolExecutionResult> = new Map();
  private pendingTools: Set<string> = new Set();
  private runningTools: Set<string> = new Set();
  private waitingTools: Set<string> = new Set();
  private completedTools: Set<string> = new Set();
  private failedTools: Set<string> = new Set();
  private abortController: AbortController;
  private stats: ToolExecutionStats;
  
  constructor(
    toolHandler: ToolHandlerFn,
    config: ToolSchedulerConfig = {}
  ) {
    super();
    this.toolHandler = toolHandler;
    
    // Default configuration
    this.config = {
      maxConcurrent: 5,
      defaultRetryAttempts: 2,
      defaultRetryDelayMs: 1000,
      defaultTimeoutMs: 30000,
      abortOnDependencyFailure: true,
      autoRunDependencies: true,
      ...config
    };
    
    this.abortController = new AbortController();
    
    this.stats = {
      totalScheduled: 0,
      completed: 0,
      failed: 0,
      aborted: 0,
      pending: 0,
      waiting: 0,
      running: 0,
      averageExecutionTimeMs: 0,
      totalExecutionTimeMs: 0,
      fastestExecutionTimeMs: Infinity,
      slowestExecutionTimeMs: 0,
      successRate: 0
    };
    
    logger.debug('Tool Scheduler initialized', { config: this.config });
  }
  
  /**
   * Schedule a tool call for execution
   */
  public schedule(toolCall: ScheduledToolCall): void {
    // Don't schedule if we already have it
    if (this.toolCalls.has(toolCall.id)) {
      return;
    }
    
    // Store the tool call
    this.toolCalls.set(toolCall.id, {
      ...toolCall,
      priority: toolCall.priority ?? 0,
      dependencies: toolCall.dependencies ?? [],
      maxRetries: toolCall.maxRetries ?? this.config.defaultRetryAttempts,
      retryDelayMs: toolCall.retryDelayMs ?? this.config.defaultRetryDelayMs,
      timeoutMs: toolCall.timeoutMs ?? this.config.defaultTimeoutMs,
    });
    
    // Add to pending queue
    this.pendingTools.add(toolCall.id);
    
    // Update stats
    this.stats.totalScheduled++;
    this.stats.pending = this.pendingTools.size;
    
    this.emit(ToolSchedulerEvent.SCHEDULED, { 
      toolCall: this.toolCalls.get(toolCall.id),
      stats: this.getStats()
    });
    
    // If auto-run dependencies is enabled, schedule dependencies
    if (this.config.autoRunDependencies && toolCall.dependencies?.length) {
      this.processDependencies(toolCall);
    }
    
    // Try to run if there are dependencies
    if (!toolCall.dependencies?.length) {
      this.tryExecuteNext();
    } else {
      // Check if dependencies are already satisfied
      const canExecute = this.areDependenciesMet(toolCall.id);
      if (canExecute) {
        this.emit(ToolSchedulerEvent.DEPENDENCIES_MET, { toolCallId: toolCall.id });
        this.tryExecuteNext();
      } else {
        // Move to waiting
        this.pendingTools.delete(toolCall.id);
        this.waitingTools.add(toolCall.id);
        this.stats.pending = this.pendingTools.size;
        this.stats.waiting = this.waitingTools.size;
      }
    }
  }
  
  /**
   * Schedule multiple tool calls
   */
  public scheduleMany(toolCalls: ScheduledToolCall[]): void {
    for (const toolCall of toolCalls) {
      this.schedule(toolCall);
    }
  }
  
  /**
   * Try to execute the next pending tool
   */
  public tryExecuteNext(): void {
    // If we're at max concurrency, don't execute more
    if (this.runningTools.size >= this.config.maxConcurrent) {
      return;
    }
    
    // Find the highest priority tool that can be executed
    const nextToolId = this.findNextExecutableToolId();
    
    if (!nextToolId) {
      return;
    }
    
    // Get the tool call
    const toolCall = this.toolCalls.get(nextToolId);
    
    if (!toolCall) {
      logger.error(`Tool call not found: ${nextToolId}`);
      return;
    }
    
    // Execute the tool
    this.executeTool(toolCall);
  }
  
  /**
   * Get results for a specific tool call
   */
  public getResult(toolCallId: string): ToolExecutionResult | undefined {
    return this.results.get(toolCallId);
  }
  
  /**
   * Get all results
   */
  public getAllResults(): ToolExecutionResult[] {
    return Array.from(this.results.values());
  }
  
  /**
   * Check if all tools are completed
   */
  public isCompleted(): boolean {
    return (
      this.pendingTools.size === 0 &&
      this.waitingTools.size === 0 &&
      this.runningTools.size === 0
    );
  }
  
  /**
   * Get current execution statistics
   */
  public getStats(): ToolExecutionStats {
    return { ...this.stats };
  }
  
  /**
   * Abort all pending and running tool executions
   */
  public abort(): void {
    this.abortController.abort();
    
    // Create a new abort controller for future calls
    this.abortController = new AbortController();
    
    // Move all pending and running tools to aborted
    for (const toolId of this.pendingTools) {
      this.pendingTools.delete(toolId);
      this.abortTool(toolId, 'Manually aborted');
    }
    
    for (const toolId of this.runningTools) {
      this.runningTools.delete(toolId);
      this.abortTool(toolId, 'Manually aborted');
    }
    
    for (const toolId of this.waitingTools) {
      this.waitingTools.delete(toolId);
      this.abortTool(toolId, 'Manually aborted');
    }
    
    // Update stats
    this.stats.pending = 0;
    this.stats.running = 0;
    this.stats.waiting = 0;
    
    this.emit(ToolSchedulerEvent.ABORTED, { 
      reason: 'Manual abort', 
      stats: this.getStats() 
    });
  }
  
  /**
   * Reset the scheduler
   */
  public reset(): void {
    this.abort();
    this.toolCalls.clear();
    this.results.clear();
    this.pendingTools.clear();
    this.runningTools.clear();
    this.waitingTools.clear();
    this.completedTools.clear();
    this.failedTools.clear();
    
    // Reset stats
    this.stats = {
      totalScheduled: 0,
      completed: 0,
      failed: 0,
      aborted: 0,
      pending: 0,
      waiting: 0,
      running: 0,
      averageExecutionTimeMs: 0,
      totalExecutionTimeMs: 0,
      fastestExecutionTimeMs: Infinity,
      slowestExecutionTimeMs: 0,
      successRate: 0
    };
    
    logger.debug('Tool Scheduler reset');
  }
  
  /**
   * Execute a tool call
   */
  private async executeTool(
    toolCall: ScheduledToolCall, 
    retryCount: number = 0
  ): Promise<void> {
    // Move from pending to running
    this.pendingTools.delete(toolCall.id);
    this.runningTools.add(toolCall.id);
    
    // Update stats
    this.stats.pending = this.pendingTools.size;
    this.stats.running = this.runningTools.size;
    
    const startTime = Date.now();
    
    this.emit(ToolSchedulerEvent.EXECUTING, { 
      toolCall,
      retryCount,
      startTime,
      stats: this.getStats()
    });
    
    try {
      // Create a timeout race
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Tool execution timed out after ${toolCall.timeoutMs}ms`));
        }, toolCall.timeoutMs);
        
        // Clear timeout if aborted
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Tool execution aborted'));
        });
      });
      
      // Execute with timeout
      const result = await Promise.race([
        this.toolHandler(toolCall),
        timeoutPromise
      ]);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Store result
      const executionResult: ToolExecutionResult = {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        result,
        status: ToolExecutionStatus.COMPLETED,
        executionTime,
        startTime,
        endTime,
        retryCount
      };
      
      this.results.set(toolCall.id, executionResult);
      
      // Update stats
      this.runningTools.delete(toolCall.id);
      this.completedTools.add(toolCall.id);
      this.stats.completed++;
      this.stats.running = this.runningTools.size;
      this.stats.totalExecutionTimeMs += executionTime;
      this.stats.averageExecutionTimeMs = this.stats.totalExecutionTimeMs / this.stats.completed;
      this.stats.fastestExecutionTimeMs = Math.min(this.stats.fastestExecutionTimeMs, executionTime);
      this.stats.slowestExecutionTimeMs = Math.max(this.stats.slowestExecutionTimeMs, executionTime);
      this.stats.successRate = this.stats.completed / 
        (this.stats.completed + this.stats.failed + this.stats.aborted);
      
      this.emit(ToolSchedulerEvent.COMPLETED, { 
        toolCall,
        result: executionResult,
        stats: this.getStats()
      });
      
      // Check for dependent tools
      this.checkDependentTools(toolCall.id);
      
      // Try to execute the next tool
      this.tryExecuteNext();
      
      // Check if all tools are complete
      if (this.isCompleted()) {
        this.emit(ToolSchedulerEvent.ALL_COMPLETED, { 
          results: this.getAllResults(),
          stats: this.getStats()
        });
      }
    } catch (error) {
      // Handle error based on type
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = this.isRetryableError(errorMessage);
      
      // Check if we should retry
      if (isRetryable && retryCount < toolCall.maxRetries!) {
        this.handleRetry(toolCall, retryCount, errorMessage);
      } else {
        this.handleToolFailure(toolCall, errorMessage, startTime);
      }
    }
  }
  
  /**
   * Handle tool retry logic
   */
  private handleRetry(
    toolCall: ScheduledToolCall, 
    retryCount: number, 
    errorMessage: string
  ): void {
    const nextRetryCount = retryCount + 1;
    const delayMs = toolCall.retryDelayMs! * Math.pow(2, retryCount); // Exponential backoff
    
    this.emit(ToolSchedulerEvent.RETRYING, { 
      toolCall,
      error: errorMessage,
      retryCount: nextRetryCount,
      delayMs,
      stats: this.getStats()
    });
    
    // Move back to pending
    this.runningTools.delete(toolCall.id);
    this.pendingTools.add(toolCall.id);
    
    // Update stats
    this.stats.running = this.runningTools.size;
    this.stats.pending = this.pendingTools.size;
    
    // Retry after delay
    setTimeout(() => {
      if (!this.abortController.signal.aborted) {
        this.executeTool(toolCall, nextRetryCount);
      }
    }, delayMs);
  }
  
  /**
   * Handle tool failure (no more retries)
   */
  private handleToolFailure(
    toolCall: ScheduledToolCall, 
    errorMessage: string,
    startTime: number
  ): void {
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Store failed result
    const failedResult: ToolExecutionResult = {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      result: null,
      error: errorMessage,
      status: ToolExecutionStatus.FAILED,
      executionTime,
      startTime,
      endTime
    };
    
    this.results.set(toolCall.id, failedResult);
    
    // Update stats
    this.runningTools.delete(toolCall.id);
    this.failedTools.add(toolCall.id);
    this.stats.failed++;
    this.stats.running = this.runningTools.size;
    this.stats.successRate = this.stats.completed / 
      (this.stats.completed + this.stats.failed + this.stats.aborted);
    
    this.emit(ToolSchedulerEvent.FAILED, {
      toolCall,
      error: errorMessage,
      result: failedResult,
      stats: this.getStats()
    });
    
    // If configured to abort on failure, abort dependent tools
    if (this.config.abortOnDependencyFailure) {
      this.abortDependentTools(toolCall.id);
    }
    
    // Try to execute the next tool
    this.tryExecuteNext();
    
    // Check if all tools are complete
    if (this.isCompleted()) {
      this.emit(ToolSchedulerEvent.ALL_COMPLETED, { 
        results: this.getAllResults(),
        stats: this.getStats()
      });
    }
  }
  
  /**
   * Mark a tool as aborted
   */
  private abortTool(toolCallId: string, reason: string): void {
    const toolCall = this.toolCalls.get(toolCallId);
    
    if (!toolCall) {
      return;
    }
    
    // Store aborted result
    const abortedResult: ToolExecutionResult = {
      toolCallId,
      toolName: toolCall.name,
      result: null,
      error: `Aborted: ${reason}`,
      status: ToolExecutionStatus.ABORTED
    };
    
    this.results.set(toolCallId, abortedResult);
    
    // Update stats
    this.stats.aborted++;
    this.stats.successRate = this.stats.completed / 
      (this.stats.completed + this.stats.failed + this.stats.aborted);
    
    this.emit(ToolSchedulerEvent.ABORTED, {
      toolCall,
      reason,
      stats: this.getStats()
    });
  }
  
  /**
   * Check if all dependencies of a tool are met
   */
  private areDependenciesMet(toolCallId: string): boolean {
    const toolCall = this.toolCalls.get(toolCallId);
    
    if (!toolCall || !toolCall.dependencies || toolCall.dependencies.length === 0) {
      return true;
    }
    
    for (const depId of toolCall.dependencies) {
      const depResult = this.results.get(depId);
      
      if (!depResult || depResult.status !== ToolExecutionStatus.COMPLETED) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check which tools depend on a completed tool and try to execute them
   */
  private checkDependentTools(completedToolId: string): void {
    // Find all tools that depend on this one
    for (const [id, toolCall] of this.toolCalls.entries()) {
      // If tool is in waiting and depends on completed tool
      if (
        this.waitingTools.has(id) &&
        toolCall.dependencies?.includes(completedToolId)
      ) {
        // Check if all dependencies are now met
        if (this.areDependenciesMet(id)) {
          this.emit(ToolSchedulerEvent.DEPENDENCIES_MET, { 
            toolCallId: id,
            dependencies: toolCall.dependencies
          });
          
          // Move from waiting to pending
          this.waitingTools.delete(id);
          this.pendingTools.add(id);
          
          // Update stats
          this.stats.waiting = this.waitingTools.size;
          this.stats.pending = this.pendingTools.size;
          
          // Try to execute
          this.tryExecuteNext();
        }
      }
    }
  }
  
  /**
   * Abort all tools that depend on a failed tool
   */
  private abortDependentTools(failedToolId: string): void {
    // Find all tools that depend on the failed tool
    for (const [id, toolCall] of this.toolCalls.entries()) {
      if (toolCall.dependencies?.includes(failedToolId)) {
        // If it's in pending or waiting, abort it
        if (this.pendingTools.has(id)) {
          this.pendingTools.delete(id);
          this.abortTool(id, `Dependency ${failedToolId} failed`);
        } else if (this.waitingTools.has(id)) {
          this.waitingTools.delete(id);
          this.abortTool(id, `Dependency ${failedToolId} failed`);
        } else if (this.runningTools.has(id)) {
          // Can't abort running tools directly, they'll fail on their own
          // but we can notify
          this.emit(ToolSchedulerEvent.DEPENDENCIES_FAILED, {
            toolCallId: id,
            failedDependency: failedToolId
          });
        }
        
        // Recursively abort tools that depend on this one
        this.abortDependentTools(id);
      }
    }
  }
  
  /**
   * Find the next highest priority tool that can be executed
   */
  private findNextExecutableToolId(): string | undefined {
    if (this.pendingTools.size === 0) {
      return undefined;
    }
    
    // Convert to array for sorting
    const pendingTools = Array.from(this.pendingTools)
      .map(id => this.toolCalls.get(id)!)
      .filter(toolCall => this.areDependenciesMet(toolCall.id))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Return highest priority tool
    return pendingTools[0]?.id;
  }
  
  /**
   * Process dependencies for a tool call
   */
  private processDependencies(toolCall: ScheduledToolCall): void {
    // If no dependencies, nothing to do
    if (!toolCall.dependencies || toolCall.dependencies.length === 0) {
      return;
    }
    
    // Check each dependency
    for (const depId of toolCall.dependencies) {
      // If we don't have this dependency, it needs to be externally provided
      if (!this.toolCalls.has(depId)) {
        continue;
      }
      
      // If dependency is pending, waiting, or running, nothing to do
      if (
        this.pendingTools.has(depId) ||
        this.waitingTools.has(depId) ||
        this.runningTools.has(depId)
      ) {
        continue;
      }
      
      // If dependency is completed or failed, nothing to do
      if (
        this.completedTools.has(depId) ||
        this.failedTools.has(depId)
      ) {
        continue;
      }
      
      // If we get here, dependency is not being processed
      // Move it to pending queue
      this.pendingTools.add(depId);
      
      // Update stats
      this.stats.pending = this.pendingTools.size;
      
      // Process dependencies of this dependency
      const depToolCall = this.toolCalls.get(depId);
      if (depToolCall) {
        this.processDependencies(depToolCall);
      }
    }
  }
  
  /**
   * Check if an error is retryable
   */
  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'rate limit',
      'timeout',
      'network',
      'connection',
      'econnreset',
      'socket hang up',
      'temporary',
      'retry',
      '429',
      '500',
      '503',
      '504'
    ];
    
    return retryablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );
  }
}

/**
 * Create a tool scheduler
 */
export function createToolScheduler(
  toolHandler: ToolHandlerFn,
  config?: ToolSchedulerConfig
): ToolScheduler {
  return new ToolScheduler(toolHandler, config);
}