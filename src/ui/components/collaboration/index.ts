/**
 * Collaboration Components
 * 
 * Export all components and hooks related to the collaboration interface.
 */

// Main components
export { default as CollaborationInterface } from './CollaborationInterface.js';
export { default as ParticipantList } from './ParticipantList.js';
export { default as CommentList } from './CommentList.js';
export { default as SharedFileList } from './SharedFileList.js';
export { default as SharedFileViewer } from './SharedFileViewer.js';
export { default as NotificationList } from './NotificationList.js';
export { default as SessionInfo } from './SessionInfo.js';
export { default as SessionCreationModal } from './SessionCreationModal.js';

// Hooks
export { useCollaboration } from './useCollaboration.js';

// Types
export * from './types.js';