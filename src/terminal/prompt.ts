/**
 * Terminal Prompts
 * 
 * Provides functions for creating and handling user prompts in the terminal.
 */

import { createInterface, type Interface } from 'readline';
import { EventEmitter } from 'events';
import type { PromptOptions, TerminalConfig } from './types.js';
import { logger } from '../utils/logger.js';
import inquirer from 'inquirer';

// Valid prompt value types
export type PromptValue = string | number | boolean;

export class Prompt extends EventEmitter {
  private readonly rl: Interface;
  private readonly options: PromptOptions;
  private readonly config: TerminalConfig;

  constructor(options: PromptOptions, config: TerminalConfig) {
    super();
    this.options = options;
    this.config = config;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<string> {
    return new Promise((resolve, reject) => {
      const query = `${this.options.message} `;
      this.rl.question(query, answer => {
        this.rl.close();
        resolve(answer);
      });
    });
  }
}

/**
 * Create and display a prompt for user input
 */
export async function createPrompt<T extends PromptValue>(options: PromptOptions, config: TerminalConfig): Promise<T> {
  logger.debug('Creating prompt', { type: options.type, name: options.name });
  
  // Add validation for required fields
  if (options.required && !options.validate) {
    options.validate = (input: unknown) => {
      const inputStr = String(input);
      if (!inputStr && input !== false && input !== 0) {
        return `${options.name} is required`;
      }
      return true;
    };
  }
  
  // Handle non-interactive terminals
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    logger.warn('Terminal is not interactive, cannot prompt for input');
    throw new Error('Cannot prompt for input in non-interactive terminal');
  }
  
  try {
    // Use Inquirer to create the prompt
    const result = await inquirer.prompt([options as any]);
    
    logger.debug('Prompt result', { name: options.name, result: result[options.name] });
    
    return result[options.name];
  } catch (error) {
    logger.error('Error in prompt', error);
    throw new Error(`Failed to prompt for ${options.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a text input prompt
 */
export async function promptText(message: string, options: {
  name?: string;
  default?: string;
  required?: boolean;
  validate?: (input: unknown) => boolean | string | Promise<boolean | string>;
} = {}): Promise<string> {
  const result = await createPrompt<string>({
    type: 'input',
    name: options.name || 'input',
    message,
    default: options.default,
    required: options.required,
    validate: options.validate
  }, { theme: 'system', useColors: true, showProgressIndicators: true, codeHighlighting: true });
  
  return result;
}

/**
 * Create a password input prompt
 */
export async function promptPassword(message: string, options: {
  name?: string;
  mask?: string;
  required?: boolean;
} = {}): Promise<string> {
  const result = await createPrompt<string>({
    type: 'password',
    name: options.name || 'password',
    message,
    mask: options.mask || '*',
    required: options.required
  }, { theme: 'system', useColors: true, showProgressIndicators: true, codeHighlighting: true });
  
  return result;
}

/**
 * Create a confirmation prompt
 */
export async function promptConfirm(message: string, options: {
  name?: string;
  default?: boolean;
} = {}): Promise<boolean> {
  const result = await createPrompt<boolean>({
    type: 'confirm',
    name: options.name || 'confirm',
    message,
    default: options.default
  }, { theme: 'system', useColors: true, showProgressIndicators: true, codeHighlighting: true });
  
  return result;
}

/**
 * Create a selection list prompt
 */
export async function promptList<T extends PromptValue>(message: string, choices: Array<string | { name: string; value: T; short?: string }>, options: {
  name?: string;
  default?: T;
  pageSize?: number;
} = {}): Promise<T> {
  const result = await createPrompt<T>({
    type: 'list',
    name: options.name || 'list',
    message,
    choices: choices as Array<string | { name: string; value: PromptValue; short?: string }>,
    default: options.default as PromptValue,
    pageSize: options.pageSize
  }, { theme: 'system', useColors: true, showProgressIndicators: true, codeHighlighting: true });
  
  return result;
}

/**
 * Create a multi-select checkbox prompt
 */
export async function promptCheckbox<T extends PromptValue>(message: string, choices: Array<string | { name: string; value: T; checked?: boolean; disabled?: boolean | string }>, options: {
  name?: string;
  pageSize?: number;
} = {}): Promise<T[]> {
  // Use any for checkbox since it returns an array
  const result = await createPrompt<any>({
    type: 'checkbox',
    name: options.name || 'checkbox',
    message,
    choices: choices as Array<string | { name: string; value: PromptValue; checked?: boolean; disabled?: boolean | string }>,
    pageSize: options.pageSize
  }, { theme: 'system', useColors: true, showProgressIndicators: true, codeHighlighting: true });
  
  return result as T[];
}

/**
 * Create an editor prompt
 */
export async function promptEditor(message: string, options: {
  name?: string;
  default?: string;
  postfix?: string;
} = {}): Promise<string> {
  const result = await createPrompt<string>({
    type: 'editor',
    name: options.name || 'editor',
    message,
    default: options.default,
    postfix: options.postfix
  }, { theme: 'system', useColors: true, showProgressIndicators: true, codeHighlighting: true });
  
  return result;
} 