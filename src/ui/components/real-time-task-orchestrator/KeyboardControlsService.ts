/**
 * Keyboard Controls Service - Clean Architecture
 * 
 * Single Responsibility: Keyboard input handling and shortcuts
 * Following Gemini CLI's focused service patterns
 */

import type { KeyboardShortcuts } from './types.js';
import { logger } from '../../../utils/logger.js';

/**
 * Keyboard action handler type
 */
export type KeyboardActionHandler = () => void | Promise<void>;

/**
 * Keyboard control configuration
 */
export interface KeyboardControlsConfig {
  shortcuts: KeyboardShortcuts;
  enableLogging: boolean;
}

/**
 * Keyboard Controls Service
 * Focus: Keyboard input handling, shortcuts, and user interactions
 */
export class KeyboardControlsService {
  private config: KeyboardControlsConfig;
  private actionHandlers: Map<string, KeyboardActionHandler> = new Map();
  private isActive: boolean = false;

  constructor(config: KeyboardControlsConfig) {
    this.config = config;
    this.setupDefaultHandlers();
  }

  /**
   * Register action handler
   */
  registerHandler(action: string, handler: KeyboardActionHandler): void {
    this.actionHandlers.set(action, handler);
    
    if (this.config.enableLogging) {
      logger.debug('Keyboard handler registered', { action });
    }
  }

  /**
   * Unregister action handler
   */
  unregisterHandler(action: string): void {
    this.actionHandlers.delete(action);
    
    if (this.config.enableLogging) {
      logger.debug('Keyboard handler unregistered', { action });
    }
  }

  /**
   * Handle keyboard input
   */
  async handleInput(input: string, key: any): Promise<boolean> {
    if (!this.isActive) return false;

    try {
      // Handle single character shortcuts
      const action = this.mapInputToAction(input, key);
      
      if (action) {
        const handler = this.actionHandlers.get(action);
        
        if (handler) {
          if (this.config.enableLogging) {
            logger.debug('Executing keyboard action', { input, action });
          }
          
          await handler();
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      logger.error('Error handling keyboard input', { input, error });
      return false;
    }
  }

  /**
   * Activate keyboard controls
   */
  activate(): void {
    this.isActive = true;
    
    if (this.config.enableLogging) {
      logger.debug('Keyboard controls activated');
    }
  }

  /**
   * Deactivate keyboard controls
   */
  deactivate(): void {
    this.isActive = false;
    
    if (this.config.enableLogging) {
      logger.debug('Keyboard controls deactivated');
    }
  }

  /**
   * Check if controls are active
   */
  isActivated(): boolean {
    return this.isActive;
  }

  /**
   * Get available shortcuts
   */
  getShortcuts(): KeyboardShortcuts {
    return { ...this.config.shortcuts };
  }

  /**
   * Update shortcuts configuration
   */
  updateShortcuts(shortcuts: Partial<KeyboardShortcuts>): void {
    this.config.shortcuts = { ...this.config.shortcuts, ...shortcuts };
    
    if (this.config.enableLogging) {
      logger.debug('Keyboard shortcuts updated', { shortcuts });
    }
  }

  /**
   * Get help text for shortcuts
   */
  getHelpText(): string {
    const shortcuts = this.config.shortcuts;
    
    return [
      `${shortcuts.toggleMetrics}: Toggle Metrics`,
      `${shortcuts.toggleAutoExecute}: Toggle Auto-Execute`,
      `${shortcuts.executeWorkflow}: Execute Workflow`,
      `${shortcuts.showHistory}: Show History`,
      `${shortcuts.forceRefresh}: Force Refresh`,
      `${shortcuts.pauseResume}: Pause/Resume`,
      `${shortcuts.cancel}: Cancel`
    ].join(' • ');
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.actionHandlers.clear();
    this.setupDefaultHandlers();
    
    if (this.config.enableLogging) {
      logger.debug('All keyboard handlers cleared');
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Map keyboard input to action
   */
  private mapInputToAction(input: string, key: any): string | null {
    const shortcuts = this.config.shortcuts;
    
    // Handle Ctrl combinations
    if (key.ctrl) {
      if (input === 'r') return 'forceRefresh';
      if (input === 'c') return 'cancel';
      return null;
    }
    
    // Handle single character shortcuts
    switch (input) {
      case shortcuts.toggleMetrics:
        return 'toggleMetrics';
      case shortcuts.toggleAutoExecute:
        return 'toggleAutoExecute';
      case shortcuts.executeWorkflow:
        return 'executeWorkflow';
      case shortcuts.showHistory:
        return 'showHistory';
      case shortcuts.pauseResume:
        return 'pauseResume';
      default:
        return null;
    }
  }

  /**
   * Setup default action handlers (no-op implementations)
   */
  private setupDefaultHandlers(): void {
    // Default handlers that do nothing - will be overridden by actual implementations
    this.actionHandlers.set('toggleMetrics', () => {
      logger.debug('Toggle metrics action (no handler registered)');
    });
    
    this.actionHandlers.set('toggleAutoExecute', () => {
      logger.debug('Toggle auto-execute action (no handler registered)');
    });
    
    this.actionHandlers.set('executeWorkflow', () => {
      logger.debug('Execute workflow action (no handler registered)');
    });
    
    this.actionHandlers.set('showHistory', () => {
      logger.debug('Show history action (no handler registered)');
    });
    
    this.actionHandlers.set('forceRefresh', () => {
      logger.debug('Force refresh action (no handler registered)');
    });
    
    this.actionHandlers.set('pauseResume', () => {
      logger.debug('Pause/resume action (no handler registered)');
    });
    
    this.actionHandlers.set('cancel', () => {
      logger.debug('Cancel action (no handler registered)');
    });
  }
}

/**
 * Default keyboard shortcuts configuration
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  toggleMetrics: 'm',
  toggleAutoExecute: 'a',
  executeWorkflow: 'x',
  showHistory: 'h',
  forceRefresh: 'ctrl+r',
  pauseResume: 'p',
  cancel: 'ctrl+c'
};

/**
 * Factory function for creating keyboard controls service
 */
export function createKeyboardControlsService(
  shortcuts: Partial<KeyboardShortcuts> = {},
  enableLogging: boolean = false
): KeyboardControlsService {
  const config: KeyboardControlsConfig = {
    shortcuts: { ...DEFAULT_KEYBOARD_SHORTCUTS, ...shortcuts },
    enableLogging
  };
  
  return new KeyboardControlsService(config);
} 