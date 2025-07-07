/**
 * Task Orchestrator Types - Clean Architecture like Gemini CLI
 * 
 * Centralized type definitions for task orchestration system
 */

/**
 * Task status types
 */
export type TaskStatus = 
  | 'pending'
  | 'in_progress' 
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting_dependencies'
  | 'paused';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Workflow status
 */
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

/**
 * Task execution context
 */
export interface TaskExecutionContext {
  workingDirectory: string;
  environment: Record<string, string>;
  config: Record<string, unknown>;
  logger: {
    info: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
  };
  sharedState: Record<string, any>;
}

/**
 * Tool call definition
 */
export interface ToolCall {
  toolName: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  executionTime?: number;
}

/**
 * Task result
 */
export interface TaskResult {
  success: boolean;
  output?: string;
  artifacts?: string[];
  metrics?: Record<string, number>;
  error?: string;
}

/**
 * Task definition interface
 */
export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'file_ops' | 'code_gen' | 'testing' | 'deployment' | 'research' | 'validation';
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[];
  subTasks?: TaskDefinition[];
  estimatedDuration?: number;
  startTime?: number;
  endTime?: number;
  progress: number;
  currentStep?: string;
  toolCalls: ToolCall[];
  result?: TaskResult;
  cancellable: boolean;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
  critical?: boolean;
  timeout?: number;
  execute?: (context: TaskExecutionContext) => Promise<void>;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  tasks: TaskDefinition[];
  context: TaskExecutionContext;
  status: WorkflowStatus;
  progress: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Task orchestrator configuration
 */
export interface TaskOrchestratorConfig {
  maxWidth: number;
  showDetails: boolean;
  showCompleted: boolean;
  autoScroll: boolean;
  compact: boolean;
  updateInterval?: number;
  enableMetrics?: boolean;
}

/**
 * Task orchestrator callbacks
 */
export interface TaskOrchestratorCallbacks {
  onTaskUpdate?: (taskId: string, updates: Partial<TaskDefinition>) => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: (taskId: string) => void;
  onWorkflowComplete?: (workflow: WorkflowDefinition, success: boolean) => void;
  onError?: (error: string) => void;
}

/**
 * Task display state
 */
export interface TaskDisplayState {
  selectedTaskIndex: number;
  expandedTasks: Set<string>;
  showSubTasks: Set<string>;
}

/**
 * Task status icon configuration
 */
export interface TaskStatusIcon {
  icon: string;
  color: string;
}

/**
 * Priority indicator configuration
 */
export interface PriorityIndicator {
  icon: string;
  color: string;
}