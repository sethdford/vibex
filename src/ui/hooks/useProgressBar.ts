/**
 * Progress Bar Hook
 * 
 * Manages progress bar state and animations.
 */

import { useState, useCallback, useEffect } from 'react';

export interface ProgressBarState {
  value: number;
  max: number;
  isIndeterminate: boolean;
  isAnimating: boolean;
  label?: string;
}

export interface UseProgressBarOptions {
  initialValue?: number;
  max?: number;
  animationDuration?: number;
  smoothing?: boolean;
}

export function useProgressBar(options: UseProgressBarOptions = {}) {
  const {
    initialValue = 0,
    max = 100,
    animationDuration = 300,
    smoothing = true
  } = options;

  const [state, setState] = useState<ProgressBarState>({
    value: initialValue,
    max,
    isIndeterminate: false,
    isAnimating: false
  });

  // Set progress value
  const setValue = useCallback((value: number) => {
    setState(prev => ({
      ...prev,
      value: Math.max(0, Math.min(value, prev.max)),
      isIndeterminate: false
    }));
  }, []);

  // Set maximum value
  const setMax = useCallback((newMax: number) => {
    setState(prev => ({
      ...prev,
      max: Math.max(1, newMax),
      value: Math.min(prev.value, newMax)
    }));
  }, []);

  // Set indeterminate state
  const setIndeterminate = useCallback((indeterminate: boolean) => {
    setState(prev => ({
      ...prev,
      isIndeterminate: indeterminate
    }));
  }, []);

  // Set label
  const setLabel = useCallback((label?: string) => {
    setState(prev => ({
      ...prev,
      label
    }));
  }, []);

  // Increment progress
  const increment = useCallback((amount: number = 1) => {
    setState(prev => ({
      ...prev,
      value: Math.min(prev.value + amount, prev.max),
      isIndeterminate: false
    }));
  }, []);

  // Decrement progress
  const decrement = useCallback((amount: number = 1) => {
    setState(prev => ({
      ...prev,
      value: Math.max(prev.value - amount, 0),
      isIndeterminate: false
    }));
  }, []);

  // Reset progress
  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      value: 0,
      isIndeterminate: false,
      isAnimating: false,
      label: undefined
    }));
  }, []);

  // Complete progress
  const complete = useCallback(() => {
    setState(prev => ({
      ...prev,
      value: prev.max,
      isIndeterminate: false
    }));
  }, []);

  // Start animation
  const startAnimation = useCallback(() => {
    setState(prev => ({ ...prev, isAnimating: true }));
  }, []);

  // Stop animation
  const stopAnimation = useCallback(() => {
    setState(prev => ({ ...prev, isAnimating: false }));
  }, []);

  // Get percentage
  const getPercentage = useCallback(() => {
    return (state.value / state.max) * 100;
  }, [state.value, state.max]);

  // Auto-animate when value changes
  useEffect(() => {
    if (smoothing && !state.isIndeterminate) {
      startAnimation();
      const timer = setTimeout(stopAnimation, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [state.value, state.isIndeterminate, smoothing, animationDuration, startAnimation, stopAnimation]);

  return {
    ...state,
    setValue,
    setMax,
    setIndeterminate,
    setLabel,
    increment,
    decrement,
    reset,
    complete,
    startAnimation,
    stopAnimation,
    getPercentage
  };
} 