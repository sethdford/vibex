/**
 * Commands Hook
 * 
 * React hook for managing command execution in the UI.
 */

import { useState, useEffect, useCallback } from 'react';
import type { UnifiedCommand } from '../../commands/types.js';
import { commandRegistry } from '../../commands/index.js';

export interface UseCommandsOptions {
  /**
   * Initial commands to register
   */
  initialCommands?: UnifiedCommand[];
  
  /**
   * Callback when a command is executed
   */
  onExecute?: (commandId: string, args: UnifiedCommand) => void;
  
  /**
   * Callback when a command fails
   */
  onError?: (error: Error, commandId: string) => void;
}

/**
 * Command hook for UI components
 */
export function useCommands(options: UseCommandsOptions = {}) {
  const [commands, setCommands] = useState<UnifiedCommand[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown | null>(null);
  
  // Initialize with built-in commands
  useEffect(() => {
    // Register any provided initial commands
    if (options.initialCommands && options.initialCommands.length > 0) {
      options.initialCommands.forEach(command => {
        commandRegistry.registerCommand(command);
      });
    }
    
    // Get all registered commands
    const allCommands = commandRegistry.getAllCommands();
    setCommands(allCommands);
    
    // Get all categories
    const allCategories = commandRegistry.getAllCategories();
    setCategories(allCategories);
    
    // Cleanup function to unregister commands
    return () => {
      if (options.initialCommands) {
        options.initialCommands.forEach(command => {
          commandRegistry.unregisterCommand(command.id);
        });
      }
    };
  }, [options.initialCommands]);
  
  /**
   * Execute a command by ID
   */
  const executeCommand = useCallback(async (commandId: string, args: UnifiedCommand) => {
    setActiveCommand(commandId);
    try {
      const result = await commandRegistry.executeCommand(commandId, args);
      setLastResult(result);
      
      if (options.onExecute) {
        options.onExecute(commandId, args);
      }
      
      setActiveCommand(null);
      return result;
    } catch (error) {
      if (options.onError && error instanceof Error) {
        options.onError(error, commandId);
      }
      
      setActiveCommand(null);
      throw error;
    }
  }, [options.onExecute, options.onError]);
  
  /**
   * Execute a command by name
   */
  const executeCommandByName = useCallback(async (name: string, args: UnifiedCommand) => {
    const command = commandRegistry.findCommand(name);
    if (!command) {
      throw new Error(`Command not found: ${name}`);
    }
    
    return executeCommand(command.id, args);
  }, [executeCommand]);
  
  /**
   * Execute a command string
   */
  const executeCommandString = useCallback(async (input: string) => commandRegistry.executeCommandString(input), []);
  
  /**
   * Get suggestions for input
   */
  const getSuggestions = useCallback((input: string) => commandRegistry.getSuggestions(input), []);
  
  /**
   * Find a command by name or alias
   */
  const findCommand = useCallback((nameOrAlias: string) => commandRegistry.findCommand(nameOrAlias), []);
  
  /**
   * Register a new command
   */
  const registerCommand = useCallback((command: UnifiedCommand) => {
    commandRegistry.registerCommand(command);
    
    // Update local state
    setCommands(commandRegistry.getAllCommands());
    setCategories(commandRegistry.getAllCategories());
  }, []);
  
  /**
   * Get commands by category
   */
  const getCommandsByCategory = useCallback((category: string) => commandRegistry.getCommandsByCategory(category), []);
  
  return {
    commands,
    categories,
    activeCommand,
    lastResult,
    executeCommand,
    executeCommandByName,
    executeCommandString,
    getSuggestions,
    findCommand,
    registerCommand,
    getCommandsByCategory,
  };
}

export default useCommands;