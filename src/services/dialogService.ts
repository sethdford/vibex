/**
 * Dialog Service - Centralized dialog state management
 * Replaces scattered boolean flags with clean state management like Gemini CLI
 */

import { useState, useCallback } from 'react';

export enum DialogType {
  NONE = 'none',
  HELP = 'help',
  THEME = 'theme',
  SETTINGS = 'settings'
}

export interface DialogState {
  currentDialog: DialogType;
  isOpen: boolean;
  data?: any;
}

/**
 * Hook for managing dialog state (like Gemini's dialog management)
 */
export function useDialogManager() {
  const [dialogState, setDialogState] = useState<DialogState>({
    currentDialog: DialogType.NONE,
    isOpen: false
  });

  const openDialog = useCallback((type: DialogType, data?: any) => {
    setDialogState({
      currentDialog: type,
      isOpen: true,
      data
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState({
      currentDialog: DialogType.NONE,
      isOpen: false
    });
  }, []);

  const isDialogOpen = useCallback((type: DialogType) => {
    return dialogState.isOpen && dialogState.currentDialog === type;
  }, [dialogState]);

  return {
    dialogState,
    openDialog,
    closeDialog,
    isDialogOpen,
    // Convenience methods
    openHelp: () => openDialog(DialogType.HELP),
    openTheme: () => openDialog(DialogType.THEME),
    openSettings: () => openDialog(DialogType.SETTINGS),
    isHelpOpen: isDialogOpen(DialogType.HELP),
    isThemeOpen: isDialogOpen(DialogType.THEME),
    isSettingsOpen: isDialogOpen(DialogType.SETTINGS),
    hasActiveDialog: dialogState.isOpen
  };
} 