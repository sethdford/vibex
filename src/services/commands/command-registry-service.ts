/**
 * Command Registry Service
 * 
 * Manages command registration, lookup, and organization
 * Following Gemini CLI patterns - single responsibility, clean interface
 */

import { logger } from '../../utils/logger.js';
import type { Command } from './types.js';

export class CommandRegistryService {
  private commands = new Map<string, Command>();
  private aliasMap = new Map<string, string>(); // alias -> command id
  private categoryMap = new Map<string, Set<string>>(); // category -> command ids

  /**
   * Register a single command
   */
  registerCommand(command: Command): () => void {
    try {
      // Validate command
      this.validateCommand(command);

      // Remove existing command if present
      this.unregisterCommand(command.id);

      // Register command
      this.commands.set(command.id, command);

      // Register aliases
      if (command.aliases) {
        for (const alias of command.aliases) {
          if (this.aliasMap.has(alias)) {
            logger.warn(`Command alias '${alias}' already exists, overriding`);
          }
          this.aliasMap.set(alias, command.id);
        }
      }

      // Register category
      if (command.category) {
        if (!this.categoryMap.has(command.category)) {
          this.categoryMap.set(command.category, new Set());
        }
        this.categoryMap.get(command.category)!.add(command.id);
      }

      logger.debug(`Registered command: ${command.name}`);

      // Return unregister function
      return () => this.unregisterCommand(command.id);
    } catch (error) {
      logger.error(`Failed to register command ${command.name}:`, error);
      throw error;
    }
  }

  /**
   * Register multiple commands
   */
  registerCommands(commands: Command[]): () => void {
    const unregisterFunctions: (() => void)[] = [];

    for (const command of commands) {
      try {
        const unregister = this.registerCommand(command);
        unregisterFunctions.push(unregister);
      } catch (error) {
        // Rollback on error
        unregisterFunctions.forEach(fn => fn());
        throw new Error(`Failed to register commands: ${error}`);
      }
    }

    // Return function to unregister all
    return () => {
      unregisterFunctions.forEach(fn => fn());
    };
  }

  /**
   * Unregister a command
   */
  unregisterCommand(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (!command) {
      return false;
    }

    // Remove from commands
    this.commands.delete(commandId);

    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.delete(alias);
      }
    }

    // Remove from category
    if (command.category) {
      const categoryCommands = this.categoryMap.get(command.category);
      if (categoryCommands) {
        categoryCommands.delete(commandId);
        if (categoryCommands.size === 0) {
          this.categoryMap.delete(command.category);
        }
      }
    }

    logger.debug(`Unregistered command: ${command.name}`);
    return true;
  }

  /**
   * Find command by name or alias
   */
  findCommand(nameOrAlias: string): Command | null {
    // Try direct name lookup first
    const directCommand = Array.from(this.commands.values()).find(
      cmd => cmd.name === nameOrAlias
    );
    if (directCommand) {
      return directCommand;
    }

    // Try alias lookup
    const commandId = this.aliasMap.get(nameOrAlias);
    if (commandId) {
      return this.commands.get(commandId) || null;
    }

    return null;
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get visible commands (not hidden)
   */
  getVisibleCommands(): Command[] {
    return this.getAllCommands().filter(cmd => !cmd.hidden);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): Command[] {
    const commandIds = this.categoryMap.get(category);
    if (!commandIds) {
      return [];
    }

    return Array.from(commandIds)
      .map(id => this.commands.get(id))
      .filter((cmd): cmd is Command => cmd !== undefined);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categoryMap.keys()).sort();
  }

  /**
   * Check if command exists
   */
  hasCommand(nameOrAlias: string): boolean {
    return this.findCommand(nameOrAlias) !== null;
  }

  /**
   * Get command count
   */
  getCommandCount(): number {
    return this.commands.size;
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
    this.aliasMap.clear();
    this.categoryMap.clear();
    logger.debug('Cleared all commands');
  }

  /**
   * Validate command structure
   */
  private validateCommand(command: Command): void {
    if (!command.id || typeof command.id !== 'string') {
      throw new Error('Command must have a valid id');
    }

    if (!command.name || typeof command.name !== 'string') {
      throw new Error('Command must have a valid name');
    }

    if (!command.description || typeof command.description !== 'string') {
      throw new Error('Command must have a valid description');
    }

    if (typeof command.handler !== 'function') {
      throw new Error('Command must have a valid handler function');
    }

    // Validate aliases
    if (command.aliases) {
      if (!Array.isArray(command.aliases)) {
        throw new Error('Command aliases must be an array');
      }
      for (const alias of command.aliases) {
        if (typeof alias !== 'string' || alias.length === 0) {
          throw new Error('Command aliases must be non-empty strings');
        }
      }
    }

    // Check for name conflicts
    if (this.hasCommand(command.name) && this.findCommand(command.name)?.id !== command.id) {
      throw new Error(`Command name '${command.name}' already exists`);
    }
  }
}

// Singleton instance
export const commandRegistryService = new CommandRegistryService(); 