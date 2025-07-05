/**
 * Execution Environment Module
 * 
 * Provides functionality for executing shell commands and scripts
 * in a controlled environment with proper error handling.
 */

import { exec, spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { Timeout } from '../utils/types.js';
import type { SandboxService } from '../security/sandbox.js';
import { SandboxPermission, hasPermission } from '../security/sandbox.js';
import type { AppConfigType } from '../config/schema.js';

/**
 * Result of a command execution
 */
interface ExecutionResult {
  output: string;
  exitCode: number;
  error?: Error;
  command: string;
  duration: number;
}

/**
 * Command execution options
 */
interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
  maxBuffer?: number;
  captureStderr?: boolean;
}

/**
 * Background process options
 */
interface BackgroundProcessOptions extends ExecutionOptions {
  onOutput?: (output: string) => void;
  onError?: (error: string) => void;
  onExit?: (code: number | null) => void;
}

/**
 * Background process handle
 */
interface BackgroundProcess {
  pid: number;
  kill: () => boolean;
  isRunning: boolean;
}

/**
 * List of dangerous commands that shouldn't be executed
 */
const DANGEROUS_COMMANDS = [
  /^\s*rm\s+(-rf?|--recursive)\s+[\/~]/i, // rm -rf / or similar
  /^\s*dd\s+.*of=\/dev\/(disk|hd|sd)/i,   // dd to a device
  /^\s*mkfs/i,                           // Format a filesystem
  /^\s*:\(\)\{\s*:\|:\s*&\s*\}\s*;/,      // Fork bomb
  /^\s*>(\/dev\/sd|\/dev\/hd)/,           // Overwrite disk device
  /^\s*sudo\s+.*(rm|mkfs|dd|chmod|chown)/i // sudo with dangerous commands
];

/**
 * Maximum command execution time (30 seconds by default)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Maximum output buffer size (5MB by default)
 */
const DEFAULT_MAX_BUFFER = 5 * 1024 * 1024;

/**
 * Execution config interface
 */
export interface ExecutionConfig extends AppConfigType {
  // Extends the main app config with execution-specific settings
}

/**
 * Execution environment manager
 */
class ExecutionEnvironment {
  private readonly config: AppConfigType;
  private readonly backgroundProcesses: Map<number, BackgroundProcess> = new Map();
  private executionCount = 0;
  private workingDirectory: string;
  private environmentVariables: Record<string, string>;
  private readonly sandbox?: SandboxService;

  /**
   * Create a new execution environment
   */
  constructor(config: AppConfigType, sandbox?: SandboxService) {
    this.config = config;
    this.workingDirectory = process.cwd(); // Use current working directory as default
    this.sandbox = sandbox;
    
    // Set up environment variables
    this.environmentVariables = {
      ...process.env as Record<string, string>,
      CLAUDE_CODE_VERSION: config.version || '0.2.29',
      NODE_ENV: 'production'
    };
    
    // Add sandbox flag if running in sandbox
    if (this.sandbox?.getConfig()?.enabled) {
      this.environmentVariables.SANDBOX = 'true';
      this.environmentVariables.SANDBOX_MODE = this.sandbox.getConfig().mode;
    }
    
    logger.debug('Execution environment created', {
      workingDirectory: this.workingDirectory,
      sandboxEnabled: sandbox?.getConfig()?.enabled || false
    });
  }

  /**
   * Initialize the execution environment
   */
  async initialize(): Promise<void> {
    logger.info('Initializing execution environment');
    
    try {
      // Verify shell is available
      const shell = this.config.execution?.shell || process.env.SHELL || 'bash';
      
      await this.executeCommand(`${shell} -c "echo Shell is available"`, {
        timeout: 5000
      });
      
      logger.info('Execution environment initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize execution environment', error);
      throw createUserError('Failed to initialize command execution environment', {
        cause: error,
        category: ErrorCategory.COMMAND_EXECUTION,
        resolution: 'Check that your shell is properly configured'
      });
    }
  }

  /**
   * Execute a shell command
   */
  async executeCommand(command: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    // Increment execution count
    this.executionCount++;
    
    // Validate command for safety
    this.validateCommand(command);
    
    const cwd = options.cwd || this.workingDirectory;
    const env = { ...this.environmentVariables, ...(options.env || {}) };
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const maxBuffer = options.maxBuffer || DEFAULT_MAX_BUFFER;
    const shell = options.shell || this.config.execution?.shell || process.env.SHELL || 'bash';
    const captureStderr = options.captureStderr !== false;
    
    logger.debug('Executing command', {
      command,
      cwd,
      shell,
      timeout,
      executionCount: this.executionCount,
      sandbox: this.sandbox?.getConfig()?.enabled ? this.sandbox.getConfig().mode : 'disabled'
    });
    
    // Execute through sandbox if enabled
    if (this.sandbox?.getConfig()?.enabled) {
      try {
        const result = await this.sandbox.executeCommand(command, {
          cwd,
          env,
          timeout
        });
        
        return {
          output: result.output,
          exitCode: result.exitCode,
          command,
          duration: 0 // Sandbox doesn't provide duration
        };
      } catch (error) {
        logger.error(`Sandbox command execution failed: ${command}`, error);
        return {
          output: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          error: error instanceof Error ? error : new Error(String(error)),
          command,
          duration: 0
        };
      }
    }
    
    // Check execution permission if configured
    if (this.config.security?.permissions) {
      const allowed = hasPermission(this.config, SandboxPermission.CMD_EXEC);
      if (!allowed) {
        return {
          output: 'Command execution not allowed by security policy',
          exitCode: 1,
          error: createUserError('Command execution not allowed by security policy', {
            category: ErrorCategory.SECURITY,
            resolution: 'Command execution is disabled in security settings.'
          }),
          command,
          duration: 0
        };
      }
    }
    
    const startTime = Date.now();
    
    return new Promise<ExecutionResult>((resolve, reject) => {
      exec(command, {
        cwd,
        env,
        timeout,
        maxBuffer,
        shell,
        windowsHide: true,
        encoding: 'utf8'
      }, (error: Error | null, stdout: string, stderr: string) => {
        const duration = Date.now() - startTime;
        
        // Combine stdout and stderr if requested
        const output = captureStderr ? `${stdout}${stderr ? stderr : ''}` : stdout;
        
        if (error) {
          logger.error(`Command execution failed: ${command}`, {
            error: error.message,
            exitCode: (error as any).code,
            duration
          });
          
          // Format the error result
          resolve({
            output,
            exitCode: (error as any).code || 1,
            error,
            command,
            duration
          });
        } else {
          logger.debug(`Command executed successfully: ${command}`, {
            duration,
            outputLength: output.length
          });
          
          resolve({
            output,
            exitCode: 0,
            command,
            duration
          });
        }
      });
    });
  }

  /**
   * Execute a command in the background
   */
  executeCommandInBackground(command: string, options: BackgroundProcessOptions = {}): BackgroundProcess {
    // Validate command for safety
    this.validateCommand(command);
    
    const cwd = options.cwd || this.workingDirectory;
    const env = { ...this.environmentVariables, ...(options.env || {}) };
    const shell = options.shell || this.config.execution?.shell || process.env.SHELL || 'bash';
    
    logger.debug('Executing command in background', {
      command,
      cwd,
      shell
    });
    
    // Spawn the process
    const childProcess = spawn(command, [], {
      cwd,
      env,
      shell,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const pid = childProcess.pid!;
    let isRunning = true;
    
    // Set up output handlers
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString('utf8');
        logger.debug(`Background command (pid ${pid}) output:`, { output });
        
        if (options.onOutput) {
          options.onOutput(output);
        }
      });
    }
    
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data: Buffer) => {
        const errorOutput = data.toString('utf8');
        logger.debug(`Background command (pid ${pid}) error:`, { errorOutput });
        
        if (options.onError) {
          options.onError(errorOutput);
        }
      });
    }
    
    // Set up exit handler
    childProcess.on('exit', code => {
      isRunning = false;
      logger.debug(`Background command (pid ${pid}) exited with code ${code}`);
      
      // Remove from tracked processes
      this.backgroundProcesses.delete(pid);
      
      if (options.onExit) {
        options.onExit(code);
      }
    });
    
    // Create the process handle
    const backgroundProcess: BackgroundProcess = {
      pid,
      kill: () => {
        if (isRunning) {
          childProcess.kill();
          isRunning = false;
          this.backgroundProcesses.delete(pid);
          return true;
        }
        return false;
      },
      isRunning: true
    };
    
    // Track the process
    this.backgroundProcesses.set(pid, backgroundProcess);
    
    return backgroundProcess;
  }

  /**
   * Kill all running background processes
   */
  killAllBackgroundProcesses(): void {
    logger.info(`Killing ${this.backgroundProcesses.size} background processes`);
    
    for (const process of this.backgroundProcesses.values()) {
      try {
        process.kill();
      } catch (error) {
        logger.warn(`Failed to kill process ${process.pid}`, error);
      }
    }
    
    this.backgroundProcesses.clear();
  }

  /**
   * Validate a command for safety
   */
  private validateCommand(command: string): void {
    // If sandbox is enabled, it will perform its own validation
    if (this.sandbox?.getConfig()?.enabled) {
      // Let the sandbox handle validation
      return;
    }
    
    // Check if command is in the denied list
    for (const pattern of DANGEROUS_COMMANDS) {
      if (pattern.test(command)) {
        throw createUserError(`Command execution blocked: '${command}' matches dangerous pattern`, {
          category: ErrorCategory.COMMAND_EXECUTION,
          resolution: 'This command is blocked for safety reasons. Please use a different command.'
        });
      }
    }
    
    // Check security settings for allowed commands
    if (this.config.security?.sandbox?.allowedCommands?.length > 0) {
      const allowed = this.config.security.sandbox.allowedCommands.some(
        (allowedPattern: string) => {
          const pattern = new RegExp(allowedPattern, 'i');
          return pattern.test(command);
        }
      );
      
      if (!allowed) {
        throw createUserError(`Command execution blocked: '${command}' is not in the allowed list`, {
          category: ErrorCategory.COMMAND_EXECUTION,
          resolution: 'This command is not allowed by your security configuration.'
        });
      }
    }
    
    // Check if command is in allowed list (if configured in execution settings)
    // Note: execution.allowedCommands is not part of the current schema
    // This section is commented out until the schema is updated
    /*
    else if (this.config.execution?.allowedCommands && this.config.execution.allowedCommands.length > 0) {
      const allowed = this.config.execution.allowedCommands.some(
        (allowedPattern: string | RegExp) => {
          if (typeof allowedPattern === 'string') {
            return command.startsWith(allowedPattern);
          } else {
            return allowedPattern.test(command);
          }
        }
      );
      
      if (!allowed) {
        throw createUserError(`Command execution blocked: '${command}' is not in the allowed list`, {
          category: ErrorCategory.COMMAND_EXECUTION,
          resolution: 'This command is not allowed by your configuration.'
        });
      }
    }
    */
  }

  /**
   * Set the working directory
   */
  setWorkingDirectory(directory: string): void {
    this.workingDirectory = directory;
    logger.debug(`Working directory set to: ${directory}`);
  }

  /**
   * Get the working directory
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Set an environment variable
   */
  setEnvironmentVariable(name: string, value: string): void {
    this.environmentVariables[name] = value;
    logger.debug(`Environment variable set: ${name}=${value}`);
  }

  /**
   * Get an environment variable
   */
  getEnvironmentVariable(name: string): string | undefined {
    return this.environmentVariables[name];
  }
}

/**
 * Initialize the execution environment
 */
export async function initExecutionEnvironment(config: AppConfigType, sandbox?: SandboxService): Promise<ExecutionEnvironment> {
  const executionEnv = new ExecutionEnvironment(config, sandbox);
  await executionEnv.initialize();
  
  // Set up cleanup handlers
  setupProcessCleanup(executionEnv);
  
  logger.info('Execution environment ready');
  return executionEnv;
}

// Set up cleanup on process exit
function setupProcessCleanup(executionEnv: ExecutionEnvironment): void {
  process.on('exit', () => {
    executionEnv.killAllBackgroundProcesses();
  });
  
  process.on('SIGINT', () => {
    executionEnv.killAllBackgroundProcesses();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    executionEnv.killAllBackgroundProcesses();
    process.exit(0);
  });
}

export { type ExecutionResult, type ExecutionOptions, type BackgroundProcess, type BackgroundProcessOptions };
export default ExecutionEnvironment; 