/**
 * UI Module Entry Point
 * 
 * This module serves as the main entry point for the React-based UI system.
 * It provides the renderer function to start the UI in the terminal using the main App component.
 */

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { OverflowProvider } from './contexts/OverflowContext.js';
import { ProgressProvider } from './contexts/ProgressContext.js';
import { SessionStatsProvider } from './contexts/SessionContext.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../config/index.js';
import type { AppConfigType } from '../config/schema.js';

/**
 * Options for starting the UI
 */
export interface StartUIOptions {
  /**
   * Application configuration
   */
  config: AppConfigType;
  
  /**
   * Initial context to pass to the chat
   */
  initialContext?: string;
  
  /**
   * Pre-loaded project context (Gemini-style)
   */
  preloadedContext?: string;
  
  /**
   * Optional warnings to display at startup
   */
  startupWarnings?: string[];
  
  /**
   * Update message to display
   */
  updateMessage?: string | null;
  
  /**
   * Callback when the app exits
   */
  onExit?: () => void;
}

/**
 * UI component props
 */
interface UIProps {
  /**
   * Application configuration
   */
  config: AppConfigType;
}

/**
 * App wrapper with all necessary providers
 */
const AppWrapper: React.FC<StartUIOptions> = ({ config, initialContext, startupWarnings = [], updateMessage = null, onExit }) => (
    <ThemeProvider>
      <OverflowProvider>
        <ProgressProvider>
          <SessionStatsProvider>
            <App 
              config={config}
              initialContext={initialContext}
              startupWarnings={startupWarnings}
              updateMessage={updateMessage}
              onExit={onExit}
            />
          </SessionStatsProvider>
        </ProgressProvider>
      </OverflowProvider>
    </ThemeProvider>
  );

/**
 * Start the UI with the given options
 */
export async function startUI(options: StartUIOptions) {
  logger.info('Starting UI with main App component');
  
  // Pre-load project context once at startup (Gemini-style approach)
  let preloadedContext = '';
  try {
    logger.info('📁 Pre-loading project context...');
    const { createContextSystem } = await import('../context/context-system.js');
    const contextSystem = createContextSystem();
    const contextResult = await contextSystem.loadContext();
    
    if (contextResult.stats.totalFiles > 0) {
      // Build context section for system prompt
      preloadedContext = '\n\n# PROJECT CONTEXT\n\n';
      preloadedContext += `You are working in the "${process.cwd().split('/').pop()}" project. `;
      preloadedContext += `Here is the relevant project context from ${contextResult.stats.totalFiles} files:\n\n`;
      
      // Add context entries (limit to prevent overwhelming)
      const maxEntries = 10;
      const entries = contextResult.entries.slice(0, maxEntries);
      for (const entry of entries) {
        preloadedContext += `## ${entry.path}\n\n${entry.content.slice(0, 2000)}\n\n`;
      }
      
      logger.info(`✅ Project context pre-loaded: ${contextResult.stats.totalFiles} files, ${contextResult.stats.totalSize} chars`);
    } else {
      logger.info('📁 No project context files found');
    }
  } catch (error) {
    logger.warn('⚠️ Could not pre-load project context:', error);
  }
  
  return render(
    <AppWrapper 
      {...options} 
      preloadedContext={preloadedContext}
    />,
    { 
      exitOnCtrlC: false,
      patchConsole: false
    }
  );
}



/**
 * Re-export types and components for external use
 */
export * from './types.js';
export * from './components/Header.js';
export * from './components/Footer.js';
export * from './components/LoadingIndicator.js';
export * from './components/HistoryItemDisplay.js';
export * from './contexts/ThemeContext.js';
export * from './contexts/SessionContext.js';
export * from './contexts/StreamingContext.js';
export * from './contexts/OverflowContext.js';