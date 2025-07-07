/**
 * Stepping Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for step-through debugging functionality
 */

import { logger } from '../../../utils/logger.js';
import type { ExecutionStep, WorkflowBreakpoint, ConditionalRule } from './types.js';
import type { WorkflowDefinition, TaskDefinition, TaskExecutionContext } from '../task-orchestrator/index.js';

/**
 * Service for managing step-through debugging
 */
export class SteppingService {
  /**
   * Create execution step record
   */
  static createExecutionStep(
    stepNumber: number,
    taskId: string,
    action: ExecutionStep['action'],
    context: TaskExecutionContext,
    startTime: number
  ): ExecutionStep {
    const endTime = Date.now();
    
    return {
      stepNumber,
      taskId,
      action,
      timestamp: endTime,
      state: { ...context.sharedState },
      variables: { ...context.environment },
      performance: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuUsage: 0, // Would need actual CPU monitoring
        duration: endTime - startTime,
      },
    };
  }

  /**
   * Execute next step in workflow
   */
  static async executeNextStep(
    workflow: WorkflowDefinition,
    currentStepIndex: number,
    context: TaskExecutionContext,
    breakpoints: Map<string, WorkflowBreakpoint>,
    conditionalRules: Map<string, ConditionalRule>,
    callbacks: {
      onExecuteStep?: (taskId: string) => Promise<void>;
      onSkipTask?: (taskId: string) => void;
      onBreakpointHit?: (breakpoint: WorkflowBreakpoint, step: ExecutionStep) => void;
      onConditionalAction?: (rule: ConditionalRule, task: TaskDefinition) => void;
    }
  ): Promise<{
    step: ExecutionStep;
    nextStepIndex: number;
    hitBreakpoint?: WorkflowBreakpoint;
    triggeredRule?: ConditionalRule;
  }> {
    if (currentStepIndex >= workflow.tasks.length) {
      throw new Error('No more steps to execute');
    }

    const task = workflow.tasks[currentStepIndex];
    const startTime = Date.now();

    // Check for breakpoints
    const hitBreakpoint = this.checkBreakpoints(breakpoints, task.id, context);
    if (hitBreakpoint) {
      const step = this.createExecutionStep(
        currentStepIndex + 1,
        task.id,
        'breakpoint',
        context,
        startTime
      );

      callbacks.onBreakpointHit?.(hitBreakpoint, step);
      
      return {
        step,
        nextStepIndex: currentStepIndex, // Don't advance on breakpoint
        hitBreakpoint,
      };
    }

    // Check conditional rules
    const triggeredRule = this.checkConditionalRules(conditionalRules, task.id, context);
    if (triggeredRule) {
      const step = await this.handleConditionalRule(
        triggeredRule,
        task,
        context,
        currentStepIndex,
        startTime,
        callbacks
      );

      return {
        step,
        nextStepIndex: currentStepIndex + 1,
        triggeredRule,
      };
    }

    // Execute the task normally
    try {
      if (callbacks.onExecuteStep) {
        await callbacks.onExecuteStep(task.id);
      }

      const step = this.createExecutionStep(
        currentStepIndex + 1,
        task.id,
        'complete',
        context,
        startTime
      );

      logger.info('Step executed successfully', { 
        taskId: task.id, 
        duration: step.performance.duration 
      });

      return {
        step,
        nextStepIndex: currentStepIndex + 1,
      };

    } catch (error) {
      const step = this.createExecutionStep(
        currentStepIndex + 1,
        task.id,
        'error',
        context,
        startTime
      );

      logger.error('Step execution failed', { 
        taskId: task.id, 
        error: error instanceof Error ? error.message : String(error) 
      });

      return {
        step,
        nextStepIndex: currentStepIndex + 1,
      };
    }
  }

  /**
   * Check if any breakpoints should be hit
   */
  private static checkBreakpoints(
    breakpoints: Map<string, WorkflowBreakpoint>,
    taskId: string,
    context: TaskExecutionContext
  ): WorkflowBreakpoint | null {
    const taskBreakpoints = Array.from(breakpoints.values()).filter(bp => 
      bp.taskId === taskId && bp.enabled
    );

    for (const breakpoint of taskBreakpoints) {
      if (this.shouldHitBreakpoint(breakpoint, context)) {
        return breakpoint;
      }
    }

    return null;
  }

  /**
   * Check if breakpoint condition is met
   */
  private static shouldHitBreakpoint(
    breakpoint: WorkflowBreakpoint,
    context: TaskExecutionContext
  ): boolean {
    if (!breakpoint.condition) return true;

    try {
      // Simplified condition evaluation
      // In production, would use a safe expression evaluator
      return this.evaluateCondition(breakpoint.condition, {
        ...context.sharedState,
        ...context.environment,
      });
    } catch (error) {
      logger.warn('Breakpoint condition evaluation failed', {
        breakpointId: breakpoint.id,
        condition: breakpoint.condition,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Check if any conditional rules apply
   */
  private static checkConditionalRules(
    conditionalRules: Map<string, ConditionalRule>,
    taskId: string,
    context: TaskExecutionContext
  ): ConditionalRule | null {
    const taskRules = Array.from(conditionalRules.values()).filter(rule => 
      rule.taskId === taskId && rule.enabled
    );

    for (const rule of taskRules) {
      if (this.evaluateCondition(rule.condition, {
        ...context.sharedState,
        ...context.environment,
      })) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Handle conditional rule action
   */
  private static async handleConditionalRule(
    rule: ConditionalRule,
    task: TaskDefinition,
    context: TaskExecutionContext,
    stepIndex: number,
    startTime: number,
    callbacks: {
      onSkipTask?: (taskId: string) => void;
      onConditionalAction?: (rule: ConditionalRule, task: TaskDefinition) => void;
    }
  ): Promise<ExecutionStep> {
    callbacks.onConditionalAction?.(rule, task);

    let action: ExecutionStep['action'];

    switch (rule.action) {
      case 'skip':
        callbacks.onSkipTask?.(task.id);
        action = 'skip';
        break;
      case 'pause':
        action = 'breakpoint';
        break;
      case 'retry':
        action = 'complete'; // Would implement retry logic
        break;
      case 'fail':
        action = 'error';
        break;
      default:
        action = 'complete';
    }

    const step = this.createExecutionStep(
      stepIndex + 1,
      task.id,
      action,
      context,
      startTime
    );

    logger.info('Conditional rule triggered', {
      ruleId: rule.id,
      taskId: task.id,
      action: rule.action,
      condition: rule.condition
    });

    return step;
  }

  /**
   * Reset stepping state
   */
  static resetStepping(): {
    currentStepIndex: number;
    executionSteps: ExecutionStep[];
  } {
    logger.info('Stepping state reset');
    
    return {
      currentStepIndex: 0,
      executionSteps: [],
    };
  }

  /**
   * Get stepping statistics
   */
  static getSteppingStats(steps: ExecutionStep[]): {
    totalSteps: number;
    completedSteps: number;
    errorSteps: number;
    skippedSteps: number;
    breakpointHits: number;
    totalDuration: number;
    averageDuration: number;
  } {
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.action === 'complete').length;
    const errorSteps = steps.filter(s => s.action === 'error').length;
    const skippedSteps = steps.filter(s => s.action === 'skip').length;
    const breakpointHits = steps.filter(s => s.action === 'breakpoint').length;
    
    const totalDuration = steps.reduce((sum, step) => sum + step.performance.duration, 0);
    const averageDuration = totalSteps > 0 ? totalDuration / totalSteps : 0;

    return {
      totalSteps,
      completedSteps,
      errorSteps,
      skippedSteps,
      breakpointHits,
      totalDuration,
      averageDuration,
    };
  }

  /**
   * Simple condition evaluation (placeholder)
   */
  private static evaluateCondition(
    condition: string,
    context: Record<string, any>
  ): boolean {
    // Simplified evaluation - would use proper parser in production
    try {
      // Basic variable substitution
      let evaluableCondition = condition;
      for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        const replacement = typeof value === 'string' ? `"${value}"` : String(value);
        evaluableCondition = evaluableCondition.replace(regex, replacement);
      }
      
      // Very basic evaluation (unsafe - would need proper parser)
      return Boolean(eval(evaluableCondition));
    } catch {
      return false;
    }
  }
}