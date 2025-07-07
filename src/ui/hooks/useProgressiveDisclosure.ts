/**
 * Progressive Disclosure Hook
 * 
 * Manages progressive disclosure of information in UI components.
 */

import { useState, useCallback } from 'react';

export interface ProgressiveDisclosureState {
  isExpanded: boolean;
  level: number;
  maxLevel: number;
}

export interface ProgressiveDisclosureOptions {
  initialLevel?: number;
  maxLevel?: number;
  initialExpanded?: boolean;
}

export function useProgressiveDisclosure(options: ProgressiveDisclosureOptions = {}) {
  const {
    initialLevel = 0,
    maxLevel = 3,
    initialExpanded = false
  } = options;

  const [state, setState] = useState<ProgressiveDisclosureState>({
    isExpanded: initialExpanded,
    level: initialLevel,
    maxLevel
  });

  const expand = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: true }));
  }, []);

  const collapse = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: false }));
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  const setLevel = useCallback((level: number) => {
    setState(prev => ({ 
      ...prev, 
      level: Math.max(0, Math.min(level, prev.maxLevel))
    }));
  }, []);

  const increaseLevel = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      level: Math.min(prev.level + 1, prev.maxLevel)
    }));
  }, []);

  const decreaseLevel = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      level: Math.max(prev.level - 1, 0)
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isExpanded: initialExpanded,
      level: initialLevel,
      maxLevel
    });
  }, [initialExpanded, initialLevel, maxLevel]);

  return {
    ...state,
    expand,
    collapse,
    toggle,
    setLevel,
    increaseLevel,
    decreaseLevel,
    reset
  };
} 