/**
 * Mock for ThemeDialog component
 * 
 * This mock prevents ESM compatibility issues with ink-select-input during Jest tests.
 */

import React from 'react';

interface ThemeDialogProps {
  onSelect: (theme: any) => void;
  onHighlight?: (theme: any) => void;
  settings: any;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export const ThemeDialog: React.FC<ThemeDialogProps> = ({ 
  onSelect,
  onHighlight,
  settings,
  terminalWidth 
}) => (
  <div data-testid="theme-dialog">
    <div data-testid="theme-dialog-title">Theme Settings</div>
    <button data-testid="theme-dialog-select" onClick={() => onSelect({ value: 'dark' })}>
      Select Theme
    </button>
  </div>
);