/**
 * Command Registration
 * 
 * Registers all available CLI commands with the command registry.
 */

import type { UnifiedCommand, CommandResult, CommandContext, CommandParameter } from './types.js';
import { CommandCategory } from './types.js';
import { commandRegistry } from './index.js';
import { logger } from '../utils/logger.js';
import { registerShellCommands } from './shell-command.js';
import { initAI } from '../ai/index.js';
import { fileExists, readTextFile } from '../fs/operations.js';
import { isNonEmptyString } from '../utils/validation.js';
import { formatErrorForDisplay, createUserError } from '../errors/formatter.js';
import { authManager } from '../auth/index.js';
import { ErrorCategory } from '../errors/types.js';

interface AIInterface {
  chat?: (message: string) => Promise<string>;
  complete?: (prompt: string) => Promise<string>;
  isReady?: () => boolean;
}

// Global AI interface
let aiInterface: unknown = null;

/**
 * Get or initialize AI interface
 */
async function getAI(): Promise<unknown> {
  if (!aiInterface) {
    aiInterface = await initAI();
  }
  return aiInterface;
}

/**
 * Register all commands
 */
export function registerCommands(): void {
  logger.debug('Registering commands');
  
  // Register core commands
  registerExitCommand();
  registerQuitCommand();
  registerClearCommand();
  registerCommandsCommand();
  registerHelpCommand();
  registerConfigCommand();
  registerThemeCommand();
  registerVerbosityCommand();
  registerRunCommand();
  registerResetCommand();
  registerHistoryCommand();
  
  // Register shell commands
  registerShellCommands().forEach(command => {
    // Convert legacy CommandDef to UnifiedCommand if needed
    const unifiedCommand: UnifiedCommand = {
      id: command.name,
      name: command.name,
      description: command.description,
      category: command.category || CommandCategory.SYSTEM,
      parameters: command.args?.map(arg => ({
        name: arg.name,
        description: arg.description,
        type: arg.type as 'string' | 'number' | 'boolean' | 'array',
        required: arg.required || false,
        default: arg.default,
        shortFlag: arg.shortFlag,
        position: arg.position
      })) || [],
      handler: command.handler
    };
    commandRegistry.register(unifiedCommand);
  });
  
  // Register authentication commands
  registerLoginCommand();
  registerLogoutCommand();
  
  // Register memory commands
  import('./memory-commands.js').then(module => {
    module.registerMemoryCommand(commandRegistry);
  }).catch(error => {
    logger.warn(`Failed to register memory commands: ${error}`);
  });
  
  // Register conversation state
  import('../utils/conversation-state.js').then(module => {
    module.conversationState.initialize().catch(error => {
      logger.warn(`Failed to initialize conversation state: ${error}`);
    });
  }).catch(error => {
    logger.warn(`Failed to load conversation state module: ${error}`);
  });
  
  logger.info('Commands registered successfully');
}

/**
 * Register login command
 */
function registerLoginCommand(): void {
  const command: UnifiedCommand = {
    id: 'login',
    name: 'login',
    description: 'Authenticate with Claude',
    category: CommandCategory.AUTH,
    parameters: [
      {
        name: 'api-key',
        description: 'API key for Claude AI',
        type: 'string',
        required: false,
        shortFlag: 'k'
      },
      {
        name: 'oauth',
        description: 'Use OAuth authentication',
        type: 'boolean',
        required: false,
        shortFlag: 'o'
      }
    ],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      try {
        if (await authManager.isValid()) {
          context.terminal.info('You are already logged in.');
          return { success: true, message: 'Already authenticated' };
        }

        const apiKey = context.args['api-key'] as string | undefined;
        const oauth = context.args.oauth as boolean | undefined;
        
        context.terminal.info('Authenticating with Claude...');
        
        if (apiKey) {
          await authManager.setApiKey(apiKey);
          context.terminal.success('Successfully logged in with API key.');
        } else if (oauth) {
          context.terminal.info('OAuth authentication is not yet implemented.');
          return { success: false, message: 'OAuth not implemented' };
        } else {
          context.terminal.error('Please provide an API key or use the --oauth flag.');
          return { success: false, message: 'No authentication method provided' };
        }
        
        return { success: true, message: 'Authentication successful' };
      } catch (error) {
        const errorMessage = formatErrorForDisplay(error);
        context.terminal.error(`Error during authentication: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Authentication error',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };
  
  commandRegistry.register(command);
}

/**
 * Register logout command
 */
function registerLogoutCommand(): void {
  const command: UnifiedCommand = {
    id: 'logout',
    name: 'logout',
    description: 'Log out from Claude',
    category: CommandCategory.AUTH,
    parameters: [],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      try {
        context.terminal.info('Logging out and clearing credentials...');
        
        // Call the auth manager's logout function
        await authManager.clearCredentials();
        
        context.terminal.success('Successfully logged out. All credentials have been cleared.');
        return { success: true, message: 'Logout successful' };
      } catch (error) {
        const errorMessage = formatErrorForDisplay(error);
        context.terminal.error(`Error during logout: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Logout error',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };
  
  commandRegistry.register(command);
}

/**
 * Register exit command
 */
function registerExitCommand(): void {
  const command: UnifiedCommand = {
    id: 'exit',
    name: 'exit',
    description: 'Exit the application',
    category: CommandCategory.SESSION,
    parameters: [],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing exit command');
      context.terminal.info('Exiting Claude Code CLI...');
      process.exit(0);
    }
  };

  commandRegistry.register(command);
}

/**
 * Register quit command
 */
function registerQuitCommand(): void {
  const command: UnifiedCommand = {
    id: 'quit',
    name: 'quit',
    description: 'Exit the application',
    category: CommandCategory.SESSION,
    parameters: [],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing quit command');
      context.terminal.info('Exiting Claude Code CLI...');
      process.exit(0);
    }
  };

  commandRegistry.register(command);
}

/**
 * Register clear command
 */
function registerClearCommand(): void {
  const command: UnifiedCommand = {
    id: 'clear',
    name: 'clear',
    description: 'Clear the terminal screen',
    category: CommandCategory.SESSION,
    parameters: [],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing clear command');
      
      // Clear the console using the appropriate method for the current platform
      // This is the cross-platform way to clear the terminal
      process.stdout.write('\x1Bc');
      
      context.terminal.info('Display cleared.');
      return { success: true, message: 'Display cleared' };
    }
  };

  commandRegistry.register(command);
}

/**
 * Register reset command
 */
function registerResetCommand(): void {
  const command: UnifiedCommand = {
    id: 'reset',
    name: 'reset',
    description: 'Reset the conversation history',
    category: CommandCategory.SESSION,
    parameters: [],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing reset command');
      
      try {
        // Since there's no direct reset method, we'll reinitialize the AI client
        logger.info('Reinitializing AI client to reset conversation context');
        
        // Re-initialize the AI client
        await initAI();
        
        context.terminal.success('Conversation context has been reset.');
        logger.info('AI client reinitialized, conversation context reset');
        return { success: true, message: 'Conversation context reset' };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error resetting conversation context: ${errorMessage}`);
        context.terminal.error(`Error resetting conversation context: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Reset failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register history command
 */
function registerHistoryCommand(): void {
  const command: UnifiedCommand = {
    id: 'history',
    name: 'history',
    description: 'View conversation history',
    category: CommandCategory.SESSION,
    parameters: [
      {
        name: 'limit',
        description: 'Maximum number of items to display',
        type: 'number',
        required: false,
        default: 10,
        shortFlag: 'l'
      },
      {
        name: 'search',
        description: 'Search for messages containing this text',
        type: 'string',
        required: false,
        shortFlag: 's'
      },
      {
        name: 'session',
        description: 'Show or export a specific session by ID',
        type: 'string',
        required: false
      },
      {
        name: 'export',
        description: 'Export session to file (requires --session)',
        type: 'string',
        required: false,
        shortFlag: 'e'
      }
    ],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing history command');
      
      try {
        const limit = context.args.limit as number | undefined;
        const search = context.args.search as string | undefined;
        const exportPath = context.args.export as string | undefined;
        const session = context.args.session as string | undefined;
        
        // Import the conversation history manager
        const { conversationHistory } = await import('../utils/conversation-history.js');
        
        // Initialize if not already done
        try {
          await conversationHistory.initialize();
        } catch (error) {
          // May already be initialized
        }
        
        if (exportPath && session) {
          // Export a specific session
          try {
            await conversationHistory.exportSession(session, exportPath);
            context.terminal.success(`Session exported to: ${exportPath}`);
            return { success: true, message: `Session exported to ${exportPath}` };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            context.terminal.error(`Failed to export session: ${errorMessage}`);
            return { success: false, message: 'Export failed', error: error instanceof Error ? error : new Error(String(error)) };
          }
        }
        
        if (search) {
          // Search through conversation history
          context.terminal.info(`🔍 Searching for: "${search}"`);
          
          const results = await conversationHistory.searchMessages(search, limit || 20);
          
          if (results.length === 0) {
            context.terminal.info('No messages found matching your search.');
            return { success: true, message: 'No results found' };
          }
          
          context.terminal.info(`Found ${results.length} matching messages:`);
          
          results.forEach((message, index) => {
            const timestamp = new Date(message.timestamp).toLocaleString();
            const role = message.role.toUpperCase().padEnd(9);
            const preview = message.content.length > 100 
              ? `${message.content.substring(0, 100)}...`
              : message.content;
            
            context.terminal.info(`${index + 1}. [${timestamp}] ${role} ${preview}`);
            
            if (message.metadata?.command) {
              context.terminal.info(`   Command: /${message.metadata.command}`);
            }
            if (message.metadata?.file) {
              context.terminal.info(`   File: ${message.metadata.file}`);
            }
          });
          
          return { success: true, message: `Found ${results.length} messages` };
        }
        
        if (session) {
          // Show a specific session
          try {
            const sessionData = await conversationHistory.loadSession(session);
            
            context.terminal.info(`📖 Session: ${sessionData.title || sessionData.id}`);
            context.terminal.info(`Started: ${new Date(sessionData.startTime).toLocaleString()}`);
            if (sessionData.endTime) {
              context.terminal.info(`Ended: ${new Date(sessionData.endTime).toLocaleString()}`);
            }
            if (sessionData.stats) {
              context.terminal.info(`Messages: ${sessionData.stats.messageCount}, Tokens: ${sessionData.stats.totalTokens}`);
            }
            
            const messagesToShow = limit ? sessionData.messages.slice(-limit) : sessionData.messages;
            
            messagesToShow.forEach((message, index) => {
              const timestamp = new Date(message.timestamp).toLocaleTimeString();
              const role = message.role.toUpperCase().padEnd(9);
              
              context.terminal.info(`[${timestamp}] ${role} ${message.content}`);
              
              if (message.metadata?.tokens) {
                context.terminal.info(`   Tokens: ${message.metadata.tokens.input} in, ${message.metadata.tokens.output} out`);
              }
            });
            
            return { success: true, message: `Displayed session ${session}` };
          } catch (error) {
            context.terminal.error(`Session not found: ${session}`);
            return { success: false, message: 'Session not found' };
          }
        }
        
        // Show recent sessions
        const sessions = await conversationHistory.listSessions();
        
        if (sessions.length === 0) {
          context.terminal.info('📜 No conversation history available.');
          context.terminal.info('Start a conversation to begin tracking history.');
          return { success: true, message: 'No history available' };
        }
        
        const sessionsToShow = sessions.slice(0, limit || 10);
        
        context.terminal.info(`📜 Recent Sessions (showing ${sessionsToShow.length} of ${sessions.length}):`);
        
        sessionsToShow.forEach((session, index) => {
          const startTime = new Date(session.startTime).toLocaleString();
          const duration = session.endTime 
            ? `${Math.round((session.endTime - session.startTime) / 1000 / 60)} min`
            : 'ongoing';
          
          context.terminal.info(`${index + 1}. ${session.title}`);
          context.terminal.info(`   ID: ${session.id}`);
          context.terminal.info(`   Started: ${startTime} (${duration})`);
          context.terminal.info(`   Messages: ${session.messageCount}`);
        });
        
        context.terminal.info('💡 Use the following commands to explore history:');
        context.terminal.info('   /history --session <session-id>     View specific session');
        context.terminal.info('   /history --search <query>           Search messages');
        context.terminal.info('   /history --export <path> --session <id>  Export session');
        
        return { success: true, message: `Displayed ${sessionsToShow.length} sessions` };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error retrieving conversation history: ${errorMessage}`);
        context.terminal.error('Failed to retrieve conversation history. History tracking may be disabled.');
        return { 
          success: false, 
          message: 'History retrieval failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register commands command
 */
function registerCommandsCommand(): void {
  const command: UnifiedCommand = {
    id: 'commands',
    name: 'commands',
    description: 'List all available commands',
    category: CommandCategory.HELP,
    parameters: [],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing commands command');
      
      try {
        // Get all registered commands
        const allCommands = commandRegistry.list()
          .sort((a, b) => {
            // Sort first by category, then by name
            if (a.category && b.category) {
              if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
              }
            } else if (a.category) {
              return -1;
            } else if (b.category) {
              return 1;
            }
            return a.name.localeCompare(b.name);
          });
        
        // Group commands by category
        const categories = new Map<string, UnifiedCommand[]>();
        const uncategorizedCommands: UnifiedCommand[] = [];
        
        for (const cmd of allCommands) {
          if (cmd.category) {
            if (!categories.has(cmd.category)) {
              categories.set(cmd.category, []);
            }
            categories.get(cmd.category)!.push(cmd);
          } else {
            uncategorizedCommands.push(cmd);
          }
        }
        
        context.terminal.info('Available slash commands:');
        
        // Display uncategorized commands first
        if (uncategorizedCommands.length > 0) {
          for (const cmd of uncategorizedCommands) {
            context.terminal.info(`/${cmd.name.padEnd(15)} ${cmd.description}`);
          }
        }
        
        // Display categorized commands
        const categoryEntries = Array.from(categories.entries());
        for (const [category, commands] of categoryEntries) {
          context.terminal.info(`${category}:`);
          for (const cmd of commands) {
            context.terminal.info(`  /${cmd.name.padEnd(13)} ${cmd.description}`);
          }
        }
        
        context.terminal.info('For more information on a specific command, use:');
        context.terminal.info('  /help <command>');
        
        return { success: true, message: `Listed ${allCommands.length} commands` };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error listing commands: ${errorMessage}`);
        context.terminal.error(`Error listing commands: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Failed to list commands',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register help command
 */
function registerHelpCommand(): void {
  logger.debug('Registering help command');

  const command: UnifiedCommand = {
    id: 'help',
    name: 'help',
    description: 'Get help for a specific command',
    category: CommandCategory.HELP,
    parameters: [
      {
        name: 'command',
        description: 'The command to get help for',
        type: 'string',
        required: false,
        position: 0
      }
    ],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing help command');
      
      const commandName = context.args.command as string | undefined;
      
      // If no command is specified, show a list of all commands
      if (!commandName) {
        context.terminal.info('Available commands:');
        context.terminal.info('Use /help <command> for more information on a specific command.');
        context.terminal.info('Use /commands for a full list of available commands.');
        return { success: true, message: 'Help displayed' };
      }
      
      try {
        // Get the command definition
        const command = commandRegistry.get(commandName);
        if (!command) {
          throw createUserError(`Command not found: ${commandName}`, {
            category: ErrorCategory.VALIDATION,
            resolution: 'Please check the command name and try again'
          });
        }
        
        // Display command information
        context.terminal.info(`Command: ${command.name}`);
        context.terminal.info(`Description: ${command.description}`);
        if (command.category) {
          context.terminal.info(`Category: ${command.category}`);
        }
        
        // Display command usage
        context.terminal.info('Usage:');
        if (command.parameters && command.parameters.length > 0) {
          context.terminal.info(`  /${command.name} ${command.parameters.map(param => param.name).join(' ')}`);
        } else {
          context.terminal.info(`  /${command.name}`);
        }
        
        // Display command arguments
        if (command.parameters && command.parameters.length > 0) {
          context.terminal.info('Arguments:');
          for (const param of command.parameters) {
            context.terminal.info(`  ${param.name}: ${param.description}`);
          }
        }
        
        logger.info('Help information retrieved');
        return { success: true, message: `Help for ${commandName} displayed` };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error retrieving help: ${errorMessage}`);
        context.terminal.error(`Error retrieving help: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Help retrieval failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register config command
 */
function registerConfigCommand(): void {
  logger.debug('Registering config command');

  const command: UnifiedCommand = {
    id: 'config',
    name: 'config',
    description: 'View or set configuration values',
    category: CommandCategory.SETTINGS,
    parameters: [
      {
        name: 'key',
        description: 'Configuration key (e.g., "api.baseUrl")',
        type: 'string',
        required: false
      },
      {
        name: 'value',
        description: 'New value to set',
        type: 'string',
        required: false
      }
    ],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing config command');
      
      try {
        const key = context.args.key as string | undefined;
        const value = context.args.value as string | undefined;
        const configModule = await import('../config/index.js');
        // Load the current configuration
        const currentConfig = await configModule.loadConfig();
        
        if (!key) {
          // Display the current configuration
          logger.info('Current configuration:');
          context.terminal.info(JSON.stringify(currentConfig, null, 2));
          return { success: true, message: 'Configuration displayed' };
        }
        
        // Handle nested keys like "api.baseUrl"
        const keyPath = key.split('.');
        let configSection: Record<string, unknown> = currentConfig as Record<string, unknown>;
        
        // Navigate to the nested config section
        for (let i = 0; i < keyPath.length - 1; i++) {
          const section = configSection[keyPath[i]];
          if (!section || typeof section !== 'object') {
            throw new Error(`Configuration key '${key}' not found`);
          }
          configSection = section as Record<string, unknown>;
        }
        
        const finalKey = keyPath[keyPath.length - 1];
        
        if (value === undefined) {
          // Get the value
          const keyValue = configSection[finalKey];
          if (keyValue === undefined) {
            throw new Error(`Configuration key '${key}' not found`);
          }
          logger.info(`${key}: ${JSON.stringify(keyValue)}`);
          context.terminal.info(`${key}: ${createConfigView(key, keyValue)}`);
          return { success: true, message: `Configuration value for ${key} displayed` };
        } else {
          // Set the value
          // Parse the value if needed (convert strings to numbers/booleans)
          let parsedValue: string | number | boolean = value;
          if (value.toLowerCase() === 'true') {parsedValue = true;}
          else if (value.toLowerCase() === 'false') {parsedValue = false;}
          else if (!isNaN(Number(value))) {parsedValue = Number(value);}
          
          // Update the config in memory
          configSection[finalKey] = parsedValue;
          
          // Save the updated config to file
          // Since there's no direct saveConfig function, we'd need to implement
          // this part separately to write to a config file
          logger.info(`Configuration updated in memory: ${key} = ${JSON.stringify(parsedValue)}`);
          context.terminal.info(`Configuration updated: ${key} = ${createConfigView(key, parsedValue)}`);
          context.terminal.warn('Note: Configuration changes are only temporary for this session');
          // In a real implementation, we would save to the config file
          return { success: true, message: `Configuration ${key} updated` };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error executing config command: ${errorMessage}`);
        context.terminal.error(`Error executing config command: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Config command failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register theme command
 */
function registerThemeCommand(): void {
  logger.debug('Registering theme command');

  const command: UnifiedCommand = {
    id: 'theme',
    name: 'theme',
    description: 'View or set the theme',
    category: CommandCategory.SETTINGS,
    parameters: [
      {
        name: 'name',
        description: 'Theme name (dark, light, system)',
        type: 'string',
        required: false,
        position: 0
      }
    ],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing theme command');
      
      const theme = context.args.name as string | undefined;
      if (!isNonEmptyString(theme)) {
        // If no theme is specified, display the current theme
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();
        
        context.terminal.info(`Current theme: ${currentConfig.terminal?.theme || 'default'}`);
        return { success: true, message: 'Current theme displayed' };
      }
      
      // Validate the theme
      const validThemes = ['dark', 'light', 'system'];
      if (!validThemes.includes(theme.toLowerCase())) {
        throw createUserError(`Invalid theme: ${theme}`, {
          category: ErrorCategory.VALIDATION,
          resolution: `Please choose one of: ${validThemes.join(', ')}`
        });
      }
      
      try {
        // Update the theme in the configuration
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();
        
        if (currentConfig.terminal) {
          currentConfig.terminal.theme = theme as 'dark' | 'light' | 'system';
        }
        
        // await configModule.saveConfig(currentConfig);
        
        logger.info(`Theme updated to: ${theme}`);
        context.terminal.success(`Theme set to: ${theme}`);
        context.terminal.warn('Note: Theme changes are only temporary for this session. Use the config command to make permanent changes.');
        
        return { success: true, message: `Theme set to ${theme}` };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error changing theme: ${errorMessage}`);
        context.terminal.error(`Error changing theme: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Theme change failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register verbosity command
 */
function registerVerbosityCommand(): void {
  logger.debug('Registering verbosity command');

  const command: UnifiedCommand = {
    id: 'verbosity',
    name: 'verbosity',
    description: 'View or set the logging verbosity level',
    category: CommandCategory.SETTINGS,
    parameters: [
      {
        name: 'level',
        description: 'Verbosity level (debug, info, warn, error, silent)',
        type: 'string',
        required: false,
        position: 0
      }
    ],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing verbosity command');
      
      const level = context.args.level as string | undefined;
      
      try {
        // If no level is specified, display the current verbosity level
        if (!isNonEmptyString(level)) {
          const configModule = await import('../config/index.js');
          const currentConfig = await configModule.loadConfig();
          
          context.terminal.info(`Current verbosity level: ${currentConfig.logger?.level || 'info'}`);
          return { success: true, message: 'Current verbosity level displayed' };
        }
        
        // Validate the verbosity level and map to LogLevel
        const { LogLevel } = await import('../utils/logger.js');
        let logLevel: typeof LogLevel[keyof typeof LogLevel];
        
        switch (level.toLowerCase()) {
          case 'debug':
            logLevel = LogLevel.DEBUG;
            break;
          case 'info':
            logLevel = LogLevel.INFO;
            break;
          case 'warn':
            logLevel = LogLevel.WARN;
            break;
          case 'error':
            logLevel = LogLevel.ERROR;
            break;
          case 'silent':
            logLevel = LogLevel.SILENT;
            break;
          default:
            context.terminal.error(`Invalid verbosity level: ${level}`);
            return { success: false, message: 'Invalid verbosity level' };
        }
        
        // Update the verbosity level in the configuration
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();
        
        if (currentConfig.logger) {
          currentConfig.logger.level = level.toLowerCase();
        }
        
        // await configModule.saveConfig(currentConfig);
        
        logger.info(`Verbosity level updated to: ${level}`);
        context.terminal.success(`Verbosity level set to: ${level}`);
        
        return { success: true, message: `Verbosity level set to ${level}` };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error changing verbosity level: ${errorMessage}`);
        context.terminal.error(`Error changing verbosity level: ${errorMessage}`);
        return { 
          success: false, 
          message: 'Verbosity change failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register run command
 */
function registerRunCommand(): void {
  logger.debug('Registering run command');

  const command: UnifiedCommand = {
    id: 'run',
    name: 'run',
    description: 'Execute a terminal command',
    category: CommandCategory.SYSTEM,
    parameters: [
      {
        name: 'command',
        description: 'The command to execute',
        type: 'string',
        required: true
      }
    ],
    handler: async (context: CommandContext): Promise<CommandResult> => {
      logger.info('Executing run command');
      
      const commandToRun = context.args.command as string | undefined;
      if (!isNonEmptyString(commandToRun)) {
        throw createUserError('Please provide a command to run.', {
          category: ErrorCategory.VALIDATION,
          resolution: 'Please provide a command to execute'
        });
      }
      
      try {
        logger.info(`Running command: ${commandToRun}`);
        
        // Execute the command
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        logger.debug(`Executing: ${commandToRun}`);
        const { stdout, stderr } = await execPromise(commandToRun);
        
        if (stdout) {
          context.terminal.info(stdout);
        }
        
        if (stderr) {
          context.terminal.error(stderr);
        }
        
        logger.info('Command executed successfully');
        return { success: true, message: `Command executed: ${commandToRun}` };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error executing command: ${errorMessage}`);
        
        if (error instanceof Error) {
          context.terminal.error(`Error: ${error.message}`);
        }
        
        return { 
          success: false, 
          message: 'Command execution failed',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  };

  commandRegistry.register(command);
}

function createConfigView(key: string, value: unknown): string {
  return `${key}: ${JSON.stringify(value)}`;
}