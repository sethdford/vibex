/**
 * NotificationList Component
 * 
 * Displays notifications related to collaboration activity.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { CollaborationNotification, NotificationType } from './collaboration-types';

interface NotificationListProps {
  notifications: CollaborationNotification[];
  width: number;
  onClearNotifications: () => void;
}

/**
 * Format timestamp to readable format
 */
const formatTimestamp = (date: Date): string => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Get notification icon based on type
 */
const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.JOIN:
      return '→';
    case NotificationType.LEAVE:
      return '←';
    case NotificationType.EDIT:
      return '✎';
    case NotificationType.COMMENT:
      return '💬';
    case NotificationType.SYSTEM:
      return '!';
    case NotificationType.INVITATION:
      return '✉';
    default:
      return '•';
  }
};

/**
 * Get notification color based on type
 */
const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.JOIN:
      return 'green';
    case NotificationType.LEAVE:
      return 'yellow';
    case NotificationType.EDIT:
      return 'blue';
    case NotificationType.COMMENT:
      return 'cyan';
    case NotificationType.SYSTEM:
      return 'red';
    case NotificationType.INVITATION:
      return 'magenta';
    default:
      return 'white';
  }
};

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  width,
  onClearNotifications
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray">
      <Box paddingX={1} backgroundColor="blue">
        <Text bold>Notifications</Text>
        {unreadCount > 0 && (
          <Text bold color="yellow"> ({unreadCount} unread)</Text>
        )}
      </Box>
      
      <Box flexDirection="column" paddingX={1}>
        {notifications.length === 0 ? (
          <Text dimColor>No notifications</Text>
        ) : (
          notifications.map(notification => {
            const icon = getNotificationIcon(notification.type);
            const color = getNotificationColor(notification.type);
            
            return (
              <Box key={notification.id} marginY={0}>
                <Box marginRight={1}>
                  <Text color={color}>{icon}</Text>
                </Box>
                <Box flexGrow={1} flexDirection="column">
                  <Box>
                    <Text color={!notification.isRead ? 'white' : undefined} bold={!notification.isRead}>
                      {notification.message}
                    </Text>
                    <Text dimColor> at {formatTimestamp(notification.timestamp)}</Text>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
      
      {notifications.length > 0 && (
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>Press C to clear all notifications</Text>
        </Box>
      )}
    </Box>
  );
};

export default NotificationList;