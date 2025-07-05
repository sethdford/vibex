/**
 * Advanced Overflow Management System
 * 
 * Implements Gemini CLI's sophisticated overflow handling with height constraints,
 * smart truncation, and terminal size adaptation.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useStdout } from 'ink';

/**
 * Overflow state information
 */
export interface OverflowState {
  /**
   * Whether content is currently overflowing
   */
  hasOverflow: boolean;
  
  /**
   * Number of lines hidden due to overflow
   */
  hiddenLineCount: number;
  
  /**
   * Total content height in lines
   */
  totalContentHeight: number;
  
  /**
   * Available height for content
   */
  availableHeight: number;
  
  /**
   * Whether height constraints are enabled
   */
  constrainHeight: boolean;
  
  /**
   * Current terminal dimensions
   */
  terminalHeight: number;
  terminalWidth: number;
}

/**
 * Overflow management actions
 */
export interface OverflowActions {
  /**
   * Update overflow state
   */
  updateOverflow: (contentHeight: number) => void;
  
  /**
   * Toggle height constraints
   */
  toggleConstrainHeight: () => void;
  
  /**
   * Set available height
   */
  setAvailableHeight: (height: number) => void;
  
  /**
   * Force show all content (disable constraints temporarily)
   */
  showAllContent: () => void;
  
  /**
   * Reset to constrained view
   */
  resetToConstrained: () => void;
  
  /**
   * Calculate optimal content height for terminal
   */
  calculateOptimalHeight: (terminalHeight: number, footerHeight: number) => number;
}

/**
 * Combined overflow context value
 */
export interface OverflowContextValue extends OverflowState, OverflowActions {}

/**
 * Overflow context
 */
const OverflowContext = createContext<OverflowContextValue | undefined>(undefined);

/**
 * Overflow provider props
 */
export interface OverflowProviderProps {
  children: React.ReactNode;
  
  /**
   * Initial height constraints setting
   */
  initialConstrainHeight?: boolean;
  
  /**
   * Minimum lines to always show
   */
  minVisibleLines?: number;
  
  /**
   * Maximum percentage of terminal to use
   */
  maxHeightPercentage?: number;
  
  /**
   * Reserved space for footer/controls
   */
  reservedFooterHeight?: number;
}

/**
 * Advanced overflow provider with Gemini CLI's sophisticated management
 */
export const OverflowProvider: React.FC<OverflowProviderProps> = ({
  children,
  initialConstrainHeight = true,
  minVisibleLines = 5,
  maxHeightPercentage = 0.8,
  reservedFooterHeight = 10,
}) => {
  const { stdout } = useStdout();
  
  // Terminal size tracking
  const [terminalHeight, setTerminalHeight] = useState(process.stdout.rows || 24);
  const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 80);
  
  // Overflow state
  const [constrainHeight, setConstrainHeight] = useState(initialConstrainHeight);
  const [totalContentHeight, setTotalContentHeight] = useState(0);
  const [availableHeight, setAvailableHeightState] = useState(0);
  const [temporaryShowAll, setTemporaryShowAll] = useState(false);
  
  // Update terminal size
  useEffect(() => {
    const updateSize = () => {
      setTerminalHeight(process.stdout.rows || 24);
      setTerminalWidth(process.stdout.columns || 80);
    };
    
    process.stdout.on('resize', updateSize);
    return () => {
      process.stdout.off('resize', updateSize);
    };
  }, []);
  
  // Calculate optimal available height
  const calculateOptimalHeight = useCallback((termHeight: number, footerHeight: number): number => {
    const maxHeight = Math.floor(termHeight * maxHeightPercentage);
    const availableSpace = termHeight - footerHeight - reservedFooterHeight;
    return Math.max(minVisibleLines, Math.min(maxHeight, availableSpace));
  }, [maxHeightPercentage, minVisibleLines, reservedFooterHeight]);
  
  // Update available height when terminal size changes
  useEffect(() => {
    const newAvailableHeight = calculateOptimalHeight(terminalHeight, reservedFooterHeight);
    setAvailableHeightState(newAvailableHeight);
  }, [terminalHeight, calculateOptimalHeight, reservedFooterHeight]);
  
  // Calculate overflow state
  const overflowState = useMemo((): OverflowState => {
    const effectiveConstrainHeight = constrainHeight && !temporaryShowAll;
    const hasOverflow = effectiveConstrainHeight && totalContentHeight > availableHeight;
    const hiddenLineCount = hasOverflow ? totalContentHeight - availableHeight : 0;
    
    return {
      hasOverflow,
      hiddenLineCount,
      totalContentHeight,
      availableHeight: effectiveConstrainHeight ? availableHeight : totalContentHeight,
      constrainHeight: effectiveConstrainHeight,
      terminalHeight,
      terminalWidth,
    };
  }, [constrainHeight, temporaryShowAll, totalContentHeight, availableHeight, terminalHeight, terminalWidth]);
  
  // Actions
  const updateOverflow = useCallback((contentHeight: number) => {
    setTotalContentHeight(contentHeight);
  }, []);
  
  const toggleConstrainHeight = useCallback(() => {
    setConstrainHeight(prev => !prev);
    setTemporaryShowAll(false);
  }, []);
  
  const setAvailableHeight = useCallback((height: number) => {
    setAvailableHeightState(Math.max(minVisibleLines, height));
  }, [minVisibleLines]);
  
  const showAllContent = useCallback(() => {
    setTemporaryShowAll(true);
  }, []);
  
  const resetToConstrained = useCallback(() => {
    setTemporaryShowAll(false);
  }, []);
  
  // Context value
  const contextValue: OverflowContextValue = {
    ...overflowState,
    updateOverflow,
    toggleConstrainHeight,
    setAvailableHeight,
    showAllContent,
    resetToConstrained,
    calculateOptimalHeight,
  };
  
  return (
    <OverflowContext.Provider value={contextValue}>
      {children}
    </OverflowContext.Provider>
  );
};

/**
 * Hook to use overflow context
 */
export const useOverflow = (): OverflowContextValue => {
  const context = useContext(OverflowContext);
  if (!context) {
    throw new Error('useOverflow must be used within an OverflowProvider');
  }
  return context;
};

/**
 * Hook for height-constrained components
 */
export const useHeightConstraints = () => {
  const { 
    availableHeight, 
    constrainHeight, 
    updateOverflow,
    terminalHeight,
    terminalWidth 
  } = useOverflow();
  
  return {
    maxHeight: constrainHeight ? availableHeight : undefined,
    constrainHeight,
    updateOverflow,
    terminalDimensions: { height: terminalHeight, width: terminalWidth },
  };
};

/**
 * Performance-optimized overflow detection hook
 */
export const useOverflowDetection = (contentRef: React.RefObject<HTMLElement>) => {
  const { updateOverflow } = useOverflow();
  
  useEffect(() => {
    if (!contentRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(entry.contentRect.height / 16); // Approximate line height
        updateOverflow(height);
      }
    });
    
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [contentRef, updateOverflow]);
};