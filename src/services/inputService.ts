/**
 * Input Service - Clean input handling and command routing
 * Extracted from App.tsx to follow Gemini CLI's clean separation
 */

import { logger } from '../utils/logger.js';

export enum InputMode {
  NORMAL = 'normal',
  SHELL = 'shell'
}

export interface InputProcessor {
  processInput(input: string): Promise<boolean>;
  getMode(): InputMode;
  setMode(mode: InputMode): void;
}

export class InputService implements InputProcessor {
  private mode: InputMode = InputMode.NORMAL;
  private slashCommandHandler?: (command: string) => boolean;
  private querySubmitHandler?: (query: string) => void;

  setHandlers(
    slashCommandHandler: (command: string) => boolean,
    querySubmitHandler: (query: string) => void
  ) {
    this.slashCommandHandler = slashCommandHandler;
    this.querySubmitHandler = querySubmitHandler;
  }

  async processInput(input: string): Promise<boolean> {
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      return false;
    }

    // Handle slash commands
    if (trimmedInput.startsWith('/')) {
      if (this.slashCommandHandler) {
        const handled = this.slashCommandHandler(trimmedInput);
        if (!handled) {
          logger.error('Unknown command:', trimmedInput);
        }
        return handled;
      }
      return false;
    }

    // Handle normal queries
    if (this.querySubmitHandler) {
      this.querySubmitHandler(trimmedInput);
      return true;
    }

    return false;
  }

  getMode(): InputMode {
    return this.mode;
  }

  setMode(mode: InputMode): void {
    this.mode = mode;
  }

  isShellMode(): boolean {
    return this.mode === InputMode.SHELL;
  }

  isNormalMode(): boolean {
    return this.mode === InputMode.NORMAL;
  }
}

// Singleton instance
export const inputService = new InputService(); 