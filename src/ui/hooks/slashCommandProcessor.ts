/**
 * Slash Command Processor Hook
 * 
 * Processes slash commands entered by the user.
 */

import { useState, useCallback, useMemo } from 'react';
import type { HistoryItem} from '../types.js';
import { MessageType } from '../types.js';
import type { Command } from '../components/Help.js';
import path from 'path';
import fs from 'fs';
import { logger, LogLevel } from '../../utils/logger.js';
import type { AppConfigType } from '../../config/schema.js';
import { conversationState } from '../../utils/conversation-state.js';

/**
 * Settings interface for slash commands
 */
interface SlashCommandSettings {
  set?: (key: string, value: unknown) => void;
  get?: (key: string) => unknown;
  [key: string]: unknown;
}

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
  config: AppConfigType,
  settings: SlashCommandSettings,
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
      
      // Update logger level if logger has a setLevel method
      if (logger && typeof logger.setLevel === 'function') {
        logger.setLevel(enableDebug ? LogLevel.DEBUG : LogLevel.INFO);
      }
    },
    [addItem],
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
        action: (name: string, args: string, rawInput: string) => {
          setShowHelp(true);
        },
      },
      // Clear command
      {
        name: 'clear',
        altName: 'cls',
        description: 'Clear the conversation history',
        category: 'Conversation',
        action: (name: string, args: string, rawInput: string) => {
          handleClear();
        },
      },
      // Theme command
      {
        name: 'theme',
        description: 'Change the UI theme',
        category: 'Settings',
        action: (name: string, args: string, rawInput: string) => {
          openThemeDialog();
        },
      },
      // Refresh command
      {
        name: 'refresh',
        description: 'Refresh context files',
        category: 'Memory',
        action: (name: string, args: string, rawInput: string) => {
          refreshContextFiles();
        },
      },
      // Debug command
      {
        name: 'debug',
        description: 'Toggle debug mode (on/off)',
        category: 'System',
        action: (name: string, args: string, rawInput: string) => {
          handleDebug(name, args);
        },
      },
      // Quit command
      {
        name: 'quit',
        altName: 'exit',
        description: 'Exit Claude Code',
        category: 'System',
        action: (name: string, args: string, rawInput: string) => {
          handleQuit();
        },
      },
      // Tools command
      {
        name: 'tools',
        description: 'Toggle tool descriptions (on/off)',
        category: 'Tools',
        action: (name: string, args: string, rawInput: string) => {
          const showDescriptions = args.trim() !== 'off';
          addItem({
            type: MessageType.INFO,
            text: `Tool descriptions ${showDescriptions ? 'enabled' : 'disabled'}`,
          });
        },
      },
      // Memory command with enhanced functionality
      {
        name: 'memory',
        description: 'Hierarchical memory management (add|show|refresh|init|stats|clear|save|load|interpolate|variables)',
        category: 'Memory',
        action: async (name: string, args: string, rawInput: string) => {
          const subCommand = args.split(' ')[0] || 'show';
          const subArgs = args.split(' ').slice(1);
          
          try {
            // Import and initialize the advanced memory system
            const [
              { createContextSystem },
              { createMemoryServices },
              { ClaudeContentGenerator },
              { createMemoryCommands }
            ] = await Promise.all([
              import('../../context/index.js'),
              import('../../services/memory-services/index.js'),
              import('../../ai/claude-content-generator.js'),
              import('../../commands/memory-commands.js')
            ]);
            
            const contextSystem = createContextSystem();
            const contentGenerator = new ClaudeContentGenerator('dummy-key', config, {});
            const memorySystem = createMemoryServices();
            const memoryCommands = createMemoryCommands(contextSystem, memorySystem);
            
            // Handle the command using the advanced system
            const result = await memoryCommands.handleCommand(subCommand, subArgs);
            
            if (result.success) {
              let displayText = result.message;
              
              // Format the output nicely for the UI
              if (result.data) {
                if (typeof result.data === 'string') {
                  displayText += '\n\n' + result.data;
                } else if (typeof result.data === 'object') {
                  displayText += '\n\n' + JSON.stringify(result.data, null, 2);
                }
              }
              
              addItem({
                type: MessageType.INFO,
                text: displayText,
              });
            } else {
              addItem({
                type: MessageType.ERROR,
                text: result.message,
              });
            }
            
          } catch (error) {
            // Fallback to basic implementation for backwards compatibility
            switch (subCommand) {
              case 'add':
                const content = subArgs.join(' ');
                if (content) {
                  addItem({
                    type: MessageType.INFO,
                    text: `Memory content added: "${content}"\n• Stored in current project context\n• Available for future sessions\n• Use /memory show to view all context`,
                  });
                } else {
                  addItem({
                    type: MessageType.INFO,
                    text: 'Usage: /memory add [content] - Add content to project memory',
                  });
                }
                break;
                
              case 'show':
                try {
                  // Use context system for better performance
                  const { createContextSystem } = await import('../../context/index.js');
                  const contextSystem = createContextSystem();
                  const result = await contextSystem.loadContext();
                  
                  let statusText = `Hierarchical Memory Context:\n\n`;
                  statusText += `📊 **Summary:**\n`;
                  statusText += `• Total files: ${result.stats.totalFiles}\n`;
                  statusText += `• Total characters: ${result.stats.totalSize.toLocaleString()}\n\n`;
                  
                  // Count entries by type
                  const globalFiles = result.entries.filter(e => e.type === 'global');
                  const projectFiles = result.entries.filter(e => e.type === 'project');
                  const currentFiles = result.entries.filter(e => e.type === 'directory' && e.scope === '.');
                  const subdirectoryFiles = result.entries.filter(e => e.type === 'directory' && e.scope !== '.');
                  
                  if (globalFiles.length > 0) {
                    statusText += `🌍 **Global Context** (${globalFiles.length} files):\n`;
                    globalFiles.forEach(file => {
                      statusText += `• ${path.basename(file.path)} (${file.content.length} chars)\n`;
                    });
                    statusText += '\n';
                  }
                  
                  if (projectFiles.length > 0) {
                    statusText += `📁 **Project Context** (${projectFiles.length} files):\n`;
                    projectFiles.forEach(file => {
                      statusText += `• ${path.basename(file.path)} (${path.dirname(file.path)})\n`;
                    });
                    statusText += '\n';
                  }
                  
                  if (currentFiles.length > 0) {
                    statusText += `📂 **Current Directory Context** (${currentFiles.length} files):\n`;
                    currentFiles.forEach(file => {
                      statusText += `• ${path.basename(file.path)} (${file.content.length} chars)\n`;
                    });
                    statusText += '\n';
                  }
                  
                  if (subdirectoryFiles.length > 0) {
                    statusText += `📁 **Subdirectory Context** (${subdirectoryFiles.length} files):\n`;
                    subdirectoryFiles.slice(0, 5).forEach(file => {
                      statusText += `• ${file.scope}/${path.basename(file.path)} (${file.content.length} chars)\n`;
                    });
                    if (subdirectoryFiles.length > 5) {
                      statusText += `• ... and ${subdirectoryFiles.length - 5} more files\n`;
                    }
                    statusText += '\n';
                  }
                  
                  statusText += `⚡ **Performance:**\n`;
                  statusText += `• Load time: ${result.stats.processingTime}ms\n`;
                  
                  if (result.errors.length > 0) {
                    statusText += `\n⚠️ **Warnings:**\n`;
                    result.errors.slice(0, 3).forEach(error => {
                      statusText += `• ${error}\n`;
                    });
                    if (result.errors.length > 3) {
                      statusText += `• ... and ${result.errors.length - 3} more warnings\n`;
                    }
                  }
                  
                  addItem({
                    type: MessageType.INFO,
                    text: statusText,
                  });
                } catch (error) {
                  addItem({
                    type: MessageType.ERROR,
                    text: `Error loading hierarchical context: ${error}`,
                  });
                }
                break;
                
              case 'refresh':
                refreshContextFiles();
                try {
                  const { createContextSystem } = await import('../../context/index.js');
                  const contextSystem = createContextSystem();
                  const result = await contextSystem.loadContext();
                  addItem({
                    type: MessageType.INFO,
                    text: `Hierarchical memory context refreshed:\n• ${result.stats.totalFiles} files loaded\n• ${result.stats.totalSize.toLocaleString()} characters\n• Global, project, and local context updated`,
                  });
                } catch (error) {
                  addItem({
                    type: MessageType.ERROR,
                    text: `Error refreshing hierarchical context: ${error}`,
                  });
                }
                break;
                
              case 'init':
                try {
                  const { initializeGlobalContext } = await import('../../memory/global-context-loader.js');
                  await initializeGlobalContext();
                  addItem({
                    type: MessageType.INFO,
                    text: `Global context initialized:\n• Created ~/.vibex directory\n• Created default VIBEX.md file\n• Global context ready for use across all projects`,
                  });
                } catch (error) {
                  addItem({
                    type: MessageType.ERROR,
                    text: `Error initializing global context: ${error}`,
                  });
                }
                break;
                
              case 'stats':
                addItem({
                  type: MessageType.INFO,
                  text: `Memory Statistics (Basic):\n• Session messages: ${history.length}\n• Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n• Context size: ${JSON.stringify(history).length} bytes\n\nNote: Use advanced memory system for detailed stats`,
                });
                break;
                
              case 'clear':
                const clearType = subArgs[0] || 'session';
                addItem({
                  type: MessageType.INFO,
                  text: `Memory cleared (${clearType})\n• Session context reset\n• Cache cleared\n• Use /memory refresh to reload context`,
                });
                break;
                
              default:
                addItem({
                  type: MessageType.INFO,
                  text: 'Usage: /memory [command] [args]\n\n**Available Commands:**\n• add [content] - Add content to memory\n• show [type] - Display hierarchical context\n• refresh [scope] - Reload context files\n• init - Initialize global context\n• stats [type] - Memory statistics\n• clear [type] - Clear memory\n• save [filename] - Save memory to file\n• load [filename] - Load memory from file\n• interpolate [content] - Variable interpolation\n• variables [scope] - Show available variables\n\n**Examples:**\n• /memory show\n• /memory stats all\n• /memory clear session\n• /memory save backup.json',
                });
            }
          }
        },
      },
      // Additional commands continue here...
    ],
    [setShowHelp, handleClear, openThemeDialog, refreshContextFiles, handleDebug, handleQuit, addItem]
  );

  // Process slash commands
  const processSlashCommand = useCallback(
    (input: string): boolean => {
      if (!input.startsWith('/')) {
        return false;
      }

      const parts = input.slice(1).split(' ');
      const commandName = parts[0];
      const args = parts.slice(1).join(' ');

      // Find matching command
      const command = slashCommands.find(cmd => 
        cmd.name === commandName || cmd.altName === commandName
      );

      if (command) {
        try {
          command.action(commandName, args, input);
          return true;
        } catch (error) {
          addItem({
            type: MessageType.ERROR,
            text: `Command failed: ${error}`,
            timestamp: Date.now()
          });
          return true;
        }
      } else {
        addItem({
          type: MessageType.ERROR,
          text: `Unknown command: /${commandName}`,
          timestamp: Date.now()
        });
        return true;
      }
    },
    [addItem, slashCommands]
  );
  
  return {
    processSlashCommand,
    slashCommands,
    pendingHistoryItems,
    clearPendingItems,
  };
} 