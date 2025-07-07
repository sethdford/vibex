/**
 * Task Status Service - Clean Architecture like Gemini CLI
 * 
 * Handles task status logic, icon mapping, and status transitions
 */

import { Colors } from '../../colors.js';
import type { TaskStatus, TaskPriority, TaskStatusIcon, PriorityIndicator } from './types.js';

/**
 * Task status service for centralized status management
 */
export class TaskStatusService {
  /**
   * Get task status icon and color
   */
  static getTaskStatusIcon(status: TaskStatus): TaskStatusIcon {
    switch (status) {
      case 'pending':
        return { icon: '○', color: Colors.TextDim };
      case 'in_progress':
        return { icon: '⟳', color: Colors.Info };
      case 'completed':
        return { icon: '✓', color: Colors.Success };
      case 'failed':
        return { icon: '✗', color: Colors.Error };
      case 'cancelled':
        return { icon: '⊘', color: Colors.TextDim };
      case 'waiting_dependencies':
        return { icon: '⏳', color: Colors.Warning };
      case 'paused':
        return { icon: '⏸', color: Colors.Warning };
      default:
        return { icon: '○', color: Colors.TextDim };
    }
  }

  /**
   * Get priority indicator
   */
  static getPriorityIndicator(priority: TaskPriority): PriorityIndicator {
    switch (priority) {
      case 'critical':
        return { icon: '🔴', color: Colors.Error };
      case 'high':
        return { icon: '🟠', color: Colors.Warning };
      case 'normal':
        return { icon: '🟡', color: Colors.Info };
      case 'low':
        return { icon: '🟢', color: Colors.Success };
      default:
        return { icon: '⚪', color: Colors.TextDim };
    }
  }

  /**
   * Check if task can be retried
   */
  static canRetryTask(status: TaskStatus, retryable: boolean): boolean {
    return status === 'failed' && retryable;
  }

  /**
   * Check if task is active (in progress or pending)
   */
  static isActiveTask(status: TaskStatus): boolean {
    return status === 'in_progress' || status === 'pending';
  }

  /**
   * Check if task is completed
   */
  static isCompletedTask(status: TaskStatus): boolean {
    return status === 'completed';
  }

  /**
   * Check if task is failed
   */
  static isFailedTask(status: TaskStatus): boolean {
    return status === 'failed';
  }

  /**
   * Get status priority for sorting (higher = more important)
   */
  static getStatusPriority(status: TaskStatus): number {
    const statusOrder = {
      in_progress: 5,
      pending: 4,
      waiting_dependencies: 3,
      paused: 2,
      failed: 1,
      completed: 0,
      cancelled: 0
    };
    
    return statusOrder[status] || 0;
  }

  /**
   * Get priority order for sorting (higher = more important)
   */
  static getPriorityOrder(priority: TaskPriority): number {
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
    return priorityOrder[priority] || 1;
  }
} 