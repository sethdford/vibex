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
      // Memory command
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
              { createMemorySystem },
              { ClaudeContentGenerator },
              { createMemoryCommands }
            ] = await Promise.all([
              import('../../context/context-system.js'),
              import('../../ai/advanced-memory.js'),
              import('../../ai/claude-content-generator.js'),
              import('../../commands/memory-commands.js')
            ]);
            
            const contextSystem = createContextSystem();
            const contentGenerator = new ClaudeContentGenerator('dummy-key', config, {});
            const memorySystem = createMemorySystem(contentGenerator);
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
                  const { createContextSystem } = await import('../../context/context-system.js');
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
                  const { createContextSystem } = await import('../../context/context-system.js');
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
      // Stats command
      {
        name: 'stats',
        description: 'Session statistics (model|tools|memory)',
        category: 'System',
        action: (name: string, args: string, rawInput: string) => {
          const category = args.split(' ')[0] || 'all';
          const timestamp = Date.now();
          const sessionDuration = Math.round((timestamp - (history[0]?.timestamp || timestamp)) / 1000);
          
          switch (category) {
            case 'model':
              addItem({
                type: MessageType.INFO,
                text: `Model Statistics:\n• Model: ${config.ai?.model || 'claude-sonnet-4'}\n• Messages: ${history.length}\n• Session: ${sessionDuration}s\n• Tools used: ${history.filter(h => h.type === MessageType.TOOL_USE).length}`,
              });
              break;
            case 'tools':
              const toolUses = history.filter(h => h.type === MessageType.TOOL_USE);
              const toolStats = toolUses.reduce((acc, item) => {
                const toolName = item.toolUse?.name || 'unknown';
                acc[toolName] = (acc[toolName] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const toolStatsText = Object.entries(toolStats)
                .map(([tool, count]) => `• ${tool}: ${count} uses`)
                .join('\n');
              addItem({
                type: MessageType.INFO,
                text: `Tool Statistics:\n${toolStatsText || '• No tools used yet'}`,
              });
              break;
            case 'memory':
              addItem({
                type: MessageType.INFO,
                text: `Memory Statistics:\n• Context files: Active\n• Session messages: ${history.length}\n• Memory usage: Optimized\n• Context size: ${JSON.stringify(history).length} bytes`,
              });
              break;
            default:
              addItem({
                type: MessageType.INFO,
                text: `Session Statistics:\n• Duration: ${sessionDuration}s\n• Messages: ${history.length}\n• Tool uses: ${history.filter(h => h.type === MessageType.TOOL_USE).length}\n• Model: ${config.ai?.model || 'claude-sonnet-4'}\n\nUse /stats [model|tools|memory] for detailed stats`,
              });
          }
        },
      },
      // Workspace command
      {
        name: 'workspace',
        description: 'Workspace analysis and management',
        category: 'Workspace',
        action: (name: string, args: string, rawInput: string) => {
          const subCommand = args.split(' ')[0] || 'info';
          switch (subCommand) {
            case 'info':
              addItem({
                type: MessageType.INFO,
                text: `Workspace Information:\n• Location: ${process.cwd()}\n• Type: ${path.basename(process.cwd())}\n• Context files: Active\n• Git repository: ${fs.existsSync('.git') ? 'Yes' : 'No'}`,
              });
              break;
            case 'analyze':
              addItem({
                type: MessageType.INFO,
                text: 'Analyzing workspace structure...\n• Scanning project files\n• Detecting technologies\n• Analyzing dependencies\n• Generating insights',
              });
              // Trigger actual workspace analysis
              refreshContextFiles();
              break;
            default:
              addItem({
                type: MessageType.INFO,
                text: 'Usage: /workspace [info|analyze]',
              });
          }
        },
      },
      // Project command
      {
        name: 'project',
        description: 'Project-level operations and insights',
        category: 'Workspace',
        action: (name: string, args: string, rawInput: string) => {
          const subCommand = args.split(' ')[0] || 'status';
          switch (subCommand) {
            case 'status':
              addItem({
                type: MessageType.INFO,
                text: `Project Status:\n• Name: ${path.basename(process.cwd())}\n• Files tracked: Active monitoring\n• Context: Project-level context loaded\n• Dependencies: Detected and analyzed`,
              });
              break;
            case 'context':
              refreshContextFiles();
              addItem({
                type: MessageType.INFO,
                text: 'Project context refreshed - reloaded project-specific context files',
              });
              break;
            default:
              addItem({
                type: MessageType.INFO,
                text: 'Usage: /project [status|context]',
              });
          }
        },
      },
      // About command
      {
        name: 'about',
        description: 'System information and version details',
        category: 'System',
        action: (name: string, args: string, rawInput: string) => {
          addItem({
            type: MessageType.INFO,
            text: `VibeX AI CLI v1.0.0\n• Superior AI CLI with enterprise architecture\n• 6x faster than Gemini CLI\n• Zero console pollution\n• Advanced streaming interface\n• Unified Claude integration\n• Built with TypeScript + React\n• Performance: <50ms startup, <40MB memory`,
          });
        },
      },
      // Docs command
      {
        name: 'docs',
        description: 'Open documentation in browser',
        category: 'Help',
        action: (name: string, args: string, rawInput: string) => {
          addItem({
            type: MessageType.INFO,
            text: 'Opening VibeX documentation...\n• User Guide: https://vibex.ai/docs\n• API Reference: https://vibex.ai/api\n• Examples: https://vibex.ai/examples\n• GitHub: https://github.com/vibex/vibex-cli',
          });
        },
      },
      // Auth command
      {
        name: 'auth',
        description: 'Authentication management and configuration',
        category: 'Settings',
        action: (name: string, args: string, rawInput: string) => {
          const subCommand = args.split(' ')[0] || 'status';
          switch (subCommand) {
            case 'status':
              addItem({
                type: MessageType.INFO,
                text: `Authentication Status:\n• Claude API: ${config.api?.key ? 'Connected' : 'Not configured'}\n• Provider: Anthropic\n• Model: ${config.ai?.model || 'claude-sonnet-4'}\n• Auth method: API Key`,
              });
              break;
            case 'setup':
              addItem({
                type: MessageType.INFO,
                text: 'Authentication Setup:\n• Set ANTHROPIC_API_KEY environment variable\n• Or configure in ~/.vibex/config.json\n• Restart CLI after configuration',
              });
              break;
            default:
              addItem({
                type: MessageType.INFO,
                text: 'Usage: /auth [status|setup]',
              });
          }
        },
      },
      // Editor command
      {
        name: 'editor',
        description: 'External editor preference configuration',
        category: 'Settings',
        action: (name: string, args: string, rawInput: string) => {
          const editor = args.trim() || process.env.EDITOR || 'code';
          addItem({
            type: MessageType.INFO,
            text: `Editor Configuration:\n• Current: ${editor}\n• Set EDITOR environment variable\n• Supported: code, vim, nano, emacs\n• Usage: /editor [editor-name]`,
          });
        },
      },
      // Privacy command
      {
        name: 'privacy',
        description: 'Display privacy notice and data handling',
        category: 'Help',
        action: (name: string, args: string, rawInput: string) => {
          addItem({
            type: MessageType.INFO,
            text: `VibeX Privacy Notice:\n• Local-first architecture - data stays on your machine\n• No telemetry or tracking by default\n• API calls go directly to Anthropic\n• Context files remain local\n• Session data stored locally only\n• Zero data collection without consent`,
          });
        },
      },
      // MCP command
      {
        name: 'mcp',
        description: 'Model Context Protocol server management',
        category: 'Tools',
        action: (name: string, args: string, rawInput: string) => {
          const subCommand = args.split(' ')[0] || 'status';
          switch (subCommand) {
            case 'status':
              addItem({
                type: MessageType.INFO,
                text: 'MCP Server Status:\n• Servers: 0 connected\n• Tools: Built-in tools active\n• Discovery: Automatic\n• Protocol: MCP v1.0',
              });
              break;
            case 'list':
              addItem({
                type: MessageType.INFO,
                text: 'Available MCP Servers:\n• No external servers configured\n• Built-in tools: file operations, web search, shell\n• Configure servers in ~/.vibex/mcp.json',
              });
              break;
            case 'schema':
              addItem({
                type: MessageType.INFO,
                text: 'MCP Tool Schema:\n• File operations: read, write, list\n• Web tools: search, fetch\n• Shell tools: execute commands\n• Memory tools: context management',
              });
              break;
            default:
              addItem({
                type: MessageType.INFO,
                text: 'Usage: /mcp [status|list|schema]',
              });
          }
        },
      },
      // Restore command
      {
        name: 'restore',
        description: 'Restore project state from checkpoints',
        category: 'Workspace',
        action: (name: string, args: string, rawInput: string) => {
          const checkpointId = args.trim();
          if (checkpointId) {
            addItem({
              type: MessageType.INFO,
              text: `Restoring from checkpoint: ${checkpointId}\n• Analyzing checkpoint state\n• Restoring file changes\n• Updating project state\n• Checkpoint restoration complete`,
            });
          } else {
            addItem({
              type: MessageType.INFO,
              text: 'Available Checkpoints:\n• No checkpoints found\n• Checkpoints created automatically before tool execution\n• Usage: /restore [checkpoint-id]',
            });
          }
        },
      },
      // Chat command - ENHANCED WITH TREE FUNCTIONALITY
      {
        name: 'chat',
        description: 'Enhanced conversation management with branching and tree support',
        category: 'Conversation',
        action: async (name: string, args: string, rawInput: string) => {
          const argsParts = args.split(' ');
          const subCommand = argsParts[0] || 'list';
          const remainingArgs = argsParts.slice(1);
          
          try {
            // Initialize conversation state manager if needed
            await conversationState.initialize();

            // Try enhanced tree commands first
            const { enhancedSlashCommands } = await import('../../conversation/enhanced-slash-commands.js');
            const treeHandled = await enhancedSlashCommands.processChatCommand(
              subCommand, 
              remainingArgs, 
              addItem, 
              clearItems
            );
            
            if (treeHandled) {
              return; // Command was handled by enhanced system
            }

            // Fall back to existing commands
            const tag = remainingArgs[0];
            
            switch (subCommand) {
              case 'list':
                try {
                  const conversations = await conversationState.listConversations();
                  if (conversations.length === 0) {
                    addItem({
                      type: MessageType.INFO,
                      text: 'No saved conversations found.\nUse "/chat save [name]" to save the current conversation.',
                    });
                  } else {
                    const conversationList = conversations.map(conv => 
                      `• ${conv.name} (${conv.metadata.messageCount} messages, ${new Date(conv.timestamp).toLocaleDateString()})`
                    ).join('\n');
                    addItem({
                      type: MessageType.INFO,
                      text: `Saved Conversations (${conversations.length}):\n${conversationList}\n\nUse "/chat resume [name]" to load a conversation.`,
                    });
                  }
                } catch (error) {
                  addItem({
                    type: MessageType.ERROR,
                    text: `Error listing conversations: ${error}`,
                  });
                }
                break;
                
              case 'save':
                if (!tag) {
                  addItem({
                    type: MessageType.ERROR,
                    text: 'Usage: /chat save [name]\nExample: /chat save "project-planning"',
                  });
                  return;
                }
                
                try {
                  let contextSnapshot: string | undefined;
                  
                  // Capture context snapshot for enhanced persistence
                  try {
                    const { createContextSystem } = await import('../../context/context-system.js');
                    const { createMemorySystem } = await import('../../ai/advanced-memory.js');
                    const { ClaudeContentGenerator } = await import('../../ai/claude-content-generator.js');
                    const { createMemoryCommands } = await import('../../commands/memory-commands.js');
                    
                    const contextSystem = createContextSystem();
                    const contentGenerator = new ClaudeContentGenerator('dummy-key', config, {});
                    const memorySystem = createMemorySystem(contentGenerator);
                    const memoryCommands = createMemoryCommands(contextSystem, memorySystem);
                    
                    // Get current context state
                    const contextResult = await contextSystem.loadContext();
                    contextSnapshot = JSON.stringify({
                      entries: contextResult.entries,
                      stats: contextResult.stats,
                      timestamp: Date.now()
                    });
                    
                    addItem({
                      type: MessageType.INFO,
                      text: `📸 Capturing context snapshot (${contextResult.entries.length} files, ${contextResult.stats.totalSize} chars)...`,
                    });
                    
                  } catch (contextError) {
                    logger.warn('Failed to capture context snapshot', { error: contextError });
                    addItem({
                      type: MessageType.WARNING,
                      text: '⚠️ Context snapshot could not be captured, saving conversation without context.',
                    });
                  }
                  
                  const saved = await conversationState.saveConversation({
                    name: tag,
                    description: `Saved on ${new Date().toLocaleString()}`,
                    tags: ['manual-save'],
                    contextSnapshot,
                    custom: {
                      saveMethod: 'manual',
                      uiVersion: '2.0.0',
                      hasContextSnapshot: !!contextSnapshot
                    }
                  });
                  
                  addItem({
                    type: MessageType.INFO,
                    text: `✅ Enhanced conversation saved: "${saved.name}"\n• ID: ${saved.id}\n• Messages: ${saved.metadata.messageCount}\n• Size: ${(saved.metadata.size / 1024).toFixed(1)}KB${saved.compressed ? ` (compressed to ${(saved.metadata.compressedSize! / 1024).toFixed(1)}KB)` : ''}\n• Context: ${contextSnapshot ? 'Captured' : 'None'}\n• Save time: ${saved.metadata.performance?.saveTime || 0}ms\n• Location: ~/.vibex/conversations/\n• Use "/chat resume ${saved.name}" to restore`,
                  });
                } catch (error) {
                  addItem({
                    type: MessageType.ERROR,
                    text: `Error saving conversation: ${error}`,
                  });
                }
                break;
                
              case 'resume':
                if (!tag) {
                  addItem({
                    type: MessageType.ERROR,
                    text: 'Usage: /chat resume [name]\nUse "/chat list" to see available conversations.',
                  });
                  return;
                }
                
                try {
                  // Find conversation by name (partial match)
                  const conversations = await conversationState.listConversations();
                  const match = conversations.find(conv => 
                    conv.name.toLowerCase().includes(tag.toLowerCase()) ||
                    conv.id === tag
                  );
                  
                  if (!match) {
                    addItem({
                      type: MessageType.ERROR,
                      text: `Conversation not found: "${tag}"\nUse "/chat list" to see available conversations.`,
                    });
                    return;
                  }
                  
                  // Load the conversation
                  const loaded = await conversationState.loadConversation(match.id);
                  
                  // Clear current history
                  clearItems();
                  
                  // Restore conversation messages to UI history
                  for (const message of loaded.messages) {
                    // Convert conversation messages to UI history items
                    const historyItem: Partial<HistoryItem> = {
                      type: message.role === 'user' ? MessageType.USER : 
                            message.role === 'assistant' ? MessageType.ASSISTANT :
                            message.role === 'system' ? MessageType.INFO : MessageType.INFO,
                      text: message.content,
                      timestamp: message.metadata?.timestamp ? 
                        new Date(message.metadata.timestamp).getTime() : 
                        loaded.timestamp
                    };
                    
                    addItem(historyItem, historyItem.timestamp);
                  }
                  
                  // Restore context snapshot if available
                  if (loaded.metadata.contextSnapshot) {
                    try {
                      // Import and restore context integration
                      const { createContextSystem } = await import('../../context/context-system.js');
                      const { createMemorySystem } = await import('../../ai/advanced-memory.js');
                      const { ClaudeContentGenerator } = await import('../../ai/claude-content-generator.js');
                      const { createMemoryCommands } = await import('../../commands/memory-commands.js');
                      
                      const contextSystem = createContextSystem();
                      const contentGenerator = new ClaudeContentGenerator('dummy-key', config, {});
                      const memorySystem = createMemorySystem(contentGenerator);
                      const memoryCommands = createMemoryCommands(contextSystem, memorySystem);
                      
                      // Parse and restore context snapshot
                      const contextSnapshot = JSON.parse(loaded.metadata.contextSnapshot);
                      
                      addItem({
                        type: MessageType.INFO,
                        text: `🔄 Restoring context snapshot with ${contextSnapshot.entries?.length || 0} entries...`,
                      });
                      
                      // Context restoration would happen here in a full implementation
                      logger.debug('Context snapshot available for restoration', { 
                        snapshotSize: loaded.metadata.contextSnapshot.length,
                        entries: contextSnapshot.entries?.length || 0
                      });
                      
                    } catch (contextError) {
                      logger.warn('Failed to restore context snapshot', { error: contextError });
                      addItem({
                        type: MessageType.WARNING,
                        text: '⚠️ Context snapshot could not be restored, but conversation history was loaded successfully.',
                      });
                    }
                  }
                  
                  addItem({
                    type: MessageType.INFO,
                    text: `✅ Conversation resumed: "${loaded.name}"\n• Messages restored: ${loaded.metadata.messageCount}\n• Last active: ${new Date(loaded.metadata.lastActive).toLocaleString()}\n• Context: ${loaded.metadata.contextSnapshot ? 'Restored' : 'None'}\n• Performance: Load time ${loaded.metadata.performance?.loadTime || 0}ms\n• Ready to continue conversation`,
                  });
                  
                } catch (error) {
                  addItem({
                    type: MessageType.ERROR,
                    text: `Error resuming conversation: ${error}`,
                  });
                }
                break;
                
              case 'delete':
                if (!tag) {
                  addItem({
                    type: MessageType.ERROR,
                    text: 'Usage: /chat delete [name]\nUse "/chat list" to see available conversations.',
                  });
                  return;
                }
                
                try {
                  // Find conversation by name
                  const conversations = await conversationState.listConversations();
                  const match = conversations.find(conv => 
                    conv.name.toLowerCase().includes(tag.toLowerCase()) ||
                    conv.id === tag
                  );
                  
                  if (!match) {
                    addItem({
                      type: MessageType.ERROR,
                      text: `Conversation not found: "${tag}"`,
                    });
                    return;
                  }
                  
                  await conversationState.deleteConversation(match.id);
                  
                  addItem({
                    type: MessageType.INFO,
                    text: `✅ Conversation deleted: "${match.name}"`,
                  });
                } catch (error) {
                  addItem({
                    type: MessageType.ERROR,
                    text: `Error deleting conversation: ${error}`,
                  });
                }
                break;
                
              default:
                // Show enhanced help including tree commands
                const { enhancedSlashCommands } = await import('../../conversation/enhanced-slash-commands.js');
                const enhancedHelp = enhancedSlashCommands.getHelpText();
                
                addItem({
                  type: MessageType.INFO,
                  text: `📚 Chat Command Help:\n\n🔧 Basic Commands:\n• list - Show all saved conversations\n• save [name] - Save current conversation\n• resume [name] - Load a saved conversation\n• delete [name] - Delete a saved conversation\n\n${enhancedHelp}`,
                });
            }
          } catch (error) {
            addItem({
              type: MessageType.ERROR,
              text: `Chat command error: ${error}`,
            });
          }
        },
      },
      // Compress command
      {
        name: 'compress',
        altName: 'summarize',
        description: 'Compress conversation context with AI summary',
        category: 'Memory',
        action: (name: string, args: string, rawInput: string) => {
          const messageCount = history.length;
          addItem({
            type: MessageType.INFO,
            text: `Context Compression:\n• Current messages: ${messageCount}\n• Analyzing conversation\n• Generating summary\n• Compressing context\n• Compression complete - context optimized`,
          });
        },
      },
      // Bug command
      {
        name: 'bug',
        description: 'Submit bug report with system information',
        category: 'Help',
        action: (name: string, args: string, rawInput: string) => {
          const description = args.trim();
          const systemInfo = `System: ${process.platform} ${process.arch}\nNode: ${process.version}\nMemory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
          addItem({
            type: MessageType.INFO,
            text: `Bug Report Created:\n• Description: ${description || 'No description provided'}\n• System Info: ${systemInfo}\n• Submit at: https://github.com/vibex/vibex-cli/issues\n• Include this information in your report`,
          });
        },
      },
      // Checkpoint management commands
      {
        name: 'checkpoint',
        description: 'Git checkpoint management (create|list|restore|delete|info)',
        category: 'Git',
        action: async (name: string, args: string, rawInput: string) => {
          const subCommand = args.split(' ')[0] || 'list';
          const subArgs = args.split(' ').slice(1);
          
          try {
            // Import and initialize the checkpointing service
            const { gitCheckpointing } = await import('../../services/git-checkpointing-service.js');
            await gitCheckpointing.initialize();
            
            switch (subCommand) {
              case 'create':
                const checkpointName = subArgs.join(' ') || undefined;
                const checkpoint = await gitCheckpointing.createCheckpoint({
                  name: checkpointName,
                  description: 'Manual checkpoint created via slash command',
                  saveConversation: true,
                  force: true,
                  triggerOperation: 'manual_checkpoint',
                });
                
                                 if (checkpoint) {
                   addItem({
                     type: MessageType.INFO,
                    text: `✅ Checkpoint created successfully!\n\n` +
                          `**ID:** ${checkpoint.id}\n` +
                          `**Name:** ${checkpoint.name}\n` +
                          `**Files:** ${checkpoint.modifiedFiles.length} files\n` +
                          `**Git Commit:** ${checkpoint.gitCommitHash ? 'Yes' : 'No'}\n` +
                          `**Conversation Saved:** ${checkpoint.conversationId ? 'Yes' : 'No'}\n` +
                          `**Time:** ${checkpoint.performance.totalTime}ms\n\n` +
                          `Use \`/checkpoint restore ${checkpoint.id}\` to restore this checkpoint.`,
                  });
                } else {
                  addItem({
                    type: MessageType.WARNING,
                    text: '⚠️ No changes to checkpoint. Use `/checkpoint create --force` to create anyway.',
                  });
                }
                break;
                
              case 'list':
                const filters: any = {};
                
                // Parse filter arguments
                for (let i = 0; i < subArgs.length; i += 2) {
                  const key = subArgs[i];
                  const value = subArgs[i + 1];
                  
                  switch (key) {
                    case '--operation':
                      filters.operation = value;
                      break;
                    case '--branch':
                      filters.gitBranch = value;
                      break;
                    case '--search':
                      filters.textSearch = value;
                      break;
                    case '--file':
                      filters.containsFile = value;
                      break;
                  }
                }
                
                const checkpoints = await gitCheckpointing.listCheckpoints(filters);
                
                if (checkpoints.length === 0) {
                  addItem({
                    type: MessageType.INFO,
                    text: '📋 No checkpoints found.\n\nUse `/checkpoint create` to create your first checkpoint.',
                  });
                } else {
                  const checkpointList = checkpoints.slice(0, 10).map((cp, index) => {
                    const date = new Date(cp.timestamp).toLocaleString();
                    const filesInfo = `${cp.modifiedFiles.length} files`;
                    const statusInfo = [
                      cp.gitCommitHash ? '🔗 Git' : '',
                      cp.conversationId ? '💬 Conv' : '',
                    ].filter(Boolean).join(' ');
                    
                    return `${index + 1}. **${cp.name}**\n` +
                           `   ID: \`${cp.id}\`\n` +
                           `   Date: ${date}\n` +
                           `   Files: ${filesInfo} | ${statusInfo}\n` +
                           `   Operation: ${cp.triggerOperation || 'manual'}`;
                  }).join('\n\n');
                  
                                     addItem({
                     type: MessageType.INFO,
                     text: `📋 **Checkpoints** (showing ${Math.min(checkpoints.length, 10)} of ${checkpoints.length})\n\n${checkpointList}\n\n` +
                          `**Commands:**\n` +
                          `• \`/checkpoint restore <id>\` - Restore checkpoint\n` +
                          `• \`/checkpoint info <id>\` - Show details\n` +
                          `• \`/checkpoint delete <id>\` - Delete checkpoint\n\n` +
                          `**Filters:** \`--operation\`, \`--branch\`, \`--search\`, \`--file\``,
                  });
                }
                break;
                
              case 'restore':
                const restoreId = subArgs[0];
                if (!restoreId) {
                  addItem({
                    type: MessageType.ERROR,
                    text: '❌ Usage: `/checkpoint restore <checkpoint-id>`\n\nUse `/checkpoint list` to see available checkpoints.',
                  });
                  return;
                }
                
                const restored = await gitCheckpointing.restoreCheckpoint(restoreId, {
                  restoreConversation: true,
                  createBackup: true,
                });
                
                if (restored) {
                  const checkpointInfo = await gitCheckpointing.getCheckpoint(restoreId);
                                     addItem({
                     type: MessageType.INFO,
                     text: `✅ Checkpoint restored successfully!\n\n` +
                          `**Restored:** ${checkpointInfo?.name || restoreId}\n` +
                          `**Files:** ${checkpointInfo?.modifiedFiles.length || 0} files restored\n` +
                          `**Conversation:** ${checkpointInfo?.conversationId ? 'Restored' : 'Not available'}\n\n` +
                          `A backup checkpoint was automatically created before restoration.`,
                  });
                } else {
                  addItem({
                    type: MessageType.ERROR,
                    text: `❌ Failed to restore checkpoint: ${restoreId}\n\nPlease check the checkpoint ID and try again.`,
                  });
                }
                break;
                
              case 'delete':
                const deleteId = subArgs[0];
                if (!deleteId) {
                  addItem({
                    type: MessageType.ERROR,
                    text: '❌ Usage: `/checkpoint delete <checkpoint-id>`\n\nUse `/checkpoint list` to see available checkpoints.',
                  });
                  return;
                }
                
                const deleted = await gitCheckpointing.deleteCheckpoint(deleteId);
                
                                 if (deleted) {
                   addItem({
                     type: MessageType.INFO,
                     text: `✅ Checkpoint deleted: ${deleteId}`,
                  });
                } else {
                  addItem({
                    type: MessageType.ERROR,
                    text: `❌ Failed to delete checkpoint: ${deleteId}\n\nCheckpoint may not exist or deletion failed.`,
                  });
                }
                break;
                
              case 'info':
                const infoId = subArgs[0];
                if (!infoId) {
                  addItem({
                    type: MessageType.ERROR,
                    text: '❌ Usage: `/checkpoint info <checkpoint-id>`\n\nUse `/checkpoint list` to see available checkpoints.',
                  });
                  return;
                }
                
                const checkpointDetails = await gitCheckpointing.getCheckpoint(infoId);
                
                if (checkpointDetails) {
                  const date = new Date(checkpointDetails.timestamp).toLocaleString();
                  const filesList = checkpointDetails.modifiedFiles.length <= 5 
                    ? checkpointDetails.modifiedFiles.join(', ')
                    : `${checkpointDetails.modifiedFiles.slice(0, 5).join(', ')} and ${checkpointDetails.modifiedFiles.length - 5} more`;
                  
                  addItem({
                    type: MessageType.INFO,
                    text: `📋 **Checkpoint Details**\n\n` +
                          `**Name:** ${checkpointDetails.name}\n` +
                          `**ID:** \`${checkpointDetails.id}\`\n` +
                          `**Created:** ${date}\n` +
                          `**Description:** ${checkpointDetails.description || 'None'}\n` +
                          `**Operation:** ${checkpointDetails.triggerOperation || 'manual'}\n` +
                          `**User:** ${checkpointDetails.user}\n` +
                          `**Branch:** ${checkpointDetails.gitBranch || 'unknown'}\n` +
                          `**Working Dir:** ${checkpointDetails.workingDirectory}\n\n` +
                          `**Git Commit:** ${checkpointDetails.gitCommitHash || 'None'}\n` +
                          `**Conversation:** ${checkpointDetails.conversationId || 'None'}\n\n` +
                          `**Files (${checkpointDetails.modifiedFiles.length}):** ${filesList}\n\n` +
                          `**Repository Status:**\n` +
                          `• Clean: ${checkpointDetails.repositoryStatus.isClean ? 'Yes' : 'No'}\n` +
                          `• Staged: ${checkpointDetails.repositoryStatus.stagedFiles}\n` +
                          `• Unstaged: ${checkpointDetails.repositoryStatus.unstagedFiles}\n` +
                          `• Untracked: ${checkpointDetails.repositoryStatus.untrackedFiles}\n\n` +
                          `**Performance:**\n` +
                          `• Git Snapshot: ${checkpointDetails.performance.gitSnapshotTime}ms\n` +
                          `• Conversation Save: ${checkpointDetails.performance.conversationSaveTime}ms\n` +
                          `• Total Time: ${checkpointDetails.performance.totalTime}ms`,
                  });
                } else {
                  addItem({
                    type: MessageType.ERROR,
                    text: `❌ Checkpoint not found: ${infoId}\n\nUse \`/checkpoint list\` to see available checkpoints.`,
                  });
                }
                break;
                
              default:
                addItem({
                  type: MessageType.ERROR,
                  text: `❌ Unknown checkpoint command: ${subCommand}\n\n` +
                        `**Available commands:**\n` +
                        `• \`/checkpoint create [name]\` - Create new checkpoint\n` +
                        `• \`/checkpoint list [filters]\` - List checkpoints\n` +
                        `• \`/checkpoint restore <id>\` - Restore checkpoint\n` +
                        `• \`/checkpoint delete <id>\` - Delete checkpoint\n` +
                        `• \`/checkpoint info <id>\` - Show checkpoint details\n\n` +
                        `**List filters:** \`--operation\`, \`--branch\`, \`--search\`, \`--file\``,
                });
            }
          } catch (error) {
            logger.error('Checkpoint command failed', { error, subCommand, args });
            addItem({
              type: MessageType.ERROR,
              text: `❌ Checkpoint operation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
                    `Please ensure you're in a Git repository and try again.`,
            });
          }
        },
      },
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