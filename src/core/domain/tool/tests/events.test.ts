/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  InMemoryEventBus, 
  ToolRegisteredEvent, 
  ToolExecutionRequestedEvent
} from '../tool-events';
import { BaseTool } from '../tool-interfaces';

class TestTool extends BaseTool {
  async execute(params: unknown): Promise<any> {
    return {
      callId: 'test',
      success: true,
      data: params
    };
  }
}

describe('EventBus', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
  });

  it('should publish and subscribe to events', () => {
    const handler = vi.fn();
    
    // Subscribe to the event
    const unsubscribe = eventBus.subscribe('tool.registered', handler);
    
    // Create a test tool
    const tool = new TestTool('test_tool', 'Test tool', { type: 'object' });
    
    // Publish an event
    const event = new ToolRegisteredEvent(tool, 'default');
    eventBus.publish(event);
    
    // Handler should be called
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
    
    // Unsubscribe and publish again
    unsubscribe();
    eventBus.publish(event);
    
    // Handler should not be called again
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support wildcard subscriptions', () => {
    const wildcardHandler = vi.fn();
    
    // Subscribe to all events
    eventBus.subscribe('*', wildcardHandler);
    
    // Create a test tool
    const tool = new TestTool('test_tool', 'Test tool', { type: 'object' });
    
    // Publish multiple events
    const registeredEvent = new ToolRegisteredEvent(tool, 'default');
    const executionEvent = new ToolExecutionRequestedEvent({
      request: {
        callId: 'test',
        name: 'test_tool',
        params: {}
      },
      status: 'scheduled',
      tool,
      startTime: Date.now()
    });
    
    eventBus.publish(registeredEvent);
    eventBus.publish(executionEvent);
    
    // Handler should be called twice
    expect(wildcardHandler).toHaveBeenCalledTimes(2);
    expect(wildcardHandler).toHaveBeenCalledWith(registeredEvent);
    expect(wildcardHandler).toHaveBeenCalledWith(executionEvent);
  });

  it('should support multiple subscribers for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    // Subscribe to the event
    eventBus.subscribe('tool.registered', handler1);
    eventBus.subscribe('tool.registered', handler2);
    
    // Create a test tool
    const tool = new TestTool('test_tool', 'Test tool', { type: 'object' });
    
    // Publish an event
    const event = new ToolRegisteredEvent(tool, 'default');
    eventBus.publish(event);
    
    // Both handlers should be called
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith(event);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith(event);
  });

  it('should only notify subscribers for the event type', () => {
    const registeredHandler = vi.fn();
    const executionHandler = vi.fn();
    
    // Subscribe to specific events
    eventBus.subscribe('tool.registered', registeredHandler);
    eventBus.subscribe('tool.execution.requested', executionHandler);
    
    // Create a test tool
    const tool = new TestTool('test_tool', 'Test tool', { type: 'object' });
    
    // Publish an event
    const event = new ToolRegisteredEvent(tool, 'default');
    eventBus.publish(event);
    
    // Only the registered handler should be called
    expect(registeredHandler).toHaveBeenCalledTimes(1);
    expect(executionHandler).not.toHaveBeenCalled();
  });
});