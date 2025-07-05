/**
 * Mock for AccessibilitySettings component
 * 
 * This mock prevents ESM compatibility issues with ink-select-input during Jest tests.
 */

import React from 'react';

interface AccessibilitySettingsProps {
  onClose: () => void;
  terminalWidth: number;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ 
  onClose,
  terminalWidth 
}) => (
  <div data-testid="accessibility-settings">
    <div data-testid="accessibility-settings-title">Accessibility Settings</div>
    <div data-testid="accessibility-settings-description">
      Configure settings to improve accessibility and usability with assistive technologies.
    </div>
    <button data-testid="accessibility-settings-close" onClick={onClose}>
      Close
    </button>
  </div>
);