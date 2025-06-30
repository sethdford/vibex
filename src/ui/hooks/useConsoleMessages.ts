/**
 * Console Messages Hook
 * 
 * Manages console messages for display in the UI.
 */

import { useState, useCallback } from 'react';
import { ConsoleMessage } from '../components/DetailedMessagesDisplay';

/**
 * Hook for managing console messages
 * 
 * @returns Object containing console messages state and handlers
 */
export function useConsoleMessages() {
  // State for console messages
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  
  // Add a new console message
  const handleNewMessage = useCallback(
    (type: ConsoleMessage['type'], text: string) => {
      setConsoleMessages((prevMessages) => [
        ...prevMessages,
        {
          type,
          text,
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );
  
  // Clear all console messages
  const clearConsoleMessages = useCallback(() => {
    setConsoleMessages([]);
  }, []);
  
  return {
    consoleMessages,
    handleNewMessage,
    clearConsoleMessages,
  };
}