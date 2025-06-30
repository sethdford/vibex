/**
 * Progress Bar Component
 * 
 * Displays a customizable progress bar in the terminal with animations and status indicators
 */

import React, { useEffect, useState, useRef } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';
import { StatusIcon, StatusType } from './StatusIcon';

/**
 * Progress bar props
 */
interface ProgressBarProps {
  /**
   * Current progress value (0-100)
   */
  value: number;
  
  /**
   * Maximum width of the progress bar
   */
  width?: number;
  
  /**
   * Color of the progress bar
   */
  color?: string;
  
  /**
   * Color of the background
   */
  backgroundColor?: string;
  
  /**
   * Character to use for the filled part
   */
  character?: string;
  
  /**
   * Character to use for the empty part
   */
  emptyCharacter?: string;
  
  /**
   * Whether to show percentage text
   */
  showPercentage?: boolean;
  
  /**
   * Label to show before the progress bar
   */
  label?: string;
  
  /**
   * Optional completion message
   */
  completionMessage?: string;

  /**
   * Current step (for multi-step operations)
   */
  currentStep?: number;

  /**
   * Total number of steps
   */
  totalSteps?: number;

  /**
   * Whether to show step counter
   */
  showSteps?: boolean;

  /**
   * Status of the progress bar
   */
  status?: StatusType;

  /**
   * Whether to show status icon
   */
  showStatus?: boolean;

  /**
   * Estimated time remaining (in seconds)
   */
  estimatedTimeRemaining?: number;

  /**
   * Whether to show time estimate
   */
  showTimeEstimate?: boolean;

  /**
   * Whether to animate transitions
   */
  animated?: boolean;

  /**
   * ARIA description for accessibility
   */
  ariaDescription?: string;
}

/**
 * Progress bar component
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  width = 30,
  color = Colors.Primary,
  backgroundColor = Colors.TextDim,
  character = '█',
  emptyCharacter = '░',
  showPercentage = true,
  label,
  completionMessage,
  currentStep,
  totalSteps,
  showSteps = false,
  status = 'running',
  showStatus = false,
  estimatedTimeRemaining,
  showTimeEstimate = false,
  animated = true,
  ariaDescription,
}) => {
  // Animated value state
  const [animatedValue, setAnimatedValue] = useState(value);
  const prevValueRef = useRef(value);
  
  // Update animated value when actual value changes
  useEffect(() => {
    if (!animated) {
      setAnimatedValue(value);
      return;
    }
    
    const diff = value - prevValueRef.current;
    prevValueRef.current = value;
    
    // Skip animation for large changes or initial render
    if (Math.abs(diff) > 20 || animatedValue === 0) {
      setAnimatedValue(value);
      return;
    }
    
    // Animate smoothly to the new value
    let startTime: number | null = null;
    const duration = 300; // 300ms transition
    const startValue = animatedValue;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth transition
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      
      setAnimatedValue(startValue + diff * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, animated]);
  
  // Ensure value is between 0 and 100
  const normalizedValue = Math.min(100, Math.max(0, animated ? animatedValue : value));
  
  // Calculate filled width
  const filledWidth = Math.round((normalizedValue / 100) * width);
  
  // Generate progress bar characters
  const filled = character.repeat(filledWidth);
  const empty = emptyCharacter.repeat(width - filledWidth);
  
  // Format percentage display
  const percentage = normalizedValue.toFixed(1);
  
  // Check if completed
  const isCompleted = normalizedValue >= 100;
  
  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };
  
  // Determine status
  const progressStatus = isCompleted ? 'success' : status;
  
  return (
    <Box flexDirection="column">
      <Box>
        {/* Status icon */}
        {showStatus && (
          <Box marginRight={1}>
            <StatusIcon 
              status={progressStatus} 
              animated={animated && progressStatus === 'running'} 
            />
          </Box>
        )}
        
        {/* Label */}
        {label && (
          <Box marginRight={1}>
            <Text bold>{label}</Text>
          </Box>
        )}
        
        {/* Step counter */}
        {showSteps && currentStep !== undefined && totalSteps !== undefined && (
          <Box marginRight={1}>
            <Text dimColor>
              [{currentStep}/{totalSteps}]
            </Text>
          </Box>
        )}
        
        {/* Progress bar */}
        <Box>
          <Text color={color} aria-hidden>
            {filled}
          </Text>
          <Text color={backgroundColor} aria-hidden>
            {empty}
          </Text>
        </Box>
        
        {/* Percentage */}
        {showPercentage && (
          <Box marginLeft={1}>
            <Text>{percentage}%</Text>
          </Box>
        )}
        
        {/* Time estimate */}
        {showTimeEstimate && estimatedTimeRemaining !== undefined && !isCompleted && (
          <Box marginLeft={1}>
            <Text dimColor>
              {formatTimeRemaining(estimatedTimeRemaining)} remaining
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Completion message */}
      {isCompleted && completionMessage && (
        <Box marginTop={1}>
          <Text color={Colors.Success}>{completionMessage}</Text>
        </Box>
      )}
      
      {/* Hidden text for screen readers */}
      <Text aria-live="polite" aria-hidden={!ariaDescription}>
        {ariaDescription || `Progress: ${percentage}%`}
        {showSteps && currentStep !== undefined && totalSteps !== undefined && 
          ` Step ${currentStep} of ${totalSteps}.`}
        {showTimeEstimate && estimatedTimeRemaining !== undefined && !isCompleted && 
          ` Estimated time remaining: ${formatTimeRemaining(estimatedTimeRemaining)}.`}
        {isCompleted && completionMessage && ` ${completionMessage}`}
      </Text>
    </Box>
  );
};