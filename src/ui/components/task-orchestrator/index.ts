/**
 * Task Orchestrator System - Clean Architecture like Gemini CLI
 * 
 * Centralized exports for the task orchestrator system
 */

// Core component
export { TaskOrchestratorCore as TaskOrchestrator } from './TaskOrchestratorCore.js';

// Individual components
export { TaskRenderer } from './TaskRenderer.js';
export { WorkflowHeader } from './WorkflowHeader.js';

// Services
export { TaskStatusService } from './TaskStatusService.js';
export { TaskTimeService } from './TaskTimeService.js';
export { TaskDisplayService } from './TaskDisplayService.js';
export { TaskInputHandler } from './TaskInputHandler.js';

// Hook
export { useTaskOrchestrator } from './useTaskOrchestrator.js';

// Types
export type {
  TaskStatus,
  TaskPriority,
  WorkflowStatus,
  TaskDefinition,
  WorkflowDefinition,
  TaskExecutionContext,
  ToolCall,
  TaskResult,
  TaskOrchestratorConfig,
  TaskOrchestratorCallbacks,
  TaskDisplayState,
  TaskStatusIcon,
  PriorityIndicator,
} from './types.js';

// Re-export for backward compatibility
export type { TaskOrchestratorProps } from './TaskOrchestratorCore.js';
export type { TaskExecutionContext as TaskExecutionContextType } from './types.js';
export { TaskExecutionContext } from './types.js';
