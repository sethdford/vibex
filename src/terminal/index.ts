/**
 * Terminal Interface Module
 * 
 * Provides a user interface for interacting with Claude Code in the terminal.
 * Handles input/output, formatting, and display.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora, { Ora } from 'ora';
import terminalLink from 'terminal-link';
import { table } from 'table';
import { logger } from '../utils/logger.js';
import type { TerminalInterface, TerminalConfig, PromptOptions, SpinnerInstance } from './types.js';
import { formatOutput, clearScreen, getTerminalSize } from './formatting.js';
import { createPrompt, type PromptValue } from './prompt.js';
import type { AppConfigType } from '../config/schema.js';

/**
 * Initialize the terminal interface
 */
export async function initTerminal(config: AppConfigType): Promise<TerminalInterface> {
  logger.debug('Initializing terminal interface');
  
  const terminalConfig: TerminalConfig = {
    theme: config.terminal?.theme || 'system',
    useColors: config.terminal?.useColors !== false,
    showProgressIndicators: config.terminal?.showProgressIndicators !== false,
    codeHighlighting: config.terminal?.codeHighlighting !== false,
  };
  
  const terminal = new Terminal(terminalConfig);
  
  try {
    // Detect terminal capabilities
    await terminal.detectCapabilities();
    
    return terminal;
  } catch (error) {
    logger.warn('Error initializing terminal interface:', error);
    
    // Return a basic terminal interface even if there was an error
    return terminal;
  }
}

/**
 * Terminal class for handling user interaction
 */
class Terminal implements TerminalInterface {
  private readonly config: TerminalConfig;
  private readonly activeSpinners: Map<string, SpinnerInstance> = new Map();
  private terminalWidth: number;
  private terminalHeight: number;
  private isInteractive: boolean;

  constructor(config: TerminalConfig) {
    this.config = config;
    
    // Get initial terminal size
    const { rows, columns } = getTerminalSize();
    this.terminalHeight = rows;
    this.terminalWidth = columns;
    
    // Assume interactive by default
    this.isInteractive = process.stdout.isTTY && process.stdin.isTTY;
    
    // Listen for terminal resize events
    process.stdout.on('resize', () => {
      const { rows, columns } = getTerminalSize();
      this.terminalHeight = rows;
      this.terminalWidth = columns;
      logger.debug(`Terminal resized to ${columns}x${rows}`);
    });
  }

  /**
   * Detect terminal capabilities
   */
  async detectCapabilities(): Promise<void> {
    // Check if the terminal is interactive
    this.isInteractive = process.stdout.isTTY && process.stdin.isTTY;
    
    // Check color support
    if (this.config.useColors && !chalk.level) {
      logger.warn('Terminal does not support colors, disabling color output');
      this.config.useColors = false;
    }
    
    logger.debug('Terminal capabilities detected', {
      isInteractive: this.isInteractive,
      colorSupport: this.config.useColors ? 'yes' : 'no',
      size: `${this.terminalWidth}x${this.terminalHeight}`
    });
  }

  /**
   * Display the welcome message
   */
  displayWelcome(): void {
    this.clear();
    
    const version = '0.2.29'; // This should come from package.json
    
    // Main logo/header
    console.log(chalk.blue.bold('\n  Claude Code CLI'));
    console.log(chalk.gray(`  Version ${version} (Research Preview)\n`));
    
    console.log(chalk.white(`  Welcome! Type ${chalk.cyan('/help')} to see available commands.`));
    console.log(chalk.white(`  You can ask Claude to explain code, fix issues, or perform tasks.`));
    console.log(chalk.white(`  Example: "${chalk.italic('Please analyze this codebase and explain its structure.')}"\n`));

    if (this.config.useColors) {
      console.log(chalk.dim('  Pro tip: Use Ctrl+C to interrupt Claude and start over.\n'));
    }
  }

  /**
   * Clear the terminal screen
   */
  clear(): void {
    if (this.isInteractive) {
      clearScreen();
    }
  }

  /**
   * Display formatted content
   */
  display(content: string): void {
    const formatted = formatOutput(content, {
      width: this.terminalWidth,
      colors: this.config.useColors,
      codeHighlighting: this.config.codeHighlighting
    });
    
    console.log(formatted);
  }

  /**
   * Display a message with emphasis
   */
  emphasize(message: string): void {
    if (this.config.useColors) {
      console.log(chalk.cyan.bold(message));
    } else {
      console.log(message.toUpperCase());
    }
  }

  /**
   * Display an informational message
   */
  info(message: string): void {
    if (this.config.useColors) {
      console.log(chalk.blue(`ℹ ${message}`));
    } else {
      console.log(`INFO: ${message}`);
    }
  }

  /**
   * Display a success message
   */
  success(message: string): void {
    if (this.config.useColors) {
      console.log(chalk.green(`✓ ${message}`));
    } else {
      console.log(`SUCCESS: ${message}`);
    }
  }

  /**
   * Display a warning message
   */
  warn(message: string): void {
    if (this.config.useColors) {
      console.log(chalk.yellow(`⚠ ${message}`));
    } else {
      console.log(`WARNING: ${message}`);
    }
  }

  /**
   * Display an error message
   */
  error(message: string): void {
    if (this.config.useColors) {
      console.log(chalk.red(`✗ ${message}`));
    } else {
      console.log(`ERROR: ${message}`);
    }
  }

  /**
   * Create a clickable link in the terminal if supported
   */
  link(text: string, url: string): string {
    return terminalLink(text, url, { fallback: (text: string, url: string) => `${text} (${url})` });
  }

  /**
   * Display a table of data
   */
  table(data: unknown[][], options: { header?: string[]; border?: boolean } = {}): void {
    const config: Record<string, unknown> = {
      border: options.border ? {} : { 
        topBody: '', topJoin: '', topLeft: '', topRight: '', 
        bottomBody: '', bottomJoin: '', bottomLeft: '', bottomRight: '', 
        bodyLeft: '', bodyRight: '', bodyJoin: '', 
        joinBody: '', joinLeft: '', joinRight: '', joinJoin: '' 
      }
    };
    
    // Add header row with formatting
    if (options.header) {
      if (this.config.useColors) {
        data = [options.header.map(h => chalk.bold(h)), ...data];
      } else {
        data = [options.header, ...data];
      }
    }
    
    console.log(table(data, config as any));
  }

  /**
   * Prompt user for input
   */
  async prompt<T extends PromptValue>(options: PromptOptions): Promise<T> {
    return createPrompt(options, this.config);
  }

  /**
   * Create a spinner for long-running operations
   */
  spinner(text: string, id = 'default'): SpinnerInstance {
    const spinner = ora(text);
    
    const instance: SpinnerInstance = {
      id,
      update: (text: string) => {
        spinner.text = text;
        return instance;
      },
      succeed: (message?: string) => {
        spinner.succeed(message);
        this.activeSpinners.delete(id);
        return instance;
      },
      fail: (message?: string) => {
        spinner.fail(message);
        this.activeSpinners.delete(id);
        return instance;
      },
      warn: (message?: string) => {
        spinner.warn(message);
        this.activeSpinners.delete(id);
        return instance;
      },
      info: (message?: string) => {
        spinner.info(message);
        this.activeSpinners.delete(id);
        return instance;
      },
      stop: () => {
        spinner.stop();
        this.activeSpinners.delete(id);
        return instance;
      }
    };
    
    // Start the spinner
    spinner.start();
    this.activeSpinners.set(id, instance);
    
    return instance;
  }
}