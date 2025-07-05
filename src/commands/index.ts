/**
 * Command Management System
 *
 * This module provides the core infrastructure for defining, registering,
 * and executing commands in the CLI application. Key responsibilities include:
 *
 * - A central command registry for all available commands
 * - Command execution logic with argument parsing and validation
 * - Help generation for commands and subcommands
 * - Categorization of commands for organized help output
 *
 * The system is designed to be extensible, allowing new commands to be easily
 * added and integrated into the CLI.
 */

import type { CommandDef, ArgDef, CommandContext } from './types.js';
import { CommandCategory, ArgType } from './types.js';
import type { AppConfigType } from '../config/schema.js';
import { logger } from '../utils/logger.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { UserError } from '../errors/types.js';
import { isNonEmptyString } from '../utils/validation.js';
import type { 
  UnifiedCommand, 
  CommandRegistry as CommandRegistryInterface,
  CommandResult
} from './types.js';

/**
 * Unified Command Registry
 * 
 * Central registry for all commands in the application, implementing the
 * unified command system that consolidates all previous command types.
 */
export class CommandRegistry implements CommandRegistryInterface {
  private readonly commands = new Map<string, UnifiedCommand>();
  private readonly aliases = new Map<string, string>();
  private readonly categories = new Set<CommandCategory>();

  /**
   * Register a new command
   */
  register(command: UnifiedCommand): void {
    // Validate command
    if (!command.id || !command.name || !command.description || !command.handler) {
      throw new Error(`Invalid command definition: ${command.name || 'unknown'}`);
    }

    // Check for duplicates
    if (this.commands.has(command.id)) {
      logger.warn(`Command ${command.id} already registered, overwriting`);
    }

    // Register command
    this.commands.set(command.id, command);
    this.categories.add(command.category);

    // Register aliases if any
    if (command.aliases && command.aliases.length > 0) {
      command.aliases.forEach(alias => {
        if (this.aliases.has(alias)) {
          logger.warn(`Alias ${alias} already registered for ${command.id}, overwriting`);
        }
        this.aliases.set(alias, command.id);
      });
    }

    logger.debug(`Registered command: ${command.name} (${command.id})`);
  }

  /**
   * Get a command by name or ID
   */
  get(nameOrId: string): UnifiedCommand | undefined {
    // Try direct lookup by ID
    const command = this.commands.get(nameOrId);
    if (command) {
      return command;
    }

    // Try lookup by name
    for (const cmd of Array.from(this.commands.values())) {
      if (cmd.name === nameOrId) {
        return cmd;
      }
    }

    // Try lookup by alias
    return this.findByAlias(nameOrId);
  }

  /**
   * Find command by alias
   */
  findByAlias(alias: string): UnifiedCommand | undefined {
    const commandId = this.aliases.get(alias);
    if (commandId) {
      return this.commands.get(commandId);
    }
    return undefined;
  }

  /**
   * Get all commands
   */
  list(): UnifiedCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  listByCategory(category: CommandCategory): UnifiedCommand[] {
    return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
  }

  /**
   * Check if command exists
   */
  has(nameOrId: string): boolean {
    return this.get(nameOrId) !== undefined;
  }

  /**
   * Get all categories
   */
  getAllCategories(): CommandCategory[] {
    return Array.from(this.categories);
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
    this.categories.clear();
    logger.debug('Command registry cleared');
  }

  /**
   * Get command count
   */
  size(): number {
    return this.commands.size;
  }

  /**
   * Unregister a command
   */
  unregister(nameOrId: string): boolean {
    const command = this.get(nameOrId);
    if (!command) {
      return false;
    }

    // Remove command
    this.commands.delete(command.id);

    // Remove aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        if (this.aliases.get(alias) === command.id) {
          this.aliases.delete(alias);
        }
      });
    }

    // Update categories
    this.updateCategories();

    logger.debug(`Unregistered command: ${command.name} (${command.id})`);
    return true;
  }

  /**
   * Update categories based on current commands
   */
  private updateCategories(): void {
    this.categories.clear();
    for (const command of Array.from(this.commands.values())) {
      this.categories.add(command.category);
    }
  }

  // UI Hook compatibility methods
  
  /**
   * Register command (alias for register)
   */
  registerCommand(command: UnifiedCommand): void {
    return this.register(command);
  }

  /**
   * Get all commands (alias for list)
   */
  getAllCommands(): UnifiedCommand[] {
    return this.list();
  }

  /**
   * Unregister command (alias for unregister)
   */
  unregisterCommand(nameOrId: string): boolean {
    return this.unregister(nameOrId);
  }

  /**
   * Find command (alias for get)
   */
  findCommand(nameOrId: string): UnifiedCommand | undefined {
    return this.get(nameOrId);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): UnifiedCommand[] {
    return this.listByCategory(category as CommandCategory);
  }

  /**
   * Execute command
   */
  async executeCommand(commandId: string, args: unknown): Promise<unknown> {
    const command = this.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    // Create a basic context
    const context: CommandContext = {
      args: args as Record<string, unknown>,
      rawArgs: [],
      flags: {},
      options: {},
      terminal: {
        info: (msg: string) => console.log(msg),
        error: (msg: string) => console.error(msg),
        warn: (msg: string) => console.warn(msg),
        success: (msg: string) => console.log(msg),
        prompt: async (msg: string) => {
          console.log(msg);
          return '';
        },
      },
      config: {} as AppConfigType,
    };

    return await command.handler(context);
  }

  /**
   * Execute command string
   */
  async executeCommandString(input: string): Promise<unknown> {
    // Basic parsing - split by spaces and use first part as command
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    const command = this.get(commandName);
    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }

    // Convert args array to object
    const argsObject: Record<string, unknown> = {};
    args.forEach((arg, index) => {
      argsObject[`arg${index}`] = arg;
    });

    return this.executeCommand(command.id, argsObject);
  }

  /**
   * Get suggestions for input
   */
  getSuggestions(input: string): string[] {
    const commands = this.list();
    const suggestions: string[] = [];

    for (const command of commands) {
      if (command.name.startsWith(input)) {
        suggestions.push(command.name);
      }
      if (command.aliases) {
        for (const alias of command.aliases) {
          if (alias.startsWith(input)) {
            suggestions.push(alias);
          }
        }
      }
    }

    return suggestions;
  }
}

/**
 * Global command registry instance
 */
export const commandRegistry = new CommandRegistry();

/**
 * Generate help text for a command
 */
export function generateCommandHelp(command: UnifiedCommand): string {
  const lines: string[] = [];
  
  lines.push(`Command: ${command.name}`);
  lines.push(`Description: ${command.description}`);
  
  if (command.category) {
    lines.push(`Category: ${command.category}`);
  }
  
  if (command.aliases && command.aliases.length > 0) {
    lines.push(`Aliases: ${command.aliases.join(', ')}`);
  }
  
  if (command.usage) {
    lines.push(`Usage: ${command.usage}`);
  } else if (command.parameters && command.parameters.length > 0) {
    const paramStr = command.parameters
      .map(p => p.required ? `<${p.name}>` : `[${p.name}]`)
      .join(' ');
    lines.push(`Usage: /${command.name} ${paramStr}`);
  } else {
    lines.push(`Usage: /${command.name}`);
  }
  
  if (command.parameters && command.parameters.length > 0) {
    lines.push('');
    lines.push('Parameters:');
    command.parameters.forEach(param => {
      const required = param.required ? ' (required)' : '';
      const defaultVal = param.default !== undefined ? ` (default: ${param.default})` : '';
      lines.push(`  ${param.name}: ${param.description}${required}${defaultVal}`);
    });
  }
  
  if (command.examples && command.examples.length > 0) {
    lines.push('');
    lines.push('Examples:');
    command.examples.forEach(example => {
      lines.push(`  ${example}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Execute a command by name
 */
export async function executeCommand(
  commandName: string, 
  args: string[], 
  context: Partial<CommandContext> = {}
): Promise<CommandResult> {
  const command = commandRegistry.get(commandName);
  
  if (!command) {
    return {
      success: false,
      error: new Error(`Command not found: ${commandName}`),
      command: commandName,
      timestamp: new Date()
    };
  }

  try {
    // Create default terminal interface if not provided
    const defaultTerminal = {
      info: (msg: string) => logger.info(msg),
      success: (msg: string) => logger.info(msg),
      warn: (msg: string) => logger.warn(msg),
      error: (msg: string) => logger.error(msg),
      prompt: async (msg: string) => {
        logger.info(msg);
        return '';
      }
    };

    // Build complete context
    const fullContext: CommandContext = {
      config: {} as any, // Will be provided by caller
      terminal: defaultTerminal,
      args: {},
      rawArgs: args,
      flags: {},
      options: {},
      ...context
    };

    // Execute command
    const result = await command.handler(fullContext);
    
    return {
      ...result,
      command: commandName,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error(`Error executing command ${commandName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      command: commandName,
      timestamp: new Date()
    };
  }
}

export {
  type CommandDef,
  type ArgDef,
  type CommandContext,
  type CommandHandler,
  type CommandCategory,
  type ArgType,
  type CommandResult
} from './types.js'; 