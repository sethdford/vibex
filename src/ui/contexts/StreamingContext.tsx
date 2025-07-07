/**
 * Streaming Context
 * 
 * This context provides streaming state management for the UI.
 * It allows components to access and respond to the current streaming state.
 */

import React, { createContext, useContext } from 'react';
import { StreamingState } from '../components/types/interface-types.js';

/**
 * Create the streaming context with a default value
 */
export const StreamingContext = createContext<StreamingState>(StreamingState.IDLE);

/**
 * Props for the StreamingProvider component
 */
interface StreamingProviderProps {
  /**
   * Current streaming state
   */
  streamingState: StreamingState;
  
  /**
   * Child components
   */
  children: React.ReactNode;
}

/**
 * Provider component for streaming state
 */
export const StreamingProvider: React.FC<StreamingProviderProps> = ({
  streamingState,
  children,
}) => (
    <StreamingContext.Provider value={streamingState}>
      {children}
    </StreamingContext.Provider>
  );

/**
 * Hook to use streaming state in components
 */
export const useStreaming = (): StreamingState => {
  const context = useContext(StreamingContext);
  
  if (context === undefined) {
    throw new Error('useStreaming must be used within a StreamingProvider');
  }
  
  return context;
};

/**
 * Utility function to check if streaming is active
 */
export const isStreamingActive = (state: StreamingState): boolean => state === StreamingState.RESPONDING || state === StreamingState.TOOL_EXECUTING;

/**
 * Utility function to check if UI should be disabled during streaming
 */
export const shouldDisableInput = (state: StreamingState): boolean => state === StreamingState.RESPONDING;