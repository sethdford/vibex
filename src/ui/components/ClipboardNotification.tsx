/**
 * Clipboard Notification Component
 * 
 * Shows temporary notifications for clipboard operations
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'info';

/**
 * Clipboard notification props
 */
interface ClipboardNotificationProps {
  /**
   * Message to display
   */
  message: string;
  
  /**
   * Notification type
   */
  type?: NotificationType;
  
  /**
   * Duration in milliseconds to show the notification
   */
  duration?: number;
  
  /**
   * Callback when notification disappears
   */
  onDismiss?: () => void;
}

/**
 * Clipboard notification component
 */
export const ClipboardNotification: React.FC<ClipboardNotificationProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState<boolean>(true);
  
  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);
  
  if (!visible) return null;
  
  // Determine text color based on type
  let color = Colors.Success;
  switch (type) {
    case 'error':
      color = Colors.Error;
      break;
    case 'info':
      color = Colors.Info;
      break;
    case 'success':
    default:
      color = Colors.Success;
      break;
  }
  
  return (
    <Box
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      paddingY={0}
    >
      <Text color={color}>{message}</Text>
    </Box>
  );
};