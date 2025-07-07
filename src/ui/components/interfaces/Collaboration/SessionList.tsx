/**
 * SessionList Component
 * 
 * Displays a list of available collaboration sessions.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { CollaborationSession } from './collaboration-types';

interface SessionListProps {
  sessions: CollaborationSession[];
  width: number;
  onJoinSession: (sessionId: string) => void;
  onCreateSession: () => void;
}

/**
 * Format creation date to readable format
 */
const formatCreationDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  }
};

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  width,
  onJoinSession,
  onCreateSession
}) => {
  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray">
      <Box paddingX={1} backgroundColor="blue">
        <Text bold>Available Sessions ({sessions.length})</Text>
      </Box>
      
      <Box flexDirection="column" paddingX={1}>
        {sessions.length === 0 ? (
          <Box flexDirection="column" alignItems="center" paddingY={1}>
            <Text dimColor>No active sessions found</Text>
            <Box marginTop={1}>
              <Text backgroundColor="green" color="black" paddingX={2}>
                Press N to create a new session
              </Text>
            </Box>
          </Box>
        ) : (
          <>
            {sessions.map((session, index) => (
              <Box key={session.id} flexDirection="column" marginY={1}>
                <Box>
                  <Text color="green" bold>{index + 1}. </Text>
                  <Text bold>{session.name}</Text>
                  {!session.isActive && <Text color="red"> (Inactive)</Text>}
                </Box>
                
                <Box paddingLeft={3}>
                  <Text dimColor>
                    {session.participants.length} participant{session.participants.length !== 1 ? 's' : ''} • 
                    Created {formatCreationDate(session.createdAt)}
                  </Text>
                </Box>
                
                {session.description && (
                  <Box paddingLeft={3}>
                    <Text>{session.description}</Text>
                  </Box>
                )}
              </Box>
            ))}
            
            <Box marginY={1}>
              <Text dimColor>Press 1-{sessions.length} to join a session • Press N to create a new session</Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default SessionList;