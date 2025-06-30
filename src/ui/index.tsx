/**
 * UI Module Entry Point
 * 
 * This module serves as the main entry point for the React-based UI system.
 * It provides the renderer function to start the UI in the terminal.
 */

import React from 'react';
import { render } from 'ink';
import { AppWrapper } from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { OverflowProvider } from './contexts/OverflowContext';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../config/index.js';

/**
 * Options for starting the UI
 */
export interface StartUIOptions {
  /**
   * Initial theme to use
   */
  theme?: string;
  
  /**
   * Optional warnings to display at startup
   */
  startupWarnings?: string[];
}

/**
 * Start the terminal UI
 * 
 * @param options - UI startup options
 * @returns Ink instance
 */
export async function startUI(options: StartUIOptions = {}) {
  try {
    // Load configuration
    const config = await loadConfig();
    
    // Get theme setting from config or options
    const theme = options.theme || config.terminal?.theme || 'dark';
    
    // Create app instance
    const { waitUntilExit } = render(
      <ThemeProvider initialTheme={theme}>
        <AppWrapper 
          config={config} 
          startupWarnings={options.startupWarnings}
        />
      </ThemeProvider>
    );

    // Wait for the app to exit
    await waitUntilExit();
  } catch (error) {
    logger.error('Error starting UI:', error);
    throw error;
  }
}

/**
 * Re-export types and components for external use
 */
export * from './types';
export * from './components/Header';
export * from './components/Footer';
export * from './components/LoadingIndicator';
export * from './components/HistoryItemDisplay';
export * from './contexts/ThemeContext';
export * from './contexts/SessionContext';
export * from './contexts/StreamingContext';
export * from './contexts/OverflowContext';