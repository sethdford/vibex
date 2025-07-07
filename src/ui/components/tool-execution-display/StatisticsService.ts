/**
 * Statistics Service
 * 
 * Calculates execution statistics, metrics, and summary data.
 * Provides analytics for tool execution performance and success rates.
 */

import type { ToolExecutionEntry, ExecutionStatistics } from './types.js';

/**
 * Statistics service factory
 */
export function createStatisticsService() {
  
  /**
   * Calculate execution statistics
   */
  const calculateStatistics = (executions: ToolExecutionEntry[]): ExecutionStatistics => {
    const total = executions.length;
    const executing = executions.filter(e => e.state === 'executing').length;
    const completed = executions.filter(e => e.state === 'completed').length;
    const failed = executions.filter(e => e.state === 'failed').length;
    
    // Calculate average duration for completed executions
    const completedWithDuration = executions.filter(e => e.duration && e.duration > 0);
    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((acc, e) => acc + (e.duration || 0), 0) / completedWithDuration.length
      : 0;
    
    // Calculate success rate
    const finishedExecutions = completed + failed;
    const successRate = finishedExecutions > 0 ? completed / finishedExecutions : 0;
    
    return {
      total,
      executing,
      completed,
      failed,
      avgDuration,
      successRate,
    };
  };

  /**
   * Filter executions by state
   */
  const filterByState = (executions: ToolExecutionEntry[], states: string[]): ToolExecutionEntry[] => {
    return executions.filter(exec => states.includes(exec.state));
  };

  /**
   * Get recent executions
   */
  const getRecentExecutions = (executions: ToolExecutionEntry[], limit: number): ToolExecutionEntry[] => {
    return [...executions]
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  };

  /**
   * Get executions by time range
   */
  const getExecutionsByTimeRange = (
    executions: ToolExecutionEntry[],
    startTime: number,
    endTime: number
  ): ToolExecutionEntry[] => {
    return executions.filter(exec => 
      exec.startTime >= startTime && exec.startTime <= endTime
    );
  };

  /**
   * Calculate total execution time
   */
  const calculateTotalExecutionTime = (executions: ToolExecutionEntry[]): number => {
    return executions
      .filter(exec => exec.duration)
      .reduce((total, exec) => total + (exec.duration || 0), 0);
  };

  /**
   * Get fastest execution
   */
  const getFastestExecution = (executions: ToolExecutionEntry[]): ToolExecutionEntry | null => {
    const completed = executions.filter(exec => exec.duration && exec.state === 'completed');
    if (completed.length === 0) return null;
    
    return completed.reduce((fastest, exec) => 
      (exec.duration || 0) < (fastest.duration || Infinity) ? exec : fastest
    );
  };

  /**
   * Get slowest execution
   */
  const getSlowestExecution = (executions: ToolExecutionEntry[]): ToolExecutionEntry | null => {
    const completed = executions.filter(exec => exec.duration && exec.state === 'completed');
    if (completed.length === 0) return null;
    
    return completed.reduce((slowest, exec) => 
      (exec.duration || 0) > (slowest.duration || 0) ? exec : slowest
    );
  };

  /**
   * Calculate memory usage statistics
   */
  const calculateMemoryStats = (executions: ToolExecutionEntry[]) => {
    const withMemory = executions.filter(exec => exec.metadata?.memoryUsed);
    if (withMemory.length === 0) return null;
    
    const memoryValues = withMemory.map(exec => exec.metadata!.memoryUsed!);
    const total = memoryValues.reduce((sum, val) => sum + val, 0);
    const avg = total / memoryValues.length;
    const max = Math.max(...memoryValues);
    const min = Math.min(...memoryValues);
    
    return { total, avg, max, min };
  };

  /**
   * Calculate CPU usage statistics
   */
  const calculateCpuStats = (executions: ToolExecutionEntry[]) => {
    const withCpu = executions.filter(exec => exec.metadata?.cpuUsed);
    if (withCpu.length === 0) return null;
    
    const cpuValues = withCpu.map(exec => exec.metadata!.cpuUsed!);
    const avg = cpuValues.reduce((sum, val) => sum + val, 0) / cpuValues.length;
    const max = Math.max(...cpuValues);
    const min = Math.min(...cpuValues);
    
    return { avg, max, min };
  };

  return {
    calculateStatistics,
    filterByState,
    getRecentExecutions,
    getExecutionsByTimeRange,
    calculateTotalExecutionTime,
    getFastestExecution,
    getSlowestExecution,
    calculateMemoryStats,
    calculateCpuStats,
  };
} 