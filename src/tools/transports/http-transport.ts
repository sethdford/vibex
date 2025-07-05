/**
 * HTTP Transport for MCP (Model Context Protocol)
 * 
 * Provides a streaming HTTP transport implementation for MCP.
 * Supports:
 * - Streaming HTTP requests and responses
 * - Custom headers
 * - Timeout handling
 * - Automatic reconnection
 */

import { BaseMCPTransport, TransportStatus, type MCPConnectionOptions } from './index.js';
import fetch from 'node-fetch';
import { logger } from '../../utils/logger.js';

/**
 * HTTP transport options
 */
export interface HTTPTransportOptions {
  /**
   * The base URL of the MCP server
   */
  baseUrl: string;
  
  /**
   * Headers to include in HTTP requests
   */
  headers?: Record<string, string>;
  
  /**
   * Fetch init options
   */
  fetchOptions?: RequestInit;
  
  /**
   * Auto-reconnect on connection error
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
}

/**
 * HTTP transport for MCP (Model Context Protocol)
 */
export class HTTPTransport extends BaseMCPTransport {
  private readonly url: URL;
  private headers: Record<string, string>;
  private readonly fetchOptions: RequestInit;
  private readonly autoReconnect: boolean;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBackoff: number;
  private reconnectAttempts = 0;
  private abortController: AbortController | null = null;
  
  /**
   * Create a new HTTP transport
   */
  constructor(options: HTTPTransportOptions) {
    super();
    
    this.url = new URL(options.baseUrl);
    this.headers = options.headers || {};
    this.fetchOptions = options.fetchOptions || {};
    this.autoReconnect = options.autoReconnect || false;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 3;
    this.reconnectBackoff = options.reconnectBackoff || 1000;
  }
  
  /**
   * Connect to the MCP server
   */
  async connect(options?: MCPConnectionOptions): Promise<void> {
    if (this._status === TransportStatus.CONNECTED) {
      return;
    }
    
    // Update headers and timeout from connection options
    if (options?.headers) {
      this.headers = { ...this.headers, ...options.headers };
    }
    
    if (options?.timeout) {
      this._timeout = options.timeout;
    }
    
    this.setStatus(TransportStatus.CONNECTING);
    
    try {
      // Check server health to verify connection
      await this.checkHealth();
      this.setStatus(TransportStatus.CONNECTED);
      this.reconnectAttempts = 0;
    } catch (error) {
      this.setStatus(TransportStatus.ERROR);
      logger.error('HTTP transport connection error:', error);
      
      // Try to reconnect if enabled
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const backoff = this.reconnectBackoff * Math.pow(2, this.reconnectAttempts - 1);
        
        logger.info(`Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
          this.connect(options).catch(e => {
            logger.error('Reconnection failed:', e);
          });
        }, backoff);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Check server health
   */
  private async checkHealth(): Promise<void> {
    const healthUrl = new URL('/health', this.url);
    const timeout = setTimeout(() => {
      if (this.abortController) {
        this.abortController.abort();
      }
    }, this._timeout);
    
    try {
      this.abortController = new AbortController();
      
      // Exclude body from fetchOptions for GET request
      const { body: _, ...fetchOptionsWithoutBody } = this.fetchOptions;
      const response = await fetch(healthUrl.toString(), {
        method: 'GET',
        headers: this.headers,
        signal: this.abortController.signal,
        ...fetchOptionsWithoutBody
      });
      
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as { status?: string };
      if (data.status !== 'ok') {
        throw new Error(`Server health check failed: ${JSON.stringify(data)}`);
      }
    } finally {
      clearTimeout(timeout);
      this.abortController = null;
    }
  }
  
  /**
   * Send a message to the MCP server
   */
  async send(message: string): Promise<void> {
    if (this._status !== TransportStatus.CONNECTED) {
      throw new Error('Cannot send message: transport is not connected');
    }
    
    const timeout = setTimeout(() => {
      if (this.abortController) {
        this.abortController.abort();
      }
    }, this._timeout);
    
    try {
      this.abortController = new AbortController();
      
      // Create request options with explicit body handling
      const { body: _, ...fetchOptionsWithoutBody } = this.fetchOptions;
      
      const response = await fetch(this.url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: message,
        signal: this.abortController.signal,
        ...fetchOptionsWithoutBody
      });
      
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }
      
      // Handle streaming response
      if (!response.body) {
        throw new Error('No response body available');
      }
      
      // Use the response body as a Web Streams ReadableStream
      const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader();
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Emit the received data
        const text = new TextDecoder().decode(value);
        this.emit('data', text);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Request timed out after ${this._timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      this.abortController = null;
    }
  }
  
  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    this.setStatus(TransportStatus.DISCONNECTED);
  }
}