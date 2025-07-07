/**
 * Collaboration Interface Component
 * 
 * Main component for collaboration features, including shared editing,
 * comments, and participant management.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { useInput } from 'ink';
import { useCollaboration } from './useCollaboration.js';
import { 
  CollaborationInterfaceProps,
  CollaborationTab,
  CollaborationMode,
  Participant,
  SharedFile,
  Comment,
  UserStatus
} from './types.js';
import { ParticipantList } from './ParticipantList.js';
import { CommentList } from './CommentList.js';
import { SharedFileList } from './SharedFileList.js';
import { SharedFileViewer } from './SharedFileViewer.js';
import { NotificationList } from './NotificationList.js';
import { SessionInfo } from './SessionInfo.js';
import { SessionCreationModal } from './SessionCreationModal.js';

/**
 * Collaboration Interface Component
 */
export const CollaborationInterface: React.FC<CollaborationInterfaceProps> = ({
  width,
  height,
  activeSession,
  currentUserId,
  isFocused = true,
  onExit,
  onFocusChange,
  onSessionCreate,
  onSessionJoin,
  onSessionLeave,
  onCommentAdd,
  onCommentResolve,
  onFileShare,
  onFileEdit,
  onPermissionUpdate
}) => {
  // Get collaboration state and actions
  const collaboration = useCollaboration(currentUserId);
  
  // Local state
  const [activeTab, setActiveTab] = useState<CollaborationTab>(CollaborationTab.FILES);
  
  // Set initial active session if provided
  useEffect(() => {
    if (activeSession && !collaboration.session) {
      collaboration.joinSession(activeSession.id);
    }
  }, [activeSession, collaboration]);
  
  // Sidebar width calculation
  const sidebarWidth = Math.min(Math.floor(width * 0.25), 30);
  const mainContentWidth = width - sidebarWidth - 2; // 2 for border and spacing
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Exit the interface
    if (key.escape) {
      if (onExit) onExit();
      return;
    }
    
    // Tab navigation
    if (key.tab) {
      // Cycle through tabs
      setActiveTab(prev => {
        const tabs = Object.values(CollaborationTab);
        const currentIndex = tabs.indexOf(prev);
        const nextIndex = (currentIndex + 1) % tabs.length;
        return tabs[nextIndex];
      });
      return;
    }
    
    // Numeric shortcuts for tabs
    if (input === '1') {
      setActiveTab(CollaborationTab.FILES);
      return;
    }
    if (input === '2') {
      setActiveTab(CollaborationTab.COMMENTS);
      return;
    }
    if (input === '3') {
      setActiveTab(CollaborationTab.PARTICIPANTS);
      return;
    }
    if (input === '4') {
      setActiveTab(CollaborationTab.NOTIFICATIONS);
      return;
    }
    if (input === '5') {
      setActiveTab(CollaborationTab.SESSION);
      return;
    }
    
    // Update status
    if (input === 'o' && collaboration.currentParticipant) {
      collaboration.updateParticipantStatus(UserStatus.ONLINE);
      return;
    }
    if (input === 'a' && collaboration.currentParticipant) {
      collaboration.updateParticipantStatus(UserStatus.AWAY);
      return;
    }
    if (input === 'b' && collaboration.currentParticipant) {
      collaboration.updateParticipantStatus(UserStatus.BUSY);
      return;
    }
  }, { isActive: isFocused });
  
  // Handle file selection
  const handleFileSelect = useCallback((file: SharedFile) => {
    collaboration.selectFile(file.id);
  }, [collaboration]);
  
  // Handle comment selection
  const handleCommentSelect = useCallback((comment: Comment) => {
    collaboration.selectComment(comment.id);
  }, [collaboration]);
  
  // Handle participant selection
  const handleParticipantSelect = useCallback((participant: Participant) => {
    // In a real implementation, this might show a participant profile or focus on their work
    console.log(`Selected participant: ${participant.name}`);
  }, []);
  
  // Handle comment add
  const handleCommentAdd = useCallback((fileId: string, commentData: Partial<Comment>) => {
    const comment = collaboration.addComment(fileId, commentData);
    
    if (onCommentAdd && comment) {
      onCommentAdd(fileId, comment);
    }
  }, [collaboration, onCommentAdd]);
  
  // Handle comment resolve
  const handleCommentResolve = useCallback((commentId: string) => {
    collaboration.resolveComment(commentId);
    
    if (onCommentResolve) {
      onCommentResolve(commentId);
    }
  }, [collaboration, onCommentResolve]);
  
  // Handle file share
  const handleFileShare = useCallback((fileData: Partial<SharedFile>) => {
    const file = collaboration.addFile(fileData);
    
    if (onFileShare && file) {
      onFileShare(file);
    }
  }, [collaboration, onFileShare]);
  
  // Handle file edit
  const handleFileEdit = useCallback((fileId: string, content: string) => {
    collaboration.updateFile(fileId, content);
    
    if (onFileEdit) {
      onFileEdit(fileId, content);
    }
  }, [collaboration, onFileEdit]);
  
  // Handle session leave
  const handleSessionLeave = useCallback(() => {
    collaboration.leaveSession();
    
    if (onSessionLeave) {
      onSessionLeave(collaboration.session?.id || '');
    }
  }, [collaboration, onSessionLeave]);
  
  // Handle session create
  const handleSessionCreate = useCallback(async (sessionData) => {
    const session = collaboration.createSession(sessionData);
    
    if (onSessionCreate) {
      try {
        await onSessionCreate(sessionData);
      } catch (error) {
        console.error('Error creating session:', error);
      }
    }
  }, [collaboration, onSessionCreate]);
  
  // Render loading state
  if (!collaboration.session && collaboration.connecting) {
    return (
      <Box
        width={width}
        height={height}
        alignItems="center"
        justifyContent="center"
        borderStyle="single"
        borderColor={Colors.Border}
      >
        <Text color={Colors.Primary}>Connecting to collaboration session...</Text>
      </Box>
    );
  }
  
  // Render error state
  if (collaboration.error) {
    return (
      <Box
        width={width}
        height={height}
        alignItems="center"
        justifyContent="center"
        borderStyle="single"
        borderColor={Colors.Error}
      >
        <Box flexDirection="column" alignItems="center">
          <Text color={Colors.Error}>Error: {collaboration.error}</Text>
          <Box marginTop={1}>
            <Text
              color={Colors.Primary}
              backgroundColor={Colors.BackgroundAlt}
              paddingX={2}
              onClick={onExit}
            >
              Exit
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }
  
  // Render session creation mode
  if (collaboration.mode === CollaborationMode.SESSION_CREATE) {
    return (
      <Box
        width={width}
        height={height}
        borderStyle="single"
        borderColor={isFocused ? Colors.Primary : Colors.Border}
      >
        <SessionCreationModal
          width={width - 2}
          isFocused={isFocused}
          onSessionCreate={handleSessionCreate}
          onCancel={onExit}
        />
      </Box>
    );
  }
  
  // If no session, render placeholder state
  if (!collaboration.session) {
    return (
      <Box
        width={width}
        height={height}
        alignItems="center"
        justifyContent="center"
        borderStyle="single"
        borderColor={isFocused ? Colors.Primary : Colors.Border}
      >
        <Box flexDirection="column" alignItems="center">
          <Text bold color={Colors.Primary}>
            No Active Collaboration Session
          </Text>
          <Box marginTop={2}>
            <Text color={Colors.TextDim}>
              To create or join a collaboration session:
            </Text>
          </Box>
          <Box marginTop={1} flexDirection="column" alignItems="center">
            <Text>
              <Text color={Colors.AccentBlue}>1.</Text> Create a new session{' '}
              <Text color={Colors.TextDim}>(type '1')</Text>
            </Text>
            <Text>
              <Text color={Colors.AccentBlue}>2.</Text> Join an existing session{' '}
              <Text color={Colors.TextDim}>(type '2')</Text>
            </Text>
            <Text>
              <Text color={Colors.AccentBlue}>3.</Text> Exit{' '}
              <Text color={Colors.TextDim}>(type 'Esc')</Text>
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }
  
  // Main rendering with active session
  return (
    <Box
      width={width}
      height={height}
      borderStyle="single"
      borderColor={isFocused ? Colors.Primary : Colors.Border}
    >
      {/* Header */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        height={1}
        backgroundColor={Colors.BackgroundAlt}
      >
        <Text bold color={Colors.Primary}>
          {collaboration.session.name}
        </Text>
        {collaboration.session.description && (
          <>
            <Text color={Colors.TextDim}> - </Text>
            <Text>{collaboration.session.description}</Text>
          </>
        )}
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            {collaboration.session.participants.length} participants
          </Text>
          <Text color={Colors.TextDim}> | </Text>
          <Text color={Colors.TextDim}>
            {collaboration.session.files.length} files
          </Text>
          <Text color={Colors.TextDim}> | </Text>
          <Text color={
            collaboration.currentParticipant?.status === UserStatus.ONLINE ? Colors.Success :
            collaboration.currentParticipant?.status === UserStatus.AWAY ? Colors.Warning :
            collaboration.currentParticipant?.status === UserStatus.BUSY ? Colors.Error :
            Colors.TextDim
          }>
            {collaboration.currentParticipant?.status || 'Unknown'}
          </Text>
        </Box>
      </Box>
      
      <Box marginTop={1}>
        {/* Sidebar */}
        <Box
          width={sidebarWidth}
          height={height - 4} // Account for header and footer
          borderStyle="single"
          borderColor={Colors.Border}
          flexDirection="column"
        >
          {/* Tab navigation */}
          <Box
            height={1}
            backgroundColor={Colors.BackgroundAlt}
            justifyContent="space-between"
          >
            <Text
              backgroundColor={activeTab === CollaborationTab.FILES ? Colors.Primary : undefined}
              color={activeTab === CollaborationTab.FILES ? Colors.Background : Colors.TextDim}
              paddingX={1}
              onClick={() => setActiveTab(CollaborationTab.FILES)}
            >
              Files
            </Text>
            <Text
              backgroundColor={activeTab === CollaborationTab.COMMENTS ? Colors.Primary : undefined}
              color={activeTab === CollaborationTab.COMMENTS ? Colors.Background : Colors.TextDim}
              paddingX={1}
              onClick={() => setActiveTab(CollaborationTab.COMMENTS)}
            >
              Comments
            </Text>
            <Text
              backgroundColor={activeTab === CollaborationTab.PARTICIPANTS ? Colors.Primary : undefined}
              color={activeTab === CollaborationTab.PARTICIPANTS ? Colors.Background : Colors.TextDim}
              paddingX={1}
              onClick={() => setActiveTab(CollaborationTab.PARTICIPANTS)}
            >
              Users
            </Text>
          </Box>
          
          {/* Tab content */}
          <Box flexGrow={1} flexDirection="column">
            {activeTab === CollaborationTab.FILES && (
              <SharedFileList
                files={collaboration.session.files}
                currentUserId={currentUserId}
                width={sidebarWidth - 2}
                isFocused={isFocused && activeTab === CollaborationTab.FILES}
                onFileSelect={handleFileSelect}
                onFileShare={handleFileShare}
              />
            )}
            
            {activeTab === CollaborationTab.COMMENTS && (
              <CommentList
                comments={collaboration.allComments}
                participants={collaboration.session.participants}
                currentUserId={currentUserId}
                width={sidebarWidth - 2}
                height={height - 8} // Account for header, footer, tab navigation
                isFocused={isFocused && activeTab === CollaborationTab.COMMENTS}
                onCommentSelect={handleCommentSelect}
                onCommentResolve={handleCommentResolve}
              />
            )}
            
            {activeTab === CollaborationTab.PARTICIPANTS && (
              <ParticipantList
                participants={collaboration.session.participants}
                currentUserId={currentUserId}
                width={sidebarWidth - 2}
                isFocused={isFocused && activeTab === CollaborationTab.PARTICIPANTS}
                onParticipantSelect={handleParticipantSelect}
              />
            )}
            
            {activeTab === CollaborationTab.NOTIFICATIONS && (
              <NotificationList
                notifications={[]} // In a real implementation, this would come from the collaboration state
                participants={collaboration.session.participants}
                width={sidebarWidth - 2}
                isFocused={isFocused && activeTab === CollaborationTab.NOTIFICATIONS}
              />
            )}
            
            {activeTab === CollaborationTab.SESSION && (
              <SessionInfo
                session={collaboration.session}
                currentUserId={currentUserId}
                width={sidebarWidth - 2}
                isFocused={isFocused && activeTab === CollaborationTab.SESSION}
                onSessionLeave={handleSessionLeave}
              />
            )}
          </Box>
          
          {/* Bottom tab navigation */}
          <Box
            height={1}
            backgroundColor={Colors.BackgroundAlt}
            justifyContent="space-between"
          >
            <Text
              backgroundColor={activeTab === CollaborationTab.NOTIFICATIONS ? Colors.Primary : undefined}
              color={activeTab === CollaborationTab.NOTIFICATIONS ? Colors.Background : Colors.TextDim}
              paddingX={1}
              onClick={() => setActiveTab(CollaborationTab.NOTIFICATIONS)}
            >
              Notif
            </Text>
            <Text
              backgroundColor={activeTab === CollaborationTab.SESSION ? Colors.Primary : undefined}
              color={activeTab === CollaborationTab.SESSION ? Colors.Background : Colors.TextDim}
              paddingX={1}
              onClick={() => setActiveTab(CollaborationTab.SESSION)}
            >
              Session
            </Text>
          </Box>
        </Box>
        
        {/* Main content */}
        <Box
          width={mainContentWidth}
          height={height - 4} // Account for header and footer
          marginLeft={1}
          flexDirection="column"
        >
          {/* File viewer */}
          {collaboration.mode === CollaborationMode.FILE_VIEW && collaboration.selectedFile && (
            <SharedFileViewer
              file={collaboration.selectedFile}
              comments={(collaboration.selectedFile.comments || [])}
              participants={collaboration.session.participants}
              currentUserId={currentUserId}
              allowEditing={
                collaboration.session.settings.allowEditing &&
                (collaboration.selectedFile.editors?.includes(currentUserId) || false)
              }
              width={mainContentWidth}
              height={height - 4}
              isFocused={isFocused && activeTab !== CollaborationTab.FILES}
              onFileEdit={handleFileEdit}
              onCommentAdd={(comment) => 
                handleCommentAdd(collaboration.selectedFile?.id || '', comment)
              }
            />
          )}
          
          {/* Welcome/empty state when no file is selected */}
          {(!collaboration.selectedFile || collaboration.mode !== CollaborationMode.FILE_VIEW) && (
            <Box
              width={mainContentWidth}
              height={height - 4}
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              borderStyle="single"
              borderColor={Colors.Border}
            >
              <Text bold color={Colors.Primary}>
                Welcome to {collaboration.session.name}
              </Text>
              
              <Box marginTop={2}>
                <Text color={Colors.TextDim}>
                  Select a file from the sidebar to begin collaborating
                </Text>
              </Box>
              
              <Box marginTop={2} flexDirection="column" alignItems="center">
                <Text color={Colors.AccentBlue}>Keyboard Shortcuts:</Text>
                <Text>
                  <Text color={Colors.AccentBlue}>Tab</Text> - Switch tabs
                </Text>
                <Text>
                  <Text color={Colors.AccentBlue}>1-5</Text> - Quick tab selection
                </Text>
                <Text>
                  <Text color={Colors.AccentBlue}>O/A/B</Text> - Set status (Online/Away/Busy)
                </Text>
                <Text>
                  <Text color={Colors.AccentBlue}>Esc</Text> - Exit collaboration mode
                </Text>
              </Box>
              
              {collaboration.session.files.length === 0 && (
                <Box marginTop={2}>
                  <Text
                    backgroundColor={Colors.Primary}
                    color={Colors.Background}
                    paddingX={2}
                    paddingY={0}
                    onClick={() => setActiveTab(CollaborationTab.FILES)}
                  >
                    Share a File
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Footer */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        height={1}
        backgroundColor={Colors.BackgroundAlt}
      >
        <Text color={Colors.TextDim}>
          <Text color={Colors.AccentBlue}>Tab</Text> - Switch tabs |{' '}
          <Text color={Colors.AccentBlue}>O/A/B</Text> - Set status |{' '}
          <Text color={Colors.AccentBlue}>Esc</Text> - Exit
        </Text>
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            {new Date(collaboration.session.lastActivity).toLocaleString()}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default CollaborationInterface;