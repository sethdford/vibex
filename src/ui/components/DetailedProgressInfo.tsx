/**
 * Detailed Progress Info Component
 * 
 * Displays detailed progress information that can be shown on user interaction
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors';
import { StatusIcon, StatusType } from './StatusIcon';

/**
 * Progress step interface
 */
export interface ProgressStep {
  /**
   * Step name
   */
  name: string;
  
  /**
   * Step status
   */
  status: StatusType;
  
  /**
   * Step start time
   */
  startTime?: number;
  
  /**
   * Step end time
   */
  endTime?: number;
  
  /**
   * Step details or message
   */
  message?: string;
}

/**
 * Detailed progress info props
 */
interface DetailedProgressInfoProps {
  /**
   * Progress ID
   */
  id: string;
  
  /**
   * Progress label
   */
  label: string;
  
  /**
   * Current progress value (0-100)
   */
  value: number;
  
  /**
   * Total value for calculating percentage
   */
  total: number;
  
  /**
   * Progress steps
   */
  steps?: ProgressStep[];
  
  /**
   * Status of the progress
   */
  status: StatusType;
  
  /**
   * Start time
   */
  startTime: number;
  
  /**
   * Last update time
   */
  updateTime: number;
  
  /**
   * End time (if completed)
   */
  endTime?: number;
  
  /**
   * Whether the progress is active
   */
  active: boolean;
  
  /**
   * Progress message or details
   */
  message?: string;
  
  /**
   * Estimated time remaining (in seconds)
   */
  estimatedTimeRemaining?: number;
  
  /**
   * Whether to initially show details
   */
  initiallyExpanded?: boolean;
  
  /**
   * Whether to show the expand/collapse control
   */
  showExpandControl?: boolean;
}

/**
 * Format time duration in a human-readable format
 */
const formatDuration = (durationMs: number): string => {
  if (durationMs < 1000) return `${durationMs}ms`;
  
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
};

/**
 * Format timestamp in a human-readable format
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Detailed progress info component
 */
export const DetailedProgressInfo: React.FC<DetailedProgressInfoProps> = ({
  id,
  label,
  value,
  total,
  steps = [],
  status,
  startTime,
  updateTime,
  endTime,
  active,
  message,
  estimatedTimeRemaining,
  initiallyExpanded = false,
  showExpandControl = true,
}) => {
  // Expanded state
  const [expanded, setExpanded] = useState(initiallyExpanded);
  
  // Handle input for expand/collapse
  useInput((input, key) => {
    if (key.return && showExpandControl) {
      setExpanded(!expanded);
    }
  });
  
  // Calculate percentage
  const percentage = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  
  // Calculate elapsed time
  const elapsedMs = (endTime || Date.now()) - startTime;
  const elapsedFormatted = formatDuration(elapsedMs);
  
  // Format estimated time remaining
  const remainingFormatted = estimatedTimeRemaining 
    ? formatDuration(estimatedTimeRemaining * 1000)
    : 'unknown';
  
  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header with basic info */}
      <Box>
        <StatusIcon status={status} animated={active} />
        
        <Box marginLeft={1} flexGrow={1}>
          <Text bold>{label}</Text>
        </Box>
        
        <Box marginLeft={1}>
          <Text>{percentage.toFixed(1)}%</Text>
        </Box>
        
        {showExpandControl && (
          <Box marginLeft={2}>
            <Text dimColor role="button">
              {expanded ? '[-]' : '[+]'} {expanded ? 'Hide' : 'Show'} Details
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Message */}
      {message && (
        <Box marginLeft={2} marginTop={1}>
          <Text>{message}</Text>
        </Box>
      )}
      
      {/* Expanded details */}
      {expanded && (
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          {/* Progress ID */}
          <Box>
            <Box width={16}>
              <Text dimColor>ID:</Text>
            </Box>
            <Text>{id}</Text>
          </Box>
          
          {/* Time information */}
          <Box>
            <Box width={16}>
              <Text dimColor>Started:</Text>
            </Box>
            <Text>{formatTimestamp(startTime)}</Text>
          </Box>
          
          {!active && endTime && (
            <Box>
              <Box width={16}>
                <Text dimColor>Completed:</Text>
              </Box>
              <Text>{formatTimestamp(endTime)}</Text>
            </Box>
          )}
          
          <Box>
            <Box width={16}>
              <Text dimColor>Elapsed:</Text>
            </Box>
            <Text>{elapsedFormatted}</Text>
          </Box>
          
          {active && estimatedTimeRemaining !== undefined && (
            <Box>
              <Box width={16}>
                <Text dimColor>Remaining:</Text>
              </Box>
              <Text>{remainingFormatted}</Text>
            </Box>
          )}
          
          {/* Steps */}
          {steps.length > 0 && (
            <>
              <Box marginTop={1}>
                <Text bold>Steps:</Text>
              </Box>
              
              {steps.map((step, index) => (
                <Box key={index} marginLeft={2} marginTop={1}>
                  <StatusIcon status={step.status} />
                  
                  <Box marginLeft={1} flexGrow={1}>
                    <Text>{step.name}</Text>
                  </Box>
                  
                  {step.startTime && step.endTime && (
                    <Box>
                      <Text dimColor>
                        {formatDuration(step.endTime - step.startTime)}
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </>
          )}
        </Box>
      )}
    </Box>
  );
};