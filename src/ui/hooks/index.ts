/**
 * UI Hooks
 * 
 * This module exports hooks for use in VibeX UI components.
 */

// Named exports for all hooks
export { useAutoAcceptIndicator } from './useAutoAcceptIndicator.js';
export { useAtCommandProcessor } from './useAtCommandProcessor.js';
export { useClipboard } from './useClipboard.js';
export { useConsoleMessages } from './useConsoleMessages.js';
export { useConsolePatcher } from './useConsolePatcher.js';
export { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
export { useLoadingIndicator } from './useLoadingIndicator.js';
export { usePerformanceMonitoring } from './usePerformanceMonitoring.js';
export { useProgressBar } from './useProgressBar.js';
export { useProgressiveDisclosure } from './useProgressiveDisclosure.js';
export { useSettings } from './useSettings.js';
export { useTemplateManager } from './useTemplateManager.js';
export { useThemeCommand } from './useThemeCommand.js';
export { useWorkflowEngine } from './useWorkflowEngine.js';

// Re-export Claude hooks
export * from './claude/index.js';

// Export new tool-related hooks
export { default as useToolConfirmation } from './useToolConfirmation';
export { default as useToolProgress } from './useToolProgress';
export { default as useToolRegistry, setGlobalToolOrchestrationService } from './useToolRegistry';

// Export types from hooks
export type { ToolConfirmationState } from './useToolConfirmation';
export type { ToolProgressState } from './useToolProgress';