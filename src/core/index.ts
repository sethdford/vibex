/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * VibeX Core Module
 * 
 * This module exposes the VibeX core functionality, including
 * the tool system and adapters for legacy code.
 */

// Export the initialization module
export * from './initialization';

// Export the legacy compatibility layer for tools
export * from './adapters/compat';

// Export the domain types and interfaces
export * from './domain/tool/tool-interfaces';
export * from './domain/tool/tool-api';

// Export the event system
export * from './domain/tool/tool-events';

// Export tool registration functions
export { registerAllTools, configureToolSystem } from './adapters/tools';

// Lazy-initialize the core on first import
export { getCoreInstance } from './initialization';