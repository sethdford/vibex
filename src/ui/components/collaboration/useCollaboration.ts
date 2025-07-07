/**
 * Collaboration Hook
 * 
 * Custom hook for managing collaboration state and actions.
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import {
  CollaborationState,
  CollaborationAction,
  CollaborationActionType,
  CollaborationSession,
  Participant,
  SharedFile,
  Comment,
  Notification,
  CollaborationTab,
  CollaborationMode,
  PermissionLevel,
  UserRole,
  UserStatus,
  SessionAccess,
  NotificationType,
  CommentStatus
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initial state for collaboration
 */
const initialState: CollaborationState = {
  session: null,
  connecting: false,
  connected: false,
  error: null,
  availableSessions: [],
  selectedFileId: null,
  selectedCommentId: null,
  activeTab: CollaborationTab.FILES,
  focusedElement: null,
  mode: CollaborationMode.BROWSE
};

/**
 * Reducer for collaboration state
 */
const collaborationReducer = (state: CollaborationState, action: CollaborationAction): CollaborationState => {
  switch (action.type) {
    case CollaborationActionType.SET_SESSION:
      return {
        ...state,
        session: action.session,
        connected: true,
        connecting: false,
        error: null
      };
    
    case CollaborationActionType.JOIN_SESSION:
      return {
        ...state,
        session: action.session,
        connected: true,
        connecting: false,
        error: null,
        mode: CollaborationMode.BROWSE
      };
    
    case CollaborationActionType.LEAVE_SESSION:
      return {
        ...state,
        session: null,
        connected: false,
        connecting: false,
        error: null,
        selectedFileId: null,
        selectedCommentId: null,
        activeTab: CollaborationTab.FILES,
        mode: CollaborationMode.BROWSE
      };
    
    case CollaborationActionType.ADD_PARTICIPANT:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          participants: [...state.session.participants, action.participant]
        }
      };
    
    case CollaborationActionType.UPDATE_PARTICIPANT:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          participants: state.session.participants.map(participant =>
            participant.id === action.participantId
              ? { ...participant, ...action.updates }
              : participant
          )
        }
      };
    
    case CollaborationActionType.REMOVE_PARTICIPANT:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          participants: state.session.participants.filter(
            participant => participant.id !== action.participantId
          )
        }
      };
    
    case CollaborationActionType.ADD_FILE:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          files: [...state.session.files, action.file]
        }
      };
    
    case CollaborationActionType.UPDATE_FILE:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          files: state.session.files.map(file =>
            file.id === action.fileId ? { ...file, ...action.updates } : file
          )
        }
      };
    
    case CollaborationActionType.REMOVE_FILE:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          files: state.session.files.filter(file => file.id !== action.fileId)
        },
        selectedFileId: state.selectedFileId === action.fileId ? null : state.selectedFileId
      };
    
    case CollaborationActionType.ADD_COMMENT:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          files: state.session.files.map(file =>
            file.id === action.comment.fileId
              ? {
                  ...file,
                  comments: [...(file.comments || []), action.comment]
                }
              : file
          )
        }
      };
    
    case CollaborationActionType.UPDATE_COMMENT:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          files: state.session.files.map(file =>
            file.comments?.some(comment => comment.id === action.commentId)
              ? {
                  ...file,
                  comments: file.comments.map(comment =>
                    comment.id === action.commentId
                      ? { ...comment, ...action.updates }
                      : comment
                  )
                }
              : file
          )
        }
      };
    
    case CollaborationActionType.REMOVE_COMMENT:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          files: state.session.files.map(file =>
            file.comments?.some(comment => comment.id === action.commentId)
              ? {
                  ...file,
                  comments: file.comments.filter(
                    comment => comment.id !== action.commentId
                  )
                }
              : file
          )
        },
        selectedCommentId:
          state.selectedCommentId === action.commentId
            ? null
            : state.selectedCommentId
      };
    
    case CollaborationActionType.ADD_NOTIFICATION:
      return {
        ...state
        // In a real implementation, we would add the notification to a list
        // For this example, we're skipping notification storage
      };
    
    case CollaborationActionType.MARK_NOTIFICATION_READ:
      return {
        ...state
        // In a real implementation, we would mark the notification as read
        // For this example, we're skipping notification storage
      };
    
    case CollaborationActionType.REMOVE_NOTIFICATION:
      return {
        ...state
        // In a real implementation, we would remove the notification
        // For this example, we're skipping notification storage
      };
    
    case CollaborationActionType.UPDATE_SETTINGS:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          settings: {
            ...state.session.settings,
            ...action.settings
          }
        }
      };
    
    case CollaborationActionType.UPDATE_PERMISSIONS:
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          participants: state.session.participants.map(participant =>
            participant.id === action.userId
              ? {
                  ...participant,
                  permissions: {
                    ...participant.permissions,
                    [action.permission]: action.level
                  }
                }
              : participant
          )
        }
      };
    
    default:
      return state;
  }
};

/**
 * Mock data for demonstration
 */
const mockSessions = [
  {
    id: 'session-1',
    name: 'API Development Session',
    description: 'Collaborative session for API design and implementation',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    lastActivity: new Date(),
    ownerId: 'user-1',
    participants: [
      {
        id: 'user-1',
        name: 'John Doe',
        status: UserStatus.ONLINE,
        role: UserRole.OWNER,
        color: '#3498db',
        permissions: {
          files: PermissionLevel.ADMIN,
          comments: PermissionLevel.ADMIN,
          participants: PermissionLevel.ADMIN
        },
        lastActive: new Date()
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        status: UserStatus.ONLINE,
        role: UserRole.EDITOR,
        color: '#2ecc71',
        permissions: {
          files: PermissionLevel.EDIT,
          comments: PermissionLevel.EDIT,
          participants: PermissionLevel.READ
        },
        lastActive: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: 'user-3',
        name: 'Bob Johnson',
        status: UserStatus.AWAY,
        role: UserRole.COMMENTER,
        color: '#e74c3c',
        permissions: {
          files: PermissionLevel.READ,
          comments: PermissionLevel.COMMENT,
          participants: PermissionLevel.READ
        },
        lastActive: new Date(Date.now() - 15 * 60 * 1000)
      }
    ],
    files: [
      {
        id: 'file-1',
        name: 'api.js',
        path: '/src/api.js',
        type: 'javascript',
        size: 1024,
        content: `
/**
 * API client for the backend service
 */
const API_URL = 'https://api.example.com';

/**
 * Fetch data from the API
 * @param {string} endpoint - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} Response data
 */
async function fetchData(endpoint, options = {}) {
  const url = \`\${API_URL}/\${endpoint}\`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${getToken()}\`
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(\`API error: \${response.status}\`);
  }
  
  return response.json();
}

/**
 * Get authentication token
 * @returns {string} Authentication token
 */
function getToken() {
  return localStorage.getItem('auth_token');
}

/**
 * User API functions
 */
const userApi = {
  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<object>} User profile
   */
  getProfile(userId) {
    return fetchData(\`users/\${userId}\`);
  },
  
  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {object} data - Profile data
   * @returns {Promise<object>} Updated user profile
   */
  updateProfile(userId, data) {
    return fetchData(\`users/\${userId}\`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

export { fetchData, userApi };`,
        lastModified: new Date(Date.now() - 60 * 60 * 1000),
        ownerId: 'user-1',
        readOnly: false,
        comments: [
          {
            id: 'comment-1',
            userId: 'user-2',
            content: 'We should add error handling for network failures',
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
            fileId: 'file-1',
            line: 18,
            status: CommentStatus.OPEN,
            reactions: [
              {
                emoji: '👍',
                count: 2,
                users: ['user-1', 'user-3']
              }
            ]
          },
          {
            id: 'comment-2',
            userId: 'user-3',
            content: 'Should we add a timeout parameter?',
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
            fileId: 'file-1',
            line: 7,
            status: CommentStatus.OPEN
          }
        ],
        editors: ['user-1', 'user-2'],
        viewers: ['user-3']
      },
      {
        id: 'file-2',
        name: 'auth.js',
        path: '/src/auth.js',
        type: 'javascript',
        size: 768,
        content: `
/**
 * Authentication module
 */

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<object>} Auth result with token
 */
async function login(username, password) {
  const response = await fetch('https://api.example.com/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  if (!response.ok) {
    throw new Error(\`Login failed: \${response.status}\`);
  }
  
  const data = await response.json();
  localStorage.setItem('auth_token', data.token);
  return data;
}

/**
 * Logout user
 */
function logout() {
  localStorage.removeItem('auth_token');
}

/**
 * Check if user is logged in
 * @returns {boolean} Login status
 */
function isLoggedIn() {
  return !!localStorage.getItem('auth_token');
}

export { login, logout, isLoggedIn };`,
        lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000),
        ownerId: 'user-1',
        readOnly: false,
        comments: [
          {
            id: 'comment-3',
            userId: 'user-1',
            content: 'We need to add token refresh functionality',
            createdAt: new Date(Date.now() - 90 * 60 * 1000),
            fileId: 'file-2',
            line: 12,
            status: CommentStatus.RESOLVED,
            resolvedBy: 'user-2',
            resolvedAt: new Date(Date.now() - 45 * 60 * 1000)
          }
        ],
        editors: ['user-1', 'user-2'],
        viewers: ['user-3']
      }
    ],
    access: SessionAccess.TEAM,
    active: true,
    settings: {
      allowFileUploads: true,
      allowComments: true,
      allowEditing: true,
      maxFileSize: 1024 * 1024 * 5, // 5MB
      saveHistory: true,
      encrypt: false
    },
    tags: ['api', 'development', 'collaboration']
  },
  {
    id: 'session-2',
    name: 'UI Component Review',
    description: 'Review session for new UI components',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    lastActivity: new Date(Date.now() - 12 * 60 * 60 * 1000),
    ownerId: 'user-2',
    participants: [
      {
        id: 'user-2',
        name: 'Jane Smith',
        status: UserStatus.ONLINE,
        role: UserRole.OWNER,
        color: '#2ecc71',
        permissions: {
          files: PermissionLevel.ADMIN,
          comments: PermissionLevel.ADMIN,
          participants: PermissionLevel.ADMIN
        },
        lastActive: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        id: 'user-1',
        name: 'John Doe',
        status: UserStatus.OFFLINE,
        role: UserRole.COMMENTER,
        color: '#3498db',
        permissions: {
          files: PermissionLevel.READ,
          comments: PermissionLevel.COMMENT,
          participants: PermissionLevel.READ
        },
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ],
    files: [
      {
        id: 'file-3',
        name: 'Button.jsx',
        path: '/src/components/Button.jsx',
        type: 'jsx',
        size: 512,
        content: `import React from 'react';
import './Button.css';

/**
 * Button component
 * @param {object} props - Component props
 * @returns {JSX.Element} Button component
 */
function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick
}) {
  const className = \`button button--\${variant} button--\${size}\${disabled ? ' button--disabled' : ''}\`;
  
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

export default Button;`,
        lastModified: new Date(Date.now() - 36 * 60 * 60 * 1000),
        ownerId: 'user-2',
        readOnly: true,
        comments: [
          {
            id: 'comment-4',
            userId: 'user-1',
            content: 'Should we add aria-labels for accessibility?',
            createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
            fileId: 'file-3',
            line: 19,
            status: CommentStatus.OPEN
          }
        ],
        editors: ['user-2'],
        viewers: ['user-1']
      }
    ],
    access: SessionAccess.RESTRICTED,
    active: true,
    settings: {
      allowFileUploads: false,
      allowComments: true,
      allowEditing: false,
      saveHistory: true,
      encrypt: false
    },
    tags: ['ui', 'components', 'review']
  }
];

/**
 * Hook for collaboration state management
 */
export const useCollaboration = (currentUserId: string) => {
  // State management
  const [state, dispatch] = useReducer(collaborationReducer, initialState);
  
  // Initialize available sessions
  useEffect(() => {
    // In a real implementation, this would fetch sessions from an API
    const sessions = mockSessions;
    
    // Add the current user to the participants list
    const sessionsWithCurrentUser = sessions.map(session => {
      if (session.participants.some(p => p.id === currentUserId)) {
        return session;
      }
      
      return session;
    });
    
    // Update state
    dispatch({ 
      type: CollaborationActionType.SET_SESSION, 
      session: sessionsWithCurrentUser[0] 
    });
  }, [currentUserId]);
  
  // Computed values
  const currentParticipant = useMemo(() => {
    if (!state.session) return null;
    return state.session.participants.find(p => p.id === currentUserId) || null;
  }, [state.session, currentUserId]);
  
  const selectedFile = useMemo(() => {
    if (!state.session || !state.selectedFileId) return null;
    return state.session.files.find(f => f.id === state.selectedFileId) || null;
  }, [state.session, state.selectedFileId]);
  
  const allComments = useMemo(() => {
    if (!state.session) return [];
    
    return state.session.files.reduce<Comment[]>((all, file) => {
      return [...all, ...(file.comments || [])];
    }, []);
  }, [state.session]);
  
  const selectedComment = useMemo(() => {
    if (!state.selectedCommentId) return null;
    
    return allComments.find(c => c.id === state.selectedCommentId) || null;
  }, [allComments, state.selectedCommentId]);
  
  // Actions
  const joinSession = useCallback((sessionId: string, password?: string) => {
    // In a real implementation, this would make an API call to join the session
    const session = mockSessions.find(s => s.id === sessionId);
    
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }
    
    // Check if the session requires a password
    if (session.access === SessionAccess.RESTRICTED && session.password && session.password !== password) {
      console.error('Invalid password');
      return;
    }
    
    // Add the current user to the participants list if not already there
    if (!session.participants.some(p => p.id === currentUserId)) {
      session.participants.push({
        id: currentUserId,
        name: 'Current User',
        status: UserStatus.ONLINE,
        role: UserRole.VIEWER,
        color: '#9b59b6',
        permissions: {
          files: PermissionLevel.READ,
          comments: PermissionLevel.READ,
          participants: PermissionLevel.READ
        },
        lastActive: new Date(),
        isSelf: true
      });
    }
    
    // Update the participant to indicate it's the current user
    const updatedSession = {
      ...session,
      participants: session.participants.map(p => ({
        ...p,
        isSelf: p.id === currentUserId
      }))
    };
    
    dispatch({ type: CollaborationActionType.JOIN_SESSION, session: updatedSession as CollaborationSession });
  }, [currentUserId]);
  
  const leaveSession = useCallback(() => {
    dispatch({ type: CollaborationActionType.LEAVE_SESSION });
  }, []);
  
  const createSession = useCallback((sessionData: Partial<CollaborationSession>) => {
    // In a real implementation, this would make an API call to create the session
    const newSession: CollaborationSession = {
      id: uuidv4(),
      name: sessionData.name || 'New Session',
      description: sessionData.description || '',
      createdAt: new Date(),
      lastActivity: new Date(),
      ownerId: currentUserId,
      participants: [
        {
          id: currentUserId,
          name: 'Current User',
          status: UserStatus.ONLINE,
          role: UserRole.OWNER,
          color: '#9b59b6',
          permissions: {
            files: PermissionLevel.ADMIN,
            comments: PermissionLevel.ADMIN,
            participants: PermissionLevel.ADMIN
          },
          lastActive: new Date(),
          isSelf: true
        }
      ],
      files: [],
      access: sessionData.access || SessionAccess.PRIVATE,
      active: true,
      settings: {
        allowFileUploads: true,
        allowComments: true,
        allowEditing: true,
        maxFileSize: 1024 * 1024 * 5, // 5MB
        saveHistory: true,
        encrypt: false,
        ...sessionData.settings
      },
      tags: sessionData.tags || []
    };
    
    dispatch({ type: CollaborationActionType.JOIN_SESSION, session: newSession });
  }, [currentUserId]);
  
  const addComment = useCallback((fileId: string, commentData: Partial<Comment>) => {
    if (!state.session) return;
    
    const newComment: Comment = {
      id: uuidv4(),
      userId: currentUserId,
      content: commentData.content || '',
      createdAt: new Date(),
      fileId,
      line: commentData.line,
      column: commentData.column,
      threadId: commentData.threadId,
      parentId: commentData.parentId,
      status: CommentStatus.OPEN,
      reactions: []
    };
    
    dispatch({ type: CollaborationActionType.ADD_COMMENT, comment: newComment });
    
    // Create a notification
    const notification: Notification = {
      id: uuidv4(),
      type: NotificationType.COMMENT_ADDED,
      message: `${currentParticipant?.name || 'Someone'} added a comment`,
      createdAt: new Date(),
      userId: currentUserId,
      entityId: newComment.id,
      entityType: 'comment',
      read: false
    };
    
    dispatch({ type: CollaborationActionType.ADD_NOTIFICATION, notification });
    
    return newComment;
  }, [state.session, currentUserId, currentParticipant]);
  
  const resolveComment = useCallback((commentId: string) => {
    if (!state.session) return;
    
    dispatch({
      type: CollaborationActionType.UPDATE_COMMENT,
      commentId,
      updates: {
        status: CommentStatus.RESOLVED,
        resolvedBy: currentUserId,
        resolvedAt: new Date()
      }
    });
    
    // Create a notification
    const notification: Notification = {
      id: uuidv4(),
      type: NotificationType.COMMENT_RESOLVED,
      message: `${currentParticipant?.name || 'Someone'} resolved a comment`,
      createdAt: new Date(),
      userId: currentUserId,
      entityId: commentId,
      entityType: 'comment',
      read: false
    };
    
    dispatch({ type: CollaborationActionType.ADD_NOTIFICATION, notification });
  }, [state.session, currentUserId, currentParticipant]);
  
  const addReaction = useCallback((commentId: string, emoji: string) => {
    if (!state.session) return;
    
    // Find the comment
    let foundComment: Comment | null = null;
    let foundFile: SharedFile | null = null;
    
    for (const file of state.session.files) {
      const comment = file.comments?.find(c => c.id === commentId);
      if (comment) {
        foundComment = comment;
        foundFile = file;
        break;
      }
    }
    
    if (!foundComment || !foundFile) return;
    
    // Check if the user has already reacted with this emoji
    const existingReaction = foundComment.reactions?.find(r => 
      r.emoji === emoji && r.users.includes(currentUserId)
    );
    
    if (existingReaction) {
      // Remove the user's reaction
      const updatedReaction = {
        ...existingReaction,
        count: existingReaction.count - 1,
        users: existingReaction.users.filter(id => id !== currentUserId)
      };
      
      const updatedReactions = foundComment.reactions?.map(r => 
        r.emoji === emoji ? updatedReaction : r
      ).filter(r => r.count > 0);
      
      dispatch({
        type: CollaborationActionType.UPDATE_COMMENT,
        commentId,
        updates: {
          reactions: updatedReactions
        }
      });
    } else {
      // Add the user's reaction
      const existingEmojiReaction = foundComment.reactions?.find(r => r.emoji === emoji);
      
      let updatedReactions = foundComment.reactions || [];
      
      if (existingEmojiReaction) {
        // Update existing emoji reaction
        updatedReactions = updatedReactions.map(r => 
          r.emoji === emoji
            ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] }
            : r
        );
      } else {
        // Add new emoji reaction
        updatedReactions = [
          ...updatedReactions,
          {
            emoji,
            count: 1,
            users: [currentUserId]
          }
        ];
      }
      
      dispatch({
        type: CollaborationActionType.UPDATE_COMMENT,
        commentId,
        updates: {
          reactions: updatedReactions
        }
      });
    }
  }, [state.session, currentUserId]);
  
  const addFile = useCallback((fileData: Partial<SharedFile>) => {
    if (!state.session) return;
    
    const newFile: SharedFile = {
      id: uuidv4(),
      name: fileData.name || 'New File',
      path: fileData.path || `/files/${fileData.name || 'new-file'}`,
      type: fileData.type || 'text',
      size: fileData.size || 0,
      content: fileData.content || '',
      lastModified: new Date(),
      ownerId: currentUserId,
      readOnly: false,
      comments: [],
      editors: [currentUserId],
      viewers: state.session.participants.map(p => p.id)
    };
    
    dispatch({ type: CollaborationActionType.ADD_FILE, file: newFile });
    
    // Create a notification
    const notification: Notification = {
      id: uuidv4(),
      type: NotificationType.FILE_ADDED,
      message: `${currentParticipant?.name || 'Someone'} added a file: ${newFile.name}`,
      createdAt: new Date(),
      userId: currentUserId,
      entityId: newFile.id,
      entityType: 'file',
      read: false
    };
    
    dispatch({ type: CollaborationActionType.ADD_NOTIFICATION, notification });
    
    return newFile;
  }, [state.session, currentUserId, currentParticipant]);
  
  const updateFile = useCallback((fileId: string, content: string) => {
    if (!state.session) return;
    
    dispatch({
      type: CollaborationActionType.UPDATE_FILE,
      fileId,
      updates: {
        content,
        lastModified: new Date()
      }
    });
    
    // Create a notification
    const notification: Notification = {
      id: uuidv4(),
      type: NotificationType.FILE_CHANGED,
      message: `${currentParticipant?.name || 'Someone'} updated a file`,
      createdAt: new Date(),
      userId: currentUserId,
      entityId: fileId,
      entityType: 'file',
      read: false
    };
    
    dispatch({ type: CollaborationActionType.ADD_NOTIFICATION, notification });
  }, [state.session, currentUserId, currentParticipant]);
  
  const updateParticipantStatus = useCallback((status: UserStatus) => {
    if (!state.session || !currentParticipant) return;
    
    dispatch({
      type: CollaborationActionType.UPDATE_PARTICIPANT,
      participantId: currentUserId,
      updates: {
        status,
        lastActive: new Date()
      }
    });
  }, [state.session, currentUserId, currentParticipant]);
  
  const updatePermissions = useCallback((userId: string, permission: string, level: PermissionLevel) => {
    if (!state.session) return;
    
    dispatch({
      type: CollaborationActionType.UPDATE_PERMISSIONS,
      userId,
      permission,
      level
    });
    
    // Create a notification
    const notification: Notification = {
      id: uuidv4(),
      type: NotificationType.PERMISSION_CHANGED,
      message: `${currentParticipant?.name || 'Someone'} updated permissions`,
      createdAt: new Date(),
      userId: currentUserId,
      entityId: userId,
      entityType: 'user',
      read: false
    };
    
    dispatch({ type: CollaborationActionType.ADD_NOTIFICATION, notification });
  }, [state.session, currentUserId, currentParticipant]);
  
  const updateSettings = useCallback((settings: Partial<CollaborationSession['settings']>) => {
    if (!state.session) return;
    
    dispatch({
      type: CollaborationActionType.UPDATE_SETTINGS,
      settings
    });
    
    // Create a notification
    const notification: Notification = {
      id: uuidv4(),
      type: NotificationType.SESSION_UPDATE,
      message: `${currentParticipant?.name || 'Someone'} updated session settings`,
      createdAt: new Date(),
      userId: currentUserId,
      entityId: state.session.id,
      entityType: 'session',
      read: false
    };
    
    dispatch({ type: CollaborationActionType.ADD_NOTIFICATION, notification });
  }, [state.session, currentUserId, currentParticipant]);
  
  const selectFile = useCallback((fileId: string | null) => {
    // Update state
    if (fileId !== state.selectedFileId) {
      // Change mode to file view if selecting a file
      if (fileId) {
        dispatch({ type: 'SET_MODE' as any, mode: CollaborationMode.FILE_VIEW });
      }
    }
  }, [state.selectedFileId]);
  
  const selectComment = useCallback((commentId: string | null) => {
    // Find the file that contains this comment
    if (commentId && state.session) {
      for (const file of state.session.files) {
        const comment = file.comments?.find(c => c.id === commentId);
        if (comment) {
          selectFile(file.id);
          break;
        }
      }
    }
  }, [state.session, selectFile]);
  
  const setActiveTab = useCallback((tab: CollaborationTab) => {
    // Update state - this would be handled by the reducer in a real implementation
  }, []);
  
  const setMode = useCallback((mode: CollaborationMode) => {
    // Update state - this would be handled by the reducer in a real implementation
  }, []);
  
  // Return the state and actions
  return {
    // State
    session: state.session,
    connecting: state.connecting,
    connected: state.connected,
    error: state.error,
    availableSessions: state.availableSessions,
    selectedFile,
    selectedComment,
    activeTab: state.activeTab,
    mode: state.mode,
    currentParticipant,
    allComments,
    
    // Actions
    joinSession,
    leaveSession,
    createSession,
    addComment,
    resolveComment,
    addReaction,
    addFile,
    updateFile,
    updateParticipantStatus,
    updatePermissions,
    updateSettings,
    selectFile,
    selectComment,
    setActiveTab,
    setMode
  };
};