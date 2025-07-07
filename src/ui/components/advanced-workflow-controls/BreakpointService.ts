/**
 * Breakpoint Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for managing workflow breakpoints
 */

import { logger } from '../../../utils/logger.js';
import type { WorkflowBreakpoint, ExecutionStep } from './types.js';

/**
 * Service for managing workflow breakpoints
 */
export class BreakpointService {
  /**
   * Create a new breakpoint
   */
  static createBreakpoint(
    taskId: string, 
    condition?: string, 
    description?: string
  ): WorkflowBreakpoint {
    return {
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      condition,
      enabled: true,
      hitCount: 0,
      createdAt: new Date(),
      description,
    };
  }

  /**
   * Add breakpoint to collection
   */
  static addBreakpoint(
    breakpoints: Map<string, WorkflowBreakpoint>,
    taskId: string,
    condition?: string,
    description?: string
  ): Map<string, WorkflowBreakpoint> {
    const breakpoint = this.createBreakpoint(taskId, condition, description);
    const newBreakpoints = new Map(breakpoints);
    newBreakpoints.set(breakpoint.id, breakpoint);
    
    logger.info('Breakpoint added', { 
      breakpointId: breakpoint.id,
      taskId, 
      condition, 
      description 
    });
    
    return newBreakpoints;
  }

  /**
   * Remove breakpoint from collection
   */
  static removeBreakpoint(
    breakpoints: Map<string, WorkflowBreakpoint>,
    breakpointId: string
  ): Map<string, WorkflowBreakpoint> {
    const newBreakpoints = new Map(breakpoints);
    newBreakpoints.delete(breakpointId);
    
    logger.info('Breakpoint removed', { breakpointId });
    
    return newBreakpoints;
  }

  /**
   * Toggle breakpoint enabled state
   */
  static toggleBreakpoint(
    breakpoints: Map<string, WorkflowBreakpoint>,
    breakpointId: string
  ): Map<string, WorkflowBreakpoint> {
    const breakpoint = breakpoints.get(breakpointId);
    if (!breakpoint) return breakpoints;
    
    const updated = { ...breakpoint, enabled: !breakpoint.enabled };
    const newBreakpoints = new Map(breakpoints);
    newBreakpoints.set(breakpointId, updated);
    
    logger.info('Breakpoint toggled', { 
      breakpointId, 
      enabled: updated.enabled 
    });
    
    return newBreakpoints;
  }

  /**
   * Check if task should hit breakpoint
   */
  static shouldHitBreakpoint(
    breakpoints: Map<string, WorkflowBreakpoint>,
    taskId: string,
    context?: Record<string, any>
  ): WorkflowBreakpoint | null {
    const taskBreakpoints = Array.from(breakpoints.values()).filter(bp => 
      bp.taskId === taskId && bp.enabled
    );

    for (const breakpoint of taskBreakpoints) {
      // If no condition, always hit
      if (!breakpoint.condition) {
        return breakpoint;
      }

      // Evaluate condition (simplified - in real implementation would use safe eval)
      try {
        const shouldHit = this.evaluateCondition(breakpoint.condition, context);
        if (shouldHit) {
          return breakpoint;
        }
      } catch (error) {
        logger.warn('Breakpoint condition evaluation failed', {
          breakpointId: breakpoint.id,
          condition: breakpoint.condition,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return null;
  }

  /**
   * Increment breakpoint hit count
   */
  static incrementHitCount(
    breakpoints: Map<string, WorkflowBreakpoint>,
    breakpointId: string
  ): Map<string, WorkflowBreakpoint> {
    const breakpoint = breakpoints.get(breakpointId);
    if (!breakpoint) return breakpoints;
    
    const updated = { ...breakpoint, hitCount: breakpoint.hitCount + 1 };
    const newBreakpoints = new Map(breakpoints);
    newBreakpoints.set(breakpointId, updated);
    
    return newBreakpoints;
  }

  /**
   * Get breakpoints for specific task
   */
  static getTaskBreakpoints(
    breakpoints: Map<string, WorkflowBreakpoint>,
    taskId: string
  ): WorkflowBreakpoint[] {
    return Array.from(breakpoints.values()).filter(bp => bp.taskId === taskId);
  }

  /**
   * Get enabled breakpoints only
   */
  static getEnabledBreakpoints(
    breakpoints: Map<string, WorkflowBreakpoint>
  ): WorkflowBreakpoint[] {
    return Array.from(breakpoints.values()).filter(bp => bp.enabled);
  }

  /**
   * Clear all breakpoints
   */
  static clearAllBreakpoints(): Map<string, WorkflowBreakpoint> {
    logger.info('All breakpoints cleared');
    return new Map();
  }

  /**
   * Simple condition evaluation (placeholder for more sophisticated logic)
   */
  private static evaluateCondition(
    condition: string, 
    context?: Record<string, any>
  ): boolean {
    // Simplified condition evaluation
    // In a real implementation, would use a safe expression evaluator
    if (!context) return false;
    
    // Basic variable substitution and evaluation
    try {
      // Very basic conditions like "variable === 'value'" or "count > 5"
      const evalContext = { ...context };
      
      // Replace variable names with their values
      let evaluableCondition = condition;
      for (const [key, value] of Object.entries(evalContext)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        const replacement = typeof value === 'string' ? `"${value}"` : String(value);
        evaluableCondition = evaluableCondition.replace(regex, replacement);
      }
      
      // Very basic evaluation (unsafe - would need proper parser in production)
      return Boolean(eval(evaluableCondition));
    } catch {
      return false;
    }
  }
} 