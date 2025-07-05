/**
 * Slash Commands Hook
 * 
 * This hook manages slash command registration, execution, and suggestions.
 * It provides a unified interface for working with commands in the terminal.
 */

import { useState, useCallback, useEffect } from 'react';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  icon?: string;
  category?: string;
  hidden?: boolean;
  handler: (args: string[]) => Promise<void>;
  suggestions?: (partialArgs: string[]) => string[];
}

export interface SlashCommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface UseSlashCommandsOptions {
  initialCommands?: SlashCommand[];
  onExecute?: (commandId: string, args: string[]) => void;
  onError?: (error: Error, commandId: string) => void;
}

export function useSlashCommands(options: UseSlashCommandsOptions = {}) {
  const [commands, setCommands] = useState<SlashCommand[]>(options.initialCommands || []);
  const [history, setHistory] = useState<Array<{commandId: string, args: string[]}>>([]);
  const [lastResult, setLastResult] = useState<SlashCommandResult | null>(null);
  
  // Register a new command
  const registerCommand = useCallback((command: SlashCommand) => {
    setCommands(prev => {
      // Replace existing command with same ID or add new one
      const index = prev.findIndex(cmd => cmd.id === command.id);
      if (index >= 0) {
        const newCommands = [...prev];
        newCommands[index] = command;
        return newCommands;
      }
      return [...prev, command];
    });
    return () => {
      // Return unregister function
      setCommands(prev => prev.filter(cmd => cmd.id !== command.id));
    };
  }, []);
  
  // Register multiple commands at once
  const registerCommands = useCallback((newCommands: SlashCommand[]) => {
    setCommands(prev => {
      const result = [...prev];
      for (const command of newCommands) {
        const index = result.findIndex(cmd => cmd.id === command.id);
        if (index >= 0) {
          result[index] = command;
        } else {
          result.push(command);
        }
      }
      return result;
    });
    
    // Return unregister function
    return () => {
      const ids = newCommands.map(cmd => cmd.id);
      setCommands(prev => prev.filter(cmd => !ids.includes(cmd.id)));
    };
  }, []);
  
  // Find a command by ID
  const getCommand = useCallback((id: string) => commands.find(cmd => cmd.id === id), [commands]);
  
  // Find a command by name
  const getCommandByName = useCallback((name: string) => commands.find(cmd => cmd.name === name), [commands]);
  
  // Parse a command string into command and arguments
  const parseCommandString = useCallback((input: string): {commandName: string, args: string[]} | null => {
    if (!input.startsWith('/')) {return null;}
    
    const parts = input.slice(1).split(' ');
    const commandName = parts[0];
    const args = parts.slice(1);
    
    return { commandName, args };
  }, []);
  
  // Execute a command by ID with arguments
  const executeCommand = useCallback(async (commandId: string, args: string[] = []): Promise<SlashCommandResult> => {
    try {
      const command = getCommand(commandId);
      if (!command) {
        const result = { success: false, message: `Command not found: ${commandId}` };
        setLastResult(result);
        return result;
      }
      
      // Track in history
      setHistory(prev => [...prev, { commandId, args }]);
      
      // Call handler
      if (options.onExecute) {
        options.onExecute(commandId, args);
      }
      
      await command.handler(args);
      const result = { success: true };
      setLastResult(result);
      return result;
    } catch (error) {
      if (options.onError && error instanceof Error) {
        options.onError(error, commandId);
      }
      const result = { 
        success: false, 
        message: error instanceof Error ? error.message : String(error)
      };
      setLastResult(result);
      return result;
    }
  }, [getCommand, options]);
  
  // Execute a command by name with arguments
  const executeCommandByName = useCallback(async (commandName: string, args: string[] = []): Promise<SlashCommandResult> => {
    const command = getCommandByName(commandName);
    if (!command) {
      const result = { success: false, message: `Command not found: ${commandName}` };
      setLastResult(result);
      return result;
    }
    
    return executeCommand(command.id, args);
  }, [getCommandByName, executeCommand]);
  
  // Execute a command string (e.g. "/help topic")
  const executeCommandString = useCallback(async (input: string): Promise<SlashCommandResult> => {
    const parsed = parseCommandString(input);
    if (!parsed) {
      const result = { success: false, message: 'Not a valid command' };
      setLastResult(result);
      return result;
    }
    
    return executeCommandByName(parsed.commandName, parsed.args);
  }, [parseCommandString, executeCommandByName]);
  
  // Get suggestions for a partial command
  const getSuggestions = useCallback((partialInput: string): string[] => {
    if (!partialInput.startsWith('/')) {return [];}
    
    const parts = partialInput.slice(1).split(' ');
    const commandName = parts[0];
    const args = parts.slice(1);
    
    // If we just have "/", suggest all commands
    if (commandName === '') {
      return commands
        .filter(cmd => !cmd.hidden)
        .map(cmd => `/${cmd.name}`);
    }
    
    // If we have a partial command name, filter commands
    if (parts.length === 1) {
      return commands
        .filter(cmd => !cmd.hidden && cmd.name.startsWith(commandName))
        .map(cmd => `/${cmd.name}`);
    }
    
    // If we have a command and args, use command's suggestion handler
    const command = getCommandByName(commandName);
    if (command?.suggestions) {
      return command.suggestions(args);
    }
    
    return [];
  }, [commands, getCommandByName]);
  
  return {
    commands,
    registerCommand,
    registerCommands,
    getCommand,
    getCommandByName,
    executeCommand,
    executeCommandByName,
    executeCommandString,
    parseCommandString,
    getSuggestions,
    history,
    lastResult
  };
}

export default useSlashCommands;