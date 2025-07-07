/**
 * Task Time Service - Clean Architecture like Gemini CLI
 * 
 * Handles time calculations, duration formatting, and elapsed time logic
 */

import type { TaskDefinition } from './types.js';

/**
 * Task time service for centralized time management
 */
export class TaskTimeService {
  /**
   * Format duration from milliseconds to human readable string
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calculate elapsed time for a task
   */
  static getElapsedTime(task: TaskDefinition): string {
    if (!task.startTime) return '';
    
    const endTime = task.endTime || Date.now();
    const elapsed = endTime - task.startTime;
    return this.formatDuration(elapsed);
  }

  /**
   * Calculate estimated time remaining
   */
  static getEstimatedTimeRemaining(task: TaskDefinition): string {
    if (!task.estimatedDuration || !task.startTime || task.progress === 0) {
      return '';
    }

    const elapsed = Date.now() - task.startTime;
    const progressRatio = task.progress / 100;
    const estimatedTotal = elapsed / progressRatio;
    const remaining = estimatedTotal - elapsed;

    return remaining > 0 ? this.formatDuration(remaining) : '';
  }

  /**
   * Check if task is overdue based on estimated duration
   */
  static isTaskOverdue(task: TaskDefinition): boolean {
    if (!task.estimatedDuration || !task.startTime || task.status === 'completed') {
      return false;
    }

    const elapsed = Date.now() - task.startTime;
    return elapsed > task.estimatedDuration;
  }

  /**
   * Calculate task velocity (progress per unit time)
   */
  static getTaskVelocity(task: TaskDefinition): number {
    if (!task.startTime || task.progress === 0) {
      return 0;
    }

    const elapsed = Date.now() - task.startTime;
    return task.progress / elapsed; // progress per millisecond
  }

  /**
   * Get ETA (Estimated Time of Arrival) for task completion
   */
  static getTaskETA(task: TaskDefinition): Date | null {
    if (!task.startTime || task.progress === 0 || task.progress >= 100) {
      return null;
    }

    const velocity = this.getTaskVelocity(task);
    if (velocity === 0) return null;

    const remainingProgress = 100 - task.progress;
    const estimatedRemainingTime = remainingProgress / velocity;
    
    return new Date(Date.now() + estimatedRemainingTime);
  }

  /**
   * Format ETA to human readable string
   */
  static formatETA(eta: Date | null): string {
    if (!eta) return '';
    
    const now = new Date();
    const diff = eta.getTime() - now.getTime();
    
    if (diff <= 0) return 'Overdue';
    
    return `ETA: ${this.formatDuration(diff)}`;
  }
} 