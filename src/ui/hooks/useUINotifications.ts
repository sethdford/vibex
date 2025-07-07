/**
 * UI Notifications Hook - Focused state management for notifications
 * Follows Gemini CLI's pattern of focused, single-responsibility hooks
 */

import { useState, useCallback } from 'react';
import type { NotificationType } from '../components/ClipboardNotification.js';

export interface ClipboardNotificationState {
  message: string;
  type: NotificationType;
}

export interface UINotificationsState {
  clipboardNotification: ClipboardNotificationState | null;
  userMessages: string[];
}

export function useUINotifications() {
  const [clipboardNotification, setClipboardNotification] = useState<ClipboardNotificationState | null>(null);
  const [userMessages, setUserMessages] = useState<string[]>([]);

  const showClipboardNotification = useCallback((message: string, type: NotificationType = 'success') => {
    setClipboardNotification({ message, type });
  }, []);

  const clearClipboardNotification = useCallback(() => {
    setClipboardNotification(null);
  }, []);

  const updateUserMessages = useCallback((messages: string[]) => {
    setUserMessages(messages);
  }, []);

  const clearUserMessages = useCallback(() => {
    setUserMessages([]);
  }, []);

  return {
    // State
    clipboardNotification,
    userMessages,
    
    // Actions
    showClipboardNotification,
    clearClipboardNotification,
    updateUserMessages,
    clearUserMessages,
  };
} 