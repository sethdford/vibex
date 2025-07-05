/**
 * Modern Slash Command System
 * Registry, autocomplete, validation, and comprehensive help system
 */

import { z } from 'zod';
import { EventEmitter } from 'events';

// Command argument types
export type ArgumentType = 'string' | 'number' | 'boolean' | 'file' | 'directory' | 'choice' | 'json';

// Command argument definition
export interface CommandArgument {
  name: string;
  type: ArgumentType;
  description: string;
  required?: boolean;
  default?: unknown;
  choices?: string[];
  validator?: (value: unknown) => boolean | string;
  autocomplete?: (partial: string, context: CommandContext) => Promise<string[]>;
}

// Command option definition (flags)
export interface CommandOption {
  name: string;
  alias?: string;
  type: ArgumentType;
  description: string;
  default?: unknown;
  choices?: string[];
  validator?: (value: unknown) => boolean | string;
}

// Command execution context
export interface CommandContext {
  args: Record<string, unknown>;
  options: Record<string, unknown>;
  rawInput: string;
  sessionId: string;
  workspaceDir: string;
  user?: {
    id: string;
    name: string;
    preferences: Record<string, unknown>;
  };
}

// Command execution result
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: Error;
  suggestions?: string[];
}

// Command definition
export interface SlashCommand {
  name: string;
  description: string;
  category: string;
  aliases?: string[];
  arguments?: CommandArgument[];
  options?: CommandOption[];
  examples?: string[];
  permissions?: string[];
  deprecated?: boolean;
  hidden?: boolean;
  execute: (context: CommandContext) => Promise<CommandResult>;
}

// Command validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsedArgs: Record<string, unknown>;
  parsedOptions: Record<string, unknown>;
}

// Autocomplete suggestion
export interface AutocompleteSuggestion {
  value: string;
  description?: string;
  type: 'command' | 'argument' | 'option' | 'value';
  category?: string;
}

// Command registry events
export interface CommandRegistryEvents {
  'command:registered': (command: SlashCommand) => void;
  'command:unregistered': (name: string) => void;
  'command:executed': (name: string, context: CommandContext, result: CommandResult) => void;
  'command:error': (name: string, context: CommandContext, error: Error) => void;
}

// Main command registry
export class SlashCommandRegistry extends EventEmitter {
  private commands = new Map<string, SlashCommand>();
  private aliases = new Map<string, string>();
  private categories = new Map<string, SlashCommand[]>();

  /**
   * Register a new slash command
   */
  register(command: SlashCommand): void {
    // Validate command definition
    this.validateCommandDefinition(command);

    // Register main command
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }

    // Add to category
    if (!this.categories.has(command.category)) {
      this.categories.set(command.category, []);
    }
    this.categories.get(command.category)!.push(command);

    this.emit('command:registered', command);
  }

  /**
   * Unregister a command
   */
  unregister(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) return false;

    // Remove from commands
    this.commands.delete(name);

    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias);
      }
    }

    // Remove from category
    const categoryCommands = this.categories.get(command.category);
    if (categoryCommands) {
      const index = categoryCommands.indexOf(command);
      if (index !== -1) {
        categoryCommands.splice(index, 1);
      }
    }

    this.emit('command:unregistered', name);
    return true;
  }

  /**
   * Get command by name or alias
   */
  getCommand(name: string): SlashCommand | undefined {
    // Try direct lookup
    let command = this.commands.get(name);
    if (command) return command;

    // Try alias lookup
    const aliasTarget = this.aliases.get(name);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  /**
   * Get all commands in a category
   */
  getCommandsByCategory(category: string): SlashCommand[] {
    return this.categories.get(category) || [];
  }

  /**
   * Get all available commands
   */
  getAllCommands(): SlashCommand[] {
    return Array.from(this.commands.values()).filter(cmd => !cmd.hidden);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Parse and validate command input
   */
  async parseCommand(input: string): Promise<{
    command?: SlashCommand;
    validation: ValidationResult;
  }> {
    const parts = this.tokenizeInput(input);
    if (parts.length === 0) {
      return {
        validation: {
          valid: false,
          errors: ['No command provided'],
          warnings: [],
          parsedArgs: {},
          parsedOptions: {}
        }
      };
    }

    const commandName = parts[0].replace(/^\//, '');
    const command = this.getCommand(commandName);

    if (!command) {
      const suggestions = await this.findSimilarCommands(commandName);
      return {
        validation: {
          valid: false,
          errors: [`Unknown command: ${commandName}`],
          warnings: suggestions.length > 0 ? [`Did you mean: ${suggestions.slice(0, 3).join(', ')}?`] : [],
          parsedArgs: {},
          parsedOptions: {}
        }
      };
    }

    const validation = await this.validateCommand(command, parts.slice(1));
    return { command, validation };
  }

  /**
   * Execute a command
   */
  async executeCommand(
    input: string,
    context: Omit<CommandContext, 'args' | 'options' | 'rawInput'>
  ): Promise<CommandResult> {
    try {
      const { command, validation } = await this.parseCommand(input);

      if (!validation.valid) {
        return {
          success: false,
          message: validation.errors.join('; '),
          suggestions: validation.warnings
        };
      }

      if (!command) {
        return {
          success: false,
          message: 'Command not found'
        };
      }

      const fullContext: CommandContext = {
        ...context,
        args: validation.parsedArgs,
        options: validation.parsedOptions,
        rawInput: input
      };

      const result = await command.execute(fullContext);
      this.emit('command:executed', command.name, fullContext, result);
      return result;

    } catch (error) {
      const err = error as Error;
      this.emit('command:error', input, { ...context, args: {}, options: {}, rawInput: input }, err);
      return {
        success: false,
        message: `Command execution failed: ${err.message}`,
        error: err
      };
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(
    input: string,
    cursorPosition: number,
    context: Omit<CommandContext, 'args' | 'options' | 'rawInput'>
  ): Promise<AutocompleteSuggestion[]> {
    const beforeCursor = input.slice(0, cursorPosition);
    const parts = this.tokenizeInput(beforeCursor);

    // If no parts or just starting, suggest commands
    if (parts.length === 0 || (parts.length === 1 && !beforeCursor.endsWith(' '))) {
      const partial = parts[0]?.replace(/^\//, '') || '';
      return this.getCommandSuggestions(partial);
    }

    // Get command
    const commandName = parts[0].replace(/^\//, '');
    const command = this.getCommand(commandName);
    if (!command) return [];

    // Get argument/option suggestions
    const remainingParts = parts.slice(1);
    return this.getArgumentSuggestions(command, remainingParts, context);
  }

  /**
   * Generate help for a command
   */
  generateHelp(commandName?: string): string {
    if (commandName) {
      const command = this.getCommand(commandName);
      if (!command) {
        return `Command '${commandName}' not found.`;
      }
      return this.generateCommandHelp(command);
    }

    return this.generateOverallHelp();
  }

  // Private helper methods

  private validateCommandDefinition(command: SlashCommand): void {
    if (!command.name || typeof command.name !== 'string') {
      throw new Error('Command name is required and must be a string');
    }

    if (!command.description || typeof command.description !== 'string') {
      throw new Error('Command description is required and must be a string');
    }

    if (!command.category || typeof command.category !== 'string') {
      throw new Error('Command category is required and must be a string');
    }

    if (typeof command.execute !== 'function') {
      throw new Error('Command execute function is required');
    }

    // Validate arguments
    if (command.arguments) {
      for (const arg of command.arguments) {
        if (!arg.name || !arg.type || !arg.description) {
          throw new Error(`Invalid argument definition: ${JSON.stringify(arg)}`);
        }
      }
    }

    // Validate options
    if (command.options) {
      for (const option of command.options) {
        if (!option.name || !option.type || !option.description) {
          throw new Error(`Invalid option definition: ${JSON.stringify(option)}`);
        }
      }
    }
  }

  private tokenizeInput(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        // Start of quoted string
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        // End of quoted string
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && /\s/.test(char)) {
        // Whitespace outside quotes - end current token
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        // Regular character - add to current token
        current += char;
      }
    }
    
    // Add final token if any
    if (current.length > 0) {
      tokens.push(current);
    }
    
    return tokens.filter(token => token.length > 0);
  }

  private async validateCommand(command: SlashCommand, args: string[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsedArgs: Record<string, unknown> = {};
    const parsedOptions: Record<string, unknown> = {};

    // Separate options from arguments
    const { arguments: rawArgs, options: rawOptions } = this.separateArgsAndOptions(args);

    // Validate arguments
    if (command.arguments) {
      for (let i = 0; i < command.arguments.length; i++) {
        const argDef = command.arguments[i];
        const rawValue = rawArgs[i];

        if (argDef.required && rawValue === undefined) {
          errors.push(`Required argument '${argDef.name}' is missing`);
          continue;
        }

        if (rawValue !== undefined) {
          const parsed = this.parseArgumentValue(rawValue, argDef);
          if (parsed.error) {
            errors.push(`Invalid value for argument '${argDef.name}': ${parsed.error}`);
          } else {
            parsedArgs[argDef.name] = parsed.value;
          }
        } else if (argDef.default !== undefined) {
          parsedArgs[argDef.name] = argDef.default;
        }
      }
    }

    // Validate options
    if (command.options) {
      for (const optionDef of command.options) {
        const rawValue = rawOptions[optionDef.name] || rawOptions[optionDef.alias || ''];

        if (rawValue !== undefined) {
          const parsed = this.parseArgumentValue(rawValue, optionDef);
          if (parsed.error) {
            errors.push(`Invalid value for option '${optionDef.name}': ${parsed.error}`);
          } else {
            parsedOptions[optionDef.name] = parsed.value;
          }
        } else if (optionDef.default !== undefined) {
          parsedOptions[optionDef.name] = optionDef.default;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      parsedArgs,
      parsedOptions
    };
  }

  private separateArgsAndOptions(parts: string[]): {
    arguments: string[];
    options: Record<string, string>;
  } {
    const args: string[] = [];
    const options: Record<string, string> = {};

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part.startsWith('--')) {
        // Long option
        const [name, value] = part.slice(2).split('=', 2);
        options[name] = value || (parts[i + 1] && !parts[i + 1].startsWith('-') ? parts[++i] : 'true');
      } else if (part.startsWith('-') && part.length > 1) {
        // Short option
        const name = part.slice(1);
        options[name] = parts[i + 1] && !parts[i + 1].startsWith('-') ? parts[++i] : 'true';
      } else {
        // Regular argument
        args.push(part);
      }
    }

    return { arguments: args, options };
  }

  private parseArgumentValue(
    value: string,
    definition: CommandArgument | CommandOption
  ): { value?: unknown; error?: string } {
    try {
      switch (definition.type) {
        case 'string':
          if (definition.choices && !definition.choices.includes(value)) {
            return { error: `Must be one of: ${definition.choices.join(', ')}` };
          }
          return { value };

        case 'number':
          const num = Number(value);
          if (isNaN(num)) {
            return { error: 'Must be a valid number' };
          }
          return { value: num };

        case 'boolean':
          const bool = value.toLowerCase();
          if (['true', '1', 'yes', 'on'].includes(bool)) {
            return { value: true };
          } else if (['false', '0', 'no', 'off'].includes(bool)) {
            return { value: false };
          }
          return { error: 'Must be true/false, yes/no, 1/0, or on/off' };

        case 'json':
          try {
            const parsed = JSON.parse(value);
            return { value: parsed };
          } catch {
            return { error: 'Must be valid JSON' };
          }

        case 'choice':
          if (definition.choices && !definition.choices.includes(value)) {
            return { error: `Must be one of: ${definition.choices.join(', ')}` };
          }
          return { value };

        default:
          return { value };
      }
    } catch (error) {
      return { error: `Parse error: ${error}` };
    }
  }

  private async findSimilarCommands(input: string): Promise<string[]> {
    const commands = this.getAllCommands();
    const similarities: Array<{ name: string; score: number }> = [];

    for (const command of commands) {
      const score = this.calculateSimilarity(input, command.name);
      if (score > 0.3) {
        similarities.push({ name: command.name, score });
      }

      // Also check aliases
      if (command.aliases) {
        for (const alias of command.aliases) {
          const aliasScore = this.calculateSimilarity(input, alias);
          if (aliasScore > 0.3) {
            similarities.push({ name: alias, score: aliasScore });
          }
        }
      }
    }

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.name);
  }

  private calculateSimilarity(a: string, b: string): number {
    // Simple Levenshtein distance-based similarity
    const matrix: number[][] = [];
    const aLen = a.length;
    const bLen = b.length;

    for (let i = 0; i <= bLen; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= aLen; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= bLen; i++) {
      for (let j = 1; j <= aLen; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[bLen][aLen];
    const maxLen = Math.max(aLen, bLen);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }

  private getCommandSuggestions(partial: string): AutocompleteSuggestion[] {
    const suggestions: AutocompleteSuggestion[] = [];

    for (const command of this.getAllCommands()) {
      if (command.name.startsWith(partial)) {
        suggestions.push({
          value: command.name,
          description: command.description,
          type: 'command',
          category: command.category
        });
      }

      // Also check aliases
      if (command.aliases) {
        for (const alias of command.aliases) {
          if (alias.startsWith(partial)) {
            suggestions.push({
              value: alias,
              description: `${command.description} (alias for ${command.name})`,
              type: 'command',
              category: command.category
            });
          }
        }
      }
    }

    return suggestions.sort((a, b) => a.value.localeCompare(b.value));
  }

  private async getArgumentSuggestions(
    command: SlashCommand,
    parts: string[],
    context: Omit<CommandContext, 'args' | 'options' | 'rawInput'>
  ): Promise<AutocompleteSuggestion[]> {
    const suggestions: AutocompleteSuggestion[] = [];

    // Simple implementation - could be enhanced with context-aware suggestions
    if (command.arguments && parts.length <= command.arguments.length) {
      const argIndex = parts.length - 1;
      const argDef = command.arguments[argIndex];

      if (argDef) {
        if (argDef.choices) {
          for (const choice of argDef.choices) {
            suggestions.push({
              value: choice,
              description: `${argDef.description} option`,
              type: 'value'
            });
          }
        }

        if (argDef.autocomplete) {
          const partial = parts[argIndex] || '';
          const contextWithArgs: CommandContext = {
            ...context,
            args: {},
            options: {},
            rawInput: ''
          };
          const autoSuggestions = await argDef.autocomplete(partial, contextWithArgs);
          for (const suggestion of autoSuggestions) {
            suggestions.push({
              value: suggestion,
              description: `${argDef.description} suggestion`,
              type: 'value'
            });
          }
        }
      }
    }

    // Add option suggestions
    if (command.options) {
      for (const option of command.options) {
        suggestions.push({
          value: `--${option.name}`,
          description: option.description,
          type: 'option'
        });

        if (option.alias) {
          suggestions.push({
            value: `-${option.alias}`,
            description: option.description,
            type: 'option'
          });
        }
      }
    }

    return suggestions;
  }

  private generateCommandHelp(command: SlashCommand): string {
    let help = `**/${command.name}**\n`;
    help += `${command.description}\n\n`;

    if (command.aliases && command.aliases.length > 0) {
      help += `**Aliases:** ${command.aliases.join(', ')}\n\n`;
    }

    if (command.arguments && command.arguments.length > 0) {
      help += `**Arguments:**\n`;
      for (const arg of command.arguments) {
        const required = arg.required ? ' (required)' : '';
        const defaultVal = arg.default !== undefined ? ` [default: ${arg.default}]` : '';
        help += `  ${arg.name}: ${arg.description}${required}${defaultVal}\n`;
      }
      help += '\n';
    }

    if (command.options && command.options.length > 0) {
      help += `**Options:**\n`;
      for (const option of command.options) {
        const alias = option.alias ? `, -${option.alias}` : '';
        const defaultVal = option.default !== undefined ? ` [default: ${option.default}]` : '';
        help += `  --${option.name}${alias}: ${option.description}${defaultVal}\n`;
      }
      help += '\n';
    }

    if (command.examples && command.examples.length > 0) {
      help += `**Examples:**\n`;
      for (const example of command.examples) {
        help += `  /${example}\n`;
      }
      help += '\n';
    }

    if (command.deprecated) {
      help += `⚠️  **This command is deprecated and may be removed in a future version.**\n`;
    }

    return help;
  }

  private generateOverallHelp(): string {
    let help = `**Available Commands**\n\n`;

    const categories = this.getCategories().sort();
    for (const category of categories) {
      help += `**${category}:**\n`;
      const commands = this.getCommandsByCategory(category).filter(cmd => !cmd.hidden);
      
      for (const command of commands) {
        const deprecated = command.deprecated ? ' (deprecated)' : '';
        help += `  /${command.name}: ${command.description}${deprecated}\n`;
      }
      help += '\n';
    }

    help += `Use \`/help <command>\` to get detailed help for a specific command.\n`;
    return help;
  }
}

// Factory function
export function createSlashCommandRegistry(): SlashCommandRegistry {
  return new SlashCommandRegistry();
}

// Default registry instance
export const defaultSlashCommandRegistry = createSlashCommandRegistry(); 