/**
 * Progress Bar Hook
 * 
 * Custom hook for easily creating and managing progress bars
 * with enhanced features like step tracking and time estimation
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProgress } from '../contexts/ProgressContext.js';
import type { StatusType } from '../components/StatusIcon.js';
import type { ProgressStep } from '../components/DetailedProgressInfo.js';

/**
 * Progress bar options
 */
interface ProgressBarOptions {
  /**
   * Progress bar label
   */
  label?: string;
  
  /**
   * Total value (for percentage calculation)
   */
  total?: number;
  
  /**
   * Initial value
   */
  initialValue?: number;
  
  /**
   * Whether the progress is indeterminate
   */
  indeterminate?: boolean;
  
  /**
   * Initial message
   */
  initialMessage?: string;
  
  /**
   * Whether to auto-remove on unmount
   */
  autoRemove?: boolean;
  
  /**
   * Total number of steps
   */
  totalSteps?: number;
  
  /**
   * Initial status
   */
  initialStatus?: StatusType;
  
  /**
   * Whether to automatically calculate time estimates
   */
  estimateTime?: boolean;
}

/**
 * Result interface for progress bar operations
 */
export interface ProgressBarResult {
  /**
   * Progress bar ID
   */
  id: string;
  
  /**
   * Update progress value
   */
  update: (value: number, message?: string) => void;
  
  /**
   * Complete the progress
   */
  complete: (message?: string) => void;
  
  /**
   * Set whether the progress is indeterminate
   */
  setIndeterminate: (indeterminate: boolean) => void;
  
  /**
   * Get current progress value (0-100)
   */
  getValue: () => number;
  
  /**
   * Get current progress message
   */
  getMessage: () => string | undefined;
  
  /**
   * Start a new step
   */
  startStep: (stepName: string) => void;
  
  /**
   * Complete the current step
   */
  completeStep: (status?: StatusType) => void;
  
  /**
   * Update all steps
   */
  updateSteps: (steps: ProgressStep[]) => void;
  
  /**
   * Set the status of the progress
   */
  setStatus: (status: StatusType) => void;
  
  /**
   * Get the current status
   */
  getStatus: () => StatusType;
  
  /**
   * Get all progress data
   */
  getProgressData: () => Record<string, unknown>;
  
  /**
   * Get estimated time remaining (in seconds)
   */
  getEstimatedTimeRemaining: () => number | undefined;
  
  /**
   * Get current step
   */
  getCurrentStep: () => number | undefined;
}

/**
 * Hook for easily creating and managing progress bars
 */
export function useProgressBar(
  options: ProgressBarOptions = {}
): ProgressBarResult {
  const {
    label,
    total = 100,
    initialValue = 0,
    indeterminate = false,
    initialMessage,
    autoRemove = true,
    totalSteps,
    initialStatus = 'running',
    estimateTime = true,
  } = options;
  
  // Generate unique ID if not provided
  const idRef = useRef<string>(uuidv4());
  
  // Get progress context
  const {
    startProgress,
    updateProgress,
    completeProgress,
    setIndeterminate: setIndeterminateProgress,
    getProgress,
    updateSteps: updateProgressSteps,
    startStep: startProgressStep,
    completeStep: completeProgressStep,
    setStatus: setProgressStatus,
  } = useProgress();
  
  // Initialize progress on mount
  useEffect(() => {
    startProgress(idRef.current, {
      label: label || 'Progress',
      total,
      value: initialValue,
      indeterminate,
      message: initialMessage,
      totalSteps,
      currentStep: 0,
      status: initialStatus,
    });
    
    // Clean up on unmount
    return () => {
      if (autoRemove) {
        completeProgress(idRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Update progress
  const update = useCallback((value: number, message?: string) => {
    updateProgress(idRef.current, value, message);
  }, [updateProgress]);
  
  // Complete progress
  const complete = useCallback((message?: string) => {
    completeProgress(idRef.current, message);
  }, [completeProgress]);
  
  // Set indeterminate state
  const setIndeterminateState = useCallback((indeterminate: boolean) => {
    setIndeterminateProgress(idRef.current, indeterminate);
  }, [setIndeterminateProgress]);
  
  // Start a new step
  const startStep = useCallback((stepName: string) => {
    startProgressStep(idRef.current, stepName);
  }, [startProgressStep]);
  
  // Complete the current step
  const completeStep = useCallback((status: StatusType = 'success') => {
    completeProgressStep(idRef.current, status);
  }, [completeProgressStep]);
  
  // Update all steps
  const updateSteps = useCallback((steps: ProgressStep[]) => {
    updateProgressSteps(idRef.current, steps);
  }, [updateProgressSteps]);
  
  // Set status
  const setStatus = useCallback((status: StatusType) => {
    setProgressStatus(idRef.current, status);
  }, [setProgressStatus]);
  
  // Get current value
  const getValue = useCallback(() => {
    const progress = getProgress(idRef.current);
    return progress ? (progress.value / progress.total) * 100 : 0;
  }, [getProgress]);
  
  // Get current message
  const getMessage = useCallback(() => {
    const progress = getProgress(idRef.current);
    return progress?.message;
  }, [getProgress]);
  
  // Get current status
  const getStatus = useCallback(() => {
    const progress = getProgress(idRef.current);
    return progress?.status || 'running';
  }, [getProgress]);
  
  // Get all progress data
  const getProgressData = useCallback((): Record<string, unknown> => {
    const progress = getProgress(idRef.current);
    return (progress as unknown as Record<string, unknown>) || {};
  }, [getProgress]);
  
  // Get estimated time remaining
  const getEstimatedTimeRemaining = useCallback(() => {
    const progress = getProgress(idRef.current);
    return progress?.estimatedTimeRemaining;
  }, [getProgress]);
  
  // Get current step
  const getCurrentStep = useCallback(() => {
    const progress = getProgress(idRef.current);
    return progress?.currentStep;
  }, [getProgress]);
  
  return {
    id: idRef.current,
    update,
    complete,
    setIndeterminate: setIndeterminateState,
    getValue,
    getMessage,
    startStep,
    completeStep,
    updateSteps,
    setStatus,
    getStatus,
    getProgressData,
    getEstimatedTimeRemaining,
    getCurrentStep,
  };
}