/**
 * WebSocket Transport for MCP (Model Context Protocol)
 * 
 * Provides a WebSocket transport implementation for MCP.
 * Supports:
 * - Bi-directional real-time communication
 * - Automatic reconnection
 * - Binary and text message formats
 * - Timeout handling
 */

import type { MCPConnectionOptions} from './index.js';
import { BaseMCPTransport, TransportStatus } from './index.js';
import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';

// Use the correct event types from the ws library
type WSCloseEvent = import('ws').CloseEvent;
type WSErrorEvent = import('ws').ErrorEvent; 
type WSMessageEvent = import('ws').MessageEvent;

/**
 * WebSocket transport options
 */
export interface WebSocketTransportOptions {
  /**
   * The WebSocket URL to connect to
   */
  url: string;
  
  /**
   * Additional headers for the WebSocket connection
   */
  headers?: Record<string, string>;
  
  /**
   * Auto-reconnect on connection error or close
   */
  autoReconnect?: boolean;
  
  /**
   * Maximum number of reconnection attempts
   */
  maxReconnectAttempts?: number;
  
  /**
   * Backoff time for reconnection attempts (in ms)
   */
  reconnectBackoff?: number;
  
  /**
   * Ping interval to keep connection alive (in ms)
   */
  pingInterval?: number;
  
  /**
   * Protocols to use for the WebSocket connection
   */
  protocols?: string | string[];
}

/**
 * WebSocket transport for MCP (Model Context Protocol)
 */
export class WebSocketTransport extends BaseMCPTransport {
  private readonly url: string;
  private headers: Record<string, string>;
  private readonly autoReconnect: boolean;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBackoff: number;
  private readonly pingInterval: number;
  private readonly protocols?: string | string[];
  
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private connectTimeoutId: NodeJS.Timeout | null = null;
  
  /**
   * Create a new WebSocket transport
   */
  constructor(options: WebSocketTransportOptions) {
    super();
    
    this.url = options.url;
    this.headers = options.headers || {};
    this.autoReconnect = options.autoReconnect ?? true;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectBackoff = options.reconnectBackoff || 1000;
    this.pingInterval = options.pingInterval || 30000;
    this.protocols = options.protocols;
  }
  
  /**
   * Connect to the WebSocket server
   */
  async connect(options?: MCPConnectionOptions): Promise<void> {
    if (this._status === TransportStatus.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Clean up any existing connection
    this.cleanup();
    
    // Update headers and timeout from connection options
    if (options?.headers) {
      this.headers = { ...this.headers, ...options.headers };
    }
    
    if (options?.timeout) {
      this._timeout = options.timeout;
    }
    
    this.setStatus(TransportStatus.CONNECTING);
    
    return new Promise<void>((resolve, reject) => {
      try {
        // Set connection timeout
        this.connectTimeoutId = setTimeout(() => {
          if (this._status !== TransportStatus.CONNECTED) {
            this.cleanup();
            reject(new Error(`Connection timeout after ${this._timeout}ms`));
          }
        }, this._timeout);
        
        // Create WebSocket connection
        this.ws = new WebSocket(this.url, this.protocols, {
          headers: this.headers
        });
        
        // Set up event handlers
        this.ws.onopen = () => {
          this.setStatus(TransportStatus.CONNECTED);
          this.reconnectAttempts = 0;
          
          // Clear connection timeout
          if (this.connectTimeoutId) {
            clearTimeout(this.connectTimeoutId);
            this.connectTimeoutId = null;
          }
          
          // Set up ping interval
          this.setupPing();
          
          resolve();
        };
        
        this.ws.onclose = (event: WSCloseEvent) => {
          const wasConnected = this._status === TransportStatus.CONNECTED;
          this.cleanup();
          
          // Only try to reconnect if we were previously connected or still connecting
          if (wasConnected || this._status === TransportStatus.CONNECTING) {
            if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.tryReconnect(options);
            } else {
              this.setStatus(TransportStatus.DISCONNECTED);
              
              // If we're in the process of connecting, reject the promise
              if (!wasConnected) {
                reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
              }
            }
          }
        };
        
        this.ws.onerror = (event: WSErrorEvent) => {
          logger.error('WebSocket error:', event);
          this.emit('error', new Error(`WebSocket error: ${event.type}`));
          
          // Connection errors will be handled by onclose
          if (this._status === TransportStatus.CONNECTING) {
            this.setStatus(TransportStatus.ERROR);
            reject(new Error('WebSocket connection error'));
          }
        };
        
        this.ws.onmessage = (event: WSMessageEvent) => {
          try {
            // Handle different data types from WebSocket
            let messageData: string;
            if (typeof event.data === 'string') {
              messageData = event.data;
            } else if (event.data instanceof Buffer) {
              messageData = event.data.toString('utf8');
            } else if (event.data instanceof ArrayBuffer) {
              messageData = new TextDecoder().decode(event.data);
            } else {
              messageData = String(event.data);
            }
            
            const data = JSON.parse(messageData);
            this.emit('message', data);
          } catch (error) {
            this.emit('error', new Error(`Failed to parse WebSocket message: ${error instanceof Error ? error.message : String(error)}`));
          }
        };
      } catch (error) {
        this.setStatus(TransportStatus.ERROR);
        reject(error);
      }
    });
  }
  
  /**
   * Set up ping interval to keep connection alive
   */
  private setupPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.pingInterval);
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if (this.ws) {
      // Remove event handlers
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      
      // Close the connection if it's still open
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        try {
          this.ws.close();
        } catch (error) {
          logger.error('Error closing WebSocket:', error);
        }
      }
      
      this.ws = null;
    }
  }
  
  /**
   * Try to reconnect with backoff
   */
  private tryReconnect(options?: MCPConnectionOptions): void {
    this.reconnectAttempts++;
    const backoff = this.reconnectBackoff * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`WebSocket reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect(options).catch(e => {
        logger.error('WebSocket reconnection failed:', e);
      });
    }, backoff);
  }
  
  /**
   * Send a message to the WebSocket server
   */
  async send(message: string | Buffer): Promise<void> {
    if (this._status !== TransportStatus.CONNECTED || !this.ws) {
      throw new Error('Cannot send message: transport is not connected');
    }
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Send timeout after ${this._timeout}ms`));
      }, this._timeout);
      
      this.ws!.send(message, (error?: Error) => {
        clearTimeout(timeout);
        
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * Close the WebSocket connection
   */
  async close(): Promise<void> {
    this.cleanup();
    this.setStatus(TransportStatus.DISCONNECTED);
  }
}