/**
 * Command Types
 * 
 * Unified type definitions for the command system, consolidating all command
 * interfaces into a single, comprehensive system.
 */

import type { AppConfigType } from '../config/schema.js';
import type { AIClient } from '../ai/index.js';

/**
 * Argument type enumeration
 */
export enum ArgType {
  STRING = 'STRING',
  NUMBER = 'NUMBER', 
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY'
}

/**
 * Command parameter definition (unified from all systems)
 */
export interface CommandParameter {
  readonly name: string;
  readonly description: string;
  readonly type: 'string' | 'number' | 'boolean' | 'array';
  readonly required: boolean;
  readonly default?: string | number | boolean | string[];
  readonly choices?: readonly string[];
  readonly shortFlag?: string;
  readonly position?: number;
}

/**
 * Command execution context (enhanced with all necessary interfaces)
 */
export interface CommandContext {
  config: AppConfigType;
  terminal: {
    info: (message: string) => void;
    success: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    prompt: (message: string) => Promise<string>;
  };
  ai?: AIClient;
  auth?: {
    isAuthenticated: () => boolean;
    getToken: () => { accessToken: string } | null;
  };
  fileOps?: FileOpsInterface;
  tools?: {
    execute: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  args: Record<string, unknown>;
  rawArgs: string[];
  flags: Record<string, boolean>;
  options: Record<string, string>;
}

/**
 * Command execution result
 */
export interface CommandResult {
  readonly success: boolean;
  readonly message?: string;
  readonly data?: unknown;
  readonly error?: Error;
  readonly command?: string;
  readonly timestamp?: Date;
}

/**
 * Command handler function type
 */
export type CommandHandler = (context: CommandContext) => Promise<CommandResult>;

/**
 * Command category enumeration
 */
export enum CommandCategory {
  AI = 'AI',
  AUTH = 'Authentication', 
  SESSION = 'Session',
  HELP = 'Help',
  SETTINGS = 'Settings',
  SYSTEM = 'System',
  DEVELOPMENT = 'Development',
  DEV = 'Development'  // Alias for DEVELOPMENT
}

/**
 * UNIFIED COMMAND INTERFACE
 * Consolidates CommandDef, SlashCommand, and DynamicCommandDef into single interface
 */
export interface UnifiedCommand {
  readonly id: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly description: string;
  readonly category: CommandCategory;
  readonly parameters: readonly CommandParameter[];
  readonly handler: CommandHandler;
  readonly examples?: readonly string[];
  readonly shortcut?: string;
  readonly icon?: string;
  readonly hidden?: boolean;
  readonly requiresAuth?: boolean;
  readonly usage?: string;
  readonly help?: {
    readonly summary: string;
    readonly description: string;
    readonly examples: readonly string[];
  };
}

/**
 * Command registry interface
 */
export interface CommandRegistry {
  register(command: UnifiedCommand): void;
  get(nameOrId: string): UnifiedCommand | undefined;
  list(): UnifiedCommand[];
  listByCategory(category: CommandCategory): UnifiedCommand[];
  has(nameOrId: string): boolean;
  clear(): void;
  findByAlias(alias: string): UnifiedCommand | undefined;
  getAllCategories(): CommandCategory[];
}

/**
 * File operations interface
 */
export interface FileOpsInterface {
  readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: Error }>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: Error }>;
} 