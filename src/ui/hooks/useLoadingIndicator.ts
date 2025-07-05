/**
 * Loading Indicator Hook
 * 
 * Manages loading indicator state, including elapsed time and loading phrases.
 */

import { useState, useEffect } from 'react';
import { StreamingState } from '../components/AdvancedStreamingDisplay.js';

// Loading phrases to display during processing - inspired by Claude Code's informative UX
const LOADING_PHRASES = [
  '🧠 Thinking through your request...',
  '📁 Reading project context files...',
  '🔍 Analyzing codebase structure...',
  '💭 Processing your requirements...',
  '🎯 Identifying relevant files...',
  '⚡ Applying enterprise patterns...',
  '🏗️ Considering architecture options...',
  '📊 Evaluating best practices...',
  '🔧 Preparing implementation plan...',
  '✨ Crafting the perfect response...',
  '🚀 Optimizing for performance...',
  '🛡️ Ensuring type safety...',
  '📝 Documenting approach...',
  '🎨 Polishing the solution...',
  '🔄 Cross-referencing patterns...',
  '🎪 Adding that extra flair...',
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
    if (streamingState === StreamingState.RESPONDING) {
      setElapsedTime(0);
      setPhraseIndex(0);
    }
  }, [streamingState]);
  
  // Update timer while responding
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (streamingState === StreamingState.RESPONDING) {
      // Start timer that updates every 100ms
      interval = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 100);
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
    
    if (streamingState === StreamingState.RESPONDING) {
      // Change phrase every 3 seconds
      phraseInterval = setInterval(() => {
        setPhraseIndex(prevIndex => (prevIndex + 1) % LOADING_PHRASES.length);
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