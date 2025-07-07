/**
 * Command Execution Service
 * 
 * Handles command parsing, execution, and error handling
 * Following Gemini CLI patterns - single responsibility, robust error handling
 */

import { logger } from '../../utils/logger.js';
import { commandRegistryService } from './command-registry-service.js';
import type { Command, CommandContext, CommandResult } from './types.js';

export class CommandExecutionService {
  private defaultContext: CommandContext;

  constructor(initialContext?: Partial<CommandContext>) {
    this.defaultContext = {
      workingDirectory: process.cwd(),
      environment: process.env as Record<string, string>,
      ...initialContext
    };
  }

  /**
   * Execute a command string
   */
  async executeCommand(
    input: string, 
    context?: Partial<CommandContext>
  ): Promise<CommandResult> {
    try {
      // Parse command input
      const { commandName, args } = this.parseCommandInput(input);
      
      // Find command
      const command = commandRegistryService.findCommand(commandName);
      if (!command) {
        return this.createErrorResult(
          `Command not found: ${commandName}`,
          127 // Command not found exit code
        );
      }

      // Merge context
      const executionContext = this.mergeContext(context);

      // Log execution start
      logger.debug(`Executing command: ${commandName}`, { args, context: executionContext });

      // Execute command with timeout and error handling
      const result = await this.executeWithErrorHandling(command, args, executionContext);

      // Log execution result
      if (result.success) {
        logger.debug(`Command '${commandName}' completed successfully`);
      } else {
        logger.warn(`Command '${commandName}' failed:`, result.error);
      }

      return result;
    } catch (error) {
      logger.error('Command execution failed:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown execution error',
        1
      );
    }
  }

  /**
   * Update default context
   */
  updateContext(updates: Partial<CommandContext>): void {
    this.defaultContext = { ...this.defaultContext, ...updates };
    logger.debug('Updated command execution context', updates);
  }

  /**
   * Get current context
   */
  getContext(): CommandContext {
    return { ...this.defaultContext };
  }

  /**
   * Parse command input into name and arguments
   */
  private parseCommandInput(input: string): { commandName: string; args: string[] } {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error('Empty command input');
    }

    // Split on whitespace, respecting quoted arguments
    const parts = this.parseArguments(trimmed);
    
    if (parts.length === 0) {
      throw new Error('Invalid command input');
    }

    return {
      commandName: parts[0],
      args: parts.slice(1)
    };
  }

  /**
   * Parse arguments respecting quotes and escapes
   */
  private parseArguments(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        continue;
      }

      if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        continue;
      }

      if (!inQuotes && /\s/.test(char)) {
        if (current) {
          args.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      args.push(current);
    }

    if (inQuotes) {
      throw new Error(`Unclosed quote in command: ${quoteChar}`);
    }

    return args;
  }

  /**
   * Execute command with comprehensive error handling
   */
  private async executeWithErrorHandling(
    command: Command,
    args: string[],
    context: CommandContext
  ): Promise<CommandResult> {
    try {
      // Set up execution timeout (30 seconds default)
      const timeoutMs = 30000;
      const timeoutPromise = new Promise<CommandResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Command '${command.name}' timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Execute command
      const executionPromise = command.handler(args, context);

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Validate result
      return this.validateCommandResult(result, command.name);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Command execution failed',
        1
      );
    }
  }

  /**
   * Validate command result structure
   */
  private validateCommandResult(result: CommandResult, commandName: string): CommandResult {
    if (!result || typeof result !== 'object') {
      logger.warn(`Command '${commandName}' returned invalid result`);
      return this.createErrorResult('Command returned invalid result', 1);
    }

    if (typeof result.success !== 'boolean') {
      logger.warn(`Command '${commandName}' returned result without success field`);
      result.success = false;
    }

    // Ensure exit code is set
    if (result.exitCode === undefined) {
      result.exitCode = result.success ? 0 : 1;
    }

    return result;
  }

  /**
   * Merge execution context with defaults
   */
  private mergeContext(context?: Partial<CommandContext>): CommandContext {
    return {
      ...this.defaultContext,
      ...context
    };
  }

  /**
   * Create standardized error result
   */
  private createErrorResult(error: string, exitCode: number): CommandResult {
    return {
      success: false,
      error,
      exitCode
    };
  }
}

// Singleton instance
export const commandExecutionService = new CommandExecutionService(); 