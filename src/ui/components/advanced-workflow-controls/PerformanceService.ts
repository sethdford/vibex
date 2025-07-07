/**
 * Performance Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for workflow performance profiling and monitoring
 */

import { logger } from '../../../utils/logger.js';
import type { PerformanceProfile, ExecutionStep } from './types.js';

/**
 * Service for managing workflow performance profiling
 */
export class PerformanceService {
  /**
   * Update performance profile with execution data
   */
  static updatePerformanceProfile(
    performanceProfile: Map<string, PerformanceProfile>,
    taskId: string,
    duration: number,
    memoryUsage: number,
    cpuUsage: number = 0
  ): Map<string, PerformanceProfile> {
    const current = performanceProfile.get(taskId) || {
      totalTime: 0,
      averageTime: 0,
      executionCount: 0,
      memoryPeak: 0,
      cpuPeak: 0,
    };

    const updated: PerformanceProfile = {
      totalTime: current.totalTime + duration,
      averageTime: (current.totalTime + duration) / (current.executionCount + 1),
      executionCount: current.executionCount + 1,
      memoryPeak: Math.max(current.memoryPeak, memoryUsage),
      cpuPeak: Math.max(current.cpuPeak, cpuUsage),
    };

    const newProfile = new Map(performanceProfile);
    newProfile.set(taskId, updated);

    logger.debug('Performance profile updated', {
      taskId,
      duration,
      memoryUsage,
      executionCount: updated.executionCount,
      averageTime: updated.averageTime
    });

    return newProfile;
  }

  /**
   * Update performance profile from execution step
   */
  static updateFromExecutionStep(
    performanceProfile: Map<string, PerformanceProfile>,
    step: ExecutionStep
  ): Map<string, PerformanceProfile> {
    return this.updatePerformanceProfile(
      performanceProfile,
      step.taskId,
      step.performance.duration,
      step.performance.memoryUsage,
      step.performance.cpuUsage
    );
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(
    performanceProfile: Map<string, PerformanceProfile>
  ): {
    totalTasks: number;
    totalExecutions: number;
    totalTime: number;
    averageTime: number;
    slowestTask: { taskId: string; time: number } | null;
    fastestTask: { taskId: string; time: number } | null;
    memoryPeak: number;
    cpuPeak: number;
  } {
    const entries = Array.from(performanceProfile.entries());
    
    if (entries.length === 0) {
      return {
        totalTasks: 0,
        totalExecutions: 0,
        totalTime: 0,
        averageTime: 0,
        slowestTask: null,
        fastestTask: null,
        memoryPeak: 0,
        cpuPeak: 0,
      };
    }

    const totalTasks = entries.length;
    const totalExecutions = entries.reduce((sum, [, profile]) => sum + profile.executionCount, 0);
    const totalTime = entries.reduce((sum, [, profile]) => sum + profile.totalTime, 0);
    const averageTime = totalTime / totalExecutions;

    const sortedByTime = entries.sort((a, b) => b[1].averageTime - a[1].averageTime);
    const slowestTask = sortedByTime[0] ? {
      taskId: sortedByTime[0][0],
      time: sortedByTime[0][1].averageTime
    } : null;
    const fastestTask = sortedByTime[sortedByTime.length - 1] ? {
      taskId: sortedByTime[sortedByTime.length - 1][0],
      time: sortedByTime[sortedByTime.length - 1][1].averageTime
    } : null;

    const memoryPeak = Math.max(...entries.map(([, profile]) => profile.memoryPeak));
    const cpuPeak = Math.max(...entries.map(([, profile]) => profile.cpuPeak));

    return {
      totalTasks,
      totalExecutions,
      totalTime,
      averageTime,
      slowestTask,
      fastestTask,
      memoryPeak,
      cpuPeak,
    };
  }

  /**
   * Get sorted performance entries
   */
  static getSortedPerformanceEntries(
    performanceProfile: Map<string, PerformanceProfile>,
    sortBy: 'totalTime' | 'averageTime' | 'executionCount' | 'memoryPeak' = 'totalTime'
  ): Array<[string, PerformanceProfile]> {
    return Array.from(performanceProfile.entries()).sort((a, b) => {
      const aValue = a[1][sortBy];
      const bValue = b[1][sortBy];
      return bValue - aValue;
    });
  }

  /**
   * Get performance bottlenecks
   */
  static getBottlenecks(
    performanceProfile: Map<string, PerformanceProfile>,
    threshold: {
      timeThreshold?: number;
      memoryThreshold?: number;
      executionCountThreshold?: number;
    } = {}
  ): {
    slowTasks: Array<{ taskId: string; profile: PerformanceProfile; reason: string }>;
    memoryHeavyTasks: Array<{ taskId: string; profile: PerformanceProfile; reason: string }>;
    frequentTasks: Array<{ taskId: string; profile: PerformanceProfile; reason: string }>;
  } {
    const entries = Array.from(performanceProfile.entries());
    const stats = this.getPerformanceStats(performanceProfile);

    const {
      timeThreshold = stats.averageTime * 2,
      memoryThreshold = stats.memoryPeak * 0.8,
      executionCountThreshold = Math.max(5, stats.totalExecutions / stats.totalTasks * 2)
    } = threshold;

    const slowTasks = entries
      .filter(([, profile]) => profile.averageTime > timeThreshold)
      .map(([taskId, profile]) => ({
        taskId,
        profile,
        reason: `Average time ${profile.averageTime.toFixed(0)}ms exceeds threshold ${timeThreshold.toFixed(0)}ms`
      }));

    const memoryHeavyTasks = entries
      .filter(([, profile]) => profile.memoryPeak > memoryThreshold)
      .map(([taskId, profile]) => ({
        taskId,
        profile,
        reason: `Memory peak ${profile.memoryPeak.toFixed(1)}MB exceeds threshold ${memoryThreshold.toFixed(1)}MB`
      }));

    const frequentTasks = entries
      .filter(([, profile]) => profile.executionCount > executionCountThreshold)
      .map(([taskId, profile]) => ({
        taskId,
        profile,
        reason: `Execution count ${profile.executionCount} exceeds threshold ${executionCountThreshold}`
      }));

    return {
      slowTasks,
      memoryHeavyTasks,
      frequentTasks,
    };
  }

  /**
   * Clear performance profile
   */
  static clearPerformanceProfile(): Map<string, PerformanceProfile> {
    logger.info('Performance profile cleared');
    return new Map();
  }

  /**
   * Export performance data for analysis
   */
  static exportPerformanceData(
    performanceProfile: Map<string, PerformanceProfile>
  ): {
    timestamp: number;
    stats: ReturnType<typeof PerformanceService.getPerformanceStats>;
    entries: Array<{ taskId: string; profile: PerformanceProfile }>;
    bottlenecks: ReturnType<typeof PerformanceService.getBottlenecks>;
  } {
    const stats = this.getPerformanceStats(performanceProfile);
    const entries = Array.from(performanceProfile.entries()).map(([taskId, profile]) => ({
      taskId,
      profile
    }));
    const bottlenecks = this.getBottlenecks(performanceProfile);

    return {
      timestamp: Date.now(),
      stats,
      entries,
      bottlenecks,
    };
  }

  /**
   * Format performance metrics for display
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(0)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format memory usage for display
   */
  static formatMemory(megabytes: number): string {
    if (megabytes < 1024) {
      return `${megabytes.toFixed(1)}MB`;
    } else {
      return `${(megabytes / 1024).toFixed(2)}GB`;
    }
  }

  /**
   * Calculate performance score (0-100, higher is better)
   */
  static calculatePerformanceScore(
    profile: PerformanceProfile,
    baseline: { averageTime: number; memoryPeak: number }
  ): number {
    const timeScore = Math.max(0, 100 - (profile.averageTime / baseline.averageTime * 100));
    const memoryScore = Math.max(0, 100 - (profile.memoryPeak / baseline.memoryPeak * 100));
    
    return (timeScore + memoryScore) / 2;
  }
} 