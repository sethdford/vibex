/**
 * Overflow Context
 * 
 * This context manages overflow handling for components that might need to
 * truncate their content based on available space.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Interface for the overflow context value
 */
interface OverflowContextValue {
  /**
   * Whether content should be constrained by height
   */
  constrainHeight: boolean;
  
  /**
   * Set whether content should be constrained by height
   */
  setConstrainHeight: (constrain: boolean) => void;
  
  /**
   * Whether there is currently overflowing content
   */
  hasOverflow: boolean;
  
  /**
   * Set whether there is currently overflowing content
   */
  setHasOverflow: (hasOverflow: boolean) => void;
  
  /**
   * The number of lines that are being hidden
   */
  hiddenLineCount: number;
  
  /**
   * Set the number of lines that are being hidden
   */
  setHiddenLineCount: (count: number) => void;
}

/**
 * Create the overflow context with default values
 */
const OverflowContext = createContext<OverflowContextValue | undefined>(undefined);

/**
 * Provider component for overflow context
 */
export const OverflowProvider: React.FC<{
  initialConstrainHeight?: boolean;
  children: React.ReactNode;
}> = ({
  initialConstrainHeight = true,
  children
}) => {
  const [constrainHeight, setConstrainHeight] = useState<boolean>(initialConstrainHeight);
  const [hasOverflow, setHasOverflow] = useState<boolean>(false);
  const [hiddenLineCount, setHiddenLineCount] = useState<number>(0);
  
  const value = {
    constrainHeight,
    setConstrainHeight,
    hasOverflow,
    setHasOverflow,
    hiddenLineCount,
    setHiddenLineCount
  };
  
  return (
    <OverflowContext.Provider value={value}>
      {children}
    </OverflowContext.Provider>
  );
};

/**
 * Hook to use overflow context in components
 */
export const useOverflow = (): OverflowContextValue => {
  const context = useContext(OverflowContext);
  
  if (context === undefined) {
    throw new Error('useOverflow must be used within an OverflowProvider');
  }
  
  return context;
};

/**
 * Helper hook to manage overflow in a component
 */
export const useComponentOverflow = (
  availableHeight?: number
): {
  isOverflowing: boolean;
  setIsOverflowing: (overflowing: boolean) => void;
  hiddenLines: number;
  setHiddenLines: (lines: number) => void;
  shouldConstrain: boolean;
} => {
  const { constrainHeight, setHasOverflow, setHiddenLineCount } = useOverflow();
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const [hiddenLines, setHiddenLines] = useState<number>(0);
  
  const updateOverflow = useCallback((overflowing: boolean) => {
    setIsOverflowing(overflowing);
    setHasOverflow(overflowing);
  }, [setHasOverflow]);
  
  const updateHiddenLines = useCallback((lines: number) => {
    setHiddenLines(lines);
    setHiddenLineCount(lines);
  }, [setHiddenLineCount]);
  
  return {
    isOverflowing,
    setIsOverflowing: updateOverflow,
    hiddenLines,
    setHiddenLines: updateHiddenLines,
    shouldConstrain: constrainHeight && typeof availableHeight === 'number'
  };
};