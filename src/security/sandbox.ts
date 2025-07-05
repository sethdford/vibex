/**
 * Sandbox Security System
 * 
 * Provides a secure execution environment for commands and file operations,
 * with configurable restrictions and isolation options.
 */

import { spawn, SpawnOptions, exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, realpathSync } from 'fs';
import os from 'os';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import type { AppConfigType } from '../config/schema.js';

const execAsync = promisify(exec);

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  enabled: boolean;
  mode: 'restricted' | 'container';
  containerImage?: string;
  containerCommand?: 'docker' | 'podman' | 'sandbox-exec';
  allowedCommands: string[];
  deniedCommands: string[];
  readOnlyFilesystem: boolean;
  allowedPaths: string[];
  allowedNetworkHosts: string[];
  resourceLimits: {
    cpuLimit?: number;
    memoryLimit?: string;
    processLimit?: number;
  };
  proxyCommand?: string;
  macosProfile?: string;
  mountPoints?: string[];
  exposeDebugPort?: boolean;
  debugPort?: string;
}

/**
 * Sandbox service for executing commands in a secure environment
 */
export class SandboxService {
  private readonly config: SandboxConfig;
  private readonly workspacePath: string;

  constructor(config: SandboxConfig, workspacePath: string) {
    this.config = config;
    this.workspacePath = workspacePath;
    logger.debug('Sandbox service initialized', { 
      enabled: config.enabled,
      mode: config.mode,
      workspacePath
    });
  }

  /**
   * Get the sandbox configuration
   */
  public getConfig(): SandboxConfig {
    return this.config;
  }

  /**
   * Validate if a command is allowed to execute
   */
  validateCommand(command: string): boolean {
    // Check against deny patterns
    const deniedPatterns = [
      ...this.getDangerousCommandPatterns(),
      ...this.config.deniedCommands.map(pattern => new RegExp(pattern, 'i'))
    ];

    for (const pattern of deniedPatterns) {
      if (pattern.test(command)) {
        throw createUserError(`Command execution blocked: '${command}' matches denied pattern`, {
          category: ErrorCategory.COMMAND_EXECUTION,
          resolution: 'This command is blocked for security reasons. Please use a different command.'
        });
      }
    }

    // Check against allow list if configured
    if (this.config.allowedCommands.length > 0) {
      const allowed = this.config.allowedCommands.some(allowedPattern => {
        const pattern = new RegExp(allowedPattern, 'i');
        return pattern.test(command);
      });

      if (!allowed) {
        throw createUserError(`Command execution blocked: '${command}' is not in the allowed list`, {
          category: ErrorCategory.COMMAND_EXECUTION,
          resolution: 'This command is not allowed by your security configuration.'
        });
      }
    }

    return true;
  }

  /**
   * Validate if a file path is allowed for access
   */
  validatePath(filePath: string): boolean {
    const absolutePath = path.resolve(this.workspacePath, filePath);
    
    // Prevent directory traversal
    if (!absolutePath.startsWith(this.workspacePath)) {
      throw createUserError(`Access denied: Path '${filePath}' is outside the workspace directory`, {
        category: ErrorCategory.FILE_SYSTEM,
        resolution: 'Only paths within the workspace directory are allowed.'
      });
    }

    // Check against allowed paths if configured
    if (this.config.allowedPaths.length > 0) {
      const allowed = this.config.allowedPaths.some(allowedPath => {
        const fullAllowedPath = path.resolve(this.workspacePath, allowedPath);
        return absolutePath.startsWith(fullAllowedPath);
      });

      if (!allowed) {
        throw createUserError(`Access denied: Path '${filePath}' is not in the allowed paths list`, {
          category: ErrorCategory.FILE_SYSTEM,
          resolution: 'Access is restricted to specific directories in your configuration.'
        });
      }
    }

    return true;
  }

  /**
   * Execute a command in the sandbox
   */
  async executeCommand(
    command: string, 
    options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}
  ): Promise<{ output: string; exitCode: number }> {
    // Validate command is allowed
    this.validateCommand(command);

    const cwd = options.cwd || this.workspacePath;
    
    // If sandbox is disabled, just execute the command directly
    if (!this.config.enabled) {
      return this.executeNative(command, options);
    }

    // Check if we're already inside a sandbox
    if (process.env.SANDBOX) {
      logger.debug('Already running in sandbox, executing natively', {
        sandboxId: process.env.SANDBOX
      });
      return this.executeNative(command, options);
    }

    // Execute in appropriate sandbox mode
    if (this.config.containerCommand === 'sandbox-exec' && os.platform() === 'darwin') {
      return this.executeRestricted(command, options);
    } else if (this.config.mode === 'container') {
      return this.executeInContainer(command, options);
    } else {
      return this.executeRestricted(command, options);
    }
  }

  /**
   * Execute a command natively (no sandbox)
   */
  private async executeNative(
    command: string,
    options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}
  ): Promise<{ output: string; exitCode: number }> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    
    const execPromise = promisify(exec);
    const timeout = options.timeout || 30000;
    
    try {
      const { stdout, stderr } = await execPromise(command, { 
        cwd: options.cwd || this.workspacePath,
        env: { ...process.env, ...options.env },
        timeout
      });
      
      return {
        output: stdout + stderr,
        exitCode: 0
      };
    } catch (error: unknown) {
      return {
        output: error instanceof Error ? error.message : String(error),
        exitCode: 1
      };
    }
  }

  /**
   * Execute in restricted mode (native with extra validation)
   */
  private async executeRestricted(
    command: string,
    options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}
  ): Promise<{ output: string; exitCode: number }> {
    // Additional validations for restricted mode
    const cwd = options.cwd || this.workspacePath;
    
    // Validate working directory
    this.validatePath(cwd);
    
    // Add resource limits if configured
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...options.env || {}
    };
    
    if (this.config.resourceLimits.processLimit) {
      env.PROCESS_LIMIT = this.config.resourceLimits.processLimit.toString();
    }
    
    // Execute the command
    return this.executeNative(command, {
      ...options,
      env
    });
  }

  /**
   * Execute in container mode (using Docker/Podman)
   */
  private async executeInContainer(
    command: string,
    options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}
  ): Promise<{ output: string; exitCode: number }> {
    if (!this.config.containerCommand || !this.config.containerImage) {
      throw createUserError('Container sandbox is enabled but container command or image is not configured', {
        category: ErrorCategory.COMMAND_EXECUTION,
        resolution: 'Configure containerCommand and containerImage in security.sandbox settings'
      });
    }

    const containerCmd = this.config.containerCommand;
    const containerImage = this.config.containerImage;
    const workDir = '/workspace';
    const cwd = options.cwd || this.workspacePath;
    const relWorkingDir = path.relative(this.workspacePath, cwd);
    
    // Build container run command
    const containerArgs = [
      'run',
      '--rm',
      '-v', `${this.workspacePath}:${workDir}`,
      '-w', `${workDir}/${relWorkingDir}`,
      '--network', this.config.allowedNetworkHosts.length === 0 ? 'none' : 'host'
    ];
    
    // Add resource limits
    if (this.config.resourceLimits.cpuLimit) {
      containerArgs.push('--cpus', this.config.resourceLimits.cpuLimit.toString());
    }
    
    if (this.config.resourceLimits.memoryLimit) {
      containerArgs.push('-m', this.config.resourceLimits.memoryLimit);
    }
    
    // Add read-only flag if configured
    if (this.config.readOnlyFilesystem) {
      containerArgs.push('--read-only');
    }
    
    // Add environment variables
    for (const [key, value] of Object.entries(options.env || {})) {
      containerArgs.push('-e', `${key}=${value}`);
    }
    
    // Add image and command
    containerArgs.push(containerImage, 'sh', '-c', command);
    
    logger.debug('Executing in container', {
      command: containerCmd,
      args: containerArgs
    });
    
    return new Promise((resolve, reject) => {
      const child = spawn(containerCmd, containerArgs);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', data => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', data => {
        stderr += data.toString();
      });
      
      const timeout = options.timeout || 30000;
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
      
      child.on('close', code => {
        clearTimeout(timer);
        resolve({
          output: stdout + stderr,
          exitCode: code || 0
        });
      });
      
      child.on('error', error => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Perform a file system operation with sandbox validation
   */
  async withSandboxedFs<T>(operation: () => Promise<T>, filePath: string, options?: { writeAccess?: boolean }): Promise<T> {
    // Validate path
    this.validatePath(filePath);
    
    // Check read-only mode
    if (options?.writeAccess && this.config.readOnlyFilesystem) {
      throw createUserError(`Write access denied: Filesystem is in read-only mode`, {
        category: ErrorCategory.FILE_SYSTEM,
        resolution: 'Read-only mode is enabled in your security configuration.'
      });
    }
    
    // Perform the operation
    return operation();
  }

  /**
   * Check if a file operation is allowed
   */
  async checkFileAccess(filePath: string, writeAccess = false): Promise<boolean> {
    try {
      this.validatePath(filePath);
      
      if (writeAccess && this.config.readOnlyFilesystem) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the list of dangerous command patterns
   */
  private getDangerousCommandPatterns(): RegExp[] {
    return [
      /^\s*rm\s+(-rf?|--recursive)\s+[\/~]/i,     // rm -rf / or similar
      /^\s*dd\s+.*of=\/dev\/(disk|hd|sd)/i,       // dd to a device
      /^\s*mkfs/i,                                // Format a filesystem
      /^\s*:\(\)\{\s*:\|:\s*&\s*\}\s*;/,          // Fork bomb
      /^\s*>(\/dev\/sd|\/dev\/hd)/,               // Overwrite disk device
      /^\s*sudo\s+.*(rm|mkfs|dd|chmod|chown)/i,   // sudo with dangerous commands
      /^\s*wget\s+.*\|\s*sh/i,                    // Download and pipe to shell
      /^\s*curl\s+.*\|\s*sh/i,                    // Download and pipe to shell
      /^\s*eval\s+.*\$\(/i,                       // Eval with command substitution
      /^\s*chmod\s+.*777/i,                       // chmod 777 (too permissive)
      /^\s*(shutdown|reboot|halt|init\s+0)/i,     // System shutdown commands
      /^\s*mv\s+.*\/dev\/.*/i,                    // Moving files to /dev
      /^\s*>\s*\/etc\/passwd/i,                   // Overwriting passwd file
      /^\s*>\s*\/etc\/shadow/i,                   // Overwriting shadow file
      /^\s*chown\s+.*root\s+/i                    // Changing ownership to root
    ];
  }

  /**
   * Create a temporary directory for sandboxed operations
   */
  async createTempDir(): Promise<string> {
    const tempDir = path.join(this.workspacePath, '.vibex', 'temp', `sandbox-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }
}

/**
 * Initialize the sandbox service
 */
export async function initSandbox(config: AppConfigType): Promise<SandboxService> {
  const sandboxConfig = config.security?.sandbox || {
    enabled: false,
    mode: 'restricted' as const,
    allowedCommands: [],
    deniedCommands: [],
    readOnlyFilesystem: false,
    allowedPaths: [],
    allowedNetworkHosts: [],
    resourceLimits: {}
  };
  
  const workspacePath = process.cwd();
  
  logger.info('Initializing sandbox service', {
    enabled: sandboxConfig.enabled,
    mode: sandboxConfig.mode
  });
  
  return new SandboxService(sandboxConfig, workspacePath);
}

/**
 * Get default sandbox configuration
 */
export function getDefaultSandboxConfig(): SandboxConfig {
  return {
    enabled: false,
    mode: 'restricted',
    allowedCommands: [],
    deniedCommands: [],
    readOnlyFilesystem: false,
    allowedPaths: [],
    allowedNetworkHosts: [],
    resourceLimits: {}
  };
}

/**
 * Permission system for operations
 */
export enum SandboxPermission {
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  CMD_EXEC = 'cmd_exec',
  NETWORK = 'network',
}

/**
 * Check if a specific permission is granted
 */
export function hasPermission(config: AppConfigType, permission: SandboxPermission): boolean {
  if (!config.security?.sandbox?.enabled) {
    return true;
  }
  
  const perms = config.security?.permissions || {};
  
  switch (permission) {
    case SandboxPermission.FILE_WRITE:
      return !config.security?.sandbox?.readOnlyFilesystem && perms.allowFileWrite !== false;
    case SandboxPermission.CMD_EXEC:
      return perms.allowCommandExecution !== false;
    case SandboxPermission.NETWORK:
      return config.security?.sandbox?.allowedNetworkHosts?.length !== 0 || perms.allowNetwork !== false;
    case SandboxPermission.FILE_READ:
    default:
      return true;
  }
}