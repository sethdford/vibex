/**
 * UI Hooks
 * 
 * This module exports hooks for use in VibeX UI components.
 */

// Export existing hooks
export { default as useAutoAcceptIndicator } from './useAutoAcceptIndicator';
export { default as useAtCommandProcessor } from './useAtCommandProcessor';
export { default as useClipboard } from './useClipboard';
export { default as useConsoleMessages } from './useConsoleMessages';
export { default as useConsolePatcher } from './useConsolePatcher';
export { default as useKeyboardShortcuts } from './useKeyboardShortcuts';
export { default as useLoadingIndicator } from './useLoadingIndicator';
export { default as usePerformanceMonitoring } from './usePerformanceMonitoring';
export { default as useProgressBar } from './useProgressBar';
export { default as useProgressiveDisclosure } from './useProgressiveDisclosure';
export { default as useSettings } from './useSettings';
export { default as useSlashCommands } from './useSlashCommands';
export { default as useTemplateManager } from './useTemplateManager';
export { default as useThemeCommand } from './useThemeCommand';
export { default as useWorkflowEngine } from './useWorkflowEngine';

// Export new tool-related hooks
export { default as useToolConfirmation } from './useToolConfirmation';
export { default as useToolProgress } from './useToolProgress';
export { default as useToolRegistry, setGlobalToolOrchestrationService } from './useToolRegistry';

// Export types from hooks
export type { ToolConfirmationState } from './useToolConfirmation';
export type { ToolProgressState } from './useToolProgress';