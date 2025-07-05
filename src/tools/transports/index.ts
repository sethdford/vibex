/**
 * MCP Transport Types
 * 
 * Provides different transport mechanisms for MCP (Model Context Protocol):
 * - HTTP (with streaming support)
 * - SSE (Server-Sent Events)
 * - WebSockets
 * - Standard I/O (stdio)
 * 
 * Based on the implementation from Gemini CLI but adapted for vibex.
 */

import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

/**
 * Common interface for all MCP transports
 */
export interface MCPTransport extends EventEmitter {
  /**
   * Connect to the MCP server
   * @param options Connection options
   * @returns Promise that resolves when connected
   */
  connect(options?: MCPConnectionOptions): Promise<void>;
  
  /**
   * Send a message to the MCP server
   * @param message The message to send
   * @returns Promise that resolves when the message is sent
   */
  send(message: string): Promise<void>;
  
  /**
   * Close the connection to the MCP server
   * @returns Promise that resolves when the connection is closed
   */
  close(): Promise<void>;
  
  /**
   * The status of the transport
   */
  readonly status: TransportStatus;
}

/**
 * Transport status enum
 */
export enum TransportStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

/**
 * Connection options for MCP transports
 */
export interface MCPConnectionOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Headers for HTTP/SSE connections
   */
  headers?: Record<string, string>;
  
  /**
   * Environment variables for stdio connections
   */
  env?: Record<string, string>;
}

/**
 * Base class for all MCP transports
 */
export abstract class BaseMCPTransport extends EventEmitter implements MCPTransport {
  protected _status: TransportStatus = TransportStatus.DISCONNECTED;
  protected _timeout = 30000; // Default timeout: 30 seconds
  
  /**
   * Get the current transport status
   */
  get status(): TransportStatus {
    return this._status;
  }
  
  /**
   * Connect to the MCP server
   */
  abstract connect(options?: MCPConnectionOptions): Promise<void>;
  
  /**
   * Send a message to the MCP server
   */
  abstract send(message: string): Promise<void>;
  
  /**
   * Close the connection to the MCP server
   */
  abstract close(): Promise<void>;
  
  /**
   * Set the connection status and emit events
   */
  protected setStatus(status: TransportStatus): void {
    const previousStatus = this._status;
    this._status = status;
    
    // Emit status change event
    this.emit('status', status, previousStatus);
    
    // Emit specific events based on status
    switch (status) {
      case TransportStatus.CONNECTED:
        this.emit('connected');
        break;
      case TransportStatus.DISCONNECTED:
        this.emit('disconnected');
        break;
      case TransportStatus.ERROR:
        this.emit('error', new Error('Transport error'));
        break;
    }
  }
  
  /**
   * Set a timeout for an operation
   */
  protected createTimeout(operation: string): NodeJS.Timeout {
    return setTimeout(() => {
      this.setStatus(TransportStatus.ERROR);
      this.emit('error', new Error(`${operation} timeout after ${this._timeout}ms`));
    }, this._timeout);
  }
}

/**
 * Export specific transport types
 */
export * from './http-transport.js';
export * from './sse-transport.js';
export * from './websocket-transport.js';
export * from './stdio-transport.js';