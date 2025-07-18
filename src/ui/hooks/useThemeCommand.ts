/**
 * Theme Command Hook
 * 
 * Manages theme selection and theme dialog state.
 */

import { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext.js';
import type { HistoryItem} from '../types.js';
import { MessageType } from '../types.js';

/**
 * Theme option type from theme dialog
 */
interface ThemeOption {
  label: string;
  value: string;
}

/**
 * Settings interface for theme management
 */
interface ThemeSettings {
  set?: (key: string, value: string) => void;
}

/**
 * Theme context interface
 */
interface ThemeContextType {
  setTheme: (theme: string) => void;
}

/**
 * Hook for theme command functionality
 * 
 * @param settings - User settings
 * @param setThemeError - Function to set theme error message
 * @param addItem - Function to add items to history
 * @returns Object containing theme dialog state and handlers
 */
export function useThemeCommand(
  settings: ThemeSettings,
  setThemeError: (error: string | null) => void,
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
) {
  // Theme dialog state
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState<boolean>(false);
  const themeContext = useTheme();
  const setTheme = themeContext.setThemeByName;
  
  // Open theme dialog
  const openThemeDialog = useCallback(() => {
    setIsThemeDialogOpen(true);
  }, []);
  
  // Close theme dialog
  const closeThemeDialog = useCallback(() => {
    setIsThemeDialogOpen(false);
  }, []);
  
  // Handle theme selection
  const handleThemeSelect = useCallback(
    (item: ThemeOption) => {
      try {
        // Apply selected theme
        setTheme(item.value);
        
        // Update settings if possible
        if (settings?.set) {
          settings.set('terminal.theme', item.value);
        }
        
        // Close dialog and clear error
        setIsThemeDialogOpen(false);
        setThemeError(null);
        
        // Add history item for theme change
        addItem(
          {
            type: MessageType.INFO,
            text: `Theme changed to: ${item.label}`,
          },
          Date.now()
        );
      } catch (error) {
        // Handle errors
        setThemeError(
          `Failed to change theme: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
    [settings, setTheme, setThemeError, addItem]
  );
  
  // Handle theme highlight (preview)
  const handleThemeHighlight = useCallback(
    (item: ThemeOption) => {
      try {
        // Preview selected theme
        setTheme(item.value);
      } catch (error) {
        // Silently handle preview errors - use logger instead of console
      }
    },
    [setTheme]
  );
  
  return {
    isThemeDialogOpen,
    openThemeDialog,
    closeThemeDialog,
    handleThemeSelect,
    handleThemeHighlight,
  };
} 