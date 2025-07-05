/**
 * SSE Transport for MCP (Model Context Protocol)
 * 
 * Provides a Server-Sent Events (SSE) transport implementation for MCP.
 * Supports:
 * - Event-based message handling
 * - Automatic reconnection
 * - Custom headers
 * - Timeout handling
 */

import type { MCPConnectionOptions} from './index.js';
import { BaseMCPTransport, TransportStatus } from './index.js';
import fetch from 'node-fetch';
import { logger } from '../../utils/logger.js';

/**
 * SSE transport options
 */
export interface SSETransportOptions {
  /**
   * The URL of the SSE endpoint
   */
  url: string;
  
  /**
   * Headers to include in SSE requests
   */
  headers?: Record<string, string>;
  
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
  
  /**
   * Last event ID for reconnection
   */
  lastEventId?: string;
}

/**
 * SSE transport for MCP (Model Context Protocol)
 */
export class SSETransport extends BaseMCPTransport {
  private readonly url: URL;
  private headers: Record<string, string>;
  private readonly autoReconnect: boolean;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBackoff: number;
  private lastEventId: string | undefined;
  private reconnectAttempts = 0;
  private abortController: AbortController | null = null;
  private readonly eventSource: EventSource | null = null; // Not using actual EventSource to support Node.js
  private readonly sendUrl: URL;
  
  /**
   * Create a new SSE transport
   */
  constructor(options: SSETransportOptions) {
    super();
    
    this.url = new URL(options.url);
    this.sendUrl = new URL(options.url); // For POST requests
    this.headers = options.headers || {};
    this.autoReconnect = options.autoReconnect ?? true;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectBackoff = options.reconnectBackoff || 1000;
    this.lastEventId = options.lastEventId;
  }
  
  /**
   * Connect to the SSE endpoint
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
    
    // Create abort controller for timeout
    this.abortController = new AbortController();
    
    // Set up timeout
    const timeout = setTimeout(() => {
      if (this.abortController) {
        this.abortController.abort();
      }
    }, this._timeout);
    
    try {
      // Add last event ID to headers if available
      const headers = { ...this.headers };
      if (this.lastEventId) {
        headers['Last-Event-ID'] = this.lastEventId;
      }
      
      // Make request for SSE
      const response = await fetch(this.url.toString(), {
        headers: {
          'Accept': 'text/event-stream',
          ...headers
        },
        signal: this.abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      // Handle SSE stream
      const reader = (response.body as unknown as ReadableStream<Uint8Array>)?.getReader();
      let buffer = '';
      
      // Connected
      this.setStatus(TransportStatus.CONNECTED);
      this.reconnectAttempts = 0;
      clearTimeout(timeout);
      
      // Process the stream
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Stream ended, try to reconnect if enabled
              this.setStatus(TransportStatus.DISCONNECTED);
              if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.tryReconnect(options);
              }
              break;
            }
            
            // Convert bytes to string and append to buffer
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            
            // Process complete SSE events
            const events = this.processEvents(buffer);
            buffer = events.remainder;
            
            // Update last event ID if found
            if (events.lastEventId) {
              this.lastEventId = events.lastEventId;
            }
            
            // Emit all parsed events
            for (const event of events.parsed) {
              this.emit('event', event);
              
              if (event.event === 'message' && event.data) {
                this.emit('data', event.data);
              }
              
              if (event.event === 'error') {
                this.emit('error', new Error(event.data || 'SSE error event'));
              }
            }
          }
        } catch (error) {
          this.setStatus(TransportStatus.ERROR);
          this.emit('error', error);
          
          // Try to reconnect if enabled
          if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.tryReconnect(options);
          }
        }
      };
      
      processStream();
    } catch (error) {
      clearTimeout(timeout);
      this.setStatus(TransportStatus.ERROR);
      this.emit('error', error);
      
      // Try to reconnect if enabled
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.tryReconnect(options);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Process SSE events from buffer
   */
  private processEvents(buffer: string): { 
    parsed: Array<{event?: string; data?: string; id?: string}>;
    remainder: string;
    lastEventId?: string;
  } {
    const result = {
      parsed: [] as Array<{event?: string; data?: string; id?: string}>,
      remainder: '',
      lastEventId: undefined as string | undefined
    };
    
    // Split buffer by double newline (event delimiter)
    const events = buffer.split(/\r\n\r\n|\n\n/);
    
    // Last part is incomplete, save for next chunk
    result.remainder = events.pop() || '';
    
    for (const eventStr of events) {
      if (!eventStr.trim()) {continue;}
      
      const event: {event?: string; data?: string; id?: string} = {};
      const lines = eventStr.split(/\r\n|\n/);
      
      for (const line of lines) {
        if (!line.trim()) {continue;}
        
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) {continue;}
        
        const field = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        
        switch (field) {
          case 'event':
            event.event = value;
            break;
          case 'data':
            event.data = event.data ? `${event.data}\n${value}` : value;
            break;
          case 'id':
            event.id = value;
            result.lastEventId = value;
            break;
          // Ignore other fields
        }
      }
      
      result.parsed.push(event);
    }
    
    return result;
  }
  
  /**
   * Try to reconnect with backoff
   */
  private tryReconnect(options?: MCPConnectionOptions): void {
    this.reconnectAttempts++;
    const backoff = this.reconnectBackoff * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`SSE reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect(options).catch(e => {
        logger.error('SSE reconnection failed:', e);
      });
    }, backoff);
  }
  
  /**
   * Send a message to the MCP server
   * Note: SSE is one-way (server to client), so we use a separate HTTP request to send messages
   */
  async send(message: string): Promise<void> {
    if (this._status !== TransportStatus.CONNECTED) {
      throw new Error('Cannot send message: transport is not connected');
    }
    
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
    }, this._timeout);
    
    try {
      const response = await fetch(this.sendUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: message,
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        throw new Error(`Request timed out after ${this._timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
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
    
    // If we have an actual EventSource implementation
    if (this.eventSource && typeof this.eventSource.close === 'function') {
      this.eventSource.close();
    }
    
    this.setStatus(TransportStatus.DISCONNECTED);
  }
}