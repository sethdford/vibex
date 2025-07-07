/**
 * UI Colors
 * 
 * This module defines the color palette used throughout the UI.
 * It provides consistent color references for all components.
 * 
 * NOTE: These are default colors that can be overridden by themes.
 * See the themes directory for theme-specific color palettes.
 */

/**
 * Primary colors
 */
export const Colors = {
  // Brand colors
  Primary: '#00A3FF',
  Secondary: '#00CCFF',
  
  // Gradient colors for brand elements
  GradientColors: ['#00A3FF', '#00CCFF', '#45B4FF'],
  
  // UI state colors
  Success: '#3EBD93',
  Warning: '#FFC53D',
  Error: '#E53E3E',
  Info: '#63B3ED',
  
  // Text colors
  Text: '#F8F9FA',
  TextMuted: '#A0AEC0',
  TextDim: '#718096',
  
  // Background colors
  Background: '#1A202C',
  BackgroundAlt: '#2D3748',
  DimBackground: '#242C3D', // Slightly brighter for selection backgrounds
  
  // Accent colors
  AccentBlue: '#4299E1',
  AccentGreen: '#48BB78',
  AccentRed: '#F56565',
  AccentYellow: '#ECC94B',
  AccentPurple: '#9F7AEA',
  AccentCyan: '#0BC5EA',
  AccentOrange: '#ED8936', // New orange accent for medium severity issues
  
  // Special use colors
  Border: '#4A5568',
  Code: '#805AD5',
  CodeBackground: '#2D3748',
  Link: '#90CDF4',
  
  // Grayscale
  Black: '#000000',
  White: '#FFFFFF',
  Gray100: '#F7FAFC',
  Gray200: '#EDF2F7',
  Gray300: '#E2E8F0',
  Gray400: '#CBD5E0',
  Gray500: '#A0AEC0',
  Gray600: '#718096',
  Gray700: '#4A5568',
  Gray800: '#2D3748',
  Gray900: '#1A202C'
};

/**
 * Syntax highlighting colors for code blocks
 */
export interface SyntaxColors {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  operator: string;
  function: string;
  class: string;
  type: string;
  variable: string;
  tag: string;
  attribute: string;
  property: string;
  constant: string;
  symbol: string;
  builtin: string;
  regex: string;
}

/**
 * Default syntax highlighting colors
 */
export const SyntaxColors = {
  // Keywords
  Keyword: '#C792EA',
  
  // Values
  String: '#FFCB6B',
  Number: '#F78C6C',
  Boolean: '#FF5874',
  Null: '#FF5874',
  
  // Variables and symbols
  Variable: '#82AAFF',
  Function: '#82AAFF',
  Class: '#FFCB6B',
  Property: '#B2CCD6',
  
  // Comments and metadata
  Comment: '#546E7A',
  DocComment: '#6A9955',
  
  // Operators and punctuation
  Operator: '#89DDFF',
  Punctuation: '#89DDFF',
  
  // Special
  Regex: '#F78C6C',
  Escape: '#89DDFF',
  Tag: '#FF5572',
  Attribute: '#82AAFF'
};

/**
 * Theme palette for dark mode
 */
export const DarkTheme = {
  // Base colors
  background: Colors.Background,
  foreground: Colors.Text,
  
  // Accent colors
  primary: Colors.Primary,
  secondary: Colors.Secondary,
  
  // Status colors
  success: Colors.Success,
  warning: Colors.Warning, 
  error: Colors.Error,
  info: Colors.Info,
  
  // Text variations
  textMuted: Colors.TextMuted,
  textDim: Colors.TextDim,
  
  // Borders and separators
  border: Colors.Border,
  
  // Code colors
  codeBackground: Colors.CodeBackground,
  codeText: Colors.Gray100,
  
  // Input fields
  inputBackground: Colors.Gray800,
  inputBorder: Colors.Gray600,
  inputFocusBorder: Colors.Primary,
  inputPlaceholder: Colors.Gray500,
  
  // UI elements
  uiElement: Colors.Gray700,
  uiElementHover: Colors.Gray600,
  uiElementActive: Colors.Primary
};

/**
 * Theme palette for light mode
 */
export const LightTheme = {
  // Base colors
  background: Colors.Gray100,
  foreground: Colors.Gray900,
  
  // Accent colors
  primary: Colors.Primary,
  secondary: Colors.Secondary,
  
  // Status colors
  success: Colors.Success,
  warning: Colors.Warning,
  error: Colors.Error,
  info: Colors.Info,
  
  // Text variations
  textMuted: Colors.Gray600,
  textDim: Colors.Gray500,
  
  // Borders and separators
  border: Colors.Gray400,
  
  // Code colors
  codeBackground: Colors.Gray200,
  codeText: Colors.Gray900,
  
  // Input fields
  inputBackground: Colors.White,
  inputBorder: Colors.Gray400,
  inputFocusBorder: Colors.Primary,
  inputPlaceholder: Colors.Gray500,
  
  // UI elements
  uiElement: Colors.Gray300,
  uiElementHover: Colors.Gray400,
  uiElementActive: Colors.Primary
};

/**
 * ANSI Color codes for terminal output
 */
export const AnsiColors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',
  
  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m',
  FgGray: '\x1b[90m',
  
  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m',
  BgGray: '\x1b[100m'
};