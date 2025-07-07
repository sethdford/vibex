/**
 * CollaborationInterface Component
 * 
 * Main component for the collaboration interface that enables real-time 
 * collaboration features in the terminal environment.
 */

import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import useCollaboration from './useCollaboration';
import { CollaborationAction } from './collaboration-types';

// Sub-components
import ParticipantList from './ParticipantList';
import CommentList from './CommentList';
import SharedFileList from './SharedFileList';
import NotificationList from './NotificationList';
import SessionInfo from './SessionInfo';
import SessionCreationModal from './SessionCreationModal';
import SharedFileViewer from './SharedFileViewer';
import SessionList from './SessionList';

interface CollaborationInterfaceProps {
  terminalWidth: number;
  terminalHeight: number;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export const CollaborationInterface: React.FC<CollaborationInterfaceProps> = ({
  terminalWidth,
  terminalHeight,
  theme
}) => {
  // Get collaboration state and actions from hook
  const { state, dispatch, selectFile, toggleSessionCreationModal } = useCollaboration();
  
  // Calculate layout dimensions
  const mainAreaWidth = Math.floor(terminalWidth * 0.9);
  const mainAreaHeight = terminalHeight - 4; // Account for borders and status bar
  
  const leftPanelWidth = Math.floor(mainAreaWidth * 0.25);
  const rightPanelWidth = Math.floor(mainAreaWidth * 0.25);
  const centerPanelWidth = mainAreaWidth - leftPanelWidth - rightPanelWidth;
  
  // Handle keyboard input
  useInput((input, key) => {
    if (state.isSessionCreationModalOpen) {
      // Input is handled by the modal component
      return;
    }
    
    // Handle global shortcuts
    if (key.escape) {
      if (state.activeSession) {
        dispatch({ type: CollaborationAction.LEAVE_SESSION });
      }
      return;
    }
    
    // Handle session selection shortcuts
    if (!state.activeSession) {
      // Session list view
      if (input === 'n') {
        toggleSessionCreationModal();
        return;
      }
      
      const sessionIndex = parseInt(input) - 1;
      if (!isNaN(sessionIndex) && sessionIndex >= 0 && sessionIndex < state.availableSessions.length) {
        const sessionId = state.availableSessions[sessionIndex].id;
        dispatch({ 
          type: CollaborationAction.JOIN_SESSION, 
          payload: { sessionId } 
        });
        return;
      }
    } else {
      // Active session view
      if (input === 'c') {
        dispatch({ type: CollaborationAction.CLEAR_NOTIFICATIONS });
        return;
      }
      
      if (input === 'i') {
        // Invite user (would show modal in a real implementation)
        return;
      }
      
      if (input === 'e') {
        // End session
        dispatch({ type: CollaborationAction.LEAVE_SESSION });
        return;
      }
      
      // Handle file selection
      if (state.activeSession.sharedFiles.length > 0) {
        const fileIndex = parseInt(input) - 1;
        if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < state.activeSession.sharedFiles.length) {
          const fileId = state.activeSession.sharedFiles[fileIndex].id;
          selectFile(fileId);
          return;
        }
      }
    }
  });
  
  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight - 4}>
      {/* Header */}
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>👥 Collaboration Interface</Text>
        <Text color={theme.text} dimColor> • Real-time editing • Shared context • Team workflows</Text>
      </Box>
      
      {/* Main content */}
      {state.isSessionCreationModalOpen ? (
        // Show session creation modal
        <Box justifyContent="center" alignItems="center" height={mainAreaHeight}>
          <SessionCreationModal
            width={Math.floor(mainAreaWidth * 0.6)}
            onCancel={toggleSessionCreationModal}
            onCreateSession={(name, description) => {
              dispatch({
                type: CollaborationAction.CREATE_SESSION,
                payload: { name, description }
              });
            }}
          />
        </Box>
      ) : !state.activeSession ? (
        // Show session list when no active session
        <Box justifyContent="center" alignItems="center" height={mainAreaHeight}>
          <SessionList 
            sessions={state.availableSessions} 
            width={Math.floor(mainAreaWidth * 0.6)}
            onJoinSession={(sessionId) => {
              dispatch({ 
                type: CollaborationAction.JOIN_SESSION, 
                payload: { sessionId } 
              });
            }}
            onCreateSession={toggleSessionCreationModal}
          />
        </Box>
      ) : (
        // Show collaboration interface when session is active
        <Box height={mainAreaHeight}>
          {/* Left panel */}
          <Box flexDirection="column" width={leftPanelWidth} height={mainAreaHeight}>
            <Box flexDirection="column" height={Math.floor(mainAreaHeight * 0.4)}>
              <ParticipantList
                participants={state.activeSession.participants}
                currentUserId={state.currentUser?.id}
                width={leftPanelWidth}
              />
            </Box>
            
            <Box flexDirection="column" height={Math.floor(mainAreaHeight * 0.6)}>
              <SharedFileList
                files={state.activeSession.sharedFiles}
                width={leftPanelWidth}
                selectedFileId={state.selectedFile?.id}
                onSelectFile={selectFile}
              />
            </Box>
          </Box>
          
          {/* Center panel */}
          <Box flexDirection="column" width={centerPanelWidth} height={mainAreaHeight}>
            {state.isConnecting ? (
              <Box justifyContent="center" alignItems="center" height="100%">
                <Text color={theme.accent}>Connecting to session...</Text>
              </Box>
            ) : state.connectionError ? (
              <Box justifyContent="center" alignItems="center" height="100%">
                <Text color="red">Error: {state.connectionError}</Text>
              </Box>
            ) : state.selectedFile ? (
              <SharedFileViewer
                file={state.selectedFile}
                width={centerPanelWidth}
                height={mainAreaHeight}
                currentUserId={state.currentUser?.id}
                canEdit={state.selectedFile.editableBy.includes(state.currentUser?.id || '')}
                comments={state.activeComments}
                onAddComment={(content, target) => {
                  dispatch({
                    type: CollaborationAction.ADD_COMMENT,
                    payload: { content, target }
                  });
                }}
              />
            ) : (
              <Box justifyContent="center" alignItems="center" height="100%">
                <Text dimColor>Select a file to view its contents</Text>
              </Box>
            )}
          </Box>
          
          {/* Right panel */}
          <Box flexDirection="column" width={rightPanelWidth} height={mainAreaHeight}>
            <Box flexDirection="column" height={Math.floor(mainAreaHeight * 0.3)}>
              <SessionInfo
                session={state.activeSession}
                width={rightPanelWidth}
                onEndSession={() => {
                  dispatch({ type: CollaborationAction.LEAVE_SESSION });
                }}
              />
            </Box>
            
            <Box flexDirection="column" height={Math.floor(mainAreaHeight * 0.35)}>
              <NotificationList
                notifications={state.notifications}
                width={rightPanelWidth}
                onClearNotifications={() => {
                  dispatch({ type: CollaborationAction.CLEAR_NOTIFICATIONS });
                }}
              />
            </Box>
            
            <Box flexDirection="column" height={Math.floor(mainAreaHeight * 0.35)}>
              <CommentList
                comments={state.activeComments}
                width={rightPanelWidth}
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CollaborationInterface;