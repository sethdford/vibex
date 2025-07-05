/**
 * CLI Application UI Module
 *
 * This module exports the React/Ink UI application that powers the interactive CLI.
 * It serves as the bridge between the main UI components and the CLI.
 */

// Export the full-featured startUI from index.tsx that supports initialContext
export { startUI, type StartUIOptions } from './index.tsx';
// Keep the basic CLIApp for backward compatibility
export { CLIApp } from './cli-app.tsx';
