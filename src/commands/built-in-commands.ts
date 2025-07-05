/**
 * Built-in Slash Commands
 * Core commands that ship with VibeX CLI
 */

import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import type { 
  SlashCommand, 
  CommandContext, 
  CommandResult, 
  SlashCommandRegistry 
} from './slash-command-system.js';

// Help command
export const helpCommand: SlashCommand = {
  name: 'help',
  description: 'Show help information for commands',
  category: 'Core',
  aliases: ['h', '?'],
  arguments: [
    {
      name: 'command',
      type: 'string',
      description: 'Command to get help for',
      required: false,
      autocomplete: async (partial, context) => {
        // This would be injected by the registry
        return [];
      }
    }
  ],
  examples: [
    'help',
    'help memory',
    'help search'
  ],
  async execute(context: CommandContext): Promise<CommandResult> {
    const { args } = context;
    const commandName = args.command as string | undefined;
    
    // This would be injected by the registry
    const registry = (context as any).registry as SlashCommandRegistry;
    if (!registry) {
      return {
        success: false,
        message: 'Help system not available'
      };
    }

    const helpText = registry.generateHelp(commandName);
    
    return {
      success: true,
      message: helpText
    };
  }
};

// Clear command
export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Clear the terminal screen',
  category: 'Core',
  aliases: ['cls'],
  examples: ['clear'],
  async execute(context: CommandContext): Promise<CommandResult> {
    // Clear terminal
    process.stdout.write('\x1b[2J\x1b[0f');
    
    return {
      success: true,
      message: 'Terminal cleared'
    };
  }
};

// Exit command
export const exitCommand: SlashCommand = {
  name: 'exit',
  description: 'Exit the application',
  category: 'Core',
  aliases: ['quit', 'q'],
  options: [
    {
      name: 'force',
      alias: 'f',
      type: 'boolean',
      description: 'Force exit without confirmation',
      default: false
    }
  ],
  examples: [
    'exit',
    'exit --force',
    'quit -f'
  ],
  async execute(context: CommandContext): Promise<CommandResult> {
    const { options } = context;
    const force = options.force as boolean;

    if (!force) {
      // In a real implementation, this would trigger a confirmation dialog
      return {
        success: true,
        message: 'Are you sure you want to exit? Use --force to skip confirmation.'
      };
    }

    // Graceful shutdown
    process.exit(0);
  }
};

// Config command
export const configCommand: SlashCommand = {
  name: 'config',
  description: 'Manage configuration settings',
  category: 'Configuration',
  arguments: [
    {
      name: 'action',
      type: 'choice',
      description: 'Action to perform',
      required: true,
      choices: ['get', 'set', 'delete', 'list', 'reset']
    },
    {
      name: 'key',
      type: 'string',
      description: 'Configuration key',
      required: false
    },
    {
      name: 'value',
      type: 'string',
      description: 'Configuration value (for set action)',
      required: false
    }
  ],
  options: [
    {
      name: 'scope',
      type: 'choice',
      description: 'Configuration scope',
      choices: ['user', 'workspace', 'system'],
      default: 'user'
    },
    {
      name: 'type',
      type: 'choice',
      description: 'Value type for set action',
      choices: ['string', 'number', 'boolean', 'json'],
      default: 'string'
    }
  ],
  examples: [
    'config list',
    'config get ai.model',
    'config set ai.model claude-sonnet-4',
    'config set ui.theme dark --scope workspace',
    'config delete old-setting'
  ],
  async execute(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const action = args.action as string;
    const key = args.key as string;
    const value = args.value as string;
    const scope = options.scope as string;
    const type = options.type as string;

    try {
      switch (action) {
        case 'list':
          return {
            success: true,
            message: 'Configuration listing not implemented yet'
          };

        case 'get':
          if (!key) {
            return {
              success: false,
              message: 'Key is required for get action'
            };
          }
          return {
            success: true,
            message: `Getting config key: ${key} (scope: ${scope})`
          };

        case 'set':
          if (!key || !value) {
            return {
              success: false,
              message: 'Key and value are required for set action'
            };
          }
          
          let parsedValue: unknown = value;
          if (type === 'number') {
            parsedValue = Number(value);
            if (isNaN(parsedValue as number)) {
              return {
                success: false,
                message: 'Invalid number value'
              };
            }
          } else if (type === 'boolean') {
            parsedValue = ['true', '1', 'yes'].includes(value.toLowerCase());
          } else if (type === 'json') {
            try {
              parsedValue = JSON.parse(value);
            } catch {
              return {
                success: false,
                message: 'Invalid JSON value'
              };
            }
          }

          return {
            success: true,
            message: `Set ${key} = ${JSON.stringify(parsedValue)} (scope: ${scope})`
          };

        case 'delete':
          if (!key) {
            return {
              success: false,
              message: 'Key is required for delete action'
            };
          }
          return {
            success: true,
            message: `Deleted config key: ${key} (scope: ${scope})`
          };

        case 'reset':
          return {
            success: true,
            message: `Reset configuration (scope: ${scope})`
          };

        default:
          return {
            success: false,
            message: `Unknown action: ${action}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Config error: ${error}`,
        error: error as Error
      };
    }
  }
};

// File operations command
export const fileCommand: SlashCommand = {
  name: 'file',
  description: 'File operations and utilities',
  category: 'File System',
  aliases: ['f'],
  arguments: [
    {
      name: 'action',
      type: 'choice',
      description: 'File action to perform',
      required: true,
      choices: ['read', 'write', 'delete', 'copy', 'move', 'info', 'list']
    },
    {
      name: 'path',
      type: 'file',
      description: 'File or directory path',
      required: true,
      autocomplete: async (partial, context) => {
        // File path autocomplete
        try {
          const dir = dirname(partial) || '.';
          const base = basename(partial);
          const files = await fs.readdir(dir);
          
          return files
            .filter(file => file.startsWith(base))
            .map(file => join(dir, file));
        } catch {
          return [];
        }
      }
    },
    {
      name: 'content',
      type: 'string',
      description: 'Content for write operations',
      required: false
    }
  ],
  options: [
    {
      name: 'encoding',
      type: 'choice',
      description: 'File encoding',
      choices: ['utf8', 'ascii', 'base64', 'hex'],
      default: 'utf8'
    },
    {
      name: 'recursive',
      alias: 'r',
      type: 'boolean',
      description: 'Recursive operation for directories',
      default: false
    }
  ],
  examples: [
    'file read package.json',
    'file write test.txt "Hello World"',
    'file list src --recursive',
    'file info README.md',
    'file copy src/file.ts backup/file.ts'
  ],
  async execute(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const action = args.action as string;
    const path = args.path as string;
    const content = args.content as string;
    const encoding = options.encoding as BufferEncoding;
    const recursive = options.recursive as boolean;

    try {
      switch (action) {
        case 'read':
          const data = await fs.readFile(path, encoding);
          return {
            success: true,
            message: `File content (${data.length} characters)`,
            data: data
          };

        case 'write':
          if (!content) {
            return {
              success: false,
              message: 'Content is required for write action'
            };
          }
          await fs.writeFile(path, content, encoding);
          return {
            success: true,
            message: `Written ${content.length} characters to ${path}`
          };

        case 'info':
          const stats = await fs.stat(path);
          return {
            success: true,
            message: `File info for ${path}`,
            data: {
              size: stats.size,
              isFile: stats.isFile(),
              isDirectory: stats.isDirectory(),
              created: stats.birthtime,
              modified: stats.mtime,
              permissions: stats.mode.toString(8)
            }
          };

        case 'list':
          const entries = await fs.readdir(path, { withFileTypes: true });
          const files = entries.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            path: join(path, entry.name)
          }));
          
          return {
            success: true,
            message: `Found ${files.length} entries in ${path}`,
            data: files
          };

        case 'delete':
          await fs.unlink(path);
          return {
            success: true,
            message: `Deleted ${path}`
          };

        default:
          return {
            success: false,
            message: `Action '${action}' not implemented yet`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `File operation failed: ${error}`,
        error: error as Error
      };
    }
  }
};

// Memory command
export const memoryCommand: SlashCommand = {
  name: 'memory',
  description: 'Memory management operations',
  category: 'AI',
  aliases: ['mem'],
  arguments: [
    {
      name: 'action',
      type: 'choice',
      description: 'Memory action to perform',
      required: true,
      choices: ['store', 'recall', 'forget', 'search', 'stats', 'clear']
    },
    {
      name: 'content',
      type: 'string',
      description: 'Memory content or search query',
      required: false
    }
  ],
  options: [
    {
      name: 'type',
      type: 'choice',
      description: 'Memory type',
      choices: ['fact', 'preference', 'task', 'conversation', 'context'],
      default: 'fact'
    },
    {
      name: 'importance',
      type: 'number',
      description: 'Memory importance (0-1)',
      default: 0.5
    },
    {
      name: 'limit',
      alias: 'l',
      type: 'number',
      description: 'Maximum results to return',
      default: 10
    }
  ],
  examples: [
    'memory store "User prefers dark theme"',
    'memory recall --limit 5',
    'memory search "theme preferences"',
    'memory stats',
    'memory forget <memory-id>'
  ],
  async execute(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const action = args.action as string;
    const content = args.content as string;
    const type = options.type as string;
    const importance = options.importance as number;
    const limit = options.limit as number;

    // This would integrate with the actual memory system
    switch (action) {
      case 'store':
        if (!content) {
          return {
            success: false,
            message: 'Content is required for store action'
          };
        }
        return {
          success: true,
          message: `Stored memory: "${content}" (type: ${type}, importance: ${importance})`
        };

      case 'recall':
        return {
          success: true,
          message: `Recalling ${limit} memories`,
          data: []
        };

      case 'search':
        if (!content) {
          return {
            success: false,
            message: 'Search query is required'
          };
        }
        return {
          success: true,
          message: `Searching for: "${content}"`,
          data: []
        };

      case 'stats':
        return {
          success: true,
          message: 'Memory statistics',
          data: {
            total_memories: 0,
            by_type: {},
            memory_usage: '0 MB'
          }
        };

      case 'clear':
        return {
          success: true,
          message: 'Memory cleared'
        };

      default:
        return {
          success: false,
          message: `Unknown memory action: ${action}`
        };
    }
  }
};

// Search command
export const searchCommand: SlashCommand = {
  name: 'search',
  description: 'Search through files and content',
  category: 'Search',
  aliases: ['find', 's'],
  arguments: [
    {
      name: 'query',
      type: 'string',
      description: 'Search query or pattern',
      required: true
    },
    {
      name: 'path',
      type: 'directory',
      description: 'Search path (default: current directory)',
      required: false,
      default: '.'
    }
  ],
  options: [
    {
      name: 'type',
      alias: 't',
      type: 'choice',
      description: 'Search type',
      choices: ['text', 'filename', 'regex', 'semantic'],
      default: 'text'
    },
    {
      name: 'include',
      type: 'string',
      description: 'Include file patterns (glob)',
      default: '*'
    },
    {
      name: 'exclude',
      type: 'string',
      description: 'Exclude file patterns (glob)'
    },
    {
      name: 'case-sensitive',
      alias: 'c',
      type: 'boolean',
      description: 'Case sensitive search',
      default: false
    },
    {
      name: 'limit',
      alias: 'l',
      type: 'number',
      description: 'Maximum results',
      default: 50
    }
  ],
  examples: [
    'search "TODO" src',
    'search --type filename "*.ts" .',
    'search --type regex "function\\s+\\w+" src',
    'search "error handling" --include "*.js,*.ts"'
  ],
  async execute(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const query = args.query as string;
    const searchPath = args.path as string || '.';
    const searchType = options.type as string;
    const include = options.include as string;
    const exclude = options.exclude as string;
    const caseSensitive = options['case-sensitive'] as boolean;
    const limit = options.limit as number;

    // This would integrate with the actual search system
    return {
      success: true,
      message: `Searching for "${query}" in ${searchPath} (type: ${searchType})`,
      data: {
        query,
        path: searchPath,
        type: searchType,
        options: {
          include,
          exclude,
          caseSensitive,
          limit
        },
        results: []
      }
    };
  }
};

// Export all built-in commands
export const builtInCommands: SlashCommand[] = [
  helpCommand,
  clearCommand,
  exitCommand,
  configCommand,
  fileCommand,
  memoryCommand,
  searchCommand
];

// Register all built-in commands
export function registerBuiltInCommands(registry: SlashCommandRegistry): void {
  for (const command of builtInCommands) {
    registry.register(command);
  }
  
  // Inject registry into help command for access to other commands
  const helpCmd = registry.getCommand('help');
  if (helpCmd) {
    const originalExecute = helpCmd.execute;
    helpCmd.execute = async (context: CommandContext) => {
      (context as any).registry = registry;
      return originalExecute(context);
    };
  }
} 