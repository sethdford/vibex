/**
 * Context Manager Hook - Focused state management for context information
 * Follows Gemini CLI's pattern of focused, single-responsibility hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { contextService, type ContextInfo } from '../../services/contextService.js';

export function useContextManager() {
  const [contextInfo, setContextInfo] = useState<ContextInfo>(contextService.getContextInfo());

  const refreshContextInfo = useCallback(() => {
    setContextInfo(contextService.getContextInfo());
  }, []);

  const updateContextInfo = useCallback((newInfo: Partial<ContextInfo>) => {
    setContextInfo(prev => ({ ...prev, ...newInfo }));
  }, []);

  // Listen for context service updates
  useEffect(() => {
    const interval = setInterval(refreshContextInfo, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [refreshContextInfo]);

  return {
    // State
    contextInfo,
    
    // Actions
    refreshContextInfo,
    updateContextInfo,
  };
} 