/**
 * Tool Confirmation Hook
 * 
 * Provides a React hook for handling tool confirmation requests,
 * particularly for MCP tools and other operations requiring explicit approval.
 */

import { useState, useCallback } from 'react';
import { ToolConfirmationDetails, ToolConfirmationOutcome } from '../../core/domain/tool/tool-interfaces';

export interface ToolConfirmationState {
  /**
   * Whether a confirmation is active
   */
  isConfirmationActive: boolean;
  
  /**
   * The current confirmation details
   */
  confirmationDetails: ToolConfirmationDetails | null;
  
  /**
   * Promise that will resolve with the confirmation outcome
   */
  confirmationPromise: Promise<ToolConfirmationOutcome> | null;
  
  /**
   * Function to resolve the confirmation with an outcome
   */
  resolveConfirmation: ((outcome: ToolConfirmationOutcome) => void) | null;
}

/**
 * Hook for handling tool confirmations
 */
export function useToolConfirmation() {
  // State for tracking confirmation state
  const [state, setState] = useState<ToolConfirmationState>({
    isConfirmationActive: false,
    confirmationDetails: null,
    confirmationPromise: null,
    resolveConfirmation: null
  });
  
  /**
   * Request a confirmation from the user
   */
  const requestConfirmation = useCallback((details: ToolConfirmationDetails): Promise<ToolConfirmationOutcome> => {
    return new Promise<ToolConfirmationOutcome>((resolve) => {
      setState({
        isConfirmationActive: true,
        confirmationDetails: details,
        confirmationPromise: Promise.resolve(ToolConfirmationOutcome.Cancelled),
        resolveConfirmation: (outcome: ToolConfirmationOutcome) => {
          resolve(outcome);
          setState(prev => ({
            ...prev,
            isConfirmationActive: false,
            confirmationDetails: null,
            confirmationPromise: null,
            resolveConfirmation: null
          }));
        }
      });
    });
  }, []);
  
  /**
   * Handle the user's response to a confirmation
   */
  const handleConfirmation = useCallback((outcome: ToolConfirmationOutcome) => {
    if (state.resolveConfirmation) {
      state.resolveConfirmation(outcome);
    }
  }, [state]);
  
  /**
   * Cancel the current confirmation
   */
  const cancelConfirmation = useCallback(() => {
    handleConfirmation(ToolConfirmationOutcome.Cancelled);
  }, [handleConfirmation]);
  
  /**
   * Create a MCP tool confirmation
   */
  const createMCPConfirmation = useCallback((
    title: string,
    serverName: string, 
    toolName: string, 
    params?: Record<string, unknown>
  ): Promise<ToolConfirmationOutcome> => {
    const details: ToolConfirmationDetails = {
      type: 'warning',
      title: title || `MCP Tool Execution: ${toolName}`,
      description: `Do you want to allow execution of MCP tool "${toolName}" from server "${serverName}"?`,
      params: params || {}
    };
    
    return requestConfirmation(details);
  }, [requestConfirmation]);
  
  return {
    isConfirmationActive: state.isConfirmationActive,
    confirmationDetails: state.confirmationDetails,
    requestConfirmation,
    handleConfirmation,
    cancelConfirmation,
    createMCPConfirmation
  };
}

export default useToolConfirmation;