/**
 * Interface Components Index - Clean Architecture like Gemini CLI
 * 
 * Centralized exports for all interface components
 * Replaces the ModernInterface.tsx monolith
 */

// Main orchestrator
export { InterfaceOrchestrator } from './InterfaceOrchestrator.js';
export type { InterfaceOrchestratorProps } from './InterfaceOrchestrator.js';

// Individual interface components
export { ChatInterface } from './ChatInterface.js';
export type { ChatInterfaceProps } from './ChatInterface.js';

export { StreamingInterface } from './StreamingInterface.js';
export type { StreamingInterfaceProps } from './StreamingInterface.js';

export { CompactInterface } from './CompactInterface.js';
export type { CompactInterfaceProps } from './CompactInterface.js';

export { CanvasInterface } from './CanvasInterface.js';
export type { CanvasInterfaceProps } from './CanvasInterface.js';

export { MultimodalInterface } from './MultimodalInterface.js';
export type { MultimodalInterfaceProps } from './MultimodalInterface.js';

// Shared types
export * from '../types/interface-types.js';

// Default export is the orchestrator for backward compatibility
export { InterfaceOrchestrator as default } from './InterfaceOrchestrator.js'; 