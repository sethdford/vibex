/**
 * Memory usage formatting utilities
 * 
 * Functions to format memory usage values for display in the UI
 */

/**
 * Format memory usage value in bytes to a human-readable string
 * 
 * @param bytes - Memory usage in bytes
 * @returns Formatted memory usage string
 */
export function formatMemoryUsage(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  // Format with appropriate precision based on unit size
  if (i === 0) return `${bytes} B`;
  
  // For KB, show no decimal places
  if (i === 1) return `${Math.round(bytes / Math.pow(1024, i))} KB`;
  
  // For MB and above, show 1 decimal place
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}