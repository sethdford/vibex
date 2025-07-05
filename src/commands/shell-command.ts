/**
 * Shell Integration Command
 * 
 * This module provides the shell command and shell mode functionality,
 * allowing users to run shell commands directly or enter a dedicated shell mode.
 */

import type { CommandDef, CommandContext, ArgDef, CommandResult } from './types.js';
import { ArgType, CommandCategory } from './types.js';
import { logger } from '../utils/logger.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { spawn, type ChildProcess } from 'child_process';
import os from 'os';
import path from 'path';
import chalk from 'chalk';

// Flag to track if we're currently in shell mode
let isShellMode = false;
let shellModeProcess: ChildProcess | null = null;

/**
 * Shell command definition
 */
export const shellCommand: CommandDef = {
  name: 'shell',
  description: 'Run a shell command or enter shell mode',
  category: CommandCategory.SYSTEM,
  aliases: ['!'],
  args: [
    {
      name: 'command',
      description: 'Shell command to execute (leave blank to toggle shell mode)',
      type: 'string',
      required: false
    }
  ],
  async handler(context: CommandContext): Promise<CommandResult> {
    try {
      const command = context.args.command as string | undefined;
      
      // If no command is provided, toggle shell mode
      if (!command) {
        await toggleShellMode();
        return { success: true, message: 'Shell mode toggled' };
      }

      // Otherwise, execute the shell command directly
      await executeShellCommand(command);
      return { success: true, message: 'Shell command executed' };
    } catch (error) {
      logger.error(`Shell command error: ${formatErrorForDisplay(error)}`);
      return { 
        success: false, 
        message: 'Shell command failed',
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
};

/**
 * Toggle between normal mode and shell mode
 */
async function toggleShellMode(): Promise<void> {
  if (isShellMode) {
    // Exit shell mode
    isShellMode = false;
    
    if (shellModeProcess && !shellModeProcess.killed) {
      shellModeProcess.kill();
      shellModeProcess = null;
    }
    
    logger.info(chalk.yellowBright('Exited shell mode. Back to normal mode.'));
    
    // Reset terminal prompt
    process.stdout.write('\x1B[?25h'); // Show cursor
  } else {
    // Enter shell mode
    isShellMode = true;
    logger.info(chalk.yellowBright('Entered shell mode. Commands will be passed directly to the shell.'));
    logger.info(chalk.yellowBright('Use /shell or /! without arguments to exit shell mode.'));
    
    // Spawn an interactive shell
    const shell = os.platform() === 'win32' ? 'cmd.exe' : process.env.SHELL || 'bash';
    const shellArgs = os.platform() === 'win32' ? ['/K', 'echo Interactive shell started'] : ['-i'];
    
    try {
      shellModeProcess = spawn(shell, shellArgs, {
        stdio: 'inherit',
        env: process.env,
        cwd: process.cwd()
      });
      
      shellModeProcess.on('exit', (code: number) => {
        logger.info(chalk.yellowBright(`Shell exited with code ${code}. Back to normal mode.`));
        isShellMode = false;
        shellModeProcess = null;
      });
      
      shellModeProcess.on('error', (error: Error) => {
        logger.error(`Shell error: ${error.message}`);
        isShellMode = false;
        shellModeProcess = null;
      });
    } catch (error) {
      logger.error(`Failed to start shell: ${error instanceof Error ? error.message : String(error)}`);
      isShellMode = false;
    }
  }
}

/**
 * Execute a shell command
 */
async function executeShellCommand(command: string): Promise<void> {
  if (isShellMode && shellModeProcess) {
    // In shell mode, send command to the active shell process
    try {
      shellModeProcess.stdin?.write(`${command}\n`);
    } catch (error) {
      logger.error(`Shell command execution failed: ${formatErrorForDisplay(error)}`);
    }
    return;
  }

  // Execute single command
  try {
    const childProcess = spawn(command, [], {
      stdio: 'inherit',
      shell: true
    });

    await new Promise<void>((resolve, reject) => {
      childProcess.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });

      childProcess.on('error', error => {
        reject(error);
      });
    });
  } catch (error) {
    logger.error(`Error: ${formatErrorForDisplay(error)}`);
  }
}

/**
 * Check if a message is a shell command (starts with !)
 */
export function isShellCommand(message: string): boolean {
  return message.trim().startsWith('!');
}

/**
 * Handle potential shell commands in user input
 * Returns true if the message was handled as a shell command
 */
export async function handleShellInput(message: string): Promise<boolean> {
  // Check if we're in shell mode or the message starts with !
  if (isShellMode || message.trim().startsWith('!')) {
    try {
      const command = message.trim().startsWith('!') 
        ? message.trim().substring(1) // Remove ! prefix
        : message;
        
      // Handle special case for exiting shell mode
      if (isShellMode && (command === 'exit' || command === 'quit')) {
        toggleShellMode();
        return true;
      }
      
      // Execute the command
      await executeShellCommand(command);
      return true;
    } catch (error) {
      logger.error(`Error handling shell input: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      return true; // Still return true since we handled it, even though it failed
    }
  }
  
  return false; // Not a shell command
}

/**
 * Register shell commands
 */
export function registerShellCommands(): CommandDef[] {
  return [shellCommand];
}

/**
 * Exit shell mode
 */
export function exitShellMode(): void {
  if (shellModeProcess) {
    shellModeProcess.kill();
    shellModeProcess = null;
  }
  isShellMode = false;
  logger.info('Exited shell mode. Back to normal mode.');
}

/**
 * Enter shell mode
 */
export function enterShellMode(): void {
  isShellMode = true;
  logger.info('Entered shell mode. Commands will be passed directly to the shell.');
  logger.info('Use /shell or /! without arguments to exit shell mode.');

  // Start an interactive shell process
  const shell = process.env.SHELL || 'bash';
  shellModeProcess = spawn(shell, ['-i'], {
    stdio: ['pipe', 'inherit', 'inherit']
  });

  shellModeProcess.on('close', code => {
    isShellMode = false;
    shellModeProcess = null;
    logger.info(`Shell exited with code ${code}. Back to normal mode.`);
  });

  shellModeProcess.on('error', error => {
    isShellMode = false;
    shellModeProcess = null;
    logger.error(`Shell error: ${error.message}`);
  });

  if (!shellModeProcess.pid) {
    logger.error(`Failed to start shell: ${shell}`);
    isShellMode = false;
    shellModeProcess = null;
  }
}

/**
 * Check if shell mode is active
 */
export function isShellModeActive(): boolean {
  return isShellMode;
}

/**
 * Handle shell command with logging
 */
export function handleShellCommand(command: string): void {
  logger.debug(`$ ${command}`);
  
  if (isShellMode && shellModeProcess?.stdin) {
    try {
      shellModeProcess.stdin.write(`${command}\n`);
    } catch (error) {
      logger.error(`Failed to send command to shell: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Shell command handler for the command system
 */
export async function shellCommandHandler(args: string[]): Promise<void> {
  const command = args.join(' ').trim();
  
  // If no command provided, toggle shell mode
  if (!command) {
    if (isShellMode) {
      exitShellMode();
    } else {
      enterShellMode();
    }
    return;
  }
  
  // Execute the command
  try {
    await executeShellCommand(command);
  } catch (error) {
    logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get shell mode status
 */
export function getShellModeStatus(): {
  active: boolean;
  shell?: string;
  pid?: number;
} {
  return {
    active: isShellMode,
    shell: shellModeProcess ? (process.env.SHELL || 'bash') : undefined,
    pid: shellModeProcess?.pid
  };
}