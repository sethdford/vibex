/**
 * Status Indicator Component
 * 
 * Visual indicator for tool execution status with optional animation.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ToolExecutionStatus } from './EnhancedToolMessage.js';

/**
 * Status indicator props
 */
export interface StatusIndicatorProps {
  /**
   * Current execution status
   */
  status: ToolExecutionStatus;
  
  /**
   * Whether to animate the indicator
   */
  animate?: boolean;
  
  /**
   * Animation interval in ms
   */
  animationInterval?: number;
  
  /**
   * Optional right margin
   */
  marginRight?: number;
}

/**
 * Status indicator mapping
 */
const statusSymbols = {
  [ToolExecutionStatus.PENDING]: '○',
  [ToolExecutionStatus.RUNNING]: '●',
  [ToolExecutionStatus.SUCCESS]: '✓',
  [ToolExecutionStatus.ERROR]: '✗',
  [ToolExecutionStatus.CANCELED]: '⊘',
  [ToolExecutionStatus.WARNING]: '⚠',
};

/**
 * Animation frames for running state
 */
const runningAnimationFrames = ['◐', '◓', '◑', '◒'];

/**
 * Status indicator component
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  animate = false,
  animationInterval = 200,
  marginRight = 0,
}) => {
  // Animation state
  const [animationFrame, setAnimationFrame] = useState(0);
  
  // Status color
  const statusColor = React.useMemo(() => {
    switch (status) {
      case ToolExecutionStatus.PENDING:
        return Colors.TextDim;
      case ToolExecutionStatus.RUNNING:
        return Colors.Info;
      case ToolExecutionStatus.SUCCESS:
        return Colors.Success;
      case ToolExecutionStatus.ERROR:
        return Colors.Error;
      case ToolExecutionStatus.CANCELED:
        return Colors.TextMuted;
      case ToolExecutionStatus.WARNING:
        return Colors.Warning;
      default:
        return Colors.TextDim;
    }
  }, [status]);
  
  // Animation effect
  useEffect(() => {
    if (!animate) return;
    
    const intervalId = setInterval(() => {
      setAnimationFrame(frame => (frame + 1) % runningAnimationFrames.length);
    }, animationInterval);
    
    return () => clearInterval(intervalId);
  }, [animate, animationInterval]);
  
  // Determine display symbol
  const symbol = React.useMemo(() => {
    if (status === ToolExecutionStatus.RUNNING && animate) {
      return runningAnimationFrames[animationFrame];
    }
    
    return statusSymbols[status] || '?';
  }, [status, animate, animationFrame]);
  
  return (
    <Box marginRight={marginRight}>
      <Text color={statusColor} bold>
        {symbol}
      </Text>
    </Box>
  );
};

export default StatusIndicator;