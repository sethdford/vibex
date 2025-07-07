/**
 * Advanced Workflow Controls Types - Clean Architecture like Gemini CLI
 * 
 * Centralized type definitions for advanced workflow debugging and control
 */

import type { WorkflowDefinition, TaskDefinition, TaskExecutionContext as BaseTaskExecutionContext } from '../task-orchestrator/index.js';

export interface TaskExecutionContext extends BaseTaskExecutionContext {
  sharedState: Record<string, any>;
}

/**
 * Breakpoint configuration
 */
export interface WorkflowBreakpoint {
  id: string;
  taskId: string;
  condition?: string;
  enabled: boolean;
  hitCount: number;
  createdAt: Date;
  description?: string;
}

/**
 * Execution step tracking
 */
export interface ExecutionStep {
  stepNumber: number;
  taskId: string;
  action: 'complete' | 'error' | 'skip' | 'breakpoint';
  timestamp: number;
  state: Record<string, any>;
  variables: Record<string, any>;
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    duration: number;
  };
}

/**
 * Conditional execution rule
 */
export interface ConditionalRule {
  id: string;
  taskId: string;
  condition: string;
  action: 'skip' | 'pause' | 'retry' | 'fail';
  enabled: boolean;
  description: string;
}

/**
 * Workflow version for comparison
 */
export interface WorkflowVersion {
  id: string;
  version: string;
  name: string;
  description: string;
  workflow: WorkflowDefinition;
  createdAt: Date;
  author: string;
  tags: string[];
  changeLog: string[];
}

/**
 * Performance profile data
 */
export interface PerformanceProfile {
  totalTime: number;
  averageTime: number;
  executionCount: number;
  memoryPeak: number;
  cpuPeak: number;
}

/**
 * Control mode types
 */
export type ControlMode = 'breakpoints' | 'stepping' | 'conditions' | 'versions' | 'profiler';

/**
 * Advanced workflow controls state
 */
export interface AdvancedControlsState {
  breakpoints: Map<string, WorkflowBreakpoint>;
  executionSteps: ExecutionStep[];
  conditionalRules: Map<string, ConditionalRule>;
  workflowVersions: Map<string, WorkflowVersion>;
  currentVersion: string;
  performanceProfile: Map<string, PerformanceProfile>;
  selectedMode: ControlMode;
  selectedTaskIndex: number;
  showStateInspector: boolean;
  isStepMode: boolean;
  currentStepIndex: number;
}

/**
 * Advanced workflow controls configuration
 */
export interface AdvancedControlsConfig {
  debugMode: boolean;
  showAdvanced: boolean;
  maxWidth: number;
  enableBreakpoints: boolean;
  enableStepping: boolean;
  enableProfiling: boolean;
}

/**
 * Advanced workflow controls callbacks
 */
export interface AdvancedControlsCallbacks {
  onBreakpointHit?: (breakpoint: WorkflowBreakpoint, step: ExecutionStep) => void;
  onStepComplete?: (step: ExecutionStep) => void;
  onConditionalAction?: (rule: ConditionalRule, task: TaskDefinition) => void;
  onVersionChange?: (version: WorkflowVersion) => void;
  onExecuteStep?: (taskId: string) => Promise<void>;
  onSkipTask?: (taskId: string) => void;
  onPauseExecution?: () => void;
  onResumeExecution?: () => void;
  onAbortExecution?: () => void;
}

/**
 * Advanced workflow controls props
 */
export interface AdvancedWorkflowControlsProps {
  workflow: WorkflowDefinition;
  executionContext: TaskExecutionContext;
  isFocused?: boolean;
  debugMode?: boolean;
  showAdvanced?: boolean;
  maxWidth?: number;
  onBreakpointHit?: (breakpoint: WorkflowBreakpoint, step: ExecutionStep) => void;
  onStepComplete?: (step: ExecutionStep) => void;
  onConditionalAction?: (rule: ConditionalRule, task: TaskDefinition) => void;
  onVersionChange?: (version: WorkflowVersion) => void;
  onExecuteStep?: (taskId: string) => Promise<void>;
  onSkipTask?: (taskId: string) => void;
  onPauseExecution?: () => void;
  onResumeExecution?: () => void;
  onAbortExecution?: () => void;
}