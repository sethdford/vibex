/**
 * Execution Tracking Service Tests
 * 
 * Comprehensive test suite for the execution tracking service.
 * Tests execution lifecycle, state management, and tracking operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createExecutionTrackingService } from './ExecutionTrackingService.js';
import type { ToolCall, ToolResult } from '../../../ai/content-stream.js';
import type { ExecutionTrackingOperations } from './types.js';

describe('ExecutionTrackingService', () => {
  let service: ExecutionTrackingOperations & { subscribe: (listener: (executions: any[]) => void) => () => void };
  let mockToolCall: ToolCall;
  let mockToolResult: ToolResult;

  beforeEach(() => {
    service = createExecutionTrackingService() as any;
    
    mockToolCall = {
      tool: 'test-tool',
      parameters: { key: 'value' },
    } as ToolCall;

    mockToolResult = {
      output: 'Test output',
      error: null,
    } as ToolResult;
  });

  describe('Service Initialization', () => {
    it('should initialize with empty executions', () => {
      expect(service.executions).toEqual([]);
    });

    it('should provide all required methods', () => {
      expect(typeof service.addExecution).toBe('function');
      expect(typeof service.updateExecution).toBe('function');
      expect(typeof service.startExecution).toBe('function');
      expect(typeof service.completeExecution).toBe('function');
      expect(typeof service.updateStreamingOutput).toBe('function');
      expect(typeof service.clearExecutions).toBe('function');
    });
  });

  describe('Adding Executions', () => {
    it('should add new execution with generated ID', () => {
      const id = service.addExecution(mockToolCall);
      
      expect(id).toMatch(/^exec-\d+-[a-z0-9]+$/);
      expect(service.executions).toHaveLength(1);
      
      const execution = service.executions[0];
      expect(execution.id).toBe(id);
      expect(execution.toolCall).toBe(mockToolCall);
      expect(execution.state).toBe('pending');
      expect(execution.startTime).toBeGreaterThan(0);
    });

    it('should add multiple executions in correct order', () => {
      const id1 = service.addExecution(mockToolCall);
      const id2 = service.addExecution({ ...mockToolCall, tool: 'tool2' });
      
      expect(service.executions).toHaveLength(2);
      expect(service.executions[0].id).toBe(id2); // Newest first
      expect(service.executions[1].id).toBe(id1);
    });

    it('should generate unique IDs for concurrent executions', () => {
      const ids = Array.from({ length: 10 }, () => service.addExecution(mockToolCall));
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Updating Executions', () => {
    it('should update execution with partial data', () => {
      const id = service.addExecution(mockToolCall);
      
      service.updateExecution(id, {
        state: 'executing',
        streamingOutput: 'Test output',
      });
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.state).toBe('executing');
      expect(execution?.streamingOutput).toBe('Test output');
    });

    it('should preserve existing data when updating', () => {
      const id = service.addExecution(mockToolCall);
      const originalStartTime = service.executions[0].startTime;
      
      service.updateExecution(id, { state: 'executing' });
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.startTime).toBe(originalStartTime);
      expect(execution?.toolCall).toBe(mockToolCall);
    });

    it('should not affect other executions when updating', () => {
      const id1 = service.addExecution(mockToolCall);
      const id2 = service.addExecution({ ...mockToolCall, tool: 'tool2' });
      
      service.updateExecution(id1, { state: 'executing' });
      
      const exec1 = service.executions.find(e => e.id === id1);
      const exec2 = service.executions.find(e => e.id === id2);
      
      expect(exec1?.state).toBe('executing');
      expect(exec2?.state).toBe('pending');
    });
  });

  describe('Starting Executions', () => {
    it('should start execution and update state', () => {
      const id = service.addExecution(mockToolCall);
      const beforeStart = Date.now();
      
      service.startExecution(id);
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.state).toBe('executing');
      expect(execution?.startTime).toBeGreaterThanOrEqual(beforeStart);
    });

    it('should handle starting non-existent execution gracefully', () => {
      expect(() => service.startExecution('non-existent')).not.toThrow();
    });
  });

  describe('Completing Executions', () => {
    it('should complete execution with success result', () => {
      const id = service.addExecution(mockToolCall);
      service.startExecution(id);
      const beforeComplete = Date.now();
      
      service.completeExecution(id, mockToolResult);
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.state).toBe('completed');
      expect(execution?.result).toBe(mockToolResult);
      expect(execution?.endTime).toBeGreaterThanOrEqual(beforeComplete);
      expect(execution?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should complete execution with error result', () => {
      const id = service.addExecution(mockToolCall);
      const errorResult = { ...mockToolResult, error: 'Test error' };
      
      service.completeExecution(id, errorResult);
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.state).toBe('failed');
      expect(execution?.result).toBe(errorResult);
    });

    it('should calculate duration correctly', () => {
      const id = service.addExecution(mockToolCall);
      const startTime = Date.now() - 1000; // 1 second ago
      
      service.updateExecution(id, { startTime });
      service.completeExecution(id, mockToolResult);
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.duration).toBeGreaterThan(900); // Allow some variance
      expect(execution?.duration).toBeLessThan(1100);
    });
  });

  describe('Streaming Output Updates', () => {
    it('should update streaming output', () => {
      const id = service.addExecution(mockToolCall);
      
      service.updateStreamingOutput(id, 'Line 1\nLine 2');
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.streamingOutput).toBe('Line 1\nLine 2');
    });

    it('should handle multiple streaming updates', () => {
      const id = service.addExecution(mockToolCall);
      
      service.updateStreamingOutput(id, 'First update');
      service.updateStreamingOutput(id, 'Second update');
      
      const execution = service.executions.find(e => e.id === id);
      expect(execution?.streamingOutput).toBe('Second update');
    });
  });

  describe('Clearing Executions', () => {
    it('should clear all executions', () => {
      service.addExecution(mockToolCall);
      service.addExecution(mockToolCall);
      service.addExecution(mockToolCall);
      
      expect(service.executions).toHaveLength(3);
      
      service.clearExecutions();
      
      expect(service.executions).toHaveLength(0);
    });
  });

  describe('Subscription System', () => {
    it('should notify subscribers on execution changes', () => {
      let notificationCount = 0;
      let lastExecutions: any[] = [];
      
      const unsubscribe = service.subscribe((executions) => {
        notificationCount++;
        lastExecutions = executions;
      });
      
      service.addExecution(mockToolCall);
      
      expect(notificationCount).toBe(1);
      expect(lastExecutions).toHaveLength(1);
      
      unsubscribe();
    });

    it('should handle multiple subscribers', () => {
      let subscriber1Called = false;
      let subscriber2Called = false;
      
      const unsub1 = service.subscribe(() => { subscriber1Called = true; });
      const unsub2 = service.subscribe(() => { subscriber2Called = true; });
      
      service.addExecution(mockToolCall);
      
      expect(subscriber1Called).toBe(true);
      expect(subscriber2Called).toBe(true);
      
      unsub1();
      unsub2();
    });

    it('should allow unsubscribing', () => {
      let notificationCount = 0;
      
      const unsubscribe = service.subscribe(() => {
        notificationCount++;
      });
      
      service.addExecution(mockToolCall);
      expect(notificationCount).toBe(1);
      
      unsubscribe();
      service.addExecution(mockToolCall);
      expect(notificationCount).toBe(1); // Should not increase
    });
  });

  describe('Execution Lifecycle', () => {
    it('should handle complete execution lifecycle', () => {
      // Add execution
      const id = service.addExecution(mockToolCall);
      let execution = service.executions.find(e => e.id === id);
      expect(execution?.state).toBe('pending');
      
      // Start execution
      service.startExecution(id);
      execution = service.executions.find(e => e.id === id);
      expect(execution?.state).toBe('executing');
      
      // Update streaming output
      service.updateStreamingOutput(id, 'Processing...');
      execution = service.executions.find(e => e.id === id);
      expect(execution?.streamingOutput).toBe('Processing...');
      
      // Complete execution
      service.completeExecution(id, mockToolResult);
      execution = service.executions.find(e => e.id === id);
      expect(execution?.state).toBe('completed');
      expect(execution?.result).toBe(mockToolResult);
      expect(execution?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle updating non-existent execution', () => {
      expect(() => {
        service.updateExecution('non-existent', { state: 'executing' });
      }).not.toThrow();
      
      expect(service.executions).toHaveLength(0);
    });

    it('should handle completing non-existent execution', () => {
      expect(() => {
        service.completeExecution('non-existent', mockToolResult);
      }).not.toThrow();
      
      expect(service.executions).toHaveLength(0);
    });

    it('should handle streaming update for non-existent execution', () => {
      expect(() => {
        service.updateStreamingOutput('non-existent', 'output');
      }).not.toThrow();
      
      expect(service.executions).toHaveLength(0);
    });

    it('should handle empty tool call parameters', () => {
      const emptyToolCall = { tool: 'empty-tool', parameters: {} } as ToolCall;
      
      const id = service.addExecution(emptyToolCall);
      const execution = service.executions.find(e => e.id === id);
      
      expect(execution?.toolCall).toBe(emptyToolCall);
    });
  });
}); 