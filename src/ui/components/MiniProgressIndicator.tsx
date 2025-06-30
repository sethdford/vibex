/**
 * Mini Progress Indicator Component
 * 
 * A compact progress indicator that can be displayed inline in different UI locations
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';
import { StatusIcon, StatusType } from './StatusIcon';

/**
 * Mini progress indicator props
 */
interface MiniProgressIndicatorProps {
  /**
   * Current progress value (0-100)
   */
  value?: number;
  
  /**
   * Whether this is an indeterminate progress
   */
  indeterminate?: boolean;
  
  /**
   * Status of the indicator
   */
  status?: StatusType;
  
  /**
   * Whether the indicator is active
   */
  active?: boolean;
  
  /**
   * Label text
   */
  label?: string;
  
  /**
   * Color of the indicator
   */
  color?: string;
  
  /**
   * Size of the indicator (small, medium, large)
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Whether to show the percentage
   */
  showPercentage?: boolean;
  
  /**
   * Whether to animate the indicator
   */
  animated?: boolean;
  
  /**
   * ARIA description for accessibility
   */
  ariaDescription?: string;
}

/**
 * Mini progress indicator component
 */
export const MiniProgressIndicator: React.FC<MiniProgressIndicatorProps> = ({
  value = 0,
  indeterminate = false,
  status = 'running',
  active = true,
  label,
  color,
  size = 'medium',
  showPercentage = false,
  animated = true,
  ariaDescription,
}) => {
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  
  // Animation frames for indeterminate state
  const spinnerFrames = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
  
  // Width for different sizes
  const widths = {
    small: 5,
    medium: 10,
    large: 15,
  };
  
  // Set spinner animation
  useEffect(() => {
    if (!animated || !indeterminate || !active) return;
    
    const interval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
    }, 80);
    
    return () => clearInterval(interval);
  }, [animated, indeterminate, active]);
  
  // Status color mapping
  const statusColors: Record<StatusType, string> = {
    running: color || Colors.AccentBlue,
    success: Colors.Success,
    error: Colors.Error,
    warning: Colors.Warning,
    info: Colors.Info,
    waiting: Colors.TextMuted,
    paused: Colors.TextDim,
  };
  
  // Determine the color to use
  const displayColor = statusColors[status];
  
  // Calculate filled width for determinate progress
  const width = widths[size];
  const filledWidth = indeterminate ? width : Math.round((value / 100) * width);
  
  // Generate mini progress indicator based on type
  const renderIndicator = () => {
    // If not active, show empty indicator
    if (!active) {
      return <Text color={Colors.TextDim}>◦◦◦</Text>;
    }
    
    // For indeterminate state with animation
    if (indeterminate) {
      if (animated) {
        return <Text color={displayColor}>{spinnerFrames[spinnerFrame]}</Text>;
      }
      return <Text color={displayColor}>⣶</Text>;
    }
    
    // For determinate state with very small width
    if (size === 'small') {
      const stages = ['○', '◔', '◑', '◕', '●'];
      const stageIndex = Math.min(4, Math.floor((value / 100) * stages.length));
      return <Text color={displayColor}>{stages[stageIndex]}</Text>;
    }
    
    // For determinate state with medium/large width
    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(width - filledWidth);
    
    return (
      <>
        <Text color={displayColor}>{filled}</Text>
        <Text color={Colors.TextDim}>{empty}</Text>
      </>
    );
  };
  
  return (
    <Box>
      {/* Status indicator */}
      <Box marginRight={label ? 1 : 0}>
        {renderIndicator()}
      </Box>
      
      {/* Label */}
      {label && (
        <Box marginRight={showPercentage ? 1 : 0}>
          <Text>{label}</Text>
        </Box>
      )}
      
      {/* Percentage */}
      {showPercentage && !indeterminate && (
        <Text dimColor>{Math.round(value)}%</Text>
      )}
      
      {/* Hidden text for screen readers */}
      <Text aria-live="polite" aria-hidden={!ariaDescription}>
        {ariaDescription || 
         (indeterminate 
          ? `${label || 'Operation'} in progress` 
          : `${label || 'Progress'}: ${Math.round(value)}%`)}
      </Text>
    </Box>
  );
};