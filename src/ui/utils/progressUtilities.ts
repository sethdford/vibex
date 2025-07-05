/**
 * Progress Utilities
 * 
 * Helper functions for progress tracking and time estimation
 */

import type { ProgressData } from '../contexts/ProgressContext.js';
import type { StatusType } from '../components/StatusIcon.js';

/**
 * Calculate estimated time remaining based on progress history
 * 
 * @param progressHistory - Array of progress updates with time and value
 * @param currentValue - Current progress value
 * @param totalValue - Total progress value
 * @returns Estimated time remaining in seconds or undefined if cannot be calculated
 */
export function calculateEstimatedTimeRemaining(
  progressHistory: Array<{ time: number; value: number }>,
  currentValue: number,
  totalValue: number
): number | undefined {
  // Need at least two data points
  if (progressHistory.length < 2) {return undefined;}
  
  // Sort history by time
  const sortedHistory = [...progressHistory].sort((a, b) => a.time - b.time);
  
  // Get oldest and newest points for calculation
  const oldest = sortedHistory[0];
  const newest = sortedHistory[sortedHistory.length - 1];
  
  // Calculate time elapsed and progress made
  const timeElapsedMs = newest.time - oldest.time;
  const progressMade = newest.value - oldest.value;
  
  // Cannot calculate if no progress has been made or time elapsed is too small
  if (progressMade <= 0 || timeElapsedMs <= 0) {return undefined;}
  
  // Calculate rate of progress (units per millisecond)
  const progressRate = progressMade / timeElapsedMs;
  
  // Calculate remaining progress
  const remainingProgress = totalValue - currentValue;
  
  // If progress is complete or almost complete
  if (remainingProgress <= 0) {return 0;}
  
  // Calculate estimated time remaining in milliseconds
  const estimatedTimeMs = remainingProgress / progressRate;
  
  // Convert to seconds
  return estimatedTimeMs / 1000;
}

/**
 * Format time duration in a human-readable format
 * 
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTimeDuration(seconds: number): string {
  if (seconds < 1) {return 'less than a second';}
  if (seconds < 60) {return `${Math.round(seconds)} second${seconds === 1 ? '' : 's'}`;}
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}${
      remainingSeconds > 0 ? ` ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}` : ''
    }`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hour${hours === 1 ? '' : 's'}${
    remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}` : ''
  }`;
}

/**
 * Get appropriate status based on progress state
 * 
 * @param progress - Progress data
 * @returns Status type
 */
export function determineProgressStatus(progress: ProgressData): StatusType {
  // If status is already set, use it
  if (progress.status) {return progress.status;}
  
  // Determine status based on progress state
  if (!progress.active) {return 'success';}
  if (progress.value >= progress.total) {return 'success';}
  if (progress.indeterminate) {return 'running';}
  
  return 'running';
}

/**
 * Generate a progress snapshot for a point in time
 * 
 * @param progress - Progress data
 * @param currentTime - Current timestamp
 * @returns Snapshot of progress data with calculated fields
 */
export function generateProgressSnapshot(
  progress: ProgressData,
  currentTime: number = Date.now()
): ProgressData & { 
  percent: number;
  elapsedTime: number;
} {
  // Calculate percentage
  const percent = (progress.value / progress.total) * 100;
  
  // Calculate elapsed time
  const elapsedTime = (currentTime - progress.startTime) / 1000;
  
  // Calculate estimated time remaining if not already present
  let estimatedTimeRemaining = progress.estimatedTimeRemaining;
  if (estimatedTimeRemaining === undefined && !progress.indeterminate) {
    estimatedTimeRemaining = calculateEstimatedTimeRemaining(
      progress.progressHistory,
      progress.value,
      progress.total
    );
  }
  
  return {
    ...progress,
    percent,
    elapsedTime,
    estimatedTimeRemaining,
  };
}

/**
 * Format progress for display in the terminal
 * 
 * @param progress - Progress data
 * @returns Formatted string representation
 */
export function formatProgressForDisplay(progress: ProgressData): string {
  const snapshot = generateProgressSnapshot(progress);
  const { percent, elapsedTime } = snapshot;
  
  // Basic progress info
  let display = `${progress.label}: ${Math.round(percent)}%`;
  
  // Add time info
  if (elapsedTime > 1) {
    display += ` (${formatTimeDuration(elapsedTime)})`;
  }
  
  // Add estimated time remaining
  if (snapshot.estimatedTimeRemaining !== undefined && snapshot.estimatedTimeRemaining > 0) {
    display += ` - ${formatTimeDuration(snapshot.estimatedTimeRemaining)} remaining`;
  }
  
  // Add current step info
  if (progress.currentStep !== undefined && progress.totalSteps !== undefined) {
    display += ` [Step ${progress.currentStep}/${progress.totalSteps}]`;
  }
  
  // Add message if available
  if (progress.message) {
    display += ` - ${progress.message}`;
  }
  
  return display;
}