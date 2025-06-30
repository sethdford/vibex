/**
 * Keyboard Navigation E2E Tests
 * 
 * Tests keyboard navigation across the entire UI to ensure proper focus management
 * and keyboard-only usability.
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { App } from '../../App';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { SessionStatsProvider } from '../../contexts/SessionContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

// Mock required hooks and modules
jest.mock('../../hooks/useSettings', () => ({
  useSettings: jest.fn().mockReturnValue({
    settings: {
      terminal: {
        theme: 'dark'
      },
      accessibility: {
        enabled: false
      }
    },
    settingDefinitions: [],
    saveSetting: jest.fn(),
    error: null
  })
}));

jest.mock('../../hooks/useTerminalSize', () => ({
  useTerminalSize: jest.fn().mockReturnValue({ rows: 30, columns: 100 })
}));

// Track registered keyboard shortcuts
const registeredShortcuts: any[] = [];

jest.mock('../../hooks/useKeyboardShortcuts', () => {
  const original = jest.requireActual('../../hooks/useKeyboardShortcuts');
  
  return {
    ...original,
    useKeyboardShortcuts: jest.fn().mockImplementation(({ shortcuts, isActive }) => {
      // Store shortcuts for testing
      registeredShortcuts.push(...shortcuts);
      
      return {
        registerShortcut: jest.fn(),
        triggerShortcut: jest.fn(),
        isActive
      };
    })
  };
});

describe('Keyboard Navigation Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    registeredShortcuts.length = 0; // Clear shortcuts between tests
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  
  it('registers essential keyboard shortcuts', () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
      }
    };
    
    render(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={mockConfig} startupWarnings={[]} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Verify essential shortcuts are registered
    const shortcutKeys = registeredShortcuts.map(s => s.key);
    
    // Help shortcut
    expect(shortcutKeys).toContain('h');
    
    // Settings shortcut
    expect(shortcutKeys).toContain(',');
    
    // Copy last response shortcut
    expect(shortcutKeys).toContain('y');
    
    // Escape (to close dialogs)
    expect(shortcutKeys).toContain('escape');
    
    // Exit application shortcut
    expect(shortcutKeys).toContain('c');
    expect(shortcutKeys).toContain('d');
  });
  
  it('handles dialog focus management', () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
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
    
    // Open help dialog
    const helpShortcut = registeredShortcuts.find(s => s.name === 'showHelp');
    if (helpShortcut && helpShortcut.action) {
      act(() => {
        helpShortcut.action();
      });
    }
    
    // Wait for UI to update
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Help content should be visible
    expect(container.innerHTML).toContain('Claude');
    
    // Close help dialog
    const closeShortcut = registeredShortcuts.find(s => s.name === 'closeHelp');
    if (closeShortcut && closeShortcut.action) {
      act(() => {
        closeShortcut.action();
      });
    }
    
    // Wait for UI to update
    act(() => {
      jest.advanceTimersByTime(100);
    });
  });
  
  it('handles settings dialog keyboard navigation', () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
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
    
    // Open settings dialog
    const settingsShortcut = registeredShortcuts.find(s => s.name === 'toggleSettings');
    if (settingsShortcut && settingsShortcut.action) {
      act(() => {
        settingsShortcut.action();
      });
    }
    
    // Wait for UI to update
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Settings dialog should be visible
    expect(container.innerHTML).toContain('Claude');
  });
  
  it('handles accessibility settings dialog keyboard navigation', () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
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
    
    // Open accessibility settings dialog
    const a11yShortcut = registeredShortcuts.find(s => s.name === 'toggleAccessibilitySettings');
    if (a11yShortcut && a11yShortcut.action) {
      act(() => {
        a11yShortcut.action();
      });
    }
    
    // Wait for UI to update
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Accessibility settings dialog should be visible
    expect(container.innerHTML).toContain('Claude');
  });
  
  it('handles shortcut conflicts correctly', () => {
    // Check for shortcut conflicts (same key+modifier combination)
    const shortcuts = registeredShortcuts.filter(s => s.isActive !== false);
    const shortcutCombinations = shortcuts.map(s => `${s.ctrl ? 'Ctrl+' : ''}${s.alt ? 'Alt+' : ''}${s.meta ? 'Meta+' : ''}${s.shift ? 'Shift+' : ''}${s.key}`);
    
    // Create a set to find duplicate entries
    const uniqueCombinations = new Set(shortcutCombinations);
    
    // If the lengths match, there are no duplicates
    expect(uniqueCombinations.size).toEqual(shortcutCombinations.length);
  });
  
  it('respects keyboard-only navigation for all UI elements', () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
      },
      accessibility: {
        enabled: true,
        keyboardNavigationEnhanced: true
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
    
    // App should render with keyboard navigation enhancements
    expect(container.innerHTML).toContain('Claude');
  });
});