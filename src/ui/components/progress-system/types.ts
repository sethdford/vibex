/**
 * Progress System Types - Clean Architecture
 * 
 * Centralized type definitions for the progress system components
 * Following Gemini CLI's focused type organization
 */

import type { StatusType } from '../StatusIcon.js';

/**
 * Progress mode types
 */
export type ProgressMode = 'standard' | 'advanced' | 'indeterminate' | 'mini';

/**
 * Animation style types
 */
export type AnimationStyle = 'gradient' | 'pulse' | 'wave' | 'bounce' | 'slide' | 'simple';

/**
 * Theme types
 */
export type ProgressTheme = 'default' | 'success' | 'warning' | 'error' | 'info';

/**
 * Size types for mini mode
 */
export type ProgressSize = 'small' | 'medium' | 'large';

/**
 * Progress metrics interface
 */
export interface ProgressMetrics {
  elapsedTime: number;
  estimatedTimeRemaining: number;
  velocity: number;
  accuracy: number;
  smoothedVelocity: number;
}

/**
 * Progress history entry
 */
export interface ProgressHistoryEntry {
  value: number;
  timestamp: number;
}

/**
 * Theme colors configuration
 */
export interface ProgressThemeColors {
  fill: string;
  background: string;
}

/**
 * Size configuration for mini mode
 */
export interface ProgressSizeConfig {
  width: number;
  stages: string[];
}

/**
 * Animation state interface
 */
export interface ProgressAnimationState {
  frame: number;
  position: number;
  reverse: boolean;
  opacity: number;
  animatedValue: number;
}

/**
 * Progress calculation configuration
 */
export interface ProgressCalculationConfig {
  smoothingAlpha: number;
  historyWindowMs: number;
  velocityWindowSize: number;
  accuracyThreshold: number;
}

/**
 * Core progress system props
 */
export interface ProgressSystemProps {
  /**
   * Progress mode
   */
  mode?: ProgressMode;
  
  /**
   * Current progress value (0-100) - not used for indeterminate
   */
  value?: number;
  
  /**
   * Previous progress value for velocity calculation
   */
  previousValue?: number;
  
  /**
   * Whether the progress is active
   */
  active?: boolean;
  
  /**
   * Width of the progress bar
   */
  width?: number;
  
  /**
   * Size for mini mode
   */
  size?: ProgressSize;
  
  /**
   * Color theme
   */
  theme?: ProgressTheme;
  
  /**
   * Custom color override
   */
  color?: string;
  
  /**
   * Background color
   */
  backgroundColor?: string;
  
  /**
   * Fill character
   */
  character?: string;
  
  /**
   * Empty character
   */
  emptyCharacter?: string;
  
  /**
   * Animation style
   */
  animationStyle?: AnimationStyle;
  
  /**
   * Animation speed (ms per frame)
   */
  animationSpeed?: number;
  
  /**
   * Whether to enable animations
   */
  animated?: boolean;
  
  /**
   * Label text
   */
  label?: string;
  
  /**
   * Current step description
   */
  currentStep?: string;
  
  /**
   * Current step number
   */
  stepNumber?: number;
  
  /**
   * Total steps
   */
  totalSteps?: number;
  
  /**
   * Whether to show step counter
   */
  showSteps?: boolean;
  
  /**
   * Whether to show percentage
   */
  showPercentage?: boolean;
  
  /**
   * Whether to show ETA
   */
  showETA?: boolean;
  
  /**
   * Whether to show velocity
   */
  showVelocity?: boolean;
  
  /**
   * Whether to show detailed metrics
   */
  showMetrics?: boolean;
  
  /**
   * Whether to show status icon
   */
  showStatus?: boolean;
  
  /**
   * Status type
   */
  status?: StatusType;
  
  /**
   * Start time for ETA calculation
   */
  startTime?: number;
  
  /**
   * Estimated total duration
   */
  estimatedDuration?: number;
  
  /**
   * Estimated time remaining (seconds)
   */
  estimatedTimeRemaining?: number;
  
  /**
   * Completion message
   */
  completionMessage?: string;
  
  /**
   * Additional message
   */
  message?: string;
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * ARIA description
   */
  ariaDescription?: string;
}

/**
 * Progress tracking hook return type
 */
export interface UseProgressTrackingReturn {
  value: number;
  startTime: number | null;
  progressHistory: ProgressHistoryEntry[];
  updateProgress: (newValue: number) => void;
  resetProgress: () => void;
  getVelocity: () => number;
  getETA: () => number;
}

export interface ProgressCalculation {
  calculate: (value: number, previousValue: number, history: ProgressHistoryEntry[], config: ProgressCalculationConfig) => ProgressMetrics;
}

export interface ProgressBarConfig {
  width: number;
  character: string;
  emptyCharacter: string;
}

export interface ProgressDisplayConfig {
  showSteps: boolean;
  showPercentage: boolean;
  showETA: boolean;
  showVelocity: boolean;
}