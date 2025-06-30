/**
 * Command System Types
 * 
 * Defines the core interfaces and enums for the command system.
 */

/**
 * Argument types supported by the command system
 */
export enum ArgType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array'
}

/**
 * Command categories for organizing help output
 */
export enum CommandCategory {
  AI = 'AI',
  AUTH = 'Auth',
  ASSISTANCE = 'Assistance',
  CODE_GENERATION = 'Code Generation',
  DEV = 'Development',
  HELP = 'Help',
  SESSION = 'Session',
  SETTINGS = 'Settings',
  SUPPORT = 'Support',
  SYSTEM = 'System',
  UTILITY = 'Utility'
}

/**
 * Definition for a command argument
 */
export interface ArgDef {
  name: string;
  description: string;
  type: ArgType;
  required?: boolean;
  position?: number;
  shortFlag?: string;
  default?: any;
  choices?: string[];
}

/**
 * Definition for a command
 */
export interface CommandDef {
  name: string;
  description: string;
  category?: CommandCategory;
  aliases?: string[];
  args?: ArgDef[];
  handler: (args: any) => Promise<void>;
}

/**
 * Result of command execution
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}

/**
 * Command execution context
 */
export interface CommandContext {
  config: any;
  terminal: any;
  ai?: any;
  auth?: any;
  fileOps?: any;
  tools?: any;
} 