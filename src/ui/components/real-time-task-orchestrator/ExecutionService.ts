/**
 * Execution Service - Clean Architecture
 * 
 * Single Responsibility: Workflow execution and lifecycle management
 * Following Gemini CLI's focused service patterns
 */

import type { 
  WorkflowDefinition, 
  TaskDefinition, 
  TaskExecutionContext 
} from '../task-orchestrator/types.js';
import type { 
  ExecutionHistoryEntry, 
  RealTimeOrchestratorCallbacks 
} from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Execution result interface
 */
export interface ExecutionResult {
  success: boolean;
  duration: number;
  tasksCompleted: number;
  tasksTotal: number;
  error?: string;
}

/**
 * Execution Service
 * Focus: Workflow execution, retry logic, and lifecycle management
 */
export class ExecutionService {
  private executionHistory: ExecutionHistoryEntry[] = [];
  private maxHistorySize: number = 10;
  private isExecuting: boolean = false;
  private currentWorkflow: WorkflowDefinition | null = null;
  private executionStartTime: number = 0;

  constructor(
    private callbacks: RealTimeOrchestratorCallbacks,
    private maxRetries: number = 3,
    private retryDelay: number = 500
  ) {}

  /**
   * Execute workflow
   */
  async executeWorkflow(
    workflow: WorkflowDefinition, 
    executionContext?: Partial<TaskExecutionContext>
  ): Promise<ExecutionResult> {
    if (this.isExecuting) {
      throw new Error('Another workflow is already executing');
    }

    this.isExecuting = true;
    this.currentWorkflow = workflow;
    this.executionStartTime = Date.now();

    logger.info('Starting workflow execution', { 
      workflowId: workflow.id,
      taskCount: workflow.tasks.length 
    });

    try {
      const result = await this.executeWorkflowInternal(workflow, executionContext);
      
      // Add to execution history
      this.addToHistory({
        workflowId: workflow.id,
        timestamp: this.executionStartTime,
        success: result.success,
        duration: result.duration,
        errorMessage: result.error
      });

      // Notify completion
      if (this.callbacks.onWorkflowComplete) {
        this.callbacks.onWorkflowComplete(workflow, result.success);
      }

      logger.info('Workflow execution completed', { 
        workflowId: workflow.id,
        success: result.success,
        duration: result.duration 
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - this.executionStartTime;

      // Add to execution history
      this.addToHistory({
        workflowId: workflow.id,
        timestamp: this.executionStartTime,
        success: false,
        duration,
        errorMessage
      });

      // Notify error
      if (this.callbacks.onError) {
        this.callbacks.onError(errorMessage);
      }

      if (this.callbacks.onWorkflowComplete) {
        this.callbacks.onWorkflowComplete(workflow, false);
      }

      logger.error('Workflow execution failed', { 
        workflowId: workflow.id,
        error: errorMessage,
        duration 
      });

      throw error;

    } finally {
      this.isExecuting = false;
      this.currentWorkflow = null;
    }
  }

  /**
   * Retry specific task
   */
    async retryTask(taskId: string): Promise<void> {
    if (!this.currentWorkflow) {
      throw new Error('No active workflow to retry task in');
    }

    const task = this.currentWorkflow.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in current workflow`);
    }

    if (!task.retryable) {
      throw new Error(`Task ${taskId} is not retryable`);
    }

    const currentRetries = task.retryCount || 0;
    const maxRetries = task.maxRetries || this.maxRetries;

    if (currentRetries >= maxRetries) {
      throw new Error(`Task ${taskId} has exceeded maximum retry attempts (${maxRetries})`);
    }

    logger.info('Retrying task', { 
      taskId, 
      attempt: currentRetries + 1, 
      maxRetries 
    });

    try {
      // Update retry count
      task.retryCount = currentRetries + 1;
      task.status = 'pending';
      
      // Reset progress and error state
      task.progress = 0;

      // Execute task with retry delay
      if (currentRetries > 0) {
        await this.delay(this.retryDelay * currentRetries);
      }

      await this.executeTask(task, this.createExecutionContext());

      logger.info('Task retry successful', { taskId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('Task retry failed', { 
        taskId, 
        attempt: currentRetries + 1,
        error: errorMessage 
      });

      // Update task with error
      task.status = 'failed';

      throw error;
    }
  }

  /**
   * Pause current execution
   */
  pauseExecution(): void {
    if (!this.isExecuting || !this.currentWorkflow) {
      throw new Error('No active workflow to pause');
    }

    logger.info('Pausing workflow execution', { 
      workflowId: this.currentWorkflow.id 
    });

    // Update workflow status
    this.currentWorkflow.status = 'paused';

    // Pause all in-progress tasks
    this.currentWorkflow.tasks
      .filter(task => task.status === 'in_progress')
      .forEach(task => {
        task.status = 'pending'; // Reset to pending for resume
      });
  }

  /**
   * Resume paused execution
   */
  async resumeExecution(): Promise<void> {
    if (!this.currentWorkflow || this.currentWorkflow.status !== 'paused') {
      throw new Error('No paused workflow to resume');
    }

    logger.info('Resuming workflow execution', { 
      workflowId: this.currentWorkflow.id 
    });

    // Update workflow status
    this.currentWorkflow.status = 'running';

    // Continue execution from where we left off
    await this.executeWorkflowInternal(this.currentWorkflow);
  }

  /**
   * Cancel current execution
   */
    cancelExecution(): void {
    if (!this.isExecuting || !this.currentWorkflow) {
      throw new Error('No active workflow to cancel');
    }

    logger.info('Cancelling workflow execution', { 
      workflowId: this.currentWorkflow.id 
    });

    // Update workflow status
    this.currentWorkflow.status = 'failed';

    // Cancel all pending and in-progress tasks
    this.currentWorkflow.tasks
      .filter(task => ['pending', 'in_progress'].includes(task.status))
      .forEach(task => {
        if (task.cancellable) {
          task.status = 'cancelled';
        } else {
          task.status = 'failed';
        }
      });

    this.isExecuting = false;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionHistoryEntry[] {
    return [...this.executionHistory];
  }

  /**
   * Get last execution
   */
  getLastExecution(): ExecutionHistoryEntry | null {
    return this.executionHistory.length > 0 
      ? this.executionHistory[this.executionHistory.length - 1] 
      : null;
  }

  /**
   * Check if currently executing
   */
  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }

  /**
   * Get current workflow
   */
  getCurrentWorkflow(): WorkflowDefinition | null {
    return this.currentWorkflow;
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
    logger.debug('Execution history cleared');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Internal workflow execution
   */
  private async executeWorkflowInternal(
    workflow: WorkflowDefinition,
    executionContext?: Partial<TaskExecutionContext>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let tasksCompleted = 0;
    const tasksTotal = workflow.tasks.length;

    // Update workflow status
    workflow.status = 'running';

    const context = this.createExecutionContext(executionContext);

    try {
      // Execute tasks based on dependencies
      const taskQueue = this.buildTaskQueue(workflow.tasks);
      
      for (const taskBatch of taskQueue) {
        // Execute tasks in parallel within each batch
        await Promise.all(
          taskBatch.map(async (task) => {
            try {
              await this.executeTask(task, context);
              tasksCompleted++;
            } catch (error) {
              // Log error but continue with other tasks
              logger.error('Task execution failed', { 
                taskId: task.id, 
                error: error instanceof Error ? error.message : String(error) 
              });
            }
          })
        );
      }

      const duration = Date.now() - startTime;
      const success = tasksCompleted === tasksTotal;

      // Update workflow status
      workflow.status = success ? 'completed' : 'failed';
      workflow.progress = Math.round((tasksCompleted / tasksTotal) * 100);

      return {
        success,
        duration,
        tasksCompleted,
        tasksTotal
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update workflow status
      workflow.status = 'failed';

      return {
        success: false,
        duration,
        tasksCompleted,
        tasksTotal,
        error: errorMessage
      };
    }
  }

  /**
   * Execute individual task
   */
  private async executeTask(task: TaskDefinition, context: TaskExecutionContext): Promise<void> {
    if (!task.execute) {
      throw new Error(`Task ${task.id} has no execute function`);
    }

    // Update task status
    task.status = 'in_progress';
    task.startTime = Date.now();
    task.progress = 0;

    try {
      // Execute task with timeout
      const timeout = 30000;
      await this.executeWithTimeout(task.execute(context), timeout);

      // Update task on success
      task.status = 'completed';
      task.endTime = Date.now();
      task.progress = 100;
      task.result = {
        ...task.result,
        success: true
      };

      logger.debug('Task completed successfully', { taskId: task.id });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update task on failure
      task.status = 'failed';
      task.endTime = Date.now();
      task.result = {
        ...task.result,
        success: false,
        error: errorMessage
      };

      logger.error('Task execution failed', { taskId: task.id, error: errorMessage });
      throw error;
    }
  }

  /**
   * Build task execution queue based on dependencies
   */
  private buildTaskQueue(tasks: TaskDefinition[]): TaskDefinition[][] {
    const queue: TaskDefinition[][] = [];
    const remaining = new Set(tasks);
    const completed = new Set<string>();

    while (remaining.size > 0) {
      const batch: TaskDefinition[] = [];

      for (const task of remaining) {
        // Check if all dependencies are completed
        const dependenciesMet = task.dependencies.every(depId => completed.has(depId));
        
        if (dependenciesMet) {
          batch.push(task);
        }
      }

      if (batch.length === 0) {
        // Circular dependency or missing dependency
        throw new Error('Circular dependency detected or missing dependency');
      }

      // Remove batch tasks from remaining and mark as completed
      batch.forEach(task => {
        remaining.delete(task);
        completed.add(task.id);
      });

      queue.push(batch);
    }

    return queue;
  }

  /**
   * Create execution context
   */
    private createExecutionContext(partial?: Partial<TaskExecutionContext>): TaskExecutionContext {
    return {
      workingDirectory: process.cwd(),
      environment: Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>,
      sharedState: {},
      ...partial
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Task execution timeout')), timeout);
      })
    ]);
  }

  /**
   * Add entry to execution history
   */
  private addToHistory(entry: ExecutionHistoryEntry): void {
    this.executionHistory.push(entry);
    
    // Keep only the last N entries
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating execution service
 */
export function createExecutionService(
  callbacks: RealTimeOrchestratorCallbacks,
  maxRetries: number = 3,
  retryDelay: number = 500
): ExecutionService {
  return new ExecutionService(callbacks, maxRetries, retryDelay);
}