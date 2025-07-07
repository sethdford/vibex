/**
 * Keyboard Shortcuts Hook
 * 
 * Manages global keyboard shortcuts for the application.
 */

import { useCallback, useEffect } from 'react';
import { useInput } from 'ink';
import { logger } from '../../utils/logger.js';

/**
 * Shortcut definition
 */
export interface ShortcutDefinition {
  /**
   * Name/identifier of the shortcut
   */
  name: string;
  
  /**
   * Description of what the shortcut does
   */
  description: string;
  
  /**
   * Whether Ctrl key is required
   */
  ctrl?: boolean;
  
  /**
   * Whether Alt key is required
   */
  alt?: boolean;
  
  /**
   * Whether Shift key is required
   */
  shift?: boolean;
  
  /**
   * Key character
   */
  key: string;
  
  /**
   * Action to execute when shortcut is triggered
   */
  action: () => void;
  
  /**
   * Whether the shortcut should be active
   */
  isActive?: boolean;
}

/**
 * Keyboard shortcuts hook props
 */
export interface UseKeyboardShortcutsProps {
  /**
   * Array of shortcut definitions
   */
  shortcuts: ShortcutDefinition[];
  
  /**
   * Whether the shortcuts are globally active
   */
  isActive?: boolean;
  
  /**
   * Debug mode flag
   */
  debug?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @param props - Hook configuration
 */
export function useKeyboardShortcuts({
  shortcuts,
  isActive = true,
  debug = false,
}: UseKeyboardShortcutsProps) {
  // Handle keyboard input
  useInput((input, key) => {
    // If shortcuts are not active, do nothing
    if (!isActive) {return;}
    
    // Check each shortcut
    shortcuts.forEach(shortcut => {
      // Skip inactive shortcuts
      if (shortcut.isActive === false) {return;}
      
      // Check if the shortcut matches
      const ctrlMatch = shortcut.ctrl ? key.ctrl : !key.ctrl;
      const altMatch = shortcut.alt ? (key as any).alt : !(key as any).alt;
      const shiftMatch = shortcut.shift ? key.shift : !key.shift;
      const keyMatch = shortcut.key.toLowerCase() === input.toLowerCase();
      
      // If all conditions match, execute the action
      if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
        if (debug) {
          logger.debug(`Keyboard shortcut triggered: ${shortcut.name}`);
        }
        
        shortcut.action();
      }
    });
  });
  
  // Register shortcuts
  const registerShortcut = useCallback((shortcut: ShortcutDefinition) => {
    if (debug) {
      logger.debug(`Registered keyboard shortcut: ${shortcut.name}`);
    }
    
    return shortcut;
  }, [debug]);
  
  // Map of all active shortcuts
  const shortcutMap = useCallback(() => shortcuts.reduce((acc, shortcut) => {
      if (shortcut.isActive !== false) {
        acc[shortcut.name] = shortcut;
      }
      return acc;
    }, {} as Record<string, ShortcutDefinition>), [shortcuts]);
  
  return {
    registerShortcut,
    shortcutMap,
  };
} 