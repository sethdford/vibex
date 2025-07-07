/**
 * Interactive Workflow Controls Types - Clean Architecture like Gemini CLI
 * 
 * Centralized type definitions for interactive workflow controls
 */

import type { WorkflowDefinition, TaskDefinition } from '../task-orchestrator/index.js';

/**
 * Workflow control state
 */
export type WorkflowControlState = 'idle' | 'running' | 'paused' | 'debugging' | 'cancelling' | 'completed' | 'failed';

/**
 * Debug breakpoint
 */
export interface DebugBreakpoint {
  id: string;
  taskId: string;
  condition?: string;
  enabled: boolean;
  hitCount: number;
  description?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfiguration {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryConditions: Array<'network_error' | 'timeout' | 'rate_limit' | 'temporary_failure'>;
}

/**
 * Control action types
 */
export type ControlAction = 'play' | 'pause' | 'resume' | 'cancel' | 'abort' | 'step' | 'step_into' | 'step_over' | 'step_out' | 'reset';

/**
 * Confirmation dialog types
 */
export type ConfirmationAction = 'cancel' | 'abort' | 'reset';

/**
 * Interactive workflow controls state
 */
export interface InteractiveControlsState {
  controlState: WorkflowControlState;
  selectedTaskIndex: number;
  showConfirmation: ConfirmationAction | null;
  showRetryDialog: boolean;
  customRetryConfig: Partial<RetryConfiguration>;
  breakpoints: DebugBreakpoint[];
  retryHistory: Map<string, number>;
}

/**
 * Interactive workflow controls configuration
 */
export interface InteractiveControlsConfig {
  isFocused: boolean;
  showDebugControls: boolean;
  enableStepping: boolean;
  compact: boolean;
  maxWidth: number;
  defaultRetryConfig: RetryConfiguration;
}

/**
 * Interactive workflow controls callbacks
 */
export interface InteractiveControlsCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onAbort?: () => void;
  onStep?: () => void;
  onStepInto?: () => void;
  onStepOver?: () => void;
  onStepOut?: () => void;
  onRetry?: (taskId: string, config?: Partial<RetryConfiguration>) => void;
  onAddBreakpoint?: (taskId: string, condition?: string) => void;
  onRemoveBreakpoint?: (breakpointId: string) => void;
  onToggleBreakpoint?: (breakpointId: string) => void;
  onReset?: () => void;
}

/**
 * Interactive workflow controls props
 */
export interface InteractiveWorkflowControlsProps {
  workflow?: WorkflowDefinition;
  controlState: WorkflowControlState;
  isFocused?: boolean;
  showDebugControls?: boolean;
  enableStepping?: boolean;
  breakpoints?: DebugBreakpoint[];
  retryConfig?: RetryConfiguration;
  compact?: boolean;
  maxWidth?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onAbort?: () => void;
  onStep?: () => void;
  onStepInto?: () => void;
  onStepOver?: () => void;
  onStepOut?: () => void;
  onRetry?: (taskId: string, config?: Partial<RetryConfiguration>) => void;
  onAddBreakpoint?: (taskId: string, condition?: string) => void;
  onRemoveBreakpoint?: (breakpointId: string) => void;
  onToggleBreakpoint?: (breakpointId: string) => void;
  onReset?: () => void;
}

/**
 * Control state icon mapping
 */
export interface ControlStateIcons {
  idle: string;
  running: string;
  paused: string;
  debugging: string;
  cancelling: string;
  completed: string;
  failed: string;
}

/**
 * Retry attempt result
 */
export interface RetryAttemptResult {
  success: boolean;
  attempt: number;
  delay: number;
  nextDelay?: number;
  error?: string;
}

/**
 * Workflow controls hook return type
 */
export interface UseWorkflowControlsReturn {
  controlState: WorkflowControlState;
  breakpoints: DebugBreakpoint[];
  retryHistory: Map<string, number>;
  play: () => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  abort: () => void;
  reset: () => void;
  addBreakpoint: (taskId: string, condition?: string) => string;
  removeBreakpoint: (breakpointId: string) => void;
  toggleBreakpoint: (breakpointId: string) => void;
  incrementRetryCount: (taskId: string) => void;
  getRetryCount: (taskId: string) => number;
  setControlState: (state: WorkflowControlState) => void;
} 