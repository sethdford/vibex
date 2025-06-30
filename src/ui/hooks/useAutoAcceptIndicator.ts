/**
 * Auto Accept Indicator Hook
 * 
 * Determines when to show the auto-accept indicator.
 */

import { useMemo } from 'react';
import { ApprovalMode } from '../components/AutoAcceptIndicator';

/**
 * Auto accept indicator hook options
 */
interface UseAutoAcceptIndicatorOptions {
  /**
   * Application configuration
   */
  config: any;
}

/**
 * Hook for managing auto-accept indicator
 * 
 * @param options - Hook options
 * @returns Current approval mode
 */
export function useAutoAcceptIndicator({ config }: UseAutoAcceptIndicatorOptions): ApprovalMode {
  return useMemo(() => {
    // If config is not available, default to standard mode
    if (!config) {
      return ApprovalMode.DEFAULT;
    }
    
    // Get auto-accept setting from config
    const autoAccept = config.autoAccept || config.autoApprove;
    
    // Get auto-reject setting from config
    const autoReject = config.autoReject;
    
    // Determine mode based on settings
    if (autoAccept) {
      return ApprovalMode.AUTO_ACCEPT;
    } else if (autoReject) {
      return ApprovalMode.AUTO_REJECT;
    } else {
      return ApprovalMode.DEFAULT;
    }
  }, [config]);
}