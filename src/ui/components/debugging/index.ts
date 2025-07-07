/**
 * Debugging Interface Components
 * 
 * Exports all debugging interface components and types.
 */

// Main components
export { default as DebuggingInterface } from './DebuggingInterface.js';
export { default as DebugToolbar } from './DebugToolbar.js';
export { default as SourceView } from './SourceView.js';
export { default as useDebugState } from './useDebugState.js';

// Panel components
export { default as VariablesPanel } from './panels/VariablesPanel.js';
export { default as CallStackPanel } from './panels/CallStackPanel.js';
export { default as BreakpointsPanel } from './panels/BreakpointsPanel.js';
export { default as ConsolePanel } from './panels/ConsolePanel.js';
export { default as WatchesPanel } from './panels/WatchesPanel.js';
export { default as ThreadsPanel } from './panels/ThreadsPanel.js';
export { default as SourcesPanel } from './panels/SourcesPanel.js';

// Example implementation
export { default as DebuggingInterfaceExample } from './DebuggingInterfaceExample.js';

// Types
export * from './types.js';

// Utilities
export * from './utils/sourceFileLoader.js';
export * from './utils/ThemeProvider.js';