/**
 * Console Patcher Hook
 * 
 * Patches console methods to capture logs, warnings, and errors for display in the UI.
 */

import { useEffect } from 'react';

/**
 * Console patcher hook options
 */
interface UseConsolePatcherOptions {
  /**
   * Handler for new console messages
   */
  onNewMessage: (type: 'log' | 'error' | 'warn' | 'info' | 'debug', text: string) => void;
  
  /**
   * Whether debug mode is enabled
   */
  debugMode?: boolean;
}

/**
 * Hook for patching console methods
 */
export function useConsolePatcher({
  onNewMessage,
  debugMode = false,
}: UseConsolePatcherOptions) {
  useEffect(() => {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };
    
    // Replace console.log
    console.log = (...args: readonly unknown[]) => {
      const message = args
        .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');
      onNewMessage('log', message);
      originalConsole.log(...args);
    };
    
    // Replace console.error
    console.error = (...args: readonly unknown[]) => {
      const message = args
        .map(arg =>
          (arg instanceof Error
            ? `${arg.name}: ${arg.message}\n${arg.stack}`
            : typeof arg === 'string'
            ? arg
            : JSON.stringify(arg))
        )
        .join(' ');
      onNewMessage('error', message);
      originalConsole.error(...args);
    };
    
    // Replace console.warn
    console.warn = (...args: readonly unknown[]) => {
      const message = args
        .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');
      onNewMessage('warn', message);
      originalConsole.warn(...args);
    };
    
    // Replace console.info
    console.info = (...args: readonly unknown[]) => {
      const message = args
        .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');
      onNewMessage('info', message);
      originalConsole.info(...args);
    };
    
    // Replace console.debug (only captured in debug mode)
    if (debugMode) {
      console.debug = (...args: readonly unknown[]) => {
        const message = args
          .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
          .join(' ');
        onNewMessage('debug', message);
        originalConsole.debug(...args);
      };
    }
    
    // Restore original methods on cleanup
    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    };
  }, [onNewMessage, debugMode]);
}