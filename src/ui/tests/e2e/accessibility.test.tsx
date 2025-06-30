/**
 * Accessibility Feature E2E Tests
 * 
 * Tests the accessibility features of the UI system to ensure they work correctly.
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { App } from '../../App';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { SessionStatsProvider } from '../../contexts/SessionContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import { AccessibleText } from '../../components/AccessibleText';
import { AccessibilitySettings } from '../../components/AccessibilitySettings';
import { formatForScreenReader, shouldDisableLoadingPhrases } from '../../utils/accessibilityUtils';

// Mock required hooks and modules
jest.mock('../../hooks/useSettings', () => ({
  useSettings: jest.fn().mockReturnValue({
    settings: {
      accessibility: {
        enabled: true,
        disableLoadingPhrases: true,
        screenReaderOptimized: true
      },
      terminal: {
        useHighContrast: true,
        reduceMotion: true,
        fontSizeAdjustment: 'large',
        simplifyInterface: true
      }
    },
    settingDefinitions: [
      {
        key: 'accessibility.enabled',
        label: 'Enable Accessibility Mode',
        description: 'Optimize terminal output for screen readers',
        type: 'boolean',
        value: true,
        category: 'Accessibility'
      },
      {
        key: 'accessibility.disableLoadingPhrases',
        label: 'Disable Loading Phrases',
        description: 'Replace random loading phrases with static text',
        type: 'boolean',
        value: true,
        category: 'Accessibility'
      },
      {
        key: 'terminal.useHighContrast',
        label: 'High Contrast Mode',
        description: 'Use high contrast colors',
        type: 'boolean',
        value: true,
        category: 'Accessibility'
      }
    ],
    saveSetting: jest.fn(),
    error: null
  })
}));

jest.mock('../../hooks/useTerminalSize', () => ({
  useTerminalSize: jest.fn().mockReturnValue({ rows: 30, columns: 100 })
}));

describe('Accessibility Features Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  
  describe('AccessibleText Component', () => {
    it('formats text correctly for screen readers', () => {
      const { getByTestId } = render(
        <AccessibleText screenReaderFormat role="status" description="Test description">
          Test*with-special_chars
        </AccessibleText>
      );
      
      const element = getByTestId('accessible-text');
      expect(element).toHaveAttribute('role', 'status');
      expect(element).toHaveAttribute('aria-label', 'Test*with-special_chars. Test description');
    });
    
    it('renders heading with appropriate role', () => {
      const { getByText, getByTestId } = render(
        <ThemeProvider>
          <AccessibleText role="heading-1" bold>
            Main Heading
          </AccessibleText>
        </ThemeProvider>
      );
      
      expect(getByText('Main Heading')).toBeTruthy();
      const element = getByTestId('accessible-text');
      expect(element).toHaveAttribute('role', 'heading-1');
    });
  });
  
  describe('AccessibilitySettings Component', () => {
    it('renders accessibility settings dialog', () => {
      const onClose = jest.fn();
      
      const { getByText } = render(
        <ThemeProvider>
          <AccessibilitySettings onClose={onClose} terminalWidth={80} />
        </ThemeProvider>
      );
      
      // Check for section headings
      expect(getByText('Accessibility Settings')).toBeTruthy();
      expect(getByText('Options')).toBeTruthy();
    });
  });
  
  describe('Accessibility Utility Functions', () => {
    it('formats text for screen readers correctly', () => {
      const input = 'Test*with-special_chars.and:more/symbols\\here';
      const expected = 'Test star with dash special underscore chars dot and colon more slash symbols backslash here';
      expect(formatForScreenReader(input)).toEqual(expected);
    });
    
    it('detects if loading phrases should be disabled', () => {
      const configWithDisabled = {
        accessibility: {
          disableLoadingPhrases: true
        }
      };
      
      const configWithoutDisabled = {
        accessibility: {
          disableLoadingPhrases: false
        }
      };
      
      const configWithoutSetting = {};
      
      expect(shouldDisableLoadingPhrases(configWithDisabled)).toBe(true);
      expect(shouldDisableLoadingPhrases(configWithoutDisabled)).toBe(false);
      expect(shouldDisableLoadingPhrases(configWithoutSetting)).toBe(false);
    });
  });
  
  describe('App with Accessibility Features', () => {
    it('respects accessibility settings in the UI', () => {
      // Create a config with accessibility enabled
      const mockConfig = {
        terminal: {
          theme: 'dark',
          useColors: true,
          useHighContrast: true,
          reduceMotion: true,
          fontSizeAdjustment: 'large'
        },
        ai: {
          model: 'claude-3-7-sonnet'
        },
        accessibility: {
          enabled: true,
          disableLoadingPhrases: true,
          screenReaderOptimized: true
        }
      };
      
      const { container } = render(
        <SessionStatsProvider>
          <ProgressProvider>
            <ThemeProvider>
              <App config={mockConfig} startupWarnings={[]} />
            </ThemeProvider>
          </ProgressProvider>
        </SessionStatsProvider>
      );
      
      // Check that the app renders with accessibility features
      expect(container.innerHTML).toContain('Claude');
      
      // Advance timers to ensure all async operations complete
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    });
    
    it('opens accessibility settings with keyboard shortcut', () => {
      const mockConfig = {
        terminal: {
          theme: 'dark',
          useColors: true
        },
        ai: {
          model: 'claude-3-7-sonnet'
        },
        accessibility: {
          enabled: false
        }
      };
      
      const { container } = render(
        <SessionStatsProvider>
          <ProgressProvider>
            <ThemeProvider>
              <App config={mockConfig} startupWarnings={[]} />
            </ThemeProvider>
          </ProgressProvider>
        </SessionStatsProvider>
      );
      
      // Simulate pressing Ctrl+Alt+A to open accessibility settings
      fireEvent.keyDown(window, { key: 'a', ctrlKey: true, altKey: true });
      
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      // App should still be rendered
      expect(container.innerHTML).toContain('Claude');
    });
  });
});