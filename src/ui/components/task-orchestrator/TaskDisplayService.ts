/**
 * Task Display Service - Clean Architecture like Gemini CLI
 * 
 * Handles task filtering, sorting, and display preparation logic
 */

import type { TaskDefinition, WorkflowDefinition, TaskOrchestratorConfig } from './types.js';
import { TaskStatusService } from './TaskStatusService.js';

/**
 * Task display service for centralized display logic
 */
export class TaskDisplayService {
  /**
   * Filter and sort tasks for display
   */
  static getDisplayTasks(
    workflow: WorkflowDefinition | null,
    config: TaskOrchestratorConfig
  ): TaskDefinition[] {
    if (!workflow) return [];
    
    let tasks = [...workflow.tasks];
    
    // Filter completed tasks if not showing them
    if (!config.showCompleted) {
      tasks = tasks.filter(task => !TaskStatusService.isCompletedTask(task.status));
    }
    
    // Sort by priority and status
    tasks.sort((a, b) => {
      // Priority order: critical > high > normal > low
      const priorityDiff = TaskStatusService.getPriorityOrder(b.priority) - TaskStatusService.getPriorityOrder(a.priority);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Status order: in_progress > pending > waiting_dependencies > others
      return TaskStatusService.getStatusPriority(b.status) - TaskStatusService.getStatusPriority(a.status);
    });
    
    return tasks;
  }

  /**
   * Find the next active task index for auto-scroll
   */
  static findActiveTaskIndex(tasks: TaskDefinition[]): number {
    const activeTaskIndex = tasks.findIndex(task => 
      TaskStatusService.isActiveTask(task.status)
    );
    
    return activeTaskIndex >= 0 ? activeTaskIndex : 0;
  }

  /**
   * Check if task should be expanded by default
   */
  static shouldAutoExpand(task: TaskDefinition): boolean {
    // Auto-expand failed tasks to show error details
    if (TaskStatusService.isFailedTask(task.status)) {
      return true;
    }
    
    // Auto-expand in-progress tasks with tool calls
    if (task.status === 'in_progress' && task.toolCalls.length > 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Get task dependencies status summary
   */
  static getTaskDependenciesStatus(
    task: TaskDefinition,
    workflow: WorkflowDefinition
  ): { completed: number; total: number; allCompleted: boolean } {
    if (!task.dependencies.length) {
      return { completed: 0, total: 0, allCompleted: true };
    }
    
    const dependencyStatuses = task.dependencies.map(depId => {
      const depTask = workflow.tasks.find(t => t.id === depId);
      return depTask ? depTask.status : 'unknown';
    });
    
    const completed = dependencyStatuses.filter(status => status === 'completed').length;
    const total = task.dependencies.length;
    const allCompleted = completed === total;
    
    return { completed, total, allCompleted };
  }

  /**
   * Check if task can be executed (dependencies met)
   */
  static canExecuteTask(task: TaskDefinition, workflow: WorkflowDefinition): boolean {
    const depStatus = this.getTaskDependenciesStatus(task, workflow);
    return depStatus.allCompleted;
  }

  /**
   * Get workflow completion statistics
   */
  static getWorkflowStats(workflow: WorkflowDefinition): {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    pending: number;
    completionPercentage: number;
  } {
    const total = workflow.tasks.length;
    const completed = workflow.tasks.filter(t => TaskStatusService.isCompletedTask(t.status)).length;
    const failed = workflow.tasks.filter(t => TaskStatusService.isFailedTask(t.status)).length;
    const inProgress = workflow.tasks.filter(t => t.status === 'in_progress').length;
    const pending = workflow.tasks.filter(t => t.status === 'pending').length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      failed,
      inProgress,
      pending,
      completionPercentage
    };
  }

  /**
   * Get critical path tasks (tasks that affect overall completion time)
   */
  static getCriticalPathTasks(workflow: WorkflowDefinition): TaskDefinition[] {
    // Simple critical path: tasks with no dependencies that aren't completed
    return workflow.tasks.filter(task => 
      task.dependencies.length === 0 && !TaskStatusService.isCompletedTask(task.status)
    );
  }

  /**
   * Get blocked tasks (tasks waiting on dependencies)
   */
  static getBlockedTasks(workflow: WorkflowDefinition): TaskDefinition[] {
    return workflow.tasks.filter(task => {
      if (task.status !== 'waiting_dependencies') return false;
      const depStatus = this.getTaskDependenciesStatus(task, workflow);
      return !depStatus.allCompleted;
    });
  }
} 