/**
 * Shell Tool
 * 
 * Simple shell command execution tool based on Gemini CLI's approach.
 * Includes security features like timeout and working directory control.
 */

import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface ShellParams {
  /**
   * Command to execute
   */
  command: string;
  
  /**
   * Working directory for command execution (default: current directory)
   */
  cwd?: string;
  
  /**
   * Environment variables (default: inherit from process)
   */
  env?: Record<string, string>;
  
  /**
   * Timeout in milliseconds (default: 30000ms)
   */
  timeout?: number;
  
  /**
   * Whether to capture stderr (default: true)
   */
  captureStderr?: boolean;
}

export interface ShellResult {
  /**
   * Command that was executed
   */
  command: string;
  
  /**
   * Exit code (0 = success)
   */
  exitCode: number | null;
  
  /**
   * Standard output
   */
  stdout: string;
  
  /**
   * Standard error output
   */
  stderr: string;
  
  /**
   * Whether the operation was successful (exitCode === 0)
   */
  success: boolean;
  
  /**
   * Signal that terminated the process (if any)
   */
  signal: string | null;
  
  /**
   * Execution time in milliseconds
   */
  executionTime: number;
  
  /**
   * Working directory where command was executed
   */
  cwd: string;
  
  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Execute a shell command
 */
export async function executeShell(params: ShellParams): Promise<ShellResult> {
  const startTime = Date.now();
  const {
    command,
    cwd = process.cwd(),
    env = process.env as Record<string, string>,
    timeout = 30000,
    captureStderr = true
  } = params;
  
  try {
    // Resolve working directory
    const workingDir = path.resolve(cwd);
    
    logger.debug(`Executing shell command: ${command} (cwd: ${workingDir})`);
    
    return new Promise<ShellResult>((resolve) => {
      // Parse command into parts
      const commandParts = command.trim().split(/\s+/);
      const cmd = commandParts[0];
      const args = commandParts.slice(1);
      
      // Spawn process
      const child = spawn(cmd, args, {
        cwd: workingDir,
        env: { ...env },
        stdio: ['pipe', 'pipe', captureStderr ? 'pipe' : 'inherit'],
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      let timeoutHandle: NodeJS.Timeout | null = null;
      let isTimedOut = false;
      
      // Set up timeout
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          isTimedOut = true;
          child.kill('SIGTERM');
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }, timeout);
      }
      
      // Collect stdout
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      // Collect stderr
      if (child.stderr && captureStderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      // Handle process completion
      child.on('close', (code, signal) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        
        const executionTime = Date.now() - startTime;
        
        const result: ShellResult = {
          command,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: code === 0 && !isTimedOut,
          signal,
          executionTime,
          cwd: workingDir
        };
        
        if (isTimedOut) {
          result.error = `Command timed out after ${timeout}ms`;
          result.success = false;
        }
        
        logger.debug(`Shell command completed: exit=${code}, time=${executionTime}ms`);
        resolve(result);
      });
      
      // Handle process errors
      child.on('error', (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        
        const executionTime = Date.now() - startTime;
        
        resolve({
          command,
          exitCode: null,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: false,
          signal: null,
          executionTime,
          cwd: workingDir,
          error: error.message
        });
      });
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`Failed to execute shell command: ${errorMessage}`);
    
    return {
      command,
      exitCode: null,
      stdout: '',
      stderr: '',
      success: false,
      signal: null,
      executionTime,
      cwd,
      error: errorMessage
    };
  }
}

/**
 * Tool definition for Claude integration
 */
export const shellTool = {
  name: 'shell',
  description: 'Execute shell commands with timeout and security controls',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute'
      },
      cwd: {
        type: 'string',
        description: 'Working directory for command execution (default: current directory)'
      },
      env: {
        type: 'object',
        description: 'Environment variables as key-value pairs',
        additionalProperties: {
          type: 'string'
        }
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000ms)',
        default: 30000,
        minimum: 1000,
        maximum: 300000
      },
      captureStderr: {
        type: 'boolean',
        description: 'Whether to capture stderr output (default: true)',
        default: true
      }
    },
    required: ['command']
  },
  handler: executeShell
} as const; 