/**
 * Real-Time Task Orchestrator Types - Clean Architecture
 * 
 * Centralized type definitions for real-time task orchestrator components
 * Following Gemini CLI's focused type organization
 */

import type { WorkflowDefinition, TaskDefinition, TaskExecutionContext } from '../task-orchestrator/types.js';

/**
 * Real-time connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

/**
 * Real-time update event types
 */
export type UpdateEventType = 'task_progress' | 'task_status' | 'workflow_status' | 'metrics' | 'error';

/**
 * Execution history entry
 */
export interface ExecutionHistoryEntry {
  workflowId: string;
  timestamp: number;
  success: boolean;
  duration: number;
  errorMessage?: string;
}

/**
 * Real-time performance metrics
 */
export interface RealTimeMetrics {
  updateLatency: number;
  connectionStatus: ConnectionStatus;
  memoryUsage: number;
  throughput: number;
  lastUpdate: number;
  updateCount: number;
  errorCount: number;
}

/**
 * Real-time state synchronization data
 */
export interface RealTimeState {
  activeWorkflow: WorkflowDefinition | null;
  taskStates: Map<string, Partial<TaskDefinition>>;
  taskProgress: Map<string, number>;
  taskErrors: Map<string, string>;
  isExecuting: boolean;
  isPaused: boolean;
  isCancelled: boolean;
  connectionStatus: ConnectionStatus;
  updateLatency: number;
  lastUpdate: number;
  performanceMetrics: RealTimeMetrics;
  executionReport?: {
    duration: number;
    success: boolean;
    tasksCompleted: number;
    tasksTotal: number;
  };
}

/**
 * Real-time orchestrator configuration
 */
export interface RealTimeOrchestratorConfig {
  updateInterval: number;
  maxLatency: number;
  enableMetrics: boolean;
  metricsInterval: number;
  maxRetries: number;
  retryDelay: number;
  persistState: boolean;
  storageKey: string;
}

/**
 * Real-time orchestrator callbacks
 */
export interface RealTimeOrchestratorCallbacks {
  onWorkflowComplete?: (workflow: WorkflowDefinition, success: boolean) => void;
  onError?: (error: string) => void;
  onStateUpdate?: (state: RealTimeState) => void;
  onMetricsUpdate?: (metrics: RealTimeMetrics) => void;
}

/**
 * Real-time task orchestrator props
 */
export interface RealTimeTaskOrchestratorProps {
  /**
   * Initial workflow to load
   */
  initialWorkflow?: WorkflowDefinition;
  
  /**
   * Execution context for workflows
   */
  executionContext?: Partial<TaskExecutionContext>;
  
  /**
   * Whether the orchestrator is focused for input
   */
  isFocused?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Show detailed task information
   */
  showDetails?: boolean;
  
  /**
   * Show completed tasks
   */
  showCompleted?: boolean;
  
  /**
   * Auto-scroll to active tasks
   */
  autoScroll?: boolean;
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * Enable real-time performance monitoring
   */
  enableMetrics?: boolean;
  
  /**
   * Update interval in milliseconds (default: 100ms)
   */
  updateInterval?: number;
  
  /**
   * Workflow completion callback
   */
  onWorkflowComplete?: (workflow: WorkflowDefinition, success: boolean) => void;
  
  /**
   * Error callback
   */
  onError?: (error: string) => void;
}

/**
 * Demo workflow types
 */
export type DemoWorkflowType = 'simple' | 'complex' | 'parallel';

/**
 * Real-time update event
 */
export interface RealTimeUpdateEvent {
  type: UpdateEventType;
  timestamp: number;
  data: any;
  source: 'engine' | 'ui' | 'external';
}

/**
 * Connection event data
 */
export interface ConnectionEvent {
  status: ConnectionStatus;
  timestamp: number;
  latency?: number;
  error?: string;
}

/**
 * Metrics display configuration
 */
export interface MetricsDisplayConfig {
  showLatency: boolean;
  showMemory: boolean;
  showThroughput: boolean;
  showErrors: boolean;
  refreshInterval: number;
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcuts {
  toggleMetrics: string;
  toggleAutoExecute: string;
  executeWorkflow: string;
  showHistory: string;
  forceRefresh: string;
  pauseResume: string;
  cancel: string;
}

export interface UseWorkflowEngineOptions {
  enableMetrics?: boolean;
  metricsInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  persistState?: boolean;
  storageKey?: string;
}