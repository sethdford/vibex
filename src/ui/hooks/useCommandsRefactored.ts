/**
 * Refactored Commands Hook
 * 
 * Orchestrates command services with clean React integration
 * Following Gemini CLI patterns - composition over implementation
 */

import { useState, useCallback, useEffect } from 'react';
import { commandRegistryService } from '../../services/commands/command-registry-service.js';
import { commandExecutionService } from '../../services/commands/command-execution-service.js';
import { commandHistoryService } from '../../services/commands/command-history-service.js';
import type { 
  Command, 
  CommandContext, 
  CommandResult, 
  CommandHistoryEntry 
} from '../../services/commands/types.js';

export interface UseCommandsOptions {
  initialCommands?: Command[];
  defaultContext?: Partial<CommandContext>;
  maxHistorySize?: number;
}

/**
 * Focused commands hook - orchestrates services, minimal state
 */
export function useCommandsRefactored(options: UseCommandsOptions = {}) {
  // Minimal React state - only for UI reactivity
  const [commandCount, setCommandCount] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Initialize services on mount
  useEffect(() => {
    // Set up execution service context
    if (options.defaultContext) {
      commandExecutionService.updateContext(options.defaultContext);
    }

    // Register initial commands
    if (options.initialCommands) {
      commandRegistryService.registerCommands(options.initialCommands);
      setCommandCount(commandRegistryService.getCommandCount());
    }
  }, []);

  // Register a command
  const registerCommand = useCallback((command: Command) => {
    const unregister = commandRegistryService.registerCommand(command);
    setCommandCount(commandRegistryService.getCommandCount());
    
    return unregister;
  }, []);

  // Register multiple commands
  const registerCommands = useCallback((commands: Command[]) => {
    const unregister = commandRegistryService.registerCommands(commands);
    setCommandCount(commandRegistryService.getCommandCount());
    
    return unregister;
  }, []);

  // Find command by name or alias
  const findCommand = useCallback((name: string): Command | null => {
    return commandRegistryService.findCommand(name);
  }, []);

  // Execute a command
  const executeCommand = useCallback(async (
    input: string,
    context?: Partial<CommandContext>
  ): Promise<CommandResult> => {
    const result = await commandExecutionService.executeCommand(input, context);
    
    // Add to history
    commandHistoryService.addEntry(input, result);
    setHistoryVersion(prev => prev + 1);
    
    return result;
  }, []);

  // Get command suggestions
  const getCommandSuggestions = useCallback((partial: string): string[] => {
    const lowercasePartial = partial.toLowerCase();
    return commandRegistryService
      .getVisibleCommands()
      .filter(cmd => 
        cmd.name.toLowerCase().startsWith(lowercasePartial) ||
        (cmd.aliases && cmd.aliases.some(alias => 
          alias.toLowerCase().startsWith(lowercasePartial)
        ))
      )
      .map(cmd => cmd.name)
      .sort();
  }, [commandCount]); // Re-compute when commands change

  // Get commands by category
  const getCommandsByCategory = useCallback((category: string): Command[] => {
    return commandRegistryService.getCommandsByCategory(category);
  }, [commandCount]);

  // Get all categories
  const getCategories = useCallback((): string[] => {
    return commandRegistryService.getCategories();
  }, [commandCount]);

  // Update context
  const updateContext = useCallback((updates: Partial<CommandContext>) => {
    commandExecutionService.updateContext(updates);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    commandHistoryService.clear();
    setHistoryVersion(prev => prev + 1);
  }, []);

  // Get command help
  const getCommandHelp = useCallback((commandName: string): string | null => {
    const command = commandRegistryService.findCommand(commandName);
    if (!command) return null;

    let help = `${command.name} - ${command.description}\n`;
    
    if (command.usage) {
      help += `\nUsage: ${command.usage}`;
    }
    
    if (command.aliases && command.aliases.length > 0) {
      help += `\nAliases: ${command.aliases.join(', ')}`;
    }
    
    if (command.examples && command.examples.length > 0) {
      help += '\n\nExamples:\n' + command.examples.map(ex => `  ${ex}`).join('\n');
    }
    
    return help;
  }, []);

  // Get current data from services (reactive)
  const commands = commandRegistryService.getAllCommands();
  const history = commandHistoryService.getHistory();
  const context = commandExecutionService.getContext();

  return {
    // Core functionality
    commands,
    history,
    context,
    
    // Command management
    registerCommand,
    registerCommands,
    findCommand,
    executeCommand,
    
    // Suggestions and help
    getCommandSuggestions,
    getCommandsByCategory,
    getCategories,
    getCommandHelp,
    
    // Context and history
    updateContext,
    clearHistory,
    
    // Additional utilities from services
    searchHistory: commandHistoryService.searchHistory.bind(commandHistoryService),
    getHistoryStats: commandHistoryService.getStatistics.bind(commandHistoryService),
    getMostFrequentCommands: commandHistoryService.getMostFrequentCommands.bind(commandHistoryService),
    
    // Service access for advanced usage
    services: {
      registry: commandRegistryService,
      execution: commandExecutionService,
      history: commandHistoryService
    }
  };
}

// Re-export types for convenience
export type {
  Command,
  CommandContext,
  CommandResult,
  CommandHistoryEntry
}; 