/**
 * Collaboration Interface Types
 * 
 * Type definitions for the Collaboration Interface component.
 */

/**
 * User status in collaboration session
 */
export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

/**
 * User role in collaboration session
 */
export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  COMMENTER = 'commenter',
  VIEWER = 'viewer'
}

/**
 * Permission level for collaboration actions
 */
export enum PermissionLevel {
  NONE = 'none',
  READ = 'read',
  COMMENT = 'comment',
  EDIT = 'edit',
  MANAGE = 'manage',
  ADMIN = 'admin'
}

/**
 * Session access type
 */
export enum SessionAccess {
  PUBLIC = 'public',
  TEAM = 'team',
  RESTRICTED = 'restricted',
  PRIVATE = 'private'
}

/**
 * Comment status
 */
export enum CommentStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  WONTFIX = 'wontfix'
}

/**
 * Notification type
 */
export enum NotificationType {
  USER_JOIN = 'user_join',
  USER_LEAVE = 'user_leave',
  COMMENT_ADDED = 'comment_added',
  COMMENT_RESOLVED = 'comment_resolved',
  FILE_ADDED = 'file_added',
  FILE_CHANGED = 'file_changed',
  PERMISSION_CHANGED = 'permission_changed',
  SESSION_UPDATE = 'session_update',
  GENERAL = 'general'
}

/**
 * Session participant
 */
export interface Participant {
  /**
   * Unique ID of the participant
   */
  id: string;
  
  /**
   * Display name of the participant
   */
  name: string;
  
  /**
   * User status
   */
  status: UserStatus;
  
  /**
   * User role
   */
  role: UserRole;
  
  /**
   * User color for identification
   */
  color?: string;
  
  /**
   * Avatar or profile image URL
   */
  avatar?: string;
  
  /**
   * Whether this is the current user
   */
  isSelf?: boolean;
  
  /**
   * Last active timestamp
   */
  lastActive?: Date;
  
  /**
   * User permissions
   */
  permissions: Record<string, PermissionLevel>;
  
  /**
   * Currently focused element (e.g., file, line)
   */
  focus?: {
    type: string;
    id: string;
    position?: any;
  };
}

/**
 * Comment reaction
 */
export interface Reaction {
  /**
   * Emoji or reaction type
   */
  emoji: string;
  
  /**
   * Count of reactions
   */
  count: number;
  
  /**
   * IDs of users who reacted
   */
  users: string[];
}

/**
 * Comment in a collaboration session
 */
export interface Comment {
  /**
   * Unique ID of the comment
   */
  id: string;
  
  /**
   * ID of the user who created the comment
   */
  userId: string;
  
  /**
   * Content of the comment
   */
  content: string;
  
  /**
   * Creation timestamp
   */
  createdAt: Date;
  
  /**
   * Last update timestamp
   */
  updatedAt?: Date;
  
  /**
   * ID of the file the comment is attached to
   */
  fileId?: string;
  
  /**
   * Line number the comment is attached to
   */
  line?: number;
  
  /**
   * Column or character position
   */
  column?: number;
  
  /**
   * Thread ID for threaded comments
   */
  threadId?: string;
  
  /**
   * ID of the parent comment for replies
   */
  parentId?: string;
  
  /**
   * Reactions to the comment
   */
  reactions?: Reaction[];
  
  /**
   * Status of the comment
   */
  status: CommentStatus;
  
  /**
   * ID of the user who resolved the comment
   */
  resolvedBy?: string;
  
  /**
   * Timestamp when the comment was resolved
   */
  resolvedAt?: Date;
  
  /**
   * ID of the comment that resolves this comment
   */
  resolvedWithCommentId?: string;
}

/**
 * Shared file in a collaboration session
 */
export interface SharedFile {
  /**
   * Unique ID of the file
   */
  id: string;
  
  /**
   * File name
   */
  name: string;
  
  /**
   * File path
   */
  path: string;
  
  /**
   * File type
   */
  type: string;
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * File content
   */
  content?: string;
  
  /**
   * Last modification timestamp
   */
  lastModified: Date;
  
  /**
   * ID of the user who owns the file
   */
  ownerId: string;
  
  /**
   * Whether the file is read-only
   */
  readOnly: boolean;
  
  /**
   * Comments attached to this file
   */
  comments?: Comment[];
  
  /**
   * Current editors of the file
   */
  editors?: string[];
  
  /**
   * Current viewers of the file
   */
  viewers?: string[];
}

/**
 * Notification in a collaboration session
 */
export interface Notification {
  /**
   * Unique ID of the notification
   */
  id: string;
  
  /**
   * Notification type
   */
  type: NotificationType;
  
  /**
   * Notification message
   */
  message: string;
  
  /**
   * Creation timestamp
   */
  createdAt: Date;
  
  /**
   * ID of the user who triggered the notification
   */
  userId?: string;
  
  /**
   * Related entity ID (file, comment, etc.)
   */
  entityId?: string;
  
  /**
   * Related entity type
   */
  entityType?: string;
  
  /**
   * Whether the notification has been read
   */
  read: boolean;
}

/**
 * Collaboration session
 */
export interface CollaborationSession {
  /**
   * Unique ID of the session
   */
  id: string;
  
  /**
   * Session name
   */
  name: string;
  
  /**
   * Session description
   */
  description?: string;
  
  /**
   * Creation timestamp
   */
  createdAt: Date;
  
  /**
   * Last activity timestamp
   */
  lastActivity: Date;
  
  /**
   * ID of the session owner
   */
  ownerId: string;
  
  /**
   * Participants in the session
   */
  participants: Participant[];
  
  /**
   * Shared files in the session
   */
  files: SharedFile[];
  
  /**
   * Session access type
   */
  access: SessionAccess;
  
  /**
   * Whether the session is active
   */
  active: boolean;
  
  /**
   * Session password for restricted access
   */
  password?: string;
  
  /**
   * Session settings
   */
  settings: {
    /**
     * Whether to allow file uploads
     */
    allowFileUploads: boolean;
    
    /**
     * Whether to allow comments
     */
    allowComments: boolean;
    
    /**
     * Whether to allow file editing
     */
    allowEditing: boolean;
    
    /**
     * Maximum file size in bytes
     */
    maxFileSize?: number;
    
    /**
     * Whether to save session history
     */
    saveHistory: boolean;
    
    /**
     * Whether to encrypt session data
     */
    encrypt: boolean;
  };
  
  /**
   * Tags for categorizing the session
   */
  tags?: string[];
}

/**
 * Collaboration interface props
 */
export interface CollaborationInterfaceProps {
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Height of the component
   */
  height: number;
  
  /**
   * Active collaboration session
   */
  activeSession?: CollaborationSession;
  
  /**
   * ID of the current user
   */
  currentUserId: string;
  
  /**
   * Whether the interface is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when the user exits the interface
   */
  onExit?: () => void;
  
  /**
   * Callback when focus changes
   */
  onFocusChange?: (focused: boolean) => void;
  
  /**
   * Callback when a session is created
   */
  onSessionCreate?: (session: Partial<CollaborationSession>) => Promise<CollaborationSession>;
  
  /**
   * Callback when a session is joined
   */
  onSessionJoin?: (sessionId: string, password?: string) => Promise<CollaborationSession>;
  
  /**
   * Callback when a session is left
   */
  onSessionLeave?: (sessionId: string) => Promise<void>;
  
  /**
   * Callback when a comment is added
   */
  onCommentAdd?: (fileId: string, comment: Partial<Comment>) => Promise<Comment>;
  
  /**
   * Callback when a comment is resolved
   */
  onCommentResolve?: (commentId: string) => Promise<Comment>;
  
  /**
   * Callback when a file is shared
   */
  onFileShare?: (file: Partial<SharedFile>) => Promise<SharedFile>;
  
  /**
   * Callback when a file is edited
   */
  onFileEdit?: (fileId: string, content: string) => Promise<SharedFile>;
  
  /**
   * Callback when permissions are updated
   */
  onPermissionUpdate?: (userId: string, permission: string, level: PermissionLevel) => Promise<void>;
}

/**
 * Participant list props
 */
export interface ParticipantListProps {
  /**
   * Participants to display
   */
  participants: Participant[];
  
  /**
   * ID of the current user
   */
  currentUserId: string;
  
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a participant is selected
   */
  onParticipantSelect?: (participant: Participant) => void;
}

/**
 * Comment list props
 */
export interface CommentListProps {
  /**
   * Comments to display
   */
  comments: Comment[];
  
  /**
   * File to show comments for
   */
  file?: SharedFile;
  
  /**
   * Participants in the session
   */
  participants: Participant[];
  
  /**
   * ID of the current user
   */
  currentUserId: string;
  
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Height of the component
   */
  height: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a comment is added
   */
  onCommentAdd?: (comment: Partial<Comment>) => void;
  
  /**
   * Callback when a comment is resolved
   */
  onCommentResolve?: (commentId: string) => void;
  
  /**
   * Callback when a reaction is added to a comment
   */
  onReactionAdd?: (commentId: string, emoji: string) => void;
  
  /**
   * Callback when a comment is selected
   */
  onCommentSelect?: (comment: Comment) => void;
}

/**
 * Shared file list props
 */
export interface SharedFileListProps {
  /**
   * Files to display
   */
  files: SharedFile[];
  
  /**
   * ID of the current user
   */
  currentUserId: string;
  
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a file is selected
   */
  onFileSelect?: (file: SharedFile) => void;
  
  /**
   * Callback when a file is shared
   */
  onFileShare?: (file: Partial<SharedFile>) => void;
}

/**
 * Shared file viewer props
 */
export interface SharedFileViewerProps {
  /**
   * File to display
   */
  file: SharedFile;
  
  /**
   * Comments for the file
   */
  comments: Comment[];
  
  /**
   * Participants in the session
   */
  participants: Participant[];
  
  /**
   * ID of the current user
   */
  currentUserId: string;
  
  /**
   * Whether editing is allowed
   */
  allowEditing: boolean;
  
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Height of the component
   */
  height: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when the file is edited
   */
  onFileEdit?: (fileId: string, content: string) => void;
  
  /**
   * Callback when a comment is added
   */
  onCommentAdd?: (comment: Partial<Comment>) => void;
}

/**
 * Notification list props
 */
export interface NotificationListProps {
  /**
   * Notifications to display
   */
  notifications: Notification[];
  
  /**
   * Participants in the session
   */
  participants: Participant[];
  
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a notification is selected
   */
  onNotificationSelect?: (notification: Notification) => void;
  
  /**
   * Callback when a notification is marked as read
   */
  onNotificationRead?: (notificationId: string) => void;
}

/**
 * Session info props
 */
export interface SessionInfoProps {
  /**
   * Session to display
   */
  session: CollaborationSession;
  
  /**
   * ID of the current user
   */
  currentUserId: string;
  
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when the session settings are updated
   */
  onSettingsUpdate?: (settings: Partial<CollaborationSession['settings']>) => void;
  
  /**
   * Callback when the session is left
   */
  onSessionLeave?: () => void;
}

/**
 * Session creation modal props
 */
export interface SessionCreationModalProps {
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a session is created
   */
  onSessionCreate?: (session: Partial<CollaborationSession>) => void;
  
  /**
   * Callback when the modal is cancelled
   */
  onCancel?: () => void;
}

/**
 * Session list props
 */
export interface SessionListProps {
  /**
   * Sessions to display
   */
  sessions: CollaborationSession[];
  
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a session is selected
   */
  onSessionSelect?: (session: CollaborationSession) => void;
  
  /**
   * Callback when a session is joined
   */
  onSessionJoin?: (sessionId: string, password?: string) => void;
}

/**
 * Collaboration action type
 */
export enum CollaborationActionType {
  SET_SESSION = 'SET_SESSION',
  JOIN_SESSION = 'JOIN_SESSION',
  LEAVE_SESSION = 'LEAVE_SESSION',
  ADD_PARTICIPANT = 'ADD_PARTICIPANT',
  UPDATE_PARTICIPANT = 'UPDATE_PARTICIPANT',
  REMOVE_PARTICIPANT = 'REMOVE_PARTICIPANT',
  ADD_FILE = 'ADD_FILE',
  UPDATE_FILE = 'UPDATE_FILE',
  REMOVE_FILE = 'REMOVE_FILE',
  ADD_COMMENT = 'ADD_COMMENT',
  UPDATE_COMMENT = 'UPDATE_COMMENT',
  REMOVE_COMMENT = 'REMOVE_COMMENT',
  ADD_NOTIFICATION = 'ADD_NOTIFICATION',
  MARK_NOTIFICATION_READ = 'MARK_NOTIFICATION_READ',
  REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  UPDATE_PERMISSIONS = 'UPDATE_PERMISSIONS'
}

/**
 * Collaboration action
 */
export type CollaborationAction =
  | { type: CollaborationActionType.SET_SESSION; session: CollaborationSession }
  | { type: CollaborationActionType.JOIN_SESSION; session: CollaborationSession }
  | { type: CollaborationActionType.LEAVE_SESSION }
  | { type: CollaborationActionType.ADD_PARTICIPANT; participant: Participant }
  | { type: CollaborationActionType.UPDATE_PARTICIPANT; participantId: string; updates: Partial<Participant> }
  | { type: CollaborationActionType.REMOVE_PARTICIPANT; participantId: string }
  | { type: CollaborationActionType.ADD_FILE; file: SharedFile }
  | { type: CollaborationActionType.UPDATE_FILE; fileId: string; updates: Partial<SharedFile> }
  | { type: CollaborationActionType.REMOVE_FILE; fileId: string }
  | { type: CollaborationActionType.ADD_COMMENT; comment: Comment }
  | { type: CollaborationActionType.UPDATE_COMMENT; commentId: string; updates: Partial<Comment> }
  | { type: CollaborationActionType.REMOVE_COMMENT; commentId: string }
  | { type: CollaborationActionType.ADD_NOTIFICATION; notification: Notification }
  | { type: CollaborationActionType.MARK_NOTIFICATION_READ; notificationId: string }
  | { type: CollaborationActionType.REMOVE_NOTIFICATION; notificationId: string }
  | { type: CollaborationActionType.UPDATE_SETTINGS; settings: Partial<CollaborationSession['settings']> }
  | { type: CollaborationActionType.UPDATE_PERMISSIONS; userId: string; permission: string; level: PermissionLevel };

/**
 * Collaboration state
 */
export interface CollaborationState {
  /**
   * Active session
   */
  session: CollaborationSession | null;
  
  /**
   * Whether the session is connecting
   */
  connecting: boolean;
  
  /**
   * Whether the connection is active
   */
  connected: boolean;
  
  /**
   * Connection error message
   */
  error: string | null;
  
  /**
   * Available sessions
   */
  availableSessions: CollaborationSession[];
  
  /**
   * Currently selected file
   */
  selectedFileId: string | null;
  
  /**
   * Currently selected comment
   */
  selectedCommentId: string | null;
  
  /**
   * Active interface tab
   */
  activeTab: CollaborationTab;
  
  /**
   * Currently focused element
   */
  focusedElement: string | null;
  
  /**
   * Application interface mode
   */
  mode: CollaborationMode;
}

/**
 * Collaboration interface tab
 */
export enum CollaborationTab {
  FILES = 'files',
  COMMENTS = 'comments',
  PARTICIPANTS = 'participants',
  NOTIFICATIONS = 'notifications',
  SESSION = 'session'
}

/**
 * Collaboration mode
 */
export enum CollaborationMode {
  BROWSE = 'browse',
  FILE_VIEW = 'file_view',
  SESSION_CREATE = 'session_create',
  SESSION_JOIN = 'session_join'
}