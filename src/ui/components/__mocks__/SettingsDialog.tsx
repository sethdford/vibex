/**
 * Mock for SettingsDialog component
 * 
 * This mock prevents ESM compatibility issues with ink-text-input during Jest tests.
 */

import React from 'react';

interface SettingsDialogProps {
  settings: any[];
  onSave: (key: string, value: any) => void;
  onClose: () => void;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ 
  settings,
  onSave,
  onClose,
  terminalWidth 
}) => (
  <div data-testid="settings-dialog">
    <div data-testid="settings-dialog-title">Settings</div>
    <div data-testid="settings-dialog-options">
      {Array.isArray(settings) && settings.map((setting, index) => (
        <div key={index} data-testid={`setting-${index}`}>
          {setting.label || setting.key}
        </div>
      ))}
    </div>
    <button data-testid="settings-dialog-close" onClick={onClose}>
      Close
    </button>
  </div>
);