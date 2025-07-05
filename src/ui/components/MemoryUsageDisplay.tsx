/**
 * Memory Usage Display
 * 
 * Shows current memory usage of the application
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import process from 'node:process';

/**
 * Format bytes to a human-readable format
 */
const formatMemoryUsage = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  // Format with appropriate precision based on unit size
  if (i === 0) return `${bytes} B`;
  
  // For KB, show no decimal places
  if (i === 1) return `${Math.round(bytes / Math.pow(1024, i))} KB`;
  
  // For MB and above, show 1 decimal place
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

interface MemoryUsageDisplayProps {
  /**
   * Update interval in milliseconds
   */
  updateInterval?: number;
  
  /**
   * Warning threshold in bytes
   */
  warningThreshold?: number;
  
  /**
   * Critical threshold in bytes
   */
  criticalThreshold?: number;
}

/**
 * Component to display current memory usage of the process
 */
export const MemoryUsageDisplay: React.FC<MemoryUsageDisplayProps> = ({
  updateInterval = 2000,
  warningThreshold = 2 * 1024 * 1024 * 1024, // 2GB
  criticalThreshold = 3 * 1024 * 1024 * 1024 // 3GB
}) => {
  const [memoryUsage, setMemoryUsage] = useState<string>('');
  const [memoryUsageColor, setMemoryUsageColor] = useState<string>(Colors.Gray500);

  useEffect(() => {
    const updateMemory = () => {
      try {
        // Get resident set size (RSS) - actual memory used by the process
        const usage = process.memoryUsage().rss;
        setMemoryUsage(formatMemoryUsage(usage));
        
        // Set color based on usage thresholds
        if (usage >= criticalThreshold) {
          setMemoryUsageColor(Colors.AccentRed);
        } else if (usage >= warningThreshold) {
          setMemoryUsageColor(Colors.Warning);
        } else {
          setMemoryUsageColor(Colors.Gray500);
        }
      } catch (error) {
        // Handle potential errors with memory usage API
        console.error('Failed to get memory usage:', error);
        setMemoryUsage('N/A');
        setMemoryUsageColor(Colors.Gray500);
      }
    };
    
    const intervalId = setInterval(updateMemory, updateInterval);
    updateMemory(); // Initial update
    
    return () => clearInterval(intervalId);
  }, [updateInterval, warningThreshold, criticalThreshold]);

  return (
    <Box>
      <Text color={Colors.Gray600}>| </Text>
      <Text color={memoryUsageColor}>{memoryUsage}</Text>
    </Box>
  );
};

export default MemoryUsageDisplay;