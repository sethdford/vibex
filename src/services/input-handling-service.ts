/**
 * Input Handling Service
 * 
 * Manages input processing, routing, and validation
 * Following Gemini CLI patterns - single responsibility, clean interface
 */

import { logger } from '../utils/logger.js';
import { appOrchestrationService } from './app-orchestration.js';
import { clipboardService } from './clipboard-service.js';

export interface InputHandlers {
  onSubmit: (text: string) => Promise<void> | void;
  onClear: () => void;
  onExit: () => void;
  onToggleErrorDetails: () => void;
  onToggleHeightConstraint: () => void;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
  onCopyLastResponse: () => Promise<void> | void;
}

export interface InputProcessingOptions {
  allowEmpty?: boolean;
  trimWhitespace?: boolean;
  maxLength?: number;
  validateCommand?: boolean;
}

export interface InputProcessingResult {
  success: boolean;
  processedInput?: string;
  error?: string;
  isCommand?: boolean;
  commandType?: 'slash' | 'at' | 'natural';
}

export class InputHandlingService {
  private static readonly MAX_INPUT_LENGTH = 10000;
  private static readonly COMMAND_PREFIXES = ['/', '@'];

  /**
   * Process user input with validation and routing
   */
  async processInput(
    input: string,
    options: InputProcessingOptions = {},
    processAtCommand?: (input: string) => Promise<any>
  ): Promise<InputProcessingResult> {
    try {
      const {
        allowEmpty = false,
        trimWhitespace = true,
        maxLength = InputHandlingService.MAX_INPUT_LENGTH,
        validateCommand = true
      } = options;

      // Basic validation
      const validationResult = this.validateInput(input, { allowEmpty, trimWhitespace, maxLength });
      if (!validationResult.success) {
        return validationResult;
      }

      const processedInput = validationResult.processedInput!;

      // Determine input type
      const inputType = this.determineInputType(processedInput);

      // Process based on type
      switch (inputType.commandType) {
        case 'slash':
          return {
            success: true,
            processedInput,
            isCommand: true,
            commandType: 'slash'
          };

        case 'at':
          if (processAtCommand) {
            try {
              const processed = await processAtCommand(processedInput);
              return {
                success: true,
                processedInput: processed,
                isCommand: true,
                commandType: 'at'
              };
            } catch (error) {
              logger.error('At-command processing failed:', error);
              return {
                success: false,
                error: error instanceof Error ? error.message : 'At-command processing failed'
              };
            }
          }
          // Fallthrough to natural if no processor
          
        case 'natural':
        default:
          // Use orchestration service for natural language processing
          try {
            const processed = await appOrchestrationService.processUserInput(processedInput, processAtCommand);
            return {
              success: true,
              processedInput: processed,
              isCommand: false,
              commandType: 'natural'
            };
          } catch (error) {
            logger.error('Natural language processing failed:', error);
            // Return original input as fallback
            return {
              success: true,
              processedInput,
              isCommand: false,
              commandType: 'natural'
            };
          }
      }
    } catch (error) {
      logger.error('Input processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Input processing failed'
      };
    }
  }

  /**
   * Validate input according to options
   */
  private validateInput(
    input: string,
    options: Pick<InputProcessingOptions, 'allowEmpty' | 'trimWhitespace' | 'maxLength'>
  ): InputProcessingResult {
    const { allowEmpty = false, trimWhitespace = true, maxLength = InputHandlingService.MAX_INPUT_LENGTH } = options;

    // Trim if requested
    const processedInput = trimWhitespace ? input.trim() : input;

    // Check empty
    if (!allowEmpty && !processedInput) {
      return {
        success: false,
        error: 'Empty input not allowed'
      };
    }

    // Check length
    if (processedInput.length > maxLength) {
      return {
        success: false,
        error: `Input too long (${processedInput.length} > ${maxLength} characters)`
      };
    }

    return {
      success: true,
      processedInput
    };
  }

  /**
   * Determine the type of input (command vs natural language)
   */
  private determineInputType(input: string): { isCommand: boolean; commandType: 'slash' | 'at' | 'natural' } {
    if (input.startsWith('/')) {
      return { isCommand: true, commandType: 'slash' };
    }

    if (input.startsWith('@')) {
      return { isCommand: true, commandType: 'at' };
    }

    return { isCommand: false, commandType: 'natural' };
  }

  /**
   * Handle copy last response action
   */
  async handleCopyLastResponse(history: any[]): Promise<{ success: boolean; message: string; type: 'success' | 'error' | 'info' }> {
    try {
      const lastAssistantMessage = appOrchestrationService.findLastAssistantMessage(history);
      
      if (lastAssistantMessage) {
        const success = await clipboardService.copyToClipboard(lastAssistantMessage);
        return {
          success,
          message: success ? 'Last response copied to clipboard' : 'Failed to copy to clipboard',
          type: success ? 'success' : 'error'
        };
      } else {
        return {
          success: false,
          message: 'No response to copy',
          type: 'info'
        };
      }
    } catch (error) {
      logger.error('Copy last response failed:', error);
      return {
        success: false,
        message: 'Failed to copy to clipboard',
        type: 'error'
      };
    }
  }

  /**
   * Handle clear screen action
   */
  handleClearScreen(clearItems: () => void, clearConsoleMessages: () => void): void {
    try {
      clearItems();
      clearConsoleMessages();
      appOrchestrationService.clearAppState();
      logger.debug('Screen cleared successfully');
    } catch (error) {
      logger.error('Clear screen failed:', error);
    }
  }

  /**
   * Handle exit action
   */
  handleExit(slashCommands: any[], onExit?: () => void): void {
    try {
      appOrchestrationService.handleExit(slashCommands, onExit);
    } catch (error) {
      logger.error('Exit handling failed:', error);
      // Fallback exit
      if (onExit) {
        onExit();
      } else {
        process.exit(0);
      }
    }
  }

  /**
   * Create input handlers object
   */
  createHandlers(
    submitQuery: (query: string) => void,
    clearItems: () => void,
    clearConsoleMessages: () => void,
    toggleErrorDetails: () => void,
    toggleHeightConstraint: () => void,
    openHelp: () => void,
    closeHelp: () => void,
    history: any[],
    slashCommands: any[],
    onExit?: () => void,
    processAtCommand?: (input: string) => Promise<string>
  ): InputHandlers {
    return {
      onSubmit: async (text: string) => {
        const result = await this.processInput(text, {}, processAtCommand);
        if (result.success && result.processedInput) {
          submitQuery(result.processedInput);
        } else if (result.error) {
          logger.error('Input processing error:', result.error);
        }
      },
      
      onClear: () => this.handleClearScreen(clearItems, clearConsoleMessages),
      
      onExit: () => this.handleExit(slashCommands, onExit),
      
      onToggleErrorDetails: toggleErrorDetails,
      
      onToggleHeightConstraint: toggleHeightConstraint,
      
      onOpenHelp: openHelp,
      
      onCloseHelp: closeHelp,
      
      onCopyLastResponse: async () => {
        const result = await this.handleCopyLastResponse(history);
        logger.info(result.message);
      }
    };
  }
}

// Singleton instance
export const inputHandlingService = new InputHandlingService();