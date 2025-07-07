/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { Tool, ToolResult, ToolExecutionOptions } from '../tool-interfaces';
import { 
  ToolExecutionService, 
  ToolExecutionStats,
  CheckpointService,
  ValidationService,
  FeedbackCallback 
} from '../tool-services';
import { EventBus } from '../tool-events';

/**
 * Implementation of the ToolExecutionService
 * 
 * This service handles the actual execution of tools, with
 * support for timeouts, cancellation, and progress feedback.
 */
export class ToolExecutionServiceImpl implements ToolExecutionService {
  /**
   * Stats for tool executions
   */
  private stats: ToolExecutionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    byTool: {}
  };
  
  /**
   * Validation service for parameter validation
   */
  private validationService: ValidationService;
  
  /**
   * Checkpoint service for safety checkpoints
   */
  private checkpointService?: CheckpointService;
  
  /**
   * Event bus
   */
  private eventBus?: EventBus;

  /**
   * Constructor
   */
  constructor(
    validationService: ValidationService,
    checkpointService?: CheckpointService,
    eventBus?: EventBus
  ) {
    this.validationService = validationService;
    this.checkpointService = checkpointService;
    this.eventBus = eventBus;
  }

  /**
   * Execute a tool with parameters
   */
  async execute(
    tool: Tool, 
    params: unknown, 
    signal: AbortSignal,
    feedbackCallback?: FeedbackCallback
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Validate parameters
      const validationError = tool.validateParams(params);
      if (validationError) {
        return this.handleToolError(
          tool,
          new Error(`Invalid parameters: ${validationError}`),
          startTime
        );
      }
      
      // Create checkpoint if needed
      if (this.checkpointService && 
          this.checkpointService.shouldCreateCheckpoint(tool.name, [])) {
        try {
          await this.checkpointService.createCheckpoint({
            description: `Before executing ${tool.name}`,
            includeAllModified: true
          });
        } catch (error) {
          console.warn(`Failed to create checkpoint for ${tool.name}:`, error);
          // Continue execution even if checkpoint creation fails
        }
      }
      
      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<ToolResult>((_resolve, reject) => {
        const options = (params as any)?.options || {};
        const timeout = options.timeout || 30000;
        
        if (timeout > 0) {
          timeoutId = setTimeout(() => {
            reject(new Error(`Tool execution timed out after ${timeout}ms`));
          }, timeout);
        }
      });
      
      // Execute the tool with timeout race
      const executionPromise = tool.execute(params, {
        signal,
        onProgress: (progress) => {
          if (feedbackCallback) {
            feedbackCallback(progress);
          }
        }
      });
      
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      // Clear timeout if set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Make sure the result has a callId
      if (!result.callId) {
        result.callId = (params as any)?.callId || 'unknown';
      }
      
      // Add execution time
      result.executionTime = Date.now() - startTime;
      
      // Update stats
      this.updateStats(tool.name, true, result.executionTime);
      
      return result;
      
    } catch (error) {
      return this.handleToolError(tool, error, startTime);
    }
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): ToolExecutionStats {
    return { ...this.stats };
  }

  /**
   * Clear execution statistics
   */
  clearStats(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      byTool: {}
    };
  }
  
  /**
   * Handle tool execution error
   * @private
   */
  private handleToolError(tool: Tool, error: unknown, startTime: number): ToolResult {
    const executionTime = Date.now() - startTime;
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Update stats
    this.updateStats(tool.name, false, executionTime);
    
    return {
      callId: 'unknown', // This should be overridden by the caller
      error: errorObj,
      success: false,
      executionTime
    };
  }
  
  /**
   * Update execution statistics
   * @private
   */
  private updateStats(toolName: string, success: boolean, executionTime: number): void {
    // Update overall stats
    this.stats.totalExecutions++;
    if (success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }
    
    // Update average execution time
    const totalTime = this.stats.averageExecutionTime * (this.stats.totalExecutions - 1) + executionTime;
    this.stats.averageExecutionTime = totalTime / this.stats.totalExecutions;
    
    // Update tool-specific stats
    if (!this.stats.byTool[toolName]) {
      this.stats.byTool[toolName] = {
        executions: 0,
        successful: 0,
        failed: 0,
        averageTime: 0
      };
    }
    
    const toolStats = this.stats.byTool[toolName];
    toolStats.executions++;
    if (success) {
      toolStats.successful++;
    } else {
      toolStats.failed++;
    }
    
    // Update tool average execution time
    const totalToolTime = toolStats.averageTime * (toolStats.executions - 1) + executionTime;
    toolStats.averageTime = totalToolTime / toolStats.executions;
  }
}

/**
 * Factory function to create a ToolExecutionService
 */
export function createToolExecutionService(
  validationService: ValidationService,
  checkpointService?: CheckpointService,
  eventBus?: EventBus
): ToolExecutionService {
  return new ToolExecutionServiceImpl(validationService, checkpointService, eventBus);
}