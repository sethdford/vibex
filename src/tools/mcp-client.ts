/**
 * MCP (Model Context Protocol) Client
 * 
 * Provides integration with MCP servers to extend Claude's capabilities
 * with external tools and services.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
  trust?: boolean;
  description?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export enum MCPServerStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export class MCPClient extends EventEmitter {
  private servers = new Map<string, MCPServerProcess>();
  private tools = new Map<string, MCPTool>();
  
  constructor() {
    super();
  }

  async connectServer(config: MCPServerConfig): Promise<void> {
    logger.info(`Connecting to MCP server: ${config.name}`);
    
    try {
      const process = new MCPServerProcess(config);
      await process.connect();
      
      this.servers.set(config.name, process);
      
      // Discover tools from this server
      const tools = await process.discoverTools();
      for (const tool of tools) {
        const toolName = `${config.name}__${tool.name}`;
        this.tools.set(toolName, tool);
      }
      
      this.emit('server:connected', config.name);
      logger.info(`MCP server connected: ${config.name} (${tools.length} tools)`);
    } catch (error) {
      logger.error(`Failed to connect MCP server ${config.name}:`, error);
      this.emit('server:error', config.name, error);
      throw createUserError(`Failed to connect to MCP server: ${config.name}`, {
        cause: error,
        category: ErrorCategory.CONNECTION
      });
    }
  }

  async disconnectServer(serverName: string): Promise<void> {
    const server = this.servers.get(serverName);
    if (server) {
      await server.disconnect();
      this.servers.delete(serverName);
      
      // Remove tools from this server
      for (const [toolName, tool] of this.tools.entries()) {
        if (toolName.startsWith(`${serverName}__`)) {
          this.tools.delete(toolName);
        }
      }
      
      this.emit('server:disconnected', serverName);
      logger.info(`MCP server disconnected: ${serverName}`);
    }
  }

  getServerStatus(serverName: string): MCPServerStatus {
    const server = this.servers.get(serverName);
    return server ? server.status : MCPServerStatus.DISCONNECTED;
  }

  getAllServers(): Map<string, MCPServerProcess> {
    return new Map(this.servers);
  }

  getAllTools(): Map<string, MCPTool> {
    return new Map(this.tools);
  }

  async executeTool(toolName: string, parameters: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw createUserError(`MCP tool not found: ${toolName}`, {
        category: ErrorCategory.COMMAND_NOT_FOUND
      });
    }

    const [serverName] = toolName.split('__');
    const server = this.servers.get(serverName);
    if (!server || server.status !== MCPServerStatus.CONNECTED) {
      throw createUserError(`MCP server not available: ${serverName}`, {
        category: ErrorCategory.CONNECTION
      });
    }

    return await server.executeToolCall(tool.name, parameters);
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.servers.keys()).map(
      serverName => this.disconnectServer(serverName)
    );
    await Promise.all(disconnectPromises);
  }
}

class MCPServerProcess {
  private process: ChildProcess | null = null;
  private _status: MCPServerStatus = MCPServerStatus.DISCONNECTED;
  
  constructor(private config: MCPServerConfig) {}

  get status(): MCPServerStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    this._status = MCPServerStatus.CONNECTING;
    
    try {
      this.process = spawn(this.config.command, this.config.args || [], {
        env: { ...process.env, ...this.config.env },
        cwd: this.config.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Set up error handling
      this.process.on('error', (error) => {
        logger.error(`MCP server process error (${this.config.name}):`, error);
        this._status = MCPServerStatus.ERROR;
      });

      this.process.on('exit', (code, signal) => {
        logger.info(`MCP server exited (${this.config.name}): code=${code}, signal=${signal}`);
        this._status = MCPServerStatus.DISCONNECTED;
      });

      // Wait for process to be ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.timeout || 10000);

        this.process!.stdout!.once('data', () => {
          clearTimeout(timeout);
          this._status = MCPServerStatus.CONNECTED;
          resolve(void 0);
        });
      });
    } catch (error) {
      this._status = MCPServerStatus.ERROR;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this._status = MCPServerStatus.DISCONNECTED;
  }

  async discoverTools(): Promise<MCPTool[]> {
    if (!this.process || this._status !== MCPServerStatus.CONNECTED) {
      throw new Error('Server not connected');
    }

    // Send tools discovery request via JSON-RPC
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tool discovery timeout'));
      }, this.config.timeout || 10000);

      this.process!.stdout!.once('data', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          if (response.result && response.result.tools) {
            resolve(response.result.tools);
          } else {
            resolve([]);
          }
        } catch (error) {
          reject(error);
        }
      });

      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  async executeToolCall(toolName: string, parameters: any): Promise<any> {
    if (!this.process || this._status !== MCPServerStatus.CONNECTED) {
      throw new Error('Server not connected');
    }

    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tool execution timeout'));
      }, this.config.timeout || 30000);

      this.process!.stdout!.once('data', (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(error);
        }
      });

      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }
}

// Singleton MCP client
export const mcpClient = new MCPClient(); 