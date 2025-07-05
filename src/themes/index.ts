/**
 * Themes System
 * 
 * This module provides a comprehensive theming system for the CLI UI.
 * It includes multiple built-in themes and the ability to create custom themes.
 */

import { Colors } from '../ui/colors.js';

/**
 * Theme interface definition
 */
export interface Theme {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly author?: string;
  readonly version?: string;
  readonly isDark: boolean;
  readonly colors: {
    // Base colors
    readonly primary: string;
    readonly secondary: string;
    
    // Brand colors
    readonly brand: string;
    readonly accent: string;
    readonly gradient?: readonly string[];
    
    // Text colors
    readonly text: string;
    readonly textMuted: string;
    readonly textDim: string;
    
    // Background colors
    readonly background: string;
    readonly backgroundAlt: string;
    
    // UI state colors
    readonly success: string;
    readonly info: string;
    readonly warning: string;
    readonly error: string;
    
    // UI element colors
    readonly border: string;
    readonly inputBackground?: string;
    readonly inputBorder?: string;
    readonly inputForeground?: string;
    
    // Code colors
    readonly codeBackground: string;
    readonly codeForeground: string;
    readonly codeSyntax: {
      readonly keyword: string;
      readonly string: string;
      readonly number: string;
      readonly comment: string;
      readonly function: string;
      readonly operator: string;
      readonly variable: string;
      readonly type: string;
      readonly property: string;
    };
  };
}

/**
 * Default dark theme
 */
export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  description: 'Default dark theme with vibrant accents',
  author: 'Vibex Team',
  version: '1.0.0',
  isDark: true,
  colors: {
    // Base colors
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    
    // Brand colors
    brand: '#00A3FF',
    accent: '#00CCFF',
    gradient: Colors.GradientColors || ['#00A3FF', '#00CCFF', '#45B4FF'],
    
    // Text colors
    text: Colors.Text,
    textMuted: Colors.TextMuted,
    textDim: Colors.TextDim,
    
    // Background colors
    background: Colors.Background,
    backgroundAlt: Colors.BackgroundAlt,
    
    // UI state colors
    success: Colors.Success,
    info: Colors.Info,
    warning: Colors.Warning,
    error: Colors.Error,
    
    // UI element colors
    border: Colors.Border,
    inputBackground: Colors.Gray800,
    inputBorder: Colors.Gray600,
    inputForeground: Colors.Text,
    
    // Code colors
    codeBackground: Colors.CodeBackground,
    codeForeground: Colors.Text,
    codeSyntax: {
      keyword: '#C586C0',
      string: '#CE9178',
      number: '#B5CEA8',
      comment: '#6A9955',
      function: '#DCDCAA',
      operator: '#D4D4D4',
      variable: '#9CDCFE',
      type: '#4EC9B0',
      property: '#9CDCFE'
    }
  }
};

/**
 * Light theme
 */
export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  description: 'Light theme with high contrast',
  author: 'Vibex Team',
  version: '1.0.0',
  isDark: false,
  colors: {
    // Base colors
    primary: '#0070F3',
    secondary: '#0095FF',
    
    // Brand colors
    brand: '#0070F3',
    accent: '#0095FF',
    gradient: ['#0070F3', '#0095FF', '#00D8FF'],
    
    // Text colors
    text: '#1A1A1A',
    textMuted: '#666666',
    textDim: '#888888',
    
    // Background colors
    background: '#FFFFFF',
    backgroundAlt: '#F5F5F5',
    
    // UI state colors
    success: '#00C853',
    info: '#0095FF',
    warning: '#FFA000',
    error: '#F44336',
    
    // UI element colors
    border: '#E0E0E0',
    inputBackground: '#FFFFFF',
    inputBorder: '#CCCCCC',
    inputForeground: '#1A1A1A',
    
    // Code colors
    codeBackground: '#F5F5F5',
    codeForeground: '#1A1A1A',
    codeSyntax: {
      keyword: '#7100A3',
      string: '#A31515',
      number: '#098658',
      comment: '#008000',
      function: '#795E26',
      operator: '#000000',
      variable: '#001080',
      type: '#267F99',
      property: '#001080'
    }
  }
};

/**
 * Dracula theme
 */
export const draculaTheme: Theme = {
  id: 'dracula',
  name: 'Dracula',
  description: 'Dark theme based on Dracula color scheme',
  author: 'Vibex Team',
  version: '1.0.0',
  isDark: true,
  colors: {
    // Base colors
    primary: '#BD93F9',
    secondary: '#FF79C6',
    
    // Brand colors
    brand: '#8BE9FD',
    accent: '#FF79C6',
    gradient: ['#BD93F9', '#FF79C6', '#8BE9FD'],
    
    // Text colors
    text: '#F8F8F2',
    textMuted: '#BDB8AE',
    textDim: '#6272A4',
    
    // Background colors
    background: '#282A36',
    backgroundAlt: '#44475A',
    
    // UI state colors
    success: '#50FA7B',
    info: '#8BE9FD',
    warning: '#FFB86C',
    error: '#FF5555',
    
    // UI element colors
    border: '#6272A4',
    inputBackground: '#44475A',
    inputBorder: '#6272A4',
    inputForeground: '#F8F8F2',
    
    // Code colors
    codeBackground: '#282A36',
    codeForeground: '#F8F8F2',
    codeSyntax: {
      keyword: '#FF79C6',
      string: '#F1FA8C',
      number: '#BD93F9',
      comment: '#6272A4',
      function: '#50FA7B',
      operator: '#FF79C6',
      variable: '#F8F8F2',
      type: '#8BE9FD',
      property: '#FF79C6'
    }
  }
};

/**
 * Nord theme
 */
export const nordTheme: Theme = {
  id: 'nord',
  name: 'Nord',
  description: 'Arctic, north-bluish clean color theme',
  author: 'Vibex Team',
  version: '1.0.0',
  isDark: true,
  colors: {
    // Base colors
    primary: '#88C0D0',
    secondary: '#81A1C1',
    
    // Brand colors
    brand: '#8FBCBB',
    accent: '#88C0D0',
    gradient: ['#8FBCBB', '#88C0D0', '#81A1C1'],
    
    // Text colors
    text: '#ECEFF4',
    textMuted: '#D8DEE9',
    textDim: '#E5E9F0',
    
    // Background colors
    background: '#2E3440',
    backgroundAlt: '#3B4252',
    
    // UI state colors
    success: '#A3BE8C',
    info: '#88C0D0',
    warning: '#EBCB8B',
    error: '#BF616A',
    
    // UI element colors
    border: '#4C566A',
    inputBackground: '#3B4252',
    inputBorder: '#4C566A',
    inputForeground: '#ECEFF4',
    
    // Code colors
    codeBackground: '#3B4252',
    codeForeground: '#ECEFF4',
    codeSyntax: {
      keyword: '#81A1C1',
      string: '#A3BE8C',
      number: '#B48EAD',
      comment: '#4C566A',
      function: '#88C0D0',
      operator: '#81A1C1',
      variable: '#D8DEE9',
      type: '#8FBCBB',
      property: '#D8DEE9'
    }
  }
};

/**
 * All available themes
 */
export const themes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  dracula: draculaTheme,
  nord: nordTheme
};

/**
 * Default theme
 */
export const defaultTheme = darkTheme;

/**
 * Get a theme by ID
 */
export function getTheme(themeId: string): Theme {
  return themes[themeId] || defaultTheme;
}

/**
 * Apply a theme to the UI
 */
export function applyTheme(theme: Theme): void {
  // This would be implemented to update CSS variables or context
  // For now, we're using the theme object directly in components
}

export default themes;