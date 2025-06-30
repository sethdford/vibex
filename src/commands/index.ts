/**
 * Command Management System
 *
 * This module provides the core infrastructure for defining, registering,
 * and executing commands in the CLI application. Key responsibilities include:
 *
 * - A central command registry for all available commands
 * - Command execution logic with argument parsing and validation
 * - Help generation for commands and subcommands
 * - Categorization of commands for organized help output
 *
 * The system is designed to be extensible, allowing new commands to be easily
 * added and integrated into the CLI.
 */

import { CommandDef, ArgDef, ArgType, CommandCategory } from './types.js';
import { logger } from '../utils/logger.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { UserError } from '../errors/types.js';
import { isNonEmptyString } from '../utils/validation.js';

class CommandRegistry {
  private commands: Map<string, CommandDef> = new Map();
  private aliases: Map<string, string> = new Map();

  register(command: CommandDef) {
    if (this.commands.has(command.name)) {
      logger.warn(`Command ${command.name} is already registered. Overwriting.`);
    }
    this.commands.set(command.name, command);

    if (command.aliases) {
      command.aliases.forEach((alias: string) => {
        if (this.aliases.has(alias)) {
          logger.warn(`Alias ${alias} is already registered. Overwriting.`);
        }
        this.aliases.set(alias, command.name);
      });
    }
  }

  get(name: string): CommandDef | undefined {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName);
  }

  list(): CommandDef[] {
    return Array.from(this.commands.values());
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.commands.forEach(cmd => {
      if (cmd.category) {
        categories.add(cmd.category);
      }
    });
    return Array.from(categories).sort();
  }

  getByCategory(category: string): CommandDef[] {
    return this.list().filter(cmd => cmd.category === category);
  }
}

export const commandRegistry = new CommandRegistry();

export function generateCommandHelp(command: CommandDef): string {
  let help = `Usage: ${command.name}`;
  if (command.args) {
    help += ` ${command.args.map((a: ArgDef) => `<${a.name}>`).join(' ')}`;
  }
  help += `\n\n${command.description}\n`;

  if (command.args && command.args.length > 0) {
    help += '\nArguments:\n';
    command.args.forEach((arg: ArgDef) => {
      help += `  ${arg.name}\t${arg.description}\n`;
    });
  }

  return help;
}

export async function executeCommand(commandName: string, args: string[]): Promise<void> {
  const command = commandRegistry.get(commandName);
  if (!command) {
    throw new UserError(`Unknown command: ${commandName}`);
  }

  const parsedArgs = parseArguments(args, command.args || []);
  await command.handler(parsedArgs);
}

function parseArguments(args: string[], argDefs: ArgDef[]): any {
  const parsed: { [key: string]: any } = {};
  const positionalDefs = argDefs.filter(d => d.position !== undefined).sort((a, b) => a.position! - b.position!);
  let positionalIndex = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      // Find the corresponding definition for a flag
      const def = argDefs.find(d => `-${d.shortFlag}` === arg || `--${d.name}` === arg);
      if (def) {
        if (def.type === ArgType.BOOLEAN) {
          parsed[def.name] = true;
        } else {
          // Check if next arg is a value or another flag
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            parsed[def.name] = convertArgumentType(args[i + 1], def.type);
            i++; // consume the value
          } else {
             // Handle case where flag is present but value is missing, if required.
             if(def.required) {
                throw new UserError(`Missing value for argument: ${def.name}`);
             }
          }
        }
      } else {
        throw new UserError(`Unknown option: ${arg}`);
      }
    } else {
      // Positional arguments
      if (positionalIndex < positionalDefs.length) {
        const def = positionalDefs[positionalIndex];
        parsed[def.name] = convertArgumentType(arg, def.type);
        positionalIndex++;
      }
    }
  }

  // Check for required arguments that were not provided.
  for(const def of argDefs){
      if(def.required && parsed[def.name] === undefined){
          throw new UserError(`Missing required argument: ${def.name}`);
      }
  }

  return parsed;
}

function convertArgumentType(value: string, type: ArgType): any {
  switch (type) {
    case ArgType.STRING:
      return value;
    case ArgType.NUMBER:
      const numberValue = parseFloat(value);
      if (isNaN(numberValue)) {
        throw new UserError(`Invalid number provided for argument: ${value}`);
      }
      return numberValue;
    case ArgType.BOOLEAN:
      return value.toLowerCase() === 'true' || value === '1';
    case ArgType.ARRAY:
      return value.split(',');
    default:
      return value;
  }
}

export {
  CommandDef,
  ArgDef,
  ArgType,
  CommandCategory,
}; 