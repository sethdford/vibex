/**
 * UI Constants
 * 
 * This module defines constants used throughout the UI system.
 * It provides centralized values for sizing, timing, and other UI parameters.
 */

/**
 * Timing constants (in milliseconds)
 */
export const TIMING = {
  /**
   * Animation duration for transitions
   */
  ANIMATION_DURATION: 300,
  
  /**
   * Debounce delay for input handling
   */
  DEBOUNCE_DELAY: 150,
  
  /**
   * Auto-save interval
   */
  AUTO_SAVE_INTERVAL: 10000,
  
  /**
   * Loading phrases rotation interval
   */
  LOADING_PHRASE_INTERVAL: 5000,
  
  /**
   * Loading spinner interval
   */
  SPINNER_INTERVAL: 80,
  
  /**
   * Tool execution timeout
   */
  TOOL_EXECUTION_TIMEOUT: 30000,
  
  /**
   * Authentication timeout
   */
  AUTH_TIMEOUT: 60000,
  
  /**
   * Notification display duration
   */
  NOTIFICATION_DURATION: 5000,
  
  /**
   * Exit prompt duration (for double-press detection)
   */
  EXIT_PROMPT_DURATION: 2000
};

/**
 * Layout constants for UI components
 */
export const LAYOUT = {
  /**
   * Default margin size
   */
  DEFAULT_MARGIN: 1,
  
  /**
   * Default padding size
   */
  DEFAULT_PADDING: 1,
  
  /**
   * Width percentage for main content
   */
  MAIN_WIDTH_PERCENTAGE: 0.9,
  
  /**
   * Maximum height percentage for history items
   */
  MAX_HISTORY_HEIGHT_PERCENTAGE: 0.7,
  
  /**
   * Maximum width for message content
   */
  MAX_MESSAGE_WIDTH: 120,
  
  /**
   * Minimum width for input field
   */
  MIN_INPUT_WIDTH: 30,
  
  /**
   * Maximum height for input field
   */
  MAX_INPUT_HEIGHT: 10,
  
  /**
   * Width for suggestions panel
   */
  SUGGESTIONS_WIDTH_PERCENTAGE: 0.8,
  
  /**
   * Maximum number of visible suggestions
   */
  MAX_VISIBLE_SUGGESTIONS: 5
};

/**
 * String constants for UI elements
 */
export const STRINGS = {
  /**
   * Application name
   */
  APP_NAME: 'Claude Code',
  
  /**
   * Application version
   */
  APP_VERSION: '0.1.0',
  
  /**
   * Default loading message
   */
  DEFAULT_LOADING_MESSAGE: 'Claude is thinking...',
  
  /**
   * Error prefix for error messages
   */
  ERROR_PREFIX: 'Error: ',
  
  /**
   * Help command to show help
   */
  HELP_COMMAND: '/help',
  
  /**
   * Quit command to exit the application
   */
  QUIT_COMMAND: '/quit',
  
  /**
   * Clear command to clear the conversation
   */
  CLEAR_COMMAND: '/clear',
  
  /**
   * Exit confirmation message
   */
  EXIT_CONFIRMATION: 'Press Ctrl+C again to exit.'
};

/**
 * Loading phrases to display while Claude is thinking
 */
export const LOADING_PHRASES = [
  'Thinking...',
  'Analyzing code...',
  'Exploring solutions...',
  'Processing your request...',
  'Examining context...',
  'Generating response...',
  'Considering alternatives...',
  'Synthesizing information...',
  'Finding the best approach...',
  'Looking for patterns...',
  'Applying best practices...'
];

/**
 * ASCII art logo for Claude
 */
export const CLAUDE_ASCII_LOGO = `
   ______   __                           __         ______              __     
  / ____/  / /  ____ _  __  __   ____   / /__      / ____/  ____  ____/ /____ 
 / /      / /  / __ \`/ / / / /  / __ \\ / //_/     / /      / __ \\/ __  // __ \\
/ /___   / /  / /_/ / / /_/ /  / / / // ,<       / /___   / /_/ / /_/ // /_/ /
\\____/  /_/   \\__,_/  \\__,_/  /_/ /_//_/|_|      \\____/   \\____/\\__,_/ \\____/ 
`;

/**
 * Default help text
 */
export const DEFAULT_HELP_TEXT = `
Available Commands:
  ${STRINGS.HELP_COMMAND}            Show this help message
  ${STRINGS.CLEAR_COMMAND}           Clear the conversation history
  ${STRINGS.QUIT_COMMAND}            Exit the application
  /theme           Change the UI theme
  /auth            Configure authentication
  /memory          View or refresh memory from CLAUDE.md files
  /tools           View available tools
  
Keyboard Shortcuts:
  Ctrl+C           Exit (press twice)
  Ctrl+L           Clear screen
  Up/Down          Navigate through command history
  Tab              Autocomplete commands
`;

/**
 * Maximum number of suggestions to show
 */
export const MAX_SUGGESTIONS = 5;

/**
 * Maximum message history to keep
 */
export const MAX_MESSAGE_HISTORY = 100;