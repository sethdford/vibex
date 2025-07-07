/**
 * Tests for BreakpointService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BreakpointService } from '../BreakpointService.js';
import type { WorkflowBreakpoint } from '../types.js';

describe('BreakpointService', () => {
  let breakpoints: Map<string, WorkflowBreakpoint>;

  beforeEach(() => {
    breakpoints = new Map();
    vi.clearAllMocks();
  });

  it('should create a new breakpoint', () => {
    const breakpoint = BreakpointService.createBreakpoint(
      'task-1',
      'variable === "test"',
      'Test breakpoint'
    );

    expect(breakpoint.taskId).toBe('task-1');
    expect(breakpoint.condition).toBe('variable === "test"');
    expect(breakpoint.description).toBe('Test breakpoint');
    expect(breakpoint.enabled).toBe(true);
    expect(breakpoint.hitCount).toBe(0);
    expect(breakpoint.id).toMatch(/^bp-/);
  });

  it('should add breakpoint to collection', () => {
    const newBreakpoints = BreakpointService.addBreakpoint(
      breakpoints,
      'task-1',
      undefined,
      'Test breakpoint'
    );

    expect(newBreakpoints.size).toBe(1);
    const addedBreakpoint = Array.from(newBreakpoints.values())[0];
    expect(addedBreakpoint.taskId).toBe('task-1');
    expect(addedBreakpoint.description).toBe('Test breakpoint');
  });

  it('should remove breakpoint from collection', () => {
    const initialBreakpoints = BreakpointService.addBreakpoint(
      breakpoints,
      'task-1'
    );
    const breakpointId = Array.from(initialBreakpoints.keys())[0];

    const updatedBreakpoints = BreakpointService.removeBreakpoint(
      initialBreakpoints,
      breakpointId
    );

    expect(updatedBreakpoints.size).toBe(0);
  });

  it('should toggle breakpoint enabled state', () => {
    const initialBreakpoints = BreakpointService.addBreakpoint(
      breakpoints,
      'task-1'
    );
    const breakpointId = Array.from(initialBreakpoints.keys())[0];

    const toggledBreakpoints = BreakpointService.toggleBreakpoint(
      initialBreakpoints,
      breakpointId
    );

    const toggledBreakpoint = toggledBreakpoints.get(breakpointId);
    expect(toggledBreakpoint?.enabled).toBe(false);
  });

  it('should increment hit count', () => {
    const initialBreakpoints = BreakpointService.addBreakpoint(
      breakpoints,
      'task-1'
    );
    const breakpointId = Array.from(initialBreakpoints.keys())[0];

    const updatedBreakpoints = BreakpointService.incrementHitCount(
      initialBreakpoints,
      breakpointId
    );

    const updatedBreakpoint = updatedBreakpoints.get(breakpointId);
    expect(updatedBreakpoint?.hitCount).toBe(1);
  });

  it('should get enabled breakpoints only', () => {
    let currentBreakpoints = BreakpointService.addBreakpoint(breakpoints, 'task-1');
    currentBreakpoints = BreakpointService.addBreakpoint(currentBreakpoints, 'task-2');
    
    const breakpointIds = Array.from(currentBreakpoints.keys());
    currentBreakpoints = BreakpointService.toggleBreakpoint(currentBreakpoints, breakpointIds[0]);

    const enabledBreakpoints = BreakpointService.getEnabledBreakpoints(currentBreakpoints);
    expect(enabledBreakpoints.length).toBe(1);
    expect(enabledBreakpoints[0].taskId).toBe('task-2');
  });

  it('should clear all breakpoints', () => {
    const clearedBreakpoints = BreakpointService.clearAllBreakpoints();
    expect(clearedBreakpoints.size).toBe(0);
  });
}); 