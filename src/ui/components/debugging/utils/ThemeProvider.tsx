/**
 * Theme Provider for Debugging Interface
 * 
 * Provides theming capabilities for the debugging interface components.
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Colors as DefaultColors } from '../../../colors.js';

/**
 * Debug theme interface
 */
export interface DebugTheme {
  // Base colors
  primary: string;
  secondary: string;
  background: string;
  backgroundAlt: string;
  backgroundSelected: string;
  backgroundHighlight: string;
  border: string;
  text: string;
  textDim: string;
  foregroundSelected: string;
  foregroundHighlight: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Accent colors
  accentBlue: string;
  accentGreen: string;
  accentRed: string;
  accentYellow: string;
  accentPurple: string;
  accentCyan: string;
  accentOrange: string;
}

/**
 * Default debug theme based on the existing Colors
 */
export const defaultDebugTheme: DebugTheme = {
  primary: DefaultColors.Primary,
  secondary: DefaultColors.Secondary,
  background: DefaultColors.Background,
  backgroundAlt: DefaultColors.BackgroundAlt,
  backgroundSelected: DefaultColors.BackgroundSelected,
  backgroundHighlight: DefaultColors.BackgroundHighlight,
  border: DefaultColors.Border,
  text: DefaultColors.Text,
  textDim: DefaultColors.TextDim,
  foregroundSelected: DefaultColors.ForegroundSelected,
  foregroundHighlight: DefaultColors.ForegroundHighlight,
  
  success: DefaultColors.Success,
  warning: DefaultColors.Warning,
  error: DefaultColors.Error,
  info: DefaultColors.Info,
  
  accentBlue: DefaultColors.AccentBlue,
  accentGreen: DefaultColors.AccentGreen,
  accentRed: DefaultColors.AccentRed,
  accentYellow: DefaultColors.AccentYellow,
  accentPurple: DefaultColors.AccentPurple,
  accentCyan: DefaultColors.AccentCyan,
  accentOrange: DefaultColors.AccentOrange
};

/**
 * Dark theme for debugging interface
 */
export const darkDebugTheme: DebugTheme = {
  ...defaultDebugTheme,
  background: '#1e1e1e',
  backgroundAlt: '#252526',
  backgroundSelected: '#264f78',
  backgroundHighlight: '#3a3d41',
  text: '#d4d4d4',
  textDim: '#858585',
  border: '#454545'
};

/**
 * Light theme for debugging interface
 */
export const lightDebugTheme: DebugTheme = {
  ...defaultDebugTheme,
  background: '#ffffff',
  backgroundAlt: '#f3f3f3',
  backgroundSelected: '#add6ff',
  backgroundHighlight: '#e8e8e8',
  text: '#333333',
  textDim: '#777777',
  border: '#cccccc',
  primary: '#0066cc'
};

/**
 * Theme context interface
 */
interface DebugThemeContextType {
  theme: DebugTheme;
  setTheme: (theme: DebugTheme) => void;
  toggleTheme: () => void;
}

/**
 * Create theme context with default value
 */
const DebugThemeContext = createContext<DebugThemeContextType>({
  theme: defaultDebugTheme,
  setTheme: () => {},
  toggleTheme: () => {}
});

/**
 * Theme provider props
 */
interface ThemeProviderProps {
  initialTheme?: DebugTheme;
  children: React.ReactNode;
}

/**
 * Theme provider component
 */
export const DebugThemeProvider: React.FC<ThemeProviderProps> = ({ 
  initialTheme = defaultDebugTheme,
  children 
}) => {
  // Theme state
  const [theme, setThemeState] = useState<DebugTheme>(initialTheme);
  
  // Set theme function
  const setTheme = useCallback((newTheme: DebugTheme) => {
    setThemeState(newTheme);
  }, []);
  
  // Toggle between dark and light themes
  const toggleTheme = useCallback(() => {
    setThemeState(currentTheme => {
      if (currentTheme.background === darkDebugTheme.background) {
        return lightDebugTheme;
      } else {
        return darkDebugTheme;
      }
    });
  }, []);
  
  // Context value
  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme
  }), [theme, setTheme, toggleTheme]);
  
  return (
    <DebugThemeContext.Provider value={contextValue}>
      {children}
    </DebugThemeContext.Provider>
  );
};

/**
 * Hook to use debug theme
 * 
 * @returns Theme context value
 */
export const useDebugTheme = () => {
  const context = useContext(DebugThemeContext);
  
  if (!context) {
    throw new Error('useDebugTheme must be used within a DebugThemeProvider');
  }
  
  return context;
};