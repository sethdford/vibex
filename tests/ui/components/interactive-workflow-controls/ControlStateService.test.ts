/**
 * ControlStateService Tests - Clean Architecture like Gemini CLI
 * 
 * Comprehensive test coverage for control state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ControlStateService } from '../../../../src/ui/components/interactive-workflow-controls/ControlStateService.js';
import { RetryConfiguration, DebugBreakpoint, WorkflowControlState } from '../../../../src/ui/components/interactive-workflow-controls/types.js';

describe('ControlStateService', () => {
  let service: ControlStateService;
  let defaultRetryConfig: RetryConfiguration;

  beforeEach(() => {
    defaultRetryConfig = {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      retryConditions: ['network_error', 'timeout', 'rate_limit', 'temporary_failure']
    };
    service = new ControlStateService(defaultRetryConfig);
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = service.getState();
      expect(state.controlState).toBe('idle');
      expect(state.selectedTaskIndex).toBe(0);
      expect(state.showConfirmation).toBeNull();
      expect(state.showRetryDialog).toBe(false);
      expect(state.customRetryConfig).toEqual({});
      expect(state.breakpoints).toEqual([]);
      expect(state.retryHistory).toBeInstanceOf(Map);
      expect(state.retryHistory.size).toBe(0);
    });
  });

  describe('state subscription', () => {
    it('should notify listeners when state changes', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);

      service.setControlState('running');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ controlState: 'running' })
      );

      unsubscribe();
      service.setControlState('paused');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      service.subscribe(listener1);
      service.subscribe(listener2);

      service.setControlState('running');
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('control state management', () => {
    it('should set control state', () => {
      service.setControlState('running');
      expect(service.getState().controlState).toBe('running');
    });

    it('should set selected task index', () => {
      service.setSelectedTaskIndex(5);
      expect(service.getState().selectedTaskIndex).toBe(5);
    });
  });

  describe('confirmation dialog management', () => {
    it('should show confirmation dialog', () => {
      service.showConfirmation('cancel');
      expect(service.getState().showConfirmation).toBe('cancel');
    });

    it('should hide confirmation dialog', () => {
      service.showConfirmation('abort');
      service.hideConfirmation();
      expect(service.getState().showConfirmation).toBeNull();
    });
  });

  describe('retry dialog management', () => {
    it('should show retry dialog', () => {
      service.showRetryDialog();
      expect(service.getState().showRetryDialog).toBe(true);
    });

    it('should hide retry dialog and clear config', () => {
      service.updateCustomRetryConfig({ maxAttempts: 5 });
      service.showRetryDialog();
      service.hideRetryDialog();
      
      const state = service.getState();
      expect(state.showRetryDialog).toBe(false);
      expect(state.customRetryConfig).toEqual({});
    });

    it('should update custom retry configuration', () => {
      const config = { maxAttempts: 5, initialDelayMs: 2000 };
      service.updateCustomRetryConfig(config);
      expect(service.getState().customRetryConfig).toEqual(config);
    });
  });

  describe('breakpoint management', () => {
    let testBreakpoint: DebugBreakpoint;

    beforeEach(() => {
      testBreakpoint = {
        id: 'bp-test-1',
        taskId: 'task-1',
        enabled: true,
        hitCount: 0,
        description: 'Test breakpoint'
      };
    });

    it('should add breakpoint', () => {
      service.addBreakpoint(testBreakpoint);
      expect(service.getState().breakpoints).toContain(testBreakpoint);
    });

    it('should remove breakpoint', () => {
      service.addBreakpoint(testBreakpoint);
      service.removeBreakpoint(testBreakpoint.id);
      expect(service.getState().breakpoints).not.toContain(testBreakpoint);
    });

    it('should toggle breakpoint enabled state', () => {
      service.addBreakpoint(testBreakpoint);
      service.toggleBreakpoint(testBreakpoint.id);
      
      const breakpoints = service.getState().breakpoints;
      const updatedBreakpoint = breakpoints.find(bp => bp.id === testBreakpoint.id);
      expect(updatedBreakpoint?.enabled).toBe(false);
    });

    it('should increment breakpoint hit count', () => {
      service.addBreakpoint(testBreakpoint);
      service.incrementBreakpointHitCount(testBreakpoint.id);
      
      const breakpoints = service.getState().breakpoints;
      const updatedBreakpoint = breakpoints.find(bp => bp.id === testBreakpoint.id);
      expect(updatedBreakpoint?.hitCount).toBe(1);
    });

    it('should set breakpoints', () => {
      const breakpoints = [testBreakpoint];
      service.setBreakpoints(breakpoints);
      expect(service.getState().breakpoints).toEqual(breakpoints);
    });
  });

  describe('retry history management', () => {
    it('should increment retry count for task', () => {
      service.incrementRetryCount('task-1');
      expect(service.getRetryCount('task-1')).toBe(1);
      
      service.incrementRetryCount('task-1');
      expect(service.getRetryCount('task-1')).toBe(2);
    });

    it('should return 0 for tasks with no retries', () => {
      expect(service.getRetryCount('nonexistent-task')).toBe(0);
    });

    it('should reset retry history', () => {
      service.incrementRetryCount('task-1');
      service.incrementRetryCount('task-2');
      service.resetRetryHistory();
      
      expect(service.getRetryCount('task-1')).toBe(0);
      expect(service.getRetryCount('task-2')).toBe(0);
    });

    it('should reset retry history for specific task', () => {
      service.incrementRetryCount('task-1');
      service.incrementRetryCount('task-2');
      service.resetTaskRetryHistory('task-1');
      
      expect(service.getRetryCount('task-1')).toBe(0);
      expect(service.getRetryCount('task-2')).toBe(1);
    });
  });

  describe('action validation', () => {
    const testCases: Array<{
      state: WorkflowControlState;
      action: string;
      expected: boolean;
    }> = [
      { state: 'idle', action: 'play', expected: true },
      { state: 'idle', action: 'pause', expected: false },
      { state: 'running', action: 'pause', expected: true },
      { state: 'running', action: 'play', expected: false },
      { state: 'paused', action: 'resume', expected: true },
      { state: 'paused', action: 'step', expected: true },
      { state: 'debugging', action: 'step', expected: true },
      { state: 'running', action: 'cancel', expected: true },
      { state: 'idle', action: 'cancel', expected: false },
      { state: 'completed', action: 'abort', expected: false },
      { state: 'running', action: 'reset', expected: false },
      { state: 'idle', action: 'reset', expected: true }
    ];

    testCases.forEach(({ state, action, expected }) => {
      it(`should ${expected ? 'allow' : 'disallow'} ${action} in ${state} state`, () => {
        service.setControlState(state);
        expect(service.canExecuteAction(action as any)).toBe(expected);
      });
    });
  });

  describe('valid actions', () => {
    it('should return correct valid actions for idle state', () => {
      service.setControlState('idle');
      const validActions = service.getValidActions();
      expect(validActions).toContain('play');
      expect(validActions).toContain('reset');
      expect(validActions).not.toContain('pause');
      expect(validActions).not.toContain('resume');
    });

    it('should return correct valid actions for running state', () => {
      service.setControlState('running');
      const validActions = service.getValidActions();
      expect(validActions).toContain('pause');
      expect(validActions).toContain('cancel');
      expect(validActions).toContain('abort');
      expect(validActions).not.toContain('play');
      expect(validActions).not.toContain('reset');
    });

    it('should return correct valid actions for paused state', () => {
      service.setControlState('paused');
      const validActions = service.getValidActions();
      expect(validActions).toContain('resume');
      expect(validActions).toContain('cancel');
      expect(validActions).toContain('step');
      expect(validActions).toContain('step_into');
      expect(validActions).not.toContain('play');
    });
  });

  describe('state icons and labels', () => {
    const stateTests: Array<{
      state: WorkflowControlState;
      expectedIcon: string;
      expectedLabel: string;
    }> = [
      { state: 'idle', expectedIcon: '⏹️', expectedLabel: 'Ready' },
      { state: 'running', expectedIcon: '▶️', expectedLabel: 'Running' },
      { state: 'paused', expectedIcon: '⏸️', expectedLabel: 'Paused' },
      { state: 'debugging', expectedIcon: '🐛', expectedLabel: 'Debugging' },
      { state: 'cancelling', expectedIcon: '⏹️', expectedLabel: 'Cancelling' },
      { state: 'completed', expectedIcon: '✅', expectedLabel: 'Completed' },
      { state: 'failed', expectedIcon: '❌', expectedLabel: 'Failed' }
    ];

    stateTests.forEach(({ state, expectedIcon, expectedLabel }) => {
      it(`should return correct icon and label for ${state} state`, () => {
        service.setControlState(state);
        expect(service.getControlStateIcon()).toBe(expectedIcon);
        expect(service.getControlStateLabel()).toBe(expectedLabel);
      });
    });
  });

  describe('reset functionality', () => {
    it('should reset all state to initial values', () => {
      // Set up some state
      service.setControlState('running');
      service.setSelectedTaskIndex(5);
      service.showConfirmation('cancel');
      service.showRetryDialog();
      service.incrementRetryCount('task-1');
      service.addBreakpoint({
        id: 'bp-1',
        taskId: 'task-1',
        enabled: true,
        hitCount: 0
      });

      // Reset
      service.reset();

      // Verify reset
      const state = service.getState();
      expect(state.controlState).toBe('idle');
      expect(state.selectedTaskIndex).toBe(0);
      expect(state.showConfirmation).toBeNull();
      expect(state.showRetryDialog).toBe(false);
      expect(state.customRetryConfig).toEqual({});
      expect(state.breakpoints).toEqual([]);
      expect(state.retryHistory.size).toBe(0);
    });
  });

  describe('state summary', () => {
    it('should provide accurate state summary', () => {
      service.setControlState('running');
      service.addBreakpoint({
        id: 'bp-1',
        taskId: 'task-1',
        enabled: true,
        hitCount: 0
      });
      service.addBreakpoint({
        id: 'bp-2',
        taskId: 'task-2',
        enabled: false,
        hitCount: 0
      });
      service.incrementRetryCount('task-1');
      service.showConfirmation('cancel');

      const summary = service.getStateSummary();
      expect(summary.controlState).toBe('running');
      expect(summary.breakpointCount).toBe(2);
      expect(summary.activeBreakpoints).toBe(1);
      expect(summary.taskRetryCount).toBe(1);
      expect(summary.hasConfirmation).toBe(true);
      expect(summary.hasRetryDialog).toBe(false);
    });
  });
}); 