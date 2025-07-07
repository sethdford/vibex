/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseEvent } from '../../interfaces/types';
import { Tool, ToolCall, ToolConfirmationDetails, ToolConfirmationOutcome, ToolResult } from './tool-interfaces';

/**
 * Base class for all tool-related events
 */
export abstract class ToolEvent implements BaseEvent {
  type: string;
  timestamp: Date;
  payload?: unknown;

  constructor(type: string, payload?: unknown) {
    this.type = type;
    this.timestamp = new Date();
    this.payload = payload;
  }
}

/**
 * Event fired when a tool is registered
 */
export class ToolRegisteredEvent extends ToolEvent {
  constructor(public readonly tool: Tool, public readonly namespace?: string) {
    super('tool.registered', { tool: tool.name, namespace });
  }
}

/**
 * Event fired when a tool execution is requested
 */
export class ToolExecutionRequestedEvent extends ToolEvent {
  constructor(public readonly toolCall: ToolCall) {
    super('tool.execution.requested', {
      callId: toolCall.request.callId,
      tool: toolCall.request.name,
      namespace: toolCall.request.namespace
    });
  }
}

/**
 * Event fired when a tool execution starts
 */
export class ToolExecutionStartedEvent extends ToolEvent {
  constructor(public readonly toolCall: ToolCall) {
    super('tool.execution.started', {
      callId: toolCall.request.callId,
      tool: toolCall.request.name,
      namespace: toolCall.request.namespace
    });
  }
}

/**
 * Event fired when a tool execution completes
 */
export class ToolExecutionCompletedEvent extends ToolEvent {
  constructor(public readonly toolCall: ToolCall, public readonly result: ToolResult) {
    super('tool.execution.completed', {
      callId: toolCall.request.callId,
      tool: toolCall.request.name,
      namespace: toolCall.request.namespace,
      success: result.success,
      executionTime: result.executionTime
    });
  }
}

/**
 * Event fired when a tool execution fails
 */
export class ToolExecutionFailedEvent extends ToolEvent {
  constructor(public readonly toolCall: ToolCall, public readonly error: Error) {
    super('tool.execution.failed', {
      callId: toolCall.request.callId,
      tool: toolCall.request.name,
      namespace: toolCall.request.namespace,
      error: error.message
    });
  }
}

/**
 * Event fired when a tool execution requires confirmation
 */
export class ToolConfirmationRequestedEvent extends ToolEvent {
  constructor(public readonly toolCall: ToolCall, public readonly details: ToolConfirmationDetails) {
    super('tool.confirmation.requested', {
      callId: toolCall.request.callId,
      tool: toolCall.request.name,
      namespace: toolCall.request.namespace,
      confirmationType: details.type
    });
  }
}

/**
 * Event fired when a tool confirmation is received
 */
export class ToolConfirmationReceivedEvent extends ToolEvent {
  constructor(
    public readonly toolCall: ToolCall,
    public readonly outcome: ToolConfirmationOutcome
  ) {
    super('tool.confirmation.received', {
      callId: toolCall.request.callId,
      tool: toolCall.request.name,
      namespace: toolCall.request.namespace,
      outcome
    });
  }
}

/**
 * Event fired when a checkpoint is created
 */
export class CheckpointCreatedEvent extends ToolEvent {
  constructor(
    public readonly checkpointId: string,
    public readonly description: string,
    public readonly files: string[]
  ) {
    super('checkpoint.created', {
      checkpointId,
      description,
      fileCount: files.length
    });
  }
}

/**
 * Event fired when a checkpoint is restored
 */
export class CheckpointRestoredEvent extends ToolEvent {
  constructor(public readonly checkpointId: string, public readonly success: boolean) {
    super('checkpoint.restored', {
      checkpointId,
      success
    });
  }
}

/**
 * Event fired when a tool is discovered
 */
export class ToolDiscoveredEvent extends ToolEvent {
  constructor(public readonly tool: Tool, public readonly source: 'mcp' | 'project') {
    super('tool.discovered', {
      tool: tool.name,
      source
    });
  }
}

/**
 * Event fired when validation fails
 */
export class ValidationFailedEvent extends ToolEvent {
  constructor(
    public readonly toolName: string,
    public readonly errors: string[]
  ) {
    super('validation.failed', {
      tool: toolName,
      errorCount: errors.length
    });
  }
}

/**
 * Event data for MCP server connection
 */
export interface MCPServerConnectionEventPayload {
  serverName: string;
}

/**
 * Event fired when an MCP server connects
 */
export class MCPServerConnectedEvent extends ToolEvent {
  constructor(public readonly serverName: string) {
    super('mcp:server:connected', { serverName } as MCPServerConnectionEventPayload);
  }
}

/**
 * Event fired when an MCP server disconnects
 */
export class MCPServerDisconnectedEvent extends ToolEvent {
  constructor(public readonly serverName: string) {
    super('mcp:server:disconnected', { serverName } as MCPServerConnectionEventPayload);
  }
}

/**
 * Event data for MCP tool execution
 */
export interface MCPToolExecutedEventPayload {
  toolName: string;
  success: boolean;
}

/**
 * Event fired when an MCP tool is executed
 */
export class MCPToolExecutedEvent extends ToolEvent {
  constructor(public readonly toolName: string, public readonly success: boolean) {
    super('mcp:tool:executed', { toolName, success } as MCPToolExecutedEventPayload);
  }
}

/**
 * Event fired when all MCP servers disconnect
 */
export class MCPAllDisconnectedEvent extends ToolEvent {
  constructor() {
    super('mcp:all:disconnected');
  }
}

/**
 * Event bus interface for publishing and subscribing to events
 */
export interface EventBus {
  /**
   * Publish an event
   */
  publish(event: ToolEvent): void;

  /**
   * Subscribe to events of a certain type
   */
  subscribe<T extends ToolEvent>(
    eventType: string,
    handler: (event: T) => void
  ): () => void;
}

/**
 * Simple in-memory event bus implementation
 */
export class InMemoryEventBus implements EventBus {
  private subscribers: Record<string, Array<(event: ToolEvent) => void>> = {};

  /**
   * Publish an event to all subscribers
   */
  publish(event: ToolEvent): void {
    const handlers = this.subscribers[event.type] || [];
    handlers.forEach(handler => handler(event));
    
    // Also publish to wildcard subscribers
    const wildcardHandlers = this.subscribers['*'] || [];
    wildcardHandlers.forEach(handler => handler(event));
  }

  /**
   * Subscribe to events of a certain type
   * Returns an unsubscribe function
   */
  subscribe<T extends ToolEvent>(
    eventType: string,
    handler: (event: T) => void
  ): () => void {
    if (!this.subscribers[eventType]) {
      this.subscribers[eventType] = [];
    }
    
    this.subscribers[eventType].push(handler as (event: ToolEvent) => void);
    
    // Return unsubscribe function
    return () => {
      this.subscribers[eventType] = this.subscribers[eventType].filter(h => h !== handler);
    };
  }
}