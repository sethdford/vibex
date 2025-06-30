/**
 * Footer Component
 * 
 * Displays application status and information at the bottom of the UI.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';
import path from 'path';

/**
 * Footer component props
 */
interface FooterProps {
  /**
   * Current model being used
   */
  model: string;
  
  /**
   * Target directory for operations
   */
  targetDir: string;
  
  /**
   * Whether debug mode is enabled
   */
  debugMode: boolean;
  
  /**
   * Current git branch name if available
   */
  branchName?: string;
  
  /**
   * Debug message to display
   */
  debugMessage?: string;
  
  /**
   * Count of errors
   */
  errorCount: number;
  
  /**
   * Whether to show detailed error information
   */
  showErrorDetails: boolean;
  
  /**
   * Whether to show memory usage stats
   */
  showMemoryUsage?: boolean;
  
  /**
   * Current prompt token count
   */
  promptTokenCount?: number;
  
  /**
   * Current candidates token count
   */
  candidatesTokenCount?: number;
  
  /**
   * Total token count
   */
  totalTokenCount?: number;
}

/**
 * Formats a directory path for display
 * 
 * @param dirPath - Full directory path
 * @returns Shortened path for display
 */
const formatDirectory = (dirPath: string): string => {
  const homedir = require('os').homedir();
  
  // Replace home directory with ~
  if (dirPath.startsWith(homedir)) {
    return dirPath.replace(homedir, '~');
  }
  
  // If path is very long, truncate the middle
  if (dirPath.length > 40) {
    const parsedPath = path.parse(dirPath);
    const dirs = parsedPath.dir.split(path.sep);
    
    if (dirs.length > 4) {
      const start = dirs.slice(0, 2).join(path.sep);
      const end = dirs.slice(-2).join(path.sep);
      return `${start}/.../${end}/${parsedPath.base}`;
    }
  }
  
  return dirPath;
};

/**
 * Footer component for the application
 */
export const Footer: React.FC<FooterProps> = ({
  model,
  targetDir,
  debugMode,
  branchName,
  debugMessage,
  errorCount,
  showErrorDetails,
  showMemoryUsage = false,
  promptTokenCount = 0,
  candidatesTokenCount = 0,
  totalTokenCount = 0,
}) => {
  // State for memory usage
  const [memoryUsage, setMemoryUsage] = useState<{
    heapUsed: string;
    rss: string;
  }>({ heapUsed: '0', rss: '0' });
  
  // Update memory usage periodically if enabled
  useEffect(() => {
    if (showMemoryUsage) {
      const updateMemoryUsage = () => {
        const usage = process.memoryUsage();
        setMemoryUsage({
          heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(1),
          rss: (usage.rss / 1024 / 1024).toFixed(1),
        });
      };
      
      updateMemoryUsage();
      const interval = setInterval(updateMemoryUsage, 2000);
      
      return () => clearInterval(interval);
    }
  }, [showMemoryUsage]);
  
  // Format model name for display
  const displayModel = model.replace(/claude-/g, '');
  
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Box flexGrow={1}>
          <Text color={Colors.TextDim}>
            {formatDirectory(targetDir)}
            {branchName ? <Text color={Colors.Info}> [{branchName}]</Text> : null}
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.TextDim}>
            {displayModel}
            {debugMode && ' (debug)'}
          </Text>
        </Box>
      </Box>
      
      {/* Token statistics */}
      {(promptTokenCount > 0 || candidatesTokenCount > 0) && (
        <Box justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            tokens: {promptTokenCount}+{candidatesTokenCount}={totalTokenCount}
          </Text>
        </Box>
      )}
      
      {/* Memory usage */}
      {showMemoryUsage && (
        <Box justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            memory: {memoryUsage.heapUsed}MB (heap) {memoryUsage.rss}MB (rss)
          </Text>
        </Box>
      )}
      
      {/* Error count and toggle info */}
      {errorCount > 0 && (
        <Box justifyContent="flex-end">
          <Text color={Colors.Error}>
            {errorCount} error{errorCount !== 1 ? 's' : ''}
            {' '}(Ctrl+O to {showErrorDetails ? 'hide' : 'show'})
          </Text>
        </Box>
      )}
      
      {/* Debug message */}
      {debugMessage && debugMode && (
        <Box justifyContent="flex-start">
          <Text color={Colors.TextDim}>{debugMessage}</Text>
        </Box>
      )}
    </Box>
  );
};