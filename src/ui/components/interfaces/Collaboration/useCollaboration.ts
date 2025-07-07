/**
 * Collaboration Hook
 * 
 * Manages state and actions for the Collaboration Interface.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  CollaborationSession,
  CollaborationParticipant,
  CollaborationComment,
  SharedFile,
  CollaborationNotification,
  NotificationType,
  ParticipantStatus,
  CollaborationInterfaceState,
  CollaborationAction
} from './collaboration-types';

// Mock session for demonstration
const MOCK_SESSION: CollaborationSession = {
  id: 'session-1',
  name: 'Project Discussion',
  description: 'Collaboration session for project planning',
  participants: [
    {
      id: 'user-1',
      name: 'Current User',
      color: '#4caf50',
      status: ParticipantStatus.ONLINE,
      permissions: {
        canEdit: true,
        canComment: true,
        canInvite: true,
        canManageSession: true,
        isOwner: true
      },
      lastActive: new Date()
    },
    {
      id: 'user-2',
      name: 'Team Member',
      color: '#2196f3',
      status: ParticipantStatus.ONLINE,
      cursor: { x: 10, y: 5 },
      permissions: {
        canEdit: true,
        canComment: true,
        canInvite: false,
        canManageSession: false,
        isOwner: false
      },
      lastActive: new Date()
    }
  ],
  sharedFiles: [
    {
      id: 'file-1',
      name: 'README.md',
      path: '/README.md',
      content: '# Project\n\nThis is a collaborative project...',
      lastModified: new Date(),
      modifiedBy: 'user-1',
      comments: [],
      viewerCount: 2,
      editableBy: ['user-1', 'user-2']
    }
  ],
  comments: [
    {
      id: 'comment-1',
      author: 'Team Member',
      authorId: 'user-2',
      content: 'Let\'s discuss this section further',
      timestamp: new Date(),
      target: {
        fileId: 'file-1',
        lineNumber: 3
      },
      reactions: [
        {
          emoji: '👍',
          count: 1,
          users: ['user-1']
        }
      ]
    }
  ],
  createdAt: new Date(),
  createdBy: 'user-1',
  isActive: true,
  settings: {
    allowAnonymous: false,
    allowPublicAccess: false,
    defaultPermissions: {
      canEdit: false,
      canComment: true,
      canInvite: false,
      canManageSession: false,
      isOwner: false
    },
    autoSaveInterval: 30,
    persistHistory: true,
    maxParticipants: 10
  }
};

// Mock notifications
const MOCK_NOTIFICATIONS: CollaborationNotification[] = [
  {
    id: 'notif-1',
    type: NotificationType.JOIN,
    message: 'Team Member joined the session',
    timestamp: new Date(),
    senderId: 'user-2',
    senderName: 'Team Member',
    isRead: false
  },
  {
    id: 'notif-2',
    type: NotificationType.COMMENT,
    message: 'Team Member commented on README.md',
    timestamp: new Date(),
    senderId: 'user-2',
    senderName: 'Team Member',
    isRead: false
  }
];

/**
 * Hook for managing collaboration state
 */
export function useCollaboration() {
  // Initial state with mock data for demo purposes
  const [state, setState] = useState<CollaborationInterfaceState>({
    availableSessions: [MOCK_SESSION],
    isConnecting: false,
    notifications: MOCK_NOTIFICATIONS,
    unreadNotificationCount: MOCK_NOTIFICATIONS.length,
    activeComments: MOCK_SESSION.comments,
    isSessionCreationModalOpen: false
  });

  // Effect to simulate connecting to session
  useEffect(() => {
    // This would be replaced with actual connection logic in production
  }, []);

  /**
   * Dispatch an action to update collaboration state
   */
  const dispatch = useCallback((action: { type: CollaborationAction, payload?: any }) => {
    switch (action.type) {
      case CollaborationAction.JOIN_SESSION:
        setState(prev => ({
          ...prev,
          isConnecting: true,
          connectionError: undefined
        }));
        
        // Simulate joining a session
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            activeSession: action.payload.sessionId === MOCK_SESSION.id 
              ? MOCK_SESSION 
              : undefined,
            currentUser: MOCK_SESSION.participants.find(p => p.id === 'user-1'),
            isConnecting: false
          }));
        }, 1000);
        break;
        
      case CollaborationAction.LEAVE_SESSION:
        setState(prev => ({
          ...prev,
          activeSession: undefined,
          currentUser: undefined,
          selectedFile: undefined,
          activeComments: []
        }));
        break;
        
      case CollaborationAction.CREATE_SESSION:
        const newSession: CollaborationSession = {
          id: `session-${Date.now()}`,
          name: action.payload.name,
          description: action.payload.description,
          participants: [{
            id: 'user-1',
            name: 'Current User',
            color: '#4caf50',
            status: ParticipantStatus.ONLINE,
            permissions: {
              canEdit: true,
              canComment: true,
              canInvite: true,
              canManageSession: true,
              isOwner: true
            },
            lastActive: new Date()
          }],
          sharedFiles: [],
          comments: [],
          createdAt: new Date(),
          createdBy: 'user-1',
          isActive: true,
          settings: {
            allowAnonymous: false,
            allowPublicAccess: false,
            defaultPermissions: {
              canEdit: false,
              canComment: true,
              canInvite: false,
              canManageSession: false,
              isOwner: false
            },
            autoSaveInterval: 30,
            persistHistory: true,
            maxParticipants: 10
          }
        };
        
        setState(prev => ({
          ...prev,
          availableSessions: [...prev.availableSessions, newSession],
          activeSession: newSession,
          currentUser: newSession.participants[0],
          isSessionCreationModalOpen: false
        }));
        break;
        
      case CollaborationAction.ADD_COMMENT:
        if (!state.activeSession) return;
        
        const newComment: CollaborationComment = {
          id: `comment-${Date.now()}`,
          author: state.currentUser?.name || 'Unknown',
          authorId: state.currentUser?.id || 'unknown',
          content: action.payload.content,
          timestamp: new Date(),
          target: action.payload.target
        };
        
        setState(prev => {
          if (!prev.activeSession) return prev;
          
          return {
            ...prev,
            activeSession: {
              ...prev.activeSession,
              comments: [...prev.activeSession.comments, newComment]
            },
            activeComments: [...prev.activeComments, newComment]
          };
        });
        break;
        
      case CollaborationAction.SHARE_FILE:
        if (!state.activeSession) return;
        
        const newFile: SharedFile = {
          id: `file-${Date.now()}`,
          name: action.payload.name,
          path: action.payload.path,
          content: action.payload.content,
          lastModified: new Date(),
          modifiedBy: state.currentUser?.id || 'unknown',
          comments: [],
          viewerCount: 1,
          editableBy: [state.currentUser?.id || 'unknown']
        };
        
        setState(prev => {
          if (!prev.activeSession) return prev;
          
          return {
            ...prev,
            activeSession: {
              ...prev.activeSession,
              sharedFiles: [...prev.activeSession.sharedFiles, newFile]
            }
          };
        });
        break;
        
      case CollaborationAction.UPDATE_USER_STATUS:
        setState(prev => {
          if (!prev.currentUser) return prev;
          
          return {
            ...prev,
            currentUser: {
              ...prev.currentUser,
              status: action.payload.status
            }
          };
        });
        break;
        
      case CollaborationAction.CLEAR_NOTIFICATIONS:
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
          unreadNotificationCount: 0
        }));
        break;
        
      default:
        // Unhandled action
        console.warn(`Unhandled collaboration action: ${action.type}`);
    }
  }, [state.activeSession, state.currentUser]);

  // Select a file in the collaboration session
  const selectFile = useCallback((fileId: string) => {
    if (!state.activeSession) return;
    
    const file = state.activeSession.sharedFiles.find(f => f.id === fileId);
    if (!file) return;
    
    const fileComments = state.activeSession.comments.filter(
      c => c.target?.fileId === fileId
    );
    
    setState(prev => ({
      ...prev,
      selectedFile: file,
      activeComments: fileComments
    }));
  }, [state.activeSession]);

  // Toggle session creation modal
  const toggleSessionCreationModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSessionCreationModalOpen: !prev.isSessionCreationModalOpen
    }));
  }, []);

  return {
    state,
    dispatch,
    selectFile,
    toggleSessionCreationModal
  };
}

export default useCollaboration;