/**
 * Theme Interface
 * 
 * Defines the structure of a UI theme
 */

import type { SyntaxColors } from '../colors.js';

/**
 * Theme interface
 */
export interface Theme {
  /**
   * Theme name
   */
  name: string;
  
  /**
   * Whether this is a dark theme
   */
  isDark: boolean;
  
  /**
   * UI colors
   */
  ui: {
    /**
     * Primary UI color
     */
    primary: string;
    
    /**
     * Secondary UI color
     */
    secondary: string;
    
    /**
     * Success color
     */
    success: string;
    
    /**
     * Error color
     */
    error: string;
    
    /**
     * Warning color
     */
    warning: string;
    
    /**
     * Info color
     */
    info: string;
    
    /**
     * Main text color
     */
    text: string;
    
    /**
     * Dimmed text color
     */
    textDim: string;
    
    /**
     * Background color (for elements that need it)
     */
    background: string;
  };
  
  /**
   * Syntax highlighting colors
   */
  syntax: SyntaxColors;
}

/**
 * Theme option for selection
 */
export interface ThemeOption {
  /**
   * Theme name
   */
  name: string;
  
  /**
   * Display label
   */
  label: string;
  
  /**
   * Theme mode
   */
  mode: 'dark' | 'light';
  
  /**
   * Theme preview color (primary color)
   */
  previewColor: string;
}

/**
 * Theme mode
 */
export type ThemeMode = 'dark' | 'light' | 'system';