/**
 * Clipboard Hook
 * 
 * Custom hook for clipboard operations in the terminal
 */

import { useCallback, useState } from 'react';
import clipboard from 'clipboardy';
import { logger } from '../../utils/logger.js';

/**
 * Clipboard hook return type
 */
export interface UseClipboardResult {
  /**
   * Copy text to clipboard
   */
  copyToClipboard: (text: string) => Promise<boolean>;
  
  /**
   * Paste text from clipboard
   */
  pasteFromClipboard: () => Promise<string>;
  
  /**
   * Last error message, if any
   */
  error: string | null;
  
  /**
   * Whether a clipboard operation is in progress
   */
  isLoading: boolean;
  
  /**
   * Most recently copied text
   */
  lastCopiedText: string | null;
  
  /**
   * Clear the clipboard
   */
  clearClipboard: () => Promise<boolean>;
}

/**
 * Hook for clipboard operations
 */
export function useClipboard(): UseClipboardResult {
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Last copied text
  const [lastCopiedText, setLastCopiedText] = useState<string | null>(null);
  
  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await clipboard.write(text);
      setLastCopiedText(text);
      logger.debug(`Copied ${text.length} characters to clipboard`);
      return true;
    } catch (err) {
      const errorMessage = `Failed to copy to clipboard: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      logger.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Paste text from clipboard
   */
  const pasteFromClipboard = useCallback(async (): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const text = await clipboard.read();
      logger.debug(`Pasted ${text.length} characters from clipboard`);
      return text;
    } catch (err) {
      const errorMessage = `Failed to paste from clipboard: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      logger.error(errorMessage);
      return '';
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Clear the clipboard
   */
  const clearClipboard = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await clipboard.write('');
      setLastCopiedText(null);
      logger.debug('Clipboard cleared');
      return true;
    } catch (err) {
      const errorMessage = `Failed to clear clipboard: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      logger.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    copyToClipboard,
    pasteFromClipboard,
    clearClipboard,
    error,
    isLoading,
    lastCopiedText
  };
}