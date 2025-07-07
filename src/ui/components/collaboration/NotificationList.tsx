/**
 * Notification List Component
 * 
 * Displays a list of notifications related to the collaboration session.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  NotificationListProps, 
  Notification, 
  NotificationType, 
  Participant 
} from './types.js';

/**
 * Format time ago
 */
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Get notification color based on type
 */
const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.USER_JOIN:
    case NotificationType.USER_LEAVE:
      return Colors.AccentPurple;
    case NotificationType.COMMENT_ADDED:
    case NotificationType.COMMENT_RESOLVED:
      return Colors.AccentBlue;
    case NotificationType.FILE_ADDED:
    case NotificationType.FILE_CHANGED:
      return Colors.AccentGreen;
    case NotificationType.PERMISSION_CHANGED:
    case NotificationType.SESSION_UPDATE:
      return Colors.Warning;
    case NotificationType.GENERAL:
    default:
      return Colors.Primary;
  }
};

/**
 * Get notification icon based on type
 */
const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.USER_JOIN:
      return '→';
    case NotificationType.USER_LEAVE:
      return '←';
    case NotificationType.COMMENT_ADDED:
      return '💬';
    case NotificationType.COMMENT_RESOLVED:
      return '✓';
    case NotificationType.FILE_ADDED:
      return '📄';
    case NotificationType.FILE_CHANGED:
      return '📝';
    case NotificationType.PERMISSION_CHANGED:
      return '🔒';
    case NotificationType.SESSION_UPDATE:
      return '🔄';
    case NotificationType.GENERAL:
    default:
      return 'ℹ';
  }
};

/**
 * Notification List Component
 */
export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  participants,
  width,
  isFocused = true,
  onNotificationSelect,
  onNotificationRead
}) => {
  // State for selected notification index
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Map of participants by ID for quick lookup
  const participantsMap = React.useMemo(() => {
    return participants.reduce<Record<string, Participant>>((map, participant) => {
      map[participant.id] = participant;
      return map;
    }, {});
  }, [participants]);
  
  // Sort notifications by date (newest first)
  const sortedNotifications = React.useMemo(() => {
    return [...notifications].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [notifications]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Navigate notifications
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      return;
    }
    
    if (key.downArrow) {
      setSelectedIndex(prev => 
        (prev < sortedNotifications.length - 1 ? prev + 1 : prev)
      );
      return;
    }
    
    // Mark notification as read
    if (input === 'r' && onNotificationRead && sortedNotifications.length > 0) {
      const notification = sortedNotifications[selectedIndex];
      onNotificationRead(notification.id);
      return;
    }
    
    // Select notification
    if (key.return && onNotificationSelect && sortedNotifications.length > 0) {
      const notification = sortedNotifications[selectedIndex];
      onNotificationSelect(notification);
      return;
    }
  }, { isActive: isFocused });
  
  /**
   * Render notification content
   */
  const renderNotificationContent = (notification: Notification) => {
    const actor = notification.userId ? participantsMap[notification.userId] : undefined;
    
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={getNotificationColor(notification.type)}>
            {getNotificationIcon(notification.type)}
          </Text>
          <Text marginLeft={1} bold={!notification.read}>
            {notification.message}
          </Text>
        </Box>
        
        <Box marginLeft={2} marginTop={1}>
          {actor && (
            <Text color={actor.color || Colors.Text} marginRight={1}>
              {actor.name}
            </Text>
          )}
          <Text color={Colors.TextDim}>
            {formatTimeAgo(notification.createdAt)}
          </Text>
        </Box>
        
        {notification.entityId && notification.entityType && (
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              {notification.entityType}: {notification.entityId}
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Empty notifications mock
  const emptyNotifications: Notification[] = [
    {
      id: 'mock-1',
      type: NotificationType.USER_JOIN,
      message: 'John Doe joined the session',
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      userId: 'user-1',
      entityId: 'session-1',
      entityType: 'session',
      read: true
    },
    {
      id: 'mock-2',
      type: NotificationType.FILE_ADDED,
      message: 'api.js was added to the session',
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      userId: 'user-1',
      entityId: 'file-1',
      entityType: 'file',
      read: false
    },
    {
      id: 'mock-3',
      type: NotificationType.COMMENT_ADDED,
      message: 'Jane Smith added a comment',
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      userId: 'user-2',
      entityId: 'comment-1',
      entityType: 'comment',
      read: false
    }
  ];
  
  // Use mock notifications if none provided
  const displayNotifications = sortedNotifications.length > 0 
    ? sortedNotifications 
    : emptyNotifications;
  
  return (
    <Box flexDirection="column" width={width} padding={1}>
      <Text bold color={Colors.Primary}>
        Notifications ({notifications.length})
      </Text>
      
      <Box flexDirection="column" marginTop={1}>
        {displayNotifications.map((notification, index) => (
          <Box
            key={notification.id}
            flexDirection="column"
            paddingX={1}
            paddingY={1}
            backgroundColor={index === selectedIndex ? Colors.DimBackground : undefined}
            borderStyle="single"
            borderColor={index === selectedIndex ? Colors.Primary : Colors.Border}
            marginBottom={1}
          >
            {renderNotificationContent(notification)}
            
            {index === selectedIndex && (
              <Box marginTop={1}>
                {onNotificationRead && !notification.read && (
                  <Text
                    color={Colors.Background}
                    backgroundColor={Colors.Primary}
                    paddingX={1}
                    marginRight={1}
                  >
                    Mark as Read (R)
                  </Text>
                )}
                
                {onNotificationSelect && (
                  <Text
                    color={Colors.Background}
                    backgroundColor={Colors.AccentBlue}
                    paddingX={1}
                  >
                    Open (Enter)
                  </Text>
                )}
              </Box>
            )}
          </Box>
        ))}
        
        {notifications.length === 0 && sortedNotifications.length === 0 && (
          <Box
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height={10}
            borderStyle="single"
            borderColor={Colors.Border}
            padding={1}
          >
            <Text color={Colors.TextDim}>
              Showing example notifications
            </Text>
            <Text color={Colors.TextDim} marginTop={1}>
              (No actual notifications available)
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NotificationList;