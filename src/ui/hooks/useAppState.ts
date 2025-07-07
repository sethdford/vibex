/**
 * App State Hook - Focused state management for UI orchestration
 * Follows Gemini CLI's clean state management pattern
 */

import { useState, useCallback, useRef } from 'react';
import { useStdout } from 'ink';
import ansiEscapes from 'ansi-escapes';

export interface AppUIState {
  // Core UI state
  staticKey: number;
  showErrorDetails: boolean;
  constrainHeight: boolean;
  
  // Exit handling
  ctrlCPressedOnce: boolean;
  ctrlDPressedOnce: boolean;
  
  // Layout
  footerHeight: number;
}

export function useAppState() {
  const { stdout } = useStdout();
  
  // Core UI state
  const [staticKey, setStaticKey] = useState(0);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [constrainHeight, setConstrainHeight] = useState(true);
  
  // Exit handling state
  const [ctrlCPressedOnce, setCtrlCPressedOnce] = useState(false);
  const [ctrlDPressedOnce, setCtrlDPressedOnce] = useState(false);
  const ctrlCTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ctrlDTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Layout state
  const [footerHeight, setFooterHeight] = useState(0);
  
  // Actions
  const refreshStatic = useCallback(() => {
    stdout.write(ansiEscapes.clearTerminal);
    setStaticKey(prev => prev + 1);
  }, [stdout]);
  
  const toggleErrorDetails = useCallback(() => {
    setShowErrorDetails(prev => !prev);
  }, []);
  
  const toggleHeightConstraint = useCallback(() => {
    setConstrainHeight(prev => !prev);
  }, []);
  
  const handleExitPress = useCallback((
    pressedOnce: boolean,
    setPressedOnce: (value: boolean) => void,
    timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    onExit: () => void
  ) => {
    if (pressedOnce) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      onExit();
    } else {
      setPressedOnce(true);
      timerRef.current = setTimeout(() => {
        setPressedOnce(false);
        timerRef.current = null;
      }, 1000);
    }
  }, []);
  
  return {
    // State
    staticKey,
    showErrorDetails,
    constrainHeight,
    ctrlCPressedOnce,
    ctrlDPressedOnce,
    footerHeight,
    
    // Actions
    refreshStatic,
    toggleErrorDetails,
    toggleHeightConstraint,
    setFooterHeight,
    
    // Exit handling
    handleCtrlC: (onExit: () => void) => 
      handleExitPress(ctrlCPressedOnce, setCtrlCPressedOnce, ctrlCTimerRef, onExit),
    handleCtrlD: (onExit: () => void) => 
      handleExitPress(ctrlDPressedOnce, setCtrlDPressedOnce, ctrlDTimerRef, onExit),
    
    // Cleanup
    cleanup: () => {
      if (ctrlCTimerRef.current) clearTimeout(ctrlCTimerRef.current);
      if (ctrlDTimerRef.current) clearTimeout(ctrlDTimerRef.current);
    }
  };
} 