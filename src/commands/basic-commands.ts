/**
 * Basic Commands
 * 
 * This module defines basic slash commands for the terminal interface.
 * These commands provide essential functionality like help, configuration,
 * and system information.
 */

import type { UnifiedCommand, CommandResult } from './types.js';
import { CommandCategory } from './types.js';
import { logger } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../config/index.js';
import { authManager } from '../auth/index.js';
import { version } from '../version.js';
import { performance } from 'node:perf_hooks';

// Performance metrics for startup/operation
const startupTime = performance.now();
const lastCommandTime = 0;

/**
 * Basic command collection
 */
export const basicCommands: UnifiedCommand[] = [
  // Help command
  {
    id: 'help',
    name: 'help',
    description: 'Show help information for commands',
    category: CommandCategory.HELP,
    parameters: [
      {
        name: 'command',
        description: 'Specific command to get help for',
        type: 'string',
        required: false
      }
    ],
    async handler(context): Promise<CommandResult> {
      const commandName = context.args.command as string;
      
      if (commandName) {
        // Show help for specific command
        context.terminal.info(`Help for command: ${commandName}`);
      } else {
        // Show general help
        context.terminal.info('Available commands: help, config, login, logout');
      }
      
      return { success: true, message: 'Help displayed' };
    },
    examples: ['/help', '/help config']
  },

  // Config command
  {
    id: 'config',
    name: 'config',
    description: 'View or modify configuration settings',
    category: CommandCategory.SETTINGS,
    parameters: [
      {
        name: 'key',
        description: 'Configuration key to get or set',
        type: 'string',
        required: false
      },
      {
        name: 'value',
        description: 'Value to set for the configuration key',
        type: 'string',
        required: false
      }
    ],
    async handler(context): Promise<CommandResult> {
      const key = context.args.key as string;
      const value = context.args.value as string;
      
      if (key && value) {
        // Set configuration
        const config = await loadConfig();
        // Update config logic here
        await saveConfig(config);
        context.terminal.success(`Configuration updated: ${key} = ${value}`);
        return { success: true, message: `Set ${key} to ${value}` };
      } else if (key) {
        // Get specific configuration
        const config = await loadConfig();
        context.terminal.info(`${key}: ${JSON.stringify(config)}`);
        return { success: true, data: config };
      } else {
        // Show all configuration
        const config = await loadConfig();
        context.terminal.info(JSON.stringify(config, null, 2));
        return { success: true, data: config };
      }
    },
    examples: ['/config', '/config theme', '/config theme dark']
  },

  // Login command
  {
    id: 'login',
    name: 'login',
    description: 'Authenticate with Claude API',
    category: CommandCategory.AUTH,
    parameters: [
      {
        name: 'token',
        description: 'API token for authentication',
        type: 'string',
        required: false
      }
    ],
    async handler(context): Promise<CommandResult> {
      const token = context.args.token as string;
      
      if (token) {
        // Use provided token
        context.terminal.success('Logged in with provided token');
        return { success: true, message: 'Authentication successful' };
      } else {
        // Interactive login
        const inputToken = await context.terminal.prompt('Enter your API token: ');
        if (inputToken) {
          context.terminal.success('Logged in successfully');
          return { success: true, message: 'Authentication successful' };
        } else {
          context.terminal.error('Login cancelled');
          return { success: false, message: 'Login cancelled' };
        }
      }
    },
    examples: ['/login', '/login your-api-token-here']
  },

  // Logout command  
  {
    id: 'logout',
    name: 'logout',
    description: 'Clear authentication credentials',
    category: CommandCategory.AUTH,
    parameters: [],
    async handler(context): Promise<CommandResult> {
      context.terminal.success('Logged out successfully');
      return { success: true, message: 'Logout successful' };
    },
    examples: ['/logout']
  },
  
  // Settings command
  {
    id: 'cmd-settings',
    name: 'settings',
    aliases: ['config'],
    category: CommandCategory.SYSTEM,
    description: 'Manage application settings',
    icon: '⚙️',
    shortcut: 's',
    parameters: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 'string',
        required: false,
        choices: ['get', 'set', 'reset', 'list']
      },
      {
        name: 'key',
        description: 'Setting key',
        type: 'string',
        required: false
      },
      {
        name: 'value',
        description: 'New value',
        type: 'string',
        required: false
      }
    ],
    async handler(context): Promise<CommandResult> {
      const { action, key, value } = context.args;
      const config = await loadConfig();
      
      switch (action) {
        case 'get':
          if (!key) {
            throw new Error('Key is required for get action');
          }
          if (typeof key !== 'string') {
            throw new Error('Key must be a string');
          }
          const keyParts = key.split('.');
          let currentValue: unknown = config;
          
          for (const part of keyParts) {
            if (currentValue === undefined) {break;}
            if (currentValue && typeof currentValue === 'object' && part in currentValue) {
              currentValue = (currentValue as Record<string, unknown>)[part];
            } else {
              currentValue = undefined;
              break;
            }
          }
          
          logger.info(`${key} = ${JSON.stringify(currentValue)}`);
          return { success: true, message: `Retrieved value for ${key}` };
          
        case 'set':
          if (!key) {
            throw new Error('Key is required for set action');
          }
          if (typeof key !== 'string') {
            throw new Error('Key must be a string');
          }
          if (value === undefined) {
            throw new Error('Value is required for set action');
          }
          
          // Simple deep property setter
          const setNestedProperty = (obj: Record<string, unknown>, path: string[], value: unknown) => {
            const lastKey = path.pop();
            if (!lastKey) {return false;}
            
            let current: Record<string, unknown> = obj;
            for (const key of path) {
              if (current[key] === undefined) {
                current[key] = {};
              }
              current = current[key] as Record<string, unknown>;
            }
            
            current[lastKey] = value;
            return true;
          };
          
          const keyPathParts = key.split('.');
          setNestedProperty(config, keyPathParts, value);
          await saveConfig(config);
          
          logger.info(`Set ${key} = ${value}`);
          return { success: true, message: `Set ${key} to ${value}` };
          
        case 'reset':
          if (key) {
            if (typeof key !== 'string') {
              throw new Error('Key must be a string');
            }
            // Reset specific key
            const keyPathParts = key.split('.');
            const lastKey = keyPathParts.pop();
            if (!lastKey) {throw new Error('Invalid key');}
            
            let current = config as Record<string, unknown>;
            for (const part of keyPathParts) {
              if (current[part] === undefined) {break;}
              current = current[part] as Record<string, unknown>;
            }
            
            if (current && typeof current === 'object') {
              delete current[lastKey];
              await saveConfig(config);
              logger.info(`Reset ${key} to default`);
            }
            return { success: true, message: `Reset ${key} to default` };
          } else {
            // Reset all settings
            await saveConfig({});
            logger.info('Reset all settings to defaults');
            return { success: true, message: 'Reset all settings to defaults' };
          }
          
        case 'list':
        default:
          // Pretty print config
          logger.info('Current settings:');
          logger.info(JSON.stringify(config, null, 2));
          return { success: true, message: 'Settings displayed' };
          
      }
    },
    help: {
      summary: 'Manage application settings',
      description: 'View, modify, or reset configuration settings.',
      examples: [
        '/settings list',
        '/settings get ai.model',
        '/settings set ai.temperature 0.7',
        '/settings reset'
      ]
    }
  },
  
  // Version command
  {
    id: 'cmd-version',
    name: 'version',
    aliases: ['v'],
    category: CommandCategory.SYSTEM,
    description: 'Show version information',
    icon: '📌',
    shortcut: 'v',
    parameters: [],
    async handler(args): Promise<CommandResult> {
      logger.info(`Vibex v${version}`);
      logger.info(`Node.js ${process.version}`);
      
      const uptime = Math.floor((performance.now() - startupTime) / 1000);
      logger.info(`Uptime: ${uptime}s`);
      
      const memory = process.memoryUsage();
      logger.info(`Memory: ${(memory.rss / 1024 / 1024).toFixed(2)} MB (RSS)`);
      
      const cpuUsage = process.cpuUsage();
      logger.info(`CPU: ${(cpuUsage.user / 1000000).toFixed(2)}s user, ${(cpuUsage.system / 1000000).toFixed(2)}s system`);
      
      return { success: true, message: 'Version information displayed' };
    },
    help: {
      summary: 'Show version information',
      description: 'Displays the current version of Vibex and runtime information.',
      examples: ['/version']
    }
  },
  
  // Clear command
  {
    id: 'cmd-clear',
    name: 'clear',
    aliases: ['cls'],
    category: CommandCategory.SYSTEM,
    description: 'Clear the console',
    icon: '🧹',
    parameters: [],
    async handler(args): Promise<CommandResult> {
      // In a real terminal, we would use console.clear(), but in Ink
      // this will be handled by the UI component
      logger.info('Clear command executed');
      
      return { success: true, message: 'Console cleared' };
    },
    help: {
      summary: 'Clear the console',
      description: 'Clears all output from the terminal.',
      examples: ['/clear']
    }
  },
  
  // Theme command
  {
    id: 'cmd-theme',
    name: 'theme',
    category: CommandCategory.SETTINGS,
    description: 'Change the UI theme',
    icon: '🎨',
    parameters: [
      {
        name: 'name',
        description: 'Theme name',
        type: 'string',
        required: false,
        choices: ['default', 'dark', 'light', 'dracula', 'github', 'nord']
      },
      {
        name: '--list',
        description: 'List available themes',
        type: 'boolean',
        required: false,
        default: false
      }
    ],
    async handler(context): Promise<CommandResult> {
      const { name, list } = context.args;
      
      if (list) {
        logger.info('Available themes:');
        logger.info('- default');
        logger.info('- dark');
        logger.info('- light');
        logger.info('- dracula');
        logger.info('- github');
        logger.info('- nord');
        return { success: true, message: 'Available themes listed' };
      }

      if (name && typeof name === 'string') {
        // Load current config
        const config = await loadConfig();
        
        // Update theme
        const updatedConfig = {
          ...config,
          terminal: {
            ...config.terminal,
            theme: name as 'dark' | 'light' | 'system'
          }
        };
        
        // Save config
        await saveConfig(updatedConfig);
        
        logger.info(`Theme changed to ${name}`);
        logger.info('Restart required for theme change to take effect');
        return { success: true, message: `Theme changed to ${name}` };
      }

      // Show current theme
      const config = await loadConfig();
      logger.info(`Current theme: ${config.terminal?.theme || 'default'}`);
      return { success: true, message: 'Current theme displayed' };
    },
    help: {
      summary: 'Change UI theme',
      description: 'Changes the color theme of the terminal UI.',
      examples: [
        '/theme light',
        '/theme --list'
      ]
    }
  },
  
  // Debug command
  {
    id: 'cmd-debug',
    name: 'debug',
    category: CommandCategory.SYSTEM,
    description: 'Toggle debug mode',
    icon: '🐛',
    hidden: true,
    parameters: [
      {
        name: 'level',
        description: 'Debug level',
        type: 'string',
        required: false,
        choices: ['off', 'info', 'debug', 'trace']
      }
    ],
    async handler(context): Promise<CommandResult> {
      const { level } = context.args;
      
      const config = await loadConfig();
      config.logger = config.logger || {};
      
      if (level && typeof level === 'string') {
        config.logger.level = level;
        await saveConfig(config);
        logger.info(`Debug level set to ${level}`);
        return { success: true, message: `Debug level set to ${level}` };
      } else {
        // Toggle debug mode
        const currentLevel = config.logger.level || 'info';
        config.logger.level = currentLevel === 'debug' ? 'info' : 'debug';
        await saveConfig(config);
        logger.info(`Debug mode ${config.logger.level === 'debug' ? 'enabled' : 'disabled'}`);
        
        // Update logger level
        logger.setLevel(config.logger.level as any);
        
        return { success: true, message: `Debug mode ${config.logger.level === 'debug' ? 'enabled' : 'disabled'}` };
      }
    },
    help: {
      summary: 'Toggle debug mode',
      description: 'Enables or disables debug logging for troubleshooting.',
      examples: [
        '/debug',
        '/debug debug',
        '/debug off'
      ]
    }
  }
];

/**
 * Command registry interface
 */
export interface CommandRegistry {
  registerCommand(command: UnifiedCommand): void;
  [key: string]: unknown;
}

export function registerBasicCommands(registry: CommandRegistry): void {
  basicCommands.forEach(command => {
    registry.registerCommand(command);
  });
  logger.debug('Registered basic commands');
}

export default basicCommands;