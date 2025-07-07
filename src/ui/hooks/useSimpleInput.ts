/**
 * Simple Input Hook - Clean input handling like Gemini CLI
 * Replaces complex useKeyboardShortcuts and buffer system
 */

import { useInput } from 'ink';
import { useCallback } from 'react';

export interface SimpleInputHandlers {
  onSubmit: (text: string) => void;
  onClear: () => void;
  onExit: () => void;
  onToggleErrorDetails?: () => void;
  onToggleHeightConstraint?: () => void;
  onOpenHelp?: () => void;
  onCloseHelp?: () => void;
  onCopyLastResponse?: () => void;
}

export interface SimpleInputOptions {
  isActive: boolean;
  hasActiveDialog: boolean;
  showHelp: boolean;
  bufferText: string;
  handlers: SimpleInputHandlers;
}

/**
 * Simple input handling like Gemini CLI - direct useInput without over-engineering
 */
export function useSimpleInput({
  isActive,
  hasActiveDialog,
  showHelp,
  bufferText,
  handlers
}: SimpleInputOptions) {
  
  useInput(useCallback((input, key) => {
    // Don't handle input if not active or dialog is open
    if (!isActive || hasActiveDialog) {
      return;
    }

    // Handle keyboard shortcuts
    if (key.ctrl) {
      switch (input) {
        case 'c':
          handlers.onExit();
          break;
        case 'd':
          if (bufferText.length === 0) {
            handlers.onExit();
          }
          break;
        case 'l':
          handlers.onClear();
          break;
        case 'h':
          if (handlers.onOpenHelp) {
            handlers.onOpenHelp();
          }
          break;
        case 'o':
          if (handlers.onToggleErrorDetails) {
            handlers.onToggleErrorDetails();
          }
          break;
        case 's':
          if (handlers.onToggleHeightConstraint) {
            handlers.onToggleHeightConstraint();
          }
          break;
        case 'y':
          if (handlers.onCopyLastResponse) {
            handlers.onCopyLastResponse();
          }
          break;
      }
      return;
    }

    // Handle escape key
    if (key.escape && showHelp && handlers.onCloseHelp) {
      handlers.onCloseHelp();
      return;
    }

    // Other input handling is delegated to the input component
  }, [isActive, hasActiveDialog, showHelp, bufferText, handlers]));
} 