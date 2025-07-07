/**
 * ParticipantList Component
 * 
 * Displays a list of participants in a collaboration session with their status.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { 
  CollaborationParticipant, 
  ParticipantStatus
} from './collaboration-types';

interface ParticipantListProps {
  participants: CollaborationParticipant[];
  currentUserId?: string;
  width: number;
  onSelectParticipant?: (participant: CollaborationParticipant) => void;
}

/**
 * Get status indicator for participant
 */
const getStatusIndicator = (status: ParticipantStatus): { symbol: string, color: string } => {
  switch (status) {
    case ParticipantStatus.ONLINE:
      return { symbol: '●', color: 'green' };
    case ParticipantStatus.AWAY:
      return { symbol: '○', color: 'yellow' };
    case ParticipantStatus.BUSY:
      return { symbol: '●', color: 'red' };
    case ParticipantStatus.OFFLINE:
      return { symbol: '○', color: 'gray' };
    default:
      return { symbol: '○', color: 'gray' };
  }
};

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  width,
  onSelectParticipant
}) => {
  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray">
      <Box paddingX={1} backgroundColor="blue">
        <Text bold>Participants ({participants.length})</Text>
      </Box>
      
      <Box flexDirection="column" paddingX={1}>
        {participants.length === 0 ? (
          <Text dimColor>No participants</Text>
        ) : (
          participants.map(participant => {
            const status = getStatusIndicator(participant.status);
            const isCurrent = participant.id === currentUserId;
            
            return (
              <Box key={participant.id} marginY={0}>
                <Text color={status.color}>{status.symbol} </Text>
                <Text color={participant.color} bold={isCurrent}>
                  {participant.name}
                  {isCurrent ? ' (You)' : ''}
                  {participant.permissions.isOwner ? ' (Owner)' : ''}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default ParticipantList;