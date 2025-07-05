/**
 * Auto Accept Indicator Hook
 * 
 * Manages the auto-accept indicator state for tool confirmations.
 */

import { useState, useCallback, useEffect } from 'react';
import type { AppConfigType } from '../../config/schema.js';

/**
 * Auto accept indicator configuration
 */
interface AutoAcceptConfig {
  enabled: boolean;
  timeout?: number;
  showIndicator?: boolean;
}

/**
 * Hook for managing auto-accept indicator
 * 
 * @param config - Application configuration
 * @param autoAcceptEnabled - Whether auto-accept is enabled
 * @returns Object containing indicator state and handlers
 */
export function useAutoAcceptIndicator(
  config: AppConfigType,
  autoAcceptEnabled: boolean
) {
  // Auto-accept indicator state
  const [showAutoAcceptIndicator, setShowAutoAcceptIndicator] = useState<boolean>(false);
  
  // Auto-accept timeout
  const [autoAcceptTimeout, setAutoAcceptTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Show auto-accept indicator
  const showIndicator = useCallback(() => {
    if (autoAcceptEnabled) {
      setShowAutoAcceptIndicator(true);
    }
  }, [autoAcceptEnabled]);
  
  // Hide auto-accept indicator
  const hideIndicator = useCallback(() => {
    setShowAutoAcceptIndicator(false);
    
    // Clear any existing timeout
    if (autoAcceptTimeout) {
      clearTimeout(autoAcceptTimeout);
      setAutoAcceptTimeout(null);
    }
  }, [autoAcceptTimeout]);
  
  // Start auto-accept countdown
  const startCountdown = useCallback((onAutoAccept: () => void) => {
    if (!autoAcceptEnabled) {
      return;
    }
    
    // Clear any existing timeout
    if (autoAcceptTimeout) {
      clearTimeout(autoAcceptTimeout);
    }
    
    // Show indicator
    setShowAutoAcceptIndicator(true);
    
    // Set new timeout
    const timeout = setTimeout(() => {
      onAutoAccept();
      setShowAutoAcceptIndicator(false);
      setAutoAcceptTimeout(null);
    }, 3000); // Fixed 3 second timeout
    
    setAutoAcceptTimeout(timeout);
  }, [autoAcceptEnabled, autoAcceptTimeout]);
  
  // Cancel auto-accept countdown
  const cancelCountdown = useCallback(() => {
    hideIndicator();
  }, [hideIndicator]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoAcceptTimeout) {
        clearTimeout(autoAcceptTimeout);
      }
    };
  }, [autoAcceptTimeout]);
  
  return {
    showAutoAcceptIndicator,
    showIndicator,
    hideIndicator,
    startCountdown,
    cancelCountdown,
  };
}