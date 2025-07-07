/**
 * Terminal Service - Handles terminal operations and events
 * Extracted from scattered terminal handling code like Gemini CLI
 */

import { useState, useEffect, useCallback } from 'react';

export interface TerminalDimensions {
  width: number;
  height: number;
}

export interface LayoutCalculations {
  inputWidth: number;
  mainAreaWidth: number;
  debugConsoleMaxHeight: number;
  availableTerminalHeight: number;
}

/**
 * Hook for terminal dimensions (replaces useTerminalSize)
 */
export function useTerminalDimensions() {
  const [dimensions, setDimensions] = useState<TerminalDimensions>({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24
  });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24
      });
    };

    // Listen for terminal resize
    process.stdout.on('resize', updateDimensions);
    
    return () => {
      process.stdout.off('resize', updateDimensions);
    };
  }, []);

  return dimensions;
}

/**
 * Calculate layout dimensions based on terminal size (like Gemini CLI)
 */
export function calculateLayout(
  terminalWidth: number, 
  terminalHeight: number, 
  footerHeight: number = 0
): LayoutCalculations {
  const widthFraction = 0.9;
  const staticExtraHeight = 3;
  
  return {
    inputWidth: Math.max(20, Math.floor(terminalWidth * widthFraction) - 3),
    mainAreaWidth: Math.floor(terminalWidth * widthFraction),
    debugConsoleMaxHeight: Math.floor(Math.max(terminalHeight * 0.2, 5)),
    availableTerminalHeight: terminalHeight - footerHeight - staticExtraHeight
  };
} 