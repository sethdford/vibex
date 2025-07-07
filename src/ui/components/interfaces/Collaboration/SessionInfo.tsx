/**
 * SessionInfo Component
 * 
 * Displays information about the current collaboration session.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { CollaborationSession } from './collaboration-types';

interface SessionInfoProps {
  session: CollaborationSession;
  width: number;
  onEndSession?: () => void;
  onInviteUser?: () => void;
}

/**
 * Format creation date to readable format
 */
const formatCreationDate = (date: Date): string => {
  return `${date.toLocaleDateString()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const SessionInfo: React.FC<SessionInfoProps> = ({
  session,
  width,
  onEndSession,
  onInviteUser
}) => {
  // Calculate session duration
  const sessionDuration = Math.floor((new Date().getTime() - session.createdAt.getTime()) / 60000); // in minutes
  
  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray">
      <Box paddingX={1} backgroundColor="blue">
        <Text bold>Session Info</Text>
      </Box>
      
      <Box flexDirection="column" paddingX={1}>
        <Box marginY={0}>
          <Text bold color="green">Name: </Text>
          <Text>{session.name}</Text>
        </Box>
        
        {session.description && (
          <Box marginY={0}>
            <Text bold color="green">Description: </Text>
            <Text>{session.description}</Text>
          </Box>
        )}
        
        <Box marginY={0}>
          <Text bold color="green">Created: </Text>
          <Text>{formatCreationDate(session.createdAt)}</Text>
        </Box>
        
        <Box marginY={0}>
          <Text bold color="green">Duration: </Text>
          <Text>
            {sessionDuration < 60 
              ? `${sessionDuration} minutes` 
              : `${Math.floor(sessionDuration / 60)}h ${sessionDuration % 60}m`}
          </Text>
        </Box>
        
        <Box marginY={0}>
          <Text bold color="green">Participants: </Text>
          <Text>{session.participants.length}</Text>
        </Box>
        
        <Box marginY={0}>
          <Text bold color="green">Files Shared: </Text>
          <Text>{session.sharedFiles.length}</Text>
        </Box>
        
        <Box marginY={0}>
          <Text bold color="green">Comments: </Text>
          <Text>{session.comments.length}</Text>
        </Box>
      </Box>
      
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>Press I to invite user • Press E to end session</Text>
      </Box>
    </Box>
  );
};

export default SessionInfo;