/**
 * Real-Time State Service Tests
 * 
 * Comprehensive test coverage for RealTimeStateService functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealTimeStateService } from './RealTimeStateService.js';
import type { RealTimeOrchestratorConfig, RealTimeUpdateEvent } from './types.js';

describe('RealTimeStateService', () => {
  let service: RealTimeStateService;
  let config: RealTimeOrchestratorConfig;

  beforeEach(() => {
    config = {
      updateInterval: 100,
      maxLatency: 100,
      enableMetrics: true,
      metricsInterval: 250,
      maxRetries: 3,
      retryDelay: 500,
      persistState: true,
      storageKey: 'test-state',
    };
    
    service = new RealTimeStateService(config);
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('initialization', () => {
    it('should create service with initial state', () => {
      const state = service.getState();
      
      expect(state.activeWorkflow).toBeNull();
      expect(state.taskStates.size).toBe(0);
      expect(state.taskProgress.size).toBe(0);
      expect(state.taskErrors.size).toBe(0);
      expect(state.isExecuting).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isCancelled).toBe(false);
      expect(state.connectionStatus).toBe('disconnected');
    });

    it('should start with empty performance metrics', () => {
      const state = service.getState();
      
      expect(state.performanceMetrics.updateLatency).toBe(0);
      expect(state.performanceMetrics.connectionStatus).toBe('disconnected');
      expect(state.performanceMetrics.memoryUsage).toBe(0);
      expect(state.performanceMetrics.throughput).toBe(0);
      expect(state.performanceMetrics.updateCount).toBe(0);
      expect(state.performanceMetrics.errorCount).toBe(0);
    });
  });

  describe('connection status updates', () => {
    it('should update connection status', () => {
      service.updateConnectionStatus('connected', 50);
      
      const state = service.getState();
      expect(state.connectionStatus).toBe('connected');
      expect(state.updateLatency).toBe(50);
      expect(state.lastUpdate).toBeGreaterThan(0);
    });

    it('should update connection status without latency', () => {
      service.updateConnectionStatus('reconnecting');
      
      const state = service.getState();
      expect(state.connectionStatus).toBe('reconnecting');
    });
  });

  describe('workflow updates', () => {
    it('should update active workflow', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test',
        tasks: [],
        context: {} as any,
        status: 'idle' as const,
        progress: 0,
      };
      
      service.updateActiveWorkflow(workflow);
      
      const state = service.getState();
      expect(state.activeWorkflow).toEqual(workflow);
    });

    it('should clear active workflow', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test',
        tasks: [],
        context: {} as any,
        status: 'idle' as const,
        progress: 0,
      };
      
      service.updateActiveWorkflow(workflow);
      service.updateActiveWorkflow(null);
      
      const state = service.getState();
      expect(state.activeWorkflow).toBeNull();
    });
  });

  describe('task state updates', () => {
    it('should update task state', () => {
      const taskId = 'task-1';
      const updates = { status: 'in_progress' as const, progress: 50 };
      
      service.updateTaskState(taskId, updates);
      
      const state = service.getState();
      expect(state.taskStates.get(taskId)).toEqual(updates);
    });

    it('should update task progress', () => {
      const taskId = 'task-1';
      const progress = 75;
      
      service.updateTaskProgress(taskId, progress);
      
      const state = service.getState();
      expect(state.taskProgress.get(taskId)).toBe(progress);
    });

    it('should update task error', () => {
      const taskId = 'task-1';
      const error = 'Test error';
      
      service.updateTaskError(taskId, error);
      
      const state = service.getState();
      expect(state.taskErrors.get(taskId)).toBe(error);
    });
  });

  describe('execution state updates', () => {
    it('should update execution state', () => {
      service.updateExecutionState(true, false, false);
      
      const state = service.getState();
      expect(state.isExecuting).toBe(true);
      expect(state.isPaused).toBe(false);
      expect(state.isCancelled).toBe(false);
    });

    it('should update paused state', () => {
      service.updateExecutionState(false, true, false);
      
      const state = service.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.isPaused).toBe(true);
      expect(state.isCancelled).toBe(false);
    });

    it('should update cancelled state', () => {
      service.updateExecutionState(false, false, true);
      
      const state = service.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isCancelled).toBe(true);
    });
  });

  describe('metrics updates', () => {
    it('should update performance metrics', () => {
      const metrics = {
        updateLatency: 25,
        memoryUsage: 100,
        throughput: 5,
      };
      
      service.updateMetrics(metrics);
      
      const state = service.getState();
      expect(state.performanceMetrics.updateLatency).toBe(25);
      expect(state.performanceMetrics.memoryUsage).toBe(100);
      expect(state.performanceMetrics.throughput).toBe(5);
    });

    it('should partially update metrics', () => {
      service.updateMetrics({ updateLatency: 30 });
      service.updateMetrics({ memoryUsage: 150 });
      
      const state = service.getState();
      expect(state.performanceMetrics.updateLatency).toBe(30);
      expect(state.performanceMetrics.memoryUsage).toBe(150);
      expect(state.performanceMetrics.throughput).toBe(0); // unchanged
    });
  });

  describe('update events processing', () => {
    it('should process task progress event', () => {
      const event: RealTimeUpdateEvent = {
        type: 'task_progress',
        timestamp: Date.now(),
        data: { taskId: 'task-1', progress: 60 },
        source: 'engine',
      };
      
      service.processUpdateEvent(event);
      
      const state = service.getState();
      expect(state.taskProgress.get('task-1')).toBe(60);
    });

    it('should process task status event', () => {
      const event: RealTimeUpdateEvent = {
        type: 'task_status',
        timestamp: Date.now(),
        data: { taskId: 'task-1', updates: { status: 'completed' } },
        source: 'engine',
      };
      
      service.processUpdateEvent(event);
      
      const state = service.getState();
      expect(state.taskStates.get('task-1')).toEqual({ status: 'completed' });
    });

    it('should process workflow status event', () => {
      const workflow = {
        id: 'test-workflow',
        name: 'Test',
        description: 'Test',
        tasks: [],
        context: {} as any,
        status: 'running' as const,
        progress: 0,
      };
      
      const event: RealTimeUpdateEvent = {
        type: 'workflow_status',
        timestamp: Date.now(),
        data: { 
          workflow,
          execution: { isExecuting: true, isPaused: false, isCancelled: false }
        },
        source: 'engine',
      };
      
      service.processUpdateEvent(event);
      
      const state = service.getState();
      expect(state.activeWorkflow).toEqual(workflow);
      expect(state.isExecuting).toBe(true);
    });

    it('should process error event', () => {
      const event: RealTimeUpdateEvent = {
        type: 'error',
        timestamp: Date.now(),
        data: { taskId: 'task-1', error: 'Test error' },
        source: 'engine',
      };
      
      service.processUpdateEvent(event);
      
      const state = service.getState();
      expect(state.taskErrors.get('task-1')).toBe('Test error');
    });

    it('should handle unknown event type', () => {
      const event: RealTimeUpdateEvent = {
        type: 'unknown' as any,
        timestamp: Date.now(),
        data: {},
        source: 'engine',
      };
      
      // Should not throw
      expect(() => service.processUpdateEvent(event)).not.toThrow();
    });
  });

  describe('state subscriptions', () => {
    it('should subscribe to state updates', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe(callback);
      
      service.updateConnectionStatus('connected');
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionStatus: 'connected'
        })
      );
      
      unsubscribe();
    });

    it('should unsubscribe from state updates', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe(callback);
      
      unsubscribe();
      service.updateConnectionStatus('connected');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      service.subscribe(callback1);
      service.subscribe(callback2);
      
      service.updateConnectionStatus('connected');
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('merged workflow', () => {
    it('should return null when no workflow available', () => {
      const merged = service.getMergedWorkflow();
      expect(merged).toBeNull();
    });

    it('should merge real-time data with workflow', () => {
      const baseWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test',
        tasks: [
          {
            id: 'task-1',
            name: 'Task 1',
            description: 'Test task',
            category: 'analysis' as const,
            status: 'pending' as const,
            priority: 'normal' as const,
            dependencies: [],
            progress: 0,
            toolCalls: [],
            cancellable: true,
            retryable: true,
          }
        ],
        context: {} as any,
        status: 'idle' as const,
        progress: 0,
      };
      
      service.updateActiveWorkflow(baseWorkflow);
      service.updateTaskProgress('task-1', 50);
      service.updateTaskState('task-1', { status: 'in_progress' });
      
      const merged = service.getMergedWorkflow();
      
      expect(merged).toBeDefined();
      expect(merged!.tasks[0].progress).toBe(50);
      expect(merged!.tasks[0].status).toBe('in_progress');
    });

    it('should calculate workflow progress from completed tasks', () => {
      const baseWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test',
        tasks: [
          {
            id: 'task-1',
            name: 'Task 1',
            description: 'Test task 1',
            category: 'analysis' as const,
            status: 'completed' as const,
            priority: 'normal' as const,
            dependencies: [],
            progress: 100,
            toolCalls: [],
            cancellable: true,
            retryable: true,
          },
          {
            id: 'task-2',
            name: 'Task 2',
            description: 'Test task 2',
            category: 'analysis' as const,
            status: 'pending' as const,
            priority: 'normal' as const,
            dependencies: [],
            progress: 0,
            toolCalls: [],
            cancellable: true,
            retryable: true,
          }
        ],
        context: {} as any,
        status: 'idle' as const,
        progress: 0,
      };
      
      service.updateActiveWorkflow(baseWorkflow);
      service.updateTaskState('task-1', { status: 'completed' });
      
      const merged = service.getMergedWorkflow();
      
      expect(merged!.progress).toBe(50); // 1 of 2 tasks completed
    });

    it('should update workflow status based on execution state', () => {
      const baseWorkflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test',
        tasks: [],
        context: {} as any,
        status: 'idle' as const,
        progress: 0,
      };
      
      service.updateActiveWorkflow(baseWorkflow);
      service.updateExecutionState(true, false, false);
      
      const merged = service.getMergedWorkflow();
      expect(merged!.status).toBe('running');
    });
  });

  describe('state management', () => {
    it('should force refresh state', () => {
      const callback = vi.fn();
      service.subscribe(callback);
      
      service.forceRefresh();
      
      expect(callback).toHaveBeenCalled();
    });

    it('should reset state', () => {
      service.updateConnectionStatus('connected');
      service.updateExecutionState(true, false, false);
      
      service.reset();
      
      const state = service.getState();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.isExecuting).toBe(false);
      expect(state.taskStates.size).toBe(0);
    });

    it('should cleanup resources', () => {
      const callback = vi.fn();
      service.subscribe(callback);
      
      service.cleanup();
      service.updateConnectionStatus('connected');
      
      // Should not call subscriber after cleanup
      expect(callback).not.toHaveBeenCalled();
    });
  });
}); 