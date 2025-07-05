/**
 * Standard I/O (stdio) Transport for MCP (Model Context Protocol)
 * 
 * Provides a stdio transport implementation for MCP using child processes.
 * Supports:
 * - Spawning MCP servers as child processes
 * - Communication via stdin/stdout pipes
 * - Custom environment variables
 * - Timeout handling
 * - Error handling
 */

import type { MCPConnectionOptions} from './index.js';
import { BaseMCPTransport, TransportStatus } from './index.js';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { logger } from '../../utils/logger.js';
import readline from 'readline';

/**
 * Standard I/O transport options
 */
export interface StdioTransportOptions {
  /**
   * The command to execute
   */
  command: string;
  
  /**
   * Command arguments
   */
  args?: string[];
  
  /**
   * Environment variables for the child process
   */
  env?: Record<string, string>;
  
  /**
   * Working directory for the child process
   */
  cwd?: string;
  
  /**
   * How to handle stderr
   */
  stderr?: 'pipe' | 'ignore' | 'inherit';
  
  /**
   * Whether to buffer stdout
   */
  bufferStdout?: boolean;
}

/**
 * Standard I/O transport for MCP (Model Context Protocol)
 */
export class StdioTransport extends BaseMCPTransport {
  private readonly command: string;
  private readonly args: string[];
  private env: Record<string, string>;
  private readonly cwd: string;
  private readonly stderrMode: 'pipe' | 'ignore' | 'inherit';
  private readonly bufferStdout: boolean;
  
  private process: ChildProcess | null = null;
  private stdoutBuffer = '';
  private waitForDataResolvers: Array<(data: string) => void> = [];
  private stdoutLineReader: readline.Interface | null = null;
  
  /**
   * Create a new stdio transport
   */
  constructor(options: StdioTransportOptions) {
    super();
    
    this.command = options.command;
    this.args = options.args || [];
    
    // Filter out undefined values from process.env
    const processEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        processEnv[key] = value;
      }
    }
    
    this.env = { ...processEnv, ...(options.env || {}) };
    this.cwd = options.cwd || process.cwd();
    this.stderrMode = options.stderr || 'pipe';
    this.bufferStdout = options.bufferStdout ?? true;
  }
  
  /**
   * Connect to the MCP server by spawning a child process
   */
  async connect(options?: MCPConnectionOptions): Promise<void> {
    if (this._status === TransportStatus.CONNECTED && this.process) {
      return;
    }
    
    // Clean up any existing process
    this.cleanup();
    
    // Update environment variables and timeout from connection options
    if (options?.env) {
      this.env = { ...this.env, ...options.env };
    }
    
    if (options?.timeout) {
      this._timeout = options.timeout;
    }
    
    this.setStatus(TransportStatus.CONNECTING);
    this.stdoutBuffer = '';
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this._status !== TransportStatus.CONNECTED) {
          this.cleanup();
          reject(new Error(`Connection timeout after ${this._timeout}ms`));
        }
      }, this._timeout);
      
      try {
        // Spawn the child process
        this.process = spawn(this.command, this.args, {
          env: this.env,
          cwd: this.cwd,
          stdio: ['pipe', 'pipe', this.stderrMode === 'ignore' ? 'ignore' : 'pipe']
        });
        
        // Set up error handler
        this.process.on('error', error => {
          logger.error('Child process error:', error);
          this.emit('error', error);
          
          if (this._status === TransportStatus.CONNECTING) {
            clearTimeout(timeout);
            this.cleanup();
            this.setStatus(TransportStatus.ERROR);
            reject(error);
          }
        });
        
        // Handle process exit
        this.process.on('exit', (code, signal) => {
          logger.info(`Child process exited: code=${code}, signal=${signal}`);
          
          if (this._status === TransportStatus.CONNECTING) {
            clearTimeout(timeout);
            this.cleanup();
            this.setStatus(TransportStatus.ERROR);
            reject(new Error(`Process exited with code ${code} and signal ${signal}`));
          } else {
            this.cleanup();
            this.setStatus(TransportStatus.DISCONNECTED);
          }
        });
        
        // Set up stdout handling
        if (this.process.stdout) {
          if (this.bufferStdout) {
            // Handle stdout line by line
            this.stdoutLineReader = readline.createInterface({
              input: this.process.stdout,
              terminal: false
            });
            
            this.stdoutLineReader.on('line', line => {
              this.handleStdoutData(`${line}\n`);
            });
          } else {
            // Handle raw stdout data
            this.process.stdout.on('data', data => {
              this.handleStdoutData(data.toString());
            });
          }
          
          // Wait for first stdout data as connection signal
          this.process.stdout.once('data', () => {
            clearTimeout(timeout);
            this.setStatus(TransportStatus.CONNECTED);
            resolve();
          });
        }
        
        // Set up stderr handling if piped
        if (this.stderrMode === 'pipe' && this.process.stderr) {
          this.process.stderr.on('data', data => {
            const stderr = data.toString().trim();
            if (stderr) {
              logger.debug(`[${this.command}] stderr:`, stderr);
              this.emit('stderr', stderr);
            }
          });
        }
      } catch (error) {
        clearTimeout(timeout);
        this.cleanup();
        this.setStatus(TransportStatus.ERROR);
        reject(error);
      }
    });
  }
  
  /**
   * Handle stdout data
   */
  private handleStdoutData(data: string): void {
    // Add data to buffer
    if (this.bufferStdout) {
      this.stdoutBuffer += data;
    }
    
    // Emit data event
    this.emit('data', data);
    
    // Resolve any waiting promises
    const waiters = [...this.waitForDataResolvers];
    this.waitForDataResolvers = [];
    
    for (const resolve of waiters) {
      resolve(data);
    }
  }
  
  /**
   * Wait for data from stdout
   */
  async waitForData(timeout: number = this._timeout): Promise<string> {
    if (this._status !== TransportStatus.CONNECTED) {
      throw new Error('Cannot wait for data: transport is not connected');
    }
    
    return new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.waitForDataResolvers.indexOf(resolve);
        if (index !== -1) {
          this.waitForDataResolvers.splice(index, 1);
        }
        reject(new Error(`Timeout waiting for data after ${timeout}ms`));
      }, timeout);
      
      if (this.stdoutBuffer) {
        const data = this.stdoutBuffer;
        this.stdoutBuffer = '';
        clearTimeout(timeoutId);
        resolve(data);
      } else {
        // Add resolver to be called when data arrives
        this.waitForDataResolvers.push(data => {
          clearTimeout(timeoutId);
          resolve(data);
        });
      }
    });
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Clean up line reader
    if (this.stdoutLineReader) {
      this.stdoutLineReader.close();
      this.stdoutLineReader = null;
    }
    
    // Clean up child process
    if (this.process) {
      // Remove event listeners
      this.process.removeAllListeners();
      
      if (this.process.stdout) {
        this.process.stdout.removeAllListeners();
      }
      
      if (this.process.stderr) {
        this.process.stderr.removeAllListeners();
      }
      
      // Kill the process if it's still running
      if (!this.process.killed) {
        try {
          this.process.kill();
        } catch (error) {
          logger.error('Error killing child process:', error);
        }
      }
      
      this.process = null;
    }
    
    // Reject any waiting resolvers
    for (const resolve of this.waitForDataResolvers) {
      resolve('');
    }
    this.waitForDataResolvers = [];
  }
  
  /**
   * Send a message to the MCP server via stdin
   */
  async send(message: string): Promise<void> {
    if (this._status !== TransportStatus.CONNECTED || !this.process?.stdin) {
      throw new Error('Cannot send message: transport is not connected');
    }
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Send timeout after ${this._timeout}ms`));
      }, this._timeout);
      
      try {
        // Ensure message ends with newline
        const messageWithNewline = message.endsWith('\n') ? message : `${message}\n`;
        
        // Write to stdin
        this.process!.stdin!.write(messageWithNewline, error => {
          clearTimeout(timeout);
          
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  
  /**
   * Close the connection
   */
  async close(): Promise<void> {
    this.cleanup();
    this.setStatus(TransportStatus.DISCONNECTED);
  }
}