/**
 * Update Notification Component
 * 
 * Displays a notification when updates are available.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';

/**
 * Update notification props
 */
interface UpdateNotificationProps {
  /**
   * Update notification message
   */
  message: string;
}

/**
 * Update notification component
 */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  message,
}) => {
  if (!message) {
    return null;
  }

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Info}
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      <Text color={Colors.Info}>
        {message}
      </Text>
    </Box>
  );
};