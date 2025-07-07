/**
 * Real-Time State Service - Clean Architecture
 * 
 * Single Responsibility: Real-time state synchronization and management
 * Following Gemini CLI's focused service patterns
 */

import type { 
  RealTimeState, 
  RealTimeOrchestratorConfig, 
  RealTimeUpdateEvent, 
  ConnectionStatus,
  UpdateEventType 
} from './types.js';
import type { WorkflowDefinition, TaskDefinition } from '../task-orchestrator/types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Real-Time State Service
 * Focus: State synchronization and real-time updates
 */
export class RealTimeStateService {
  private state: RealTimeState;
  private config: RealTimeOrchestratorConfig;
  private updateSubscribers: Set<(state: RealTimeState) => void> = new Set();
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(config: RealTimeOrchestratorConfig) {
    this.config = config;
    this.state = this.createInitialState();
    this.startUpdateLoop();
  }

  /**
   * Get current state
   */
  getState(): RealTimeState {
    return { ...this.state };
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status: ConnectionStatus, latency?: number): void {
    this.state.connectionStatus = status;
    if (latency !== undefined) {
      this.state.updateLatency = latency;
    }
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
  }

  /**
   * Update active workflow
   */
  updateActiveWorkflow(workflow: WorkflowDefinition | null): void {
    this.state.activeWorkflow = workflow;
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
    
    logger.debug('Active workflow updated', { 
      workflowId: workflow?.id,
      taskCount: workflow?.tasks.length 
    });
  }

  /**
   * Update task state
   */
  updateTaskState(taskId: string, updates: Partial<TaskDefinition>): void {
    this.state.taskStates.set(taskId, updates);
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
    
    logger.debug('Task state updated', { taskId, updates });
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId: string, progress: number): void {
    this.state.taskProgress.set(taskId, progress);
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
    
    logger.debug('Task progress updated', { taskId, progress });
  }

  /**
   * Update task error
   */
  updateTaskError(taskId: string, error: string): void {
    this.state.taskErrors.set(taskId, error);
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
    
    logger.error('Task error updated', { taskId, error });
  }

  /**
   * Update execution state
   */
  updateExecutionState(isExecuting: boolean, isPaused: boolean = false, isCancelled: boolean = false): void {
    this.state.isExecuting = isExecuting;
    this.state.isPaused = isPaused;
    this.state.isCancelled = isCancelled;
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
    
    logger.debug('Execution state updated', { isExecuting, isPaused, isCancelled });
  }

  /**
   * Update performance metrics
   */
  updateMetrics(metrics: Partial<RealTimeState['performanceMetrics']>): void {
    this.state.performanceMetrics = { ...this.state.performanceMetrics, ...metrics };
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
  }

  /**
   * Process real-time update event
   */
  processUpdateEvent(event: RealTimeUpdateEvent): void {
    const startTime = Date.now();
    
    try {
      switch (event.type) {
        case 'task_progress':
          if (event.data.taskId && typeof event.data.progress === 'number') {
            this.updateTaskProgress(event.data.taskId, event.data.progress);
          }
          break;
          
        case 'task_status':
          if (event.data.taskId && event.data.updates) {
            this.updateTaskState(event.data.taskId, event.data.updates);
          }
          break;
          
        case 'workflow_status':
          if (event.data.workflow) {
            this.updateActiveWorkflow(event.data.workflow);
          }
          if (event.data.execution !== undefined) {
            this.updateExecutionState(
              event.data.execution.isExecuting,
              event.data.execution.isPaused,
              event.data.execution.isCancelled
            );
          }
          break;
          
        case 'metrics':
          if (event.data.metrics) {
            this.updateMetrics(event.data.metrics);
          }
          break;
          
        case 'error':
          if (event.data.taskId && event.data.error) {
            this.updateTaskError(event.data.taskId, event.data.error);
          }
          break;
          
        default:
          logger.warn('Unknown update event type', { type: event.type });
      }
      
      // Update processing latency
      const processingTime = Date.now() - startTime;
      this.updateMetrics({ updateLatency: processingTime });
      
    } catch (error) {
      logger.error('Error processing update event', { event, error });
      this.updateMetrics({ 
        errorCount: this.state.performanceMetrics.errorCount + 1 
      });
    }
  }

  /**
   * Subscribe to state updates
   */
  subscribe(callback: (state: RealTimeState) => void): () => void {
    this.updateSubscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateSubscribers.delete(callback);
    };
  }

  /**
   * Force refresh state
   */
  forceRefresh(): void {
    this.state.lastUpdate = Date.now();
    this.notifySubscribers();
    
    logger.debug('State force refreshed');
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = this.createInitialState();
    this.notifySubscribers();
    
    logger.info('Real-time state reset');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.updateSubscribers.clear();
    
    logger.debug('Real-time state service cleaned up');
  }

  /**
   * Get merged workflow with real-time data
   */
  getMergedWorkflow(baseWorkflow?: WorkflowDefinition): WorkflowDefinition | null {
    const workflow = this.state.activeWorkflow || baseWorkflow;
    if (!workflow) return null;

    // Merge real-time data with workflow
    const mergedWorkflow = { ...workflow };
    
    // Update tasks with real-time data
    mergedWorkflow.tasks = workflow.tasks.map(task => {
      const realTimeTask = this.state.taskStates.get(task.id);
      const progress = this.state.taskProgress.get(task.id);
      const error = this.state.taskErrors.get(task.id);
      
      let mergedTask = { ...task };
      
      if (realTimeTask) {
        mergedTask = { ...mergedTask, ...realTimeTask };
      }
      
      if (progress !== undefined) {
        mergedTask.progress = progress;
      }
      
      if (error) {
        mergedTask.result = { 
          ...mergedTask.result, 
          error, 
          success: false 
        };
      }
      
      return mergedTask;
    });
    
    // Update workflow progress
    const completedTasks = mergedWorkflow.tasks.filter(t => t.status === 'completed').length;
    const totalTasks = mergedWorkflow.tasks.length;
    mergedWorkflow.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Update workflow status
    if (this.state.isExecuting) {
      mergedWorkflow.status = 'running';
    } else if (this.state.isPaused) {
      mergedWorkflow.status = 'paused';
    } else if (this.state.isCancelled) {
      mergedWorkflow.status = 'failed';
    } else if (mergedWorkflow.progress === 100) {
      mergedWorkflow.status = 'completed';
    } else {
      mergedWorkflow.status = 'idle';
    }
    
    return mergedWorkflow;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create initial state
   */
  private createInitialState(): RealTimeState {
    return {
      activeWorkflow: null,
      taskStates: new Map(),
      taskProgress: new Map(),
      taskErrors: new Map(),
      isExecuting: false,
      isPaused: false,
      isCancelled: false,
      connectionStatus: 'disconnected',
      updateLatency: 0,
      lastUpdate: Date.now(),
      performanceMetrics: {
        updateLatency: 0,
        connectionStatus: 'disconnected',
        memoryUsage: 0,
        throughput: 0,
        lastUpdate: Date.now(),
        updateCount: 0,
        errorCount: 0
      }
    };
  }

  /**
   * Start update loop for metrics
   */
  private startUpdateLoop(): void {
    this.updateTimer = setInterval(() => {
      this.updateMetrics({
        updateCount: this.state.performanceMetrics.updateCount + 1,
        lastUpdate: Date.now()
      });
    }, this.config.updateInterval);
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    const currentState = this.getState();
    this.updateSubscribers.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        logger.error('Error in state update subscriber', { error });
      }
    });
  }
}

/**
 * Factory function for creating real-time state service
 */
export function createRealTimeStateService(config: RealTimeOrchestratorConfig): RealTimeStateService {
  return new RealTimeStateService(config);
} 