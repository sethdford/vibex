/**
 * App Orchestration Service
 * 
 * Handles core app business logic extracted from App.tsx
 * Following Gemini CLI patterns - single responsibility, clean interfaces
 */

import { logger } from '../utils/logger.js';
import { contextService } from './contextService.js';
import type { HistoryItem } from '../ui/types.js';
import { MessageType } from '../ui/types.js';
import type { AppConfigType } from '../config/schema.js';

export interface AppOrchestrationService {
  initializeApp(config: AppConfigType, preloadedContext?: string): Promise<string>;
  processUserInput(input: string, processAtCommand: (input: string) => Promise<any>): Promise<string>;
  clearAppState(): void;
  handleExit(slashCommands: any[], onExit?: () => void): void;
  extractUserMessages(history: HistoryItem[]): string[];
  findLastAssistantMessage(history: HistoryItem[]): string | null;
}

class AppOrchestrationServiceImpl implements AppOrchestrationService {
  
  /**
   * Initialize app with context
   */
  async initializeApp(config: AppConfigType, preloadedContext?: string): Promise<string> {
    try {
      return await contextService.initializeContext(config, preloadedContext);
    } catch (error) {
      logger.error('Failed to initialize app context', error);
      throw new Error('App initialization failed');
    }
  }

  /**
   * Process user input with @ command handling
   */
  async processUserInput(
    input: string, 
    processAtCommand: (input: string) => Promise<any>
  ): Promise<string> {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      throw new Error('Empty input provided');
    }

    try {
      const atResult = await processAtCommand(trimmedInput);
      return atResult.processedQuery?.map((part: any) => part.text).join('') || trimmedInput;
    } catch (error) {
      logger.error('Error processing @ commands, using original query', error);
      return trimmedInput;
    }
  }

  /**
   * Clear application state
   */
  clearAppState(): void {
    try {
      console.clear();
      logger.debug('App state cleared');
    } catch (error) {
      logger.error('Failed to clear app state', error);
    }
  }

  /**
   * Handle application exit
   */
  handleExit(slashCommands: any[], onExit?: () => void): void {
    try {
      const quitCommand = slashCommands.find(cmd => 
        cmd.name === 'quit' || cmd.altName === 'exit'
      );
      
      if (quitCommand) {
        quitCommand.action('quit', '', '');
      } else if (onExit) {
        onExit();
      } else {
        process.exit(0);
      }
    } catch (error) {
      logger.error('Error during exit', error);
      process.exit(1);
    }
  }

  /**
   * Extract user messages from history for input suggestions
   */
  extractUserMessages(history: HistoryItem[]): string[] {
    try {
      return history
        .filter((item): item is HistoryItem & { type: MessageType.USER; text: string } =>
          item.type === MessageType.USER && 
          typeof item.text === 'string' && 
          item.text.trim() !== ''
        )
        .map(item => item.text)
        .reverse();
    } catch (error) {
      logger.error('Failed to extract user messages', error);
      return [];
    }
  }

  /**
   * Find last assistant message for copying
   */
  findLastAssistantMessage(history: HistoryItem[]): string | null {
    try {
      const lastAssistantMessage = [...history]
        .reverse()
        .find(item => item.type === MessageType.ASSISTANT);
      
      return lastAssistantMessage?.text || null;
    } catch (error) {
      logger.error('Failed to find last assistant message', error);
      return null;
    }
  }
}

// Export singleton instance
export const appOrchestrationService: AppOrchestrationService = new AppOrchestrationServiceImpl(); 