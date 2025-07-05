/**
 * Unified Theme Provider - Consolidates all theme systems
 * 
 * This provider merges the functionality from:
 * - ThemeContext.tsx (advanced theme management with multiple themes)
 * - ThemeProvider.tsx (simple light/dark toggle with CSS variables)
 * 
 * Provides both interfaces for backward compatibility while consolidating code.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { themes } from '../themes/theme-manager.js';
import type { Theme } from '../themes/theme.js';

// Type definitions
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Extended theme interface that includes both systems
 */
export interface UnifiedTheme extends Theme {
  // Additional properties for CSS variable system
  cssVariables?: Record<string, string>;
}

/**
 * Unified theme context interface
 * Combines both theme system interfaces for full compatibility
 */
export interface UnifiedThemeContextType {
  // From ThemeContext.tsx (advanced theme management)
  theme: UnifiedTheme;
  themeName: string;
  themeMode: ThemeMode;
  themes: Record<string, UnifiedTheme>;
  setThemeByName: (name: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  isDarkTheme: boolean;
  
  // From ThemeProvider.tsx (simple toggle system)
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  isLoading: boolean;
  
  // Additional unified features
  availableThemes: string[];
  currentThemeType: 'light' | 'dark';
}

/**
 * Check if system prefers dark mode
 */
function systemPrefersDarkMode(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/**
 * Get theme based on name and system preference
 */
function getUnifiedTheme(themeName: string, systemDarkMode: boolean): UnifiedTheme {
  const theme = themes[themeName];
  if (theme) {
    return theme as UnifiedTheme;
  }
  
  // Fallback to default theme based on system preference
  const fallbackTheme = systemDarkMode ? themes.default : themes['default-light'] || themes.default;
  return fallbackTheme as UnifiedTheme;
}

/**
 * Apply theme CSS variables to document root
 */
function applyThemeCSSVariables(theme: UnifiedTheme): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Apply UI colors (using the actual theme interface)
  if (theme.ui) {
    Object.entries(theme.ui).forEach(([key, value]) => {
      root.style.setProperty(`--color-ui-${key}`, value);
    });
  }
  
  // Apply syntax colors
  if (theme.syntax) {
    Object.entries(theme.syntax).forEach(([key, value]) => {
      root.style.setProperty(`--color-syntax-${key}`, value);
    });
  }
  
  // Apply custom CSS variables if provided
  if (theme.cssVariables) {
    Object.entries(theme.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}

/**
 * Create the unified theme context
 */
const UnifiedThemeContext = createContext<UnifiedThemeContextType | undefined>(undefined);

/**
 * Unified theme provider props
 */
export interface UnifiedThemeProviderProps {
  children: ReactNode;
  initialTheme?: string;
  initialMode?: ThemeMode;
  defaultTheme?: 'light' | 'dark';
  storageKey?: string;
}

/**
 * Unified Theme Provider Component
 * 
 * Provides both theme system interfaces for full compatibility
 */
export const UnifiedThemeProvider: React.FC<UnifiedThemeProviderProps> = ({
  children,
  initialTheme = 'default',
  initialMode = 'system',
  defaultTheme = 'light',
  storageKey = 'vibex-unified-theme',
}) => {
  // State management
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);
  const [themeName, setThemeName] = useState<string>(initialTheme);
  const [systemDarkMode, setSystemDarkMode] = useState<boolean>(systemPrefersDarkMode());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Watch for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setIsLoading(false);
      return;
    }
    
    try {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setSystemDarkMode(e.matches);
      };
      
      darkModeMediaQuery.addEventListener('change', handleChange);
      
      return () => {
        darkModeMediaQuery.removeEventListener('change', handleChange);
      };
    } catch (error) {
      // Media queries not supported - ignore silently
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load saved theme from localStorage
  useEffect(() => {
    if (typeof localStorage === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    try {
      const savedThemeMode = localStorage.getItem(`${storageKey}-mode`) as ThemeMode;
      const savedThemeName = localStorage.getItem(`${storageKey}-name`);
      
      if (savedThemeMode && ['light', 'dark', 'system'].includes(savedThemeMode)) {
        setThemeMode(savedThemeMode);
      }
      
      if (savedThemeName && themes[savedThemeName]) {
        setThemeName(savedThemeName);
      }
    } catch (error) {
      // Local storage might not be available - ignore silently
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);
  
  // Save theme to localStorage when it changes
  useEffect(() => {
    if (isLoading || typeof localStorage === 'undefined') return;
    
    try {
      localStorage.setItem(`${storageKey}-mode`, themeMode);
      localStorage.setItem(`${storageKey}-name`, themeName);
    } catch (error) {
      // Local storage might not be available - ignore silently
    }
  }, [themeMode, themeName, storageKey, isLoading]);
  
  // Set theme by name (advanced theme management)
  const setThemeByName = useCallback((name: string) => {
    if (themes[name]) {
      setThemeName(name);
      // Keep current theme mode when switching themes
    }
  }, []);
  
  // Set theme mode (light/dark/system)
  const setThemeModeHandler = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    
    // Adjust theme name based on mode if using default themes
    if (themeName === 'default' || themeName === 'default-light') {
      if (mode === 'light') {
        setThemeName('default-light');
      } else if (mode === 'dark') {
        setThemeName('default');
      } else {
        // System mode - use appropriate default
        setThemeName(systemDarkMode ? 'default' : 'default-light');
      }
    }
  }, [themeName, systemDarkMode]);
  
  // Toggle between light and dark modes
  const toggleThemeMode = useCallback(() => {
    if (themeMode === 'system') {
      // If current mode is system, toggle to the opposite of system preference
      setThemeModeHandler(systemDarkMode ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setThemeModeHandler(themeMode === 'dark' ? 'light' : 'dark');
    }
  }, [themeMode, systemDarkMode, setThemeModeHandler]);
  
  // Simple theme toggle (compatibility with simple theme system)
  const toggleTheme = useCallback(() => {
    const currentType = themeMode === 'system' ? (systemDarkMode ? 'dark' : 'light') : themeMode;
    setThemeModeHandler(currentType === 'dark' ? 'light' : 'dark');
  }, [themeMode, systemDarkMode, setThemeModeHandler]);
  
  // Set theme (compatibility with simple theme system)
  const setTheme = useCallback((theme: 'light' | 'dark') => {
    setThemeModeHandler(theme);
  }, [setThemeModeHandler]);
  
  // Get current theme
  const currentTheme = getUnifiedTheme(themeName, systemDarkMode);
  const isDarkTheme = themeMode === 'system' ? systemDarkMode : themeMode === 'dark';
  const currentThemeType: 'light' | 'dark' = isDarkTheme ? 'dark' : 'light';
  
  // Apply CSS variables when theme changes
  useEffect(() => {
    if (!isLoading) {
      applyThemeCSSVariables(currentTheme);
    }
  }, [currentTheme, isLoading]);
  
  // Context value
  const value: UnifiedThemeContextType = {
    // Advanced theme management interface
    theme: currentTheme,
    themeName,
    themeMode,
    themes: themes as Record<string, UnifiedTheme>,
    setThemeByName,
    setThemeMode: setThemeModeHandler,
    toggleThemeMode,
    isDarkTheme,
    
    // Simple theme system interface
    toggleTheme,
    setTheme,
    isLoading,
    
    // Additional unified features
    availableThemes: Object.keys(themes),
    currentThemeType,
  };
  
  return (
    <UnifiedThemeContext.Provider value={value}>
      {children}
    </UnifiedThemeContext.Provider>
  );
};

/**
 * Hook to use the unified theme context
 */
export const useUnifiedTheme = (): UnifiedThemeContextType => {
  const context = useContext(UnifiedThemeContext);
  if (context === undefined) {
    throw new Error('useUnifiedTheme must be used within a UnifiedThemeProvider');
  }
  return context;
};

/**
 * Compatibility hook for existing code using useTheme
 */
export const useTheme = (): UnifiedThemeContextType => {
  return useUnifiedTheme();
};

/**
 * Utility function to get theme color by path
 */
export const getThemeColor = (theme: UnifiedTheme, colorPath: string): string => {
  const parts = colorPath.split('.');
  let current: any = theme;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to primary text color
      return theme.ui?.text || '#000000';
    }
  }
  
  return typeof current === 'string' ? current : theme.ui?.text || '#000000';
};

export default UnifiedThemeProvider; 