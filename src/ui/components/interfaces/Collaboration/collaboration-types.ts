/**
 * Collaboration Interface Types
 * 
 * Types for the Collaboration Interface components that enable real-time
 * collaboration features in the terminal environment.
 */

/**
 * Participant in a collaboration session
 */
export interface CollaborationParticipant {
  id: string;
  name: string;
  color: string;
  status: ParticipantStatus;
  cursor?: {
    x: number;
    y: number;
  };
  permissions: ParticipantPermissions;
  lastActive: Date;
}

/**
 * Status of a participant
 */
export enum ParticipantStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

/**
 * Permissions for a participant
 */
export interface ParticipantPermissions {
  canEdit: boolean;
  canComment: boolean;
  canInvite: boolean;
  canManageSession: boolean;
  isOwner: boolean;
}

/**
 * Comment or annotation in a collaboration session
 */
export interface CollaborationComment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: Date;
  target?: {
    fileId?: string;
    lineNumber?: number;
    selectionRange?: {
      start: number;
      end: number;
    };
  };
  reactions?: CommentReaction[];
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

/**
 * Reaction to a comment
 */
export interface CommentReaction {
  emoji: string;
  count: number;
  users: string[]; // User IDs
}

/**
 * Shared file in a collaboration session
 */
export interface SharedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  lastModified: Date;
  modifiedBy: string;
  comments: CollaborationComment[];
  viewerCount: number;
  editableBy: string[]; // User IDs
}

/**
 * Shared terminal view in a collaboration session
 */
export interface SharedTerminal {
  id: string;
  owner: string;
  viewers: string[]; // User IDs
  content: string[];
  cursorPosition: number;
  scrollPosition: number;
  isSharing: boolean;
}

/**
 * Collaboration session
 */
export interface CollaborationSession {
  id: string;
  name: string;
  description?: string;
  participants: CollaborationParticipant[];
  sharedFiles: SharedFile[];
  sharedTerminal?: SharedTerminal;
  comments: CollaborationComment[];
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  settings: SessionSettings;
}

/**
 * Settings for a collaboration session
 */
export interface SessionSettings {
  allowAnonymous: boolean;
  allowPublicAccess: boolean;
  defaultPermissions: ParticipantPermissions;
  autoSaveInterval: number; // in seconds
  persistHistory: boolean;
  maxParticipants: number;
}

/**
 * Notification within a collaboration session
 */
export interface CollaborationNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  senderId: string;
  senderName: string;
  recipientId?: string;
  isRead: boolean;
}

/**
 * Types of notifications in a collaboration session
 */
export enum NotificationType {
  JOIN = 'join',
  LEAVE = 'leave',
  EDIT = 'edit',
  COMMENT = 'comment',
  SYSTEM = 'system',
  INVITATION = 'invitation'
}

/**
 * State of the collaboration interface
 */
export interface CollaborationInterfaceState {
  activeSession?: CollaborationSession;
  availableSessions: CollaborationSession[];
  currentUser?: CollaborationParticipant;
  isConnecting: boolean;
  connectionError?: string;
  notifications: CollaborationNotification[];
  unreadNotificationCount: number;
  selectedFile?: SharedFile;
  activeComments: CollaborationComment[];
  isSessionCreationModalOpen: boolean;
}

/**
 * Actions for the collaboration interface
 */
export enum CollaborationAction {
  JOIN_SESSION = 'join_session',
  LEAVE_SESSION = 'leave_session',
  CREATE_SESSION = 'create_session',
  ADD_COMMENT = 'add_comment',
  RESOLVE_COMMENT = 'resolve_comment',
  SHARE_FILE = 'share_file',
  EDIT_FILE = 'edit_file',
  UPDATE_CURSOR = 'update_cursor',
  INVITE_USER = 'invite_user',
  UPDATE_PERMISSIONS = 'update_permissions',
  UPDATE_USER_STATUS = 'update_user_status',
  CLEAR_NOTIFICATIONS = 'clear_notifications',
  SHARE_TERMINAL = 'share_terminal',
  STOP_SHARING_TERMINAL = 'stop_sharing_terminal'
}