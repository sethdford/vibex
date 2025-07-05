/**
 * Theme Context Tests
 */

import React, { type MutableRefObject } from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../../src/ui/contexts/ThemeContext';
import { themes } from '../../../src/ui/themes/theme-manager';

// Mock window.matchMedia
const mockMatchMedia = () => ({
  matches: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
});

// Helper component to capture the theme context value
const ThemeCapture = ({
  contextRef
}: {
  contextRef: MutableRefObject<ReturnType<typeof useTheme> | undefined>;
}) => {
  contextRef.current = useTheme();
  return <div data-testid="theme-capture">Theme Capture</div>;
};

describe('ThemeContext', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation(mockMatchMedia);
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('provides the default dark theme when no theme is specified', () => {
    const contextRef = { current: undefined };

    render(
      <ThemeProvider>
        <ThemeCapture contextRef={contextRef} />
      </ThemeProvider>
    );

    expect(contextRef.current?.themeName).toBe('default');
    expect(contextRef.current?.theme).toBe(themes.default);
    expect(contextRef.current?.themeMode).toBe('system');
  });

  it('provides the specified initial theme', () => {
    const contextRef = { current: undefined };

    render(
      <ThemeProvider initialTheme="dracula">
        <ThemeCapture contextRef={contextRef} />
      </ThemeProvider>
    );

    expect(contextRef.current?.themeName).toBe('dracula');
    expect(contextRef.current?.theme).toBe(themes.dracula);
  });

  it('provides the specified initial theme mode', () => {
    const contextRef = { current: undefined };

    render(
      <ThemeProvider initialMode="light">
        <ThemeCapture contextRef={contextRef} />
      </ThemeProvider>
    );

    expect(contextRef.current?.themeMode).toBe('light');
    expect(contextRef.current?.isDarkTheme).toBe(false);
  });

  it('changes theme when setThemeByName is called', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setThemeByName('dracula');
    });

    expect(result.current.themeName).toBe('dracula');
    expect(result.current.theme).toBe(themes.dracula);
  });

  it('changes theme mode when setThemeMode is called', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setThemeMode('light');
    });

    expect(result.current.themeMode).toBe('light');
    expect(result.current.isDarkTheme).toBe(false);
    expect(result.current.themeName).toBe('default-light');

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.isDarkTheme).toBe(true);
    expect(result.current.themeName).toBe('default');
  });

  it('toggles theme mode when toggleThemeMode is called', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider initialMode="dark">{children}</ThemeProvider>,
    });

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.isDarkTheme).toBe(true);

    act(() => {
      result.current.toggleThemeMode();
    });

    expect(result.current.themeMode).toBe('light');
    expect(result.current.isDarkTheme).toBe(false);

    act(() => {
      result.current.toggleThemeMode();
    });

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.isDarkTheme).toBe(true);
  });

  it('toggles from system theme to the opposite of system preference', () => {
    // Mock that system prefers dark mode
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider initialMode="system">{children}</ThemeProvider>,
    });

    expect(result.current.themeMode).toBe('system');
    expect(result.current.isDarkTheme).toBe(true);

    act(() => {
      result.current.toggleThemeMode();
    });

    // Should toggle to light since system preference is dark
    expect(result.current.themeMode).toBe('light');
    expect(result.current.isDarkTheme).toBe(false);
  });

  it('saves theme preference to localStorage', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setThemeByName('atom-one');
    });

    expect(localStorage.getItem('claude-code-theme')).toBe('atom-one');
    
    act(() => {
      result.current.setThemeMode('light');
    });
    
    expect(localStorage.getItem('claude-code-theme-mode')).toBe('light');
  });

  it('loads theme preference from localStorage', () => {
    // Set up localStorage with theme preferences
    localStorage.setItem('claude-code-theme', 'dracula');
    localStorage.setItem('claude-code-theme-mode', 'dark');
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    
    // Initial render should load from localStorage
    expect(result.current.themeName).toBe('dracula');
    expect(result.current.themeMode).toBe('dark');
  });

  it('handles system theme preference changes', () => {
    let mediaQueryCallback: ((e: MediaQueryListEvent) => void) | null = null;
    
    // Set up mock to capture the callback
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false, // Initially light
      addEventListener: (event: string, callback: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') mediaQueryCallback = callback;
      },
      removeEventListener: jest.fn()
    }));
    
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider initialMode="system">{children}</ThemeProvider>,
    });
    
    // Initially should be light theme due to system preference
    expect(result.current.isDarkTheme).toBe(false);
    
    // Simulate system preference change to dark
    if (mediaQueryCallback) {
      act(() => {
        mediaQueryCallback({ matches: true } as MediaQueryListEvent);
      });
    }
    
    // Should update to dark theme
    expect(result.current.isDarkTheme).toBe(true);
  });

  it('throws error when useTheme is used outside of ThemeProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
    
    console.error = originalError;
  });
});