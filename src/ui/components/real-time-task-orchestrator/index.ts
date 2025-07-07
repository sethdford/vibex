/**
 * Real-Time Task Orchestrator - Clean Architecture Exports
 * 
 * Centralized exports for all real-time task orchestrator components and services
 * Following Gemini CLI's clean import/export patterns
 */

// Main Component
export { RealTimeTaskOrchestratorCore as RealTimeTaskOrchestrator } from './RealTimeTaskOrchestratorCore.js';

// Services
export { RealTimeStateService, createRealTimeStateService } from './RealTimeStateService.js';
export { ExecutionService, createExecutionService } from './ExecutionService.js';
export { MetricsService, createMetricsService } from './MetricsService.js';
export { KeyboardControlsService, createKeyboardControlsService, DEFAULT_KEYBOARD_SHORTCUTS } from './KeyboardControlsService.js';
export { DemoWorkflowService, createDemoWorkflowService } from './DemoWorkflowService.js';

// View Components
export { MetricsView } from './MetricsView.js';
export { ConnectionStatusView } from './ConnectionStatusView.js';
export { ExecutionHistoryView } from './ExecutionHistoryView.js';
export { ControlsHintView } from './ControlsHintView.js';

// Types
export type {
  ConnectionStatus,
  UpdateEventType,
  ExecutionHistoryEntry,
  RealTimeMetrics,
  RealTimeState,
  RealTimeOrchestratorConfig,
  RealTimeOrchestratorCallbacks,
  RealTimeTaskOrchestratorProps,
  DemoWorkflowType,
  RealTimeUpdateEvent,
  ConnectionEvent,
  MetricsDisplayConfig,
  KeyboardShortcuts
} from './types.js';

// Hook for demo workflows (re-exported for convenience)
export { createDemoWorkflowService as useDemoWorkflows } from './DemoWorkflowService.js'; 