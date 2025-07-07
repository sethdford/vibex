/**
 * Participant List Component
 * 
 * Displays a list of participants in the collaboration session
 * with status indicators and role information.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { ParticipantListProps, UserStatus, UserRole } from './types.js';

/**
 * Get color for user status
 */
const getStatusColor = (status: UserStatus): string => {
  switch (status) {
    case UserStatus.ONLINE:
      return Colors.Success;
    case UserStatus.AWAY:
      return Colors.Warning;
    case UserStatus.BUSY:
      return Colors.Error;
    case UserStatus.OFFLINE:
    default:
      return Colors.TextDim;
  }
};

/**
 * Get icon for user status
 */
const getStatusIcon = (status: UserStatus): string => {
  switch (status) {
    case UserStatus.ONLINE:
      return '●';
    case UserStatus.AWAY:
      return '◐';
    case UserStatus.BUSY:
      return '○';
    case UserStatus.OFFLINE:
    default:
      return '○';
  }
};

/**
 * Get label for user role
 */
const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case UserRole.OWNER:
      return 'Owner';
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.EDITOR:
      return 'Editor';
    case UserRole.COMMENTER:
      return 'Commenter';
    case UserRole.VIEWER:
    default:
      return 'Viewer';
  }
};

/**
 * Get role color
 */
const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case UserRole.OWNER:
      return Colors.AccentPurple;
    case UserRole.ADMIN:
      return Colors.AccentRed;
    case UserRole.EDITOR:
      return Colors.AccentBlue;
    case UserRole.COMMENTER:
      return Colors.AccentGreen;
    case UserRole.VIEWER:
    default:
      return Colors.TextDim;
  }
};

/**
 * Format time ago
 */
const formatTimeAgo = (date: Date | undefined): string => {
  if (!date) return 'Never';
  
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Participant List Component
 */
export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  width,
  isFocused = true,
  onParticipantSelect
}) => {
  // State for selected participant index
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      return;
    }
    
    if (key.downArrow) {
      setSelectedIndex(prev => 
        (prev < participants.length - 1 ? prev + 1 : prev)
      );
      return;
    }
    
    if (key.return && onParticipantSelect) {
      onParticipantSelect(participants[selectedIndex]);
      return;
    }
  }, { isActive: isFocused });
  
  // Sort participants: current user first, then online, away, busy, offline
  const sortedParticipants = [...participants].sort((a, b) => {
    // Current user always first
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    
    // Then by status
    const statusOrder = {
      [UserStatus.ONLINE]: 0,
      [UserStatus.AWAY]: 1,
      [UserStatus.BUSY]: 2,
      [UserStatus.OFFLINE]: 3
    };
    
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by role
    const roleOrder = {
      [UserRole.OWNER]: 0,
      [UserRole.ADMIN]: 1,
      [UserRole.EDITOR]: 2,
      [UserRole.COMMENTER]: 3,
      [UserRole.VIEWER]: 4
    };
    
    const roleDiff = roleOrder[a.role] - roleOrder[b.role];
    if (roleDiff !== 0) return roleDiff;
    
    // Then by name
    return a.name.localeCompare(b.name);
  });
  
  return (
    <Box flexDirection="column" width={width} padding={1}>
      <Text bold color={Colors.Primary}>Participants ({participants.length})</Text>
      
      <Box flexDirection="column" marginTop={1}>
        {sortedParticipants.map((participant, index) => {
          const isSelected = index === selectedIndex;
          const isCurrentUser = participant.id === currentUserId;
          const statusColor = getStatusColor(participant.status);
          const roleColor = getRoleColor(participant.role);
          
          return (
            <Box 
              key={participant.id} 
              flexDirection="column"
              paddingX={1}
              paddingY={0}
              backgroundColor={isSelected ? Colors.DimBackground : undefined}
              borderStyle={isSelected ? "single" : undefined}
              borderColor={isSelected ? Colors.Border : undefined}
              marginBottom={1}
            >
              <Box>
                <Text color={statusColor}>{getStatusIcon(participant.status)}</Text>
                <Text 
                  color={participant.color || Colors.Text} 
                  bold={isCurrentUser}
                  backgroundColor={isCurrentUser ? Colors.DimBackground : undefined}
                  paddingX={isCurrentUser ? 1 : 0}
                  marginLeft={1}
                >
                  {participant.name}
                  {isCurrentUser && ' (You)'}
                </Text>
                
                <Box flexGrow={1} justifyContent="flex-end">
                  <Text color={roleColor}>
                    {getRoleLabel(participant.role)}
                  </Text>
                </Box>
              </Box>
              
              {isSelected && (
                <Box flexDirection="column" marginTop={1} marginLeft={2}>
                  {participant.lastActive && (
                    <Box>
                      <Text color={Colors.TextDim}>Last active: </Text>
                      <Text>{formatTimeAgo(participant.lastActive)}</Text>
                    </Box>
                  )}
                  
                  <Box>
                    <Text color={Colors.TextDim}>Permissions: </Text>
                    <Text>
                      {Object.entries(participant.permissions)
                        .map(([key, value]) => `${key}:${value}`)
                        .join(', ')}
                    </Text>
                  </Box>
                  
                  {participant.focus && (
                    <Box>
                      <Text color={Colors.TextDim}>Focus: </Text>
                      <Text>{participant.focus.type} {participant.focus.id}</Text>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
        
        {participants.length === 0 && (
          <Box>
            <Text color={Colors.TextDim}>No participants</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ParticipantList;