/**
 * Theme Context
 * 
 * This context manages theme selection and application for the UI.
 * It provides theme data and theme switching functionality to all components.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Theme, ThemeMode } from '../themes/theme';
import { getTheme, getThemeMode, themes } from '../themes/theme-manager';
import { Colors } from '../colors';

/**
 * Check if system prefers dark mode
 */
function systemPrefersDarkMode(): boolean {
  try {
    // For browser environments
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // For terminal environments, default to dark
    return true;
  } catch (error) {
    return true;
  }
}

/**
 * Interface for the theme context value
 */
interface ThemeContextValue {
  /**
   * Current theme
   */
  theme: Theme;
  
  /**
   * Current theme name
   */
  themeName: string;
  
  /**
   * Current theme mode (light/dark/system)
   */
  themeMode: ThemeMode;
  
  /**
   * All available themes
   */
  themes: Record<string, Theme>;
  
  /**
   * Function to set a new theme by name
   */
  setThemeByName: (name: string) => void;
  
  /**
   * Function to set theme mode
   */
  setThemeMode: (mode: ThemeMode) => void;
  
  /**
   * Function to toggle between light and dark modes
   */
  toggleThemeMode: () => void;
  
  /**
   * Whether the current theme is dark
   */
  isDarkTheme: boolean;
}

/**
 * Create the theme context with default dark theme
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme provider component
 */
export const ThemeProvider: React.FC<{ 
  initialTheme?: string;
  initialMode?: ThemeMode;
  children: React.ReactNode;
}> = ({ 
  initialTheme = 'default',
  initialMode = 'system',
  children 
}) => {
  // Initialize with the specified theme mode
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);
  const [themeName, setThemeName] = useState<string>(initialTheme);
  const [systemDarkMode, setSystemDarkMode] = useState<boolean>(systemPrefersDarkMode());
  
  // Watch for system theme changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e: MediaQueryListEvent) => {
          setSystemDarkMode(e.matches);
        };
        
        // Modern browsers
        darkModeMediaQuery.addEventListener('change', handleChange);
        
        return () => {
          darkModeMediaQuery.removeEventListener('change', handleChange);
        };
      }
    } catch (error) {
      // Media queries not supported
    }
  }, []);
  
  /**
   * Set theme by name
   */
  const setThemeByName = useCallback((name: string) => {
    if (themes[name]) {
      setThemeName(name);
      setThemeMode('system'); // Using a specific theme name overrides mode
      
      // Store theme preference in localStorage
      try {
        localStorage.setItem('claude-code-theme', name);
        localStorage.setItem('claude-code-theme-mode', 'system');
      } catch (error) {
        // Local storage might not be available
      }
    }
  }, []);
  
  /**
   * Set theme mode (light/dark/system)
   */
  const setThemeModeHandler = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    
    // If setting to system, use appropriate default theme
    if (mode === 'system') {
      setThemeName(systemDarkMode ? 'default' : 'default-light');
    } else {
      // When explicitly setting light/dark mode, use appropriate default theme
      setThemeName(mode === 'dark' ? 'default' : 'default-light');
    }
    
    // Store theme preference
    try {
      localStorage.setItem('claude-code-theme-mode', mode);
      localStorage.setItem('claude-code-theme', 
        mode === 'dark' ? 'default' : 
        mode === 'light' ? 'default-light' : 
        systemDarkMode ? 'default' : 'default-light'
      );
    } catch (error) {
      // Local storage might not be available
    }
  }, [systemDarkMode]);
  
  /**
   * Toggle between light and dark modes
   */
  const toggleThemeMode = useCallback(() => {
    if (themeMode === 'system') {
      // If current mode is system, toggle to the opposite of system preference
      setThemeModeHandler(systemDarkMode ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setThemeModeHandler(themeMode === 'dark' ? 'light' : 'dark');
    }
  }, [themeMode, systemDarkMode, setThemeModeHandler]);
  
  /**
   * Load saved theme from localStorage on initial render
   */
  useEffect(() => {
    try {
      const savedThemeMode = localStorage.getItem('claude-code-theme-mode') as ThemeMode;
      const savedThemeName = localStorage.getItem('claude-code-theme');
      
      if (savedThemeMode) {
        setThemeMode(savedThemeMode);
      }
      
      if (savedThemeName && themes[savedThemeName]) {
        setThemeName(savedThemeName);
      }
    } catch (error) {
      // Local storage might not be available
    }
  }, []);
  
  // Get current theme based on theme name and mode
  const isDarkTheme = themeMode === 'system' ? systemDarkMode : themeMode === 'dark';
  const theme = getTheme(themeName, systemDarkMode);
  
  const value = {
    theme,
    themeName,
    themeMode,
    themes,
    setThemeByName,
    setThemeMode: setThemeModeHandler,
    toggleThemeMode,
    isDarkTheme
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme context in components
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};