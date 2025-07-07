/**
 * Collaboration Interface Example
 * 
 * Example implementation of the Collaboration Interface component
 * with mock data and functionality.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { CollaborationInterface } from './index.js';
import { CollaborationSession, SharedFile, Comment } from './types.js';

/**
 * Collaboration Interface Example props
 */
interface CollaborationInterfaceExampleProps {
  /**
   * Width of the component
   */
  width?: number;
  
  /**
   * Height of the component
   */
  height?: number;
  
  /**
   * ID of the current user
   */
  currentUserId?: string;
}

/**
 * Collaboration Interface Example component
 */
export const CollaborationInterfaceExample: React.FC<CollaborationInterfaceExampleProps> = ({
  width = 100,
  height = 40,
  currentUserId = 'user-1'
}) => {
  // State for active session
  const [activeSession, setActiveSession] = useState<CollaborationSession | undefined>(undefined);
  
  // Handle session create
  const handleSessionCreate = async (sessionData: Partial<CollaborationSession>) => {
    console.log('Creating session:', sessionData);
    // In a real implementation, this would make an API call
    // For now, we just simulate a successful creation
    return {} as CollaborationSession;
  };
  
  // Handle session join
  const handleSessionJoin = async (sessionId: string, password?: string) => {
    console.log('Joining session:', sessionId, password);
    // In a real implementation, this would make an API call
    // For now, we just simulate a successful join
    return {} as CollaborationSession;
  };
  
  // Handle session leave
  const handleSessionLeave = async (sessionId: string) => {
    console.log('Leaving session:', sessionId);
    setActiveSession(undefined);
  };
  
  // Handle file share
  const handleFileShare = async (fileData: Partial<SharedFile>) => {
    console.log('Sharing file:', fileData);
    // In a real implementation, this would make an API call
    return {} as SharedFile;
  };
  
  // Handle file edit
  const handleFileEdit = async (fileId: string, content: string) => {
    console.log('Editing file:', fileId, content.length);
    // In a real implementation, this would make an API call
    return {} as SharedFile;
  };
  
  // Handle comment add
  const handleCommentAdd = async (fileId: string, commentData: Partial<Comment>) => {
    console.log('Adding comment:', fileId, commentData);
    // In a real implementation, this would make an API call
    return {} as Comment;
  };
  
  // Handle comment resolve
  const handleCommentResolve = async (commentId: string) => {
    console.log('Resolving comment:', commentId);
    // In a real implementation, this would make an API call
  };
  
  return (
    <Box flexDirection="column">
      <Box
        paddingX={1}
        paddingY={0}
        borderStyle="single"
        borderColor={Colors.Border}
        backgroundColor={Colors.BackgroundAlt}
        marginBottom={1}
      >
        <Text bold color={Colors.Primary}>Collaboration Interface Example</Text>
      </Box>
      
      <CollaborationInterface
        width={width}
        height={height - 2}
        activeSession={activeSession}
        currentUserId={currentUserId}
        onSessionCreate={handleSessionCreate}
        onSessionJoin={handleSessionJoin}
        onSessionLeave={handleSessionLeave}
        onFileShare={handleFileShare}
        onFileEdit={handleFileEdit}
        onCommentAdd={handleCommentAdd}
        onCommentResolve={handleCommentResolve}
      />
    </Box>
  );
};

export default CollaborationInterfaceExample;