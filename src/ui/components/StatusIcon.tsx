/**
 * Status Icon Component
 * 
 * Displays status icons for different states (running, success, error, warning)
 */

import React from 'react';
import { Text, Box } from 'ink';
import { Colors } from '../colors.js';

/**
 * Status types
 */
export type StatusType = 'running' | 'success' | 'completed' | 'error' | 'failed' | 'warning' | 'info' | 'waiting' | 'paused';

/**
 * Status icon props
 */
export interface StatusIconProps {
  /**
   * Status type
   */
  status: StatusType;
  
  /**
   * Whether to animate the icon
   */
  animated?: boolean;
  
  /**
   * Custom color override
   */
  color?: string;
  
  /**
   * ARIA label for accessibility
   */
  ariaLabel?: string;
}

/**
 * Status icon mapping
 */
const icons: Record<StatusType, { icon: string; color: string; label: string }> = {
  running: { icon: '⏳', color: Colors.AccentBlue, label: 'Running' },
  success: { icon: '✓', color: Colors.Success, label: 'Success' },
  completed: { icon: '✓', color: Colors.Success, label: 'Completed' },
  error: { icon: '✗', color: Colors.Error, label: 'Error' },
  failed: { icon: '✗', color: Colors.Error, label: 'Failed' },
  warning: { icon: '⚠', color: Colors.Warning, label: 'Warning' },
  info: { icon: 'ℹ', color: Colors.Info, label: 'Information' },
  waiting: { icon: '…', color: Colors.TextMuted, label: 'Waiting' },
  paused: { icon: '⏸', color: Colors.TextDim, label: 'Paused' }
};

/**
 * Spinner frames for animated icons
 */
const spinnerFrames = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

/**
 * Status icon component
 */
export const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  animated = false,
  color,
  ariaLabel,
}) => {
  const [frame, setFrame] = React.useState(0);
  
  // Use animation for running status
  React.useEffect(() => {
    if (animated && status === 'running') {
      const interval = setInterval(() => {
        setFrame(prev => (prev + 1) % spinnerFrames.length);
      }, 80);
      
      return () => clearInterval(interval);
    }
  }, [animated, status]);
  
  // Get icon configuration
  const iconConfig = icons[status];
  
  // Determine displayed icon
  let displayIcon = iconConfig.icon;
  if (animated && status === 'running') {
    displayIcon = spinnerFrames[frame];
  }
  
  // Determine color
  const displayColor = color || iconConfig.color;
  
  // Accessibility label
  const accessibilityLabel = ariaLabel || iconConfig.label;
  
  return (
    <Box>
      <Text
        color={displayColor}
        aria-label={accessibilityLabel}
      >
        {displayIcon}
      </Text>
    </Box>
  );
};