/**
 * Loading Indicator Hook
 * 
 * Manages loading indicator state, including elapsed time and loading phrases.
 */

import { useState, useEffect } from 'react';
import { StreamingState } from '../types';

// Loading phrases to display during processing
const LOADING_PHRASES = [
  'Thinking...',
  'Analyzing your code...',
  'Generating response...',
  'Considering options...',
  'Processing context...',
  'Reviewing files...',
  'Exploring solutions...',
  'Researching best practices...',
  'Formulating response...',
  'Preparing answer...',
];

/**
 * Hook for managing loading indicator state
 * 
 * @param streamingState - Current streaming state
 * @returns Object containing loading state values
 */
export function useLoadingIndicator(streamingState: StreamingState) {
  // Track elapsed time in milliseconds
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  // Track current loading phrase index
  const [phraseIndex, setPhraseIndex] = useState<number>(0);
  
  // Current loading phrase to display
  const currentLoadingPhrase = LOADING_PHRASES[phraseIndex];
  
  // Reset timer when streaming state changes
  useEffect(() => {
    if (streamingState === StreamingState.Responding) {
      setElapsedTime(0);
      setPhraseIndex(0);
    }
  }, [streamingState]);
  
  // Update timer while responding
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (streamingState === StreamingState.Responding) {
      // Start timer that updates every 100ms
      interval = setInterval(() => {
        setElapsedTime((prevTime) => prevTime + 100);
      }, 100);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [streamingState]);
  
  // Update loading phrase periodically
  useEffect(() => {
    let phraseInterval: NodeJS.Timeout;
    
    if (streamingState === StreamingState.Responding) {
      // Change phrase every 3 seconds
      phraseInterval = setInterval(() => {
        setPhraseIndex((prevIndex) => (prevIndex + 1) % LOADING_PHRASES.length);
      }, 3000);
    }
    
    return () => {
      if (phraseInterval) {
        clearInterval(phraseInterval);
      }
    };
  }, [streamingState]);
  
  return {
    elapsedTime,
    currentLoadingPhrase,
  };
}