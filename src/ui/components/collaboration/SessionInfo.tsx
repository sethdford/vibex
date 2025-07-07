/**
 * Session Info Component
 * 
 * Displays information about the current collaboration session
 * and provides session management functionality.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  SessionInfoProps, 
  SessionAccess, 
  UserRole 
} from './types.js';

/**
 * Format date
 */
const formatDate = (date: Date): string => {
  return date.toLocaleString();
};

/**
 * Get access level label
 */
const getAccessLabel = (access: SessionAccess): string => {
  switch (access) {
    case SessionAccess.PUBLIC:
      return 'Public';
    case SessionAccess.TEAM:
      return 'Team';
    case SessionAccess.RESTRICTED:
      return 'Restricted';
    case SessionAccess.PRIVATE:
      return 'Private';
    default:
      return 'Unknown';
  }
};

/**
 * Get access level color
 */
const getAccessColor = (access: SessionAccess): string => {
  switch (access) {
    case SessionAccess.PUBLIC:
      return Colors.AccentGreen;
    case SessionAccess.TEAM:
      return Colors.AccentBlue;
    case SessionAccess.RESTRICTED:
      return Colors.Warning;
    case SessionAccess.PRIVATE:
      return Colors.AccentRed;
    default:
      return Colors.TextDim;
  }
};

/**
 * Session Info Component
 */
export const SessionInfo: React.FC<SessionInfoProps> = ({
  session,
  currentUserId,
  width,
  isFocused = true,
  onSettingsUpdate,
  onSessionLeave
}) => {
  // Get current user role
  const currentUserRole = React.useMemo(() => {
    const participant = session.participants.find(p => p.id === currentUserId);
    return participant?.role || UserRole.VIEWER;
  }, [session.participants, currentUserId]);
  
  // Check if user is owner or admin
  const canManageSettings = currentUserRole === UserRole.OWNER || currentUserRole === UserRole.ADMIN;
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Leave session
    if (input === 'l' && onSessionLeave) {
      onSessionLeave();
      return;
    }
  }, { isActive: isFocused });
  
  // Toggling settings
  const handleToggleSetting = (setting: keyof typeof session.settings) => {
    if (!canManageSettings || !onSettingsUpdate) return;
    
    onSettingsUpdate({
      [setting]: !session.settings[setting]
    });
  };
  
  return (
    <Box flexDirection="column" width={width} padding={1}>
      <Text bold color={Colors.Primary}>
        Session Information
      </Text>
      
      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1} flexDirection="column">
          <Text bold>{session.name}</Text>
          {session.description && <Text>{session.description}</Text>}
        </Box>
        
        <Box marginBottom={1} flexDirection="column">
          <Box>
            <Text color={Colors.TextDim}>Owner: </Text>
            <Text>
              {session.participants.find(p => p.id === session.ownerId)?.name || 'Unknown'}
            </Text>
          </Box>
          
          <Box>
            <Text color={Colors.TextDim}>Created: </Text>
            <Text>{formatDate(session.createdAt)}</Text>
          </Box>
          
          <Box>
            <Text color={Colors.TextDim}>Last Activity: </Text>
            <Text>{formatDate(session.lastActivity)}</Text>
          </Box>
          
          <Box>
            <Text color={Colors.TextDim}>Access: </Text>
            <Text color={getAccessColor(session.access)}>
              {getAccessLabel(session.access)}
            </Text>
          </Box>
        </Box>
        
        {session.tags && session.tags.length > 0 && (
          <Box marginBottom={1} flexDirection="column">
            <Text color={Colors.TextDim}>Tags:</Text>
            <Box flexWrap="wrap" marginLeft={2} marginTop={1}>
              {session.tags.map(tag => (
                <Box 
                  key={tag} 
                  marginRight={1}
                  marginBottom={1}
                  backgroundColor={Colors.DimBackground}
                  paddingX={1}
                >
                  <Text>{tag}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        
        <Box marginTop={1} flexDirection="column">
          <Text bold color={Colors.Primary}>Settings</Text>
          
          <Box marginTop={1} flexDirection="column">
            <Box 
              flexDirection="column"
              borderStyle="single"
              borderColor={Colors.Border}
              padding={1}
            >
              <Box marginBottom={1}>
                <Text color={Colors.TextDim}>Allow File Uploads: </Text>
                <Text 
                  color={session.settings.allowFileUploads ? Colors.Success : Colors.Error}
                  bold
                  backgroundColor={canManageSettings ? Colors.DimBackground : undefined}
                  paddingX={canManageSettings ? 1 : 0}
                  onClick={() => handleToggleSetting('allowFileUploads')}
                >
                  {session.settings.allowFileUploads ? 'Yes' : 'No'}
                </Text>
              </Box>
              
              <Box marginBottom={1}>
                <Text color={Colors.TextDim}>Allow Comments: </Text>
                <Text 
                  color={session.settings.allowComments ? Colors.Success : Colors.Error}
                  bold
                  backgroundColor={canManageSettings ? Colors.DimBackground : undefined}
                  paddingX={canManageSettings ? 1 : 0}
                  onClick={() => handleToggleSetting('allowComments')}
                >
                  {session.settings.allowComments ? 'Yes' : 'No'}
                </Text>
              </Box>
              
              <Box marginBottom={1}>
                <Text color={Colors.TextDim}>Allow Editing: </Text>
                <Text 
                  color={session.settings.allowEditing ? Colors.Success : Colors.Error}
                  bold
                  backgroundColor={canManageSettings ? Colors.DimBackground : undefined}
                  paddingX={canManageSettings ? 1 : 0}
                  onClick={() => handleToggleSetting('allowEditing')}
                >
                  {session.settings.allowEditing ? 'Yes' : 'No'}
                </Text>
              </Box>
              
              <Box marginBottom={1}>
                <Text color={Colors.TextDim}>Save History: </Text>
                <Text 
                  color={session.settings.saveHistory ? Colors.Success : Colors.Error}
                  bold
                  backgroundColor={canManageSettings ? Colors.DimBackground : undefined}
                  paddingX={canManageSettings ? 1 : 0}
                  onClick={() => handleToggleSetting('saveHistory')}
                >
                  {session.settings.saveHistory ? 'Yes' : 'No'}
                </Text>
              </Box>
              
              <Box>
                <Text color={Colors.TextDim}>Encryption: </Text>
                <Text 
                  color={session.settings.encrypt ? Colors.Success : Colors.Error}
                  bold
                  backgroundColor={canManageSettings ? Colors.DimBackground : undefined}
                  paddingX={canManageSettings ? 1 : 0}
                  onClick={() => handleToggleSetting('encrypt')}
                >
                  {session.settings.encrypt ? 'Yes' : 'No'}
                </Text>
              </Box>
              
              {session.settings.maxFileSize && (
                <Box marginTop={1}>
                  <Text color={Colors.TextDim}>Max File Size: </Text>
                  <Text>
                    {Math.round(session.settings.maxFileSize / 1024 / 1024)} MB
                  </Text>
                </Box>
              )}
            </Box>
            
            {!canManageSettings && (
              <Box marginTop={1}>
                <Text color={Colors.TextDim}>
                  Only session owners and admins can change settings.
                </Text>
              </Box>
            )}
          </Box>
        </Box>
        
        <Box marginTop={2}>
          <Text
            backgroundColor={Colors.Error}
            color={Colors.Background}
            paddingX={1}
            onClick={onSessionLeave}
          >
            Leave Session (L)
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default SessionInfo;