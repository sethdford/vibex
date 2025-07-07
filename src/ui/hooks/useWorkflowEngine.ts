/**
 * Workflow Engine Hook
 * 
 * Manages workflow execution and state for task orchestration.
 */

import { useState, useCallback, useEffect } from 'react';

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  dependencies?: string[];
  execute: () => Promise<void>;
  rollback?: () => Promise<void>;
  timeout?: number;
  retries?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  onComplete?: () => Promise<void>;
  onError?: (error: Error, step: WorkflowStep) => Promise<void>;
}

export interface WorkflowEngineState {
  currentWorkflow: WorkflowDefinition | null;
  currentStep: WorkflowStep | null;
  isRunning: boolean;
  completedSteps: string[];
  failedSteps: string[];
  progress: number;
  error: Error | null;
}

export interface WorkflowEngineActions {
  executeWorkflow: (workflow: WorkflowDefinition) => Promise<void>;
  pauseWorkflow: () => void;
  resumeWorkflow: () => Promise<void>;
  stopWorkflow: () => void;
  retryStep: (stepId: string) => Promise<void>;
  skipStep: (stepId: string) => void;
  rollbackWorkflow: () => Promise<void>;
}

export interface UseWorkflowEngineOptions {
  maxRetries?: number;
  defaultTimeout?: number;
  onStepStart?: (step: WorkflowStep) => void;
  onStepComplete?: (step: WorkflowStep) => void;
  onStepError?: (error: Error, step: WorkflowStep) => void;
}

export function useWorkflowEngine(options: UseWorkflowEngineOptions = {}): [WorkflowEngineState, WorkflowEngineActions] {
  const {
    maxRetries = 3,
    defaultTimeout = 30000,
    onStepStart,
    onStepComplete,
    onStepError
  } = options;

  const [state, setState] = useState<WorkflowEngineState>({
    currentWorkflow: null,
    currentStep: null,
    isRunning: false,
    completedSteps: [],
    failedSteps: [],
    progress: 0,
    error: null
  });

  // Check if step dependencies are satisfied
  const areDependenciesSatisfied = useCallback((step: WorkflowStep, completedSteps: string[]): boolean => {
    if (!step.dependencies || step.dependencies.length === 0) return true;
    return step.dependencies.every(dep => completedSteps.includes(dep));
  }, []);

  // Get next executable step
  const getNextStep = useCallback((workflow: WorkflowDefinition, completedSteps: string[], failedSteps: string[]): WorkflowStep | null => {
    return workflow.steps.find(step => 
      step.status === 'pending' && 
      !completedSteps.includes(step.id) && 
      !failedSteps.includes(step.id) &&
      areDependenciesSatisfied(step, completedSteps)
    ) || null;
  }, [areDependenciesSatisfied]);

  // Execute a single step
  const executeStep = useCallback(async (step: WorkflowStep): Promise<void> => {
    let retryCount = 0;
    const maxRetryCount = step.retries ?? maxRetries;
    const timeout = step.timeout ?? defaultTimeout;

    while (retryCount <= maxRetryCount) {
      try {
        setState(prev => ({ ...prev, currentStep: step }));
        
        if (onStepStart) {
          onStepStart(step);
        }

        // Update step status to running
        step.status = 'running';

        // Execute with timeout
        await Promise.race([
          step.execute(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Step ${step.id} timed out`)), timeout)
          )
        ]);

        // Mark as completed
        step.status = 'completed';
        setState(prev => ({
          ...prev,
          completedSteps: [...prev.completedSteps, step.id],
          currentStep: null
        }));

        if (onStepComplete) {
          onStepComplete(step);
        }

        return;
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetryCount) {
          step.status = 'failed';
          setState(prev => ({
            ...prev,
            failedSteps: [...prev.failedSteps, step.id],
            currentStep: null,
            error: error as Error
          }));

          if (onStepError) {
            onStepError(error as Error, step);
          }

          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }, [maxRetries, defaultTimeout, onStepStart, onStepComplete, onStepError]);

  // Execute workflow
  const executeWorkflow = useCallback(async (workflow: WorkflowDefinition): Promise<void> => {
    setState(prev => ({
      ...prev,
      currentWorkflow: workflow,
      isRunning: true,
      completedSteps: [],
      failedSteps: [],
      progress: 0,
      error: null
    }));

    try {
      // Reset all steps to pending
      workflow.steps.forEach(step => {
        step.status = 'pending';
      });

      let completedSteps: string[] = [];
      let failedSteps: string[] = [];

      while (true) {
        const nextStep = getNextStep(workflow, completedSteps, failedSteps);
        
        if (!nextStep) {
          // No more executable steps
          break;
        }

        try {
          await executeStep(nextStep);
          completedSteps = [...completedSteps, nextStep.id];
        } catch (error) {
          failedSteps = [...failedSteps, nextStep.id];
          
          // Check if workflow should continue or stop
          const remainingSteps = workflow.steps.filter(step => 
            !completedSteps.includes(step.id) && 
            !failedSteps.includes(step.id)
          );

          const canContinue = remainingSteps.some(step => 
            areDependenciesSatisfied(step, completedSteps)
          );

          if (!canContinue) {
            throw error;
          }
        }

        // Update progress
        const totalSteps = workflow.steps.length;
        const progress = (completedSteps.length / totalSteps) * 100;
        setState(prev => ({ ...prev, progress }));
      }

      // Workflow completed
      setState(prev => ({
        ...prev,
        isRunning: false,
        progress: 100
      }));

      if (workflow.onComplete) {
        await workflow.onComplete();
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error as Error
      }));

      if (workflow.onError) {
        await workflow.onError(error as Error, state.currentStep!);
      }

      throw error;
    }
  }, [getNextStep, executeStep, areDependenciesSatisfied, state.currentStep]);

  // Pause workflow
  const pauseWorkflow = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  // Resume workflow
  const resumeWorkflow = useCallback(async (): Promise<void> => {
    if (!state.currentWorkflow) return;
    
    setState(prev => ({ ...prev, isRunning: true }));
    await executeWorkflow(state.currentWorkflow);
  }, [state.currentWorkflow, executeWorkflow]);

  // Stop workflow
  const stopWorkflow = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentWorkflow: null,
      currentStep: null,
      isRunning: false,
      error: null
    }));
  }, []);

  // Retry step
  const retryStep = useCallback(async (stepId: string): Promise<void> => {
    if (!state.currentWorkflow) return;

    const step = state.currentWorkflow.steps.find(s => s.id === stepId);
    if (!step) return;

    // Reset step status
    step.status = 'pending';
    setState(prev => ({
      ...prev,
      failedSteps: prev.failedSteps.filter(id => id !== stepId),
      error: null
    }));

    try {
      await executeStep(step);
      setState(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, stepId]
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        failedSteps: [...prev.failedSteps, stepId],
        error: error as Error
      }));
    }
  }, [state.currentWorkflow, executeStep]);

  // Skip step
  const skipStep = useCallback((stepId: string) => {
    if (!state.currentWorkflow) return;

    const step = state.currentWorkflow.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'skipped';
    setState(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps, stepId]
    }));
  }, [state.currentWorkflow]);

  // Rollback workflow
  const rollbackWorkflow = useCallback(async (): Promise<void> => {
    if (!state.currentWorkflow) return;

    const completedSteps = state.currentWorkflow.steps
      .filter(step => state.completedSteps.includes(step.id))
      .reverse(); // Rollback in reverse order

    for (const step of completedSteps) {
      if (step.rollback) {
        try {
          await step.rollback();
        } catch (error) {
          console.error(`Failed to rollback step ${step.id}:`, error);
        }
      }
    }

    setState(prev => ({
      ...prev,
      completedSteps: [],
      failedSteps: [],
      progress: 0,
      error: null
    }));
  }, [state.currentWorkflow, state.completedSteps]);

  const actions: WorkflowEngineActions = {
    executeWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
    retryStep,
    skipStep,
    rollbackWorkflow
  };

  return [state, actions];
} 