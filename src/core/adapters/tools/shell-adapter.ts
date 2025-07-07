/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolExecutionOptions, ToolResult, ToolConfirmationDetails } from '../../domain/tool';
import { executeShell } from '../../../tools/shell.js';

/**
 * Adapter for the shell tool to the new architecture
 */
export class ShellTool extends BaseTool {
  // Potentially dangerous commands that should require extra confirmation
  private dangerousCommands = [
    'rm', 'rmdir', 'del', 'format', 
    'dd', 'mkfs', 'fdisk', 
    'chmod', 'chown',
    'sudo', 'su'
  ];

  constructor() {
    super(
      'shell',
      'Execute shell commands with timeout and security controls',
      {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute'
          },
          cwd: {
            type: 'string',
            description: 'Working directory for command execution'
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default: 30000)',
            minimum: 1000,
            maximum: 300000
          },
          capture_stderr: {
            type: 'boolean',
            description: 'Whether to capture stderr (default: true)'
          }
        },
        required: ['command']
      },
      { 
        requiresConfirmation: true, 
        dangerous: true 
      }
    );
  }

  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    const { 
      command, 
      cwd, 
      timeout = 30000, 
      capture_stderr = true 
    } = params as { 
      command: string, 
      cwd?: string, 
      timeout?: number,
      capture_stderr?: boolean
    };
    
    try {
      // Call the legacy implementation
      const result = await executeShell({
        command,
        cwd,
        timeout,
        captureStderr: capture_stderr
      });
      
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        data: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTime: result.executionTime
        } as unknown,
        success: result.success,
        error: result.error ? new Error(result.error) : undefined
      } as ToolResult;
    } catch (error) {
      return {
        callId: (options?.context?.callId as string) || 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        success: false,
        data: undefined
      } as ToolResult;
    }
  }

  validateParams(params: unknown): string | null {
    if (typeof params !== 'object' || params === null) {
      return 'Parameters must be an object';
    }
    
    const { command } = params as { command?: string };
    
    if (!command) {
      return 'Missing required parameter: command';
    }
    
    if (typeof command !== 'string') {
      return 'command must be a string';
    }
    
    return null;
  }

  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    const { command } = params as { command: string };
    
    // Check if this is a dangerous command
    const isDangerous = this.isDangerousCommand(command);
    
    return {
      title: `Confirm shell command execution${isDangerous ? ' (DANGER)' : ''}`,
      description: `This will execute: ${command}`,
      type: isDangerous ? 'danger' : 'exec',
      params: params as Record<string, unknown>,
      displayOptions: {
        language: 'bash',
        showDiff: false,
        allowEdit: true
      }
    };
  }

  private isDangerousCommand(command: string): boolean {
    const commandLower = command.toLowerCase();
    return this.dangerousCommands.some(cmd => 
      commandLower.startsWith(cmd + ' ') || 
      commandLower === cmd ||
      commandLower.includes(` ${cmd} `) ||
      commandLower.includes(`;${cmd} `) ||
      commandLower.includes(`&&${cmd} `)
    );
  }
}