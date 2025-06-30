/**
 * Slash Command Processor Hook
 * 
 * Processes slash commands entered by the user.
 */

import { useState, useCallback, useMemo } from 'react';
import { HistoryItem, MessageType } from '../types';
import { Command } from '../components/Help';
import path from 'path';
import fs from 'fs';
import { logger } from '../../utils/logger.js';

/**
 * Hook for processing slash commands
 * 
 * @param config - Application configuration
 * @param settings - User settings
 * @param history - Conversation history
 * @param addItem - Function to add items to history
 * @param clearItems - Function to clear history items
 * @param loadHistory - Function to load history
 * @param refreshStatic - Function to refresh static content
 * @param setShowHelp - Function to toggle help display
 * @param setDebugMessage - Function to set debug message
 * @param openThemeDialog - Function to open theme dialog
 * @param refreshContextFiles - Function to refresh context files
 * @param showToolDescriptions - Whether tool descriptions are shown
 * @param setQuittingMessages - Function to set quitting messages
 * @returns Object containing slash command handling functions and state
 */
export function useSlashCommandProcessor(
  config: any,
  settings: any,
  history: HistoryItem[],
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
  clearItems: () => void,
  loadHistory: (filePath?: string) => Promise<void>,
  refreshStatic: () => void,
  setShowHelp: (show: boolean) => void,
  setDebugMessage: (message: string) => void,
  openThemeDialog: () => void,
  refreshContextFiles: () => void,
  showToolDescriptions: boolean,
  setQuittingMessages: (messages: HistoryItem[] | null) => void,
) {
  // Pending history items from slash command execution
  const [pendingHistoryItems, setPendingHistoryItems] = useState<HistoryItem[]>([]);
  
  // Clear all pending history items
  const clearPendingItems = useCallback(() => {
    setPendingHistoryItems([]);
  }, []);
  
  // Handle quit command
  const handleQuit = useCallback(() => {
    const goodbyeMessages: HistoryItem[] = [
      {
        id: 'goodbye-message',
        type: MessageType.INFO,
        text: 'Thanks for using Claude Code! Goodbye.',
        timestamp: Date.now(),
      },
    ];
    
    setQuittingMessages(goodbyeMessages);
    
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }, [setQuittingMessages]);
  
  // Handle clear command
  const handleClear = useCallback(() => {
    clearItems();
    refreshStatic();
  }, [clearItems, refreshStatic]);
  
  // Handle debug command
  const handleDebug = useCallback(
    (name: string, args: string) => {
      const enableDebug = args.trim() !== 'off';
      
      addItem({
        type: MessageType.INFO,
        text: `Debug mode ${enableDebug ? 'enabled' : 'disabled'}`,
      });
      
      // Update config with debug setting
      if (config) {
        config.debug = enableDebug;
      }
      
      // Clear any existing debug message
      setDebugMessage('');
      
      logger.level = enableDebug ? 'debug' : 'info';
    },
    [addItem, config, setDebugMessage],
  );
  
  // Process slash commands
  const handleSlashCommand = useCallback(
    (input: string) => {
      if (!input.startsWith('/')) {
        return false;
      }
      
      // Extract command name and arguments
      const trimmedInput = input.trim();
      const spaceIndex = trimmedInput.indexOf(' ');
      const commandName = spaceIndex > 0
        ? trimmedInput.slice(1, spaceIndex).toLowerCase()
        : trimmedInput.slice(1).toLowerCase();
      const args = spaceIndex > 0
        ? trimmedInput.slice(spaceIndex + 1).trim()
        : '';
      
      // Find matching command
      const command = slashCommands.find(
        (cmd) =>
          cmd.name.toLowerCase() === commandName ||
          (cmd.altName && cmd.altName.toLowerCase() === commandName)
      );
      
      if (command) {
        try {
          // Execute command action
          command.action(commandName, args, trimmedInput);
          return true;
        } catch (error) {
          console.error(`Error executing command /${commandName}:`, error);
          addItem({
            type: MessageType.ERROR,
            text: `Error executing /${commandName}: ${error instanceof Error ? error.message : String(error)}`,
          });
          return true;
        }
      }
      
      // Command not found
      addItem({
        type: MessageType.ERROR,
        text: `Unknown command: /${commandName}. Type /help for available commands.`,
      });
      return true;
    },
    [addItem, slashCommands],
  );
  
  // Define available slash commands
  const slashCommands = useMemo<Command[]>(
    () => [
      // Help command
      {
        name: 'help',
        altName: 'h',
        description: 'Show available commands',
        category: 'General',
        action: () => {
          setShowHelp(true);
        },
      },
      // Clear command
      {
        name: 'clear',
        altName: 'cls',
        description: 'Clear the conversation history',
        category: 'Conversation',
        action: handleClear,
      },
      // Theme command
      {
        name: 'theme',
        description: 'Change the UI theme',
        category: 'Settings',
        action: () => {
          openThemeDialog();
        },
      },
      // Refresh command
      {
        name: 'refresh',
        description: 'Refresh context files',
        category: 'Memory',
        action: () => {
          refreshContextFiles();
        },
      },
      // Debug command
      {
        name: 'debug',
        description: 'Toggle debug mode (on/off)',
        category: 'System',
        action: handleDebug,
      },
      // Quit command
      {
        name: 'quit',
        altName: 'exit',
        description: 'Exit Claude Code',
        category: 'System',
        action: handleQuit,
      },
      // Tools command
      {
        name: 'tools',
        description: 'Toggle tool descriptions (on/off)',
        category: 'Tools',
        action: (name: string, args: string) => {
          const showDescriptions = args.trim() !== 'off';
          addItem({
            type: MessageType.INFO,
            text: `Tool descriptions ${showDescriptions ? 'enabled' : 'disabled'}`,
          });
        },
      },
    ],
    [
      setShowHelp,
      handleClear,
      openThemeDialog,
      refreshContextFiles,
      handleDebug,
      handleQuit,
      addItem,
    ],
  );
  
  return {
    handleSlashCommand,
    slashCommands,
    pendingHistoryItems,
    clearPendingItems,
  };
}